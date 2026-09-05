#!/usr/bin/env python3
"""
Звук для роликов инстаграма.

  python3 brand/instagram/sound.py            # всем
  python3 brand/instagram/sound.py price dots # только названным

Моменты событий берутся из reel-<сцена>.timing.json — их снимает
timing.js прогоном самой сцены, а не переписыванием чисел руками.
Здесь решается только одно: чем каждое событие звучит.

У сцен разные механики, поэтому один и тот же «pop» звучит
по-разному: в переписке это пузырь, в списке технологий — сухой
щелчок, в кейсах — затвор, в чек-листе — светлый тик. Иначе
двенадцать роликов звучали бы одинаково, а они и сделаны затем,
чтобы не быть одинаковыми.

Тише, чем в TikTok: сторис часто смотрят без звука, и подложка не
должна лезть вперёд картинки.
"""
import json
import os
import subprocess
import sys
import wave as wavemod
import numpy as np

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.join(HERE, 'video')
FFMPEG = os.environ.get('FFMPEG_PATH',
    '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2')

rng = np.random.default_rng(11)


def env(n, attack=0.003, decay=0.08):
    t = np.arange(n) / SR
    return np.clip(t / attack, 0, 1) * np.exp(-t / decay)


def tone(dur, f_from, f_to, decay=0.08, attack=0.003):
    n = int(SR * dur)
    t = np.arange(n) / SR
    freq = f_to + (f_from - f_to) * np.exp(-t * 12)
    return np.sin(2 * np.pi * np.cumsum(freq) / SR) * env(n, attack, decay)


def noise(dur, smooth=0.06, decay=0.05, attack=0.002):
    """Шум, придавленный сверху простым однополюсным фильтром."""
    n = int(SR * dur)
    raw = rng.normal(0, 1, n)
    out = np.zeros(n)
    acc = 0.0
    for k in range(n):
        acc += smooth * (raw[k] - acc)
        out[k] = acc
    out /= (np.max(np.abs(out)) or 1)
    return out * env(n, attack, decay)


def swell(dur, smooth=0.05):
    n = int(SR * dur)
    t = np.arange(n) / SR
    raw = rng.normal(0, 1, n)
    out = np.zeros(n)
    acc = 0.0
    for k in range(n):
        acc += smooth * (raw[k] - acc)
        out[k] = acc
    out /= (np.max(np.abs(out)) or 1)
    return out * np.sin(np.pi * t / dur) ** 2


def mix(*parts):
    """Складывает куски разной длины: короткий просто короче звучит."""
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[:len(p)] += p
    return out


# ---------- голоса ----------
PENTA = [0, 3, 5, 7, 10, 12, 15]


def voice_bubble(i):
    """Переписка: мягкий пузырь, свои и чужие сообщения разной высоты."""
    base = 520 if i % 2 else 700
    return tone(0.13, base * 1.6, base, decay=0.05) * 0.8


def voice_chip(i):
    """Плашки стека: сухой щелчок, высота растёт по волне."""
    f = 440 * 2 ** (PENTA[i % len(PENTA)] / 12) * 2
    return mix(tone(0.05, f * 1.4, f, decay=0.022) * 0.7, noise(0.02, 0.35, 0.006)) * 0.8


def voice_shutter(i):
    """Кейсы: короткий затвор — так читается смена снимка."""
    return mix(noise(0.09, 0.5, 0.02) * 0.9, tone(0.05, 1600, 900, decay=0.02) * 0.3)


def voice_check(i):
    """Чек-лист: светлый тик, будто галочку прочертили."""
    f = 1500 * 2 ** (PENTA[i % 4] / 12)
    return mix(tone(0.14, f * 1.25, f, decay=0.05) * 0.55, noise(0.03, 0.6, 0.012) * 0.4)


def voice_step(i):
    """Шаги и строки: низкий мягкий удар."""
    f = 300 * 2 ** (PENTA[i % len(PENTA)] / 12)
    return tone(0.16, f * 1.5, f, decay=0.07) * 0.75


def voice_thud(i):
    return tone(0.26, 150, 82, decay=0.12) * 0.9


