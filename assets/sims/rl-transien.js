/* Arus induktor RL: naik dan turun (Rangkaian Transien)
 * Asumsi model:
 *  - Saklar dua posisi: 1 = RL terhubung ke sumber V (arus naik), 0 = RL dihubung singkat (arus meluruh lewat R).
 *    Sumber ideal, induktor ideal (tanpa hambatan belitan), kawat tanpa hambatan.
 *  - di/dt = (V_s − iR)/L; diselesaikan eksak per langkah, τ = L/R. v_L = V_s − iR.
 *  - Waktu nyata: R dalam Ω, L dalam mH, τ dalam ms. Diputar lambat 1000× (timeScale 1e-3).
 * Animasi: titik muatan sebanding arus (0,8 cm/s tampilan per A).
 */
(function () {
  const TS = 1e-3;
  const K = 0.008;                        // m/s tampilan per A

  const tau = p => p.L * 1e-3 / p.R;
  const target = p => (p.sw >= 1 ? p.V : 0);
  const vL = (st, p) => target(p) - st.i * p.R;

  SimCore.register({
    api: 1,
    id: 'rl-transien',
    title: 'Arus induktor pada rangkaian RL',
    aspect: 4 / 3,
    view: { x: [-0.5, 2.05], y: [-0.5, 1.45] },
    dt: 1 / 240 * TS,
    timeScale: TS,

    params: [
      { key: 'V', label: 'Tegangan sumber', symbol: 'V', unit: 'V', min: 0, max: 24, step: 0.5, value: 12 },
      { key: 'R', label: 'Resistor', symbol: 'R', unit: 'Ω', min: 1, max: 100, step: 1, value: 10 },
      { key: 'L', label: 'Induktor', symbol: 'L', unit: 'mH', min: 1, max: 100, step: 1, value: 10 },
      { key: 'sw', label: 'Saklar (0 lepas, 1 hubungkan)', symbol: '', unit: '', min: 0, max: 1, step: 1, value: 1 }
    ],

    graphs: [
      { title: 'Arus', unit: 'A', min: 0, window: 10e-3, series: [
        { key: 'i', label: 'i', color: 'current' },
        { key: 'iInf', label: 'V/R', color: 'muted' }
      ] },
      { title: 'Tegangan', unit: 'V', window: 10e-3, series: [
        { key: 'vL', label: 'v_L', color: 'vector' },
        { key: 'vR', label: 'v_R', color: 'voltage' }
      ] },
      { title: 'Energi induktor', unit: 'mJ', min: 0, window: 10e-3, series: [{ key: 'W', label: '½Li²', color: 'pe', digits: 3 }] }
    ],

    init(p) { return { i: 0, q: 0 }; },

    step(st, p, dt) {
      const iInf = target(p) / p.R;
      st.i = iInf + (st.i - iInf) * Math.exp(-dt / tau(p));
      st.q += st.i * K * dt / TS;
    },

    measure(st, p) {
      return { i: st.i, iInf: p.V / p.R, vL: vL(st, p), vR: st.i * p.R, W: 0.5 * p.L * 1e-3 * st.i * st.i * 1e3 };
    },

    positions() { return [[0, 0], [1.6, 1]]; },

    draw(ctx, st, p, v, d) {
      const on = p.sw >= 1;
      d.source(0, 0, 0, 1, `V = ${p.V.toFixed(1)} V`, false, -1);
      d.wire([[0, 1], [0.35, 1]]);
      d.switch(0.35, 1, 0.75, 1, on, on ? 'hubungkan' : 'lepas', 1);
      d.wire([[0.75, 1], [1.0, 1]]);
      d.resistor(1.0, 1, 1.6, 1, `R = ${p.R} Ω`, 1);
      d.inductor(1.6, 1, 1.6, 0, `L = ${p.L} mH`, 1);
      d.wire([[1.6, 0], [0, 0]]);
      d.ground(0.8, 0);
      d.wire([[0.75, 1], [0.75, 0]], on ? 'grid' : 'fg');
      d.node(0.75, 0);

      const path = on ? [[0, 0], [0, 1], [1.6, 1], [1.6, 0], [0, 0]] : [[0.75, 0], [0.75, 1], [1.6, 1], [1.6, 0], [0.75, 0]];
      d.flow(path, st.q);

      d.text(1.15, 0.55, `i = ${st.i.toFixed(3)} A`, 'current', 'md');
      d.text(1.15, 0.4, `v_L = ${vL(st, p).toFixed(2)} V`, 'vector', 'sm');
      d.text(0.8, -0.3, `τ = L/R = ${(tau(p) * 1e3).toFixed(2)} ms · i tidak dapat melompat: v_L yang melompat`, 'muted', 'sm');
    }
  });
})();
