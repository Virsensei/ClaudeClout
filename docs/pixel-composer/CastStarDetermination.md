# Save Star (Determination) in Pixel Composer

Two ways to get this effect into Pixel Composer:

- **Route A (exact copy, 5 minutes):** load the 7 layer sprite sheets and stack them. The result is pixel-identical
  to the original. You can still move, retime, recolour or delete any layer.
- **Route B (build it from scratch):** recreate every layer with Pixel Composer's own nodes, with the keyframe
  values below. You get a fully procedural, editable version (close to the original, not pixel-identical).

Node and setting names can differ a little between Pixel Composer versions. If a name doesn't match, search the
node list (right-click on the graph) for the closest one.

## Project settings (both routes)

| Setting | Value |
|---|---|
| Canvas size | **110 × 125** (the art is drawn at half size, every art pixel is 2×2 in the final file) |
| Frames | **24** (frame 0 to frame 23) |
| FPS | **16** |
| Export | scale **×2**, nearest-neighbour (no smoothing), transparent background → 220 × 250 |

Palette (Determination ramp):

| Name | Hex | Used for |
|---|---|---|
| ink | `#290005` | 1 px outline around everything |
| base | `#FF001D` | outer star |
| light | `#FF7383` | middle star, breathing ring |
| pale | `#FFC7CD` | inner star, mini stars, flare after the flash |
| white | `#FFFFFF` | core, flash frames, highlights |

## What happens when (frame map)

| Layer (bottom → top) | Visible on frames | What it does |
|---|---|---|
| 1 Motes | 0–6 | 14 little squares spiral into the centre |
| 2 Flare | 7–10 | cross-shaped flare: 1, 0.75, 0.5, 0.25 of full length |
| 3 Shockwave | 7–14 | two rings expanding from the centre |
| 4 MiniStars | 8–19 | 8 small stars bloom out and wink away one by one |
| 5 Star | 0–18 | the save star (plus a breathing ring on frames 2–6) |
| 6 Sparkles | 11–18 | a few sparkles rising |
| 7 Twinkle | 19–22 | the final twinkle; frame 23 is empty |

The whole stack shakes on frames 7–10 (offsets in art pixels: f7 (+3, 0), f8 (−3, +1), f9 (+2, −1), f10 (−1, 0)).
The layer sheets already include the shake.

---

## Route A: stack the layer sprite sheets

Files: `layers-110x125/1-Motes.png` … `7-Twinkle.png` (use these: they're at the project's 110 × 125 size).
Each sheet is 6 columns × 4 rows, frames left to right, top to bottom (frame 0 top-left, frame 23 bottom-right).

```
[Image 1-Motes] ──► [Splice Spritesheet] ──────────────────────────────┐
[Image 2-Flare] ──► [Splice Spritesheet] ──► [Blend (Normal)] ◄────────┘
[Image 3-Shockwave] ► [Splice Spritesheet] ──► [Blend (Normal)] ◄── previous Blend
[Image 4-MiniStars] ► [Splice Spritesheet] ──► [Blend (Normal)] ◄── previous Blend
[Image 5-Star] ─────► [Splice Spritesheet] ──► [Blend (Normal)] ◄── previous Blend
[Image 6-Sparkles] ─► [Splice Spritesheet] ──► [Blend (Normal)] ◄── previous Blend
[Image 7-Twinkle] ──► [Splice Spritesheet] ──► [Blend (Normal)] ◄── previous Blend
                                                      │
                                                      ▼
                                                  [Export]
```

1. **Image** node for each sheet (or drag the 7 PNGs onto the graph).
2. **Splice Spritesheet** after each Image: sprite size **110 × 125**, **24** sprites, **6** per row, no padding or
   spacing. Set it to output an animation (one sprite per frame). In some versions that's an option on the node;
   in others you add an **Array to Anim** (Animation) node after it.
3. Chain **Blend** nodes in **Normal** mode, keeping the order above: each new layer goes on top of everything below
   it. (A Composite node with 7 layers in this order works too.)
4. **Export**: GIF, PNG sequence or sprite sheet, scale ×2, nearest-neighbour, 16 fps.

To **retime** a layer, offset its animation start, or reorder/duplicate the spliced frames. To **recolour**, put a
**Palette Shift / Colour Replace** node after a Splice node and map the 5 colours above to another class ramp.

