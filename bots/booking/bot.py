"""
Бот записи к мастеру.

  BOT_TOKEN=... BOT_OWNERS=123456 python3 bot.py

Что делает сам, без человека:
  — считает свободные окна из графика и уже занятого времени;
  — не даёт записать двоих на одно кресло (проверка в самой базе);
  — напоминает за сутки и за два часа;
  — при отмене сразу предлагает освободившееся время первому из
    листа ожидания, а не ждёт, пока кто-то заметит;
  — пишет мастеру о новой записи и об отмене;
  — считает загрузку и выручку, отдаёт выгрузку в CSV.
"""
import asyncio
import csv
import io
import logging
from datetime import datetime, timedelta, date

from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.types import (BufferedInputFile, CallbackQuery, InlineKeyboardButton,
                           InlineKeyboardMarkup, Message)

import config as cfg
from db import Store
from slots import free_slots, open_days, day_label

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('booking')

bot = Bot(cfg.TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp = Dispatcher()
store = Store(cfg.DB)


def kb(rows):
    return InlineKeyboardMarkup(inline_keyboard=rows)


def btn(text, data):
    return InlineKeyboardButton(text=text, callback_data=data)


def now():
    return datetime.now(cfg.TZ).replace(tzinfo=None)


# ============================ клиент ============================

MENU = kb([
    [btn('📅 Записатися', 'pick:service')],
    [btn('🗒 Мої записи', 'my')],
    [btn('💈 Послуги й ціни', 'prices')],
])


@dp.message(CommandStart())
async def start(msg: Message):
    await store.remember(msg.from_user.id, msg.from_user.full_name)
    await msg.answer(
        'Привіт! Це запис у барбершоп.\n\n'
        'Обери послугу — покажу вільний час. Нагадаю за добу й за дві години '
        'до візиту, переносити можна теж тут.',
        reply_markup=MENU)


@dp.callback_query(F.data == 'menu')
async def menu(cb: CallbackQuery):
    await cb.message.edit_text('Що робимо?', reply_markup=MENU)
    await cb.answer()


@dp.callback_query(F.data == 'prices')
async def prices(cb: CallbackQuery):
    lines = [f'<b>{s.title}</b> — {cfg.money(s.price)} · {s.minutes} хв' for s in cfg.SERVICES]
    await cb.message.edit_text('\n'.join(lines),
                               reply_markup=kb([[btn('← Назад', 'menu')]]))
    await cb.answer()


@dp.callback_query(F.data == 'pick:service')
async def pick_service(cb: CallbackQuery):
    rows = [[btn(f'{s.title} · {cfg.money(s.price)}', f'svc:{s.code}')] for s in cfg.SERVICES]
    rows.append([btn('← Назад', 'menu')])
    await cb.message.edit_text('Що робимо?', reply_markup=kb(rows))
    await cb.answer()


@dp.callback_query(F.data.startswith('svc:'))
async def pick_master(cb: CallbackQuery):
    code = cb.data.split(':')[1]
    fit = [m for m in cfg.MASTERS if code in m.services]
    rows = [[btn('Будь-хто вільний', f'day:{code}:any')]]
    rows += [[btn(m.name, f'day:{code}:{m.code}')] for m in fit]
    rows.append([btn('← Назад', 'pick:service')])
    await cb.message.edit_text(
        f'<b>{cfg.BY_CODE[code].title}</b>\nДо кого?', reply_markup=kb(rows))
    await cb.answer()


async def days_with_room(code, master_code):
    """Дни, где есть хотя бы одно окно. Пустые дни не показываем вовсе."""
    svc = cfg.BY_CODE[code]
    masters = [master_code] if master_code != 'any' else [
        m.code for m in cfg.MASTERS if code in m.services]
    out = []
    for day in open_days(now()):
        for m in masters:
            busy = await store.busy(m, day.isoformat())
            if free_slots(day, svc.minutes, busy, now()):
                out.append(day)
                break
    return out


@dp.callback_query(F.data.startswith('day:'))
async def pick_day(cb: CallbackQuery):
    _, code, master = cb.data.split(':')
    days = await days_with_room(code, master)
    if not days:
        await cb.message.edit_text(
            'На найближчі три тижні вільного немає.',
            reply_markup=kb([[btn('← Назад', f'svc:{code}')]]))
        return await cb.answer()

    rows, line = [], []
    for day in days[:14]:
        line.append(btn(day_label(day), f'slot:{code}:{master}:{day.isoformat()}'))
        if len(line) == 2:
            rows.append(line)
            line = []
    if line:
        rows.append(line)
    rows.append([btn('← Назад', f'svc:{code}')])
    await cb.message.edit_text('Коли зручно?', reply_markup=kb(rows))
    await cb.answer()


@dp.callback_query(F.data.startswith('slot:'))
async def pick_slot(cb: CallbackQuery):
    _, code, master, day_iso = cb.data.split(':')
    svc = cfg.BY_CODE[code]
    day = date.fromisoformat(day_iso)
    masters = [master] if master != 'any' else [
        m.code for m in cfg.MASTERS if code in m.services]

    # у «будь-хто вільний» одно и то же время может быть у разных
    # мастеров — показываем по одному разу, кто именно, решаем сами
    seen = {}
    for m in masters:
        busy = await store.busy(m, day_iso)
        for point in free_slots(day, svc.minutes, busy, now()):
            seen.setdefault(point, m)

    if not seen:
        rows = [[btn('🔔 Повідомити, якщо звільниться', f'wait:{code}:{masters[0]}:{day_iso}')],
                [btn('← Інший день', f'day:{code}:{master}')]]
        return await cb.message.edit_text('Цей день уже зайнятий.', reply_markup=kb(rows))

    rows, line = [], []
    for point in sorted(seen):
        line.append(btn(point.strftime('%H:%M'),
                        f'ok:{code}:{seen[point]}:{point.isoformat(timespec="minutes")}'))
        if len(line) == 4:
            rows.append(line)
            line = []
    if line:
        rows.append(line)
    rows.append([btn('🔔 Немає зручного часу', f'wait:{code}:{masters[0]}:{day_iso}')])
    rows.append([btn('← Інший день', f'day:{code}:{master}')])
    await cb.message.edit_text(
        f'<b>{svc.title}</b> · {day_label(day)}\nОбери час:', reply_markup=kb(rows))
    await cb.answer()


@dp.callback_query(F.data.startswith('ok:'))
async def confirm(cb: CallbackQuery):
    _, code, master, starts_iso = cb.data.split(':', 3)
    svc = cfg.BY_CODE[code]
    starts = datetime.fromisoformat(starts_iso)

    await store.remember(cb.from_user.id, cb.from_user.full_name)
    visit_id = await store.book(cb.from_user.id, master, code, starts, svc.minutes, svc.price)
    if visit_id is None:
        await cb.answer('Цей час щойно зайняли', show_alert=True)
        return await pick_slot(cb)

    m = cfg.MASTER_BY_CODE[master]
    await cb.message.edit_text(
        f'✅ Записав.\n\n<b>{svc.title}</b>\n{day_label(starts.date())}, '
        f'{starts:%H:%M} · {m.name}\n{cfg.money(svc.price)}\n\n'
        'Нагадаю за добу й за дві години.',
        reply_markup=kb([[btn('Мої записи', 'my')]]))
    await cb.answer()

    if m.tg_id:
        await bot.send_message(m.tg_id,
            f'Новий запис: {svc.title}, {starts:%d.%m %H:%M}, {cb.from_user.full_name}')


@dp.callback_query(F.data == 'my')
async def my(cb: CallbackQuery):
    rows = await store.mine(cb.from_user.id)
    if not rows:
        return await cb.message.edit_text('Записів немає.',
                                          reply_markup=kb([[btn('📅 Записатися', 'pick:service')]]))
    text, buttons = [], []
    for r in rows:
        starts = datetime.fromisoformat(r['starts'])
        svc = cfg.BY_CODE[r['service']]
        text.append(f'<b>{svc.title}</b>\n{day_label(starts.date())}, {starts:%H:%M} · '
                    f'{cfg.MASTER_BY_CODE[r["master"]].name}')
        buttons.append([btn(f'✕ Скасувати {starts:%d.%m %H:%M}', f'off:{r["id"]}')])
    buttons.append([btn('← Назад', 'menu')])
    await cb.message.edit_text('\n\n'.join(text), reply_markup=kb(buttons))
    await cb.answer()


@dp.callback_query(F.data.startswith('off:'))
async def cancel(cb: CallbackQuery):
    visit_id = int(cb.data.split(':')[1])
    v = await store.visit(visit_id)
    if not v or v['tg_id'] != cb.from_user.id or v['status'] != 'booked':
        return await cb.answer('Запис не знайдено')

    starts = datetime.fromisoformat(v['starts'])
    if starts - now() < timedelta(minutes=cfg.CANCEL_LIMIT_MIN):
        return await cb.answer(
            f'Скасувати можна не пізніше ніж за {cfg.CANCEL_LIMIT_MIN // 60} год. '
            'Подзвони в салон.', show_alert=True)

    await store.set_status(visit_id, 'cancelled')
    await cb.message.edit_text('Скасував. Записатись можна будь-коли.',
                               reply_markup=kb([[btn('📅 Записатися', 'pick:service')]]))
    await cb.answer()
    await offer_freed(v)


async def offer_freed(v):
    """Освободилось время — сразу зовём первого из листа ожидания."""
    day = datetime.fromisoformat(v['starts']).date().isoformat()
    for w in await store.waiting_for(v['master'], day):
        svc = cfg.BY_CODE[v['service']]
        starts = datetime.fromisoformat(v['starts'])
        try:
            await bot.send_message(w['tg_id'],
                f'🔔 Звільнилось: {day_label(starts.date())}, {starts:%H:%M}, '
                f'{cfg.MASTER_BY_CODE[v["master"]].name}.',
                reply_markup=kb([[btn(f'Забронювати {starts:%H:%M}',
                                      f'ok:{v["service"]}:{v["master"]}:{v["starts"]}')]]))
            await store.drop_wait(w['id'])
        except Exception as e:                      # заблокировал бота — идём к следующему
            log.warning('лист ожидания: %s', e)
        break


@dp.callback_query(F.data.startswith('wait:'))
async def waitlist(cb: CallbackQuery):
    _, code, master, day_iso = cb.data.split(':')
    added = await store.wait(cb.from_user.id, master, code, day_iso)
    await cb.answer('Уже в черзі' if not added else 'Додав у чергу', show_alert=True)


# ============================ мастер ============================

@dp.message(Command('my'))
async def master_day(msg: Message):
    me = next((m for m in cfg.MASTERS if m.tg_id == msg.from_user.id), None)
    if not me:
        return
    day = now().date().isoformat()
    rows = await store.day_of(me.code, day)
    if not rows:
        return await msg.answer('Сьогодні записів немає.')
    for r in rows:
        starts = datetime.fromisoformat(r['starts'])
        await msg.answer(
            f'{starts:%H:%M} · {cfg.BY_CODE[r["service"]].title}\n'
            f'{r["name"]} {r["phone"] or ""}'.strip(),
            reply_markup=kb([[btn('✅ Прийшов', f'done:{r["id"]}'),
                              btn('✕ Не прийшов', f'noshow:{r["id"]}')]]))


@dp.callback_query(F.data.startswith(('done:', 'noshow:')))
async def mark(cb: CallbackQuery):
    kind, visit_id = cb.data.split(':')
    await store.set_status(int(visit_id), 'done' if kind == 'done' else 'no_show')
    await cb.message.edit_reply_markup()
    await cb.answer('Записав')


# ============================ владелец ============================

@dp.message(Command('stats'))
async def stats(msg: Message):
    if msg.from_user.id not in cfg.OWNERS:
        return
    since = (now() - timedelta(days=30)).isoformat(timespec='minutes')
    total = {r['status']: (r['n'], r['sum']) for r in await store.stats(since)}
    done_n, done_sum = total.get('done', (0, 0))
    lines = [f'<b>За 30 днів</b>',
             f'Виконано: {done_n} на {cfg.money(done_sum)}',
             f'Скасовано: {total.get("cancelled", (0, 0))[0]}',
             f'Не прийшли: {total.get("no_show", (0, 0))[0]}', '']
    lines.append('<b>Майстри</b>')
    for r in await store.by_master(since):
        lines.append(f'{cfg.MASTER_BY_CODE[r["master"]].name}: {r["n"]} · {cfg.money(r["sum"])}')
    lines.append('')
    lines.append('<b>Послуги</b>')
    for r in await store.by_service(since):
        lines.append(f'{cfg.BY_CODE[r["service"]].title}: {r["n"]}')
    await msg.answer('\n'.join(lines))


@dp.message(Command('export'))
async def export(msg: Message):
    if msg.from_user.id not in cfg.OWNERS:
        return
    since = (now() - timedelta(days=90)).isoformat(timespec='minutes')
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(['коли', 'майстер', 'послуга', 'ціна', 'статус', 'клієнт', 'телефон'])
    for r in await store.export(since):
        w.writerow([r['starts'], r['master'], r['service'],
                    r['price'] / 100, r['status'], r['name'], r['phone'] or ''])
    await msg.answer_document(BufferedInputFile(
        buf.getvalue().encode('utf-8-sig'), filename='visits.csv'))


# ============================ напоминания ============================

async def reminders():
    """
    Раз в минуту смотрим, кому пора напомнить. Метка о доставке пишется
    в базу, поэтому перезапуск бота не рассылает всё заново.
    """
    while True:
        try:
            for minutes in cfg.REMIND_BEFORE:
                mark = f'r{minutes}'
                until = now() + timedelta(minutes=minutes)
                for v in await store.due(mark, until):
                    starts = datetime.fromisoformat(v['starts'])
                    svc = cfg.BY_CODE[v['service']]
                    when = 'завтра' if minutes >= 720 else 'сьогодні'
                    try:
                        await bot.send_message(v['tg_id'],
                            f'⏰ Нагадування: {when} о {starts:%H:%M} — {svc.title}, '
                            f'{cfg.MASTER_BY_CODE[v["master"]].name}.',
                            reply_markup=kb([[btn('✕ Скасувати', f'off:{v["id"]}')]]))
                    except Exception as e:
                        log.warning('нагадування: %s', e)
                    await store.mark_reminded(v['id'], mark)
        except Exception as e:
            log.exception('цикл нагадувань: %s', e)
        await asyncio.sleep(60)


async def main():
    if not cfg.TOKEN:
        raise SystemExit('Нема BOT_TOKEN. Візьми у @BotFather і поклади в змінну оточення.')
    await store.open()
    asyncio.create_task(reminders())
    try:
        await dp.start_polling(bot)
    finally:
        await store.close()


if __name__ == '__main__':
    asyncio.run(main())
