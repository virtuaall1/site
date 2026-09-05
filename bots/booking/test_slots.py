"""
Проверка расчёта окон. Запускается без телеграма и без базы:
  python3 -m pytest bots/booking/test_slots.py   (или просто запустить файл)
"""
import sys
from datetime import date, datetime, timedelta

sys.path.insert(0, __file__.rsplit('/', 1)[0])
from slots import free_slots, work_hours   # noqa: E402

MON = date(2026, 9, 7)          # понедельник, смена 10:00–20:00
SUN = date(2026, 9, 13)         # воскресенье, выходной
EARLY = datetime(2026, 9, 7, 6, 0)


def check(name, got, want):
    print(('  ок  ' if got == want else 'ПАДАЕТ') + f'  {name}')
    if got != want:
        print(f'        ожидали {want}, получили {got}')
    return got == want


ok = True

ok &= check('выходной не даёт окон', free_slots(SUN, 45, [], EARLY), [])

slots = free_slots(MON, 45, [], EARLY)
ok &= check('первое окно — начало смены', slots[0], datetime(2026, 9, 7, 10, 0))
ok &= check('последнее влезает до закрытия', slots[-1] + timedelta(minutes=45),
            datetime(2026, 9, 7, 20, 0))

# длинная услуга не должна вылезать за смену
long_slots = free_slots(MON, 75, [], EARLY)
ok &= check('длинная услуга не вылезает за смену',
            long_slots[-1] + timedelta(minutes=75), datetime(2026, 9, 7, 20, 0))

# занятое время перекрывает соседние окна, а не только своё
busy = [(datetime(2026, 9, 7, 12, 0), datetime(2026, 9, 7, 12, 45))]
with_busy = free_slots(MON, 45, busy, EARLY)
ok &= check('занятое окно исчезло', datetime(2026, 9, 7, 12, 0) in with_busy, False)
ok &= check('окно внахлёст тоже исчезло', datetime(2026, 9, 7, 11, 45) in with_busy, False)
ok &= check('окно вплотную осталось', datetime(2026, 9, 7, 12, 45) in with_busy, True)

# ближайшие полчаса не предлагаем
soon = free_slots(MON, 45, [], datetime(2026, 9, 7, 11, 40))
ok &= check('через 20 минут не предлагаем', datetime(2026, 9, 7, 12, 0) in soon, False)
ok &= check('через 50 минут предлагаем', datetime(2026, 9, 7, 12, 30) in soon, True)

print('\nвсё сошлось' if ok else '\nесть расхождения')
sys.exit(0 if ok else 1)
