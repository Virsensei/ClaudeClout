"""Generates fusion/CastStarDetermination.setting: the Save Star (Determination)
cast effect as a DaVinci Resolve / Fusion node tree.

Every animated value is an expression driven by one CTRL node, so the whole
effect is controlled from a single Inspector: timing, layer on/off, sizes,
shake, palette and "crisp pixels". Each layer sits in its own named underlay.

Run: python3 scripts/fusion/save_star.py
"""

import math
import os

W, H = 110, 125  # working canvas (art pixels); the output is upscaled x2 to 220 x 250
OUT_W, OUT_H = 220, 250
CY_N = 1 - 62 / H  # card centre (55, 62) in Fusion's normalised, Y-up space

C = "CTRL"  # name of the control node used in every expression


def num(v):
    return repr(round(v, 6)) if isinstance(v, float) else str(v)


# ---------------------------------------------------------------- tools ----

TOOLS = {}  # name -> dict(cls, inputs, pos, extra)
ORDER = []


def tool(name, cls, inputs, pos, **extra):
    assert name not in TOOLS, name
    TOOLS[name] = dict(cls=cls, inputs=inputs, pos=pos, extra=extra)
    ORDER.append(name)
    return name


def V(value):
    return ("value", value)


def E(expr):
    return ("expr", expr)


def S(op, src="Output"):
    return ("src", op, src)


def mask_common(prev=None):
    d = {
        "MaskWidth": V(W),
        "MaskHeight": V(H),
        "PixelAspect": V((1, 1)),
        "UseFrameFormatSettings": V(0),
        "ClippingMode": V('FuID { "None" }'),
    }
    if prev:
        d["EffectMask"] = S(prev, "Mask")
    return d


def star_points(r, inner):
    """Four-pointed star, points up/right/down/left, in Fusion polyline units
    (offsets from the mask centre, relative to image width)."""
    pts = []
    for i in range(8):
        a = math.pi / 2 - i * math.pi / 4
        rr = r if i % 2 == 0 else inner
        pts.append((math.cos(a) * rr / W, math.sin(a) * rr / W))
    return pts


def polyline(pts):
    body = ", ".join("{ Linear = true, X = %s, Y = %s }" % (num(x), num(y)) for x, y in pts)
    return "Polyline { Closed = true, Points = { %s } }" % body


# Colour background for a layer (colour comes from the CTRL palette).
def color_bg(name, colour, pos):
    return tool(
        name,
        "Background",
        {
            "Width": V(W),
            "Height": V(H),
            "UseFrameFormatSettings": V(0),
            "TopLeftRed": E(f"{C}.{colour}Red"),
            "TopLeftGreen": E(f"{C}.{colour}Green"),
            "TopLeftBlue": E(f"{C}.{colour}Blue"),
            "TopLeftAlpha": V(1),
        },
        pos,
    )


MAIN = {"last": None}  # the main merge chain


def merge(name, fg, mask, blend, pos):
    inputs = {
        "Background": S(MAIN["last"]),
        "Foreground": S(fg),
        "EffectMask": S(mask, "Mask"),
        "Blend": E(blend),
        "PerformDepthMerge": V(0),
    }
    tool(name, "Merge", inputs, pos)
    MAIN["last"] = name
    return name


UNDERLAYS = []


def underlay(name, comment, x0, y0, x1, y1, rgb):
    UNDERLAYS.append(dict(name=name, comment=comment, pos=(x0, y0), size=(x1 - x0, y1 - y0), rgb=rgb))


def between(lo, hi, var):
    """1 while lo <= var < hi, else 0 (nested iif, no && in Fusion expressions)."""
    return f"iif({var} < {num(lo)}, 0, iif({var} < {num(hi)}, 1, 0))"


AGE = f"{C}.Age"
T = f"(time - {C}.StartFrame)"

# ------------------------------------------------------------- CTRL node ---

