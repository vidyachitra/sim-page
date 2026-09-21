/* Ground yang tidak nol: kawat kembali bersama (Rangkaian DC)
 * Sensor (keluaran V_s, arus 10 mA) dan motor (arus I_m berdenyut 1 Hz) memakai kawat kembali yang sama
 * dengan hambatan R_g ke ground catu daya. Pengukur (ADC) mengacu ke ground catu, sensor mengacu ke ground lokal G′.
 * Asumsi model:
 *  - Topologi 0 (bersama): V_G′ = (I_m + I_s) R_g, jadi ADC membaca V_s + V_G′ (galat).
 *  - Topologi 1 (bintang): motor punya kawat kembali sendiri; V_G′ = I_s R_g saja (≈ 0).
 *  - Motor dinyalakan 0,5 s dan dimatikan 0,5 s bergantian; sumber ideal; kawat lain tanpa hambatan.
 * Animasi: titik muatan di kawat kembali sebanding arus (6 mm/s per A).
 * Satuan internal SI; grafik dalam V dan A.
 */
(function () {
  const IS = 0.01;                        // A, arus sensor
  const K = 0.006;                        // m/s per A
  const motorOn = t => (t % 1) < 0.5;

  const solve = (st, p) => {
    const Im = motorOn(st.t) ? p.Im : 0;
    const Ig = p.topo >= 1 ? IS : Im + IS;              // arus lewat kawat bersama
    const VG = Ig * p.Rg;
    return { Im, Ig, VG, Vread: p.Vs + VG };
  };

  SimCore.register({
    api: 1,
    id: 'ground-tidak-nol',
    title: 'Ground yang tidak nol karena kawat kembali bersama',
    aspect: 16 / 9,
    view: { x: [-0.35, 3.05], y: [-0.72, 1.3] },
    dt: 1 / 240,

    params: [
      { key: 'Im', label: 'Arus motor (saat hidup)', symbol: 'I_m', unit: 'A', min: 0, max: 5, step: 0.1, value: 2 },
      { key: 'Rg', label: 'Hambatan kawat kembali', symbol: 'R_g', unit: 'Ω', min: 0, max: 2, step: 0.05, value: 0.5 },
      { key: 'Vs', label: 'Tegangan sensor', symbol: 'V_s', unit: 'V', min: 0, max: 5, step: 0.1, value: 1 },
      { key: 'topo', label: 'Topologi (0 bersama, 1 bintang)', symbol: '', unit: '', min: 0, max: 1, step: 1, value: 0 }
    ],

    graphs: [
      { title: 'Potensial ground lokal G′', unit: 'V', min: 0, window: 4, series: [{ key: 'VG', label: 'V_G′', color: 'vector' }] },
      { title: 'Tegangan sensor', unit: 'V', min: 0, window: 4, series: [
        { key: 'Vread', label: 'terbaca ADC', color: 'vector' },
        { key: 'Vs', label: 'sebenarnya', color: 'voltage' }
      ] },
      { title: 'Arus motor', unit: 'A', min: 0, window: 4, series: [{ key: 'Im', label: 'I_m', color: 'current' }] }
    ],

    init(p) { return { t: 0, q: 0, qm: 0 }; },
    step(st, p, dt) { st.t += dt; const s = solve(st, p); st.q += s.Ig * K * dt; st.qm += s.Im * K * dt; },
    measure(st, p) { const s = solve(st, p); return { VG: s.VG, Vread: s.Vread, Vs: p.Vs, Im: s.Im }; },
    positions() { return [[0, 0], [2.5, 1]]; },

    draw(ctx, st, p, v, d) {
      const s = solve(st, p), star = p.topo >= 1;
      // Catu daya di kiri, ground sebenarnya G
      d.source(0, 0, 0, 1, '5 V', false, -1);
      d.ground(0, 0); d.text(0.05, -0.6, 'G (ground catu)', 'muted', 'sm', 'left');
      d.wire([[0, 1], [2.5, 1]]);

      // Sensor: kotak di atas-tengah, keluaran ke ADC; acuan sensor = G′
      d.wire([[1.2, 1], [1.2, 0.75]]);
      d.rect(0.95, 0.45, 0.5, 0.3, 'bg', 'fg'); d.text(1.2, 0.6, `sensor ${p.Vs.toFixed(2)} V`, 'fg', 'sm');
      d.wire([[1.2, 0.45], [1.2, 0.2]]);
      // Motor: kotak di kanan
      d.wire([[2.5, 1], [2.5, 0.75]]);
      d.rect(2.25, 0.45, 0.5, 0.3, s.Im > 0 ? 'current' : 'bg', 'fg'); d.text(2.5, 0.6, s.Im > 0 ? `motor ${s.Im.toFixed(1)} A` : 'motor mati', s.Im > 0 ? 'bg' : 'fg', 'sm');
      d.wire([[2.5, 0.45], [2.5, 0.2]]);

      // Ground lokal G′ dan kawat kembali dengan R_g
      d.node(1.2, 0.2); d.text(1.2, 0.08, 'G′', 'vector', 'sm');
      d.resistor(1.2, 0.2, 0.0, 0.2, `R_g = ${p.Rg.toFixed(2)} Ω (kawat)`, -1);
      d.wire([[0, 0.2], [0, 0]]);
      if (star) {                                         // kawat kembali motor sendiri
        d.wire([[2.5, 0.2], [2.5, -0.35], [0, -0.35], [0, 0]]);
        d.text(1.3, -0.45, 'kawat kembali motor terpisah (bintang)', 'muted', 'sm');
        d.flow([[2.5, 0.2], [2.5, -0.35], [0, -0.35]], st.qm);
      } else {
        d.wire([[2.5, 0.2], [1.2, 0.2]]);
        d.flow([[2.5, 0.2], [1.2, 0.2], [0, 0.2]], st.q);
      }

      // ADC mengukur antara keluaran sensor dan G
      d.wire([[1.45, 0.6], [1.85, 0.6]]);
      d.rect(1.85, 0.45, 0.32, 0.3, 'bg', 'voltage'); d.text(2.01, 0.6, 'ADC', 'voltage', 'sm');
      d.wire([[2.01, 0.45], [2.01, 0.3], [1.7, 0.3], [1.7, -0.15], [0, -0.15]], 'voltage', 1);
      d.text(0.85, -0.25, 'acuan ADC = G', 'voltage', 'sm', 'left');
      d.text(1.2, 1.15, `ADC membaca ${s.Vread.toFixed(3)} V  (galat ${(s.VG * 1e3).toFixed(0)} mV)`, s.VG > 0.005 ? 'vector' : 'fg', 'md');
    }
  });
})();
