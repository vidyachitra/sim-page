/* Pengisian dan pengosongan kapasitor RC (Rangkaian Transien)
 * Asumsi model:
 *  - Saklar dua posisi: 1 = kapasitor terhubung ke sumber V lewat R (pengisian), 0 = R dihubung singkat ke
 *    kapasitor (pengosongan). Sumber ideal, kapasitor ideal, kawat tanpa hambatan.
 *  - dv/dt = (V_s − v)/(RC); diselesaikan eksak per langkah (v → V_s + (v − V_s)e^{−dt/τ}).
 *  - Waktu nyata: R dalam kΩ, C dalam µF, τ = RC dalam ms. Diputar lambat 1000× (timeScale 1e-3);
 *    sumbu waktu grafik tetap dalam ms.
 * Animasi: titik muatan sebanding arus (kecepatan tampilan 0,8 cm/s per mA, dalam waktu tampilan).
 */
(function () {
  const TS = 1e-3;                        // detik simulasi per detik tampilan
  const K = 0.008;                        // m/s tampilan per mA

  const tau = p => p.R * 1e3 * p.C * 1e-6;
  const target = p => (p.sw >= 1 ? p.V : 0);
  const current = (st, p) => (target(p) - st.v) / (p.R * 1e3);

  SimCore.register({
    api: 1,
    id: 'rc-transien',
    title: 'Pengisian dan pengosongan kapasitor RC',
    aspect: 4 / 3,
    view: { x: [-0.5, 2.05], y: [-0.5, 1.45] },
    dt: 1 / 240 * TS,
    timeScale: TS,

    params: [
      { key: 'V', label: 'Tegangan sumber', symbol: 'V', unit: 'V', min: 0, max: 24, step: 0.5, value: 12 },
      { key: 'R', label: 'Resistor', symbol: 'R', unit: 'kΩ', min: 0.1, max: 10, step: 0.1, value: 1 },
      { key: 'C', label: 'Kapasitor', symbol: 'C', unit: 'µF', min: 0.1, max: 10, step: 0.1, value: 1 },
      { key: 'sw', label: 'Saklar (0 kosongkan, 1 isi)', symbol: '', unit: '', min: 0, max: 1, step: 1, value: 1 }
    ],

    graphs: [
      { title: 'Tegangan kapasitor', unit: 'V', min: 0, window: 10e-3, series: [
        { key: 'v', label: 'v_C', color: 'voltage' },
        { key: 'V', label: 'V', color: 'muted' }
      ] },
      { title: 'Arus', unit: 'mA', window: 10e-3, series: [{ key: 'i', label: 'i', color: 'current' }] },
      { title: 'Energi kapasitor', unit: 'mJ', min: 0, window: 10e-3, series: [{ key: 'W', label: '½Cv²', color: 'pe', digits: 4 }] }
    ],

    init(p) { return { v: 0, q: 0 }; },

    step(st, p, dt) {
      const Vt = target(p);
      st.v = Vt + (st.v - Vt) * Math.exp(-dt / tau(p));
      st.q += current(st, p) * 1e3 * K * dt / TS;
    },

    measure(st, p) {
      return { v: st.v, V: p.V, i: current(st, p) * 1e3, W: 0.5 * p.C * 1e-6 * st.v * st.v * 1e3 };
    },

    positions() { return [[0, 0], [1.6, 1]]; },

    draw(ctx, st, p, v, d) {
      const i = current(st, p), on = p.sw >= 1;
      d.source(0, 0, 0, 1, `V = ${p.V.toFixed(1)} V`, false, -1);
      d.wire([[0, 1], [0.35, 1]]);
      d.switch(0.35, 1, 0.75, 1, on, on ? 'isi' : 'kosongkan', 1);
      d.wire([[0.75, 1], [1.0, 1]]);
      d.resistor(1.0, 1, 1.6, 1, `R = ${p.R.toFixed(1)} kΩ`, 1);
      d.capacitor(1.6, 1, 1.6, 0, `C = ${p.C.toFixed(1)} µF`, 1);
      d.wire([[1.6, 0], [0, 0]]);
      d.ground(0.8, 0);
      // Posisi "kosongkan": R dihubung singkat ke bawah lewat kawat kiri
      d.wire([[0.75, 1], [0.75, 0.65]], on ? 'grid' : 'fg'); d.wire([[0.75, 0.65], [0.75, 0]], on ? 'grid' : 'fg');
      d.node(0.75, 0);

      const path = on ? [[0, 0], [0, 1], [1.6, 1], [1.6, 0], [0, 0]] : [[0.75, 0], [0.75, 1], [1.6, 1], [1.6, 0], [0.75, 0]];
      d.flow(path, st.q);

      d.text(1.15, 0.55, `v_C = ${st.v.toFixed(2)} V`, 'voltage', 'md');
      d.text(1.15, 0.4, `i = ${(i * 1e3).toFixed(2)} mA`, 'current', 'sm');
      d.text(0.8, -0.3, `τ = RC = ${(tau(p) * 1e3).toFixed(2)} ms · 63 % tercapai setelah 1τ, 99 % setelah 5τ`, 'muted', 'sm');
    }
  });
})();