---

## Route B: build it from scratch

General tips:

- Set keyframe interpolation to **constant/step (hold)** so every frame shows exactly the value in the tables. Pixel
  art reads best without in-between easing; the easing is already baked into the numbers.
- Put an **Outline** node (1 px, `#290005`, outside) at the end of every layer group except the Shockwave.
- To hide a layer on frames where it isn't used, keyframe its opacity (or scale) to 0.

Full graph:

```
MOTES:      [Shape: Rect 2×2 pale] ─► [Repeat: Polar ×14] ─► [Outline] ─────────────┐
FLARE:      [Shape: Rect 3×96] + [Shape: Rect 72×3] + 4 diagonal lines             │
              ─► [Blend] ─► [Transform: scale] ─► [Outline] ───────────────────────┤
SHOCKWAVE:  [Shape: Ring (thin, white)] + [Shape: Ring (thick, pale)] ─► [Dither] ──┤
MINISTARS:  [Shape: Star 4 pts, pale] ─► [Repeat: Polar ×8] ─► [Outline] ──────────┤
STAR:       [Shape: Star base] + [Shape: Star light] + [Shape: Star pale] + [Shape: Circle white]
              ─► [Blend ×3] ─► [Transform: scale / rotation / position] ─► [Outline] ┤
            [Shape: Ring 1 px light] (breathing ring) ─────────────────────────────┤
SPARKLES:   [Particle] ─► [Outline] ───────────────────────────────────────────────┤
TWINKLE:    [Shape: Star 4 pts] ─► [Transform: scale] ─► [Outline] ─────────────────┤
                                                                                     ▼
            [Blend chain in this order (Motes at the bottom … Twinkle on top)]
                                         │
                                         ▼
                        [Transform: position (shake)] ─► [Export ×2]
```

### 5 · Star (build this first, it's the main symbol)

1. Four **Shape** nodes, all centred on the canvas (x 55, y 62), stacked with **Blend (Normal)**:
   - Star, **4 points**, outer radius **16.5 px**, inner radius **30 %** (≈ 5 px), colour **base** `#FF001D`
   - Star, 4 points, outer **11.9 px**, inner ≈ 4 px, colour **light** `#FF7383`
   - Star, 4 points, outer **7.4 px**, inner ≈ 2.6 px, colour **pale** `#FFC7CD`
   - Circle, radius **2 px**, **white**
2. **Transform** after the stack, keyframes (scale is relative to the 16.5 px star; rotation in degrees; x shift
   in px):

| Frame | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11–15 | 16 | 17 | 18 | 19+ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Scale | 0.42 | 0.79 | 0.67 | 0.70 | 0.76 | 0.82 | 0.88 | **1.82** | 1.27 | 0.91 | 1.06 | 1.00 | 1.15 | 0.60 | 0.15 | 0 |
| Rotation | 0 | 4.5 | 5.6 | 2.4 | −2.5 | −5.6 | −4.4 | 0 | 4.5 | 5.6 | 2.4 | −2.6, −5.6, −4.4, 0.2, 4.6 | 5.5 | 2.3 | −2.7 | – |
| X shift | 0 | 0 | 0 | 0 | 0 | +1 | −1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | – |

3. **Flash:** on frame **7** the whole star is pure white. Add a **Colour Adjust / Colorize** after the Transform
   and keyframe it to white on frame 7 only (or swap the three colours to white on that frame).
4. **Outline** 1 px `#290005`. On frame **8** keyframe the outline colour to **white** (an "afterglow" frame).
5. **Glints:** a tiny white plus/sparkle on the star's upper-left on odd frames 1–5, and on the upper-right on
   frames 12 and 15. Optional.
6. **Breathing ring** (frames 2–6 only): a **Shape** ring, 1 px thick, colour **light**, radius = star radius + 5 or
   + 6 (alternating each frame): f2 16, f3 17.5, f4 17.5, f5 19.5, f6 19.5. No outline.

### 1 · Motes (frames 0–6)

1. **Shape**: rectangle **2 × 2**, colour pale (make every third one white if your Repeat node can vary colour).
2. **Repeat** in **polar/circular** mode, **14** copies around the centre.
3. Keyframe the Repeat **radius** shrinking and its **rotation** turning, so the motes spiral in:

| Frame | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| Radius (px, approx.) | 36 | 34 | 30 | 25 | 18 | 11 | 6 | hide |
| Rotation (°) | 0 | 20 | 40 | 60 | 80 | 100 | 120 | – |

4. Optional: scale the result vertically ×1.3 so the spiral is an upright oval like the card. **Outline**.

In the original each mote has its own random delay; the Repeat version is a neat, even spiral. To get the random
look, use a **Particle** node instead (14 particles spawned on a ring of radius ~34, pulled to the centre by an
attractor, life 6 frames).

### 2 · Flare (frames 7–10)

1. **Shape** rectangle **3 × 96** (vertical) and **Shape** rectangle **72 × 3** (horizontal), centred, plus 4 thin
   1 px lines at 45° going from 8 px to 30 px out from the centre. **Blend** them together.
2. **Transform** scale keyframes: f7 **1**, f8 **0.75**, f9 **0.5**, f10 **0.25**, hidden on every other frame.
   Line thickness thins to 2 px on f8 and 1 px on f9–10.
3. Colour: **white** on f7, **pale** on f8–10. **Outline**.

### 3 · Shockwave (frames 7–14)

Two rings centred on the canvas, no outline:

| Frame | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 |
|---|---|---|---|---|---|---|---|---|
| Thin ring radius (1 px, white) | 8.5 | 15.7 | 22.9 | 30.1 | 37.4 | – | – | – |
| Thin ring opacity | 100 % | 83 % | 65 % | 48 % | 30 % | – | – | – |
| Thick ring radius (pale) | 6.8 | 15.0 | 20.9 | 24.8 | 27.2 | 28.4 | 28.8 | 28.9 |
| Thick ring thickness (px) | 4 | 3.6 | 3.1 | 2.7 | 2.3 | 1.9 | 1.4 | 1 |
| Thick ring opacity | 100 % | 88 % | 76 % | 64 % | 51 % | 39 % | 27 % | 15 % |

Put a **Dither** node (Bayer / ordered) on the rings so the opacity becomes a 1-bit dither pattern, not
semi-transparency. That's the "pixel fade" look.

### 4 · Mini stars (frames 8–19)

1. **Shape**: star, **4 points**, radius **4 px**, inner 30 %, colour **pale**, with a white centre pixel.
2. **Repeat** polar, **8** copies, start angle ≈ 11°.
3. Keyframe the Repeat radius: f8 **0**, f9 **16**, f10 **24**, f11 **27**, f12+ **28** (the original varies each
   star's distance a little, 24–31 px). Optionally stretch
   vertically ×1.35, and drift the whole group up 0.6 px per frame.
4. They **pop** at 5.5 px on frame 8, then twinkle between 4 and 5 px.
5. To make them **wink out one by one**: duplicate the group into two Repeat groups of 4 (alternate stars). Group A
   shrinks 5 → 3 → 1.5 → gone on frames 13–15, group B on frames 16–18. Flash each star white on its first shrink
   frame. **Outline**.

### 6 · Sparkles (frames 11–18)

**Particle** node: about **6** particles, spawned at random over frames 10–14 in a 60 × 70 px area around the
centre, moving up **2 px per frame**, life **5 frames**. Use a small plus shape (pale arms, white centre) as the
sprite, size 1 → 2 → 2 → 1 → 1. **Outline**. Dither-fade it out over frames 17–21.

### 7 · Twinkle (frames 19–22)

**Shape** star, 4 points, inner ≈ 22 %, centred. Radius keyframes: f19 **5**, f20 **9** (white), f21 **5**,
f22 **2**, then hidden (frame 23 must be empty). Rotate it 0, 11°, 23°, 34°. Colour pale, white on f20.
**Outline**.

### Stack, shake, export

1. **Blend (Normal)** chain from bottom to top: Motes → Flare → Shockwave → MiniStars → Star (+ ring) → Sparkles
   → Twinkle.
2. **Transform** on the final image, position keyframes: f7 (+3, 0), f8 (−3, +1), f9 (+2, −1), f10 (−1, 0),
   0 elsewhere. That's the screen shake.
3. **Export** at scale ×2, nearest-neighbour, transparent, 16 fps → 220 × 250, 24 frames.

Compare with `CastStarDetermination-reference.gif` while you work.