PALETTE = {
    "Ink": (0x29, 0x00, 0x05),
    "Base": (0xFF, 0x00, 0x1D),
    "Light": (0xFF, 0x73, 0x83),
    "Pale": (0xFF, 0xC7, 0xCD),
    "White": (0xFF, 0xFF, 0xFF),
}

ctrl_inputs = {}
ctrl_ui = []  # (id, definition string)


def section(cid, label, n):
    ctrl_ui.append((cid, f'{{ LINKS_Name = "{label}", LINKID_DataType = "Number", INPID_InputControl = "LabelControl", LBLC_DropDownButton = true, LBLC_NumInputs = {n}, }}'))


def slider(cid, label, default, lo, hi, integer=False):
    ctrl_inputs[cid] = V(default)
    ctrl_ui.append((cid, f'{{ LINKS_Name = "{label}", LINKID_DataType = "Number", INPID_InputControl = "SliderControl", INP_Default = {num(default)}, INP_MinScale = {num(lo)}, INP_MaxScale = {num(hi)},{" INP_Integer = true," if integer else ""} }}'))


def checkbox(cid, label, default=1):
    ctrl_inputs[cid] = V(default)
    ctrl_ui.append((cid, f'{{ LINKS_Name = "{label}", LINKID_DataType = "Number", INPID_InputControl = "CheckboxControl", INP_Default = {default}, }}'))


def colour(cid, label, rgb):
    for k, (ch, v) in enumerate(zip(["Red", "Green", "Blue", "Alpha"], list(rgb) + [255])):
        ctrl_inputs[cid + ch] = V(v / 255)
        name = label if k == 0 else ch
        ctrl_ui.append((cid + ch, f'{{ LINKS_Name = "{name}", LINKID_DataType = "Number", INPID_InputControl = "ColorControl", INP_Default = {num(v / 255)}, INP_MinScale = 0, INP_MaxScale = 1, IC_ControlGroup = {list(PALETTE).index(cid) + 1}, IC_ControlID = {k}, }}'))


def calc(cid, label, expr):
    ctrl_inputs[cid] = E(expr)
    ctrl_ui.append((cid, f'{{ LINKS_Name = "{label}", LINKID_DataType = "Number", INPID_InputControl = "SliderControl", INP_Visible = false, }}'))


section("TimingTab", "TIMING", 3)
slider("StartFrame", "Start Frame", 0, 0, 100, True)
slider("BurstFrame", "Burst Frame", 7, 1, 100, True)
slider("ExitFrame", "Exit Frame (star pops away)", 15, 2, 100, True)

section("LayersTab", "LAYERS (on / off)", 7)
checkbox("ShowMotes", "1 Motes")
checkbox("ShowFlare", "2 Cross Flare")
checkbox("ShowShockwave", "3 Shockwave")
checkbox("ShowMiniStars", "4 Mini Stars")
checkbox("ShowStar", "5 Save Star")
checkbox("ShowTwinkle", "6 Final Twinkle")
checkbox("ShowShake", "Screen Shake")

section("LookTab", "LOOK", 8)
slider("StarSize", "Star Size (px)", 16.5, 4, 40)
slider("BurstSize", "Burst Size (px)", 30, 4, 50)
slider("MoteRadius", "Motes Start Distance (px)", 36, 8, 50)
slider("FlareLength", "Flare Length (px)", 48, 0, 60)
slider("ShockSize", "Shockwave Size", 0.85, 0, 2)
slider("MiniDistance", "Mini Stars Distance (px)", 28, 0, 40)
slider("ShakeStrength", "Shake Strength", 1.5, 0, 4)
checkbox("Crisp", "Crisp Pixels (1-bit alpha)")

section("ColorTab", "PALETTE", 20)
for cid, rgb in PALETTE.items():
    colour(cid, cid, rgb)

