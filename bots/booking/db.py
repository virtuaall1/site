"""
Хранилище. SQLite, потому что для салона на три кресла этого хватает
с большим запасом, а обслуживать сервер базы никому не хочется.

Главное здесь — метод book(): бронь берётся одной транзакцией с
проверкой занятости внутри. Иначе двое, нажавшие на один слот в одну
секунду, оба получат «записано», и разбираться будет мастер.
"""
import aiosqlite
from datetime import datetime, timedelta

SCHEMA = """
CREATE TABLE IF NOT EXISTS clients (
    tg_id     INTEGER PRIMARY KEY,
    name      TEXT NOT NULL,
    phone     TEXT,
    created   TEXT NOT NULL,
    no_shows  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS visits (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    tg_id     INTEGER NOT NULL,
    master    TEXT NOT NULL,
    service   TEXT NOT NULL,
    starts    TEXT NOT NULL,          -- ISO, местное время
    minutes   INTEGER NOT NULL,
    price     INTEGER NOT NULL,       -- копейки, зафиксированные при записи
    status    TEXT NOT NULL DEFAULT 'booked',   -- booked | done | no_show | cancelled
    created   TEXT NOT NULL,
    reminded  TEXT NOT NULL DEFAULT ''          -- какие напоминания уже ушли
);

-- Двойную бронь ловим не проверкой в коде, а самой базой: на живую
-- запись мастера в конкретное время индекс просто не даст вставить
-- вторую строку.
CREATE UNIQUE INDEX IF NOT EXISTS visits_slot
    ON visits (master, starts) WHERE status IN ('booked', 'done');

CREATE INDEX IF NOT EXISTS visits_when ON visits (starts);

CREATE TABLE IF NOT EXISTS waitlist (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    tg_id    INTEGER NOT NULL,
    master   TEXT NOT NULL,
    service  TEXT NOT NULL,
    day      TEXT NOT NULL,           -- YYYY-MM-DD
    created  TEXT NOT NULL,
    UNIQUE (tg_id, master, day)
);
"""


