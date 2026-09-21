/* Teorema Thevenin dan Norton (Rangkaian DC)
 * Rangkaian asli (V_s, R₁ seri, R₂ paralel) dan dua rangkaian setaranya digambar berdampingan, semuanya
 * memasok beban R_L yang sama. Tegangan dan arus beban ketiganya identik.
 * Asumsi model:
 *  - V_th = V_s R₂/(R₁+R₂), R_th = R₁‖R₂, I_N = V_th/R_th, R_N = R_th. Sumber ideal, keadaan tunak.
 *  - Daya beban P_L = V_L²/R_L maksimum saat R_L = R_th (transfer daya maksimum); ditampilkan di sisipan.
 * Animasi: titik muatan sebanding arus beban (8 mm/s per mA).
 * Satuan internal SI; penggeser dalam V dan Ω, grafik dalam V, mA dan mW.
 */
(function () {
  const K = 0.008;
  const X0 = [0, 1.9, 3.8];              // posisi tiap rangkaian

  const solve = p => {
    const Vth = p.Vs * p.R2 / (p.R1 + p.R2), Rth = p.R1 * p.R2 / (p.R1 + p.R2);
    const IN = Vth / Rth;
    const VL = Vth * p.RL / (Rth + p.RL), IL = VL / p.RL, PL = VL * IL;
    return { Vth, Rth, IN, VL, IL, PL };
  };

  SimCore.register({
    api: 1,
    id: 'thevenin-norton',
    title: 'Teorema Thevenin dan Norton',
    aspect: 16 / 9,
    view: { x: [-0.35, 5.5], y: [-1.72, 1.25] },
    dt: 1 / 240,

    params: [
      { key: 'Vs', label: 'Tegangan sumber', symbol: 'V_s', unit: 'V', min: 0, max: 24, step: 0.5, value: 12 },
      { key: 'R1', label: 'Resistor seri', symbol: 'R₁', unit: 'Ω', min: 10, max: 1000, step: 10, value: 200 },
      { key: 'R2', label: 'Resistor paralel', symbol: 'R₂', unit: 'Ω', min: 10, max: 1000, step: 10, value: 300 },
      { key: 'RL', label: 'Beban', symbol: 'R_L', unit: 'Ω', min: 10, max: 1000, step: 10, value: 120 }
    ],

    graphs: [
      { title: 'Tegangan beban', unit: 'V', min: 0, series: [
        { key: 'VL', label: 'V_L', color: 'voltage' },
        { key: 'Vth', label: 'V_th', color: 'muted' }
      ] },
      { title: 'Arus beban', unit: 'mA', min: 0, series: [
        { key: 'IL', label: 'I_L', color: 'current' },
        { key: 'IN', label: 'I_N', color: 'muted' }
      ] },
      { title: 'Daya beban', unit: 'mW', min: 0, series: [{ key: 'PL', label: 'P_L', color: 'body2' }] }
    ],

    init(p) { return { q: 0 }; },
    step(st, p, dt) { st.q += solve(p).IL * 1e3 * K * dt; },
    measure(st, p) {
      const s = solve(p);
      return { VL: s.VL, Vth: s.Vth, IL: s.IL * 1e3, IN: s.IN * 1e3, PL: s.PL * 1e3 };
    },
    positions() { return [[0, 0], [5.0, 1]]; },

    draw(ctx, st, p, v, d) {
      const s = solve(p);
      const load = (x, name) => {                       // terminal A–B dan beban di kanan tiap rangkaian
        d.wire([[x + 0.8, 1], [x + 1.2, 1]]); d.wire([[x + 1.2, 0], [x + 0.8, 0]]);
        d.resistor(x + 1.2, 1, x + 1.2, 0, `R_L`, 1);
        d.node(x + 0.8, 1); d.node(x + 0.8, 0);
        d.text(x + 0.8, 1.12, 'A', 'muted', 'sm'); d.text(x + 0.8, -0.12, 'B', 'muted', 'sm');
        d.flow([[x + 0.8, 1], [x + 1.2, 1], [x + 1.2, 0], [x + 0.8, 0]], st.q);
        d.text(x + 0.6, -0.3, name, 'fg', 'md');
      };

      // Asli
      let x = X0[0];
      d.source(x, 0, x, 1, `${p.Vs.toFixed(1)} V`, false, -1);
      d.resistor(x, 1, x + 0.8, 1, `R₁ ${p.R1} Ω`, 1);
      d.resistor(x + 0.45, 1, x + 0.45, 0, `R₂ ${p.R2}`, -1);
      d.wire([[x, 0], [x + 0.8, 0]]);
      d.node(x + 0.45, 1); d.node(x + 0.45, 0);
      load(x, 'Asli');

      // Thevenin
      x = X0[1];
      d.source(x, 0, x, 1, 'V_th', false, -1);
      d.resistor(x, 1, x + 0.8, 1, `R_th ${s.Rth.toFixed(0)} Ω`, 1);
      d.wire([[x, 0], [x + 0.8, 0]]);
      load(x, 'Setara Thevenin');

      // Norton: sumber arus (lingkaran dengan panah) paralel R_N
      x = X0[2];
      d.wire([[x, 0], [x, 0.42]]); d.wire([[x, 0.58], [x, 1]]);
      d.circle(x, 0.5, 0.08, 'bg'); d.circle(x, 0.5, 0.08, 'fg', false, 2);
      d.arrow(x, 0.44, 0, 0.12, 'fg');
      d.text(x - 0.12, 0.5, 'I_N', 'muted', 'sm', 'right');
      d.wire([[x, 1], [x + 0.8, 1]]); d.wire([[x, 0], [x + 0.8, 0]]);
      d.resistor(x + 0.45, 1, x + 0.45, 0, `R_N ${s.Rth.toFixed(0)}`, 1);
      d.node(x + 0.45, 1); d.node(x + 0.45, 0);
      load(x, 'Setara Norton');

      d.text(2.6, -0.5, `V_th = ${s.Vth.toFixed(2)} V · R_th = R_N = ${s.Rth.toFixed(0)} Ω · I_N = ${(s.IN * 1e3).toFixed(1)} mA`, 'muted', 'sm');
      d.text(2.6, -0.68, `ketiganya: V_L = ${s.VL.toFixed(2)} V · I_L = ${(s.IL * 1e3).toFixed(1)} mA · P_L = ${(s.PL * 1e3).toFixed(1)} mW`, 'voltage', 'md');

      // Sisipan: P_L terhadap R_L, maksimum di R_L = R_th
      const ox = 0.3, oy = -1.6, W = 4.8, H = 0.6, RLmax = 1000;
      const PLof = RL => { const VL = s.Vth * RL / (s.Rth + RL); return VL * VL / RL; };
      const Pmax = PLof(s.Rth) || 1e-9;
      d.line(ox, oy, ox + W, oy, 'muted', 1); d.line(ox, oy, ox, oy + H, 'muted', 1);
      const pts = [];
      for (let i = 1; i <= 100; i++) { const RL = RLmax * i / 100; pts.push([ox + W * i / 100, oy + H * PLof(RL) / Pmax]); }
      d.polyline(pts, 'body2', 2);
      d.dot(ox + W * p.RL / RLmax, oy + H * s.PL / Pmax, 5, 'current');
      d.line(ox + W * s.Rth / RLmax, oy, ox + W * s.Rth / RLmax, oy + H, 'grid', 1);
      d.text(ox + W * s.Rth / RLmax, oy + H + 0.1, `P_L maks ${(Pmax * 1e3).toFixed(1)} mW di R_L = R_th = ${s.Rth.toFixed(0)} Ω`, 'muted', 'sm', s.Rth / RLmax < 0.3 ? 'left' : 'center');
      d.text(ox + W, oy - 0.09, 'R_L (0 … 1000 Ω)', 'muted', 'sm', 'right');
      d.text(ox - 0.05, oy + H, 'P_L', 'muted', 'sm', 'right');
    }
  });
})();
