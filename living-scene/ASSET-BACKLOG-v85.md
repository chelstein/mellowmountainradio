# v85 asset backlog — layered Living Window

This is the shopping list for the architecture described in `README.md`'s
"Desired v85 layered PNG architecture" section: cutting `lounge-window.jpg`
(1536×1024) into a transparent-sky plate plus independent element sprites,
so the sky can be real behind the art instead of tinted on top of it, and
each element can animate independently (wind sway, dish jitter, etc.).

All positions below were measured directly against the real source image
(percent of the 1536×1024 canvas — same convention `wildlife.js` already
uses for `deer-sprite.png`), so they're real coordinates, not estimates.
`z-index` is relative ordering only (back = low, front = high); leave gaps
between numbers for whatever gets inserted later.

## 0. Two ways to ship this — pick a depth of cut

**Option A — single foreground plate (fastest, biggest win per hour of
work).** Cut one PNG: the whole scene, sky made transparent, everything
else (ground/trees/tower/dish/jeep/deer/fence/gauge/rocks) left exactly
as painted, still fused together. This alone fixes the #1 complaint (a
painted sky that can't move) — real sky renders behind it, nothing else
changes. No per-element animation, but also a fraction of the masking
work.

**Option B — full separation (the real v85 architecture).** Every row
below becomes its own file, enabling independent wind sway, dish jitter,
parallax depth, etc. Strictly more valuable, strictly more cutout work —
the tree canopies and chain-link fence in particular are genuinely hard
(see their notes below).

Recommendation: ship Option A first as `foreground-plate.png` (row 1
below already specs it), confirm the real-sky-behind-flat-art look reads
well, *then* fund the full breakdown in rows 2-12 as a follow-up once
Option A has proven the direction is worth it.

## The layers

### 1. `foreground-plate.png` — sky removed, everything else intact
| | |
|---|---|
| Position | left 0%, top 0%, width 100%, height 100% (full canvas) |
| z-index | 10 (sits directly above the sky group, below nothing else if Option A) |
| Animate | No — static plate; existing overlays (particles, wildlife, aircraft) continue to render on top exactly as they do today |
| Notes | The one asset that unlocks real sky with the least effort. Mask everything **above** the treeline/tower/dish silhouette line — that boundary is irregular (tree canopies, tower lattice, dish rim all interrupt it), so this is a real cutout job, not a straight horizontal crop. Feather 2-3px on the sky-facing edge to avoid a hard cutout halo once it sits over a real gradient. If Option B is done, this file becomes unnecessary — its role is fully replaced by rows 2-12. |

### 2. `ground.png`
| | |
|---|---|
| Position | left 0%, top 60%, width 100%, height 40% (≈ y 614-1024, extend to ~y 590 so it still shows behind whatever overlaps it once rows 6/9/10/11/12 are cut separately) |
| z-index | 11 |
| Animate | Optional — very slow dry-grass/dust shimmer in high real wind (weather.js already has windMph); static otherwise |
| Notes | Simplest cutout in the set — no sky boundary to fight, just the bottom dirt/rock/scrub plane. Crop a little generous at the top edge (under the treeline) since jeep/gauge/rocks will sit in front of it and need real ground behind their own transparent edges. |

### 3. `tree-left.png` — the big oak
| | |
|---|---|
| Position | left 0%, top 0%, width 30%, height 65% (x 0-460, y 0-660) |
| z-index | 15 |
| Animate | Yes — wind sway: slight rotation/skew of the canopy around the trunk base, amplitude scaled by real windMph |
| Notes | **Hardest mask in the whole set.** The canopy has hundreds of small leaf-gaps with sky visible through them — a single silhouette/alpha-threshold cut will leave a speckled, jagged edge that reads as broken the moment it sways against a new sky color. Needs real per-cluster alpha, not a binary mask. Trunk base overlaps the Jeep's roofline slightly in the source art — keep row 12 (`jeep.png`) compositing in front of this one. |

### 4. `tree-right.png` — the cluster behind the dish
| | |
|---|---|
| Position | left 84%, top 2%, width 16%, height 26% (x 1290-1536, y 20-283) |
| z-index | 6 |
| Animate | Yes — same wind sway as tree-left, smaller amplitude (smaller, more distant tree) |
| Notes | Already partially occluded by the dish in the source painting — cut only what's visible, don't invent the hidden parts (the dish sprite will sit in front of it at a higher z-index anyway). Same leaf-gap masking difficulty as tree-left, smaller scale. |

### 5. `tower.png`
| | |
|---|---|
| Position | left 58.3%, top 4.9%, width 3.9%, height 55.7% (x 895-955, y 50-620) |
| z-index | 12 |
| Animate | Optional — real lattice towers do flex slightly at the top in high wind, but likely not worth the complexity for v85; ship static first |
| Notes | Thin lattice + guy wires against open sky — any fringing/anti-aliasing left over from the cutout will be very visible once it's sitting on a *different*, dynamic sky color instead of the original paint. Needs clean per-pixel alpha on the wires, not a hard binary edge. |