# Hidden helpers the other nodes read.
calc("Age", "Age", f"time - {C}.BurstFrame")
calc("ExitU", "Exit Progress", f"min(max((time - {C}.ExitFrame) / 4, 0), 1)")
calc("OutScale", "Exit Scale", f"iif({C}.ExitU < 0.001, 1, iif({C}.ExitU > 0.999, 0, iif({C}.ExitU < 0.3, 1 + 0.6 * {C}.ExitU, 1.18 * pow(1 - ({C}.ExitU - 0.3) / 0.7, 2))))")
calc(
    "StarR",
    "Star Radius",
    f"iif({T} < 0, 0, iif({AGE} < -0.5, iif({T} < 0.5, 0.42, iif({T} < 1.5, 0.79, 0.67 + 0.21 * min(max(({T} - 2) / max({C}.BurstFrame - {C}.StartFrame - 3, 1), 0), 1))) * {C}.StarSize, "
    f"iif({AGE} < 0.5, {C}.BurstSize, iif({AGE} < 1.5, {C}.BurstSize * 0.7, iif({AGE} < 2.5, {C}.StarSize * 0.91, iif({AGE} < 3.5, {C}.StarSize * 1.06, {C}.StarSize))))) * {C}.OutScale)",
)
calc("Odd", "Odd Frame", "time - floor(time / 2) * 2")
calc("StarSpin", "Star Wobble", f"iif({AGE} < -0.5, 1, iif({AGE} < 0.5, 0, 1)) * iif({C}.Odd < 0.5, 4, -4)")
calc("Shiver", "Star Shiver", f"iif({AGE} < -2.5, 0, iif({AGE} < -0.5, iif({C}.Odd < 0.5, -1, 1), 0))")
calc("ShakeX", "Shake X", f"floor({C}.ShowShake * {C}.ShakeStrength * iif({AGE} < -0.5, 0, iif({AGE} < 0.5, 2, iif({AGE} < 1.5, -2, iif({AGE} < 2.5, 1, iif({AGE} < 3.5, -1, 0))))) + 0.5)")
calc("ShakeY", "Shake Y", f"{C}.ShowShake * min({C}.ShakeStrength, 1) * iif({AGE} < 0.5, 0, iif({AGE} < 1.5, -1, iif({AGE} < 2.5, 1, 0)))")

n_visible = sum(1 for cid, d in ctrl_ui if "INP_Visible = false" not in d)

# ---------------------------------------------------------------- layout ---
# Every layer reads the same way, top to bottom: masks (shapes) -> merge on the
# main chain -> the merge's colour. Layers sit left to right in draw order.

COL = 110  # node grid
ROW = 40
GAP = 2 * COL  # space between layer groups


def layer_merge(name, colour, mask, blend, x):
    """A merge on the main chain at column x, with its own colour node right under it."""
    color_bg(f"{name}_Color", colour, (x, 2 * ROW))
    return merge(name, f"{name}_Color", mask, blend, (x, 0))


CANVAS = tool("CANVAS", "Background", {"Width": V(W), "Height": V(H), "UseFrameFormatSettings": V(0), "TopLeftAlpha": V(0)}, (0, 0))
MAIN["last"] = CANVAS
tool(C, "AlphaDivide", ctrl_inputs, (0, -8 * ROW), ui=ctrl_ui, nameset=True)
underlay("CONTROLS", "Open CTRL: timing, layers on/off, sizes, shake, palette, crisp pixels. Everything else reads from it.", -70, -10 * ROW, 70, -6 * ROW, (0.35, 0.35, 0.4))

# ------------------------------------------------------------ 1 · MOTES ----

