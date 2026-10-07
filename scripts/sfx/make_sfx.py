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
     python3 scripts/sfx/make_sfx.py ClassJustice (just one)
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
    """Wild West revolver shot: a sharp crack, a punchy blast and a low boom."""
    crack_ = highpass(noise(0.012), 1500) * env(0.012, 0.0002, 0.004)
    blast = lowpass(noise(0.16), 3500) * env(0.16, 0.0005, 0.045)
    boom = thump(130, 42, 0.32)
    return np.tanh(2.5 * stack(1.4 * crack_, blast, 0.9 * boom)) * 0.9


def justice():
    """Justice: a Wild West showdown. The revolver cylinder spins while the crosshair closes, the hammer
    cocks on the lock-on, the badge lands with a gunshot that echoes off the canyon and ricochets,
    then a shine, a coin flip that lands with a clink, a glint and the twinkle."""
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
    # The shot as the badge lands, echoing off canyon walls (each echo further and duller).
    shot = gunshot()
    m.add(shot, at(7), 1.0)
    far = lowpass(shot, 1800)
    for k, (dt, g) in enumerate([(0.21, 0.32), (0.43, 0.2), (0.68, 0.12), (0.95, 0.07)]):
        m.add(lowpass(far, 1800 - 300 * k), at(7) + dt, g)
    # Ricochet: a whining 'pyeeoww' sliding down with a little wobble.
    dur = 0.42
    ric = osc("sine", lambda t: 3600 * (1 - 0.62 * t / dur) * (1 + 0.025 * np.sin(2 * np.pi * 28 * t)), dur)
    m.add(ric * env(dur, 0.012, dur * 0.7), at(8), 0.2)
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


SOUNDS = {
    "CastKnifePatience": knife,
    "CastStarDetermination": star,
    "ClassV3Perseverance": quill,
    "ClassV3Kindness": pan,
    "CastGloveBravery": glove,
    "ClassJustice": justice,
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
        make = SOUNDS[name]
        d = os.path.join(ROOT, "out", "sfx", name)
        os.makedirs(d, exist_ok=True)
        y = make()
        wav = os.path.join(d, f"{name}.wav")
        write_wav(wav, y)
        ffmpeg("-i", wav, "-c:a", "libvorbis", "-q:a", "6", os.path.join(d, f"{name}.ogg"))
        ffmpeg("-i", wav, "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(d, f"{name}.mp3"))
        preview(name, wav, os.path.join(d, f"{name}-preview.mp4"))
        print(f"{name}: {len(y) / SR:.2f} s, peak {np.max(np.abs(y)):.2f}")
