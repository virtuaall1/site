"""
Настройки бота записи.

Всё, что меняется у заказчика, лежит здесь: услуги, мастера, график.
Трогать код при этом не нужно — в этом смысл.
"""
import os
from dataclasses import dataclass
from datetime import time
from zoneinfo import ZoneInfo

TOKEN = os.environ.get('BOT_TOKEN', '')
DB = os.environ.get('BOT_DB', 'booking.sqlite3')
TZ = ZoneInfo(os.environ.get('BOT_TZ', 'Europe/Kyiv'))

# Кому доступны /stats и выгрузка. Свой id узнаётся у @userinfobot.
OWNERS = {int(x) for x in os.environ.get('BOT_OWNERS', '').replace(' ', '').split(',') if x}

# За сколько напоминать. Два напоминания вместо одного дают заметно
# меньше неявок: за сутки человек ещё может перенести, за два часа —
# уже просто не забудет.
REMIND_BEFORE = (24 * 60, 120)      # минуты

# Насколько вперёд открыта запись и насколько поздно можно отменить
HORIZON_DAYS = 21
CANCEL_LIMIT_MIN = 180


@dataclass(frozen=True)
class Service:
    code: str
    title: str
    minutes: int
    price: int          # в копейках: целые числа не «плывут» при сложении


@dataclass(frozen=True)
class Master:
    code: str
    name: str
    services: tuple     # коды услуг
    tg_id: int = 0      # чтобы бот писал мастеру о новых записях


SERVICES = (
    Service('haircut', 'Чоловіча стрижка', 45, 45000),
    Service('beard', 'Борода й вуса', 30, 30000),
    Service('combo', 'Стрижка + борода', 75, 65000),
    Service('kids', 'Дитяча стрижка', 30, 35000),
)

MASTERS = (
    Master('ihor', 'Ігор', ('haircut', 'beard', 'combo', 'kids')),
    Master('taras', 'Тарас', ('haircut', 'combo')),
    Master('olya', 'Оля', ('haircut', 'kids')),
)

# График: день недели (0 — понедельник) → начало и конец смены.
# Пустой день = выходной, писать про него отдельно не нужно.
SCHEDULE = {
    0: (time(10, 0), time(20, 0)),
    1: (time(10, 0), time(20, 0)),
    2: (time(10, 0), time(20, 0)),
    3: (time(10, 0), time(20, 0)),
    4: (time(10, 0), time(21, 0)),
    5: (time(11, 0), time(18, 0)),
}

SLOT_STEP = 15          # шаг сетки; услуга занимает столько шагов, сколько нужно

BY_CODE = {s.code: s for s in SERVICES}
MASTER_BY_CODE = {m.code: m for m in MASTERS}


def money(kop: int) -> str:
    return f'{kop // 100} ₴'
