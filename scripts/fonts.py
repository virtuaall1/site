#!/usr/bin/env python3
"""Свои шрифты вместо гугловых.

    python3 scripts/fonts.py

Раньше страница шла за шрифтами на два чужих домена: сперва за css
на fonts.googleapis.com и только оттуда узнавала адреса файлов на
fonts.gstatic.com. Два рукопожатия подряд на самом критичном месте:
пока css не приехал, браузер не знает, что качать, и текст ждёт.

Скрипт раскладывает то же самое рядом с сайтом:

  * берёт скачанную копию из brand/story/fonts (её тянули для видео);
  * оставляет только те наборы символов, которыми сайт пользуется, —
    латиницу и кириллицу. Математику, символы, вьетнамский и
    расширенную латиницу гугл отдаёт на всякий случай, а весят они
    больше, чем всё остальное вместе;
  * подрезает диапазон насыщенности. Шрифты переменные, гугл отдаёт
    их от 200 до 900; сайту нужны 400-800 у Unbounded и 300-600 у
    Onest. Лишние промежуточные состояния — это лишние байты;
  * пишет css/fonts.css и кладёт файлы в fonts/.

В имени файла — восемь знаков хеша от его же содержимого. Поменялся
шрифт — поменялось имя, и вечный кеш в _headers не врёт.

Нужен fonttools: pip install fonttools brotli. В сборку на сервере
скрипт не входит — гоняем руками, когда меняется набор шрифтов.
"""
import hashlib
import io
import re
import sys
from pathlib import Path

try:
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
except ImportError:
    sys.exit('нужен fonttools: pip install fonttools brotli')

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'brand' / 'story' / 'fonts'
OUT = ROOT / 'fonts'
CSS = ROOT / 'css' / 'fonts.css'

KEEP = ('latin', 'cyrillic', 'cyrillic-ext')

BLOCK = re.compile(r'/\* ([\w-]+) \*/\s*@font-face \{(.*?)\}', re.S)
FIELD = {
    'family': re.compile(r"font-family: '([^']+)'"),
    'weight': re.compile(r'font-weight: ([^;]+);'),
    'url': re.compile(r'url\((\S+?)\)'),
    'range': re.compile(r'unicode-range: ([^;]+);'),
}


def main():
    mapping = dict(
        line.split() for line in (SRC / 'map.txt').read_text().splitlines() if line.strip()
    )
    css = (SRC / 'gf.css').read_text()

    faces = []
    for subset, body in BLOCK.findall(css):
        if subset not in KEEP:
            continue
        faces.append({
            'subset': subset,
            'family': FIELD['family'].search(body).group(1),
            'weight': FIELD['weight'].search(body).group(1).strip(),
            'file': mapping[FIELD['url'].search(body).group(1)],
            'range': FIELD['range'].search(body).group(1).strip(),
        })

    # какие насыщенности сайт вообще просит у каждого семейства
    used = {}
    for face in faces:
        low, high = used.get(face['family'], (9999, 0))
        w = float(face['weight'].split()[0])
        used[face['family']] = (min(low, w), max(high, w))

    OUT.mkdir(exist_ok=True)
    names = {}          # исходный файл → итоговое имя
    saved = 0
    for face in faces:
        key = face['file']
        if key in names:
            continue
        source = SRC / key
        low, high = used[face['family']]
        font = TTFont(source)
        if 'fvar' in font:
            font = instancer.instantiateVariableFont(
                font, {'wght': (low, high)}, inplace=False, updateFontNames=False)
        buf = io.BytesIO()
        font.flavor = 'woff2'
        font.save(buf)
        data = buf.getvalue()

        stamp = hashlib.sha1(data).hexdigest()[:8]
        name = f"{face['family'].lower()}-{face['subset']}-{stamp}.woff2"
        names[key] = name
        (OUT / name).write_bytes(data)
        saved += source.stat().st_size - len(data)
        print(f"  {name:38} {source.stat().st_size / 1024:5.1f} → {len(data) / 1024:5.1f} КБ")

    # старое из прошлых прогонов убираем: иначе уедет в dist мёртвым грузом
    for old in OUT.glob('*.woff2'):
        if old.name not in names.values():
            old.unlink()
            print(f"  убрано лишнее: {old.name}")

    blocks = []
    for face in faces:
        blocks.append(
            f"/* {face['family']} {face['weight']}, {face['subset']} */\n"
            "@font-face {\n"
            f"  font-family: '{face['family']}';\n"
            "  font-style: normal;\n"
            f"  font-weight: {face['weight']};\n"
            "  font-display: swap;\n"
            f"  src: url(../fonts/{names[face['file']]}) format('woff2');\n"
            f"  unicode-range: {face['range']};\n"
            "}"
        )

    head = (
        '/* Собрано scripts/fonts.py из копии Google Fonts.\n'
        '   Руками не править: правки затрёт следующий прогон.\n'
        '\n'
        f'   Наборы символов: {", ".join(KEEP)}. Шрифты переменные — на все\n'
        '   начертания один файл, поэтому блоков много, а качается ровно\n'
        '   столько, сколько наборов символов встретилось на странице.\n'
        '\n'
        '   Onest и Unbounded — SIL Open Font License 1.1: размещать у\n'
        '   себя обе лицензии разрешают. */\n\n'
    )
    CSS.write_text(head + '\n\n'.join(blocks) + '\n')

    total = sum(f.stat().st_size for f in OUT.glob('*.woff2'))
    print(f"\nfonts/: {len(names)} файлов, {total / 1024:.0f} КБ "
          f"(подрезка насыщенности сэкономила {saved / 1024:.0f} КБ)")
    print(f"css/fonts.css: {len(blocks)} блоков @font-face")
    print('Не забудь поправить адреса в <link rel="preload"> в index.html.')


if __name__ == '__main__':
    main()