X = 2 * COL
MOTES = 10
mote_on = f"{C}.ShowMotes * iif({AGE} < 0, 1, 0)"
pale_chain, white_chain, ink_chain = [], [], []
for i in range(MOTES):
    a = i * 2 * math.pi / MOTES + 0.35
    cs, sn = math.cos(a), math.sin(a)
    delay = [0.0, 1.2, 0.5, 2.0, 0.9, 1.6, 0.2, 2.4, 1.0, 0.6][i]
    jitter = [0, 6, 3, 8, 1, 5, 7, 2, 4, 6][i]
    c = f"min(max(({T} + 1 - {num(delay)}) / 5, 0), 1)"
    r = f"(({C}.MoteRadius - 6 + {jitter}) * (1 - pow({c}, 2)) + 6)"
    k = f"(1.2 * {c})"  # swirl: a sideways push that bends the path into a spiral
    cx = f"0.5 + {r} * ({num(cs)} - {k} * {num(sn)}) / {W}"
    cy = f"{num(CY_N)} - 1.3 * {r} * ({num(sn)} + {k} * {num(cs)}) / {H}"
    vis = f"iif({c} < 0.001, 0, iif({c} > 0.999, 0, 1))"
    white = i % 3 == 0
    chain = white_chain if white else pale_chain
    col = X + (2 if white else 1) * COL
    name = f"MOTE_{i + 1}"
    tool(name, "RectangleMask", {**mask_common(chain[-1] if chain else None), "Center": E(f"Point({cx}, {cy})"), "Width": E(f"{vis} * 2 / {W}"), "Height": E(f"{vis} * 2 / {W}")}, (col, -(11 - len(chain)) * ROW))
    chain.append(name)
for i in range(MOTES):
    src = f"MOTE_{i + 1}"
    name = f"MOTE_{i + 1}_Outline"
    tool(name, "RectangleMask", {**mask_common(ink_chain[-1] if ink_chain else None), "Center": E(f"{src}.Center"), "Width": E(f"iif({src}.Width > 0, 4 / {W}, 0)"), "Height": E(f"iif({src}.Width > 0, 4 / {W}, 0)")}, (X, -(11 - i) * ROW))
    ink_chain.append(name)
layer_merge("MOTES_Outline", "Ink", ink_chain[-1], mote_on, X)
layer_merge("MOTES_Pale", "Pale", pale_chain[-1], mote_on, X + COL)
layer_merge("MOTES_White", "White", white_chain[-1], mote_on, X + 2 * COL)
underlay("L1_MOTES", "Motes of determination spiral into the star before the burst (Start Frame .. Burst Frame - 1).", X - 70, -12 * ROW, X + 2 * COL + 70, 3 * ROW, (0.55, 0.12, 0.18))

# ------------------------------------------------------------ 2 · FLARE ----

X += 2 * COL + GAP
LEN = f"(iif({AGE} < -0.5, 0, iif({AGE} < 3.5, 1 - 0.25 * {AGE}, 0)) * {C}.ShowFlare)"
THICK = f"iif({AGE} < 0.5, 3, iif({AGE} < 1.5, 2, 1))"
flare, flare_ink = [], []
specs = [
    ("FLARE_Vertical", f"{THICK} / {W}", f"2 * {C}.FlareLength * {LEN} / {W}", 0),
    ("FLARE_Horizontal", f"1.5 * {C}.FlareLength * {LEN} / {W}", f"{THICK} / {W}", 0),
    ("FLARE_Diagonal1", f"1 / {W}", f"2 * (8 + 22 * {LEN}) * iif({LEN} > 0, 1, 0) / {W}", 45),
    ("FLARE_Diagonal2", f"1 / {W}", f"2 * (8 + 22 * {LEN}) * iif({LEN} > 0, 1, 0) / {W}", -45),
]
for j, (name, w, h, ang) in enumerate(specs):
    tool(name, "RectangleMask", {**mask_common(flare[-1] if flare else None), "Center": V((0.5, CY_N)), "Width": E(w), "Height": E(h), "Angle": V(ang)}, (X + COL, -(5 - j) * ROW))
    flare.append(name)
for j, (name, *_rest) in enumerate(specs):
    oname = name + "_Outline"
    tool(oname, "RectangleMask", {**mask_common(flare_ink[-1] if flare_ink else None), "Center": V((0.5, CY_N)), "Width": E(f"iif({name}.Height > 0, iif({name}.Width > 0, {name}.Width + 2 / {W}, 0), 0)"), "Height": E(f"iif({name}.Height > 0, iif({name}.Width > 0, {name}.Height + 2 / {W}, 0), 0)"), "Angle": E(f"{name}.Angle")}, (X, -(5 - j) * ROW))
    flare_ink.append(oname)
