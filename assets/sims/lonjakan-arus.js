/* Lonjakan arus (inrush) saat mengisi kapasitor kosong (Rangkaian Transien)
 * Asumsi model:
 *  - Sumber tetap 12 V menyuplai kapasitor besar C lewat hambatan kawat/ESR R_w (kecil) dan resistor pembatas
 *    R_pre (0 = tanpa pembatas), melalui saklar. Kapasitor awalnya kosong.
 *  - i = (V − v_C)/(R_w + R_pre): puncak V/(R_w+R_pre) tepat saat saklar ditutup, meluruh dengan τ = (R_w+R_pre)C.
 *  - Sekering dengan arus nominal I_f: putus bila i > 5·I_f (lebur cepat); ditampilkan sebagai keadaan.
 *  - Puncak sesungguhnya bisa lebih sempit dari cuplikan grafik, jadi grafik menahan puncak selama 0,5 ms.
 *  - Diselesaikan eksak per langkah. Diputar lambat 1000×.
 * Animasi: titik muatan sebanding arus (0,8 mm/s tampilan per A).
 */
(function () {
  const TS = 1e-3;
  const K = 0.0008;
  const V = 12;
  const TAU_HOLD = 0.5e-3;
  const FUSE_K = 5;                       // lebur bila i > 5 × I_f

  const Rtot = p => p.Rw + p.Rpre;
  const current = (st, p) => (p.sw >= 1 && !st.blown ? (V - st.v) / Rtot(p) : 0);

  SimCore.register({
    api: 1,
    id: 'lonjakan-arus',
    title: 'Lonjakan arus saat mengisi kapasitor kosong',
    aspect: 4 / 3,
    view: { x: [-0.5, 2.3], y: [-0.55, 1.5] },
    dt: 1 / 240 * TS,
    timeScale: TS,

    params: [
      { key: 'sw', label: 'Saklar (0 buka, 1 tutup)', symbol: '', unit: '', min: 0, max: 1, step: 1, value: 0 },
      { key: 'C', label: 'Kapasitor', symbol: 'C', unit: 'µF', min: 100, max: 4700, step: 100, value: 1000 },
      { key: 'Rw', label: 'Hambatan kawat + ESR', symbol: 'R_w', unit: 'Ω', min: 0.05, max: 2, step: 0.05, value: 0.1 },
      { key: 'Rpre', label: 'Resistor pembatas', symbol: 'R_pre', unit: 'Ω', min: 0, max: 50, step: 0.5, value: 0 },
      { key: 'If', label: 'Sekering nominal', symbol: 'I_f', unit: 'A', min: 0.5, max: 20, step: 0.5, value: 5 }
    ],

    graphs: [
      { title: 'Arus', unit: 'A', min: 0, window: 10e-3, series: [
        { key: 'iHold', label: 'puncak', color: 'vector' },
        { key: 'i', label: 'sesaat', color: 'current' },
        { key: 'ifuse', label: '5·I_f', color: 'muted' }
      ] },
      { title: 'Tegangan kapasitor', unit: 'V', min: 0, window: 10e-3, series: [{ key: 'v', label: 'v_C', color: 'voltage' }] },
      { title: 'Daya di R_w + R_pre', unit: 'W', min: 0, window: 10e-3, series: [{ key: 'P', label: 'i²R', color: 'ke' }] }
    ],

    init(p) { return { v: 0, q: 0, hold: 0, blown: false }; },

    step(st, p, dt) {
      if (p.sw >= 1 && !st.blown) {
        const tau = Rtot(p) * p.C * 1e-6;
        st.v = V + (st.v - V) * Math.exp(-dt / tau);
      }
      const i = current(st, p);
      if (i > FUSE_K * p.If) st.blown = true;
      st.hold = Math.max(i, st.hold * Math.exp(-dt / TAU_HOLD));
      st.q += i * K * dt / TS;
    },

    measure(st, p) {
      const i = current(st, p);
      return { i, iHold: st.hold, ifuse: FUSE_K * p.If, v: st.v, P: i * i * Rtot(p) };
    },

    positions() { return [[0, 0], [1.9, 1]]; },

    draw(ctx, st, p, v, d) {
      const on = p.sw >= 1, i = current(st, p);
      d.source(0, 0, 0, 1, `${V} V`, false, -1);
      d.wire([[0, 1], [0.25, 1]]);
      d.switch(0.25, 1, 0.6, 1, on, on ? 'tutup' : 'buka', 1);
      // Sekering: kotak kecil
      d.wire([[0.6, 1], [0.7, 1]]);
      d.rect(0.7, 0.96, 0.22, 0.08, st.blown ? 'vector' : 'bg', 'fg');
      d.text(0.81, 1.15, st.blown ? `sekering putus (> ${FUSE_K}·${p.If} A)` : `sekering ${p.If} A`, st.blown ? 'vector' : 'muted', 'sm');
      d.wire([[0.92, 1], [1.05, 1]]);
      d.resistor(1.05, 1, 1.45, 1, `R_w ${p.Rw.toFixed(2)} Ω`, 1);
      d.resistor(1.45, 1, 1.9, 1, p.Rpre > 0 ? `R_pre ${p.Rpre.toFixed(1)} Ω` : 'R_pre = 0', 1);
      d.capacitor(1.9, 1, 1.9, 0, `C = ${p.C} µF`, 1);
      d.wire([[1.9, 0], [0, 0]]);
      d.ground(0.95, 0);
      d.flow([[0, 0], [0, 1], [1.9, 1], [1.9, 0], [0, 0]], st.q);

      d.text(0.95, 0.6, `i = ${i.toFixed(2)} A`, 'current', 'md');
      d.text(0.95, 0.45, `v_C = ${st.v.toFixed(2)} V`, 'voltage', 'sm');
      d.text(0.95, -0.22, `puncak = V/(R_w+R_pre) = ${(V / Rtot(p)).toFixed(1)} A · τ = ${(Rtot(p) * p.C * 1e-6 * 1e3).toFixed(2)} ms`, 'fg', 'sm');
      d.text(0.95, -0.36, 'Tutup saklar dengan kapasitor kosong; Ulang untuk mengosongkan lagi', 'muted', 'sm');
    }
  });
})();
