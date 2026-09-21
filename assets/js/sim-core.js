/*!
 * sim-core.js — shared runtime for every simulation on this site.  API version 1.
 *
 * Sims never touch the DOM. They call SimCore.register(def) and supply pure
 * physics (init, step, measure) plus a draw function. This file owns:
 * layout, controls, resize + devicePixelRatio, the fixed-timestep loop,
 * pausing off-screen, reduced motion, pointer/touch drag, readouts and
 * drawing helpers.
 *
 * Changing the def contract? Bump API_VERSION, then update SKILL.md and every sim.
 */
(function (root) {
  'use strict';

  const API_VERSION = 1;
  const MAX_FRAME_DT = 0.1;         // s; longer gaps (tab switch, stall) are clamped
  const MAX_STEPS_PER_FRAME = 64;   // slow device → sim runs slower instead of going unstable
  const SPEEDS = [0.25, 0.5, 1, 2];
  const HIT_PX = { mouse: 16, pen: 16, touch: 28 };
  const FONT_PX = { sm: 12, md: 14, lg: 16 };
  const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const COLOR_NAMES = ['bg', 'fg', 'muted', 'grid', 'body', 'body-2', 'vector', 'vector-2',
    'trail', 'ke', 'pe', 'total', 'accent'];

  const defs = {};
  let uid = 0;

  // ---------------------------------------------------------------- validation
  // Also used headless by scripts/check_sim.js.
  function isRange(r) {
    return Array.isArray(r) && r.length === 2 && isFinite(r[0]) && isFinite(r[1]) && r[0] < r[1];
  }

  function validate(def) {
    const e = [];
    if (!def || typeof def !== 'object') return ['definition is not an object'];
    if (def.api !== API_VERSION) e.push(`api must be ${API_VERSION} (got ${def.api})`);
    if (!/^[a-z0-9-]+$/.test(def.id || '')) e.push('id must use lowercase letters, digits and hyphens');
    if (!def.title) e.push('title is required');
    if (!def.view || !isRange(def.view.x) || !isRange(def.view.y)) e.push('view.x and view.y must be [min, max] in meters');
    if (!(def.dt > 0 && def.dt <= 0.01)) e.push('dt must be in (0, 0.01] s');
    if (def.aspect != null && !(def.aspect >= 0.5 && def.aspect <= 2.5)) e.push('aspect must be between 0.5 and 2.5');
    ['init', 'step', 'draw'].forEach(f => { if (typeof def[f] !== 'function') e.push(`${f}() is required`); });

    const params = def.params == null ? [] : def.params;
    if (!Array.isArray(params)) e.push('params must be an array');
    else {
      if (params.length > 5) e.push(`at most 5 params (got ${params.length})`);
      const seen = new Set();
      params.forEach((q, i) => {
        const n = `params[${i}]`;
        if (!q.key) e.push(`${n}.key is required`);
        if (seen.has(q.key)) e.push(`${n}.key "${q.key}" is duplicated`);
        seen.add(q.key);
        if (!q.label) e.push(`${n}.label is required`);
        if (typeof q.unit !== 'string') e.push(`${n}.unit must be a string ("" if dimensionless)`);
        if (!(q.min < q.max)) e.push(`${n}: min must be < max`);
        if (!(q.step > 0)) e.push(`${n}.step must be > 0`);
        if (!(q.value >= q.min && q.value <= q.max)) e.push(`${n}.value must be within [min, max]`);
      });
    }

    const readouts = def.readouts == null ? [] : def.readouts;
    if (!Array.isArray(readouts)) e.push('readouts must be an array');
    else readouts.forEach((r, i) => {
      if (!r.key || !r.label) e.push(`readouts[${i}] needs key and label`);
      if (typeof r.unit !== 'string') e.push(`readouts[${i}].unit must be a string`);
    });

    if ((readouts.length || def.conserved) && typeof def.measure !== 'function') {
      e.push('measure() is required when readouts or conserved are set');
    }
    if (def.conserved != null && typeof def.conserved !== 'string') e.push('conserved must be a measure() key');
    if (def.positions != null && typeof def.positions !== 'function') e.push('positions must be a function');
    if (def.drag && (typeof def.drag.hit !== 'function' || typeof def.drag.move !== 'function')) {
      e.push('drag needs hit() and move()');
    }
    return e;
  }

  // ---------------------------------------------------------------- numerics
  // Classic RK4 for y' = f(t, y). y is an array; f must return a NEW array.
  // Use for damped, driven or otherwise non-conservative systems.
  function rk4(f, t, y, dt) {
    const n = y.length, h = dt / 2, tmp = new Array(n), out = new Array(n);
    const k1 = f(t, y);
    for (let i = 0; i < n; i++) tmp[i] = y[i] + h * k1[i];
    const k2 = f(t + h, tmp.slice());
    for (let i = 0; i < n; i++) tmp[i] = y[i] + h * k2[i];
    const k3 = f(t + h, tmp.slice());
    for (let i = 0; i < n; i++) tmp[i] = y[i] + dt * k3[i];
    const k4 = f(t + dt, tmp.slice());
    for (let i = 0; i < n; i++) out[i] = y[i] + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    return out;
  }

  // ---------------------------------------------------------------- view + drawing
  function makeView(def, w, h, colors) {
    const [x0, x1] = def.view.x, [y0, y1] = def.view.y;
    const s = Math.min(w / (x1 - x0), h / (y1 - y0));     // px per meter, aspect preserved
    const ox = (w - (x1 - x0) * s) / 2 - x0 * s;
    const oy = (h - (y1 - y0) * s) / 2 + y1 * s;
    return {
      w, h, scale: s, colors,
      toX: x => ox + x * s,
      toY: y => oy - y * s,                                  // y points up in world space
      fromX: px => (px - ox) / s,
      fromY: py => (oy - py) / s,
      font: (size = 'md') => `500 ${(FONT_PX[size] || FONT_PX.md) - (w < 420 ? 1 : 0)}px ${FONT_STACK}`
    };
  }

  function makeDraw(ctx, v) {
    const X = v.toX, Y = v.toY;
    const c = name => v.colors[name] || name;
    function pen(color, w) {
      ctx.strokeStyle = c(color); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    }
    return {
      // World coordinates in meters; widths and marker radii in CSS px.
      line(x1, y1, x2, y2, color = 'fg', w = 2) {
        pen(color, w); ctx.beginPath(); ctx.moveTo(X(x1), Y(y1)); ctx.lineTo(X(x2), Y(y2)); ctx.stroke();
      },
      polyline(pts, color = 'trail', w = 2) {
        if (!pts || pts.length < 2) return;
        pen(color, w); ctx.beginPath(); ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
        for (let i = 1; i < pts.length; i++) ctx.lineTo(X(pts[i][0]), Y(pts[i][1]));
        ctx.stroke();
      },
      dot(x, y, rPx = 6, color = 'body') {
        ctx.fillStyle = c(color); ctx.beginPath(); ctx.arc(X(x), Y(y), rPx, 0, 2 * Math.PI); ctx.fill();
      },
      circle(x, y, rM, color = 'body', fill = true, w = 2) {
        ctx.beginPath(); ctx.arc(X(x), Y(y), rM * v.scale, 0, 2 * Math.PI);
        if (fill) { ctx.fillStyle = c(color); ctx.fill(); } else { pen(color, w); ctx.stroke(); }
      },
      arrow(x, y, dx, dy, color = 'vector', label) {
        const ax = X(x), ay = Y(y), bx = X(x + dx), by = Y(y + dy);
        const len = Math.hypot(bx - ax, by - ay);
        if (len < 3) return;
        const ux = (bx - ax) / len, uy = (by - ay) / len, hd = Math.min(10, len * 0.4);
        pen(color, 2.5); ctx.beginPath(); ctx.moveTo(ax, ay);
        ctx.lineTo(bx - ux * hd * 0.8, by - uy * hd * 0.8); ctx.stroke();
        ctx.fillStyle = c(color); ctx.beginPath(); ctx.moveTo(bx, by);
        ctx.lineTo(bx - ux * hd - uy * hd * 0.5, by - uy * hd + ux * hd * 0.5);
        ctx.lineTo(bx - ux * hd + uy * hd * 0.5, by - uy * hd - ux * hd * 0.5);
        ctx.closePath(); ctx.fill();
        if (label) {
          ctx.font = v.font('sm'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(label, bx + ux * 12, by + uy * 12);
        }
      },
      text(x, y, str, color = 'fg', size = 'md', align = 'center') {
        ctx.font = v.font(size); ctx.fillStyle = c(color);
        ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(str, X(x), Y(y));
      },
      // Screen-space bars in the top-left corner. items: [{ value, color: 'ke'|'pe'|'total', label }]
      energyBars(items, max) {
        const barW = 14, gap = 16, H = Math.min(80, v.h * 0.3), left = 12, top = 12;
        const m = max > 0 ? max : Math.max(1e-12, ...items.map(i => Math.abs(i.value)));
        ctx.font = v.font('sm'); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        items.forEach((it, i) => {
          const x = left + i * (barW + gap);
          const h = Math.max(0, Math.min(1, it.value / m)) * H;
          ctx.strokeStyle = c('grid'); ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, top + 0.5, barW, H);
          ctx.fillStyle = c(it.color); ctx.fillRect(x + 0.5, top + 0.5 + H - h, barW, h);
          ctx.fillStyle = c('muted'); ctx.fillText(it.label, x + barW / 2, top + H + 4);
        });
      }
    };
  }

  // ---------------------------------------------------------------- helpers
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function button(text, cls) { const b = el('button', cls, text); b.type = 'button'; return b; }
  function decimals(step) {
    const s = String(step);
    return s.includes('e-') ? parseInt(s.split('e-')[1], 10) : (s.split('.')[1] || '').length;
  }
  function unitText(unit) { return !unit ? '' : (/^[°′″%]/.test(unit) ? unit : ' ' + unit); }
  function fmt(v, d = 2) {
    if (!isFinite(v)) return '—';
    return (Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v).toFixed(d);
  }
  function readColors(node) {
    const cs = getComputedStyle(node), out = {};
    COLOR_NAMES.forEach(n => { out[n.replace('-', '')] = cs.getPropertyValue('--sim-' + n).trim() || '#888'; });
    return out;
  }

  // ---------------------------------------------------------------- mount
  function mount(def, host) {
    const reduceMotion = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const params = def.params || [];
    const defaults = {};
    params.forEach(q => { defaults[q.key] = q.value; });

    let p = Object.assign({}, defaults);
    let state, view, drawer, colors, dpr = 1, failed = false;
    let running = false, dragging = false, looping = false;
    let onScreen = true, pageVisible = !document.hidden;
    let acc = 0, last = null, speed = 1, lastReadout = 0;

    host.classList.add('sim');
    host.textContent = '';

    // Stage
    const stage = el('div', 'sim-stage');
    stage.style.aspectRatio = String(def.aspect || 16 / 9);
    const canvas = el('canvas', 'sim-canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', def.title);
    stage.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Control bar (same for every sim)
    const bar = el('div', 'sim-bar');
    const playBtn = button('Play', 'btn btn-primary sim-play');
    const resetBtn = button('Reset', 'btn sim-reset');
    const speedWrap = el('label', 'sim-speed');
    speedWrap.append('Speed ');
    const speedSel = el('select');
    SPEEDS.forEach(s => {
      const o = el('option', null, s + '×'); o.value = String(s); if (s === 1) o.selected = true;
      speedSel.appendChild(o);
    });
    speedWrap.appendChild(speedSel);
    bar.append(playBtn, resetBtn, speedWrap);

    // Readouts
    const readoutBox = el('div', 'sim-readouts');
    const readoutEls = {};
    (def.readouts || []).forEach(r => {
      const item = el('div', 'sim-readout');
      if (r.color) item.style.borderLeftColor = `var(--sim-${r.color.replace(/(\d)$/, '-$1')})`;
      const val = el('span', 'sim-readout-value', '—');
      item.append(el('span', 'sim-readout-label', r.label), val);
      readoutBox.appendChild(item);
      readoutEls[r.key] = val;
    });

    // Parameter sliders
    const controls = el('div', 'sim-controls');
    const inputs = {};
    params.forEach(q => {
      const id = `sim-${def.id}-${q.key}-${uid++}`;
      const wrap = el('div', 'sim-param');
      const lab = el('label', 'sim-param-label');
      lab.htmlFor = id;
      const name = el('span', 'sim-param-name', q.label);
      if (q.symbol) name.append(' ', el('span', 'sim-param-symbol', q.symbol));
      const out = el('span', 'sim-param-value');
      lab.append(name, out);
      const input = el('input');
      Object.assign(input, { type: 'range', id, min: q.min, max: q.max, step: q.step, value: q.value });
      const digits = decimals(q.step);
      const show = () => { out.textContent = Number(p[q.key]).toFixed(digits) + unitText(q.unit); };
      input.addEventListener('input', () => {
        p[q.key] = parseFloat(input.value);
        show();
        if (q.resets) restart(); else refresh();
      });
      inputs[q.key] = { input, show };
      show();
      wrap.append(lab, input);
      controls.appendChild(wrap);
    });

    host.append(stage, bar);
    if (readoutBox.childElementCount) host.appendChild(readoutBox);
    if (params.length) host.appendChild(controls);

    // ---- behavior
    function fail(err) {
      if (failed) return;
      failed = true; running = false;
      console.error(`[SimCore:${def.id}]`, err);
      host.appendChild(el('p', 'sim-error', `This simulation stopped because of an error: ${err && err.message}`));
      playBtn.disabled = true;
    }
    function render() {
      if (!view || failed) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, view.w, view.h);
      try { def.draw(ctx, state, p, view, drawer); } catch (err) { fail(err); }
    }
    function updateReadouts() {
      if (!def.measure || !def.readouts || failed) return;
      try {
        const m = def.measure(state, p);
        def.readouts.forEach(r => { readoutEls[r.key].textContent = fmt(m[r.key], r.digits) + unitText(r.unit); });
      } catch (err) { fail(err); }
    }
    function refresh() { render(); updateReadouts(); }
    function restart() {
      try { state = def.init(p); } catch (err) { fail(err); return; }
      acc = 0; refresh();
    }
    function resetAll() {
      p = Object.assign({}, defaults);
      params.forEach(q => { inputs[q.key].input.value = p[q.key]; inputs[q.key].show(); });
      restart();
    }
    function setRunning(on) {
      running = on && !failed;
      playBtn.textContent = running ? 'Pause' : 'Play';
      playBtn.setAttribute('aria-pressed', String(running));
      if (!running) updateReadouts();
      kick();
    }

    // ---- loop: fixed physics dt, decoupled from frame rate
    function active() { return onScreen && pageVisible && !failed; }
    function kick() {
      if (!looping && active() && (running || dragging)) {
        looping = true; last = null; requestAnimationFrame(frame);
      }
    }
    function frame(t) {
      if (!active() || !(running || dragging)) { looping = false; return; }
      const fdt = last == null ? 0 : Math.min((t - last) / 1000, MAX_FRAME_DT);
      last = t;
      if (running && !dragging) {
        acc += fdt * speed;
        let n = 0;
        try {
          while (acc >= def.dt && n < MAX_STEPS_PER_FRAME) { def.step(state, p, def.dt); acc -= def.dt; n++; }
        } catch (err) { fail(err); looping = false; return; }
        if (n === MAX_STEPS_PER_FRAME) acc = 0;
      }
      render();
      if (t - lastReadout > 100) { updateReadouts(); lastReadout = t; }
      requestAnimationFrame(frame);
    }

    // ---- sizing: CSS sets the box, we match the backing store to DPR
    function resize() {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      dpr = root.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      colors = readColors(host);
      view = makeView(def, w, h, colors);
      drawer = makeDraw(ctx, view);
      render();                                   // state is untouched on resize
    }

    // ---- drag (optional per sim)
    if (def.drag) {
      const toWorld = (cx, cy) => {
        const r = canvas.getBoundingClientRect();
        return { x: view.fromX(cx - r.left), y: view.fromY(cy - r.top) };
      };
      const tol = type => (HIT_PX[type] || HIT_PX.mouse) / view.scale;
      const hits = (q, type) => { try { return def.drag.hit(state, p, q.x, q.y, tol(type)); } catch (e) { return false; } };

      // Block page scroll only when the touch starts on a draggable object.
      canvas.addEventListener('touchstart', e => {
        if (!view) return;
        const t = e.touches[0];
        if (hits(toWorld(t.clientX, t.clientY), 'touch')) e.preventDefault();
      }, { passive: false });

      canvas.addEventListener('pointerdown', e => {
        if (!view || failed) return;
        const q = toWorld(e.clientX, e.clientY);
        if (!hits(q, e.pointerType)) return;
        dragging = true;
        canvas.setPointerCapture(e.pointerId);
        canvas.classList.add('is-dragging');
        def.drag.move(state, p, q.x, q.y);
        refresh(); kick();
      });
      canvas.addEventListener('pointermove', e => {
        if (!view) return;
        const q = toWorld(e.clientX, e.clientY);
        if (dragging) { def.drag.move(state, p, q.x, q.y); if (!looping) refresh(); }
        else if (e.pointerType === 'mouse') canvas.classList.toggle('can-drag', hits(q, 'mouse'));
      });
      const end = () => {
        if (!dragging) return;
        dragging = false;
        canvas.classList.remove('is-dragging');
        if (def.drag.end) def.drag.end(state, p);
        refresh();
      };
      canvas.addEventListener('pointerup', end);
      canvas.addEventListener('pointercancel', end);
    }

    // ---- wiring
    playBtn.addEventListener('click', () => setRunning(!running));
    resetBtn.addEventListener('click', resetAll);
    speedSel.addEventListener('change', () => { speed = parseFloat(speedSel.value); });

    new ResizeObserver(resize).observe(stage);
    root.addEventListener('resize', resize);      // catches DPR changes between monitors
    if (root.matchMedia) {
      const mq = root.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', resize);
    }
    if ('IntersectionObserver' in root) {
      new IntersectionObserver(es => { onScreen = es[es.length - 1].isIntersecting; kick(); }).observe(host);
    }
    document.addEventListener('visibilitychange', () => { pageVisible = !document.hidden; kick(); });

    restart();
    resize();
    setRunning(!reduceMotion && def.autoplay !== false);
  }

  // ---------------------------------------------------------------- register
  function register(def) {
    const id = def && def.id ? def.id : '(missing id)';
    defs[id] = def;
    const errs = validate(def);
    if (typeof document === 'undefined') return;             // headless: checker reads _defs
    const hosts = () => document.querySelectorAll(`[data-sim="${id}"]`);
    const go = () => hosts().forEach(h => {
      if (errs.length) {
        console.error(`[SimCore:${id}] invalid definition:\n- ${errs.join('\n- ')}`);
        h.appendChild(el('p', 'sim-error', 'This simulation could not load (invalid definition).'));
      } else {
        mount(def, h);
      }
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else go();
  }

  root.SimCore = { API_VERSION, register, validate, rk4, _defs: defs };
})(typeof window !== 'undefined' ? window : globalThis);
