"""Synthesises the sound effects for the Undercards cast VFX.

Every sound is built from code (chiptune oscillators, noise, filters, a small
echo/reverb), so it's original and free to use. Each one is timed to its
animation: frame f of the 16 fps VFX happens at f / 16 seconds.

Writes, per effect, into out/sfx/<Effect>/:
  <Effect>.wav  (44.1 kHz, 16-bit, mono: the master)
  <Effect>.ogg  (Vorbis: best for browser games)
  <Effect>.mp3
and a preview video with the animation and the sound, out/sfx/<Effect>/<Effect>-preview.mp4.

Run: python3 scripts/sfx/make_sfx.py            (all sounds)
     python3 scripts/sfx/make_sfx.py ClassJustice (just one; ClassJustice-v2 for the second set)
Tweak a sound by editing its function below (times are in frames).
"""

import os
import subprocess

import numpy as np
from scipy.signal import butter, lfilter

SR = 44100
FPS = 16
LENGTH = 1.9  # seconds: the 1.5 s animation plus room for tails to ring out
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RNG = np.random.default_rng(7)


def at(frame):
    """Animation frame -> seconds."""
    return frame / FPS


# ------------------------------------------------------------- building blocks

def tt(dur):
    return np.arange(int(dur * SR)) / SR


def osc(kind, freq, dur, duty=0.5, phase=0.0):
    """Oscillator. `freq` is a number or a function of time (for sweeps)."""
    t = tt(dur)
    f = freq(t) if callable(freq) else np.full_like(t, float(freq))
    ph = phase + np.cumsum(f) / SR
    frac = ph % 1.0
    if kind == "sine":
        return np.sin(2 * np.pi * ph)
    if kind == "square":
        return np.where(frac < duty, 1.0, -1.0)
    if kind == "triangle":
        return 4 * np.abs(frac - 0.5) - 1
    if kind == "saw":
        return 2 * frac - 1
    raise ValueError(kind)


