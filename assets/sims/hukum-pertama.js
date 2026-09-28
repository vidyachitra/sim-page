/* Hukum I Termodinamika dan luas di bawah kurva (Kalor dan Termodinamika)
 * Asumsi model:
 *  - Gas ideal n = 1 mol, R = 8,314 J/(mol·K). Keadaan awal tetap A: V_A = 10 L, P_A = 200 kPa (T_A ≈ 241 K).
 *  - Monoatomik C_V = 3R/2, diatomik C_V = 5R/2. P dalam kPa, V dalam L, jadi kPa·L = J.
 *  - Tiga lintasan kuasi-statik A → B: (1) isobarik lalu isokhorik, (2) isokhorik lalu isobarik,
 *    (3) garis lurus. Titik bergerak sepanjang lintasan dalam 5 s tampilan (laju tetap di layar), lalu berhenti.
 *  - W = ∫P dV = luas di bawah lintasan (kerja OLEH gas; segmen lurus → trapesium, tepat).
 *    ΔU = n C_V (T − T_A) = (C_V/R)(PV − P_A V_A) hanya bergantung keadaan. Q = ΔU + W (kalor MASUK gas).
 *  - Semua besaran dihitung dari kemajuan u dan penggeser, jadi mengubah V_B, P_B atau gas di tengah
 *    jalan langsung memperbarui lintasan, tabel dan grafik.
 * Visual: tinggi gas di silinder ∝ V (0,3 satuan layar per 32 L); warna gas 0–1500 K.
 *   Batang Q, W, ΔU diskalakan ke nilai mutlak terbesar di sepanjang lintasan terpilih.
 */
