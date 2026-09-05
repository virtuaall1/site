"""
Бот учёта расходов.

  BOT_TOKEN=... python3 bot.py

Идея: одно короткое сообщение вместо меню. Пишешь «120 кава» — бот
сам понял сумму, сам подобрал категорию, сам записал. Всё остальное
он делает без просьбы:

  — учится на исправлениях: поправил категорию один раз, и это слово
    он больше не путает;
  — следит за лимитами и предупреждает на 80 %, а не после того, как
    деньги кончились;
  — сам присылает итог недели в понедельник утром;
  — отдаёт выгрузку в CSV, чтобы данные не были заперты в боте.
"""
import asyncio
import csv
import io
import logging
import os
from datetime import datetime, timedelta

import aiosqlite
from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.types import (BufferedInputFile, CallbackQuery, InlineKeyboardButton,
                           InlineKeyboardMarkup, Message)

from parse import CATEGORIES, parse, money

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('spend')

TOKEN = os.environ.get('BOT_TOKEN', '')
DB = os.environ.get('BOT_DB', 'spend.sqlite3')
WEEKLY_HOUR = int(os.environ.get('BOT_WEEKLY_HOUR', '9'))     # понедельник, местное

bot = Bot(TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp = Dispatcher()
db: aiosqlite.Connection = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS spends (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    tg_id  INTEGER NOT NULL,
    kop    INTEGER NOT NULL,
    note   TEXT NOT NULL,
    cat    TEXT NOT NULL,
    at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS spends_when ON spends (tg_id, at);

-- выученные слова: слово → категория, у каждого свои
CREATE TABLE IF NOT EXISTS learned (
    tg_id INTEGER NOT NULL,
    word  TEXT NOT NULL,
    cat   TEXT NOT NULL,
    PRIMARY KEY (tg_id, word)
);

CREATE TABLE IF NOT EXISTS limits (
    tg_id INTEGER NOT NULL,
    cat   TEXT NOT NULL,
    kop   INTEGER NOT NULL,
    PRIMARY KEY (tg_id, cat)
);

-- чтобы недельный итог не ушёл дважды после перезапуска
CREATE TABLE IF NOT EXISTS digests (
    tg_id INTEGER NOT NULL,
    week  TEXT NOT NULL,
    PRIMARY KEY (tg_id, week)
);
"""


def kb(rows):
    return InlineKeyboardMarkup(inline_keyboard=rows)


def btn(text, data):
    return InlineKeyboardButton(text=text, callback_data=data)


async def learned_for(tg_id):
    cur = await db.execute('SELECT word, cat FROM learned WHERE tg_id = ?', (tg_id,))
    return {r[0]: r[1] for r in await cur.fetchall()}


def bar(part, whole, width=10):
    """Полоска из знаков: в телеграме это честнее любой картинки."""
    filled = 0 if not whole else min(width, round(width * part / whole))
    return '▓' * filled + '░' * (width - filled)


# ============================ запись ============================

@dp.message(CommandStart())
async def start(msg: Message):
    await msg.answer(
        'Пиши витрати одним рядком: <code>120 кава</code> або <code>таксі 85</code>.\n\n'
        'Категорію підберу сам. Помилюсь — виправиш кнопкою, і я запам’ятаю це слово.\n\n'
        '/week — тиждень, /month — місяць, /limit — ліміти, /export — вигрузка.')


@dp.message(F.text & ~F.text.startswith('/'))
async def add(msg: Message):
    got = parse(msg.text, await learned_for(msg.from_user.id))
    if not got:
        return await msg.answer('Не бачу суми. Напиши, наприклад: <code>120 кава</code>')

    kop, note, cat = got
    cur = await db.execute(
        'INSERT INTO spends (tg_id, kop, note, cat, at) VALUES (?, ?, ?, ?, ?)',
        (msg.from_user.id, kop, note, cat, datetime.now().isoformat(timespec='seconds')))
    await db.commit()
    spend_id = cur.lastrowid

    text = f'✅ {money(kop)} · {cat}' + (f'\n<i>{note}</i>' if note else '')
    warn = await limit_warning(msg.from_user.id, cat)
    await msg.answer(text + warn, reply_markup=kb([
        [btn('Інша категорія', f'cat:{spend_id}'), btn('✕ Видалити', f'del:{spend_id}')]]))


@dp.callback_query(F.data.startswith('cat:'))
async def choose_cat(cb: CallbackQuery):
    spend_id = int(cb.data.split(':')[1])
    names = list(CATEGORIES)
    rows = [[btn(n, f'set:{spend_id}:{i}') for i, n in enumerate(names[k:k + 2], start=k)]
            for k in range(0, len(names), 2)]
    await cb.message.edit_reply_markup(reply_markup=kb(rows))
    await cb.answer()


@dp.callback_query(F.data.startswith('set:'))
async def set_cat(cb: CallbackQuery):
    _, spend_id, idx = cb.data.split(':')
    cat = list(CATEGORIES)[int(idx)]
    cur = await db.execute('SELECT note, kop FROM spends WHERE id = ? AND tg_id = ?',
                           (spend_id, cb.from_user.id))
    row = await cur.fetchone()
    if not row:
        return await cb.answer('Не знайшов')

    await db.execute('UPDATE spends SET cat = ? WHERE id = ?', (cat, spend_id))
    # запоминаем каждое слово заметки за этой категорией — в следующий
    # раз бот не ошибётся на том же самом
    for word in (row[0] or '').split():
        if len(word) > 2:
            await db.execute(
                'INSERT INTO learned (tg_id, word, cat) VALUES (?, ?, ?) '
                'ON CONFLICT(tg_id, word) DO UPDATE SET cat = excluded.cat',
                (cb.from_user.id, word, cat))
    await db.commit()
    await cb.message.edit_text(f'✅ {money(row[1])} · {cat}\n<i>запам’ятав</i>')
    await cb.answer()


@dp.callback_query(F.data.startswith('del:'))
async def delete(cb: CallbackQuery):
    await db.execute('DELETE FROM spends WHERE id = ? AND tg_id = ?',
                     (cb.data.split(':')[1], cb.from_user.id))
    await db.commit()
    await cb.message.edit_text('Видалив.')
    await cb.answer()


# ============================ отчёты ============================

async def report(tg_id, since, title):
    cur = await db.execute(
        'SELECT cat, SUM(kop) s, COUNT(*) n FROM spends WHERE tg_id = ? AND at >= ? '
        'GROUP BY cat ORDER BY s DESC', (tg_id, since))
    rows = await cur.fetchall()
    if not rows:
        return f'<b>{title}</b>\nПоки порожньо.'

    total = sum(r[1] for r in rows)
    lines = [f'<b>{title}</b>', f'Разом: <b>{money(total)}</b>', '']
    for cat, s, n in rows:
        lines.append(f'{bar(s, rows[0][1])} {cat} — {money(s)} · {n}')
    return '\n'.join(lines)


@dp.message(Command('day'))
async def day(msg: Message):
    since = datetime.now().replace(hour=0, minute=0, second=0).isoformat(timespec='seconds')
    await msg.answer(await report(msg.from_user.id, since, 'Сьогодні'))


@dp.message(Command('week'))
async def week(msg: Message):
    since = (datetime.now() - timedelta(days=7)).isoformat(timespec='seconds')
    await msg.answer(await report(msg.from_user.id, since, 'Тиждень'))


@dp.message(Command('month'))
async def month(msg: Message):
    since = (datetime.now() - timedelta(days=30)).isoformat(timespec='seconds')
    await msg.answer(await report(msg.from_user.id, since, 'Місяць'))


# ============================ лимиты ============================

@dp.message(Command('limit'))
async def limit(msg: Message):
    parts = msg.text.split(maxsplit=2)
    if len(parts) < 3:
        cur = await db.execute('SELECT cat, kop FROM limits WHERE tg_id = ?', (msg.from_user.id,))
        rows = await cur.fetchall()
        have = '\n'.join(f'{c} — {money(k)}' for c, k in rows) or 'Лімітів немає.'
        return await msg.answer(
            f'{have}\n\nПоставити: <code>/limit їжа 4000</code>')

    cat, amount = parts[1], parts[2]
    if cat not in CATEGORIES:
        return await msg.answer('Такої категорії немає: ' + ', '.join(CATEGORIES))
    try:
        kop = int(float(amount.replace(',', '.')) * 100)
    except ValueError:
        return await msg.answer('Сума не читається.')

    await db.execute('INSERT INTO limits (tg_id, cat, kop) VALUES (?, ?, ?) '
                     'ON CONFLICT(tg_id, cat) DO UPDATE SET kop = excluded.kop',
                     (msg.from_user.id, cat, kop))
    await db.commit()
    await msg.answer(f'Ліміт на {cat}: {money(kop)} на місяць.')


async def limit_warning(tg_id, cat):
    """Предупреждаем на 80 %, а не когда деньги уже кончились."""
    cur = await db.execute('SELECT kop FROM limits WHERE tg_id = ? AND cat = ?', (tg_id, cat))
    row = await cur.fetchone()
    if not row:
        return ''
    since = datetime.now().replace(day=1, hour=0, minute=0, second=0)
    cur = await db.execute(
        'SELECT COALESCE(SUM(kop), 0) FROM spends WHERE tg_id = ? AND cat = ? AND at >= ?',
        (tg_id, cat, since.isoformat(timespec='seconds')))
    spent = (await cur.fetchone())[0]
    share = spent / row[0]
    if share >= 1:
        return f'\n\n🔴 Ліміт на {cat} вичерпано: {money(spent)} з {money(row[0])}'
    if share >= 0.8:
        return f'\n\n🟡 {cat}: {bar(spent, row[0])} {money(spent)} з {money(row[0])}'
    return ''


# ============================ выгрузка ============================

@dp.message(Command('export'))
async def export(msg: Message):
    cur = await db.execute(
        'SELECT at, kop, cat, note FROM spends WHERE tg_id = ? ORDER BY at', (msg.from_user.id,))
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(['коли', 'сума', 'категорія', 'нотатка'])
    for at, kop, cat, note in await cur.fetchall():
        w.writerow([at, kop / 100, cat, note])
    await msg.answer_document(BufferedInputFile(
        buf.getvalue().encode('utf-8-sig'), filename='spends.csv'))


# ============================ недельный итог ============================

async def weekly():
    """Понедельник, утро: сам присылает итог тем, кто вообще что-то писал."""
    while True:
        try:
            now = datetime.now()
            if now.weekday() == 0 and now.hour == WEEKLY_HOUR:
                week_key = now.strftime('%G-W%V')
                cur = await db.execute(
                    'SELECT DISTINCT tg_id FROM spends WHERE at >= ?',
                    ((now - timedelta(days=7)).isoformat(timespec='seconds'),))
                for (tg_id,) in await cur.fetchall():
                    seen = await db.execute(
                        'SELECT 1 FROM digests WHERE tg_id = ? AND week = ?', (tg_id, week_key))
                    if await seen.fetchone():
                        continue
                    since = (now - timedelta(days=7)).isoformat(timespec='seconds')
                    try:
                        await bot.send_message(tg_id, await report(tg_id, since, 'Минулий тиждень'))
                    except Exception as e:
                        log.warning('тижневий підсумок: %s', e)
                    await db.execute('INSERT INTO digests (tg_id, week) VALUES (?, ?)',
                                     (tg_id, week_key))
                    await db.commit()
        except Exception as e:
            log.exception('цикл підсумків: %s', e)
        await asyncio.sleep(600)


async def main():
    global db
    if not TOKEN:
        raise SystemExit('Нема BOT_TOKEN.')
    db = await aiosqlite.connect(DB)
    await db.execute('PRAGMA journal_mode=WAL')
    await db.executescript(SCHEMA)
    await db.commit()
    asyncio.create_task(weekly())
    try:
        await dp.start_polling(bot)
    finally:
        await db.close()


if __name__ == '__main__':
    asyncio.run(main())