layer_merge("FLARE_Outline", "Ink", flare_ink[-1], f"{C}.ShowFlare", X)
layer_merge("FLARE_Pale", "Pale", flare[-1], f"{C}.ShowFlare", X + COL)
layer_merge("FLARE_Flash", "White", flare[-1], f"{C}.ShowFlare * {between(-0.5, 0.5, AGE)}", X + 2 * COL)
underlay("L2_FLARE", "Cross flare on the burst: full length, then 3/4, 1/2, 1/4 (white on the burst frame).", X - 70, -6 * ROW, X + 2 * COL + 70, 3 * ROW, (0.6, 0.3, 0.1))

# -------------------------------------------------------- 3 · SHOCKWAVE ----

X += 2 * COL + GAP
thin_t = f"min(max({AGE} / 4, 0), 1)"
thick_t = f"min(max({AGE} / 7, 0), 1)"
tool("SHOCK_ThickRing", "EllipseMask", {**mask_common(), "Center": V((0.5, CY_N)), "Solid": V(0), "BorderWidth": E(f"(4 - 3 * {thick_t}) / {W}"), "Width": E(f"2 * (8 + (1 - pow(1 - {thick_t}, 3)) * 26) * {C}.ShockSize / {W}"), "Height": E(f"2 * (8 + (1 - pow(1 - {thick_t}, 3)) * 26) * {C}.ShockSize / {W}")}, (X, -2 * ROW))
tool("SHOCK_ThinRing", "EllipseMask", {**mask_common(), "Center": V((0.5, CY_N)), "Solid": V(0), "BorderWidth": V(1.5 / W), "Width": E(f"2 * (10 + {thin_t} * 34) * {C}.ShockSize / {W}"), "Height": E(f"2 * (10 + {thin_t} * 34) * {C}.ShockSize / {W}")}, (X + COL, -2 * ROW))
layer_merge("SHOCK_Thick", "Pale", "SHOCK_ThickRing", f"{C}.ShowShockwave * {between(-0.5, 7.5, AGE)} * (1 - 0.85 * {thick_t})", X)
layer_merge("SHOCK_Thin", "White", "SHOCK_ThinRing", f"{C}.ShowShockwave * {between(-0.5, 4.5, AGE)} * (1 - 0.7 * {thin_t})", X + COL)
underlay("L3_SHOCKWAVE", "Two rings expanding from the centre after the burst (thin one 5 frames, thick one 8 frames).", X - 70, -3 * ROW, X + COL + 70, 3 * ROW, (0.45, 0.45, 0.5))

# ------------------------------------------------------- 4 · MINI STARS ----

X += COL + GAP
MINIS = 8
mini_pts = polyline(star_points(4, 1.2))
mini, mini_ink = [], []
for i in range(MINIS):
    a = i * 2 * math.pi / MINIS + 0.2 + [0.05, -0.1, 0.12, -0.04, 0.08, -0.12, 0.02, 0.1][i]
    cs, sn = math.cos(a), -math.sin(a)  # screen angle (y down) -> Fusion (y up)
    dist = [0.9, 0.8, 1.0, 0.85, 0.95, 0.78, 0.92, 0.88][i]
    leave = [6.5, 9.0, 7.5, 8.5, 5.5, 9.5, 7.0, 8.0][i]  # frames after the burst
    out = f"(1 - pow(1 - min(max(({AGE} - 1) / 4, 0), 1), 3))"
    d = f"({C}.MiniDistance * {dist} * {out})"
    lift = f"max({AGE} - 1, 0) * 0.6"
    cx = f"0.5 + {d} * {num(cs)} / {W}"
    cy = f"{num(CY_N)} + ({d} * 1.35 * {num(sn)} + {lift}) / {H}"
    u = f"({AGE} - {num(leave)})"
    size = f"{C}.ShowMiniStars * iif({AGE} < 0.5, 0, iif({AGE} < 1.5, 1.4, iif({u} < 0, 1, iif({u} < 1, 1.25, iif({u} < 2, 0.75, iif({u} < 3, 0.4, 0))))))"
    name = f"MINI_{i + 1}"
    tool(name, "PolylineMask", {**mask_common(mini[-1] if mini else None), "Polyline": V(mini_pts), "Center": E(f"Point({cx}, {cy})"), "Size": E(size), "ZRotation": E(f"{(i % 2) * 2 - 1} * max({AGE} - 1, 0) * 3")}, (X + COL, -(9 - i) * ROW))
    mini.append(name)