(function () {
  const R = 8.314, NMOL = 1;
  const VA = 10, PA = 200;              // L, kPa
  const DUR = 5;                        // s tampilan untuk A → B
  const T_MIN = 0, T_MAX = 1500;        // K, skala warna gas
  const V_AX = 32, P_AX = 330;          // batas sumbu
  const BOX = { x: 0.16, y: 0.48, w: 0.8, h: 0.56 };
  const CYL = { x: 1.19, y: 0.62, w: 0.2, h: 0.3 };      // tinggi pada V = V_AX
  const PIST = 0.025, ROD = 0.04;
  const BARS = { x0: 1.34, half: 0.21, rows: [0.27, 0.19, 0.11], th: 0.045 };
  const PATHS = ['', 'isobarik lalu isokhorik', 'isokhorik lalu isobarik', 'garis lurus'];

  const cvR = p => (Math.round(p.gas) === 1 ? 1.5 : 2.5);
  const verts = (p, k) => k === 1 ? [[VA, PA], [p.VB, PA], [p.VB, p.PB]]
    : k === 2 ? [[VA, PA], [VA, p.PB], [p.VB, p.PB]] : [[VA, PA], [p.VB, p.PB]];
  // Panjang ruas dinormalkan ke sumbu, supaya titik bergerak dengan laju tetap di layar.
  const segLen = (a, b) => Math.hypot((b[0] - a[0]) / V_AX, (b[1] - a[1]) / P_AX);
  // Menelusuri lintasan k sampai kemajuan u: titik ujung, titik-titik yang sudah dilewati, W kumulatif.
  function walk(p, k, u) {
    const vs = verts(p, k), lens = [];
    let tot = 0;
    for (let i = 1; i < vs.length; i++) { lens.push(segLen(vs[i - 1], vs[i])); tot += lens[i - 1]; }
    let left = u * tot, W = 0;
    const pts = [vs[0]];
    for (let i = 1; i < vs.length; i++) {
      const a = vs[i - 1], b = vs[i], f = lens[i - 1] > 0 ? Math.min(1, left / lens[i - 1]) : 1;
      const q = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      W += (a[1] + q[1]) / 2 * (q[0] - a[0]);           // trapesium: tepat untuk ruas lurus
      pts.push(q);
      left -= lens[i - 1];
      if (f < 1) break;
    }
    const [V, P] = pts[pts.length - 1];
    return { V, P, W, pts };
  }
  const energies = (p, k, u) => {
    const w = walk(p, k, u), dU = cvR(p) * (w.P * w.V - PA * VA);
    return { V: w.V, P: w.P, T: w.P * w.V / (NMOL * R), W: w.W, dU, Q: dU + w.W, pts: w.pts };
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
  const fmtJ = x => (Math.abs(x) < 0.5 ? '0' : x.toFixed(0)).replace('-', '−');

  SimCore.register({
    api: 1,
    id: 'hukum-pertama',
    title: 'Hukum I Termodinamika dan luas di bawah kurva P–V',
    aspect: 4 / 3,
    view: { x: [0, 1.6], y: [0, 1.2] },
    dt: 1 / 240,

    params: [
      { key: 'VB', label: 'Volume akhir', symbol: 'V_B', unit: 'L', min: 5, max: 30, step: 1, value: 25 },
      { key: 'PB', label: 'Tekanan akhir', symbol: 'P_B', unit: 'kPa', min: 50, max: 300, step: 10, value: 100 },
      { key: 'path', label: 'Lintasan', unit: '', min: 1, max: 3, step: 1, value: 1, resets: true, options: ['isobarik lalu isokhorik', 'isokhorik lalu isobarik', 'garis lurus'] },
      { key: 'gas', label: 'Gas', unit: '', min: 1, max: 2, step: 1, value: 1, options: ['monoatomik', 'diatomik'] }
    ],

    graphs: [
      { title: 'Energi', unit: 'J', series: [
        { key: 'Q', label: 'Q', color: 'vector', digits: 0 },
        { key: 'W', label: 'W', color: 'body', digits: 0 },
        { key: 'dU', label: 'ΔU', color: 'total', digits: 0 }
      ] },
      { title: 'Suhu', unit: 'K', min: 0, series: [{ key: 'T', label: 'T', color: 'warm', digits: 1 }] }
    ],

    init(p) { return { u: 0 }; },

    step(s, p, dt) { s.u = Math.min(1, s.u + dt / DUR); },

    measure(s, p) {
      const e = energies(p, Math.round(p.path), s.u);
      return { Q: e.Q, W: e.W, dU: e.dU, T: e.T, V: e.V, P: e.P };
    },

    positions(s, p) {
      const e = energies(p, Math.round(p.path), s.u);
      return [[BOX.x + BOX.w * e.V / V_AX, BOX.y + BOX.h * e.P / P_AX]];
    },

    draw(ctx, s, p, v, d) {
      const k = Math.round(p.path), e = energies(p, k, s.u), px = n => n / v.scale;
      const pl = d.plot(BOX, { x: [0, V_AX], y: [0, P_AX], xlabel: 'V (L)', ylabel: 'P (kPa)',
        xticks: [0, 10, 20, 30], yticks: [0, 100, 200, 300] });

      // Luas di bawah bagian lintasan yang sudah ditempuh: ekspansi (W > 0) dan kompresi (W < 0) dibedakan
      const pts = e.pts, expand = p.VB > VA;
      if (Math.abs(e.V - VA) > 1e-6) {
        const area = [[VA, 0], ...pts, [e.V, 0]];
        if (expand) pl.fill(area, 'trail'); else withAlpha(ctx, 0.3, () => pl.fill(area, 'body2'));
      }

      const yl = BOX.y + BOX.h + px(10), xl = BOX.x + BOX.w;
      if (Math.abs(e.V - VA) > 1e-6) d.text(xl, yl, expand ? 'luas = W > 0 (memuai)' : 'luas = W < 0 (ditekan)', expand ? 'body' : 'fg', 'sm', 'right');
      else if (s.u > 0) d.text(xl, yl, 'W = 0 (V tetap)', 'fg', 'sm', 'right');

      // Dua lintasan lain samar, lintasan terpilih tebal
      for (let j = 1; j <= 3; j++) if (j !== k) pl.line(verts(p, j), 'muted', 1);
      pl.line(verts(p, k), 'grid', 2);
      pl.line(pts, 'body', 3);

      // Label titik sudut dan nomor lintasan, digeser menjauhi pusat persegi A–B
      const cV = (VA + p.VB) / 2, cP = (PA + p.PB) / 2;
      const lab = (V, P, t, col) => {
        const sx = Math.sign(V - cV) || -1, sy = Math.sign(P - cP) || 1;
        d.text(pl.X(V) + sx * px(9), pl.Y(P) + sy * px(9), t, col, 'sm');
      };
      lab(VA, PA, 'A', 'fg'); lab(p.VB, p.PB, 'B', 'fg');
      lab(p.VB, PA, '1', k === 1 ? 'body' : 'muted'); lab(VA, p.PB, '2', k === 2 ? 'body' : 'muted');
      {
        const dx = pl.X(p.VB) - pl.X(VA), dy = pl.Y(p.PB) - pl.Y(PA), L = Math.hypot(dx, dy) || 1;
        const nx = -dy / L, ny = dx / L, sgn = ny >= 0 ? 1 : -1;       // sisi atas garis
        d.text(pl.X(cV) + nx * sgn * px(10), pl.Y(cP) + ny * sgn * px(10), '3', k === 3 ? 'body' : 'muted', 'sm');
      }
      pl.dot(VA, PA, 4, 'fg'); pl.dot(p.VB, p.PB, 4, 'fg');
      pl.dot(e.V, e.P, 6, 'current');

      // Judul
      const g = Math.round(p.gas) === 1 ? 'monoatomik' : 'diatomik';
      d.text(0.02, 1.15, `Lintasan ${k}: ${PATHS[k]}`, 'fg', 'md', 'left');
      d.text(1.58, 1.15, g, 'muted', 'sm', 'right');

      // Silinder kecil
      const h = CYL.h * e.V / V_AX;
      withAlpha(ctx, 0.35, () => d.rect(CYL.x, CYL.y, CYL.w, h, d.heat((e.T - T_MIN) / (T_MAX - T_MIN))));
      d.polyline([[CYL.x, CYL.y + CYL.h + 0.02], [CYL.x, CYL.y], [CYL.x + CYL.w, CYL.y], [CYL.x + CYL.w, CYL.y + CYL.h + 0.02]], 'fg', 2.5);
      d.rect(CYL.x + 0.003, CYL.y + h, CYL.w - 0.006, PIST, 'muted');
      d.line(CYL.x + CYL.w / 2, CYL.y + h + PIST, CYL.x + CYL.w / 2, CYL.y + h + PIST + ROD, 'fg', 2.5);
      if (s.u > 0 && s.u < 1) {                        // arah kalor sesaat
        const a = energies(p, k, Math.max(0, s.u - 0.005)), b = e;       // selisih mundur: kalor yang baru saja mengalir
        const dQ = b.Q - a.Q, cx = CYL.x + CYL.w / 2, tiny = 1e-6 * (1 + Math.abs(e.Q));
        if (dQ > tiny) [-0.05, 0.05].forEach(o => flame(d, cx + o, CYL.y - 0.1, 0.05));
        else if (dQ < -tiny) [-0.05, 0.05].forEach(o => snow(d, cx + o, CYL.y - 0.06, 0.025));
      }
      d.text(1.58, 1.06, `T = ${e.T.toFixed(0)} K`, 'fg', 'sm', 'right');
      d.text(1.58, 1.0, `V = ${e.V.toFixed(1)} L`, 'fg', 'sm', 'right');

      // Batang Q, W, ΔU untuk lintasan terpilih (skala: nilai terbesar tabel)
      const fin = [1, 2, 3].map(j => energies(p, j, 1));
      let big = 1;                                     // nilai |Q|, |W|, |ΔU| terbesar di sepanjang lintasan terpilih
      for (let i = 0; i <= 40; i++) {
        const f = energies(p, k, i / 40);
        big = Math.max(big, Math.abs(f.Q), Math.abs(f.W), Math.abs(f.dU));
      }
      const barItems = [['Q', e.Q, 'vector'], ['W', e.W, 'body'], ['ΔU', e.dU, 'total']];
      d.line(BARS.x0, 0.07, BARS.x0, 0.31, 'muted', 1);
      barItems.forEach(([t, val, col], i) => {
        const y = BARS.rows[i], w = BARS.half * val / big;
        d.rect(Math.min(BARS.x0, BARS.x0 + w), y - BARS.th / 2, Math.abs(w), BARS.th, col);
        d.text(BARS.x0 - BARS.half - 0.02, y, t, 'fg', 'sm', 'right');
      });
      d.text(BARS.x0 - BARS.half * 0.5, 0.35, '−', 'muted', 'sm');
      d.text(BARS.x0 + BARS.half * 0.5, 0.35, '+', 'muted', 'sm');

      // Tabel nilai akhir tiga lintasan (analitik)
      const cols = [0.46, 0.68, 0.9], rows = [0.255, 0.19, 0.125];
      d.text(0.03, 0.32, 'lintasan', 'muted', 'sm', 'left');
      ['W (J)', 'Q (J)', 'ΔU (J)'].forEach((t, i) => d.text(cols[i], 0.32, t, 'muted', 'sm', 'right'));
      fin.forEach((f, j) => {
        const col = j + 1 === k ? 'body' : 'muted';
        d.text(0.03, rows[j], `${j + 1}${j + 1 === k ? ' ◀' : ''}`, col, 'sm', 'left');
        [f.W, f.Q, f.dU].forEach((val, i) => d.text(cols[i], rows[j], fmtJ(val), col, 'sm', 'right'));
      });
      d.text(0.02, 0.04, 'W oleh gas · Q masuk gas · ΔU = Q − W', 'muted', 'sm', 'left');
    }
  });
})();
