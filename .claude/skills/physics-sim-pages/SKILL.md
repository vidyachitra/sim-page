---
name: physics-sim-pages
description: Build interactive physics simulations (applets) for a GitHub Pages site made with Jekyll + Just the Docs, using vanilla HTML/CSS/JS canvas and a shared runtime so every page has identical layout, controls, colors and short text. Use this whenever the user wants a physics simulation, applet, interactive demo or "sim" for a website or GitHub Pages — mechanics, oscillations, waves, circuits, electromagnetism, thermodynamics, optics, control systems — or wants to set up, extend or fix such a site, even if they only name a topic like "projectile sim" or "RC circuit applet". Not for videos (Manim) or PhET/SceneryStack-style frameworks.
---

# Physics Sim Pages

A GitHub Pages site built with **Jekyll + Just the Docs**. Every sim runs on one shared runtime (`sim-core.js`), so layout, controls, colors and responsiveness are identical everywhere. Your main job is the simulation. The user edits the Markdown text afterward.

**Site structure: section → category → sim.** A section is a subject or course (`mekanika/` = Fisika Mekanika); categories sit inside it (`mekanika/kinematika/`); sim pages inside those. Just the Docs needs `parent` on a category and `parent` + `grand_parent` on a sim page. New subjects are new top-level folders with their own `index.md` (`has_children: true`); add a line for them in the root `index.md` under "Bidang". Sim ids stay globally unique because all sims live flat in `assets/sims/`.

**Language: Bahasa Indonesia**, light theme only. Page text, slider labels, graph titles, canvas labels and the assumptions comment are Indonesian; symbols stay as in the practicum module (`θ`, `m_g`, `EK`/`EP` for kinetic/potential energy, decimal comma in prose: "0,60 m"). Ids and keys stay lowercase-hyphen ASCII (`jatuh-bebas`). The runtime's own strings (Jalankan/Jeda/Ulang/Kecepatan) live in the `UI` table in `sim-core.js`.

## Ownership

The user edits pages by hand, so regenerating them would destroy their work.

| File | Owner |
|---|---|
| `assets/sims/<id>.js` | You |
| `<section>/<category>/<id>.md` | You create it **once** as a starter; after that the user owns it. Never overwrite an existing page. If a sim change breaks the text (renamed symbol, removed slider), tell the user which lines to update. |
| `assets/js/sim-core.js`, `_includes/*`, `_sass/custom/*.scss`, `_config.yml` | Shared. Change only when asked. A change to the sim contract means bumping `API_VERSION` and updating every sim. |

## Workflow

### New site
1. Copy `assets/site-template/` (in this skill) to the repo root.
2. Tell the user to check the latest Just the Docs release tag and KaTeX version and update the pins in `_config.yml` and `_includes/head_custom.html`.
3. Push, then set **Settings → Pages → Deploy from a branch** (main, `/root`). No Actions needed.
4. Local preview (optional): with Ruby installed, `bundle install` then `bundle exec jekyll serve`. The `Gemfile` uses the `github-pages` gem, so the local build matches GitHub's Jekyll 3.10 exactly. Every page must carry `layout: default`; nothing applies it automatically.

### New sim
1. **Section and category.** Use an existing section (`mekanika/`) or create `<section>/index.md` (copy `mekanika/index.md`). Use an existing category or create `<section>/<category>/index.md` (copy `mekanika/osilasi/index.md`: `layout: default`, title, `parent`, `has_children: true`, one line of description).
2. **Sim file.** Write `assets/sims/<id>.js` following the contract below. Read `assets/site-template/assets/sims/bandul-sederhana.js` first. It is the reference for structure, comments and style. The site's other sims (`kereta-lintasan`, `jatuh-bebas`, `hukum-newton`, `gesekan`, `hukum-hooke`, `pegas-massa`, `euler-rk4`) show the patterns for tracks, pulleys, springs, side-by-side comparisons and inset plots.
3. **Starter page.** Write `<section>/<category>/<id>.md` from the text schema below.
4. **Check.** Run:
   ```
   node scripts/check_sim.js <site>/assets/js/sim-core.js <site>/assets/sims/<id>.js <site>/<section>/<category>/<id>.md
   ```
   Fix every error and re-run until it prints PASS. Treat warnings as things to mention to the user.
5. **Deliver.** Put files in the outputs folder using repo-relative paths. Reply briefly: the files created, the model assumptions, the checker summary, and the manual checks from the end of this file.

If the topic is clear, don't ask questions; state your assumptions in the reply. Ask only when the topic is genuinely ambiguous ("waves": string, sound, or water?).

## Sim contract (API v1)

