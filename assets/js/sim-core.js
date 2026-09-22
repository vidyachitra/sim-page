/*!
 * sim-core.js — shared runtime for every simulation on this site.  API version 1.
 *
 * Sims never touch the DOM. They call SimCore.register(def) and supply pure
 * physics (init, step, measure) plus a draw function. This file owns:
 * layout, controls, resize + devicePixelRatio, the fixed-timestep loop,
 * pausing off-screen, reduced motion, pointer/touch drag, readouts, time
 * graphs and drawing helpers.
 *
 * Changing the def contract? Bump API_VERSION, then update SKILL.md and every sim.
 */
(function (root) {
  'use strict';

  const API_VERSION = 1;
  const MAX_FRAME_DT = 0.1;         // s; longer gaps (tab switch, stall) are clamped
  const MAX_STEPS_PER_FRAME = 64;   // slow device → sim runs slower instead of going unstable
  const SPEEDS = [0.25, 0.5, 1, 2];
  const GRAPH_WINDOW = 10;          // s of history shown by default
  const GRAPH_POINTS = 300;         // samples across the window (≈ one per 2 px at typical widths)
  const GRAPH_MAX = 4;              // graphs per sim; more pushes the controls off phone screens
  const HIT_PX = { mouse: 16, pen: 16, touch: 28 };
  const FONT_PX = { sm: 12, md: 14, lg: 16 };
  const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const COLOR_NAMES = ['bg', 'fg', 'muted', 'grid', 'body', 'body-2', 'vector', 'vector-2',
    'trail', 'ke', 'pe', 'total', 'accent', 'current', 'voltage'];
  // Site language: Bahasa Indonesia. Every user-facing string of the runtime lives here.
  const UI = {
    play: 'Jalankan', pause: 'Jeda', reset: 'Ulang', speed: 'Kecepatan',
    vsTime: 'terhadap waktu', timeAxis: 't (s)',
    stopped: 'Simulasi berhenti karena galat:',
    invalid: 'Simulasi tidak dapat dimuat (definisi tidak valid).'
  };

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
    const ts = def.timeScale == null ? 1 : def.timeScale;
    if (!(ts > 0 && ts <= 1)) e.push('timeScale must be in (0, 1] (sim seconds per real second)');
    if (!(def.dt > 0 && def.dt <= 0.01 * ts)) e.push(`dt must be in (0, ${0.01 * ts}] s (≤ 0.01 × timeScale)`);
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

    const graphs = def.graphs == null ? [] : def.graphs;
    if (!Array.isArray(graphs)) e.push('graphs must be an array');
    else {
      if (graphs.length > GRAPH_MAX) e.push(`at most ${GRAPH_MAX} graphs (got ${graphs.length})`);
      graphs.forEach((g, i) => {
        const n = `graphs[${i}]`;
        if (!g.title) e.push(`${n}.title is required`);
        if (typeof g.unit !== 'string') e.push(`${n}.unit must be a string ("" if dimensionless)`);
        if (g.window != null && !(g.window > 0 && g.window <= 120 * ts)) e.push(`${n}.window must be in (0, ${120 * ts}] s of sim time`);
        if (g.min != null && !isFinite(g.min)) e.push(`${n}.min must be a number`);
        if (g.max != null && !isFinite(g.max)) e.push(`${n}.max must be a number`);
        if (g.min != null && g.max != null && !(g.min < g.max)) e.push(`${n}: min must be < max`);
        if (!Array.isArray(g.series) || !g.series.length || g.series.length > 4) e.push(`${n}.series must hold 1–4 entries`);
        else g.series.forEach((s, j) => { if (!s.key || !s.label) e.push(`${n}.series[${j}] needs key and label`); });
      });
    }

    if ((readouts.length || graphs.length || def.conserved) && typeof def.measure !== 'function') {
      e.push('measure() is required when readouts, graphs or conserved are set');
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

  // ---------------------------------------------------------------- rich text
  // Labels may carry subscripts: "V_th", "m_g g" (run of letters/digits after "_") or "f_{s,maks}".
  function richSegments(str) {
    const segs = [], re = /_\{([^}]*)\}|_([A-Za-z0-9′+\-−]+)/g;
    let last = 0, m;
    while ((m = re.exec(str))) {
      if (m.index > last) segs.push({ t: str.slice(last, m.index), sub: false });
      segs.push({ t: m[1] != null ? m[1] : m[2], sub: true });
      last = re.lastIndex;
    }
    if (last < str.length) segs.push({ t: str.slice(last), sub: false });
    return segs;
  }
  // Draws str at (x, y) with the current font/baseline, subscripts at 72 % size and lowered.
  // Returns the total width; with measureOnly nothing is drawn.
  function richText(ctx, str, x, y, align = 'left', measureOnly = false) {
    const segs = richSegments(String(str));
    if (segs.length === 1 && !segs[0].sub) {
      if (!measureOnly) { ctx.textAlign = align; ctx.fillText(str, x, y); }
      return ctx.measureText(str).width;
    }
    const font = ctx.font, px = parseFloat((font.match(/(\d+(?:\.\d+)?)px/) || [0, 12])[1]);
    const subFont = font.replace(/(\d+(?:\.\d+)?)px/, (px * 0.72).toFixed(1) + 'px');
    const widths = segs.map(g => { ctx.font = g.sub ? subFont : font; return ctx.measureText(g.t).width; });
    const total = widths.reduce((a, b) => a + b, 0);
    if (!measureOnly) {
      let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
      ctx.textAlign = 'left';
      segs.forEach((g, i) => { ctx.font = g.sub ? subFont : font; ctx.fillText(g.t, cx, y + (g.sub ? px * 0.28 : 0)); cx += widths[i]; });
      ctx.textAlign = align;
    }
    ctx.font = font;
    return total;
  }
  // Same for DOM: returns a span with <sub> children.
  function richEl(tag, cls, str) {
    const e = el(tag, cls);
    richSegments(String(str)).forEach(g => e.appendChild(g.sub ? el('sub', null, g.t) : document.createTextNode(g.t)));
    return e;
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
      // Filled polygon from world points; add an outline color to stroke it too.
      polygon(pts, color = 'body', outline = null, w = 1.5) {
        if (!pts || pts.length < 3) return;
        ctx.beginPath(); ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
        for (let i = 1; i < pts.length; i++) ctx.lineTo(X(pts[i][0]), Y(pts[i][1]));
        ctx.closePath(); ctx.fillStyle = c(color); ctx.fill();
        if (outline) { pen(outline, w); ctx.stroke(); }
      },
      // Axis-aligned box: (x, y) is the bottom-left corner, w and h in meters.
      rect(x, y, wM, hM, color = 'body', outline = null) {
        this.polygon([[x, y], [x + wM, y], [x + wM, y + hM], [x, y + hM]], color, outline);
      },
      // Coil spring between two world points; n coils, width in meters.
      spring(x1, y1, x2, y2, n = 10, width = 0.05, color = 'fg', w = 2) {
        const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
        if (len < 1e-9) return;
        const ux = dx / len, uy = dy / len, px = -uy, py = ux;
        const lead = Math.min(len * 0.1, 0.03), coil = len - 2 * lead;
        const pts = [[x1, y1], [x1 + ux * lead, y1 + uy * lead]];
        for (let i = 0; i < 2 * n; i++) {
          const s = lead + coil * (i + 0.5) / (2 * n), side = (i % 2 ? -1 : 1) * width / 2;
          pts.push([x1 + ux * s + px * side, y1 + uy * s + py * side]);
        }
        pts.push([x2 - ux * lead, y2 - uy * lead], [x2, y2]);
        this.polyline(pts, color, w);
      },
      // ---- Schematic symbols. Each is drawn centred on the segment (x1,y1)→(x2,y2) with straight
      // leads to both ends, so a circuit is a list of segments between node coordinates.
      // Label goes beside the symbol, on the normal's positive side (flip with side = -1).
      _sym(x1, y1, x2, y2, len) {
        const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-9;
        const ux = dx / L, uy = dy / L, half = Math.min(len, L) / 2, mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        return { ux, uy, px: -uy, py: ux, mx, my, ax: mx - ux * half, ay: my - uy * half, bx: mx + ux * half, by: my + uy * half };
      },
      _leads(x1, y1, x2, y2, g, color = 'fg') {
        this.line(x1, y1, g.ax, g.ay, color, 2); this.line(g.bx, g.by, x2, y2, color, 2);
      },
      _label(g, str, side = 1, off = 0.1, color = 'muted') {
        if (!str) return;
        // side = +1 puts the label right of a vertical component / above a horizontal one; −1 left / below,
        // whichever way the segment was drawn. Beside a vertical component the text is left/right aligned.
        const horizontal = Math.abs(g.px) > Math.abs(g.py);           // normal is horizontal → component vertical
        const flip = horizontal ? g.px < 0 : g.py < 0;
        const nx = flip ? -g.px : g.px, ny = flip ? -g.py : g.py;
        const align = !horizontal ? 'center' : (side > 0 ? 'left' : 'right');
        const o = horizontal ? off * 0.8 : off;
        this.text(g.mx + nx * o * side, g.my + ny * o * side, str, color, 'sm', align);
      },
      wire(pts, color = 'fg', w = 2) { this.polyline(pts, color, w); },
      node(x, y) { this.dot(x, y, 3.5, 'fg'); },
      ground(x, y, size = 0.06) {
        this.line(x, y, x, y - size * 0.6, 'fg', 2);
        [1, 0.62, 0.25].forEach((f, i) => this.line(x - size * f, y - size * (0.6 + i * 0.25), x + size * f, y - size * (0.6 + i * 0.25), 'fg', 2));
      },
      resistor(x1, y1, x2, y2, label, side = 1, color = 'fg') {
        const g = this._sym(x1, y1, x2, y2, 0.22), amp = 0.035, n = 6;
        const pts = [[g.ax, g.ay]];
        for (let i = 0; i < n; i++) {
          const s = (i + 0.5) / n, k = i % 2 ? -1 : 1;
          pts.push([g.ax + (g.bx - g.ax) * s + g.px * amp * k, g.ay + (g.by - g.ay) * s + g.py * amp * k]);
        }
        pts.push([g.bx, g.by]);
        this.polyline(pts, color, 2); this._leads(x1, y1, x2, y2, g); this._label(g, label, side);
      },
      capacitor(x1, y1, x2, y2, label, side = 1, color = 'fg') {
        const g = this._sym(x1, y1, x2, y2, 0.05), w = 0.07;
        this.line(g.ax + g.px * w, g.ay + g.py * w, g.ax - g.px * w, g.ay - g.py * w, color, 2.5);
        this.line(g.bx + g.px * w, g.by + g.py * w, g.bx - g.px * w, g.by - g.py * w, color, 2.5);
        this._leads(x1, y1, x2, y2, g); this._label(g, label, side, 0.12);
      },
      inductor(x1, y1, x2, y2, label, side = 1, color = 'fg') {
        const g = this._sym(x1, y1, x2, y2, 0.24), n = 4, r = 0.03, pts = [];
        for (let i = 0; i < n; i++) for (let k = 0; k <= 8; k++) {
          const a = Math.PI - Math.PI * k / 8, s = (i + 0.5 + Math.cos(a) * 0.5) / n;
          pts.push([g.ax + (g.bx - g.ax) * s + g.px * r * Math.sin(a), g.ay + (g.by - g.ay) * s + g.py * r * Math.sin(a)]);
        }
        this.polyline(pts, color, 2); this._leads(x1, y1, x2, y2, g); this._label(g, label, side, 0.09);
      },
      // DC or AC source; the + terminal is at (x2, y2).
      source(x1, y1, x2, y2, label, ac = false, side = 1) {
        const g = this._sym(x1, y1, x2, y2, 0.16), r = 0.08;
        this.circle(g.mx, g.my, r, 'bg'); this.circle(g.mx, g.my, r, 'fg', false, 2);
        if (ac) {
          const pts = [];
          for (let k = 0; k <= 16; k++) { const s = k / 16 - 0.5; pts.push([g.mx + g.ux * s * 0.1 + g.px * Math.sin(k / 16 * 2 * Math.PI) * 0.03, g.my + g.uy * s * 0.1 + g.py * Math.sin(k / 16 * 2 * Math.PI) * 0.03]); }
          this.polyline(pts, 'fg', 1.5);
        } else {
          this.text(g.mx + g.ux * 0.035, g.my + g.uy * 0.035, '+', 'fg', 'sm');
          this.text(g.mx - g.ux * 0.035, g.my - g.uy * 0.035, '−', 'fg', 'sm');
        }
        this._leads(x1, y1, x2, y2, g); this._label(g, label, side, 0.14);
      },
      // Diode conducting from (x1,y1) to (x2,y2).
      diode(x1, y1, x2, y2, label, side = 1, on = false) {
        const g = this._sym(x1, y1, x2, y2, 0.1), w = 0.05;
        this.polygon([[g.ax + g.px * w, g.ay + g.py * w], [g.ax - g.px * w, g.ay - g.py * w], [g.bx, g.by]], on ? 'current' : 'bg', 'fg');
        this.line(g.bx + g.px * w, g.by + g.py * w, g.bx - g.px * w, g.by - g.py * w, 'fg', 2.5);
        this._leads(x1, y1, x2, y2, g); this._label(g, label, side, 0.09);
      },
      switch(x1, y1, x2, y2, closed, label, side = 1) {
        const g = this._sym(x1, y1, x2, y2, 0.14);
        this.dot(g.ax, g.ay, 3, 'fg'); this.dot(g.bx, g.by, 3, 'fg');
        const len = Math.hypot(g.bx - g.ax, g.by - g.ay), ang = closed ? 0 : 0.6;
        const ex = g.ax + (g.ux * Math.cos(ang) + g.px * Math.sin(ang)) * len, ey = g.ay + (g.uy * Math.cos(ang) + g.py * Math.sin(ang)) * len;
        this.line(g.ax, g.ay, ex, ey, 'fg', 2);
        this._leads(x1, y1, x2, y2, g); this._label(g, label, side, 0.1);
      },
      // Op-amp triangle centred at (x, y) pointing +x. Returns terminal coordinates.
      opamp(x, y, w = 0.32, h = 0.3) {
        const inM = [x - w / 2, y + h / 4], inP = [x - w / 2, y - h / 4], out = [x + w / 2, y];
        this.polygon([[x - w / 2, y - h / 2], [x - w / 2, y + h / 2], out], 'bg', 'fg');
        this.text(x - w / 2 + 0.04, inM[1], '−', 'fg', 'sm'); this.text(x - w / 2 + 0.04, inP[1], '+', 'fg', 'sm');
        return { inM, inP, out };
      },
      // Charge dots along a path; offset in metres shifts them (advance it by ∝ current each step).
      flow(pts, offset, color = 'current', spacing = 0.09, rPx = 3) {
        if (!pts || pts.length < 2) return;
        const segs = [];
        let total = 0;
        for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); total += l; }
        if (total < 1e-9) return;
        let s = ((offset % spacing) + spacing) % spacing;
        for (; s < total; s += spacing) {
          let acc = 0, i = 0;
          while (i < segs.length - 1 && acc + segs[i] < s) { acc += segs[i]; i++; }
          const f = (s - acc) / (segs[i] || 1);
          this.dot(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f, rPx, color);
        }
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
          richText(ctx, label, bx + ux * 12, by + uy * 12, 'center');
        }
      },
      text(x, y, str, color = 'fg', size = 'md', align = 'center') {
        ctx.font = v.font(size); ctx.fillStyle = c(color);
        ctx.textBaseline = 'middle'; richText(ctx, str, X(x), Y(y), align);
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
          ctx.fillStyle = c('muted'); richText(ctx, it.label, x + barW / 2, top + H + 4, 'center');
        });
      }
    };
  }

  // ---------------------------------------------------------------- graphs
  // A graph is a scrolling strip chart of measure() keys against sim time.
  // Samples live in a ring buffer; the y range only grows (reset with the sim)
  // so the axis does not jitter while the sim runs.
  function niceStep(range, ticks) {
    const raw = range / Math.max(1, ticks), mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const r = raw / mag;
    return (r < 1.5 ? 1 : r < 3.5 ? 2 : r < 7.5 ? 5 : 10) * mag;
  }
  function tickDigits(step) { return Math.max(0, -Math.floor(Math.log10(step) + 1e-9)); }

  function makeGraph(g, sampleDt) {
    const cap = Math.max(2, Math.round((g.window || GRAPH_WINDOW) / sampleDt));
    return {
      def: g, window: g.window || GRAPH_WINDOW, cap,
      t: new Float64Array(cap), y: g.series.map(() => new Float64Array(cap)),
      head: 0, n: 0, lo: Infinity, hi: -Infinity,
      canvas: null, ctx: null, w: 0, h: 0
    };
  }
  function graphClear(G) { G.head = 0; G.n = 0; G.lo = Infinity; G.hi = -Infinity; }
  function graphPush(G, t, m) {
    const i = G.head;
    G.t[i] = t;
    G.def.series.forEach((s, k) => {
      const v = Number(m[s.key]);
      G.y[k][i] = v;
      if (isFinite(v)) { if (v < G.lo) G.lo = v; if (v > G.hi) G.hi = v; }
    });
    G.head = (i + 1) % G.cap;
    if (G.n < G.cap) G.n++;
  }

  function graphRender(G, colors, dpr, fontFor) {
    const ctx = G.ctx, w = G.w, h = G.h;
    if (!ctx || !w || !h) return;
    const c = name => colors[name] || name;
    const g = G.def;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = colors.bg; ctx.fillRect(0, 0, w, h);

    // y range: fixed bounds win, otherwise the data's running extent padded to nice ticks
    let lo = g.min != null ? g.min : G.lo, hi = g.max != null ? g.max : G.hi;
    if (!isFinite(lo) || !isFinite(hi)) { lo = g.min != null ? g.min : -1; hi = g.max != null ? g.max : 1; }
    if (hi - lo < 1e-9) { const pad = Math.max(1e-6, Math.abs(hi) * 0.1, 0.5); lo -= pad; hi += pad; }
    const ystep = niceStep(hi - lo, 4);
    const snap = 1e-3;                                   // ignore sub-pixel overshoot past a tick
    if (g.min == null) lo = Math.floor(lo / ystep + snap) * ystep;
    if (g.max == null) hi = Math.ceil(hi / ystep - snap) * ystep;
    const yd = tickDigits(ystep);

    // x range: the last `window` seconds, growing from 0 until the window fills.
    // Axis labels use s, ms, µs or ns depending on the window length.
    const tNow = G.n ? G.t[(G.head - 1 + G.cap) % G.cap] : 0;
    const x1 = Math.max(G.window, tNow), x0 = x1 - G.window;
    const tu = G.window >= 1 ? ['s', 1] : G.window >= 1e-3 ? ['ms', 1e3] : G.window >= 1e-6 ? ['µs', 1e6] : ['ns', 1e9];
    const xstep = niceStep(G.window * tu[1], 5) / tu[1];

    ctx.font = fontFor('sm');
    const yLabelW = Math.max(ctx.measureText(hi.toFixed(yd)).width, ctx.measureText(lo.toFixed(yd)).width);
    const L = Math.ceil(yLabelW) + 10, R = 8, T = 24, B = 18;
    const pw = w - L - R, ph = h - T - B;
    if (pw < 40 || ph < 30) return;
    const X = t => L + (t - x0) / (x1 - x0) * pw;
    const Y = v => T + (hi - v) / (hi - lo) * ph;

    // grid + tick labels
    ctx.lineWidth = 1; ctx.strokeStyle = c('grid'); ctx.fillStyle = c('muted');
    ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
    for (let v = lo; v <= hi + ystep * 1e-6; v += ystep) {
      const y = Math.round(Y(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + pw, y); ctx.stroke();
      ctx.fillText(v.toFixed(yd), L - 4, y);
    }
    ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    const xd = tickDigits(xstep * tu[1]);
    for (let t = Math.ceil(x0 / xstep - 1e-9) * xstep; t <= x1 + xstep * 1e-6; t += xstep) {
      const x = Math.round(X(t)) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, T + ph); ctx.stroke();
      ctx.fillText((t * tu[1]).toFixed(xd), x, T + ph + 4);
    }
    ctx.textAlign = 'right'; ctx.fillText(`t (${tu[0]})`, L + pw, T + ph + 4);
    if (lo < 0 && hi > 0) {                              // zero line
      const y = Math.round(Y(0)) + 0.5;
      ctx.strokeStyle = c('muted'); ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + pw, y); ctx.stroke();
    }
    ctx.strokeStyle = c('muted');
    ctx.strokeRect(L + 0.5, T + 0.5, pw, ph);

    // title + legend with the latest value of each series
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.font = fontFor('sm');
    ctx.fillStyle = c('fg');
    const title = g.title + (g.unit ? ` (${g.unit})` : '');
    let lx = L + richText(ctx, title, L, T / 2, 'left') + 14;
    const last = G.n ? (G.head - 1 + G.cap) % G.cap : -1;
    g.series.forEach((s, k) => {
      const v = last < 0 ? NaN : G.y[k][last];
      const txt = s.label + ' ' + (isFinite(v) ? v.toFixed(s.digits == null ? 2 : s.digits) : '—');
      const tw = richText(ctx, txt, 0, 0, 'left', true);
      if (lx + 10 + tw > w - R) return;                    // legend does not fit: skip the rest
      ctx.fillStyle = c(s.color || 'body'); ctx.fillRect(lx, T / 2 - 1.5, 8, 3);
      ctx.fillStyle = c('muted'); richText(ctx, txt, lx + 11, T / 2, 'left');
      lx += 11 + tw + 12;
    });

    // series
    if (G.n < 2) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(L, T, pw, ph); ctx.clip();
    ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    g.series.forEach((s, k) => {
      ctx.strokeStyle = c(s.color || 'body');
      ctx.beginPath();
      let pen = false;
      for (let j = 0; j < G.n; j++) {
        const i = (G.head - G.n + j + G.cap) % G.cap;
        const v = G.y[k][i];
        if (!isFinite(v) || G.t[i] < x0) { pen = false; continue; }
        const x = X(G.t[i]), y = Y(v);
        if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
      }
      ctx.stroke();
    });
    ctx.restore();
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
    let simT = 0, lastSample = -Infinity;             // sim-time clock for the graphs

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
    const playBtn = button(UI.play, 'btn btn-primary sim-play');
    const resetBtn = button(UI.reset, 'btn sim-reset');
    const speedWrap = el('label', 'sim-speed');
    speedWrap.append(UI.speed + ' ');
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
      item.append(richEl('span', 'sim-readout-label', r.label), val);
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
      if (q.symbol) name.append(' ', richEl('span', 'sim-param-symbol', q.symbol));
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

    // Time graphs (optional per sim). One canvas each; all share the sim-time clock.
    const tScale = def.timeScale || 1;               // sim seconds per real second (slow motion < 1)
    const graphDefs = (def.graphs || []).map(g => Object.assign({ window: GRAPH_WINDOW * tScale }, g));
    const sampleDt = graphDefs.length
      ? Math.min(...graphDefs.map(g => g.window / GRAPH_POINTS)) : Infinity;
    const graphBox = el('div', 'sim-graphs');
    const graphs = graphDefs.map(g => {
      const G = makeGraph(g, sampleDt);
      const fig = el('figure', 'sim-graph');
      G.canvas = el('canvas');
      G.canvas.setAttribute('role', 'img');
      G.canvas.setAttribute('aria-label', `${g.title} ${UI.vsTime}`);
      G.ctx = G.canvas.getContext('2d');
      fig.appendChild(G.canvas);
      graphBox.appendChild(fig);
      G.fig = fig;
      return G;
    });

    // Layout: canvas + bar + readouts, then sliders, then graphs. On wide hosts CSS
    // moves the graphs beside the canvas so both fit on one screen.
    const layout = el('div', 'sim-layout' + (graphs.length ? ' has-graphs' : ''));
    const main = el('div', 'sim-main');
    main.append(stage, bar);
    if (readoutBox.childElementCount) main.appendChild(readoutBox);
    layout.appendChild(main);
    if (params.length) layout.appendChild(controls);
    if (graphs.length) layout.appendChild(graphBox);
    host.appendChild(layout);

    // ---- behavior
    function fail(err) {
      if (failed) return;
      failed = true; running = false;
      console.error(`[SimCore:${def.id}]`, err);
      host.appendChild(el('p', 'sim-error', `${UI.stopped} ${err && err.message}`));
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
    function renderGraphs() {
      if (!colors || failed) return;
      graphs.forEach(G => graphRender(G, colors, G.dpr || dpr, view ? view.font : () => `500 12px ${FONT_STACK}`));
    }
    // Record one graph sample per sampleDt of sim time. `force` restarts history at t = 0.
    function sample(force) {
      if (!graphs.length || failed) return;
      if (force) { simT = 0; lastSample = -Infinity; graphs.forEach(graphClear); }
      if (simT - lastSample < sampleDt * (1 - 1e-9)) return;
      try {
        const m = def.measure(state, p);
        graphs.forEach(G => graphPush(G, simT, m));
      } catch (err) { fail(err); return; }
      lastSample = simT;
    }
    function refresh() { render(); updateReadouts(); renderGraphs(); }
    function restart() {
      try { state = def.init(p); } catch (err) { fail(err); return; }
      acc = 0; sample(true); refresh();
    }
    function resetAll() {
      p = Object.assign({}, defaults);
      params.forEach(q => { inputs[q.key].input.value = p[q.key]; inputs[q.key].show(); });
      restart();
    }
    function setRunning(on) {
      running = on && !failed;
      playBtn.textContent = running ? UI.pause : UI.play;
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
        acc += fdt * speed * tScale;
        let n = 0;
        try {
          while (acc >= def.dt && n < MAX_STEPS_PER_FRAME) {
            def.step(state, p, def.dt); acc -= def.dt; n++;
            simT += def.dt; sample(false);
          }
        } catch (err) { fail(err); looping = false; return; }
        if (n === MAX_STEPS_PER_FRAME) acc = 0;
      }
      render();
      renderGraphs();
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
    function resizeGraph(G) {
      const w = G.fig.clientWidth, h = G.fig.clientHeight;
      if (!w || !h) return;
      const r = root.devicePixelRatio || 1;
      G.w = w; G.h = h; G.dpr = r;
      G.canvas.width = Math.round(w * r);
      G.canvas.height = Math.round(h * r);
      if (colors) graphRender(G, colors, r, view ? view.font : () => `500 12px ${FONT_STACK}`);
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
        acc = 0; graphs.forEach(graphClear);      // grabbing sets new initial conditions
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
        sample(true);                             // history restarts from the release point
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
    graphs.forEach(G => new ResizeObserver(() => resizeGraph(G)).observe(G.fig));
    root.addEventListener('resize', resize);      // catches DPR changes between monitors
    root.addEventListener('resize', () => graphs.forEach(resizeGraph));
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
    graphs.forEach(resizeGraph);
    setRunning(!reduceMotion && def.autoplay === true);   // default: wait for Jalankan
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
        h.appendChild(el('p', 'sim-error', UI.invalid));
      } else {
        mount(def, h);
      }
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else go();
  }

  root.SimCore = {
    API_VERSION, register, validate, rk4, _defs: defs,
    _graph: { make: makeGraph, push: graphPush, clear: graphClear, render: graphRender }   // headless tests
  };
})(typeof window !== 'undefined' ? window : globalThis);