### 6. `tower-beacon.png`
| | |
|---|---|
| Position | left 59.4%, top 5.1%, width 0.9%, height 1.6% (x 912-926, y 52-68) |
| z-index | 13 (just above tower.png) |
| Animate | Yes — this is the layer that should own the beacon blink. Today it's a CSS animation applied to a spot on the flattened base image; separated out, the blink becomes a true opacity pulse on just the light itself |
| Notes | Tiny asset. Bake in (or add via CSS `filter`/`box-shadow`) a soft glow/bloom — a bare 14x16px red dot won't read as an aviation beacon at typical viewing size without one. |

### 7. `dish.png`
| | |
|---|---|
| Position | left 69%, top 14.6%, width 31%, height 51.8% (x 1060-1536, y 150-680) |
| z-index | 14 |
| Animate | Yes — Chuck's brief called for "dish vibrates": a very subtle high-frequency micro-jitter in real wind gusts, or a slow tracking-style drift if we want to imply it's actively aimed. Keep the amplitude tiny — it's the single largest, most dominant shape in the scene, and more than a pixel or two of motion will read as broken, not alive |
| Notes | The rim is one big smooth ellipse — any jaggedness in that curve will be immediately obvious, so this cutout needs a very clean curve, more than most. It crosses the right canvas edge, so that edge can crop flush to the canvas boundary rather than needing to be feathered. |

### 8. `deer.png` — already done
| | |
|---|---|
| Position | left 55.99%, top 62.5%, width 11.72%, height 12.7% (x 860-1040, y 640-770) — identical to the live `deer-sprite.png` |
| z-index | 16 |
| Animate | Yes — already shipped (breathing/weight-shift), see `wildlife.js` |
| Notes | No new work needed. Already feather-masked well against a relatively simple dirt/plant background; v85 just re-parents this exact asset under the new layer stack instead of sitting on the flattened base image. |

### 9. `fence-enclosure.png`
| | |
|---|---|
| Position | left 46.9%, top 52.7%, width 18.9%, height 12.7% (x 720-1010, y 540-670) |
| z-index | 8 |
| Animate | No — fences and electrical boxes don't move |
| Notes | The chain-link mesh is extremely fine, repetitive detail with sky/trees visible through every diamond gap — genuinely tedious to mask well, but probably the single biggest *realism* win in the set if it's done (a fence you can see real sky color shift through is a great "wait, is this real?" detail). If full mesh transparency isn't practical for v85, a simplified mostly-opaque panel cutout is an acceptable fallback to revisit later — flag it as simplified rather than silently shipping a flat panel. |

### 10. `rain-gauge.png`
| | |
|---|---|
| Position | left 36.5%, top 65.4%, width 5.2%, height 23% (x 560-640, y 670-905) |
| z-index | 17 |
| Animate | Yes — should carry the existing real NOAA-gauge storm glow (already driven by real Open-Meteo precipitation, see main README table) as self-illumination on just this sprite instead of a whole-scene overlay |
| Notes | Clean, simple, high-contrast silhouette against dirt (not sky) — should be one of the easiest cutouts in the whole set. |

### 11. `jeep.png`
| | |
|---|---|
| Position | left 3.3%, top 56.6%, width 28%, height 21% (x 50-480, y 580-795) |
| z-index | 18 |
| Animate | Optional — a real parked Jeep doesn't move; a subtle heat-shimmer off the hood at high real temperatures (weather.js already has the current temp) would be a nice-to-have, not essential |
| Notes | Chrome grille and mirror highlights sit close to the dark tree-trunk silhouette right behind it — watch for a light halo/fringe where the cutout meets that dark background. |

### 12. `foreground-rocks.png` — includes the yucca/agave clump
| | |
|---|---|
| Position | left 0%, top 82%, width 100%, height 18% (bottom band, x 0-1536, y 840-1024), plus the yucca/agave cluster near the dish base at x 1030-1220, y 650-830 (split into its own `yucca.png` if independent sway animation is wanted) |
| z-index | 19 (frontmost — closest to the camera) |
| Animate | Yes — the yucca/agave leaves can sway gently in real wind (same input as the trees); the rocks themselves stay static |
| Notes | This layer runs flush to the canvas's own bottom/left/right edges, so those three edges need no feathering — only the top edge (where it meets `ground.png`) needs it. |

## Quick reference — z-index order (back to front)

```
 0-3   sky group (canvas: gradient, clouds, moon, stars — already real, no PNG)
 6     tree-right.png
 8     fence-enclosure.png
10     foreground-plate.png   (Option A only — omit all rows below if using Option A)
11     ground.png
12     tower.png
13     tower-beacon.png
14     dish.png
15     tree-left.png
16     deer.png
17     rain-gauge.png
18     jeep.png
19     foreground-rocks.png (incl. yucca)
```