for i in range(MINIS):
    src = f"MINI_{i + 1}"
    name = src + "_Outline"
    tool(name, "PolylineMask", {**mask_common(mini_ink[-1] if mini_ink else None), "Polyline": V(mini_pts), "Center": E(f"{src}.Center"), "Size": E(f"{src}.Size"), "ZRotation": E(f"{src}.ZRotation"), "BorderWidth": V(1 / W), "Level": E(f"iif({src}.Size > 0, 1, 0)")}, (X, -(9 - i) * ROW))
    mini_ink.append(name)
layer_merge("MINI_Outline", "Ink", mini_ink[-1], f"{C}.ShowMiniStars", X)
layer_merge("MINI_Stars", "Pale", mini[-1], f"{C}.ShowMiniStars", X + COL)
underlay("L4_MINI_STARS", "Eight little stars bloom out after the burst and each winks away on its own frame.", X - 70, -10 * ROW, X + COL + 70, 3 * ROW, (0.6, 0.5, 0.1))

# ------------------------------------------------------------- 5 · STAR ----

X += COL + GAP
R0 = 16.5
star_common = {
    "Center": E(f"Point(0.5 + {C}.Shiver / {W}, {num(CY_N)})"),
    "Size": E(f"{C}.ShowStar * {C}.StarR / {R0}"),
    "ZRotation": E(f"{C}.StarSpin"),
}
follow = {"Center": E("STAR_Base.Center"), "Size": E("STAR_Base.Size"), "ZRotation": E("STAR_Base.ZRotation")}
tool("STAR_Outline", "PolylineMask", {**mask_common(), "Polyline": V(polyline(star_points(R0, R0 * 0.3))), **follow, "BorderWidth": V(1 / W), "Level": E("iif(STAR_Base.Size > 0, 1, 0)")}, (X, -3 * ROW))
tool("STAR_Base", "PolylineMask", {**mask_common(), "Polyline": V(polyline(star_points(R0, R0 * 0.3))), **star_common}, (X + 2 * COL, -3 * ROW))
tool("STAR_Light", "PolylineMask", {**mask_common(), "Polyline": V(polyline(star_points(R0 * 0.72, R0 * 0.24))), **follow}, (X + 3 * COL, -3 * ROW))
tool("STAR_Pale", "PolylineMask", {**mask_common(), "Polyline": V(polyline(star_points(R0 * 0.45, R0 * 0.16))), **follow}, (X + 4 * COL, -3 * ROW))
tool("STAR_Core", "EllipseMask", {**mask_common(), "Center": E("STAR_Base.Center"), "Width": E(f"iif(STAR_Base.Size > 0, 2 * max(1, 0.12 * {C}.StarR) / {W}, 0)"), "Height": E(f"iif(STAR_Base.Size > 0, 2 * max(1, 0.12 * {C}.StarR) / {W}, 0)")}, (X + 5 * COL, -3 * ROW))
tool("STAR_Ring", "EllipseMask", {**mask_common(), "Center": E("STAR_Base.Center"), "Solid": V(0), "BorderWidth": V(1.5 / W), "Width": E(f"2 * ({C}.StarR + 5 + {C}.Odd) / {W}"), "Height": E(f"2 * ({C}.StarR + 5 + {C}.Odd) / {W}")}, (X + 7 * COL, -3 * ROW))
on = f"{C}.ShowStar"
layer_merge("STAR_InkOutline", "Ink", "STAR_Outline", on, X)
layer_merge("STAR_WhiteOutline", "White", "STAR_Outline", f"{on} * {between(0.5, 1.5, AGE)}", X + COL)
layer_merge("STAR_BaseFill", "Base", "STAR_Base", on, X + 2 * COL)
layer_merge("STAR_LightFill", "Light", "STAR_Light", on, X + 3 * COL)
layer_merge("STAR_PaleFill", "Pale", "STAR_Pale", on, X + 4 * COL)
layer_merge("STAR_CoreFill", "White", "STAR_Core", on, X + 5 * COL)
layer_merge("STAR_Flash", "White", "STAR_Base", f"{on} * {between(-0.5, 0.5, AGE)}", X + 6 * COL)
layer_merge("STAR_BreathingRing", "Light", "STAR_Ring", f"{on} * iif({T} < 1.5, 0, iif({AGE} < -0.5, 1, 0))", X + 7 * COL)
underlay("L5_SAVE_STAR", "The save star: pops in, grows while charging, bursts, settles, pops away at Exit Frame. STAR_Base drives size, spin and position; the other shapes follow it.", X - 70, -4 * ROW, X + 7 * COL + 70, 3 * ROW, (0.7, 0.1, 0.15))

