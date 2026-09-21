# Physics Sims

Interactive physics simulations for GitHub Pages, built with Jekyll + Just the Docs
and a shared canvas runtime (`assets/js/sim-core.js`).

## Layout

| Path | Purpose |
|---|---|
| `assets/js/sim-core.js` | Shared runtime: loop, controls, readouts, graphs, drawing helpers |
| `assets/sims/<id>.js` | One file per simulation (API v1 contract) |
| `<section>/index.md` | Subject section (e.g. `mekanika/` = Fisika Mekanika) |
| `<section>/<category>/index.md` | Category page inside a section |
| `<section>/<category>/<id>.md` | Page that embeds a sim via `{% include sim.html id="<id>" %}` |
| `scripts/check_sim.js` | Headless checker for a sim + page |
| `.claude/skills/physics-sim-pages/` | Claude Code skill used to build new sims |

Site language is Bahasa Indonesia (see the skill). Sims start paused; press Jalankan.
Section `mekanika/` (8 sims, one per practicum module) and `elektronika/` (17 sims: DC,
transient, AC, devices). Circuit sims use real component values with `timeScale`
slow motion; graph axes show real time.

## Check a sim

```
node scripts/check_sim.js assets/js/sim-core.js assets/sims/<id>.js <section>/<category>/<id>.md
```

## Preview locally

Needs Ruby. The `Gemfile` uses the `github-pages` gem, so the local build matches
GitHub's Jekyll exactly.

```
bundle install
bundle exec jekyll serve
```

Then open <http://localhost:4000/sim-page/>. The `/sim-page` prefix is the `baseurl`
from `_config.yml`, the same path GitHub Pages uses; the bare root shows "Not Found".
`_config.yml` changes need a server restart.

## Deploy

Live at <https://auzan-main.github.io/sim-page/>.
Push to `main`, then GitHub **Settings → Pages → Deploy from a branch** (`main`, `/root`).
Before the first deploy, verify the pinned versions of Just the Docs (`_config.yml`)
and KaTeX (`_includes/head_custom.html`).
