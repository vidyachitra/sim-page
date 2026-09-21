/* Penguat op-amp inverting dan non-inverting (Elektronika Dasar)
 * Asumsi model:
 *  - Op-amp ideal (penguatan lingkar terbuka tak hingga, arus masukan nol) dengan batas keluaran ±V_cc (jenuh).
 *  - Inverting: v_out = −(R_f/R_in) v_in; simpul (−) = ground maya selama tidak jenuh. Saat jenuh,
 *    v(−) = (v_in R_f + v_out R_in)/(R_in + R_f) (superposisi): ground maya "hilang".
 *  - Non-inverting: v_out = (1 + R_f/R_in) v_in; v(−) = v_out R_in/(R_in + R_f) mengikuti v(+) = v_in.
 *  - Sumber sinus 1 kHz. Diputar lambat 1000×. Satuan internal SI; penggeser dalam kΩ, grafik dalam mA.
 */
(function () {
  const TS = 1e-3;
  const F = 1e3, W = 2 * Math.PI * F;

  const vin = (t, p) => p.Vm * Math.sin(W * t);
  const solve = (t, p) => {
    const vi = vin(t, p), Rf = p.Rf * 1e3, Rin = p.Rin * 1e3, ni = p.jenis >= 1;
    const ideal = ni ? (1 + Rf / Rin) * vi : -(Rf / Rin) * vi;
    const vo = Math.max(-p.Vcc, Math.min(p.Vcc, ideal));
    const sat = Math.abs(ideal) > p.Vcc;
    const vminus = ni ? vo * Rin / (Rin + Rf) : (vi * Rf + vo * Rin) / (Rin + Rf);
    const vplus = ni ? vi : 0;
    const iin = ni ? -vminus / Rin : (vi - vminus) / Rin;          // arus lewat R_in
    return { vi, vo, sat, vminus, vplus, iin, ifb: (vminus - vo) / Rf, gain: ni ? 1 + Rf / Rin : -Rf / Rin };
  };

  SimCore.register({
    api: 1,
    id: 'op-amp',
    title: 'Penguat op-amp inverting dan non-inverting',
    aspect: 16 / 9,
    view: { x: [-0.6, 2.9], y: [-0.85, 1.15] },
    dt: 1 / 240 * TS,
    timeScale: TS,

    params: [
      { key: 'jenis', label: 'Jenis (0 inverting, 1 non-inverting)', symbol: '', unit: '', min: 0, max: 1, step: 1, value: 0 },
      { key: 'Rf', label: 'Resistor umpan balik', symbol: 'R_f', unit: 'kΩ', min: 1, max: 100, step: 1, value: 10 },
      { key: 'Rin', label: 'Resistor masukan', symbol: 'R_in', unit: 'kΩ', min: 1, max: 100, step: 1, value: 1 },
      { key: 'Vm', label: 'Amplitudo masukan', symbol: 'V_m', unit: 'V', min: 0, max: 3, step: 0.05, value: 0.5 },
      { key: 'Vcc', label: 'Tegangan catu', symbol: '±V_cc', unit: 'V', min: 3, max: 15, step: 0.5, value: 12 }
    ],

    graphs: [
      { title: 'Tegangan', unit: 'V', window: 4e-3, series: [
        { key: 'vi', label: 'masukan', color: 'muted' },
        { key: 'vo', label: 'keluaran', color: 'voltage' }
      ] },
      { title: 'Masukan op-amp', unit: 'V', window: 4e-3, series: [
        { key: 'vplus', label: 'v(+)', color: 'vector2' },
        { key: 'vminus', label: 'v(−)', color: 'vector' }
      ] },
      { title: 'Arus', unit: 'mA', window: 4e-3, series: [
        { key: 'iin', label: 'lewat R_in', color: 'current', digits: 3 },
        { key: 'ifb', label: 'lewat R_f', color: 'body2', digits: 3 }
      ] }
    ],

    init(p) { return { t: 0 }; },
    step(st, p, dt) { st.t += dt; },
    measure(st, p) {
      const s = solve(st.t, p);
      return { vi: s.vi, vo: s.vo, vplus: s.vplus, vminus: s.vminus, iin: s.iin * 1e3, ifb: s.ifb * 1e3 };
    },
    positions() { return [[0, 0], [2.4, 0.8]]; },

    draw(ctx, st, p, v, d) {
      const s = solve(st.t, p), ni = p.jenis >= 1;
      const oa = d.opamp(1.3, 0.35, 0.5, 0.45);       // inM (−) atas, inP (+) bawah, out kanan
      const [mx, my] = oa.inM, [px, py] = oa.inP, [ox, oy] = oa.out;
      // Catu daya
      d.text(1.3, 0.68, `+${p.Vcc} V`, 'muted', 'sm'); d.text(1.3, 0.02, `−${p.Vcc} V`, 'muted', 'sm');
      // Sumber masukan di kiri
      d.source(0, -0.5, 0, 0.2, `v_in`, true, -1);
      d.ground(0, -0.5);
      if (!ni) {
        d.wire([[0, 0.2], [0, my], [0.25, my]]);
        d.resistor(0.25, my, mx, my, `R_in = ${p.Rin} kΩ`, 1);
        d.wire([[px - 0.2, py], [px, py]]); d.ground(px - 0.2, py);
      } else {
        d.wire([[0, 0.2], [0, py], [px, py]]);
        d.wire([[mx - 0.25, my], [mx, my]]);
        d.resistor(mx - 0.25, my, mx - 0.25, my - 0.6, `R_in = ${p.Rin} kΩ`, -1);
        d.ground(mx - 0.25, my - 0.6);
      }
      // Umpan balik: dari keluaran ke (−) lewat R_f di atas
      d.wire([[mx - 0.1, my], [mx - 0.1, 0.9]]);
      d.resistor(mx - 0.1, 0.9, ox + 0.15, 0.9, `R_f = ${p.Rf} kΩ`, 1);
      d.wire([[ox + 0.15, 0.9], [ox + 0.15, oy]]);
      d.node(mx - 0.1, my); d.node(ox + 0.15, oy);
      d.wire([[ox, oy], [2.4, oy]]); d.node(2.4, oy);
      d.text(2.4, oy + 0.12, `v_out = ${s.vo.toFixed(2)} V`, s.sat ? 'vector' : 'voltage', 'sm', 'right');
      d.text(mx - 0.14, my - 0.11, `v(−) = ${s.vminus.toFixed(2)} V`, 'vector', 'sm', 'right');
      d.text(px - 0.14, py - 0.13, `v(+) = ${s.vplus.toFixed(2)} V`, 'vector2', 'sm', 'right');

      d.text(1.2, -0.55, `${ni ? 'non-inverting' : 'inverting'}: A = ${ni ? '1 + R_f/R_in' : '−R_f/R_in'} = ${s.gain.toFixed(1)} · puncak ideal ${Math.abs(s.gain * p.Vm).toFixed(1)} V`, 'fg', 'sm');
      d.text(1.2, -0.7, s.sat ? 'JENUH: keluaran terpotong di ±V_cc, ground maya hilang' : 'linear: v(−) ≈ v(+)', s.sat ? 'vector' : 'muted', 'sm');
    }
  });
})();
