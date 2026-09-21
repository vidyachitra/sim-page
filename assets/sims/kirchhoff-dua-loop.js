/* Hukum Kirchhoff pada rangkaian dua loop (Rangkaian DC)
 * Asumsi model:
 *  - Dua sumber ideal V₁ (kiri) dan V₂ (kanan), R₁ di loop kiri, R₂ di loop kanan, R₃ di cabang tengah bersama.
 *  - Arus loop I₁ (kiri, searah jarum jam) dan I₂ (kanan, berlawanan jarum jam); arus R₃ ke bawah I₃ = I₁ + I₂.
 *  - KVL: V₁ = I₁R₁ + (I₁+I₂)R₃ ; V₂ = I₂R₂ + (I₁+I₂)R₃. Diselesaikan eksak (2×2). Keadaan tunak.
 * Animasi: titik muatan bergerak sebanding arus cabang (8 mm/s per mA); arah mengikuti tanda arus.
 * Satuan internal SI; penggeser dalam V dan Ω, grafik dalam mA dan V.
 */
(function () {
  const K = 0.008;                       // m/s per mA

  const solve = p => {
    const a = p.R1 + p.R3, b = p.R3, c = p.R3, dd = p.R2 + p.R3;
    const det = a * dd - b * c;
    const I1 = (p.V1 * dd - b * p.V2) / det, I2 = (a * p.V2 - c * p.V1) / det;
    return { I1, I2, I3: I1 + I2 };
  };

  SimCore.register({
    api: 1,
    id: 'kirchhoff-dua-loop',
    title: 'Hukum Kirchhoff pada rangkaian dua loop',
    aspect: 16 / 9,
    view: { x: [-0.55, 2.55], y: [-0.45, 1.3] },
    dt: 1 / 240,

    params: [
      { key: 'V1', label: 'Sumber kiri', symbol: 'V₁', unit: 'V', min: 0, max: 20, step: 0.5, value: 12 },
      { key: 'V2', label: 'Sumber kanan', symbol: 'V₂', unit: 'V', min: 0, max: 20, step: 0.5, value: 6 },
      { key: 'R1', label: 'Resistor kiri', symbol: 'R₁', unit: 'Ω', min: 10, max: 1000, step: 10, value: 200 },
      { key: 'R2', label: 'Resistor kanan', symbol: 'R₂', unit: 'Ω', min: 10, max: 1000, step: 10, value: 300 },
      { key: 'R3', label: 'Resistor tengah', symbol: 'R₃', unit: 'Ω', min: 10, max: 1000, step: 10, value: 100 }
    ],

    graphs: [
      { title: 'Arus cabang', unit: 'mA', series: [
        { key: 'I1', label: 'I₁', color: 'current' },
        { key: 'I2', label: 'I₂', color: 'body2' },
        { key: 'I3', label: 'I₃', color: 'vector2' }
      ] },
      { title: 'Tegangan resistor', unit: 'V', series: [
        { key: 'VR1', label: 'V_R1', color: 'current' },
        { key: 'VR2', label: 'V_R2', color: 'body2' },
        { key: 'VR3', label: 'V_R3', color: 'vector2' }
      ] }
    ],

    init(p) { return { q1: 0, q2: 0, q3: 0 }; },

    step(st, p, dt) {
      const s = solve(p);
      st.q1 += s.I1 * 1e3 * K * dt; st.q2 += s.I2 * 1e3 * K * dt; st.q3 += s.I3 * 1e3 * K * dt;
    },

    measure(st, p) {
      const s = solve(p);
      return { I1: s.I1 * 1e3, I2: s.I2 * 1e3, I3: s.I3 * 1e3, VR1: s.I1 * p.R1, VR2: s.I2 * p.R2, VR3: s.I3 * p.R3 };
    },

    positions() { return [[0, 0], [2, 1]]; },

    draw(ctx, st, p, v, d) {
      const s = solve(p);
      // Loop kiri: V₁ di kiri (+ atas), R₁ di atas; cabang tengah R₃ ke bawah; loop kanan: R₂ di atas, V₂ di kanan (+ atas)
      d.source(0, 0, 0, 1, `V₁ = ${p.V1.toFixed(1)} V`, false, -1);
      d.resistor(0, 1, 1, 1, `R₁ = ${p.R1} Ω`, 1);
      d.resistor(1, 1, 1, 0, `R₃ = ${p.R3} Ω`, 1);
      d.resistor(1, 1, 2, 1, `R₂ = ${p.R2} Ω`, 1);
      d.source(2, 0, 2, 1, `V₂ = ${p.V2.toFixed(1)} V`, false, 1);
      d.wire([[0, 0], [2, 0]]);
      d.ground(1.5, 0);
      d.node(1, 1); d.node(1, 0);

      d.flow([[0, 0], [0, 1], [1, 1]], st.q1);
      d.flow([[2, 0], [2, 1], [1, 1]], st.q2, 'body2');
      d.flow([[1, 1], [1, 0]], st.q3, 'vector2');

      d.text(0.5, 1.2, `I₁ = ${(s.I1 * 1e3).toFixed(1)} mA`, 'current', 'sm');
      d.text(1.5, 1.2, `I₂ = ${(s.I2 * 1e3).toFixed(1)} mA`, 'body2', 'sm');
      d.text(1.2, 0.35, `I₃ = ${(s.I3 * 1e3).toFixed(1)} mA`, 'vector2', 'sm', 'left');
      d.text(1, -0.25, `KVL kiri: ${p.V1.toFixed(1)} − ${(s.I1 * p.R1).toFixed(2)} − ${(s.I3 * p.R3).toFixed(2)} = 0`, 'muted', 'sm');
      d.text(1, -0.37, `KVL kanan: ${p.V2.toFixed(1)} − ${(s.I2 * p.R2).toFixed(2)} − ${(s.I3 * p.R3).toFixed(2)} = 0`, 'muted', 'sm');
    }
  });
})();
