#!/usr/bin/env python3
"""
Звук для сторис-обзора сайта.

  python3 brand/story/sound.py              # всем
  python3 brand/story/sound.py st-3-price   # только названным

Моменты берутся из <id>.timing.json — их пишет render.js по тому же
сценарию, что рисует картинку. Руками числа не переписываются.

Логика простая: это запись экрана, а не музыкальный клип. Поэтому
подложка почти неслышная, а вперёд выходят только те звуки, которые
на телефоне действительно есть: шорох броска пальцем и щелчок
нажатия. Подписи получают едва заметный блик, финал — тёплый аккорд.

Сторис часто смотрят без звука, поэтому общий уровень ниже, чем в
роликах для тиктока.
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

rng = np.random.default_rng(7)


def env(n, attack=0.003, decay=0.08):
    t = np.arange(n) / SR
    return np.clip(t / attack, 0, 1) * np.exp(-t / decay)


def tone(dur, f_from, f_to, decay=0.08, attack=0.003):
    n = int(SR * dur)
    t = np.arange(n) / SR
    freq = f_to + (f_from - f_to) * np.exp(-t * 12)
    return np.sin(2 * np.pi * np.cumsum(freq) / SR) * env(n, attack, decay)


def lowpass(x, smooth):
    """Однополюсный фильтр: чем меньше smooth, тем глуше."""
    out = np.zeros(len(x))
    acc = 0.0
    for k in range(len(x)):
        acc += smooth * (x[k] - acc)
        out[k] = acc
    return out


def noise(dur, smooth=0.06, decay=0.05, attack=0.002):
    n = int(SR * dur)
    out = lowpass(rng.normal(0, 1, n), smooth)
    out /= (np.max(np.abs(out)) or 1)
    return out * env(n, attack, decay)


def mix(*parts):
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[:len(p)] += p
    return out


# ---------- голоса ----------
def voice_swipe():
    """Бросок пальцем: короткий шорох, будто страница поехала."""
    n = int(SR * 0.34)
    raw = lowpass(rng.normal(0, 1, n), 0.10)
    raw /= (np.max(np.abs(raw)) or 1)
    t = np.arange(n) / SR
    shape = np.clip(t / 0.02, 0, 1) * np.exp(-t / 0.11)
    return raw * shape * 0.30


def voice_tap():
    """Нажатие: сухой щелчок с коротким телом, как отклик кнопки."""
    return mix(noise(0.028, 0.55, 0.008) * 0.55,
               tone(0.05, 1400, 780, decay=0.018) * 0.30)


def voice_press():
    """Палец задержался на кнопке: щелчок мягче и ниже."""
    return mix(noise(0.03, 0.30, 0.012) * 0.40,
               tone(0.09, 620, 420, decay=0.04) * 0.28)


def voice_cap():
    """Появилась подпись: едва слышный блик сверху."""
    return tone(0.10, 2100, 1650, decay=0.035, attack=0.004) * 0.16


def voice_outro():
    """Финальный аккорд: три ноты пентатоники, тёплый и короткий."""
    return mix(*[tone(1.5, f * 1.02, f, decay=0.55, attack=0.02) * g
                 for f, g in ((196.0, .30), (293.7, .22), (392.0, .16))])


VOICES = {'swipe': voice_swipe, 'tap': voice_tap, 'press': voice_press,
          'cap': voice_cap, 'outro': voice_outro}


def bed(seconds):
    """Подложка: очень тихий гул и «воздух». Слышно, что звук есть."""
    n = int(SR * seconds)
    t = np.arange(n) / SR
    hum = sum(np.sin(2 * np.pi * f * t) * g for f, g in ((49.0, .05), (98.0, .028), (147.0, .014)))
    air = lowpass(rng.normal(0, 1, n), 0.004)
    air /= (np.max(np.abs(air)) or 1)
    fade = np.clip(t / 0.6, 0, 1) * np.clip((seconds - t) / 0.8, 0, 1)
    return (hum + air * 0.05) * fade * 0.5


def build(timing):
    seconds = timing['seconds']
    track = bed(seconds)
    for e in timing['events']:
        make = VOICES.get(e['kind'])
        if not make:
            continue
        part = make()
        at = int(e['at'] * SR)
        end = min(len(track), at + len(part))
        if end > at:
            track[at:end] += part[:end - at]
    peak = np.max(np.abs(track)) or 1
    return (track / peak * 0.55).astype(np.float32)   # тише обычного: сторис смотрят молча


def main(names):
    if not os.path.isdir(VIDEO):
        print('Сначала сними ролики: node brand/story/render.js')
        return
    files = sorted(f for f in os.listdir(VIDEO) if f.endswith('.timing.json'))
    done = 0
    for f in files:
        scene = f[:-len('.timing.json')]
        if names and scene not in names:
            continue
        timing = json.load(open(os.path.join(VIDEO, f)))
        audio = build(timing)

        wav = os.path.join(VIDEO, scene + '.wav')
        with wavemod.open(wav, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((np.clip(audio, -1, 1) * 32767).astype('<i2').tobytes())

        src = os.path.join(VIDEO, scene + '.mp4')
        out = os.path.join(VIDEO, scene + '.snd.mp4')
        subprocess.run([FFMPEG, '-y', '-hide_banner', '-loglevel', 'error',
                        '-i', src, '-i', wav, '-c:v', 'copy', '-c:a', 'aac',
                        '-b:a', '128k', '-ac', '2', '-shortest',
                        '-movflags', '+faststart', out], check=True)
        os.replace(out, src)
        os.remove(wav)

        by = {}
        for e in timing['events']:
            by[e['kind']] = by.get(e['kind'], 0) + 1
        print(f'  ♪ {scene}.mp4  {by}')
        done += 1

    if not done:
        print('Нечего озвучивать: нет ни одного <id>.timing.json')


if __name__ == '__main__':
    main(set(sys.argv[1:]))
