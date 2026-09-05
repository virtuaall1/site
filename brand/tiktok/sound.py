#!/usr/bin/env python3
"""
Звук для роликов.

  python3 brand/tiktok/sound.py            # всем
  python3 brand/tiktok/sound.py price bot  # только названным

Звук синтезируется, а не берётся из библиотеки: так он попадает
ровно в моменты приземлений Крапки. Эти моменты рендер выкладывает
в tt-<сцена>.timing.json — считать их второй раз здесь нельзя, они
зависят от измеренной раскладки.

Что звучит:
  шаг      — короткий «поп» с падающей высотой, по одному на каждое
             приземление; высота растёт от шага к шагу по
             пентатонике, поэтому список читается как подъём, а не
             как набор одинаковых щелчков;
  полёт    — тихий шорох между шагами, чтобы прыжок не был немым;
  финал    — низкий удар в момент, когда Крапка садится на плашку,
             и светлый звоночек в момент подмены.

Громко не делаем. В TikTok поверх кладут трек из библиотеки — наши
звуки должны читаться под ним, а не спорить с ним.
"""
import json
import os
import subprocess
import sys
import numpy as np

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.join(HERE, 'video')
FFMPEG = os.environ.get('FFMPEG_PATH',
    '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2')

# пентатоника: соседние ноты не спорят между собой, в каком бы
# порядке их ни сыграть
STEPS = [0, 3, 5, 7, 10, 12, 15, 17]
BASE = 523.25          # до пятой октавы


def env(n, attack=0.003, decay=0.08):
    """Резкая атака, экспоненциальный спад — так звучит удар."""
    t = np.arange(n) / SR
    a = np.clip(t / attack, 0, 1)
    return a * np.exp(-t / decay)


def pop(i):
    """Шаг. Высота падает внутри самого звука — это и даёт «поп»."""
    n = int(SR * 0.09)
    t = np.arange(n) / SR
    f0 = BASE * 2 ** (STEPS[i % len(STEPS)] / 12)
    freq = f0 * np.exp(-t * 9) * 0.45 + f0 * 0.62
    wave = np.sin(2 * np.pi * np.cumsum(freq) / SR)
    click = np.random.default_rng(i).normal(0, 1, n) * np.exp(-t / 0.0016) * 0.35
    return (wave * 0.9 + click) * env(n, 0.002, 0.05)


def whoosh(dur):
    """Полёт. Шум, который набирает и теряет громкость."""
    n = max(1, int(SR * dur))
    t = np.arange(n) / SR
    noise = np.random.default_rng(7).normal(0, 1, n)
    # простой однополюсный фильтр: убирает песок сверху
    out = np.zeros(n)
    acc = 0.0
    for k in range(n):
        acc += 0.06 * (noise[k] - acc)
        out[k] = acc
    swell = np.sin(np.pi * t / dur) ** 2
    return out / (np.max(np.abs(out)) or 1) * swell


def thump():
    """Финал: низкий удар — Крапка села на плашку."""
    n = int(SR * 0.34)
    t = np.arange(n) / SR
    freq = 78 * np.exp(-t * 7) + 44
    body = np.sin(2 * np.pi * np.cumsum(freq) / SR) * env(n, 0.002, 0.14)
    return body


def chime():
    """Подмена на плашку: короткий светлый звоночек."""
    n = int(SR * 0.5)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for mult, amp in ((1, 1.0), (2.0, 0.4), (3.01, 0.18)):
        out += np.sin(2 * np.pi * BASE * 2 * mult * t) * amp
    return out * env(n, 0.002, 0.16) / 1.6


def put(track, sound, at, gain):
    i = int(at * SR)
    n = min(len(sound), len(track) - i)
    if n > 0:
        track[i:i + n] += sound[:n] * gain


def build(timing):
    dur = timing['seconds']
    track = np.zeros(int(SR * dur))
    stops = timing['stops']

    for i, at in enumerate(stops):
        t = at * dur
        # шорох полёта — перед приземлением
        prev = stops[i - 1] * dur if i else 0.0
        flight = max(0.12, min(0.5, (t - prev) * 0.7))
        put(track, whoosh(flight), max(0, t - flight), 0.10)
        # последний шаг — это посадка на плашку, у него свой звук
        if i < len(stops) - 1:
            put(track, pop(i), t, 0.42)
        else:
            put(track, thump(), t, 0.55)

    put(track, chime(), timing['swap'] * dur, 0.30)

    peak = np.max(np.abs(track)) or 1.0
    return (track / peak * 0.71).astype(np.float32)   # −3 dBFS


def main(names):
    files = sorted(f for f in os.listdir(VIDEO) if f.endswith('.timing.json'))
    done = 0
    for f in files:
        scene = f[len('tt-'):-len('.timing.json')]
        if names and scene not in names:
            continue
        timing = json.load(open(os.path.join(VIDEO, f)))
        audio = build(timing)

        wav = os.path.join(VIDEO, f'tt-{scene}.wav')
        pcm = (np.clip(audio, -1, 1) * 32767).astype('<i2')
        import wave as wavemod
        with wavemod.open(wav, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())

        src = os.path.join(VIDEO, f'tt-{scene}.mp4')
        out = os.path.join(VIDEO, f'tt-{scene}.snd.mp4')
        subprocess.run([FFMPEG, '-y', '-hide_banner', '-loglevel', 'error',
                        '-i', src, '-i', wav,
                        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
                        '-ac', '2', '-shortest', '-movflags', '+faststart', out],
                       check=True)
        os.replace(out, src)
        os.remove(wav)
        size = os.path.getsize(src) / 1048576
        print(f'  ♪ tt-{scene}.mp4  {len(timing["stops"])} шагов  {size:.1f} МБ')
        done += 1

    if not done:
        print('Нечего озвучивать: сначала отрендерь ролики.')


if __name__ == '__main__':
    main(set(sys.argv[1:]))
