"""
Бот-модератор чата.

  BOT_TOKEN=... python3 bot.py
  (боту нужны права администратора: удалять сообщения и ограничивать
   участников)

Работает без человека:
  — новичку выдаёт капчу и до ответа не даёт писать; не ответил за
    две минуты — выгоняет, но не банит: пусть зайдёт и пройдёт;
  — ловит рассылки, ссылки от новичков, флуд, повторы и капс;
  — наказывает по лестнице: предупреждение → час молчания → сутки.
    Счётчик сам стареет, старое нарушение через неделю не считается;
  — убирает служебные «вошёл в чат», чтобы лента не превращалась в
    список прибытий;
  — ночью включает тихий режим, если он задан;
  — каждое действие пишет с причиной, чтобы админ понимал, за что.
"""
import asyncio
import logging
import os
import random
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta

import aiosqlite
from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ChatMemberStatus, ParseMode
from aiogram.filters import Command
from aiogram.types import (CallbackQuery, ChatPermissions, InlineKeyboardButton,
                           InlineKeyboardMarkup, Message)

from rules import check

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('guard')

TOKEN = os.environ.get('BOT_TOKEN', '')
DB = os.environ.get('BOT_DB', 'guard.sqlite3')
CAPTCHA_SEC = int(os.environ.get('BOT_CAPTCHA_SEC', '120'))
NEW_HOURS = int(os.environ.get('BOT_NEW_HOURS', '24'))
QUIET = os.environ.get('BOT_QUIET', '')          # например «23-7», пусто — выключено