```js
(function () {                       // IIFE: no globals
  SimCore.register({
    api: 1,
    id: 'projectile',                // = filename, lowercase-hyphen
    title: 'Projectile motion',      // canvas aria-label
    aspect: 16 / 9,                  // 16/9 wide scenes · 4/3 default · 1 for orbits/rotation
    view: { x: [xmin, xmax], y: [ymin, ymax] },   // meters, y up; fitted to canvas, aspect kept
    dt: 1 / 240,                     // fixed physics step, s (≤ 0.01)
    conserved: 'E',                  // optional: measure() key checked for drift at defaults
    driftTolerance: 0.01,            // optional, default 1 %
    autoplay: false,                 // optional; default false: the sim waits for Jalankan. true never applies under reduced motion
    params: [                        // ≤ 5 sliders
      { key, label, symbol, unit, min, max, step, value, resets: true /* initial conditions */ }
    ],
    readouts: [ { key, label, unit, digits, color /* optional palette name */ } ],
    graphs: [                        // optional, ≤ 4; scrolling plots of measure() keys vs time
      { title: 'Energy', unit: 'J', min: 0 /* optional fixed bound; max too */, window: 10 /* s, default */,
        series: [ { key, label, color /* palette name */, digits } ] }   // 1–4 series, same unit
    ],
    init(p)              { return state; },          // pure
    step(state, p, dt)   { /* mutate state */ },      // pure
    measure(state, p)    { return { key: number }; }, // pure; required with readouts/conserved
    positions(state, p)  { return [[x, y], ...]; },   // pure; key points, checker keeps them in view
    draw(ctx, state, p, view, d) { /* read-only on state */ },
    drag: {                          // optional
      hit(state, p, x, y, r) { return bool; },        // r = hit tolerance in m (bigger on touch)
      move(state, p, x, y) { },
      end(state, p) { }                               // optional
    }
  });
})();
```

**Pure** means no `document`, `window`, timers, storage or `Math.random()`. The checker runs these functions headless in Node, so any DOM access fails the check. Pure physics is also what makes Reset exactly reproducible. If you need randomness, seed a small PRNG from state.

The core owns everything else: play/pause/reset/speed, sliders, readouts, graphs, resize, DPR, the loop, off-screen pause and touch handling. Sims never add buttons, `requestAnimationFrame`, event listeners or CSS.

**Graphs** are strip charts beside the canvas on wide screens (stacked to its height, sliders under both) and below the sliders on phones. They are sampled from `measure()` in sim time (so Speed changes the pace, not the shape). The core owns axes, autoscaling and the scrolling window; history clears on Reset, on an initial-condition slider and when the object is dragged. Give each graph one unit: put KE, PE and E together, but θ, ω and α each get their own graph. Use `min: 0` for quantities that cannot go negative so the baseline is visible.

## Physics rules

- **SI internally.** Convert display units (degrees, cm, µF) only in `init`, `measure` and labels.
- **Integrator by system type.** Never use explicit Euler: it adds energy every step, so orbits spiral out and pendulums grow.
  - For **conservative** systems (pendulum, spring, orbit, charge in a B-field), use semi-implicit Euler (update velocity, then position with the new velocity) or velocity Verlet. These keep energy bounded over long runs. Semi-implicit Euler lets energy wobble by ≈ ω·dt/2; for stiff systems (ω ≳ 10 rad/s) use velocity Verlet to stay under the 1 % drift check.
  - For **damped, driven or non-conservative** systems, and for first-order ODEs such as circuits, use `SimCore.rk4(f, t, yArray, dt)`. `f` must return a new array.
  - A **closed-form** solution is fine when it is exact and simple. Give the parameters it depends on `resets: true`.
- **Defaults are the conservative case** when `conserved` is set, because the checker measures drift at defaults. Put damping and driving on sliders that default to 0.
- **Assumptions comment** at the top of the file, mirrored in the page's assumptions callout.
- **No hidden fudge factors.** Visual scales (for example, vector length per m/s) are constants named at the top and listed in the comment.
- **Symbols match everywhere**: slider `symbol`, readout `label`, the equation, and the page text.

## Controls

- Use **≤ 5 sliders, ideally 3–4.** On phones the controls stack under the canvas, and every extra slider pushes the sim off-screen.
- Initial-condition sliders (start angle, launch speed) get `resets: true`. Other sliders change the running sim live.
- Ranges must be physically sensible and keep the scene inside `view` at every min/max combination. The checker tests all corners.
- **Let sliders reach 0 when zero is a real case** (angle, amplitude, height, a pulled mass, friction, even g). Guard the divisions that zero creates (`mTot <= 0 → a = 0`, `ω = 0 → T = ∞`). Keep a positive minimum only for quantities in a denominator: spring constant, pendulum length, oscillator mass, Δt.
- Reset restores all defaults. This is core behavior; don't reimplement it.
- Drag is optional. Add it when grabbing the object teaches something (set a pendulum angle, pull a spring).