# ---------------------------------------------------------- 6 · TWINKLE ----

X += 7 * COL + GAP
K = f"(time - {C}.ExitFrame - 4)"
tw_size = f"{C}.ShowTwinkle * iif({K} < -0.5, 0, iif({K} < 0.5, 5, iif({K} < 1.5, 9, iif({K} < 2.5, 5, iif({K} < 3.5, 2, 0))))) / 9"
tw_pts = polyline(star_points(9, 2))
tool("TWINKLE_Outline", "PolylineMask", {**mask_common(), "Polyline": V(tw_pts), "Center": V((0.5, CY_N)), "Size": E("TWINKLE_Star.Size"), "ZRotation": E("TWINKLE_Star.ZRotation"), "BorderWidth": V(1 / W), "Level": E("iif(TWINKLE_Star.Size > 0, 1, 0)")}, (X, -2 * ROW))
tool("TWINKLE_Star", "PolylineMask", {**mask_common(), "Polyline": V(tw_pts), "Center": V((0.5, CY_N)), "Size": E(tw_size), "ZRotation": E(f"-11.5 * max({K}, 0)")}, (X + COL, -2 * ROW))
layer_merge("TWINKLE_OutlineFill", "Ink", "TWINKLE_Outline", f"{C}.ShowTwinkle", X)
layer_merge("TWINKLE_Fill", "Pale", "TWINKLE_Star", f"{C}.ShowTwinkle", X + COL)
layer_merge("TWINKLE_Flash", "White", "TWINKLE_Star", f"{C}.ShowTwinkle * {between(0.5, 1.5, K)}", X + 2 * COL)
underlay("L6_TWINKLE", "The last twinkle after the star pops away (frames Exit+4 .. Exit+7).", X - 70, -3 * ROW, X + 2 * COL + 70, 3 * ROW, (0.6, 0.5, 0.55))

# ----------------------------------------------------------- 7 · OUTPUT ----

