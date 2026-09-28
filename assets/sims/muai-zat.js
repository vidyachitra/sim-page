/* Pemuaian zat padat, cair, dan gas (Kalor › Pemuaian)
 * Asumsi model:
 *  - Benda mula-mula 20 °C. Suhunya mengikuti suhu pemanas secara eksponensial eksak,
 *    T ← T_p + (T − T_p)·e^(−Δt/τ), τ = 2 s (benda kecil, kontak termal baik).
 *  - Zat padat (batang, pelat, kubus): pemuaian linear buku teks, ΔL = αL₀ΔT, ΔA = 2αA₀ΔT,
 *    ΔV = 3αV₀ΔT; α tetap (tak bergantung suhu). L₀ = 1 m, A₀ = 1 m², V₀ = 1 m³.
 *  - Cairan: air raksa γ = 1,82×10⁻⁴ /K dalam labu kaca γ_kaca = 2,7×10⁻⁵ /K (= 3α kaca, α = 9×10⁻⁶).
 *    Muai semu ΔV_semu = (γ − γ_kaca)V₀ΔT naik ke pipa kapiler: V₀ = 2 cm³, diameter kapiler 1,2 mm,
 *    jadi kenaikan kolom Δh = ΔV_semu/A_kapiler (penguatan nyata ±1770×, bukan perbesaran gambar).
 *  - Gas ideal pada tekanan tetap (piston berbeban, hukum Charles): V/V₀ = T/T₀ dalam kelvin.
 *  - α dari slider hanya dipakai untuk zat padat.
 * Integrator: pembaruan eksponensial eksak untuk T; ukuran benda dihitung langsung dari T.
 * Skala visual (bukan besaran fisis): pertambahan panjang zat padat digambar MAG = 100× lebih besar;
 * gambar cairan dan gas tanpa perbesaran (kolom kapiler dalam cm nyata). Warna: d.heat untuk
 * T_MIN = 0 °C … T_MAX = 300 °C.
 */
