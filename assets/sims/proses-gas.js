/* Proses gas ideal pada diagram P–V (Kalor dan Termodinamika)
 * Asumsi model:
 *  - Gas ideal n mol, PV = nRT, R = 8,314 J/(mol·K); V_awal = 10 L. P dalam kPa, V dalam L, jadi kPa·L = J.
 *  - Monoatomik C_V = 3R/2 (γ = 5/3); diatomik C_V = 5R/2 (γ = 7/5); C_V tetap terhadap suhu.
 *  - Proses kuasi-statik (gas selalu setimbang), ditempuh dalam 4 s tampilan lalu berhenti di keadaan akhir.
 *    Isotermal, isobarik, adiabatik: V berubah linear terhadap waktu tampilan; isokhorik: T linear.
 *  - Rasio akhir = V_akhir/V_awal (isotermal, isobarik, adiabatik) atau T_akhir/T_awal (isokhorik).
 *  - Tanda: W = kerja OLEH gas = ∫P dV (dijumlahkan titik-tengah tiap langkah), Q = kalor MASUK gas dari
 *    kapasitas kalor proses (isobarik n C_P dT, isokhorik n C_V dT, isotermal P dV, adiabatik 0),
 *    ΔU = n C_V ΔT. Hukum I (ΔU = Q − W) menjadi pemeriksaan, bukan masukan.
 * Visual: tinggi gas di silinder ∝ V (skala sumbu V); partikel hanya ilustrasi, laju ∝ √T
 *   (V_VIS = 0,25 satuan layar/s pada 300 K), dipantulkan dinding dan piston; warna gas 0–1500 K.
 */