gx = X + 2 * COL + GAP
tool("SHAKE", "Transform", {"Input": S(MAIN["last"]), "Center": E(f"Point(0.5 + {C}.ShakeX / {W}, 0.5 + {C}.ShakeY / {H})")}, (gx, 0))
tool(
    "CRISP_PIXELS",
    "Custom",
    {
        "Image1": S("SHAKE"),
        "NumberIn1": E(f"{C}.Crisp"),
        "RedExpression": V('"iif(n1 > 0.5, iif(a1 > 0.4, r1 / a1, 0), r1)"'),
        "GreenExpression": V('"iif(n1 > 0.5, iif(a1 > 0.4, g1 / a1, 0), g1)"'),
        "BlueExpression": V('"iif(n1 > 0.5, iif(a1 > 0.4, b1 / a1, 0), b1)"'),
        "AlphaExpression": V('"iif(n1 > 0.5, iif(a1 > 0.4, 1, 0), a1)"'),
    },
    (gx + COL, 0),
)
tool("OUTPUT_220x250", "BetterResize", {"Input": S("CRISP_PIXELS"), "Width": V(OUT_W), "Height": V(OUT_H), "HiQOnly": V(0), "PixelAspect": V((1, 1)), "FilterMethod": V(0)}, (gx + 2 * COL, 0))
underlay("OUTPUT", "Screen shake, crisp 1-bit pixels, then x2 nearest-neighbour upscale to 220 x 250. Connect OUTPUT_220x250 to MediaOut / a Saver.", gx - 70, -2 * ROW, gx + 2 * COL + 70, 2 * ROW, (0.25, 0.4, 0.3))

# ----------------------------------------------------------------- write ---


def fmt_value(v):
    if isinstance(v, tuple):
        return "{ " + ", ".join(num(c) for c in v) + " }"
    if isinstance(v, str):
        return v  # pre-formatted (FuID, Polyline, quoted string)
    return num(v)


def fmt_input(spec):
    if spec[0] == "value":
        return f"Input {{ Value = {fmt_value(spec[1])}, }}"
    if spec[0] == "expr":
        e = spec[1].replace("\\", "\\\\").replace('"', '\\"')
        return f'Input {{ Expression = "{e}", }}'
    return f'Input {{ SourceOp = "{spec[1]}", Source = "{spec[2]}", }}'


lines = ["{", "\tTools = ordered() {"]
for u in UNDERLAYS:
    r, g, b = u["rgb"]
    comment = u["comment"].replace('"', '\\"')
    lines += [
        f"\t\t{u['name']} = Underlay {{",
        "\t\t\tCtrlWZoom = false,",
        "\t\t\tNameSet = true,",
        f'\t\t\tInputs = {{ Comments = Input {{ Value = "{comment}", }}, }},',
        f"\t\t\tViewInfo = UnderlayInfo {{ Pos = {{ {num(u['pos'][0])}, {num(u['pos'][1])} }}, Size = {{ {num(u['size'][0])}, {num(u['size'][1])} }} }},",
        f"\t\t\tColors = {{ TileColor = {{ R = {r}, G = {g}, B = {b} }}, }},",
        "\t\t},",
    ]
for name in ORDER:
    t = TOOLS[name]
    lines.append(f"\t\t{name} = {t['cls']} {{")
    lines.append("\t\t\tCtrlWZoom = false,")
    if t["extra"].get("nameset") or True:
        lines.append("\t\t\tNameSet = true,")
    lines.append("\t\t\tInputs = {")
    for k, spec in t["inputs"].items():
        lines.append(f"\t\t\t\t{k} = {fmt_input(spec)},")
    lines.append("\t\t\t},")
    lines.append(f"\t\t\tViewInfo = OperatorInfo {{ Pos = {{ {num(t['pos'][0])}, {num(t['pos'][1])} }} }},")
    if "ui" in t["extra"]:
        lines.append("\t\t\tUserControls = ordered() {")
        for cid, d in t["extra"]["ui"]:
            lines.append(f"\t\t\t\t{cid} = {d},")
        lines.append("\t\t\t},")
    lines.append("\t\t},")
lines += ["\t},", f'\tActiveTool = "{C}",', "}", ""]

root = os.path.join(os.path.dirname(__file__), "..", "..")
out = os.path.join(root, "fusion", "CastStarDetermination.setting")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", newline="\n") as fh:
    fh.write("\n".join(lines))
print(f"wrote {os.path.relpath(out, root)}: {len(ORDER)} nodes, {len(UNDERLAYS)} underlays, {n_visible} CTRL controls")