class Store:
    def __init__(self, path):
        self.path = path
        self.db = None

    async def open(self):
        self.db = await aiosqlite.connect(self.path)
        self.db.row_factory = aiosqlite.Row
        await self.db.execute('PRAGMA journal_mode=WAL')
        await self.db.execute('PRAGMA foreign_keys=ON')
        await self.db.executescript(SCHEMA)
        await self.db.commit()

    async def close(self):
        if self.db:
            await self.db.close()

    # ---------- клиенты ----------
    async def remember(self, tg_id, name):
        await self.db.execute(
            'INSERT INTO clients (tg_id, name, created) VALUES (?, ?, ?) '
            'ON CONFLICT(tg_id) DO UPDATE SET name = excluded.name',
            (tg_id, name, datetime.now().isoformat(timespec='seconds')))
        await self.db.commit()

    async def set_phone(self, tg_id, phone):
        await self.db.execute('UPDATE clients SET phone = ? WHERE tg_id = ?', (phone, tg_id))
        await self.db.commit()

    async def client(self, tg_id):
        cur = await self.db.execute('SELECT * FROM clients WHERE tg_id = ?', (tg_id,))
        return await cur.fetchone()

    # ---------- занятость ----------
    async def busy(self, master, day):
        """Занятые интервалы мастера на день — как пары (начало, конец)."""
        cur = await self.db.execute(
            "SELECT starts, minutes FROM visits "
            "WHERE master = ? AND date(starts) = ? AND status IN ('booked', 'done')",
            (master, day))
        out = []
        for row in await cur.fetchall():
            begin = datetime.fromisoformat(row['starts'])
            out.append((begin, begin + timedelta(minutes=row['minutes'])))
        return out

    async def book(self, tg_id, master, service, starts, minutes, price):
        """Возвращает id записи или None, если слот успели занять."""
        try:
            cur = await self.db.execute(
                'INSERT INTO visits (tg_id, master, service, starts, minutes, price, created) '
                'VALUES (?, ?, ?, ?, ?, ?, ?)',
                (tg_id, master, service, starts.isoformat(timespec='minutes'),
                 minutes, price, datetime.now().isoformat(timespec='seconds')))
            await self.db.commit()
            return cur.lastrowid
        except aiosqlite.IntegrityError:
            return None

    async def visit(self, visit_id):
        cur = await self.db.execute('SELECT * FROM visits WHERE id = ?', (visit_id,))
        return await cur.fetchone()

    async def mine(self, tg_id):
        cur = await self.db.execute(
            "SELECT * FROM visits WHERE tg_id = ? AND status = 'booked' "
            "AND starts >= ? ORDER BY starts",
            (tg_id, datetime.now().isoformat(timespec='minutes')))
        return await cur.fetchall()

    async def day_of(self, master, day):
        cur = await self.db.execute(
            "SELECT v.*, c.name, c.phone FROM visits v JOIN clients c ON c.tg_id = v.tg_id "
            "WHERE v.master = ? AND date(v.starts) = ? AND v.status != 'cancelled' "
            "ORDER BY v.starts", (master, day))
        return await cur.fetchall()

    async def set_status(self, visit_id, status):
        await self.db.execute('UPDATE visits SET status = ? WHERE id = ?', (status, visit_id))
        if status == 'no_show':
            await self.db.execute(
                'UPDATE clients SET no_shows = no_shows + 1 '
                'WHERE tg_id = (SELECT tg_id FROM visits WHERE id = ?)', (visit_id,))
        await self.db.commit()

    # ---------- напоминания ----------
    async def due(self, mark, until):
        """Записи, которым пора отправить напоминание с меткой mark."""
        cur = await self.db.execute(
            "SELECT * FROM visits WHERE status = 'booked' AND starts <= ? AND starts > ? "
            "AND reminded NOT LIKE ?",
            (until.isoformat(timespec='minutes'),
             datetime.now().isoformat(timespec='minutes'), f'%{mark}%'))
        return await cur.fetchall()

    async def mark_reminded(self, visit_id, mark):
        await self.db.execute(
            "UPDATE visits SET reminded = reminded || ? WHERE id = ?", (f'{mark};', visit_id))
        await self.db.commit()

    # ---------- лист ожидания ----------
    async def wait(self, tg_id, master, service, day):
        try:
            await self.db.execute(
                'INSERT INTO waitlist (tg_id, master, service, day, created) VALUES (?, ?, ?, ?, ?)',
                (tg_id, master, service, day, datetime.now().isoformat(timespec='seconds')))
            await self.db.commit()
            return True
        except aiosqlite.IntegrityError:
            return False

    async def waiting_for(self, master, day):
        cur = await self.db.execute(
            'SELECT * FROM waitlist WHERE master = ? AND day = ? ORDER BY created', (master, day))
        return await cur.fetchall()

    async def drop_wait(self, wait_id):
        await self.db.execute('DELETE FROM waitlist WHERE id = ?', (wait_id,))
        await self.db.commit()

    # ---------- отчёты ----------
    async def stats(self, since):
        cur = await self.db.execute(
            "SELECT status, COUNT(*) n, COALESCE(SUM(price), 0) sum FROM visits "
            "WHERE starts >= ? GROUP BY status", (since,))
        return await cur.fetchall()

    async def by_master(self, since):
        cur = await self.db.execute(
            "SELECT master, COUNT(*) n, COALESCE(SUM(price), 0) sum FROM visits "
            "WHERE starts >= ? AND status = 'done' GROUP BY master ORDER BY sum DESC", (since,))
        return await cur.fetchall()

    async def by_service(self, since):
        cur = await self.db.execute(
            "SELECT service, COUNT(*) n FROM visits "
            "WHERE starts >= ? AND status = 'done' GROUP BY service ORDER BY n DESC", (since,))
        return await cur.fetchall()

    async def export(self, since):
        cur = await self.db.execute(
            "SELECT v.starts, v.master, v.service, v.price, v.status, c.name, c.phone "
            "FROM visits v JOIN clients c ON c.tg_id = v.tg_id "
            "WHERE v.starts >= ? ORDER BY v.starts", (since,))
        return await cur.fetchall()
