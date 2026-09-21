/* Hambatan dalam sumber (Rangkaian DC)
 * Asumsi model:
 *  - Baterai = GGL ε ideal seri hambatan dalam r; beban R_L. Kawat tanpa hambatan; keadaan tunak.
 *  - I = ε/(r+R_L); tegangan terminal V = ε − I r = ε R_L/(r+R_L).
 *  - Daya beban P_L = I²R_L, rugi dalam P_r = I²r. Sisipan: garis V–I (lereng −r, potong ε) dengan titik kerja.
 * Animasi: titik muatan sebanding arus (8 mm/s per 100 mA).
 * Satuan internal SI; penggeser dalam V dan Ω, grafik dalam V, A dan W.
 */
(function () {
  const K = 0.08;                         // m/s per A

  const solve = p => {
    const I = p.E / (p.r + p.RL), V = p.E - I * p.r;
    return { I, V, PL: I * I * p.RL, Pr: I * I * p.r };
  };

  SimCore.register({
    api: 1,
    id: 'hambatan-dalam',
    title: 'Hambatan dalam sumber tegangan',
    aspect: 16 / 9,
    view: { x: [-0.55, 3.15], y: [-0.55, 1.55] },
    dt: 1 / 240,

    params: [
      { key: 'E', label: 'GGL', symbol: 'ε', unit: 'V', min: 0, max: 12, step: 0.1, value: 9 },
      { key: 'r', label: 'Hambatan dalam', symbol: 'r', unit: 'Ω', min: 0, max: 10, step: 0.1, value: 1 },
      { key: 'RL', label: 'Beban', symbol: 'R_L', unit: 'Ω', min: 0.5, max: 50, step: 0.5, value: 10 }
    ],

    graphs: [
      { title: 'Tegangan terminal', unit: 'V', min: 0, series: [
        { key: 'V', label: 'V', color: 'voltage' },
        { key: 'E', label: 'ε', color: 'muted' }
      ] },
      { title: 'Arus', unit: 'A', min: 0, series: [{ key: 'I', label: 'I', color: 'current' }] },
      { title: 'Daya', unit: 'W', min: 0, series: [
        { key: 'PL', label: 'P_L', color: 'body2' },
        { key: 'Pr', label: 'P_r', color: 'vector' }
      ] }
    ],

    init(p) { return { q: 0 }; },
    step(st, p, dt) { st.q += solve(p).I * K * dt; },
    measure(st, p) { const s = solve(p); return { V: s.V, E: p.E, I: s.I, PL: s.PL, Pr: s.Pr }; },
    positions() { return [[0, 0], [1.6, 1]]; },

    draw(ctx, st, p, v, d) {
      const s = solve(p);
      // Baterai (kotak putus-putus): ε dan r seri
      d.polyline([[-0.3, -0.2], [0.45, -0.2], [0.45, 1.25], [-0.3, 1.25], [-0.3, -0.2]], 'grid', 1);
      d.text(0.08, 1.35, 'baterai', 'muted', 'sm');
      d.source(0, 0, 0, 0.55, `ε = ${p.E.toFixed(1)} V`, false, -1);
      d.resistor(0, 0.55, 0, 1, `r = ${p.r.toFixed(1)} Ω`, -1);
      d.wire([[0, 1], [1.6, 1]]);
      d.resistor(1.6, 1, 1.6, 0, `R_L = ${p.RL.toFixed(1)} Ω`, 1);
      d.wire([[1.6, 0], [0, 0]]);
      d.node(0.45, 1); d.node(0.45, 0);
      d.text(0.45, 1.12, 'terminal +', 'muted', 'sm'); d.text(0.45, -0.12, 'terminal −', 'muted', 'sm');
      d.flow([[0, 0], [0, 1], [1.6, 1], [1.6, 0], [0, 0]], st.q);
      d.text(1.0, 0.5, `V = ${s.V.toFixed(2)} V`, 'voltage', 'md');
      d.text(1.0, 0.35, `I = ${s.I.toFixed(2)} A`, 'current', 'sm');
      d.text(1.0, 0.2, `rugi dalam ${s.Pr.toFixed(2)} W dari ${(s.PL + s.Pr).toFixed(2)} W`, 'muted', 'sm');

      // Sisipan: V terhadap I, garis V = ε − I r; sumbu I sampai arus hubung singkat (r > 0)
      const ox = 2.2, oy = 0.05, W = 0.8, H = 1.1;
      const Isc = p.r > 0 ? p.E / p.r : Math.max(s.I * 2, 1), Imax = Math.max(Isc, 1e-9), Vmax = Math.max(p.E, 1e-9);
      d.line(ox, oy, ox + W, oy, 'muted', 1); d.line(ox, oy, ox, oy + H, 'muted', 1);
      d.line(ox, oy + H, ox + W * Math.min(1, Isc / Imax), oy + H * (p.E - Math.min(Isc, Imax) * p.r) / Vmax, 'voltage', 2);
      d.dot(ox + W * s.I / Imax, oy + H * s.V / Vmax, 5, 'current');
      d.text(ox - 0.05, oy + H, `ε`, 'muted', 'sm', 'right');
      d.text(ox + W, oy - 0.1, p.r > 0 ? `I_hs = ${Isc.toFixed(1)} A` : 'I', 'muted', 'sm', 'right');
      d.text(ox + W / 2, oy + H + 0.12, 'V terhadap I (lereng −r)', 'fg', 'sm');
    }
  });
})();