## Visual rules

- **Colors only by palette name.** Never use hex values in sims. The palette lives in `custom.scss`:

  | Name | Use |
  |---|---|
  | `fg` | rods, supports, axes, ground |
  | `muted` / `grid` | labels / grid lines, bar outlines |
  | `body` / `body2` | main object / second object |
  | `vector` | force, acceleration |
  | `vector2` | velocity |
  | `trail` | path history |
  | `ke`, `pe`, `total` | energy |

- **Draw with the helpers `d`**: `line`, `polyline`, `dot` (radius in px), `circle` (radius in m), `arrow` (with a short label like `v`, `F`, `mg`), `text`, `polygon` (filled, optional outline), `rect` (bottom-left corner, w × h in m), `spring` (coil between two points), `energyBars`. Positions are world meters, line widths are px (thin 1, normal 2, emphasis 3). They produce the same look across sims.
- Show **energy as a graph** (KE, PE, E) whenever energy is part of the lesson. `d.energyBars` still exists for sims that want an on-canvas summary, but prefer the graph.
- Add **graphs** for the quantities the page text talks about (position, velocity, acceleration, current, …). Two to four graphs; more pushes the page too long on phones.
- **Minimal canvas text**: labels only. Explanations belong on the page.
- **Keep the view tight** around the motion; empty space shrinks the physics on phones. Size the view for the largest slider values, so cap slider ranges instead of widening the view.
- **Readouts are optional.** Skip them when every value is already in a graph legend; the canvas and graphs then share one screen on desktop.

## Responsive behavior

The core handles responsiveness: the canvas fills the content width at the sim's aspect ratio, is DPR-sharp, and redraws without resetting on resize or rotation. Sliders flow into 1–3 columns, touch targets are ≥ 44 px, and the sim pauses when off-screen or in a hidden tab. Your responsibilities:

- Pick `aspect` from the list in the contract. Never use portrait; it becomes huge on desktop.
- Size physical things in meters and markers or text in px. Never read the window size or `canvas.width`.
- With graphs, the canvas shares the row with them on wide screens, so it is about 45 % of the content width. Check the sim still fits one desktop screen (canvas + sliders ≈ 600 px tall at 1440 × 900). A square canvas is fine; a 4/3 one gives more room.

## Page text schema

Write exactly this structure. Keep it short: the sim teaches, the text points at what to look for.

```markdown
---
layout: default
title: <Title Case Name>
parent: <Category title>
grand_parent: <Section title>
nav_order: <n>
---

# <Title Case Name>
<One sentence: the core idea, ≤ 20 words.>

{% include sim.html id="<id>" %}

$$<one key equation, same symbols as the sliders>$$

{: .note }
> - <What to notice, ≤ 12 words>      (2–3 bullets)

{: .try }
> - <Try this prompt, ≤ 15 words>     (1–2 bullets)

{: .assume }
> - <Model assumption, ≤ 12 words>    (1–3 bullets, mirrors the code comment)
```

Style: Bahasa Indonesia, present tense, numbers with units (decimal comma), inline math as `$...$` (kramdown). No filler ("Pada simulasi ini kita akan…"), no exclamation marks, no questions in `.note`. `.try` prompts may end with a question. Callout titles are set in `_config.yml` (Perhatikan / Coba / Asumsi model).

## Checks

**Automated** (`scripts/check_sim.js`):
- contract valid and id matches the filename
- page front matter has layout, title, parent, nav_order and (inside a section) grand_parent
- every readout and graph key comes out of `measure()` and stays finite
- 60 s at defaults stays finite, and conserved drift is within tolerance
- every min/max slider corner runs 10 s, stays finite and stays in view
- physics cost per frame is reported
- page structure and word limits are met

**Manual, for the user after deploy.** List these in your reply:
- phone in portrait and landscape: no sideways scroll, controls usable
- a desktop width around 1440 px
- dragging the object doesn't scroll the page, and scrolling over the empty canvas still works
- math renders, and the browser console shows no errors

## Don'ts

- Sims must not load external libraries, create globals, touch the DOM, use timers or `requestAnimationFrame`, or use storage.
- Sims must not add buttons, hex colors or inline styles.
- Don't overwrite an existing page, and don't edit theme or shared files unless asked.
- Don't use explicit Euler, and don't leave unexplained visual scale factors.