def noise(dur, rate=None):
    """White noise; with `rate` (Hz) it's sample-and-hold, like 8-bit noise channels."""
    n = int(dur * SR)
    if rate is None:
        return RNG.uniform(-1, 1, n)
    step = max(1, int(SR / rate))
    return np.repeat(RNG.uniform(-1, 1, n // step + 1), step)[:n]


def env(dur, attack=0.002, decay=0.1, sustain=0.0, release=None, curve=4.0):
    """Attack, then exponential decay towards `sustain`; optional linear release at the end."""
    t = tt(dur)
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    d = sustain + (1 - sustain) * np.exp(-np.maximum(t - attack, 0) * curve / max(decay, 1e-4))
    e = a * d
    if release:
        e *= np.clip((dur - t) / release, 0, 1)
    return e


def lowpass(x, cutoff, order=2):
    b, a = butter(order, min(cutoff, SR / 2 - 100) / (SR / 2), "low")
    return lfilter(b, a, x)


def highpass(x, cutoff, order=2):
    b, a = butter(order, cutoff / (SR / 2), "high")
    return lfilter(b, a, x)


def bandpass(x, lo, hi, order=2):
    b, a = butter(order, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], "band")
    return lfilter(b, a, x)


def crush(x, bits=6, hold=2):
    """Light 8-bit flavour: fewer amplitude steps and a lower sample rate."""
    q = 2 ** (bits - 1)
    y = np.round(x * q) / q
    return np.repeat(y[::hold], hold)[: len(x)]


def reverb(x, time=0.35, mix=0.25):
    """Short, airy reverb (convolution with decaying noise)."""
    n = int(time * SR)
    ir = RNG.normal(0, 1, n) * np.exp(-np.arange(n) / SR * 6 / time)
    ir = lowpass(ir, 6000)
    ir /= np.sqrt(np.sum(ir ** 2))
    wet = np.convolve(x, ir)[: len(x)]
    return (1 - mix) * x + mix * wet


def echo(x, delay=0.09, feedback=0.35, taps=3):
    d = int(delay * SR)
    y = np.zeros(len(x) + taps * d)
    g = 1.0
    for k in range(taps + 1):
        y[k * d:k * d + len(x)] += x * g
        g *= feedback
    return y


def stack(*sigs):
    """Adds sounds of different lengths, all starting together."""
    out = np.zeros(max(len(x) for x in sigs))
    for x in sigs:
        out[: len(x)] += x
    return out


class Mix:
    def __init__(self):
        self.buf = np.zeros(int(LENGTH * SR))

    def add(self, sig, t0, gain=1.0):
        i = int(t0 * SR)
        if i >= len(self.buf):
            return
        j = min(len(self.buf), i + len(sig))
        self.buf[i:j] += sig[: j - i] * gain

    def master(self, verb=0.2, verb_time=0.35):
        y = highpass(self.buf, 40)
        y = reverb(y, verb_time, verb)
        y /= max(1e-9, np.max(np.abs(y))) / 0.89  # peak at about -1 dB
        fade = int(0.05 * SR)
        y[-fade:] *= np.linspace(1, 0, fade)
        return y


NOTE = {n: 440 * 2 ** ((i - 9) / 12) for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def hz(name, octave):
    return NOTE[name] * 2 ** (octave - 4)


# ------------------------------------------------------------ shared sounds

def blip(freq, dur=0.06, kind="square", duty=0.25, decay=0.05, sweep=0.0):
    f = (lambda t: freq * (1 + sweep * t / dur)) if sweep else freq
    return osc(kind, f, dur, duty) * env(dur, 0.001, decay)


def pop_in(base=600):
    """The little 'bloop' when an element pops onto the card."""
    s = osc("square", lambda t: base * (1 + 3 * t / 0.07), 0.07, 0.25) * env(0.07, 0.001, 0.05)
    return crush(lowpass(s, 5000), 6)


def pop_out(base=900):
    """The little falling 'bloop' when an element shrinks away."""
    s = osc("square", lambda t: base * (1 - 0.7 * t / 0.1), 0.1, 0.25) * env(0.1, 0.004, 0.07)
    return crush(lowpass(s, 4500), 6)


def ping(freq, dur=0.35, bright=1.0):
    """Bell / glint: a sine with a few inharmonic partials."""
    t = tt(dur)
    s = np.sin(2 * np.pi * freq * t) + 0.35 * bright * np.sin(2 * np.pi * freq * 2.76 * t) + 0.18 * bright * np.sin(2 * np.pi * freq * 5.4 * t)
    return s * env(dur, 0.001, dur * 0.5)


def twinkle(base, steps=4, gap=0.035, dur=0.22):
    """Rising sparkle arpeggio (the final twinkle every effect ends on)."""
    total = gap * steps + dur
    out = np.zeros(int(total * SR))
    for k, ratio in enumerate([1, 1.26, 1.5, 2, 2.52][:steps]):
        s = ping(base * ratio, dur, 0.6) * (0.9 - 0.12 * k)
        i = int(k * gap * SR)
        out[i:i + len(s)] += s
    return out


def whoosh(dur, f0, f1, q=1.5):
    """Noise through a band-pass filter whose centre glides from f0 to f1 (Hz)."""
    x = noise(dur)
    n = len(x)
    fc = f0 * (f1 / f0) ** (np.arange(n) / n)  # exponential glide sounds even
    g = np.tan(np.pi * np.minimum(fc, SR * 0.45) / SR)
    k = 1 / q
    out = np.zeros(n)
    ic1 = ic2 = 0.0
    for i in range(n):  # state-variable filter (smooth while the frequency moves)
        a1 = 1 / (1 + g[i] * (g[i] + k))
        v1 = a1 * ic1 + g[i] * a1 * (x[i] - ic2)
        v2 = ic2 + g[i] * v1
        ic1, ic2 = 2 * v1 - ic1, 2 * v2 - ic2
        out[i] = v1
    return out * np.sin(np.pi * np.clip(tt(dur) / dur, 0, 1)) ** 1.5


def thump(f0=140, f1=45, dur=0.25):
    """Low kick: a sine dropping in pitch."""
    s = osc("sine", lambda t: f1 + (f0 - f1) * np.exp(-t * 30), dur)
    return np.tanh(2.2 * s) * env(dur, 0.001, dur * 0.6)


def crack(dur=0.12, bright=6000):
    return lowpass(noise(dur), bright) * env(dur, 0.0005, dur * 0.35)


# --------------------------------------------------------------- the sounds

def knife():
    """Patience: clock ticks (one per frame), a swing 'shing', a held breath, then the cut bursts."""
    m = Mix()
    m.add(pop_in(700), at(0), 0.5)
    for f in range(0, 8):  # tick ... tock, the last on the swing
        tick = osc("square", 2600 if f % 2 == 0 else 1900, 0.018, 0.5) * env(0.018, 0.0005, 0.008)
        tick = stack(tick, 0.6 * crack(0.012, 9000))
        m.add(tick, at(f), 0.55 if f < 7 else 0.75)
        m.add(osc("sine", 880 if f % 2 == 0 else 660, 0.12) * env(0.12, 0.001, 0.05), at(f), 0.08)
    m.add(ping(1320, 0.3), at(6), 0.25)  # ping at the blade's tip
    # The swing: a fast whoosh into a bright metallic 'shing'.
    m.add(whoosh(0.16, 900, 7000), at(7) - 0.08, 0.6)
    shing = sum(np.sin(2 * np.pi * f * tt(0.5) + k) * g for k, (f, g) in enumerate([(3150, 1), (4730, 0.6), (6310, 0.4), (2210, 0.5)]))
    m.add(shing * env(0.5, 0.001, 0.22), at(7), 0.35)
    # Holding its breath: a thin rising whine.
    m.add(osc("sine", lambda t: 1800 + 900 * t / 0.19, 0.19) * env(0.19, 0.03, 0.4, 0.6, 0.02), at(8), 0.08)
    # The burst: thump + crack + glassy shatter.
    m.add(thump(160, 50, 0.3), at(10), 1.0)
    m.add(crack(0.18, 7000), at(10), 0.8)
    for k in range(9):
        m.add(ping(2000 + RNG.uniform(0, 3000), 0.12, 0.8), at(10) + 0.012 * k + RNG.uniform(0, 0.03), 0.18)
    m.add(ping(2640, 0.4), at(13), 0.3)  # glint on the blade
    m.add(pop_out(1000), at(16), 0.35)  # shrinks away
    m.add(twinkle(1568), at(19), 0.45)
    return m.master(0.22)


def star():
    """Determination: a charge that rises, a bright save-star burst chord, little stars winking, a twinkle."""
    m = Mix()
    m.add(pop_in(500), at(0), 0.6)
    # The charge: an arpeggio climbing faster and faster, with a noise swell.
    notes = [hz(n, o) for n, o in [("C", 5), ("E", 5), ("G", 5), ("C", 6), ("E", 6), ("G", 6), ("C", 7), ("E", 7), ("G", 7)]]
    t0 = at(1)
    for k, fq in enumerate(notes):
        tk = t0 + (at(7) - t0) * (1 - (1 - k / len(notes)) ** 1.6)
        m.add(crush(blip(fq, 0.07, "square", 0.25, 0.06), 6), tk, 0.25 + 0.03 * k)
    swell = lowpass(noise(at(7) - at(1)), 3000) * np.linspace(0, 1, int((at(7) - at(1)) * SR)) ** 2
    m.add(swell, at(1), 0.25)
    # The burst: boom + bright major chord of bells + sparkle.
    m.add(thump(120, 40, 0.4), at(7), 0.9)
    m.add(crack(0.15, 9000), at(7), 0.5)
    for fq in [hz("C", 5), hz("E", 5), hz("G", 5), hz("B", 5), hz("D", 6)]:
        m.add(ping(fq, 1.0, 0.7), at(7), 0.28)
    m.add(osc("triangle", hz("C", 4), 0.6) * env(0.6, 0.002, 0.35), at(7), 0.35)
    # Little stars winking away one by one.
    penta = [hz(n, 6) for n in ["C", "D", "E", "G", "A"]] + [hz("C", 7)]
    for k, f in enumerate([13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5]):
        m.add(ping(penta[(k * 2) % len(penta)], 0.2, 0.5), at(f), 0.18)
    m.add(pop_out(900), at(16), 0.3)
    m.add(twinkle(hz("E", 6)), at(19), 0.45)
    return m.master(0.3, 0.5)


def quill():
    """Perseverance: the quill pops in, scratches out the sigil, taps it: a mystic seal chord and ink drops."""
    m = Mix()
    m.add(pop_in(650), at(0), 0.5)
    # Pen scratching: bandpassed noise in little strokes.
    for k in range(18):
        t = at(1) + k * (at(9) - at(1)) / 18
        d = 0.03 + RNG.uniform(0, 0.03)
        s = bandpass(noise(d), 2500, 7000) * env(d, 0.003, d * 0.6)
        m.add(s, t, 0.35)
        if k % 4 == 1:
            m.add(ping(3000 + RNG.uniform(0, 1500), 0.08, 0.3), t, 0.06)  # sparks at the nib
    m.add(whoosh(0.1, 600, 2500), at(9), 0.25)  # lift
    # The tap: a soft knock, then a mystic suspended chord swelling and fading.
    m.add(thump(300, 120, 0.12), at(10), 0.8)
    m.add(crack(0.05, 5000), at(10), 0.4)
    for fq in [hz("D", 4), hz("A", 4), hz("D", 5), hz("E", 5), hz("A", 5)]:
        tone = osc("triangle", fq, 1.0) * 0.6 + osc("sine", fq * 1.003, 1.0) * 0.4
        m.add(tone * env(1.0, 0.03, 0.45), at(10), 0.16)
    m.add(ping(hz("A", 6), 0.6, 0.5), at(10), 0.2)
    # Ink drops bouncing.
    for k, f in enumerate([11, 11.6, 12.3, 13.2, 14.4]):
        m.add(blip(900 - 90 * k, 0.05, "sine", decay=0.03, sweep=-0.4), at(f), 0.25)
    # The quill hops off and vanishes in a sparkle.
    m.add(crush(blip(500, 0.12, "square", 0.25, 0.1, sweep=1.5), 6), at(11), 0.25)
    m.add(ping(2600, 0.25, 0.6), at(14), 0.3)
    m.add(pop_out(900), at(16), 0.3)
    m.add(twinkle(hz("D", 6)), at(19), 0.45)
    return m.master(0.3, 0.6)


def pan():
    """Kindness: sizzling pan, a flip, a soft plop on the catch, butter, and a warm healing chime."""
    m = Mix()
    m.add(pop_in(550), at(0), 0.5)
    # Sizzle: crackly high noise with random pops.
    sz = highpass(noise(at(6)), 3000) * 0.4
    for k in range(40):
        i = RNG.integers(0, len(sz) - 400)
        sz[i:i + 200] += RNG.uniform(-1, 1, 200) * np.exp(-np.arange(200) / 40) * 1.5
    m.add(lowpass(sz, 9000) * env(at(6), 0.02, 2, 0.5, 0.05), at(0.5), 0.25)
    m.add(whoosh(0.12, 300, 700), at(3), 0.3)  # dip
    # The flip: 'fwip' up, a spinning flutter, a twinkle at the top.
    m.add(whoosh(0.18, 500, 3500), at(5), 0.55)
    m.add(crush(blip(300, 0.2, "square", 0.25, 0.18, sweep=3), 6), at(5), 0.25)
    for k in range(4):
        m.add(whoosh(0.06, 1500, 2500), at(5.7) + k * 0.07, 0.15)
    m.add(ping(2093, 0.3), at(8), 0.3)
    # The catch: soft plop + sizzle burst.
    m.add(thump(220, 90, 0.18), at(11), 0.9)
    m.add(lowpass(noise(0.08), 1200) * env(0.08, 0.001, 0.05), at(11), 0.5)
    m.add(highpass(noise(0.5), 3500) * env(0.5, 0.005, 0.3), at(11), 0.3)
    for k, f in enumerate([11.3, 11.8, 12.5, 13.3]):
        m.add(blip(1100 - 120 * k, 0.04, "sine", decay=0.025), at(f), 0.2)  # droplets
    m.add(blip(700, 0.06, "sine", decay=0.04, sweep=-0.5), at(13), 0.35)  # butter plip
    # Warm healing chime: a gentle major arpeggio.
    for k, fq in enumerate([hz("G", 5), hz("B", 5), hz("D", 6), hz("G", 6)]):
        m.add(ping(fq, 0.6, 0.4), at(13.5) + k * 0.07, 0.22)
    m.add(pop_out(900), at(16), 0.3)
    m.add(twinkle(hz("G", 6)), at(19), 0.45)
    return m.master(0.25, 0.45)


def glove():
    """Bravery: brackets lock on, wind-up builds, a big POW on the uppercut, boxer hops, a ready glint."""
    m = Mix()
    for k in range(2):  # brackets snapping on: ka-chunk
        m.add(crush(blip(220 + 110 * k, 0.05, "square", 0.5, 0.03), 5), at(k), 0.35)
    m.add(pop_in(450), at(1), 0.45)
    # Wind-up: a rising buzz and a rumble, trembling on frames 4-5.
    wind = osc("square", lambda t: 90 + 260 * (t / at(4)) ** 2, at(4), 0.3)
    m.add(lowpass(wind, 2500) * np.linspace(0.2, 1, len(wind)), at(2), 0.25)
    m.add(whoosh(at(4), 300, 2500), at(2), 0.35)
    # POW: kick + crack + a crunchy square hit + a high slap.
    m.add(thump(180, 40, 0.45), at(6), 1.0)
    m.add(crack(0.2, 8000), at(6), 0.9)
    hit = np.tanh(3 * osc("square", lambda t: 180 * np.exp(-t * 8) + 60, 0.25, 0.4)) * env(0.25, 0.001, 0.12)
    m.add(crush(hit, 5), at(6), 0.4)
    m.add(echo(crack(0.05, 12000), 0.06, 0.4), at(6), 0.4)
    m.add(thump(120, 50, 0.15), at(8), 0.35)  # springs back
    # Boxer hops landing.
    for f in [11, 13]:
        m.add(thump(200, 90, 0.08), at(f), 0.45)
        m.add(lowpass(noise(0.05), 2000) * env(0.05, 0.001, 0.03), at(f), 0.25)
    m.add(ping(2349, 0.35), at(14), 0.35)  # ready glint
    m.add(pop_out(900), at(16), 0.3)
    m.add(twinkle(hz("F", 6)), at(19), 0.45)
    return m.master(0.18)


def gunshot():
    """Wild West shot, modelled on the reference shot (justice_shot.mp3): a click and a short low punch,
    a 'pew' that slides down from ~2.6 kHz to ~1 kHz, a bright 2-4 kHz crack that hands over to a
    1-2 kHz roar, a loud ~0.2 s hold with a tiny dip, then a mid-level ring that falls away by ~0.7 s,
    with the top end closing down from ~7 kHz to ~4.5 kHz as it fades."""
    dur = 0.85
    t = tt(dur)
    click = highpass(noise(0.004), 1500) * env(0.004, 0.0001, 0.0015)
    punch_ = osc("sine", lambda t: 160 + 220 * np.exp(-t / 0.005), 0.08) * env(0.08, 0.002, 0.05)
    f = lambda t: 1010 + 1590 * np.exp(-t / 0.06) - 200 * np.maximum(t - 0.3, 0)
    pew = osc("triangle", f, dur) + 0.5 * osc("sine", lambda t: f(t) * 1.17, dur)
    n = noise(dur)
    bright = bandpass(n, 2000, 4000) * 4 * np.exp(-t / 0.1)
    roar = bandpass(n, 880, 2000) * 3 * (1 - np.exp(-t / 0.09))
    air = 0.2 * lowpass(n, 6000, 6) * np.exp(-t / 0.25)
    hold = 0.34 * np.where(t < 0.48, np.exp(-(t - 0.21) * 2.5), np.exp(-0.27 * 2.5 - (t - 0.48) * 14))
    e = np.where(t < 0.21, 0.5 + 0.5 * np.sin(np.pi * np.clip(t / 0.28, 0, 1)), hold) * np.clip(t / 0.002, 0, 1)
    e[(t > 0.215) & (t < 0.235)] *= 0.4
    body = (0.6 * pew + bright + roar + air) * e
    low = lowpass(body, 4500, 6)
    body = low + (body - low) * np.exp(-t / 0.3)
    y = lowpass(np.tanh(1.3 * stack(0.6 * click, 1.3 * punch_, body)), 7000, 8)
    return y / np.max(np.abs(y))


def justice():
    """Justice: a Wild West showdown. The revolver cylinder spins while the crosshair closes, the hammer
    cocks on the lock-on, the badge lands with the gunshot, then a shine, a coin flip that lands with a
    clink, a glint and the twinkle."""
    m = Mix()
    m.add(pop_in(600), at(0), 0.35)
    # The cylinder spinning: ratchet clicks that slow down as the crosshair closes.
    t, gap = at(0.3), 0.028
    while t < at(4.6):
        tick = stack(highpass(noise(0.006), 2500) * env(0.006, 0.0002, 0.002), ping(3200, 0.03, 0.3) * 0.3)
        m.add(tick, t, 0.35)
        t += gap
        gap *= 1.12
    # Cocking the hammer on the lock-on: click ... CLACK.
    for f, g, fq in [(5, 0.45, 2400), (6, 0.7, 1700)]:
        m.add(stack(highpass(noise(0.01), 1200) * env(0.01, 0.0002, 0.003), ping(fq, 0.06, 0.5) * 0.4), at(f), g)
        m.add(lowpass(noise(0.02), 1500) * env(0.02, 0.0005, 0.006), at(f) + 0.022, g * 0.6)
    # The shot as the badge lands.
    m.add(gunshot(), at(7), 1.0)
    # The shine sweeping across the badge.
    m.add(whoosh(at(3), 2500, 9000, 2.5), at(9), 0.3)
    m.add(ping(hz("A", 6), 0.3, 0.5), at(10), 0.18)
    # Glitter tinkling as it bounces.
    for k, f in enumerate([8.5, 9.4, 10.6, 11.5, 12.8, 14.0, 15.5]):
        m.add(ping(3000 + RNG.uniform(0, 2500), 0.08, 0.4), at(f), 0.1)
    # The coin flip: a metal ring that flutters as it spins, then lands with a clink.
    dur = at(4)
    ring = sum(np.sin(2 * np.pi * f * tt(dur)) * g for f, g in [(2093, 1), (2093 * 2.76, 0.4), (2093 * 5.4, 0.15)])
    spin = np.abs(np.cos(2 * np.pi * 4 * tt(dur))) ** 2  # four bright flashes as the faces turn
    m.add(ring * spin * env(dur, 0.005, 2, 0.7, 0.02), at(11), 0.32)
    m.add(whoosh(at(2), 800, 1800), at(11), 0.12)
    m.add(thump(260, 130, 0.08), at(15), 0.45)
    m.add(ping(2637, 0.45, 0.9), at(15), 0.35)  # the clink, then the glint
    m.add(ping(hz("E", 7), 0.3, 0.5), at(15.5), 0.18)
    m.add(pop_out(900), at(17), 0.3)
    m.add(twinkle(hz("A", 6)), at(19), 0.45)
    return m.master(0.22, 0.4)


# ------------------------------------------------- second set: instruments

def music_box(freq, dur=0.6):
    """Music-box tine: a pure tone with a bright, quickly fading overtone."""
    t = tt(dur)
    s = np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 4.2 * t) * np.exp(-t * 30)
    return s * env(dur, 0.001, dur * 0.55)


def pluck(freq, dur=0.8, bright=0.5):
    """Plucked string (Karplus-Strong): harp / guitar."""
    n = int(dur * SR)
    p = max(2, int(SR / freq))
    buf = lowpass(RNG.uniform(-1, 1, p), 2000 + 8000 * bright)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.996 * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    return out * env(dur, 0.001, dur, 0, 0.05)


def bell(freq, dur=1.2, partials=((1, 1), (2.0, 0.5), (2.76, 0.6), (5.4, 0.25), (8.9, 0.1))):
    t = tt(dur)
    s = sum(g * np.sin(2 * np.pi * freq * r * t) * np.exp(-t * (2.5 + r * 1.2) / dur) for r, g in partials)
    return s * env(dur, 0.001, dur * 2)


def gong(freq=110, dur=1.6):
    return bell(freq, dur, ((1, 1), (1.47, 0.7), (2.09, 0.6), (2.56, 0.4), (3.4, 0.3), (4.9, 0.15)))


def gavel(pitch=1.0):
    """Wooden gavel strike: a sharp click and a hollow wooden body."""
    body = bandpass(noise(0.12), 350 * pitch, 900 * pitch) * env(0.12, 0.0005, 0.04) * 3
    tone = osc("sine", lambda t: 190 * pitch * (1 + 0.5 * np.exp(-t * 60)), 0.15) * env(0.15, 0.0005, 0.06)
    click = highpass(noise(0.004), 3000) * env(0.004, 0.0001, 0.0015)
    return np.tanh(stack(body, 0.8 * tone, 0.7 * click) * 1.5)


def snare(dur=0.12):
    return stack(bandpass(noise(dur), 1500, 8000) * env(dur, 0.0005, dur * 0.5), 0.5 * osc("triangle", 190, dur) * env(dur, 0.0005, 0.03))


def cymbal(dur=1.0):
    n = highpass(noise(dur), 5000)
    ring = osc("square", 3400, dur) * osc("square", 5170, dur)  # ring-modulated metal shimmer
    return (n + 0.3 * highpass(ring, 4000)) * env(dur, 0.001, dur * 0.6)


def punch():
    """A meaty body hit: low thud, a mid 'thwack' and a skin slap."""
    thud = thump(110, 38, 0.3)
    thwack = lowpass(noise(0.09), 900) * env(0.09, 0.0005, 0.03) * 2
    slap = highpass(noise(0.02), 2500) * env(0.02, 0.0002, 0.006)
    return np.tanh(stack(1.2 * thud, thwack, 0.8 * slap) * 1.8)


def squeak(freq=2800, dur=0.09):
    """Sneaker squeak: a fast warbling chirp."""
    s = osc("sine", lambda t: freq * (1 + 0.25 * np.sin(2 * np.pi * 45 * t) + 0.3 * t / dur), dur)
    return s * env(dur, 0.005, dur * 0.6)


def choir(freqs, dur, vowel=(700, 1150)):
    """Soft 'aah' pad: detuned saws through two formant filters."""
    src = sum(osc("saw", f * d, dur) for f in freqs for d in (0.997, 1.003))
    v = bandpass(src, vowel[0] * 0.8, vowel[0] * 1.25) + 0.6 * bandpass(src, vowel[1] * 0.85, vowel[1] * 1.2)
    return v / len(freqs)


def droplet(freq=700, dur=0.06):
    """Water 'bloop': a sine that quickly bends up."""
    return osc("sine", lambda t: freq * (1 + 1.6 * t / dur), dur) * env(dur, 0.001, dur * 0.5)


def flutter(dur, rate=18, bright=2500):
    """Soft wing flaps: airy noise pulsing at the flap rate."""
    flaps = 0.5 + 0.5 * np.sin(2 * np.pi * rate * tt(dur))
    return bandpass(noise(dur), 300, bright) * flaps ** 3 * env(dur, 0.03, dur, 0.6, dur * 0.4)


def swell(dur, lo=2000):
    """Reverse-cymbal swell rising into a hit."""
    return highpass(noise(dur), lo) * np.linspace(0, 1, int(dur * SR)) ** 3


# ----------------------------------------------------- second set: sounds

def knife_v2():
    """Patience, music box: every tick plays the next note of a little clockwork tune; the swing is an
    airy blade swish, a reverse swell holds the breath, the cut bursts with a glassy crash and a gong."""
    m = Mix()
    tune = [hz(n, o) for n, o in [("E", 6), ("G", 6), ("B", 6), ("A", 6), ("G", 6), ("E", 6), ("F#", 6), ("B", 5)]]
    for f, fq in enumerate(tune):
        m.add(music_box(fq, 0.7), at(f), 0.42)
        m.add(highpass(noise(0.01), 4000) * env(0.01, 0.0002, 0.003), at(f), 0.25)  # the clockwork click
    m.add(whoosh(0.14, 1500, 9000, 3), at(7) - 0.05, 0.55)  # blade swish
    m.add(bell(hz("B", 6), 0.5, ((1, 1), (2.76, 0.5), (5.4, 0.3))), at(7), 0.25)
    m.add(swell(at(3), 3000), at(7.2), 0.35)  # holding its breath ...
    m.add(cymbal(0.7), at(10), 0.4)  # ... the cut bursts
    m.add(gong(98, 0.8), at(10), 0.4)
    m.add(thump(140, 45, 0.25), at(10), 0.7)
    for k in range(6):
        m.add(music_box(hz("E", 7) * [1, 1.5, 1.26, 2, 1.68, 2.52][k], 0.25), at(10) + 0.03 * k, 0.12)
    m.add(music_box(hz("B", 6), 0.6), at(13), 0.3)
    m.add(pop_out(900), at(16), 0.2)
    for k, fq in enumerate([hz("E", 6), hz("B", 6), hz("E", 7)]):  # the tune's last phrase as the twinkle
        m.add(music_box(fq, 0.5), at(19) + 0.06 * k, 0.32)
    return m.master(0.3, 0.6)


def star_v2():
    """Determination, power-up: a choir swells as the star charges, a huge power-up chord with a sub drop
    on the burst, then glockenspiel sparkles cascading down as the little stars wink away."""
    m = Mix()
    m.add(droplet(500, 0.08), at(0), 0.4)
    ch = choir([hz("C", 4), hz("G", 4), hz("C", 5)], at(7.2))
    m.add(ch * np.linspace(0.1, 1, len(ch)) ** 1.5, at(0), 0.55)
    rise = osc("square", lambda t: 200 * 2 ** (3 * t / at(6.5)), at(6.5), 0.5)
    m.add(lowpass(rise, 3000) * np.linspace(0.2, 1, len(rise)) * 0.4, at(0.5), 0.35)
    m.add(swell(at(2), 2500), at(5), 0.3)
    # The burst: sub drop, crash and a bright major chord.
    m.add(osc("sine", lambda t: 90 * np.exp(-t * 3) + 30, 0.7) * env(0.7, 0.002, 0.4), at(7), 0.8)
    m.add(cymbal(1.0), at(7), 0.35)
    for fq in [hz("C", 5), hz("E", 5), hz("G", 5), hz("C", 6)]:
        m.add(lowpass(osc("saw", fq, 0.8) + osc("saw", fq * 1.006, 0.8), 3500) * env(0.8, 0.005, 0.45), at(7), 0.1)
    m.add(choir([hz("C", 5), hz("E", 5), hz("G", 5)], 0.9) * env(0.9, 0.01, 0.5), at(7), 0.4)
    # Glockenspiel cascade, one note per little star.
    glock = [hz(n, o) for n, o in [("G", 7), ("E", 7), ("C", 7), ("A", 6), ("G", 6), ("E", 6), ("D", 6), ("C", 6)]]
    for k, f in enumerate([12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16]):
        m.add(bell(glock[k], 0.4, ((1, 1), (2.76, 0.3), (5.4, 0.1))), at(f), 0.2)
    m.add(pop_out(800), at(16), 0.2)
    m.add(bell(hz("C", 7), 0.8, ((1, 1), (2.0, 0.4), (3.0, 0.2))), at(19), 0.35)
    m.add(bell(hz("G", 7), 0.6, ((1, 1), (2.0, 0.3))), at(19.6), 0.25)
    return m.master(0.35, 0.7)


def glove_v2():
    """Bravery, boxing ring: the bell rings for the round, a snare roll builds the wind-up, a meaty punch
    with a cymbal crash, sneakers squeak on the hops, and the bell rings the round out."""
    m = Mix()
    for k in range(2):  # ding-ding
        m.add(bell(1300, 0.9), at(0) + k * 0.16, 0.35)
    # Snare roll speeding up through the wind-up.
    t, gap = at(1.5), 0.075
    while t < at(5.9):
        m.add(snare(0.08), t, 0.18 + 0.25 * (t - at(1.5)) / (at(5.9) - at(1.5)))
        t += gap
        gap = max(0.028, gap * 0.85)
    m.add(punch(), at(6), 1.0)
    m.add(cymbal(1.1), at(6), 0.45)
    m.add(thump(90, 40, 0.3), at(6), 0.6)
    m.add(punch() * 0.5, at(8), 0.3)  # springs back
    for f, fq in [(10.6, 2900), (11, 3300), (12.6, 3000), (13, 3500)]:
        m.add(squeak(fq), at(f), 0.2)
    for f in [11, 13]:
        m.add(thump(180, 90, 0.08), at(f), 0.35)
    m.add(bell(2349, 0.35, ((1, 1), (2.76, 0.3))), at(14), 0.25)  # ready glint
    m.add(pop_out(800), at(16), 0.2)
    m.add(bell(1300, 1.2), at(19), 0.4)  # the round-ending bell
    return m.master(0.25, 0.5)


def quill_v2():
    """Perseverance, calligraphy: soft brush strokes over a rising harp run while the sigil is written,
    a deep temple bell and choir on the tap, water-drop ink, and a harp flourish to finish."""
    m = Mix()
    m.add(pluck(hz("D", 5), 0.5), at(0), 0.35)
    harp = [hz(n, o) for n, o in [("D", 4), ("F", 4), ("A", 4), ("C", 5), ("D", 5), ("F", 5), ("A", 5), ("C", 6), ("D", 6)]]
    for k, fq in enumerate(harp):
        m.add(pluck(fq, 0.9, 0.4), at(1) + k * (at(9) - at(1)) / len(harp), 0.3)
    for k in range(7):  # brush strokes
        d = 0.12 + RNG.uniform(0, 0.06)
        m.add(lowpass(highpass(noise(d), 600), 4000) * np.sin(np.pi * tt(d) / d) ** 2, at(1.2) + k * 0.15, 0.18)
    m.add(gong(hz("D", 2) * 1.5, 0.85), at(10), 0.45)
    m.add(gavel(0.7), at(10), 0.35)
    m.add(choir([hz("D", 4), hz("A", 4), hz("F", 5)], 1.0, (500, 900)) * env(1.0, 0.04, 0.6), at(10), 0.35)
    for k, f in enumerate([11, 11.6, 12.3, 13.2, 14.4]):
        m.add(droplet(650 - 50 * k, 0.07), at(f), 0.3)
    m.add(whoosh(0.15, 800, 3000), at(11), 0.15)  # the quill hops off
    m.add(pop_out(800), at(16), 0.2)
    for k, fq in enumerate([hz("D", 5), hz("F", 5), hz("A", 5), hz("D", 6)]):
        m.add(pluck(fq, 0.7, 0.6), at(19) + 0.05 * k, 0.3)
    return m.master(0.3, 0.7)


def justice_v2():
    """Justice, courtroom: tense ticking while the crosshair closes, two gavel knocks on the lock-on, the
    badge lands with a big gavel slam and a trumpet fanfare, then the coin settles with a rattle."""
    m = Mix()
    for f in range(0, 5):
        m.add(highpass(noise(0.008), 2500) * env(0.008, 0.0002, 0.003), at(f), 0.3)
        m.add(osc("triangle", hz("D", 3), 0.12) * env(0.12, 0.002, 0.08), at(f), 0.2)
    m.add(gavel(1.1), at(5), 0.5)
    m.add(gavel(1.1), at(6), 0.6)
    m.add(gavel(0.8), at(7), 1.0)  # order in the court!
    m.add(thump(120, 40, 0.35), at(7), 0.7)
    fanfare = [(0, hz("C", 5)), (0.07, hz("E", 5)), (0.14, hz("G", 5)), (0.21, hz("C", 6))]
    for dt, fq in fanfare:  # trumpet: bright saw through a lowpass that opens as it blows
        tone = osc("saw", fq, 0.45) + 0.4 * osc("square", fq, 0.45, 0.3)
        tone = lowpass(tone, 3500) * env(0.45, 0.02, 0.25, 0.35, 0.08)
        m.add(tone, at(7.3) + dt, 0.13)
    m.add(whoosh(at(3), 2500, 9000, 2.5), at(9), 0.2)  # the shine
    # The coin flip settling like a spinning coin: a rattle that speeds up and stops with a clink.
    t, gap = at(11), 0.07
    while t < at(15):
        m.add(bell(2400 + 600 * (t - at(11)), 0.06, ((1, 1), (2.76, 0.4))), t, 0.2)
        t += gap
        gap = max(0.018, gap * 0.82)
    m.add(bell(2637, 0.6, ((1, 1), (2.76, 0.5), (5.4, 0.2))), at(15), 0.35)
    m.add(pop_out(900), at(17), 0.2)
    for k, fq in enumerate([hz("G", 6), hz("C", 7)]):
        m.add(bell(fq, 0.6, ((1, 1), (2.0, 0.3))), at(19) + 0.08 * k, 0.3)
    return m.master(0.28, 0.5)


def swarm():
    """Integrity, butterfly swarm: a soft glow gathers and blooms with a chime, then each butterfly flutters
    off with its own harp note when it's released and a tiny sparkle when it vanishes."""
    m = Mix()
    m.add(swell(at(3), 3500) * 0.6, at(0), 0.35)
    m.add(bell(hz("A", 5), 1.0, ((1, 1), (2.0, 0.3), (3.0, 0.15))), at(3), 0.35)  # the bloom
    m.add(bell(hz("E", 6), 0.9, ((1, 1), (2.0, 0.3))), at(3), 0.25)
    m.add(whoosh(0.3, 600, 2500), at(3), 0.25)
    # (release frame, exit frame) for each butterfly, from the effect's own timing.
    flyers = [(3.24, 14.38), (3.63, 13.06), (4.13, 14.53), (4.62, 14.36), (5.02, 13.55),
              (5.53, 13.56), (5.82, 16.58), (6.33, 15.07), (6.81, 15.27), (7.15, 14.25)]
    penta = [hz(n, o) for n, o in [("A", 5), ("C#", 6), ("E", 6), ("F#", 6), ("A", 6), ("B", 6), ("C#", 7), ("E", 7), ("F#", 7), ("A", 7)]]
    for k, (release, leave) in enumerate(flyers):
        m.add(pluck(penta[k], 0.6, 0.7), at(release), 0.18)
        life = at(leave + 2) - at(release)
        m.add(flutter(life, 14 + 2 * (k % 4), 2000 + 150 * k), at(release), 0.05)
        m.add(bell(penta[(k * 3) % len(penta)] * 2, 0.25, ((1, 1), (2.76, 0.2))), at(leave + 2.5), 0.12)
    m.add(pluck(hz("A", 6), 0.8, 0.8), at(18.5), 0.25)
    return m.master(0.35, 0.8)


# ------------------------------------- third set: Undertale / Deltarune style
# Sparse and raw, not "juicy": one strong sound for the key moment and at most one
# small lead-in or tail. No sparkles, chimes, cheerful arpeggios or reward twinkles.
# Dry, lo-fi textures: crunchy distorted hits, slightly eerie ring-modulated metal,
# low hums, dull wooden ticks, and silence where the animation holds its breath.
# Original sounds in that spirit (nothing is copied from the games).

def lofi(x, bits=7, hold=3):
    """The crunchy, low sample-rate sound of old game audio (about 15 kHz, 7-bit)."""
    return lowpass(crush(x, bits, hold), 7000)


def tok(freq=320, dur=0.03):
    """A dull wooden tick."""
    s = osc("triangle", freq, dur) * env(dur, 0.0005, dur * 0.4)
    return stack(s, 0.4 * lowpass(noise(0.006), 3000) * env(0.006, 0.0002, 0.002))


def crunch_hit(depth=1.0, pitch=1.0):
    """Raw damage hit: a square wave diving low, coarse noise, hard clipping."""
    d = 0.3 * depth
    drop = osc("square", lambda t: 300 * pitch * np.exp(-t * 14) + 42 * pitch, d, 0.5) * env(d, 0.0005, d * 0.5)
    grit = noise(d, 3000) * env(d, 0.0005, d * 0.25)
    return np.clip(2.5 * stack(drop, 0.7 * grit), -1, 1) * 0.8


def strike(freq, dur=0.8, odd=1.414):
    """Struck metal with an inharmonic, slightly eerie ring (ring modulation)."""
    t = tt(dur)
    ring = np.sin(2 * np.pi * freq * t) * np.sin(2 * np.pi * freq * odd * t)
    return (ring + 0.3 * np.sin(2 * np.pi * freq * 0.5 * t)) * env(dur, 0.001, dur * 0.45)


def hum(dur, f0, f1, wobble=4.0):
    """A low square-wave hum sliding from f0 to f1 with a slow wobble."""
    f = lambda t: f0 * (f1 / f0) ** (t / dur) * (1 + 0.015 * np.sin(2 * np.pi * wobble * t))
    return lowpass(osc("square", f, dur, 0.5), 900) * env(dur, dur * 0.3, dur, 1.0, dur * 0.15)


def scratch(dur):
    """Pen scratching: coarse noise in uneven little strokes."""
    gate = np.repeat(RNG.uniform(0, 1, int(dur * 40) + 1) > 0.35, int(SR / 40))[: int(dur * SR)]
    return bandpass(noise(dur, 9000), 1500, 5000) * gate * env(dur, 0.01, dur, 1.0, 0.03)


def thud(freq=90, dur=0.12):
    """A muffled low thud."""
    return stack(osc("triangle", lambda t: freq * (1 + np.exp(-t * 40)), dur) * env(dur, 0.001, dur * 0.4),
                 0.5 * lowpass(noise(0.03), 800) * env(0.03, 0.0005, 0.01))


def ut_master(m):
    """Dry and a little lo-fi."""
    y = m.master(0.05, 0.15)
    y = lowpass(y, 9000)
    return y / np.max(np.abs(y)) * 0.89


# --------------------------------------------------------- third set: sounds

def knife_ut():
    """Patience: dull clock ticks, a cold slash, real silence while the cut waits, then one heavy hit."""
    m = Mix()
    for f in range(0, 8):
        m.add(lofi(tok(330 if f % 2 == 0 else 280)), at(f), 0.8)
    slash = stack(bandpass(noise(0.07, 12000), 2500, 7000) * env(0.07, 0.001, 0.03), 0.5 * strike(2200, 0.18, 1.73))
    m.add(lofi(slash), at(7), 0.6)
    m.add(lofi(crunch_hit(1.2)), at(10), 1.0)  # after two beats of silence
    return ut_master(m)


def star_ut():
    """Determination: a low hum rising under the charge, then one bright, strange strike on the burst."""
    m = Mix()
    m.add(lofi(hum(at(7), 55, 110)), at(0), 0.3)
    m.add(lofi(stack(strike(880, 0.9, 2.01), 0.6 * crunch_hit(0.7, 0.8))), at(7), 1.0)
    return ut_master(m)


def glove_ut():
    """Bravery: a tightening rasp through the wind-up, one big crunchy punch, two muffled hops."""
    m = Mix()
    rasp = bandpass(noise(at(4), 2500), 300, 1200) * np.linspace(0.2, 1, int(at(4) * SR)) ** 2
    m.add(lofi(rasp), at(2), 0.35)
    m.add(lofi(crunch_hit(1.6, 0.8)), at(6), 1.0)
    for f in [11, 13]:
        m.add(lofi(thud(80)), at(f), 0.35)
    return ut_master(m)


def quill_ut():
    """Perseverance: scratchy writing, then one resonant, slightly eerie 'tonk' on the tap."""
    m = Mix()
    m.add(lofi(scratch(at(8))), at(1), 0.3)
    m.add(lofi(stack(strike(440, 1.0, 1.59), 0.5 * thud(110))), at(10), 1.0)
    return ut_master(m)


def swarm_ut():
    """Integrity: an airy breath gathering, a soft 'fwoomp' on the bloom, and faint wingbeats after."""
    m = Mix()
    breath = bandpass(noise(at(3)), 400, 1800) * np.linspace(0, 1, int(at(3) * SR)) ** 2
    m.add(lofi(breath), at(0), 0.4)
    fwoomp = stack(lowpass(noise(0.25), 900) * env(0.25, 0.005, 0.1), osc("sine", lambda t: 70 + 60 * np.exp(-t * 20), 0.3) * env(0.3, 0.002, 0.15))
    m.add(lofi(fwoomp), at(3), 1.0)
    m.add(lofi(strike(1320, 0.5, 1.5)), at(3), 0.25)
    wings = bandpass(noise(at(10)), 500, 2000) * (0.5 + 0.5 * np.sin(2 * np.pi * 15 * tt(at(10)))) ** 4
    m.add(lofi(wings * env(at(10), 0.1, at(10), 1.0, at(4))), at(3.5), 0.12)
    return ut_master(m)


def pan_ut():
    """Kindness: a raw sizzle, a plain 'whup' on the flip, a dull plop on the catch, one warm low tone."""
    m = Mix()
    m.add(lofi(highpass(noise(at(5), 6000), 2000) * env(at(5), 0.02, 2, 1.0, 0.05)), at(0), 0.14)
    whup = osc("triangle", lambda t: 150 * (1 + 2.5 * t / 0.15), 0.15) * env(0.15, 0.002, 0.08)
    m.add(lofi(whup), at(5), 0.6)
    m.add(lofi(thud(100, 0.15)), at(11), 0.9)
    warm = osc("triangle", lambda t: 196 * (1 + 0.01 * np.sin(2 * np.pi * 3 * t)), at(7)) * env(at(7), 0.08, at(7), 1.0, at(3))
    m.add(lofi(warm), at(12), 0.22)
    return ut_master(m)


def justice_ut():
    """Justice: one hammer click on the lock-on, the shot (lo-fi), and a single dry tink as the coin lands."""
    m = Mix()
    m.add(lofi(stack(highpass(noise(0.01), 1200) * env(0.01, 0.0002, 0.003), 0.3 * tok(900, 0.02))), at(6), 0.6)
    shot = gunshot()
    m.add(lofi(shot * env(len(shot) / SR, 0.0005, 0.3), 6, 3), at(7), 1.0)
    m.add(lofi(strike(2600, 0.15, 1.3)), at(15), 0.3)
    return ut_master(m)


# ------------------------------------------------- fourth set: warm ("-warm")
# Rewarding but calm. One gesture per effect: a quiet build, one satisfying,
# weighty hit and a warm consonant bloom that fades on its own. Soft materials
# (felt mallet, wood, glass, kalimba, air), highs rolled off, gentle room,
# every class in its own key so the set feels like a family.

def soft(x, cutoff=6000):
    return lowpass(x, cutoff, 2)


def mallet(freq, dur=0.9, bright=0.4):
    """Felt mallet on a wooden bar (marimba-like): round, woody, quick to settle."""
    t = tt(dur)
    body = np.sin(2 * np.pi * freq * t) * np.exp(-t * 4.5)
    over = bright * np.sin(2 * np.pi * freq * 3.93 * t) * np.exp(-t * 18)
    knock = lowpass(noise(0.012), 2000) * env(0.012, 0.0005, 0.004)
    return stack((body + over) * np.clip(t / 0.003, 0, 1), 0.3 * knock)


def glass(freq, dur=1.4):
    """Soft glass bowl: a pure tone with a slow, gentle shimmer from a twin a hair apart."""
    t = tt(dur)
    y = np.sin(2 * np.pi * freq * t) + 0.8 * np.sin(2 * np.pi * freq * 1.0035 * t) + 0.15 * np.sin(2 * np.pi * freq * 2 * t)
    return y * env(dur, 0.012, dur * 0.7) / 1.9


def kalimba(freq, dur=0.8):
    t = tt(dur)
    y = np.sin(2 * np.pi * freq * t) * np.exp(-t * 5) + 0.25 * np.sin(2 * np.pi * freq * 5.4 * t) * np.exp(-t * 25)
    return y * np.clip(t / 0.002, 0, 1)


def felt_thump(freq=70, dur=0.35):
    """The weight under a hit: a round low sine that settles, with a soft felt contact."""
    s = osc("sine", lambda t: freq * (1 + 0.8 * np.exp(-t * 35)), dur) * env(dur, 0.002, dur * 0.45)
    return stack(s, 0.25 * lowpass(noise(0.02), 900) * env(0.02, 0.001, 0.008))


def wood_tick(freq=900):
    """A soft wood-block tick."""
    s = bandpass(noise(0.03), freq * 0.7, freq * 1.6) * env(0.03, 0.0005, 0.008) * 2
    return stack(s, 0.5 * osc("triangle", freq, 0.04) * env(0.04, 0.0005, 0.012))


def air(dur, f0=400, f1=2500):
    """A soft breath of air rising into the moment."""
    return soft(whoosh(dur, f0, f1, 1.2), 4000) * np.linspace(0.2, 1, int(dur * SR)) ** 1.5


def bloom(freqs, dur=1.1):
    """A warm chord that swells in just after the hit and fades: the 'reward'."""
    y = sum(osc("triangle", f, dur) * 0.6 + np.sin(2 * np.pi * f * 1.002 * tt(dur)) * 0.4 for f in freqs)
    return soft(y / len(freqs), 2500) * env(dur, 0.03, dur * 0.6)


def warm_master(m, target=0.085):
    """A small room, highs rolled off, and every sound brought to the same loudness."""
    y = reverb(highpass(m.buf, 40), 0.6, 0.18)
    y = lowpass(y, 9000)
    y *= target / np.sqrt(np.mean(y ** 2))
    y = np.tanh(y / 0.89) * 0.89  # gentle limiter keeps peaks round
    fade = int(0.05 * SR)
    y[-fade:] *= np.linspace(1, 0, fade)
    return y


# ------------------------------------------------------- fourth set: sounds

def knife_warm():
    """Patience (D): soft wood ticks keep time, a soft swish, a held breath, then a calm, weighty
    resolution: a felt thump, A falling to D on the mallet, and a glass D-A-E bloom."""
    m = Mix()
    for f in range(0, 8):
        m.add(wood_tick(1150 if f % 2 == 0 else 980), at(f), 0.55)
    m.add(air(0.16, 900, 3500), at(7) - 0.1, 0.35)
    m.add(air(at(2.6), 300, 900) * 0.6, at(7.4), 0.2)  # the held breath
    m.add(felt_thump(73), at(10), 0.9)
    m.add(mallet(hz("A", 5)), at(10), 0.5)
    m.add(mallet(hz("D", 5)), at(10.9), 0.55)
    m.add(bloom([hz("D", 4), hz("A", 4), hz("E", 5)]), at(10.2), 0.45)
    m.add(glass(hz("D", 6), 1.0), at(10.9), 0.18)
    return warm_master(m)


def star_warm():
    """Determination (C): a breath and a low pad swell through the charge, then the burst lands on a
    felt thump with G resolving up to C and a full, soft C major bloom."""
    m = Mix()
    m.add(air(at(7), 250, 2500), at(0), 0.45)
    pad = bloom([hz("C", 3), hz("G", 3)], at(7.2)) * np.linspace(0.1, 1, int(at(7.2) * SR)) ** 2
    m.add(pad, at(0), 0.4)
    m.add(felt_thump(65), at(7), 1.0)
    m.add(mallet(hz("G", 5)), at(7), 0.5)
    m.add(mallet(hz("C", 6)), at(7.9), 0.55)
    m.add(bloom([hz("C", 4), hz("E", 4), hz("G", 4), hz("C", 5)], 1.2), at(7.1), 0.5)
    m.add(glass(hz("E", 6), 1.0), at(7.9), 0.15)
    return warm_master(m)


def glove_warm():
    """Bravery (F): a rising breath through the wind-up, one round, heavy punch with a low tom and an
    F-C fifth, then two soft woody steps for the hops."""
    m = Mix()
    m.add(air(at(4), 200, 1800), at(2), 0.45)
    m.add(felt_thump(60, 0.45), at(6), 1.0)
    tom = osc("sine", lambda t: 95 * (1 + 0.6 * np.exp(-t * 20)), 0.4) * env(0.4, 0.002, 0.2)
    m.add(tom, at(6), 0.6)
    m.add(soft(lowpass(noise(0.05), 1800) * env(0.05, 0.001, 0.015), 2000), at(6), 0.5)
    m.add(mallet(hz("F", 4)), at(6), 0.45)
    m.add(mallet(hz("C", 5)), at(6.8), 0.45)
    m.add(bloom([hz("F", 3), hz("C", 4), hz("F", 4)], 0.9), at(6.1), 0.4)
    for f in [11, 13]:
        m.add(wood_tick(520), at(f), 0.3)
    return warm_master(m)


def quill_warm():
    """Perseverance (A): a whisper of pen on paper, then the tap answers with a kalimba E rising to A
    and a soft, open A sus2 bloom."""
    m = Mix()
    pen = soft(bandpass(noise(at(8)), 1800, 4500), 4500) * env(at(8), 0.05, at(8), 1.0, 0.08)
    pen *= 0.6 + 0.4 * np.sin(2 * np.pi * 5 * tt(at(8))) ** 2  # strokes
    m.add(pen, at(1), 0.18)
    m.add(felt_thump(82, 0.3), at(10), 0.7)
    m.add(kalimba(hz("E", 5)), at(10), 0.55)
    m.add(kalimba(hz("A", 5)), at(10.9), 0.6)
    m.add(bloom([hz("A", 3), hz("B", 4), hz("E", 4)], 1.1), at(10.1), 0.45)
    m.add(glass(hz("A", 5), 1.0), at(11), 0.15)
    return warm_master(m)


def swarm_warm():
    """Integrity (E): a soft breath gathers, the bloom opens on a glass E-B-F# chord, and three
    kalimba notes float off with the butterflies, then it's quiet."""
    m = Mix()
    m.add(air(at(3), 300, 2200), at(0), 0.4)
    m.add(felt_thump(82, 0.3), at(3), 0.6)
    m.add(bloom([hz("E", 4), hz("B", 4), hz("F#", 5)], 1.3), at(3), 0.5)
    m.add(glass(hz("B", 5), 1.3), at(3), 0.2)
    for f, n in [(3.6, hz("E", 5)), (5.0, hz("G#", 5)), (6.8, hz("B", 5))]:
        m.add(kalimba(n, 0.7), at(f), 0.3)
    return warm_master(m)


def pan_warm():
    """Kindness (G): a gentle sizzle, a soft woody 'whoop' on the flip, the catch lands with a felt
    thump and a G-B mallet third, then a warm G major bloom."""
    m = Mix()
    sz = soft(highpass(noise(at(5)), 2500), 6000) * env(at(5), 0.05, 2, 1.0, 0.1)
    m.add(sz, at(0), 0.12)
    whoop = osc("triangle", lambda t: 220 * (1 + 1.2 * t / 0.18), 0.18) * env(0.18, 0.01, 0.09)
    m.add(soft(whoop, 2500), at(5), 0.4)
    m.add(felt_thump(78, 0.35), at(11), 0.9)
    m.add(mallet(hz("G", 4)), at(11), 0.5)
    m.add(mallet(hz("B", 4)), at(11.8), 0.5)
    m.add(bloom([hz("G", 3), hz("D", 4), hz("B", 4)], 1.2), at(11.2), 0.5)
    return warm_master(m)


def justice_warm():
    """Justice (Bb): two soft wood ticks as it locks on, the shot (rounded off) with a felt thump and a
    Bb-F fifth, and one kalimba note as the coin lands."""
    m = Mix()
    m.add(wood_tick(1300), at(5), 0.3)
    m.add(wood_tick(1550), at(6), 0.35)
    m.add(soft(gunshot(), 5000), at(7), 0.6)
    m.add(felt_thump(58, 0.4), at(7), 0.8)
    m.add(mallet(hz("A#", 4)), at(7), 0.4)
    m.add(mallet(hz("F", 5)), at(7.9), 0.4)
    m.add(bloom([hz("A#", 3), hz("F", 4), hz("A#", 4)], 1.0), at(7.2), 0.35)
    m.add(kalimba(hz("A#", 5), 0.8), at(15), 0.4)
    return warm_master(m)


# file name -> (the VFX it goes with, the sound). -v2 is the second, acoustic set; -ut the third; -warm the fourth.
SOUNDS = {
    "CastKnifePatience": ("CastKnifePatience", knife),
    "CastStarDetermination": ("CastStarDetermination", star),
    "ClassV3Perseverance": ("ClassV3Perseverance", quill),
    "ClassV3Kindness": ("ClassV3Kindness", pan),
    "CastGloveBravery": ("CastGloveBravery", glove),
    "ClassJustice": ("ClassJustice", justice),
    "CastKnifePatience-v2": ("CastKnifePatience", knife_v2),
    "CastStarDetermination-v2": ("CastStarDetermination", star_v2),
    "ClassV3Perseverance-v2": ("ClassV3Perseverance", quill_v2),
    "CastGloveBravery-v2": ("CastGloveBravery", glove_v2),
    "ClassJustice-v2": ("ClassJustice", justice_v2),
    "CastSwarmIntegrity": ("CastSwarmIntegrity", swarm),
    # Third set: Undertale / Deltarune style, every class.
    "CastKnifePatience-ut": ("CastKnifePatience", knife_ut),
    "CastStarDetermination-ut": ("CastStarDetermination", star_ut),
    "CastGloveBravery-ut": ("CastGloveBravery", glove_ut),
    "ClassV3Perseverance-ut": ("ClassV3Perseverance", quill_ut),
    "CastSwarmIntegrity-ut": ("CastSwarmIntegrity", swarm_ut),
    "ClassV3Kindness-ut": ("ClassV3Kindness", pan_ut),
    "ClassJustice-ut": ("ClassJustice", justice_ut),
    # Fourth set: warm, rewarding but calm, every class.
    "CastKnifePatience-warm": ("CastKnifePatience", knife_warm),
    "CastStarDetermination-warm": ("CastStarDetermination", star_warm),
    "CastGloveBravery-warm": ("CastGloveBravery", glove_warm),
    "ClassV3Perseverance-warm": ("ClassV3Perseverance", quill_warm),
    "CastSwarmIntegrity-warm": ("CastSwarmIntegrity", swarm_warm),
    "ClassV3Kindness-warm": ("ClassV3Kindness", pan_warm),
    "ClassJustice-warm": ("ClassJustice", justice_warm),
}


def write_wav(path, y):
    import wave

    pcm = (np.clip(y, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def ffmpeg(*args):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def preview(name, wav, out):
    """Animation on a placeholder card, with the sound, as an MP4 you can play anywhere."""
    from PIL import Image, ImageDraw

    frames_dir = os.path.join(ROOT, "out", "vfx", name, "frames")
    tmp = os.path.join(os.path.dirname(out), "_preview")
    os.makedirs(tmp, exist_ok=True)
    total = int(LENGTH * FPS)
    for i in range(total):
        bg = Image.new("RGBA", (240, 270), (14, 12, 20, 255))
        d = ImageDraw.Draw(bg)
        d.rectangle((40, 18, 199, 252), fill=(48, 42, 66, 255), outline=(230, 230, 240, 255), width=2)
        d.rectangle((52, 40, 187, 140), fill=(30, 26, 44, 255))
        if i < 24:
            bg.alpha_composite(Image.open(os.path.join(frames_dir, f"element-{i:02d}.png")).convert("RGBA"), (10, 10))
        bg.convert("RGB").resize((480, 540), Image.NEAREST).save(os.path.join(tmp, f"{i:03d}.png"))
    ffmpeg("-framerate", str(FPS), "-i", os.path.join(tmp, "%03d.png"), "-i", wav, "-c:v", "libx264", "-pix_fmt", "yuv420p",
           "-r", "32", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out)
    for f in os.listdir(tmp):
        os.remove(os.path.join(tmp, f))
    os.rmdir(tmp)


if __name__ == "__main__":
    import sys

    picked = sys.argv[1:] or list(SOUNDS)
    for name in picked:
        effect, make = SOUNDS[name]
        d = os.path.join(ROOT, "out", "sfx", effect)
        os.makedirs(d, exist_ok=True)
        y = make()
        wav = os.path.join(d, f"{name}.wav")
        write_wav(wav, y)
        ffmpeg("-i", wav, "-c:a", "libvorbis", "-q:a", "6", os.path.join(d, f"{name}.ogg"))
        ffmpeg("-i", wav, "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(d, f"{name}.mp3"))
        preview(effect, wav, os.path.join(d, f"{name}-preview.mp4"))
        print(f"{name}: {len(y) / SR:.2f} s, peak {np.max(np.abs(y)):.2f}")