(function () {
  const T0 = 20;             // °C, suhu awal dan suhu acuan (ukuran L₀, A₀, V₀)
  const TAU = 2;             // s, tetapan waktu pemanasan
  const KELVIN = 273.15;
  const MAG = 100;           // perbesaran gambar pertambahan panjang zat padat
  const T_MIN = 0, T_MAX = 300;   // °C, rentang skala warna
  const GAMMA_HG = 1.82e-4;  // /K, air raksa
  const GAMMA_GLASS = 2.7e-5;// /K, kaca (3 × 9×10⁻⁶)
  const V_BULB = 2e-6;       // m³, volume labu (2 cm³)
  const A_CAP = Math.PI * 0.6e-3 * 0.6e-3;   // m², kapiler diameter 1,2 mm
  const MODES = ['batang (muai panjang)', 'pelat (muai luas)', 'kubus (muai volume)',
    'cairan: air raksa dalam labu kaca', 'gas pada tekanan tetap'];
  const SYM = ['ΔL/L₀', 'ΔA/A₀', 'ΔV/V₀', 'ΔV/V₀', 'ΔV/V₀'];
  const Y_MAX = [1, 2, 3, 6, 100];           // %, batas atas sumbu inset per wujud

  // Gambar (satuan dunia = satuan gambar, tidak berskala meter)
  const ROD = { x: 0.35, y: 0.95, L: 1.1, h: 0.14 };
  const PLATE = { x: 0.45, y: 0.62, s: 0.9 };
  const CUBE = { x: 0.45, y: 0.62, s: 0.72, k: 0.42 };     // k: kedalaman oblik relatif sisi
  const BULB = { x: 1.1, y: 0.95, r: 0.33 };
  const CAP = { w: 0.07, y0: 1.45, perCm: 0.11 };           // tinggi gambar per cm kolom nyata
  const CYL = { x: 0.55, y: 0.6, w: 1.1, H: 1.75, h0: 0.78 };

  const mode = p => Math.max(1, Math.min(5, Math.round(p.mode)));
  const fmt = (x, n) => x.toFixed(n).replace('-', '−').replace('.', ',');
  const heatF = T => (T - T_MIN) / (T_MAX - T_MIN);

  // Perubahan relatif (tanpa satuan) pada selisih suhu dT untuk tiap wujud.
  function rel(m, alpha, dT) {
    if (m === 1) return alpha * dT;
    if (m === 2) return 2 * alpha * dT;
    if (m === 3) return 3 * alpha * dT;
    if (m === 4) return GAMMA_HG * dT;
    return dT / (T0 + KELVIN);                  // Charles: (T − T₀)/T₀ dalam K
  }
  const capRise = dT => (GAMMA_HG - GAMMA_GLASS) * V_BULB * dT / A_CAP;   // m
  const solidScale = (p, dT) => 1 + MAG * p.alpha * 1e-6 * dT;             // faktor gambar sisi

  function endPoint(s, p) {
    const m = mode(p), dT = s.T - T0;
    if (m === 1) return [ROD.x + ROD.L * solidScale(p, dT), ROD.y + ROD.h];
    if (m === 2) { const a = PLATE.s * solidScale(p, dT); return [PLATE.x + a, PLATE.y + a]; }
    if (m === 3) { const a = CUBE.s * solidScale(p, dT), k = a * CUBE.k * Math.SQRT1_2; return [CUBE.x + a + k, CUBE.y + a + k]; }
    if (m === 4) return [BULB.x, CAP.y0 + capRise(dT) * 100 * CAP.perCm];
    return [CYL.x + CYL.w, CYL.y + CYL.h0 * (s.T + KELVIN) / (T0 + KELVIN)];
  }

  SimCore.register({
    api: 1,
    id: 'muai-zat',
    title: 'Pemuaian zat padat, cair, dan gas',
    aspect: 4 / 3,
    view: { x: [0, 4], y: [0, 3] },
    dt: 1 / 120,

    params: [
      { key: 'mode', label: 'Wujud (1 batang · 2 pelat · 3 kubus · 4 cairan · 5 gas)', symbol: '', unit: '', min: 1, max: 5, step: 1, value: 1, resets: true },
      { key: 'alpha', label: 'Koefisien muai panjang', symbol: 'α', unit: '×10⁻⁶ /K', min: 1, max: 30, step: 1, value: 12 },
      { key: 'Th', label: 'Suhu pemanas', symbol: 'T_p', unit: '°C', min: 0, max: 300, step: 5, value: 200 }
    ],

    graphs: [
      { title: 'Suhu', unit: '°C', series: [
        { key: 'T', label: 'T', color: 'hot', digits: 1 },
        { key: 'Th', label: 'T_p', color: 'muted', digits: 0 }
      ] },
      { title: 'Perubahan relatif', unit: '%', series: [{ key: 'rel', label: 'ΔX/X₀', color: 'body', digits: 3 }] }
    ],

    init(p) { return { T: T0, t: 0 }; },

    step(s, p, dt) {
      s.T = p.Th + (s.T - p.Th) * Math.exp(-dt / TAU);
      s.t += dt;
    },

    measure(s, p) {
      return { T: s.T, Th: p.Th, rel: 100 * rel(mode(p), p.alpha * 1e-6, s.T - T0) };
    },

    positions(s, p) { return [endPoint(s, p)]; },

    draw(ctx, s, p, v, d) {
      const m = mode(p), dT = s.T - T0, a = p.alpha * 1e-6, r = rel(m, a, dT);
      const col = d.heat(heatF(s.T));
      const solid = m <= 3;

      d.text(0.1, 2.86, `${m}. ${MODES[m - 1]}`, 'fg', 'md', 'left');
      d.text(0.1, 2.64, solid ? `pertambahan diperbesar ${MAG}× · garis = ukuran awal (20 °C)`
        : m === 4 ? 'kolom kapiler dalam cm nyata (tanpa perbesaran)' : 'tanpa perbesaran · garis = volume awal (20 °C)',
        'muted', 'sm', 'left');

      // pemanas
      d.rect(0.2, 0.22, 2.2, 0.16, d.heat(heatF(p.Th)), 'fg');
      d.text(1.3, 0.1, `pemanas ${fmt(p.Th, 0)} °C`, 'muted', 'sm');

      if (m === 1) {
        const L = ROD.L * solidScale(p, dT);
        d.rect(ROD.x - 0.1, ROD.y - 0.25, 0.1, 0.64, 'grid', 'fg');                 // penjepit
        d.rect(ROD.x, ROD.y, L, ROD.h, col);
        d.polyline([[ROD.x, ROD.y], [ROD.x + ROD.L, ROD.y], [ROD.x + ROD.L, ROD.y + ROD.h], [ROD.x, ROD.y + ROD.h]], 'fg', 1.5);
        d.line(ROD.x + ROD.L, ROD.y - 0.12, ROD.x + ROD.L, ROD.y + ROD.h + 0.12, 'fg', 1);
        d.text(ROD.x + ROD.L / 2, ROD.y - 0.14, 'L₀ = 1 m', 'muted', 'sm');
        d.line(ROD.x + 0.2, 0.4, ROD.x + 0.2, ROD.y, 'grid', 2);                          // penyangga
      } else if (m === 2) {
        const A = PLATE.s * solidScale(p, dT), x = PLATE.x, y = PLATE.y;
        d.rect(x, y, A, A, col);
        d.polyline([[x, y], [x + PLATE.s, y], [x + PLATE.s, y + PLATE.s], [x, y + PLATE.s], [x, y]], 'fg', 1.5);
      } else if (m === 3) {
        const cube = (sd, fill, outline) => {
          const x = CUBE.x, y = CUBE.y, k = sd * CUBE.k * Math.SQRT1_2;
          const front = [[x, y], [x + sd, y], [x + sd, y + sd], [x, y + sd]];
          const top = [[x, y + sd], [x + sd, y + sd], [x + sd + k, y + sd + k], [x + k, y + sd + k]];
          const side = [[x + sd, y], [x + sd + k, y + k], [x + sd + k, y + sd + k], [x + sd, y + sd]];
          if (fill) { d.polygon(side, fill, 'fg', 1); d.polygon(top, fill, 'fg', 1); d.polygon(front, fill, 'fg', 1); }
          if (outline) [front, top, side].forEach(q => d.polyline(q.concat([q[0]]), outline, 1.5));
        };
        const sd = CUBE.s * solidScale(p, dT);
        cube(sd, col, null);
        cube(CUBE.s, null, 'fg');
      } else if (m === 4) {
        const hCm = capRise(dT) * 100, yl = CAP.y0 + hCm * CAP.perCm, top = CAP.y0 + 9 * CAP.perCm;
        const cx = BULB.x, hw = CAP.w / 2;
        d.circle(cx, BULB.y, BULB.r, col);
        d.rect(cx - hw, BULB.y + BULB.r - 0.05, CAP.w, yl - (BULB.y + BULB.r - 0.05), col);
        d.circle(cx, BULB.y, BULB.r, 'fg', false, 2);
        d.line(cx - hw, BULB.y + BULB.r - 0.02, cx - hw, top, 'fg', 2);
        d.line(cx + hw, BULB.y + BULB.r - 0.02, cx + hw, top, 'fg', 2);
        for (let c = 0; c <= 8; c++) {                                               // penggaris cm
          const y = CAP.y0 + c * CAP.perCm;
          d.line(cx + hw + 0.03, y, cx + hw + (c % 2 ? 0.08 : 0.13), y, 'muted', 1);
          if (c % 2 === 0) d.text(cx + hw + 0.17, y, `${c}`, 'muted', 'sm', 'left');
        }
        d.text(cx + hw + 0.17, top + 0.02, 'cm', 'muted', 'sm', 'left');
        d.line(cx - hw - 0.1, CAP.y0, cx - hw - 0.02, CAP.y0, 'fg', 2);
        d.text(cx - hw - 0.13, CAP.y0, '20 °C', 'muted', 'sm', 'right');
        d.text(cx - hw - 0.13, yl + 0.02, `Δh = ${fmt(hCm, 1)} cm`, 'fg', 'sm', 'right');
        d.text(cx + BULB.r + 0.08, BULB.y, `V₀ = 2 cm³`, 'muted', 'sm', 'left');
      } else {
        const h = CYL.h0 * (s.T + KELVIN) / (T0 + KELVIN), x = CYL.x, y = CYL.y, w = CYL.w;
        d.rect(x, y, w, h, col);
        d.polyline([[x - 0.04, y + CYL.H], [x - 0.04, y - 0.04], [x + w + 0.04, y - 0.04], [x + w + 0.04, y + CYL.H]], 'fg', 3);
        d.polyline([[x, y + CYL.h0], [x + w, y + CYL.h0]], 'fg', 1.5);
        d.rect(x, y + h, w, 0.08, 'muted', 'fg');                                     // piston
        d.rect(x + w / 2 - 0.2, y + h + 0.08, 0.4, 0.16, 'fg');                       // beban
        d.text(x + w + 0.1, y + h + 0.16, 'p tetap', 'muted', 'sm', 'left');
      }

      // inset: ΔX/X₀ terhadap ΔT
      const ym = Y_MAX[m - 1], lineRel = t => 100 * rel(m, a, t);
      const pl = d.plot({ x: 2.95, y: 1.4, w: 0.95, h: 0.9 }, {
        x: [-20, 280], y: [-0.1 * ym, ym], xticks: [0, 100, 200], yticks: [0, ym / 2, ym],
        xlabel: 'ΔT (K)', ylabel: `${SYM[m - 1]} (%)`, fmt: t => String(+t.toPrecision(3)).replace('.', ',')
      });
      pl.hline(0, 'grid', 1);
      if (m === 4) pl.line([[-20, lineRel(-20) * (1 - GAMMA_GLASS / GAMMA_HG)], [280, lineRel(280) * (1 - GAMMA_GLASS / GAMMA_HG)]], 'muted', 1.5);
      pl.line([[-20, lineRel(-20)], [280, lineRel(280)]], 'body', 2);
      pl.dot(dT, lineRel(dT), 5, 'hot');

      // angka
      const tx = 2.55;
      d.text(tx, 0.98, `T = ${fmt(s.T, 1)} °C · ΔT = ${fmt(dT, 1)} K`, 'fg', 'sm', 'left');
      d.text(tx, 0.8, `${SYM[m - 1]} = ${fmt(100 * r, m === 5 ? 1 : 3)} %`, 'body', 'sm', 'left');
      const abs = [`ΔL = ${fmt(a * dT * 1000, 2)} mm (L₀ = 1 m)`, `ΔA = ${fmt(2 * a * dT * 1e4, 1)} cm² (A₀ = 1 m²)`,
        `ΔV = ${fmt(3 * a * dT * 1e3, 2)} L (V₀ = 1 m³)`, `semu: ${fmt(100 * (GAMMA_HG - GAMMA_GLASS) * dT, 3)} % (γ − γ_kaca)`,
        `V/V₀ = T/T₀ = ${fmt((s.T + KELVIN) / (T0 + KELVIN), 3)}`][m - 1];
      d.text(tx, 0.62, abs, 'fg', 'sm', 'left');
      const note = solid ? ['α (×10⁻⁶ /K): kaca 9, baja 12,', 'kuningan 19, aluminium 23']
        : m === 4 ? ['α tidak dipakai; γ (×10⁻⁶ /K):', 'raksa 182, kaca 27'] : ['α tidak dipakai; gas ideal,', 'tekanan tetap, T dalam kelvin'];
      d.text(tx, 0.44, note[0], 'muted', 'sm', 'left');
      d.text(tx, 0.28, note[1], 'muted', 'sm', 'left');
      // legenda warna
      const lx = 2.72, lw = 0.9, n = 20;
      for (let i = 0; i < n; i++) d.rect(lx + lw * i / n, 0.08, lw / n + 0.003, 0.07, d.heat(i / (n - 1)));
      d.text(lx - 0.03, 0.115, `${T_MIN}`, 'muted', 'sm', 'right');
      d.text(lx + lw + 0.03, 0.115, `${T_MAX} °C`, 'muted', 'sm', 'left');
    }
  });
})();
