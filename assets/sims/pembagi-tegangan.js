/* Pembagi tegangan berbeban (Rangkaian DC)
 * Asumsi model:
 *  - Sumber ideal V, dua resistor R₁–R₂, beban R_L paralel dengan R₂. Kawat tanpa hambatan.
 *  - Keadaan tunak (DC): V_out = V·R_p/(R₁+R_p) dengan R_p = R₂‖R_L. Penggeser bekerja langsung.
 *  - R_L pada nilai maksimum penggeser dianggap "hampir tanpa beban".
 * Animasi: titik muatan bergerak sebanding arus cabang (skala 8 mm/s per mA), hanya visual.
 * Satuan internal SI (Ω, A); penggeser dalam kΩ, grafik dalam mA.
 */
(function () {
  const K = 0.008;                       // m/s per mA, kecepatan titik muatan
  const N = [0.9, 1.0];                  // simpul V_out
  const P_SRC = [[0, 0], [0, 1]], P_R1 = [[0.3, 1], [0.9, 1]], P_R2 = [[0.9, 1], [0.9, 0]], P_RL = [[1.5, 1], [1.5, 0]];

  const solve = p => {
    const R1 = p.R1 * 1e3, R2 = p.R2 * 1e3, RL = p.RL * 1e3;
    const Rp = R2 * RL / (R2 + RL);
    const Vout = p.V * Rp / (R1 + Rp), V0 = p.V * R2 / (R1 + R2);
    const i1 = p.V / (R1 + Rp), i2 = Vout / R2, iL = Vout / RL;
    return { Vout, V0, i1, i2, iL };
  };

  SimCore.register({
    api: 1,
    id: 'pembagi-tegangan',
    title: 'Pembagi tegangan dengan beban',
    aspect: 4 / 3,
    view: { x: [-0.5, 2.05], y: [-0.4, 1.4] },
    dt: 1 / 240,

    params: [
      { key: 'V', label: 'Tegangan sumber', symbol: 'V', unit: 'V', min: 0, max: 24, step: 0.5, value: 12 },
      { key: 'R1', label: 'Resistor atas', symbol: 'R₁', unit: 'kΩ', min: 0.1, max: 20, step: 0.1, value: 10 },
      { key: 'R2', label: 'Resistor bawah', symbol: 'R₂', unit: 'kΩ', min: 0.1, max: 20, step: 0.1, value: 10 },
      { key: 'RL', label: 'Beban', symbol: 'R_L', unit: 'kΩ', min: 0.1, max: 100, step: 0.1, value: 100 }
    ],

    graphs: [
      { title: 'Tegangan keluaran', unit: 'V', min: 0, series: [
        { key: 'Vout', label: 'berbeban', color: 'voltage' },
        { key: 'V0', label: 'tanpa beban', color: 'muted' }
      ] },
      { title: 'Arus', unit: 'mA', min: 0, series: [
        { key: 'i1', label: 'i₁', color: 'current' },
        { key: 'i2', label: 'i₂', color: 'body2' },
        { key: 'iL', label: 'i_L', color: 'vector2' }
      ] }
    ],

    init(p) { return { q1: 0, q2: 0, qL: 0 }; },

    step(st, p, dt) {
      const s = solve(p);
      st.q1 += s.i1 * 1e3 * K * dt; st.q2 += s.i2 * 1e3 * K * dt; st.qL += s.iL * 1e3 * K * dt;
    },

    measure(st, p) {
      const s = solve(p);
      return { Vout: s.Vout, V0: s.V0, i1: s.i1 * 1e3, i2: s.i2 * 1e3, iL: s.iL * 1e3 };
    },

    draw(ctx, st, p, v, d) {
      const s = solve(p);
      d.source(0, 0, 0, 1, `V = ${p.V.toFixed(1)} V`, false, -1);
      d.wire([[0, 1], [0.3, 1]]);
      d.resistor(0.3, 1, 0.9, 1, `R₁ = ${p.R1.toFixed(1)} kΩ`, 1);
      d.resistor(0.9, 1, 0.9, 0, `R₂ = ${p.R2.toFixed(1)} kΩ`, -1);
      d.wire([[0.9, 1], [1.5, 1]]);
      d.resistor(1.5, 1, 1.5, 0, `R_L = ${p.RL.toFixed(1)} kΩ`, -1);
      d.wire([[1.5, 0], [0, 0]]);
      d.ground(0.45, 0);
      d.node(0.9, 1); d.node(0.9, 0); d.node(1.5, 0);

      // Titik muatan per cabang (arah searah jarum jam: sumber → R₁ → simpul → R₂/R_L → kembali)
      d.flow([[0, 0], [0, 1], [0.3, 1], [0.9, 1]], st.q1);
      d.flow([[0.9, 1], [0.9, 0], [0.45, 0]], st.q2);
      d.flow([[0.9, 1], [1.5, 1], [1.5, 0], [0.9, 0]], st.qL);

      d.text(0.9, 1.22, `V_out = ${s.Vout.toFixed(2)} V`, 'voltage', 'md');
      d.text(0.9, -0.22, `tanpa beban: ${s.V0.toFixed(2)} V · turun ${(s.V0 - s.Vout).toFixed(2)} V`, 'muted', 'sm');
    }
  });
})();
