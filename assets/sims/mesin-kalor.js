/* Siklus mesin kalor: Carnot, Otto, pendingin Carnot (Kalor dan Termodinamika)
 * Asumsi model:
 *  - Gas ideal 1 mol, R = 8,314 J/(mol·K). P dalam kPa, V dalam L, jadi kPa·L = J.
 *  - Carnot dan pendingin Carnot: gas monoatomik (γ = 5/3). Isotermal T_H memuai 3×; keadaan terdingin
 *    (akhir adiabat) pada 100 kPa. Pendingin = siklus Carnot yang sama ditempuh terbalik.
 *  - Otto: udara γ = 1,4 (C_V = 5R/2). Masuk (keadaan 1) pada T_C dan 100 kPa; kompresi adiabatik r kali;
 *    pemanasan isokhorik sampai suhu puncak T_H; ekspansi adiabatik; pendinginan isokhorik. Jadi T_H dan
 *    T_C adalah suhu tertinggi dan terendah siklus, sama seperti Carnot pembanding. Siklus hanya berjalan
 *    bila T_2 = T_C r^(γ−1) < T_H.
 *  - Q_H, Q_C dan W per siklus diintegrasikan sepanjang tiap ruas (titik-tengah, 2000 langkah):
 *    dW = P dV, dQ = n C_V dT + P dV. Q_H = jumlah kalor masuk, Q_C = jumlah kalor keluar (besar).
 *    Hasilnya dibandingkan dengan 1 − T_C/T_H, 1 − r^(1−γ) dan T_C/(T_H − T_C).
 *  - Klaim: mesin (atau pendingin) lain dengan Q_H yang sama. Mesin: W = η Q_H, Q_C = Q_H − W.
 *    Pendingin: W = Q_H/(1 + KP), Q_C = Q_H − W. ΔS_semesta dari perubahan entropi kedua reservoir.
 *  - Proses kuasi-statik; titik mengelilingi siklus dalam 6 s tampilan (1,5 s per ruas).
 * Visual: lebar panah aliran energi ∝ energi (Q_H = 0,06 satuan layar; panah W klaim dibatasi 1,6×);
 *   tinggi gas di silinder ∝ V; warna gas 0–1500 K.
 */
