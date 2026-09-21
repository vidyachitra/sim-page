/* Daya nyata, reaktif, dan faktor daya pada beban RL dengan kapasitor kompensasi (Arus Bolak-Balik)
 * Asumsi model:
 *  - Sumber 50 Hz, V_m sin(ωt). Beban induktif R–L seri (motor); kapasitor C_p paralel di terminal sumber
 *    (kompensasi faktor daya; 0 = tanpa kapasitor).
 *  - Arus RL: di/dt = (v − iR)/L, eksak per langkah dengan v ditahan. Arus kapasitor i_C = C_p dv/dt (analitik).
 *    Arus sumber i_s = i_RL + i_C; daya sesaat p = v·i_s.
 *  - Keadaan tunak (fasor): Y = 1/(R + jωL) + jωC_p; P = ½V_m² Re Y; Q = −½V_m² Im Y; S = ½V_m²|Y|; pf = P/S.
 *  - Waktu nyata: periode 20 ms. Diputar lambat 100×.
 * Animasi: titik muatan sebanding arus sumber sesaat.
 */
(function () {
  const TS = 1e-2;
  const F = 50;
  const W = 2 * Math.PI * F;
  const K = 0.03;                         // m/s tampilan per A

  const steady = p => {
    const L = p.L * 1e-3, C = p.Cp * 1e-6;
    const den = p.R * p.R + W * W * L * L;
    const G = p.R / den, B = -W * L / den + W * C;      // Y = G + jB
    const Ym = Math.hypot(G, B);
    const P = 0.5 * p.Vm * p.Vm * G, Q = -0.5 * p.Vm * p.Vm * B, S = 0.5 * p.Vm * p.Vm * Ym;
    return { P, Q, S, pf: S > 0 ? P / S : 1, Im: p.Vm * Ym, phi: Math.atan2(-B, G) };
  };
  const vsrc = (t, p) => p.Vm * Math.sin(W * t);
  const iC = (t, p) => p.Cp * 1e-6 * p.Vm * W * Math.cos(W * t);

  SimCore.register({
    api: 1,
    id: 'daya-ac',
    title: 'Daya AC dan faktor daya dengan kompensasi kapasitor',
    aspect: 16 / 9,
    view: { x: [-0.5, 3.7], y: [-0.7, 1.5] },
    dt: 1 / 240 * TS,
    timeScale: TS,

    params: [
      { key: 'Vm', label: 'Amplitudo sumber', symbol: 'V_m', unit: 'V', min: 0, max: 325, step: 5, value: 100 },
      { key: 'R', label: 'Resistansi beban', symbol: 'R', unit: 'Ω', min: 1, max: 100, step: 1, value: 20 },
      { key: 'L', label: 'Induktansi beban', symbol: 'L', unit: 'mH', min: 0, max: 500, step: 5, value: 100 },
      { key: 'Cp', label: 'Kapasitor kompensasi', symbol: 'C_p', unit: 'µF', min: 0, max: 200, step: 5, value: 0 }
    ],

    graphs: [
      { title: 'Tegangan sumber', unit: 'V', window: 40e-3, series: [{ key: 'v', label: 'v', color: 'total' }] },
      { title: 'Arus', unit: 'A', window: 40e-3, series: [
        { key: 'is', label: 'sumber', color: 'current' },
        { key: 'iRL', label: 'beban RL', color: 'voltage' },
        { key: 'iCap', label: 'C_p', color: 'body2' }
      ] },
      { title: 'Daya', unit: 'W', window: 40e-3, series: [
        { key: 'pw', label: 'p = v·i_s', color: 'ke' },
        { key: 'P', label: 'P rata-rata', color: 'muted' }
      ] }
    ],

    init(p) { return { t: 0, i: 0, q: 0 }; },

    step(st, p, dt) {
      const v = vsrc(st.t, p), L = p.L * 1e-3;
      if (L > 0) { const iInf = v / p.R, tau = L / p.R; st.i = iInf + (st.i - iInf) * Math.exp(-dt / tau); }
      else st.i = v / p.R;
      st.t += dt;
      st.q += (st.i + iC(st.t, p)) * K * dt / TS;
    },

    measure(st, p) {
      const s = steady(p), v = vsrc(st.t, p), ic = iC(st.t, p), is = st.i + ic;
      return { v, is, iRL: st.i, iCap: ic, pw: v * is, P: s.P };
    },

    positions() { return [[0, 0], [1.8, 1]]; },

    draw(ctx, st, p, v, d) {
      const s = steady(p);
      d.source(0, 0, 0, 1, `${F} Hz · V_m = ${p.Vm} V`, true, -1);
      d.wire([[0, 1], [1.8, 1]]);
      d.node(0.8, 1); d.node(0.8, 0);
      if (p.Cp > 0) d.capacitor(0.8, 1, 0.8, 0, `C_p = ${p.Cp} µF`, -1);
      else d.text(0.8, 0.5, 'C_p = 0', 'muted', 'sm');
      d.resistor(1.8, 1, 1.8, 0.55, `R = ${p.R} Ω`, 1);
      d.inductor(1.8, 0.55, 1.8, 0, `L = ${p.L} mH`, 1);
      d.wire([[1.8, 0], [0, 0]]); d.ground(0.4, 0);
      d.polyline([[1.55, -0.12], [2.2, -0.12], [2.2, 1.12], [1.55, 1.12], [1.55, -0.12]], 'grid', 1);
      d.text(1.88, 1.22, 'beban (motor)', 'muted', 'sm');
      d.flow([[0, 0], [0, 1], [0.8, 1]], st.q);
      d.text(0.9, -0.3, `P = ${s.P.toFixed(0)} W · Q = ${s.Q.toFixed(0)} var · S = ${s.S.toFixed(0)} VA`, 'fg', 'sm');
      d.text(0.9, -0.45, `faktor daya = ${s.pf.toFixed(2)} (${s.Q > 1 ? 'tertinggal' : s.Q < -1 ? 'mendahului' : 'satu'}) · I_m = ${s.Im.toFixed(2)} A`, 'current', 'sm');

      // Segitiga daya: P mendatar, Q tegak, S miring
      const ox = 2.55, oy = 0.05, sc = 1.0 / Math.max(s.S, 1e-9);
      d.line(ox - 0.05, oy, ox + 1.05, oy, 'grid', 1);
      d.arrow(ox, oy, s.P * sc, 0, 'ke', 'P');
      d.arrow(ox + s.P * sc, oy, 0, s.Q * sc, 'body2', 'Q');
      d.arrow(ox, oy, s.P * sc, s.Q * sc, 'total', 'S');
      d.text(ox + 0.5, oy - 0.25, 'segitiga daya', 'muted', 'sm');
    }
  });
})();