bot = Bot(TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp = Dispatcher()
db: aiosqlite.Connection = None

MUTED = ChatPermissions(can_send_messages=False)
FREE = ChatPermissions(can_send_messages=True, can_send_other_messages=True,
                       can_send_polls=True, can_add_web_page_previews=True)

SCHEMA = """
CREATE TABLE IF NOT EXISTS members (
    chat_id  INTEGER NOT NULL,
    user_id  INTEGER NOT NULL,
    joined   TEXT NOT NULL,
    passed   INTEGER NOT NULL DEFAULT 0,
    msgs     INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (chat_id, user_id)
);
CREATE TABLE IF NOT EXISTS strikes (
    chat_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    at      TEXT NOT NULL,
    reason  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS strikes_who ON strikes (chat_id, user_id, at);
CREATE TABLE IF NOT EXISTS stops (
    chat_id INTEGER NOT NULL,
    word    TEXT NOT NULL,
    PRIMARY KEY (chat_id, word)
);
"""

# последние сообщения — только в памяти: для флуда история не нужна
recent = defaultdict(lambda: deque(maxlen=6))
pending = {}          # (chat_id, user_id) → задача на кик по таймауту


def kb(rows):
    return InlineKeyboardMarkup(inline_keyboard=rows)


async def is_admin(chat_id, user_id):
    try:
        m = await bot.get_chat_member(chat_id, user_id)
        return m.status in (ChatMemberStatus.ADMINISTRATOR, ChatMemberStatus.CREATOR)
    except Exception:
        return False


def quiet_now():
    if not QUIET or '-' not in QUIET:
        return False
    a, b = (int(x) for x in QUIET.split('-'))
    h = datetime.now().hour
    return a <= h or h < b if a > b else a <= h < b


# ============================ капча ============================

@dp.message(F.new_chat_members)
async def greet(msg: Message):
    try:
        await msg.delete()                    # служебное сообщение в ленте не нужно
    except Exception:
        pass

    for user in msg.new_chat_members:
        if user.is_bot:
            continue
        await db.execute(
            'INSERT INTO members (chat_id, user_id, joined) VALUES (?, ?, ?) '
            'ON CONFLICT(chat_id, user_id) DO UPDATE SET joined = excluded.joined, passed = 0',
            (msg.chat.id, user.id, datetime.now().isoformat(timespec='seconds')))
        await db.commit()

        try:
            await bot.restrict_chat_member(msg.chat.id, user.id, MUTED)
        except Exception as e:
            log.warning('не вийшло обмежити: %s', e)

        # капча — простая арифметика: боту её решать невыгодно, живому
        # человеку она стоит секунды
        a, b = random.randint(2, 9), random.randint(2, 9)
        right = a + b
        options = random.sample([right, right + 1, right - 2, right + 3], 4)
        note = await msg.answer(
            f'{user.full_name}, привіт! Щоб писати в чат, натисни правильну відповідь.\n'
            f'<b>{a} + {b} = ?</b>\nЄ {CAPTCHA_SEC // 60} хв.',
            reply_markup=kb([[InlineKeyboardButton(
                text=str(o), callback_data=f'cap:{user.id}:{int(o == right)}') for o in options]]))

        pending[(msg.chat.id, user.id)] = asyncio.create_task(
            kick_later(msg.chat.id, user.id, note.message_id))


async def kick_later(chat_id, user_id, note_id):
    await asyncio.sleep(CAPTCHA_SEC)
    try:
        cur = await db.execute('SELECT passed FROM members WHERE chat_id = ? AND user_id = ?',
                               (chat_id, user_id))
        row = await cur.fetchone()
        if row and row[0]:
            return
        # выгоняем, но сразу разбаниваем: человек сможет зайти снова
        await bot.ban_chat_member(chat_id, user_id)
        await bot.unban_chat_member(chat_id, user_id)
        await bot.delete_message(chat_id, note_id)
    except Exception as e:
        log.warning('капча, кік: %s', e)


@dp.callback_query(F.data.startswith('cap:'))
async def captcha(cb: CallbackQuery):
    _, user_id, right = cb.data.split(':')
    if cb.from_user.id != int(user_id):
        return await cb.answer('Це не твоя капча', show_alert=True)
    if right != '1':
        return await cb.answer('Ні. Спробуй ще', show_alert=True)

    await db.execute('UPDATE members SET passed = 1 WHERE chat_id = ? AND user_id = ?',
                     (cb.message.chat.id, cb.from_user.id))
    await db.commit()
    task = pending.pop((cb.message.chat.id, cb.from_user.id), None)
    if task:
        task.cancel()
    try:
        await bot.restrict_chat_member(cb.message.chat.id, cb.from_user.id, FREE)
        await cb.message.delete()
    except Exception as e:
        log.warning('капча, зняти обмеження: %s', e)
    await cb.answer('Готово, пиши')


# ============================ разбор сообщений ============================

async def strikes_of(chat_id, user_id):
    """Нарушения за неделю: старое не должно висеть вечно."""
    since = (datetime.now() - timedelta(days=7)).isoformat(timespec='seconds')
    cur = await db.execute(
        'SELECT COUNT(*) FROM strikes WHERE chat_id = ? AND user_id = ? AND at >= ?',
        (chat_id, user_id, since))
    return (await cur.fetchone())[0]


async def punish(msg: Message, verdict):
    chat_id, user = msg.chat.id, msg.from_user
    await db.execute('INSERT INTO strikes (chat_id, user_id, at, reason) VALUES (?, ?, ?, ?)',
                     (chat_id, user.id, datetime.now().isoformat(timespec='seconds'),
                      verdict.reason))
    await db.commit()
    n = await strikes_of(chat_id, user.id)

    try:
        await msg.delete()
    except Exception:
        pass

    # лестница: сначала слово, потом час, потом сутки
    if verdict.action == 'warn' and n < 3:
        text = f'⚠️ {user.full_name}: {verdict.reason}. Попередження {n}/3.'
    elif n >= 5:
        until = datetime.now() + timedelta(days=1)
        await bot.restrict_chat_member(chat_id, user.id, MUTED, until_date=until)
        text = f'🔇 {user.full_name} мовчить добу: {verdict.reason}.'
    else:
        until = datetime.now() + timedelta(hours=1)
        await bot.restrict_chat_member(chat_id, user.id, MUTED, until_date=until)
        text = f'🔇 {user.full_name} мовчить годину: {verdict.reason}.'

    note = await msg.answer(text)
    # служебное сообщение само уберётся через минуту, чтобы не мусорить
    await asyncio.sleep(60)
    try:
        await note.delete()
    except Exception:
        pass


@dp.message(F.chat.type.in_({'group', 'supergroup'}) & F.text)
async def watch(msg: Message):
    if await is_admin(msg.chat.id, msg.from_user.id):
        return

    if quiet_now():
        try:
            await msg.delete()
        except Exception:
            pass
        return

    key = (msg.chat.id, msg.from_user.id)
    cur = await db.execute('SELECT joined, msgs FROM members WHERE chat_id = ? AND user_id = ?', key)
    row = await cur.fetchone()
    joined = datetime.fromisoformat(row[0]) if row else datetime.now()
    msgs = row[1] if row else 0

    is_new = datetime.now() - joined < timedelta(hours=NEW_HOURS)
    cur = await db.execute('SELECT word FROM stops WHERE chat_id = ?', (msg.chat.id,))
    stops = tuple(r[0] for r in await cur.fetchall())

    verdict = check(msg.text, is_new=is_new, has_link_perm=not is_new and msgs > 20,
                    recent=list(recent[key]), blacklist=stops)
    recent[key].append(msg.text)

    await db.execute(
        'INSERT INTO members (chat_id, user_id, joined, msgs) VALUES (?, ?, ?, 1) '
        'ON CONFLICT(chat_id, user_id) DO UPDATE SET msgs = msgs + 1',
        (msg.chat.id, msg.from_user.id, joined.isoformat(timespec='seconds')))
    await db.commit()

    if verdict.action == 'delete':
        try:
            await msg.delete()
        except Exception:
            pass
        log.info('видалив: %s', verdict.reason)
    elif verdict.action in ('warn', 'mute'):
        await punish(msg, verdict)


# ============================ команды админа ============================

@dp.message(Command('stop'))
async def add_stop(msg: Message):
    if not await is_admin(msg.chat.id, msg.from_user.id):
        return
    parts = msg.text.split(maxsplit=1)
    if len(parts) < 2:
        cur = await db.execute('SELECT word FROM stops WHERE chat_id = ?', (msg.chat.id,))
        words = ', '.join(r[0] for r in await cur.fetchall()) or 'порожньо'
        return await msg.answer(f'Стоп-слова: {words}\nДодати: <code>/stop слово</code>')
    await db.execute('INSERT OR IGNORE INTO stops (chat_id, word) VALUES (?, ?)',
                     (msg.chat.id, parts[1].lower().strip()))
    await db.commit()
    await msg.answer('Додав.')


@dp.message(Command('stats'))
async def stats(msg: Message):
    if not await is_admin(msg.chat.id, msg.from_user.id):
        return
    cur = await db.execute('SELECT COUNT(*), COALESCE(SUM(msgs), 0) FROM members WHERE chat_id = ?',
                           (msg.chat.id,))
    people, messages = await cur.fetchone()
    since = (datetime.now() - timedelta(days=7)).isoformat(timespec='seconds')
    cur = await db.execute(
        'SELECT reason, COUNT(*) n FROM strikes WHERE chat_id = ? AND at >= ? '
        'GROUP BY reason ORDER BY n DESC LIMIT 5', (msg.chat.id, since))
    top = await cur.fetchall()
    lines = [f'<b>Чат</b>', f'Учасників у базі: {people}', f'Повідомлень пораховано: {messages}',
             '', '<b>За тиждень прибрано</b>']
    lines += [f'{r[0]} — {r[1]}' for r in top] or ['нічого']
    await msg.answer('\n'.join(lines))


async def main():
    global db
    if not TOKEN:
        raise SystemExit('Нема BOT_TOKEN.')
    db = await aiosqlite.connect(DB)
    await db.execute('PRAGMA journal_mode=WAL')
    await db.executescript(SCHEMA)
    await db.commit()
    try:
        await dp.start_polling(bot)
    finally:
        await db.close()


if __name__ == '__main__':
    asyncio.run(main())