(function () {
  const R = 8.314;
  const ISO = 3;                 // rasio volume isotermal Carnot
  const P_REF = 100;             // kPa, keadaan terdingin/masuk
  const G_MONO = 5 / 3, CV_MONO = 1.5, G_AIR = 1.4, CV_AIR = 2.5;
  const LEG_T = 1.5;             // s tampilan per ruas
  const NINT = 2000;             // langkah integrasi per ruas
  const KP_CAP = 50;             // batas tampilan KP saat T_H → T_C
  const T_MIN = 0, T_MAX = 1500;
  const WMAX = 0.06;             // lebar panah Q_H (satuan layar)
  const BOX = { x: 0.16, y: 0.43, w: 0.78, h: 0.61 };
  const CYL = { x: 0.8, y: 0.73, w: 0.1, h: 0.25 };
  const M1 = [1.12, 0.725], M2 = [1.43, 0.725], MR = [0.055, 0.045];
  const HOT_Y = 0.98, COLD_Y = 0.47, RES_H = 0.09;
  const NAMES = ['', 'Carnot · gas monoatomik (γ = 1.67)', 'Otto · udara (γ = 1.4): masuk T_C, puncak T_H', 'Pendingin Carnot · monoatomik (γ = 1.67)'];

  const kind = p => Math.round(p.cyc);
  // Keadaan dan ruas siklus. Tiap ruas: jenis 'T' (isotermal), 'S' (adiabatik), 'V' (isokhorik).
  function cycle(p) {
    const k = kind(p), TH = p.TH, TC = p.TC;
    if (k === 2) {
      const g = G_AIR, V1 = R * TC / P_REF, V2 = V1 / p.r, T2 = TC * Math.pow(p.r, g - 1);
      const valid = TH > T2 + 1e-9, T3 = valid ? TH : T2, T4 = T3 * Math.pow(p.r, 1 - g);
      const s = [{ V: V1, T: TC }, { V: V2, T: T2 }, { V: V2, T: T3 }, { V: V1, T: T4 }];
      return { g, cv: CV_AIR, s, valid, T2, legs: [['S', s[0], s[1]], ['V', s[1], s[2]], ['S', s[2], s[3]], ['V', s[3], s[0]]] };
    }
    const g = G_MONO, V3 = R * TC / P_REF, V4 = V3 / ISO, f = Math.pow(Math.max(TH / TC, 1), 1 / (g - 1));
    const s = [{ V: V4 / f, T: TH }, { V: V3 / f, T: TH }, { V: V3, T: TC }, { V: V4, T: TC }];
    const legs = k === 1
      ? [['T', s[0], s[1]], ['S', s[1], s[2]], ['T', s[2], s[3]], ['S', s[3], s[0]]]
      : [['S', s[0], s[3]], ['T', s[3], s[2]], ['S', s[2], s[1]], ['T', s[1], s[0]]];
    return { g, cv: CV_MONO, s, valid: TH > TC, legs };
  }
  const onLeg = (leg, u, g) => {
    const [t, a, b] = leg;
    let V = a.V, T = a.T;
    if (t === 'V') T = a.T + (b.T - a.T) * u;
    else { V = a.V + (b.V - a.V) * u; if (t === 'S') T = a.T * Math.pow(a.V / V, g - 1); }
    return { V, T, P: R * T / V };
  };
  // Integrasi sepanjang satu ruas: W = ∫P dV, Q = ∫(C_V dT + P dV).
  function integrate(leg, g, cv) {
    let W = 0, Q = 0, prev = onLeg(leg, 0, g);
    for (let i = 1; i <= NINT; i++) {
      const cur = onLeg(leg, i / NINT, g), mid = onLeg(leg, (i - 0.5) / NINT, g);
      const dW = mid.P * (cur.V - prev.V);
      W += dW; Q += cv * R * (cur.T - prev.T) + dW; prev = cur;
    }
    return { W, Q };
  }
  const memo = new Map();
  function summary(p) {
    const key = [kind(p), p.TH, p.TC, p.r].join('|');
    if (memo.has(key)) return memo.get(key);
    const c = cycle(p), legQ = c.legs.map(l => integrate(l, c.g, c.cv));
    let Qin = 0, Qout = 0, W = 0;
    if (kind(p) === 2 && !c.valid) legQ.forEach(q => { q.W = 0; q.Q = 0; });   // Otto tak berjalan: tak ada loop
    legQ.forEach(q => { W += q.W; if (q.Q > 0) Qin += q.Q; else Qout -= q.Q; });
    const fridge = kind(p) === 3, dT = p.TH - p.TC;
    const out = fridge
      ? { QH: Qout, QC: Qin, W: -W, eff: -W > 1e-9 ? Qin / -W : KP_CAP, effC: dT > 0 ? p.TC / dT : Infinity }
      : { QH: Qin, QC: Qout, W, eff: Qin > 1e-9 ? W / Qin : 0, effC: 1 - p.TC / p.TH };
    out.effOtto = 1 - Math.pow(p.r, 1 - G_AIR);
    out.legQ = legQ.map(q => q.Q);
    out.cyc = c;
    if (memo.size > 300) memo.clear();
    memo.set(key, out);
    return out;
  }
  // Klaim dengan Q_H yang sama.
  function claim(p, S) {
    const c = p.klaim, fridge = kind(p) === 3;
    let W, QC, dS;
    if (fridge) { W = S.QH / (1 + c); QC = S.QH - W; dS = S.QH / p.TH - QC / p.TC; }
    else { W = c * S.QH; QC = S.QH - W; dS = -S.QH / p.TH + QC / p.TC; }
    const tol = 1e-9;
    const verdict = !fridge && c > 1 + tol ? 'I' : c > S.effC + tol ? 'II' : Math.abs(c - S.effC) <= tol ? 'batas' : 'ok';
    return { W, QC, dS, verdict };
  }
  const niceAxis = (max, n = 4) => {
    const raw = max / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
    const top = Math.ceil(max / step - 1e-9) * step, ticks = [];
    for (let t = 0; t <= top + step * 1e-6; t += step) ticks.push(+t.toPrecision(6));
    return { top, ticks };
  };
  const axes = c => ({
    V: niceAxis(1.08 * Math.max(...c.s.map(q => q.V))),
    P: niceAxis(1.08 * Math.max(...c.s.map(q => R * q.T / q.V)))
  });
  const current = (s, c) => {
    const i = Math.min(3, Math.floor(s.phi)), u = s.phi - i;
    return Object.assign(onLeg(c.legs[i], u, c.g), { leg: i });
  };
  function withAlpha(ctx, a, fn) { ctx.save(); ctx.globalAlpha = a; fn(); ctx.restore(); }
  function flame(d, cx, y, s) {
    const shape = [[-0.5, 0], [-0.6, 0.45], [-0.3, 0.8], [-0.12, 1.35], [0.12, 0.85], [0.35, 1.05], [0.6, 0.45], [0.5, 0]];
    d.polygon(shape.map(([a, b]) => [cx + a * s, y + b * s]), 'vector');
    d.polygon(shape.map(([a, b]) => [cx + a * s * 0.5, y + b * s * 0.55]), 'ke');
  }
  function snow(d, cx, cy, s) {
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI / 3, c = Math.cos(a) * s, sn = Math.sin(a) * s;
      d.line(cx - c, cy - sn, cx + c, cy + sn, 'pe', 2);
    }
  }
  // Panah lebar (lebar ∝ energi) dari (x0, y0) ke (x1, y1).
  function fat(d, x0, y0, x1, y1, w, col) {
    const L = Math.hypot(x1 - x0, y1 - y0);
    if (L < 1e-6 || !(w > 0)) return;
    const ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux;
    const hw = Math.max(w / 2, 0.004), hh = hw + 0.014, hl = Math.min(0.035, L * 0.5);
    const bx = x1 - ux * hl, by = y1 - uy * hl;
    d.polygon([[x0 + nx * hw, y0 + ny * hw], [bx + nx * hw, by + ny * hw], [bx + nx * hh, by + ny * hh], [x1, y1],
      [bx - nx * hh, by - ny * hh], [bx - nx * hw, by - ny * hw], [x0 - nx * hw, y0 - ny * hw]], col);
  }
  // Diagram aliran untuk satu mesin di (mx, my). e: { QH, W, QC } dalam J; skala: QH → WMAX.
  function flow(d, m, r, e, QH, fridge, cols, labels) {
    const [mx, my] = m, k = QH > 0 ? WMAX / QH : 0, top = HOT_Y, bot = COLD_Y;
    const wW = Math.min(e.W * k, 1.6 * WMAX), wC = Math.max(0, e.QC) * k;
    if (!fridge) {
      fat(d, mx, top, mx, my + r, e.QH * k, cols.QH);
      fat(d, mx, my - r, mx, bot, wC, cols.QC);
      fat(d, mx + r, my, mx + r + 0.1, my, wW, cols.W);
    } else {
      fat(d, mx, my + r, mx, top, e.QH * k, cols.QH);
      fat(d, mx, bot, mx, my - r, wC, cols.QC);
      fat(d, mx + r + 0.1, my, mx + r, my, wW, cols.W);
    }
    d.circle(mx, my, r, 'bg'); d.circle(mx, my, r, 'fg', false, 2);
    if (labels) {
      d.text(mx + WMAX / 2 + 0.02, (top + my + r) / 2, 'Q_H', 'fg', 'sm', 'left');
      d.text(mx + WMAX / 2 + 0.02, (bot + my - r) / 2, 'Q_C', 'fg', 'sm', 'left');
      d.text(mx + r + 0.05, my + Math.max(wW / 2, 0.01) + 0.035, 'W', 'fg', 'sm');
    }
  }
  const j0 = x => x.toFixed(0).replace('-', '−');
  const sgn = x => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(2);

  SimCore.register({
    api: 1,
    id: 'mesin-kalor',
    title: 'Siklus mesin kalor: Carnot, Otto dan pendingin',
    aspect: 4 / 3,
    view: { x: [0, 1.6], y: [0, 1.2] },
    dt: 1 / 240,

    params: [
      { key: 'cyc', label: 'Siklus', unit: '', min: 1, max: 3, step: 1, value: 1, resets: true, options: ['Carnot', 'Otto', 'pendingin Carnot'] },
      { key: 'TH', label: 'Suhu reservoir panas', symbol: 'T_H', unit: 'K', min: 400, max: 1200, step: 10, value: 600 },
      { key: 'TC', label: 'Suhu reservoir dingin', symbol: 'T_C', unit: 'K', min: 200, max: 400, step: 10, value: 300 },
      { key: 'r', label: 'Rasio kompresi (Otto)', symbol: 'r', unit: '', min: 2, max: 12, step: 0.5, value: 5 },
      { key: 'klaim', label: 'Klaim (η mesin / KP pendingin)', unit: '', min: 0, max: 10, step: 0.01, value: 0.4 }
    ],

    graphs: [
      { title: 'η (mesin) atau KP (pendingin)', unit: '', min: 0, series: [
        { key: 'effC', label: 'Carnot', color: 'muted', digits: 3 },
        { key: 'eff', label: 'siklus', color: 'body', digits: 3 },
        { key: 'klaim', label: 'klaim', color: 'accent', digits: 2 }
      ] },
      { title: 'Energi per siklus', unit: 'J', min: 0, series: [
        { key: 'QH', label: 'Q_H', color: 'vector', digits: 0 },
        { key: 'W', label: 'W', color: 'body', digits: 0 },
        { key: 'QC', label: 'Q_C', color: 'pe', digits: 0 }
      ] }
    ],

    init(p) { return { phi: 0 }; },

    step(s, p, dt) { s.phi = (s.phi + dt / LEG_T) % 4; },

    measure(s, p) {
      const S = summary(p), c = current(s, S.cyc);
      return { eff: Math.min(S.eff, KP_CAP), effC: Math.min(S.effC, KP_CAP), klaim: p.klaim,
        QH: S.QH, W: S.W, QC: S.QC, T: c.T, P: c.P, V: c.V };
    },

    positions(s, p) {
      const S = summary(p), c = current(s, S.cyc), ax = axes(S.cyc);
      return [[BOX.x + BOX.w * c.V / ax.V.top, BOX.y + BOX.h * c.P / ax.P.top]];
    },

    draw(ctx, s, p, v, d) {
      const k = kind(p), fridge = k === 3, S = summary(p), C = S.cyc, ax = axes(C), cur = current(s, C);
      const px = n => n / v.scale, tiny = 1e-4 * (1 + S.QH);   // |Q| ruas adiabatik ≈ 1e-7 Q_H (galat integrasi)
      const pl = d.plot(BOX, { x: [0, ax.V.top], y: [0, ax.P.top], xlabel: 'V (L)', ylabel: 'P (kPa)',
        xticks: ax.V.ticks, yticks: ax.P.ticks });

      // Loop: luas = W bersih; ruas diwarnai menurut arah kalor
      const legPts = C.legs.map(l => { const a = []; for (let i = 0; i <= 40; i++) { const q = onLeg(l, i / 40, C.g); a.push([q.V, q.P]); } return a; });
      pl.fill([].concat(...legPts), 'trail');
      C.legs.forEach((l, i) => {
        const q = S.legQ[i], col = q > tiny ? 'vector' : q < -tiny ? 'pe' : 'body';
        pl.line(legPts[i], col, q > tiny || q < -tiny ? 3 : 2);
        const a = onLeg(l, 0.45, C.g), b = onLeg(l, 0.55, C.g), m = onLeg(l, 0.5, C.g);
        const dx = pl.X(b.V) - pl.X(a.V), dy = pl.Y(b.P) - pl.Y(a.P), L = Math.hypot(dx, dy);
        if (L > 1e-9 && C.valid) { const f = px(16) / L; d.arrow(pl.X(m.V) - dx * f / 2, pl.Y(m.P) - dy * f / 2, dx * f, dy * f, col); }
      });
      // Nomor keadaan. Carnot: digeser menjauhi pusat loop. Otto: 2 di kiri, 1/3/4 di kanan titiknya
      // (1 dan 4 berbagi V, jadi disusun bertingkat). Semua dijepit di dalam kotak diagram.
      const sx = C.s.map(q => pl.X(q.V)), sy = C.s.map(q => pl.Y(R * q.T / q.V));
      const inBox = (x, y, al) => [Math.min(Math.max(x, BOX.x + (al === 'right' ? px(10) : px(6))), BOX.x + BOX.w - px(6)),
        Math.min(Math.max(y, BOX.y + px(8)), BOX.y + BOX.h - px(8))];
      const put = (i, x, y, al, t) => { const [X, Y] = inBox(x, y, al); d.text(X, Y, t || String(i + 1), 'fg', 'sm', al); };
      if (k === 2) {
        const y1 = Math.max(BOX.y + px(8), Math.min(sy[0], sy[3] + px(8) - px(14)));
        put(0, sx[0] + px(6), y1, 'left', '1 (T_C)');
        if (C.valid) {
          put(3, sx[3] + px(6), Math.max(sy[3] + px(8), y1 + px(14)), 'left');
          put(1, sx[1] - px(6), sy[1], 'right');
          put(2, sx[2] + px(6), sy[2] + px(8), 'left', '3 (T_H)');
        } else put(1, sx[1] + px(6), sy[1] + px(8), 'left');
      } else {
        const cx = sx.reduce((a, b) => a + b) / 4, cy = sy.reduce((a, b) => a + b) / 4;
        sx.forEach((X, i) => {
          const Y = sy[i], L = Math.hypot(X - cx, Y - cy) || 1;
          const al = X - cx > 0.3 * L ? 'left' : X - cx < -0.3 * L ? 'right' : 'center';
          put(i, X + (X - cx) / L * px(8), Y + (Y - cy) / L * px(10), al);
        });
      }
      pl.dot(cur.V, cur.P, 6, 'current');
      d.text(BOX.x + BOX.w, BOX.y + BOX.h + px(10), fridge ? 'luas loop = W masuk' : 'luas loop = W bersih', 'body', 'sm', 'right');

      // Silinder kecil di pojok kanan atas diagram (daerah P tinggi, V besar selalu kosong)
      const h = CYL.h * cur.V / ax.V.top;
      d.rect(CYL.x - 0.01, CYL.y - 0.075, CYL.w + 0.02, CYL.h + 0.11, 'bg');
      withAlpha(ctx, 0.35, () => d.rect(CYL.x, CYL.y, CYL.w, h, d.heat((cur.T - T_MIN) / (T_MAX - T_MIN))));
      d.polyline([[CYL.x, CYL.y + CYL.h + 0.02], [CYL.x, CYL.y], [CYL.x + CYL.w, CYL.y], [CYL.x + CYL.w, CYL.y + CYL.h + 0.02]], 'fg', 2);
      d.rect(CYL.x + 0.003, CYL.y + h, CYL.w - 0.006, 0.02, 'muted');
      d.line(CYL.x + CYL.w / 2, CYL.y + h + 0.02, CYL.x + CYL.w / 2, CYL.y + h + 0.05, 'fg', 2);
      const qLeg = S.legQ[cur.leg], ccx = CYL.x + CYL.w / 2;
      if (qLeg > tiny) [-0.025, 0.025].forEach(o => flame(d, ccx + o, CYL.y - 0.065, 0.035));
      else if (qLeg < -tiny) [-0.025, 0.025].forEach(o => snow(d, ccx + o, CYL.y - 0.04, 0.017));
      d.text(CYL.x - 0.02, CYL.y + CYL.h - 0.02, `T = ${cur.T.toFixed(0)} K`, 'fg', 'sm', 'right');

      // Judul
      d.text(0.02, 1.15, NAMES[k], 'fg', 'md', 'left');

      // Diagram aliran energi: reservoir, siklus nyata, klaim
      d.rect(1.0, HOT_Y, 0.58, RES_H, 'hot'); d.text(1.29, HOT_Y + RES_H / 2, `T_H = ${p.TH} K`, 'bg', 'sm');
      d.rect(1.0, COLD_Y - RES_H, 0.58, RES_H, 'cold'); d.text(1.29, COLD_Y - RES_H / 2, `T_C = ${p.TC} K`, 'bg', 'sm');
      const K = claim(p, S), bad = K.verdict === 'I' || K.verdict === 'II', kc = bad ? 'vector' : 'muted';
      if (S.QH > 0) {
        flow(d, M1, MR[0], S, S.QH, fridge, fridge ? { QH: 'pe', QC: 'vector', W: 'body' } : { QH: 'vector', QC: 'pe', W: 'body' }, true);
        flow(d, M2, MR[1], { QH: S.QH, W: K.W, QC: K.QC }, S.QH, fridge, { QH: kc, QC: kc, W: kc }, false);
      }
      d.text(M1[0], COLD_Y - RES_H - 0.045, 'siklus', 'fg', 'sm');
      d.text(M2[0], COLD_Y - RES_H - 0.045, 'klaim', kc, 'sm');

      // Perbandingan dan uji klaim
      const L = [0.25, 0.18, 0.11, 0.04], f3 = x => x.toFixed(3);
      if (k === 2 && !C.valid) {
        d.text(0.02, L[0], `Otto tak berjalan: T_2 = ${C.T2.toFixed(0)} K ≥ T_H`, 'vector', 'sm', 'left');
        d.text(0.02, L[1], `perlu r < (T_H/T_C)^2.5 = ${Math.pow(p.TH / p.TC, 2.5).toFixed(1)}`, 'fg', 'sm', 'left');
        return;
      }
      if (fridge && !C.valid) d.text(0.02, L[0], 'T_H = T_C: loop tanpa luas, W = 0, KP tak hingga', 'fg', 'sm', 'left');
      else if (fridge) d.text(0.02, L[0], `KP_siklus = ${f3(S.eff)} · KP_Carnot = T_C/(T_H − T_C) = ${f3(S.effC)}`, 'fg', 'sm', 'left');
      else if (k === 2) d.text(0.02, L[0], `η_siklus = ${f3(S.eff)} · η_Otto = ${f3(S.effOtto)} < η_Carnot = ${f3(S.effC)}`, 'fg', 'sm', 'left');
      else d.text(0.02, L[0], `η_siklus = ${f3(S.eff)} · η_Carnot = 1 − T_C/T_H = ${f3(S.effC)}`, 'fg', 'sm', 'left');
      d.text(0.02, L[1], `Klaim ${fridge ? 'KP' : 'η'} = ${p.klaim.toFixed(2)} → W = ${j0(K.W)} J, Q_C = ${j0(K.QC)} J`, 'fg', 'sm', 'left');
      d.text(0.02, L[2], `ΔS_semesta = ${fridge ? 'Q_H/T_H − Q_C/T_C' : '−Q_H/T_H + Q_C/T_C'} = ${sgn(K.dS)} J/K`, 'fg', 'sm', 'left');
      const msg = { I: 'DITOLAK — melanggar Hukum I (W > Q_H)', II: 'DITOLAK — melanggar Hukum II (ΔS_semesta < 0)',
        batas: 'mungkin hanya jika reversibel (tepat batas Carnot)', ok: 'mungkin (tidak melebihi batas Carnot)' }[K.verdict];
      d.text(0.02, L[3], msg, bad ? 'vector' : 'fg', 'sm', 'left');
    }
  });
})();