(function () {
  const R = 8.314;                 // J/(mol·K)
  const V1 = 10;                   // L, volume awal
  const DUR = 4;                   // s tampilan untuk satu proses
  const T_MIN = 0, T_MAX = 1500;   // K, rentang skala warna gas
  const NP = 30;                   // jumlah partikel ilustrasi
  const V_VIS = 0.25;              // satuan layar/s pada 300 K
  const PR = 0.012;                // jari-jari tumbukan partikel (satuan layar)
  const NAMES = ['', 'Isotermal', 'Isobarik', 'Isokhorik', 'Adiabatik'];
  const BOX = { x: 0.17, y: 0.22, w: 0.9, h: 0.78 };        // diagram P–V
  const CYL = { x: 1.23, y: 0.31, w: 0.24, h: 0.6 };        // bagian dalam silinder, tinggi pada V = sumbu maks
  const PIST = 0.035, ROD = 0.05;

  const mode = p => Math.round(p.proc);
  const gas = p => {
    const cv = Math.round(p.gas) === 1 ? 1.5 : 2.5;          // C_V / R
    return { cv, g: (cv + 1) / cv, name: Math.round(p.gas) === 1 ? 'monoatomik' : 'diatomik' };
  };
  // Keadaan akhir dari keadaan awal (V1, T0) dan rasio.
  const ends = p => {
    const m = mode(p), { g } = gas(p), T0 = p.T0, r = p.ratio;
    let V2 = V1 * r, T2 = T0;
    if (m === 2) T2 = T0 * r;
    if (m === 3) { V2 = V1; T2 = T0 * r; }
    if (m === 4) T2 = T0 * Math.pow(r, 1 - g);
    return { P1: p.n * R * T0 / V1, V2, T2, P2: p.n * R * T2 / V2 };
  };
  // Keadaan gas pada kemajuan u ∈ [0, 1].
  const at = (p, u) => {
    const m = mode(p), { g } = gas(p), e = ends(p);
    let V = V1, T;
    if (m === 3) T = p.T0 + (e.T2 - p.T0) * u;
    else {
      V = V1 + (e.V2 - V1) * u;
      T = m === 1 ? p.T0 : m === 2 ? p.T0 * V / V1 : p.T0 * Math.pow(V1 / V, g - 1);
    }
    return { V, T, P: p.n * R * T / V };
  };
  // Sumbu "bagus": puncak dibulatkan ke kelipatan langkah 1/2/2,5/5 × 10^k.
  const niceAxis = (max, n = 4) => {
    const raw = max / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
    const top = Math.ceil(max / step - 1e-9) * step, ticks = [];
    for (let t = 0; t <= top + step * 1e-6; t += step) ticks.push(+t.toPrecision(6));
    return { top, ticks };
  };
  const axes = p => {
    const e = ends(p);
    return { V: niceAxis(Math.max(20, 1.2 * Math.max(V1, e.V2))), P: niceAxis(1.15 * Math.max(e.P1, e.P2)) };
  };
  const gasH = (p, V) => CYL.h * V / axes(p).V.top;
  // Arah kalor selama proses: +1 masuk, −1 keluar, 0 adiabatik.
  const heatDir = p => {
    const m = mode(p), e = ends(p);
    if (m === 4) return 0;
    const d = m === 3 ? e.T2 - p.T0 : e.V2 - V1;
    return d > 1e-12 ? 1 : d < -1e-12 ? -1 : 0;
  };
  function mulberry32(a) {
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
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

  SimCore.register({
    api: 1,
    id: 'proses-gas',
    title: 'Proses gas ideal pada diagram P–V',
    aspect: 4 / 3,
    view: { x: [0, 1.6], y: [0, 1.2] },
    dt: 1 / 240,

    params: [
      { key: 'proc', label: 'Proses (1 isotermal · 2 isobarik · 3 isokhorik · 4 adiabatik)', unit: '', min: 1, max: 4, step: 1, value: 1, resets: true },
      { key: 'ratio', label: 'Rasio akhir (V akhir/awal; isokhorik: T akhir/awal)', unit: '', min: 0.3, max: 3, step: 0.1, value: 2, resets: true },
      { key: 'gas', label: 'Gas (1 monoatomik · 2 diatomik)', unit: '', min: 1, max: 2, step: 1, value: 1, resets: true },
      { key: 'n', label: 'Jumlah zat', symbol: 'n', unit: 'mol', min: 0.5, max: 2, step: 0.1, value: 1, resets: true },
      { key: 'T0', label: 'Suhu awal', symbol: 'T_awal', unit: 'K', min: 200, max: 600, step: 10, value: 300, resets: true }
    ],

    graphs: [
      { title: 'Tekanan', unit: 'kPa', min: 0, series: [{ key: 'P', label: 'P', color: 'body', digits: 1 }] },
      { title: 'Suhu', unit: 'K', min: 0, series: [{ key: 'T', label: 'T', color: 'warm', digits: 1 }] },
      { title: 'Energi', unit: 'J', series: [
        { key: 'Q', label: 'Q', color: 'vector', digits: 0 },
        { key: 'W', label: 'W', color: 'body', digits: 0 },
        { key: 'dU', label: 'ΔU', color: 'total', digits: 0 }
      ] }
    ],

    init(p) {
      const rnd = mulberry32(20240917);
      const s = { u: 0, W: 0, Q: 0, x: [], y: [], vx: [], vy: [] };
      const h = gasH(p, V1);
      for (let i = 0; i < NP; i++) {
        s.x.push(PR + rnd() * (CYL.w - 2 * PR));
        s.y.push(PR + rnd() * (h - 2 * PR));
        const a = rnd() * 2 * Math.PI, sp = 0.6 + 0.8 * rnd();   // sebaran laju sekadar ilustrasi
        s.vx.push(Math.cos(a) * sp); s.vy.push(Math.sin(a) * sp);
      }
      return s;
    },

    step(s, p, dt) {
      if (s.u < 1) {
        const u0 = s.u, u1 = Math.min(1, u0 + dt / DUR);
        const a = at(p, u0), b = at(p, u1), mid = at(p, (u0 + u1) / 2), { cv } = gas(p);
        const dW = mid.P * (b.V - a.V);
        const m = mode(p);
        const dQ = m === 1 ? dW : m === 2 ? p.n * (cv + 1) * R * (b.T - a.T) : m === 3 ? p.n * cv * R * (b.T - a.T) : 0;
        s.W += dW; s.Q += dQ; s.u = u1;
      }
      // Partikel: laju ∝ √T, pantul pada dinding, dasar dan piston.
      const cur = at(p, s.u), f = V_VIS * Math.sqrt(cur.T / 300), top = gasH(p, cur.V) - PR;
      for (let i = 0; i < NP; i++) {
        s.x[i] += s.vx[i] * f * dt; s.y[i] += s.vy[i] * f * dt;
        if (s.x[i] < PR) { s.x[i] = 2 * PR - s.x[i]; s.vx[i] = Math.abs(s.vx[i]); }
        if (s.x[i] > CYL.w - PR) { s.x[i] = 2 * (CYL.w - PR) - s.x[i]; s.vx[i] = -Math.abs(s.vx[i]); }
        if (s.y[i] < PR) { s.y[i] = 2 * PR - s.y[i]; s.vy[i] = Math.abs(s.vy[i]); }
        if (s.y[i] > top) { s.y[i] = Math.max(PR, 2 * top - s.y[i]); s.vy[i] = -Math.abs(s.vy[i]); }
      }
    },

    measure(s, p) {
      const c = at(p, s.u), { cv } = gas(p);
      return { P: c.P, T: c.T, V: c.V, Q: s.Q, W: s.W, dU: p.n * cv * R * (c.T - p.T0) };
    },

    positions(s, p) {
      const c = at(p, s.u), ax = axes(p);
      const pts = [[BOX.x + BOX.w * c.V / ax.V.top, BOX.y + BOX.h * c.P / ax.P.top]];
      for (let i = 0; i < NP; i++) pts.push([CYL.x + s.x[i], CYL.y + s.y[i]]);
      return pts;
    },

    draw(ctx, s, p, v, d) {
      const m = mode(p), G = gas(p), e = ends(p), ax = axes(p), c = at(p, s.u);
      const px = n => n / v.scale;
      const pl = d.plot(BOX, { x: [0, ax.V.top], y: [0, ax.P.top], xlabel: 'V (L)', ylabel: 'P (kPa)',
        xticks: ax.V.ticks, yticks: ax.P.ticks });
      const Vt = ax.V.top, P1 = e.P1, T0 = p.T0;

      // Luas W di bawah lintasan yang sudah ditempuh
      const N = 60, path = [];
      for (let k = 0; k <= N; k++) { const q = at(p, s.u * k / N); path.push([q.V, q.P]); }
      if (Math.abs(c.V - V1) > 1e-6) {
        const area = [[V1, 0], ...path, [c.V, 0]];
        if (c.V > V1) pl.fill(area, 'trail');
        else withAlpha(ctx, 0.3, () => pl.fill(area, 'body2'));
      }

      // Kurva acuan melalui keadaan awal
      const iso = [], adi = [];
      for (let k = 1; k <= 120; k++) {
        const V = Vt * k / 120;
        iso.push([V, P1 * V1 / V]); adi.push([V, P1 * Math.pow(V1 / V, G.g)]);
      }
      pl.line(iso, 'muted', 1); pl.line(adi, 'muted', 1);
      pl.hline(P1, 'muted', 1); pl.vline(V1, 'muted', 1);

      // Label kurva acuan: di tepi kanan, disusun agar tidak bertumpuk
      const labs = [
        { t: 'isobar', y: pl.Y(P1) }, { t: 'isoterm', y: pl.Y(P1 * V1 / Vt) },
        { t: 'adiabat', y: pl.Y(P1 * Math.pow(V1 / Vt, G.g)) }
      ].map(l => ({ t: l.t, y: l.y + px(9) }));
      labs.sort((a, b) => b.y - a.y);
      const gap = px(15), yTop = BOX.y + BOX.h - px(8), yBot = BOX.y + px(8);
      labs.forEach((l, i) => { l.y = Math.min(l.y, i ? labs[i - 1].y - gap : yTop); });
      for (let i = labs.length - 1; i >= 0; i--) {
        labs[i].y = Math.max(labs[i].y, i < labs.length - 1 ? labs[i + 1].y + gap : yBot);
      }
      labs.forEach(l => d.text(BOX.x + BOX.w - px(4), l.y, l.t, 'muted', 'sm', 'right'));
      d.text(pl.X(V1) + px(4), BOX.y + BOX.h - px(8), 'isokhor', 'muted', 'sm', 'left');

      // Lintasan yang ditempuh, arah, titik awal dan titik sekarang
      pl.line(path, 'body', 3);
      if (s.u > 0.12) {
        const a = at(p, s.u * 0.45), b = at(p, s.u * 0.55);
        const dx = pl.X(b.V) - pl.X(a.V), dy = pl.Y(b.P) - pl.Y(a.P), L = Math.hypot(dx, dy);
        if (L > 1e-9) {
          const q = at(p, s.u * 0.5), k = px(22) / L;
          d.arrow(pl.X(q.V) - dx * k / 2, pl.Y(q.P) - dy * k / 2, dx * k, dy * k, 'body');
        }
      }
      if (m === 3 && s.u > 0) d.text(pl.X(V1) - px(6), pl.Y((P1 + c.P) / 2), 'W = 0', 'body', 'sm', 'right');
      d.circle(pl.X(V1), pl.Y(P1), px(5), 'bg');
      d.circle(pl.X(V1), pl.Y(P1), px(5), 'fg', false, 1.5);
      pl.dot(c.V, c.P, 6, 'current');

      // Judul dan konvensi tanda
      d.text(0.02, 1.15, `${NAMES[m]} · ${G.name} (γ = ${G.g.toFixed(2)})`, 'fg', 'md', 'left');
      d.text(1.58, 1.15, m === 3 ? `T_akhir/T_awal = ${p.ratio.toFixed(1)}` : `V_akhir/V_awal = ${p.ratio.toFixed(1)}`, 'fg', 'sm', 'right');
      d.text(0.02, 0.03, 'W oleh gas · Q masuk gas · ΔU = Q − W', 'muted', 'sm', 'left');

      // Silinder dengan piston, partikel, dan sumber/penyerap kalor
      const h = gasH(p, c.V), hMax = CYL.h;
      withAlpha(ctx, 0.35, () => d.rect(CYL.x, CYL.y, CYL.w, h, d.heat((c.T - T_MIN) / (T_MAX - T_MIN))));
      for (let i = 0; i < NP; i++) d.dot(CYL.x + s.x[i], CYL.y + s.y[i], 2.5, 'fg');
      d.polyline([[CYL.x, CYL.y + hMax], [CYL.x, CYL.y], [CYL.x + CYL.w, CYL.y], [CYL.x + CYL.w, CYL.y + hMax]], 'fg', 3);
      d.rect(CYL.x + 0.004, CYL.y + h, CYL.w - 0.008, PIST, 'muted');
      d.line(CYL.x + CYL.w / 2, CYL.y + h + PIST, CYL.x + CYL.w / 2, CYL.y + h + PIST + ROD, 'fg', 3);
      d.text(1.58, 1.08, `V = ${c.V.toFixed(1)} L`, 'fg', 'sm', 'right');
      d.text(1.58, 1.02, `T = ${c.T.toFixed(0)} K`, 'fg', 'sm', 'right');
      const cx = CYL.x + CYL.w / 2, hd = heatDir(p), moving = s.u > 0 && s.u < 1;
      if (m === 4) d.text(cx, CYL.y - 0.07, 'terisolasi', 'muted', 'sm');
      else if (moving && hd > 0) [-0.07, 0, 0.07].forEach(o => flame(d, cx + o, CYL.y - 0.14, 0.07));
      else if (moving && hd < 0) [-0.07, 0.07].forEach(o => snow(d, cx + o, CYL.y - 0.08, 0.03));
      d.text(1.58, 0.03, `warna gas ${T_MIN}–${T_MAX} K`, 'muted', 'sm', 'right');
    }
  });
})();
