#!/usr/bin/env python3
"""
Пережимает снимки кейсов в webp и avif рядом с исходным jpg.

  python3 scripts/images.py            # только то, что устарело
  python3 scripts/images.py --force    # всё заново

Дизайн от этого не меняется: картинка та же, тех же размеров, просто
в двух современных форматах. Их подставляет <picture>, а старый jpg
остаётся последним запасным вариантом — он и уйдёт браузерам, которые
avif с webp не понимают.

Качество подобрано по месту: на снимках интерфейса важны тонкие
линии и мелкий шрифт, поэтому agressive-режимы не годятся — рябь на
однопиксельных линейках заметнее, чем экономия.
"""
import os
import sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, 'img', 'cases')

WEBP = dict(format='WEBP', quality=82, method=6)
AVIF = dict(format='AVIF', quality=62, speed=2)

force = '--force' in sys.argv


def newer(src, dst):
    """Пережимать только то, что реально устарело."""
    return not os.path.exists(dst) or os.path.getmtime(src) > os.path.getmtime(dst)


def main():
    if not os.path.isdir(SRC):
        print('нет папки', SRC)
        return 1

    total_jpg = total_webp = total_avif = 0
    done = 0

    for name in sorted(os.listdir(SRC)):
        if not name.endswith('.jpg'):
            continue
        src = os.path.join(SRC, name)
        base = name[:-4]
        jpg_size = os.path.getsize(src)
        total_jpg += jpg_size

        line = [f'{base:<12} jpg {jpg_size / 1024:6.1f}']

        for ext, opts in (('webp', WEBP), ('avif', AVIF)):
            dst = os.path.join(SRC, f'{base}.{ext}')
            if force or newer(src, dst):
                with Image.open(src) as im:
                    im.convert('RGB').save(dst, **opts)
                done += 1
            size = os.path.getsize(dst)
            if ext == 'webp':
                total_webp += size
            else:
                total_avif += size
            line.append(f'{ext} {size / 1024:6.1f} ({size / jpg_size - 1:+.0%})')

        print('  ' + '  '.join(line) + ' КБ')

    if total_jpg:
        print()
        print(f'  разом: jpg {total_jpg / 1024:.0f} КБ · '
              f'webp {total_webp / 1024:.0f} КБ ({total_webp / total_jpg - 1:+.0%}) · '
              f'avif {total_avif / 1024:.0f} КБ ({total_avif / total_jpg - 1:+.0%})')
    print(f'  пережато файлів: {done}' if done else '  усе вже актуальне')
    return 0


if __name__ == '__main__':
    sys.exit(main())