def voice_tick(i):
    """Накрутка чисел: мелкий блик, высота чуть плывёт вверх."""
    f = 2200 + (i % 12) * 60
    return tone(0.03, f, f * 0.8, decay=0.012, attack=0.001) * 0.5


def voice_key(i):
    """Набор в терминале: щелчок клавиши, без высоты."""
    return noise(0.024, 0.45, 0.007) * 0.85


def voice_swarm(i):
    """Точки слетаются: россыпь коротких бликов, густеет и тает."""
    n = int(SR * 2.9)
    out = np.zeros(n)
    for k in range(260):
        p = k / 260
        at = int(p * (n - SR // 4))
        f = 900 + rng.random() * 2600
        g = np.sin(np.pi * p) ** 1.5 * 0.22
        piece = tone(0.05, f, f * 0.85, decay=0.02) * g
        room = max(0, n - at)
        out[at:at + min(len(piece), room)] += piece[:min(len(piece), room)]
    return out


def voice_chord(i):
    """Знак загорелся: мягкий аккорд на пентатонике."""
    n = int(SR * 1.6)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for st, amp in ((0, 1.0), (7, 0.6), (12, 0.45), (19, 0.25)):
        out += np.sin(2 * np.pi * 261.6 * 2 ** (st / 12) * t) * amp
    return out / 2.3 * env(n, 0.05, 0.55)


# У каждой сцены свой голос для «pop» — иначе все ролики звучат одинаково
POPS = {
    'chat': voice_bubble,
    'stack': voice_chip,
    'cases': voice_shutter,
    'checklist': voice_check,
    'flow': voice_step,
    'price': voice_thud,
    'counter': voice_thud,
    'wipe': voice_thud,
}
TICKS = {'terminal': voice_key}


def build(t):
    dur = t['seconds']
    scene = t['scene']
    track = np.zeros(int(SR * dur) + SR)
    pop = POPS.get(scene, voice_step)
    tick = TICKS.get(scene, voice_tick)

    counters = {'pop': 0, 'tick': 0}
    for e in t['events']:
        kind, at = e['kind'], e['at'] * dur
        i = counters.get(kind, 0)
        if kind == 'pop':
            snd, gain = pop(i), 0.5
        elif kind == 'tick':
            snd, gain = tick(i), 0.30
        elif kind == 'whoosh':
            snd, gain = swell(0.55), 0.28
            at -= 0.18
        elif kind == 'swarm':
            snd, gain = voice_swarm(i), 0.5
        elif kind == 'chord':
            snd, gain = voice_chord(i), 0.55
        else:
            continue
        counters[kind] = i + 1

        k = int(max(0, at) * SR)
        n = min(len(snd), len(track) - k)
        if n > 0:
            track[k:k + n] += snd[:n] * gain

    track = track[:int(SR * dur)]
    peak = np.max(np.abs(track)) or 1.0
    return (track / peak * 0.63).astype(np.float32)   # −4 dBFS: подложка


def main(names):
    files = sorted(f for f in os.listdir(VIDEO) if f.endswith('.timing.json'))
    done = 0
    for f in files:
        scene = f[len('reel-'):-len('.timing.json')]
        if names and scene not in names:
            continue
        t = json.load(open(os.path.join(VIDEO, f)))
        audio = build(t)

        wav = os.path.join(VIDEO, f'reel-{scene}.wav')
        with wavemod.open(wav, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((np.clip(audio, -1, 1) * 32767).astype('<i2').tobytes())

        src = os.path.join(VIDEO, f'reel-{scene}.mp4')
        out = os.path.join(VIDEO, f'reel-{scene}.snd.mp4')
        subprocess.run([FFMPEG, '-y', '-hide_banner', '-loglevel', 'error',
                        '-i', src, '-i', wav, '-c:v', 'copy', '-c:a', 'aac',
                        '-b:a', '128k', '-ac', '2', '-shortest',
                        '-movflags', '+faststart', out], check=True)
        os.replace(out, src)
        os.remove(wav)
        by = {}
        for e in t['events']:
            by[e['kind']] = by.get(e['kind'], 0) + 1
        print(f'  ♪ reel-{scene}.mp4  {by}')
        done += 1

    if not done:
        print('Нечего озвучивать: сначала сними тайминги (timing.js).')


if __name__ == '__main__':
    main(set(sys.argv[1:]))
