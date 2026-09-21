#!/usr/bin/env node
/* Headless checks for one sim (and optionally its page).
 *
 * Usage:
 *   node check_sim.js <site>/assets/js/sim-core.js <site>/assets/sims/<id>.js [<site>/<category>/<id>.md]
 *
 * Runs the sim's physics without a browser. Any DOM access in init/step/measure/positions
 * fails here, which is the point: physics must be pure.
 * Checks: contract validation · id = filename · 60 s at defaults stays finite ·
 * conserved quantity drift · every min/max corner stays finite and in view ·
 * step cost per frame · page structure and word limits.
 * Exit code 1 if any error.
 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const [corePath, simPath, pagePath] = process.argv.slice(2);
if (!corePath || !simPath) {
  console.error('Usage: node check_sim.js <sim-core.js> <sim.js> [page.md]');
  process.exit(2);
}

const errors = [], warnings = [], info = [];
const err = m => errors.push(m), warn = m => warnings.push(m), note = m => info.push(m);

function finish() {
  info.forEach(m => console.log('  · ' + m));
  warnings.forEach(m => console.log('  ! ' + m));
  errors.forEach(m => console.log('  ✗ ' + m));
  console.log(errors.length ? `FAIL (${errors.length} error${errors.length > 1 ? 's' : ''})` : 'PASS');
  process.exit(errors.length ? 1 : 0);
}

// ---------------------------------------------------------------- load
const ctx = vm.createContext({ console });
try {
  vm.runInContext(fs.readFileSync(corePath, 'utf8'), ctx, { filename: corePath });
  vm.runInContext(fs.readFileSync(simPath, 'utf8'), ctx, { filename: simPath });
} catch (e) {
  err(`load failed: ${e.message} (top-level DOM access is not allowed)`);
  finish();
}

const SimCore = ctx.SimCore;
const ids = Object.keys(SimCore._defs);
if (ids.length !== 1) { err(`expected exactly 1 register() call, found ${ids.length}`); finish(); }
const def = SimCore._defs[ids[0]];
console.log(`Checking sim "${def.id}"`);

const expectedId = path.basename(simPath, '.js');
if (def.id !== expectedId) err(`id "${def.id}" must match filename "${expectedId}"`);
SimCore.validate(def).forEach(m => err('contract: ' + m));
if (errors.length) finish();

const params = def.params || [];
const defaults = () => Object.fromEntries(params.map(q => [q.key, q.value]));

// ---------------------------------------------------------------- helpers
function badNumber(o, where, depth = 0) {
  if (typeof o === 'number') return isFinite(o) ? null : where;
  if (depth > 6 || o == null || typeof o !== 'object') return null;
  for (const k of Object.keys(o)) {
    const b = badNumber(o[k], `${where}.${k}`, depth + 1);
    if (b) return b;
  }
  return null;
}

function outOfView(s, p) {
  if (!def.positions) return null;
  const [x0, x1] = def.view.x, [y0, y1] = def.view.y;
  for (const [x, y] of def.positions(s, p)) {
    if (!(x >= x0 && x <= x1 && y >= y0 && y <= y1)) return `(${x.toFixed(2)}, ${y.toFixed(2)}) m`;
  }
  return null;
}

function run(p, seconds, label, trackDrift) {
  const steps = Math.round(seconds / def.dt);
  let s;
  try { s = def.init(p); } catch (e) { err(`${label}: init() threw: ${e.message}`); return null; }
  let E0 = null, maxDrift = 0;
  if (trackDrift) E0 = def.measure(s, p)[def.conserved];
  const t0 = process.hrtime.bigint();
  for (let i = 1; i <= steps; i++) {
    try { def.step(s, p, def.dt); } catch (e) { err(`${label}: step() threw at t=${(i * def.dt).toFixed(2)} s: ${e.message}`); return null; }
    if (i % 24 === 0 || i === steps) {
      const t = (i * def.dt).toFixed(2);
      const bad = badNumber(s, 'state');
      if (bad) { err(`${label}: non-finite ${bad} at t=${t} s`); return null; }
      const off = outOfView(s, p);
      if (off) { err(`${label}: object left the view at ${off}, t=${t} s (tighten slider ranges or widen view)`); return null; }
      if (def.measure) {
        let m;
        try { m = def.measure(s, p); } catch (e) { err(`${label}: measure() threw: ${e.message}`); return null; }
        for (const r of def.readouts || []) {
          if (!(r.key in m)) { err(`measure() is missing readout key "${r.key}"`); return null; }
        }
        for (const g of def.graphs || []) for (const r of g.series) {
          if (!(r.key in m)) { err(`measure() is missing graph key "${r.key}" (graph "${g.title}")`); return null; }
          if (!isFinite(m[r.key])) { err(`${label}: graph key "${r.key}" is non-finite at t=${t} s`); return null; }
        }
        if (trackDrift) {
          const d = Math.abs(m[def.conserved] - E0) / Math.max(Math.abs(E0), 1e-12);
          if (d > maxDrift) maxDrift = d;
        }
      }
    }
  }
  const usPerStep = Number(process.hrtime.bigint() - t0) / 1000 / steps;
  return { maxDrift, usPerStep };
}

// ---------------------------------------------------------------- 1. defaults, 60 s
const conservedOk = def.conserved && def.measure;
const base = run(defaults(), 60, 'defaults', conservedOk);
if (base) {
  note(`defaults: 60 s simulated, all values finite`);
  if (conservedOk) {
    const tol = def.driftTolerance || 0.01;
    const pct = (base.maxDrift * 100).toFixed(3);
    if (base.maxDrift > tol) err(`"${def.conserved}" drifted ${pct}% over 60 s (limit ${tol * 100}%). Use a symplectic integrator or smaller dt; defaults must be the conservative case.`);
    else note(`"${def.conserved}" max drift ${pct}% over 60 s (limit ${tol * 100}%)`);
  }
  const stepsPerFrame = (1 / 60) / def.dt * 2;         // at 2× speed
  const msPerFrame = base.usPerStep * stepsPerFrame / 1000;
  note(`physics cost ≈ ${msPerFrame.toFixed(2)} ms/frame at 2× (desktop Node; phones are ~3–10× slower)`);
  if (msPerFrame > 2) warn('physics may be too heavy for phones; increase dt or simplify step()');
}

// ---------------------------------------------------------------- 2. min/max corners
if (params.length) {
  const n = params.length;
  let passed = 0;
  for (let mask = 0; mask < (1 << n); mask++) {
    const p = defaults();
    params.forEach((q, i) => { p[q.key] = (mask >> i) & 1 ? q.max : q.min; });
    const label = 'extremes {' + params.map(q => `${q.key}=${p[q.key]}`).join(', ') + '}';
    if (run(p, 10, label, false)) passed++;
    else break;                                          // first failure is enough to act on
  }
  if (passed === 1 << n) note(`all ${1 << n} min/max slider corners ran 10 s, finite${def.positions ? ' and in view' : ''}`);
}
if (!def.positions) warn('no positions(): cannot check the scene stays in view');

// ---------------------------------------------------------------- 3. page
if (pagePath) {
  const md = fs.readFileSync(pagePath, 'utf8');
  const fm = (md.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || '';
  const body = md.replace(/^---[\s\S]*?---\s*/, '');

  // GitHub Pages applies no layout by itself: without this line the page is bare HTML.
  if (!/^layout:\s*default\s*$/m.test(fm)) err('page: front matter must include "layout: default"');
  for (const k of ['title', 'parent', 'nav_order']) if (!new RegExp('^' + k + ':', 'm').test(fm)) err('page: front matter missing "' + k + ':"');
  // Pages live at <section>/<category>/<id>.md; Just the Docs needs grand_parent for the third level.
  const depth = path.resolve(pagePath).split(path.sep).length - path.resolve(corePath, '..', '..', '..').split(path.sep).length;
  if (depth >= 3 && !/^grand_parent:/m.test(fm)) err('page: front matter missing "grand_parent:" (page is inside a section folder)');
  const words = t => t.replace(/\$\$[\s\S]*?\$\$/g, 'X').replace(/[*_`>#-]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const lines = body.split('\n');

  const h1 = lines.findIndex(l => /^# /.test(l));
  if (h1 < 0) err('page: missing "# Title"');
  else {
    const concept = lines.slice(h1 + 1).find(l => l.trim());
    if (!concept || /^\{%|^\$\$|^\{:/.test(concept.trim())) err('page: missing one-sentence concept under the title');
    else if (words(concept) > 20) err(`page: concept is ${words(concept)} words (max 20)`);
  }

  const inc = body.match(/\{%\s*include\s+sim\.html\s+id="([^"]+)"\s*%\}/);
  if (!inc) err('page: missing {% include sim.html id="..." %}');
  else if (inc[1] !== def.id) err(`page: include id "${inc[1]}" ≠ sim id "${def.id}"`);

  const eqCount = lines.filter(l => /^\$\$.*\$\$\s*$/.test(l.trim())).length;
  if (eqCount !== 1) err(`page: expected exactly 1 display equation line, found ${eqCount}`);

  const limits = { note: [2, 3, 12], try: [1, 2, 15], assume: [1, 3, 12] };
  for (const [cls, [lo, hi, maxW]] of Object.entries(limits)) {
    const i = lines.findIndex(l => l.trim() === `{: .${cls} }`);
    if (i < 0) { err(`page: missing {: .${cls} } callout`); continue; }
    const items = [];
    for (let j = i + 1; j < lines.length && /^>/.test(lines[j]); j++) {
      if (/^>\s*-\s+/.test(lines[j])) items.push(lines[j].replace(/^>\s*-\s+/, ''));
    }
    if (items.length < lo || items.length > hi) err(`page: .${cls} has ${items.length} bullets (need ${lo}–${hi})`);
    items.forEach(t => { if (words(t) > maxW) err(`page: .${cls} bullet over ${maxW} words: "${t}"`); });
  }
  if (!errors.some(e => e.startsWith('page:'))) note('page: structure and word limits OK');
}

finish();
