"""
Свободные окна.

Тут одна нетривиальная вещь: услуга занимает не «одну клетку», а
столько времени, сколько длится. Поэтому окно годится, только если
подряд свободен весь нужный отрезок, и он целиком помещается в смену.
Без этого бот радостно записывает стрижку с бородой на 19:45 при
закрытии в 20:00.
"""
from datetime import datetime, timedelta

from config import SCHEDULE, SLOT_STEP, TZ, HORIZON_DAYS


def work_hours(day):
    """Смена конкретного дня или None, если выходной."""
    return SCHEDULE.get(day.weekday())


def free_slots(day, minutes, busy, now=None):
    """
    day     — date
    minutes — сколько длится услуга
    busy    — [(начало, конец)] уже занятого
    Возвращает список datetime — начала свободных окон.
    """
    hours = work_hours(day)
    if not hours:
        return []

    begin = datetime.combine(day, hours[0])
    end = datetime.combine(day, hours[1])
    now = now or datetime.now(TZ).replace(tzinfo=None)

    out = []
    point = begin
    while point + timedelta(minutes=minutes) <= end:
        finish = point + timedelta(minutes=minutes)
        # прошедшее время не предлагаем, и в ближайшие полчаса тоже:
        # человек физически не успеет доехать
        too_late = point <= now + timedelta(minutes=30)
        clash = any(point < b_end and b_start < finish for b_start, b_end in busy)
        if not too_late and not clash:
            out.append(point)
        point += timedelta(minutes=SLOT_STEP)
    return out


def open_days(now=None):
    """Дни, на которые вообще открыта запись."""
    now = now or datetime.now(TZ).replace(tzinfo=None)
    today = now.date()
    return [today + timedelta(days=i)
            for i in range(HORIZON_DAYS)
            if work_hours(today + timedelta(days=i))]


DAY_NAMES = ('пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд')
MONTHS = ('січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
          'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня')


def day_label(day, today=None):
    today = today or datetime.now(TZ).date()
    if day == today:
        return 'сьогодні'
    if (day - today).days == 1:
        return 'завтра'
    return f'{day.day} {MONTHS[day.month - 1]}, {DAY_NAMES[day.weekday()]}'
