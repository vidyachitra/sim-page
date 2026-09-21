# Physics Sims

Interactive physics simulations for GitHub Pages, built with Jekyll + Just the Docs
and a shared canvas runtime (`assets/js/sim-core.js`).

## Layout

| Path | Purpose |
|---|---|
| `assets/js/sim-core.js` | Shared runtime: loop, controls, readouts, drawing helpers |
| `assets/sims/<id>.js` | One file per simulation (API v1 contract) |
| `<category>/index.md` | Category parent page |
| `<category>/<id>.md` | Page that embeds a sim via `{% include sim.html id="<id>" %}` |
| `scripts/check_sim.js` | Headless checker for a sim + page |
| `.claude/skills/physics-sim-pages/` | Claude Code skill used to build new sims |

## Check a sim

```
node scripts/check_sim.js assets/js/sim-core.js assets/sims/<id>.js <category>/<id>.md
```

## Deploy

Push to `main`, then GitHub **Settings → Pages → Deploy from a branch** (`main`, `/root`).
Before the first deploy, verify the pinned versions of Just the Docs (`_config.yml`)
and KaTeX (`_includes/head_custom.html`).
