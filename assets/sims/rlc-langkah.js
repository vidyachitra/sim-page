/* Respons langkah rangkaian RLC seri (Rangkaian Transien)
 * Asumsi model:
 *  - Sumber langkah V (ditutup pada t = 0), R, L, C seri; kapasitor awalnya kosong, arus awal nol.
 *  - dv_C/dt = i/C, di/dt = (V − v_C − iR)/L; RK4.
 *  - ω₀ = 1/√(LC), ζ = (R/2)√(C/L): ζ < 1 teredam kurang (berosilasi), ζ = 1 kritis, ζ > 1 teredam lebih.
 *  - Waktu nyata: L dalam mH, C dalam µF → periode alami sub-milidetik. Diputar lambat 1000×.
 * Animasi: titik muatan sebanding arus (0,8 cm/s tampilan per A).
 */
(function () {
  const TS = 1e-3;
  const K = 0.008;

  const omega0 = p => 1 / Math.sqrt(p.L * 1e-3 * p.C * 1e-6);
  const zeta = p => (p.R / 2) * Math.sqrt(p.C * 1e-6 / (p.L * 1e-3));
  const energy = (st, p) => ({
    WC: 0.5 * p.C * 1e-6 * st.v * st.v, WL: 0.5 * p.L * 1e-3 * st.i * st.i
  });

  SimCore.register({
    api: 1,
    id: 'rlc-langkah',
    title: 'Respons langkah rangkaian RLC seri',
    aspect: 4 / 3,
    view: { x: [-0.5, 2.05], y: [-0.5, 1.45] },
    dt: 1 / 240 * TS,
    timeScale: TS,

    params: [
      { key: 'V', label: 'Tegangan langkah', symbol: 'V', unit: 'V', min: 0, max: 24, step: 0.5, value: 12, resets: true },
      { key: 'R', label: 'Resistor', symbol: 'R', unit: 'Ω', min: 0, max: 400, step: 5, value: 40 },
      { key: 'L', label: 'Induktor', symbol: 'L', unit: 'mH', min: 1, max: 100, step: 1, value: 10 },
      { key: 'C', label: 'Kapasitor', symbol: 'C', unit: 'µF', min: 0.1, max: 10, step: 0.1, value: 1 }
    ],

    graphs: [
      { title: 'Tegangan kapasitor', unit: 'V', window: 10e-3, series: [
        { key: 'v', label: 'v_C', color: 'voltage' },
        { key: 'V', label: 'V', color: 'muted' }
      ] },
      { title: 'Arus', unit: 'A', window: 10e-3, series: [{ key: 'i', label: 'i', color: 'current', digits: 3 }] },
      { title: 'Energi', unit: 'mJ', min: 0, window: 10e-3, series: [
        { key: 'WC', label: 'kapasitor', color: 'pe', digits: 3 },
        { key: 'WL', label: 'induktor', color: 'ke', digits: 3 },
        { key: 'W', label: 'total', color: 'total', digits: 3 }
      ] }
    ],

    init(p) { return { v: 0, i: 0, t: 0, q: 0 }; },

    step(st, p, dt) {
      const f = (t, y) => [y[1] / (p.C * 1e-6), (p.V - y[0] - y[1] * p.R) / (p.L * 1e-3)];
      const y = SimCore.rk4(f, st.t, [st.v, st.i], dt);
      st.v = y[0]; st.i = y[1]; st.t += dt;
      st.q += st.i * K * dt / TS;
    },

    measure(st, p) {
      const e = energy(st, p);
      return { v: st.v, V: p.V, i: st.i, WC: e.WC * 1e3, WL: e.WL * 1e3, W: (e.WC + e.WL) * 1e3 };
    },

    positions() { return [[0, 0], [1.6, 1]]; },

    draw(ctx, st, p, v, d) {
      const z = zeta(p), w0 = omega0(p);
      const jenis = z < 0.999 ? 'teredam kurang' : z <= 1.001 ? 'teredam kritis' : 'teredam lebih';
      d.source(0, 0, 0, 1, `V = ${p.V.toFixed(1)} V`, false, -1);
      d.resistor(0, 1, 0.8, 1, `R = ${p.R} Ω`, 1);
      d.inductor(0.8, 1, 1.6, 1, `L = ${p.L} mH`, 1);
      d.capacitor(1.6, 1, 1.6, 0, `C = ${p.C.toFixed(1)} µF`, 1);
      d.wire([[1.6, 0], [0, 0]]);
      d.ground(0.8, 0);
      d.flow([[0, 0], [0, 1], [1.6, 1], [1.6, 0], [0, 0]], st.q);

      d.text(0.8, 0.6, `v_C = ${st.v.toFixed(2)} V`, 'voltage', 'md');
      d.text(0.8, 0.45, `i = ${(st.i * 1e3).toFixed(1)} mA`, 'current', 'sm');
      d.text(0.8, -0.22, `ω₀ = ${(w0 / 1e3).toFixed(1)} krad/s · f₀ = ${(w0 / 2 / Math.PI / 1e3).toFixed(2)} kHz`, 'muted', 'sm');
      d.text(0.8, -0.36, `ζ = ${z.toFixed(2)} → ${jenis} (kritis saat R = ${(2 * Math.sqrt(p.L * 1e-3 / (p.C * 1e-6))).toFixed(0)} Ω)`, 'fg', 'sm');
    }
  });
})();
