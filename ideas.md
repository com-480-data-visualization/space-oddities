# Space Oddities — Storytelling & Visualization Ideas

## Storytelling approach

- **One-sentence logline:** Two objects that cannot steer are headed for each other at 14 km/s — and everything that brought them here was entirely predictable.
- Take inspiration from [The Pudding satellites piece](https://pudding.cool/2017/10/satellites/)
- Use **one persistent main visual scene** (Earth + satellites, top-down radial view) as the backbone of the whole story
- The scene evolves as we scroll — same Earth, same rings, but what we show on top changes with each chapter
- Each chapter can introduce additional D3 charts (area, scatter, bar) that appear alongside and are dynamically linked to the main scene
- **Critical principle:** open in medias res with the specific GEOSAT/PSLV CDM event — not with growth charts. Find the human story first, explain the system second.

## Running the prototype

```bash
python -m http.server 8000
# open http://localhost:8000/prototype.html
```

---

## Narrative arc

The emotional arc across the full scroll:

```
CURIOSITY     →     WONDER     →     UNEASE     →     DREAD     →     RESOLUTION
  [Ch 1]             [Ch 2]           [Ch 3]          [Ch 4]           [Ch 5–6]
We're inside      This is         The uncontrolled   The cascade     The choice is
a real alert      beautiful       outnumber the      has already     still ours
with no answer    and terrifying  controlled 2.4:1   started         to make
```

---

## Chapters

### Chapter 1 — "385 Metres" ⭐ MVP

**Question / message**
- What does an actual space near-miss look like?
- Hook: open not on a beautiful map but on a number — "385" — in silence. Then "metres." Then context.

**The story**
- A Conjunction Data Message is not a warning you can act on. GEOSAT (US Navy, active since 1985) has no propulsion left. The PSLV rocket body (ISRO, abandoned 2013) never had any. The near-miss was predicted. Logged. Life continued.
- Real CDM: TCA 2026-03-22 16:17 UTC · Miss distance: 385 m · Pc: 5.6×10⁻⁴ (5.6× above the 10⁻⁴ alert threshold)

**Main scene (canvas)**
- Only two dots visible: GEOSAT (cyan, 6px, glow) and PSLV R/B (red, 6px, glow)
- All other ~2,600 objects ghosted to ~5% opacity — present but invisible
- Pulsing dashed line between the two objects labelled "385 m" — heartbeat rhythm (~0.5 Hz)
- Reveals the full orbit is populated only in Ch 2

**Additional chart (D3 SVG)**
- Log-scale horizontal bar: background noise / alert threshold (10⁻⁴) / GEOSAT event (5.6×10⁻⁴)
- Makes Pc legible without explaining probability theory

**Transition**
- "How did two tracked objects end up 385 metres apart with no one able to do anything? The answer starts 67 years ago."

---

### Chapter 2 — "The Great Filling" ⭐ MVP

**Question / message**
- How did orbit go from empty to overcrowded in one human lifetime?
- Key stat: 2022 alone saw 2,113 launches — more than all years before 2018 combined

**Main scene (canvas)**
- All dots appear, colored by launch year: D3 `interpolateYlOrRd` (blue=early, red=recent)
- Auto-animates 1957→2023 when chapter scrolls into view
- Starlink burst effect: visible flood of dots into LEO after 2019 crossover
- LEO holds 89.5% of active satellites — visible as density in the inner ring

**Additional chart (D3 SVG)**
- Area chart: launches per year 1957–2023
- Gradient fill follows launch year color scale
- Annotated vertical line at 2019: "Starlink era begins →"

**Interactions / linking**
- Year animation fires on chapter activation (auto-play, not a slider — avoids scroll conflict)
- Stretch: hover year on area chart → canvas highlights objects launched that year

---

### Chapter 3 — "The Permanent Residents" ⭐ MVP

**Question / message**
- What is actually up there — and how much of it can we control?
- Every rocket launched left something behind. The leftovers outnumber the satellites.
- "Tracked" means >10 cm. Below that threshold, radar is blind. Untracked fragments: hundreds of thousands.

**Reframe:** This chapter is forensics, not taxonomy. The debris count is the accumulated cost of every launch in Ch 2. Connect causally, not categorically: the same curve that showed launches → now show what it left behind.

**Main scene (canvas)**
- Recolor by category: debris=red (dominant), payload=cyan (dim), rocket_body=orange
- Category filter toggle buttons: All / Payloads only / Debris only / Rocket bodies
- Key moment: switching to "Debris only" and seeing the map barely empty — visceral

**Additional chart (D3 SVG)**
- Horizontal bar chart: 4 categories with object counts
  - Active Payloads: 14,748 (cyan)
  - Debris: 35,749 (red)
  - Rocket Bodies: 6,820 (orange)
  - Other: 10,830 (grey)
- Hover bar row → canvas filters to that category

**Stat callout**
- "2.4× more debris than active satellites"
- "The debris count grows even without new launches — collisions generate new fragments"

---

### Chapter 4 — "The Alert You Never Hear" ⭐ MVP

**Question / message**
- How close are we, right now, to catastrophe?
- Hundreds of near-miss alerts issued every day. Most below threshold. But a significant fraction cross 10⁻⁴.
- The ratio of controllable to uncontrollable objects gets worse with every launch.

**Main scene (canvas)**
- Only CDM-involved objects visible (high Pc highlighted in red)
- Animated conjunction lines between high-Pc pairs (slow pulsing opacity)
- GEOSAT/PSLV circled — we're back where Ch 1 started, but now reader understands the system

**Additional chart (D3 SVG)**
- Scatter plot: X = miss distance (log, 50m–5000m) · Y = collision probability Pc (log, 10⁻⁷–10⁻²)
- One dot per CDM event (~150 mock events)
- Horizontal dashed line at Pc = 10⁻⁴: "Above this line: operator must consider a manoeuvre"
- Red dots above threshold · cyan dots below
- GEOSAT event circled with annotation · auto-opens tooltip on chapter load
- Hover dot → full CDM metadata tooltip

**Aha moment**
- Mousing over the circled GEOSAT dot: "GEOSAT (active, no propulsion) / PSLV R/B (abandoned) — Pc 5.6×10⁻⁴ — 385 m" — the reader recognizes Ch 1.

---

### Chapter 5 — "The Cascade" 🔲 Stretch

**Question / message**
- What happens if we lose control of the feedback loop?
- Kessler Syndrome: one collision → thousands of fragments → each capable of triggering the next

**Main scene (canvas)**
- Interactive cascade simulation: click to trigger a collision → debris cloud multiplies
- Illustrates why specific altitude bands could become permanently unusable

**Interactions**
- Click event: explode a dot → animate debris fan → watch secondary collisions propagate
- Scroll-driven sub-sequence: advance one collision at a time

---

### Chapter 6 — "What We Choose" 🔲 Stretch

**Question / message**
- Active debris removal. Mandatory deorbit standards. International coordination.
- The technical solutions exist. The political will is the variable.

**Main scene (canvas)**
- Governance scenario visualization (policy options and projected debris reduction)

---

## MVP vs. stretch

| # | Piece | Priority | Complexity |
|---|-------|----------|------------|
| 1 | Scrollytelling layout + IntersectionObserver | MVP | M |
| 2 | Canvas renderer: Earth, rings, dot cloud | MVP | M |
| 3 | Ch 1: CDM two-dot overlay + Pc bar chart | MVP | S |
| 4 | Ch 2: Year coloring + auto-animation + area chart | MVP | M |
| 5 | Ch 3: Category recoloring + filter toggle + bar chart | MVP | S |
| 6 | Ch 4: Conjunction lines + Pc scatter + hover tooltips | MVP | M |
| 7 | Real data integration (swap mock → pipeline JSON) | MVP | M |
| 8 | CDM close-approach viewer (covariance tubes, time scrubber) | Stretch | L |
| 9 | Kessler cascade simulation | Stretch | L |
| 10 | Canvas dot hit-testing (quadtree hover) | Stretch | M |
| 11 | Ch 6: Governance chapter | Stretch | M |
| 12 | Satellite.js live TLE propagation in browser | Stretch | L |

---

## Main visual scene — technical spec

**Rendering:** Canvas 2D API. 2,600 mock dots in prototype → ~68,000 in final (Canvas 2D handles this at 60fps for 1px dots).

**Geometry:**
```
Earth circle:  r = 66px   (canvas units)
LEO band:      r = 96–172px   (200–2,000 km)
MEO band:      r = 175–205px  (2,000–35,786 km)
GEO ring:      r = 220px      (~35,786 km)
```

**Altitude → radius mapping:** Linear within each band. LEO gets the most visual space (most objects).

**Object position:** `x = cx + r·cos(angle)`, `y = cy + r·sin(angle)`. Angles randomized for prototype. Final: computed from RAAN + mean anomaly via SGP4/satellite.js.

**Chapter state machine:**
- Ch 1: ghost all except GEOSAT/PSLV
- Ch 2: color by `launchYear` (D3 YlOrRd), auto-animate year
- Ch 3: color by category, apply filter
- Ch 4: highlight Pc > 10⁻⁴ objects, animate conjunction lines

---

## Visual identity

**Color palette:**
```css
--bg-deep:            #05060f;    /* page background */
--payload-color:      #22d3ee;    /* cyan */
--debris-color:       #ef4444;    /* red */
--rocket-body-color:  #f97316;    /* orange */
--leo-color:          #3b82f6;    /* LEO ring */
--meo-color:          #8b5cf6;    /* MEO ring */
--geo-color:          #f59e0b;    /* GEO ring */
--accent:             #38bdf8;    /* UI accent */
--danger:             #ff2d55;    /* CDM alert / high-Pc */
```

**Typography:** Space Grotesk (narrative text) + Space Mono (data / labels / callouts). Monospace = fact. Sans-serif = meaning.

**Animation:** Default transition `0.55s cubic-bezier(0.4, 0, 0.2, 1)`. Pulsing overlays use sinusoidal opacity at 0.4–0.9 Hz. Canvas dot state transitions interpolated per-frame over ~400ms. Charts fade out/in (0.18s) on chapter change.

---

## CDM as narrative device

The CDM is introduced as a scene, not a table. Five human-readable lines styled as a medical alert:

```
EVENT:    2026-03-22  16:17 UTC
OBJECT 1: GEOSAT (US Navy · active since 1985 · no propulsion)
OBJECT 2: PSLV R/B (ISRO · abandoned 2013 · no propulsion)
GAP:      385 metres at time of closest approach
Pc:       5.6 × 10⁻⁴  ──  5.6× above alert threshold
```

"Pc" is never explained abstractly. It's always paired with: "roughly 1-in-1,800" or "5.6× the threshold that is supposed to trigger a response." The covariance uncertainty is the final twist: even "385 metres" is uncertain — the gap could have been 50m or 2km. That is what Pc encodes.

---

## Audience notes (plain language rules)

- Never use: TCA, RAAN, inclination, SGP4, conjunction (use "near-miss")
- Always pair Pc with a human comparison ("roughly 1-in-1,800")
- Always pair speeds with references ("14 km/s = 20× a rifle bullet")
- Always pair distances with human scale ("385 m = ~4 football fields")
- Add altitude scale bar (in km) on canvas ring lines — general public may not grasp the radial compression

---

## Inspirations

- [The Pudding satellites](https://pudding.cool/2017/10/satellites/) — scrollytelling model
- [Information is Beautiful](https://informationisbeautiful.net/) — layered dense visual language
- ESA Space Debris Office spatial density maps — orbital density as continuous field
- Stuff in Space (WebGL, technically impressive but no narrative — what to avoid)
- LeoLabs (professional conjunction monitoring — what to make accessible)
