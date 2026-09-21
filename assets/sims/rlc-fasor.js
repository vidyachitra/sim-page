/* Impedansi dan fasor rangkaian RLC seri pada sumber sinus (Arus Bolak-Balik)
 * Asumsi model:
 *  - v(t) = V_m sin(ωt) memasok R, L, C seri. dv_C/dt = i/C, di/dt = (v − v_C − iR)/L; RK4 (transien alami
 *    meluruh sendiri, lalu keadaan tunak).
 *  - Fasor digambar dari solusi tunak: |Z| = √(R² + (X_L − X_C)²), φ = atan((X_L − X_C)/R), I_m = V_m/|Z|.
 *    Diagram berputar dengan ωt; V_R sefase dengan I, V_L mendahului 90°, V_C tertinggal 90°.
 *  - Resonansi f₀ = 1/(2π√LC): X_L = X_C, |Z| = R, φ = 0.
 *  - Waktu nyata: f dalam kHz, L dalam mH, C dalam µF. Diputar lambat 1000×.
 * Animasi: titik muatan sebanding arus sesaat (bolak-balik).
 */
(function () {
  const TS = 1e-3;
  const K = 0.02;                         // m/s tampilan per A

  const omega = p => 2 * Math.PI * p.f * 1e3;
  const steady = p => {
    const w = omega(p), XL = w * p.L * 1e-3, XC = 1 / (w * p.C * 1e-6);
    const Z = Math.hypot(p.R, XL - XC), phi = Math.atan2(XL - XC, p.R);
    return { w, XL, XC, Z, phi, Im: p.Vm / Z, f0: 1 / (2 * Math.PI * Math.sqrt(p.L * 1e-3 * p.C * 1e-6)) };
  };

  SimCore.register({
    api: 1,
    id: 'rlc-fasor',
    title: 'Impedansi dan fasor RLC seri',
    aspect: 16 / 9,
    view: { x: [-0.5, 3.6], y: [-0.8, 1.5] },
    dt: 1 / 240 * TS,
    timeScale: TS,

    params: [
      { key: 'Vm', label: 'Amplitudo sumber', symbol: 'V_m', unit: 'V', min: 0, max: 24, step: 0.5, value: 10 },
      { key: 'f', label: 'Frekuensi', symbol: 'f', unit: 'kHz', min: 0.2, max: 5, step: 0.05, value: 1 },
      { key: 'R', label: 'Resistor', symbol: 'R', unit: 'Ω', min: 1, max: 200, step: 1, value: 50 },
      { key: 'L', label: 'Induktor', symbol: 'L', unit: 'mH', min: 1, max: 100, step: 1, value: 10 },
      { key: 'C', label: 'Kapasitor', symbol: 'C', unit: 'µF', min: 0.1, max: 10, step: 0.1, value: 1 }
    ],

    graphs: [
      { title: 'Tegangan', unit: 'V', window: 5e-3, series: [
        { key: 'v', label: 'sumber', color: 'total' },
        { key: 'vR', label: 'v_R', color: 'voltage' },
        { key: 'vL', label: 'v_L', color: 'vector2' },
        { key: 'vC', label: 'v_C', color: 'body2' }
      ] },
      { title: 'Arus', unit: 'A', window: 5e-3, series: [{ key: 'i', label: 'i', color: 'current', digits: 3 }] },
      { title: 'Daya sesaat', unit: 'W', window: 5e-3, series: [
        { key: 'pw', label: 'p = v·i', color: 'ke', digits: 3 },
        { key: 'P', label: 'rata-rata', color: 'muted', digits: 3 }
      ] }
    ],

    init(p) { return { t: 0, vC: 0, i: 0, q: 0 }; },

    step(st, p, dt) {
      const w = omega(p);
      const f = (t, y) => [y[1] / (p.C * 1e-6), (p.Vm * Math.sin(w * t) - y[0] - y[1] * p.R) / (p.L * 1e-3)];
      const y = SimCore.rk4(f, st.t, [st.vC, st.i], dt);
      st.vC = y[0]; st.i = y[1]; st.t += dt;
      st.q += st.i * K * dt / TS;
    },

    measure(st, p) {
      const s = steady(p), v = p.Vm * Math.sin(s.w * st.t);
      const vR = st.i * p.R, vL = v - vR - st.vC;
      return { v, vR, vL, vC: st.vC, i: st.i, pw: v * st.i, P: 0.5 * p.Vm * s.Im * Math.cos(s.phi) };
    },

    positions() { return [[0, 0], [1.7, 1]]; },

    draw(ctx, st, p, v, d) {
      const s = steady(p), th = s.w * st.t;
      // Rangkaian
      d.source(0, 0, 0, 1, `V_m = ${p.Vm.toFixed(1)} V`, true, -1);
      d.resistor(0, 1, 0.75, 1, `R = ${p.R} Ω`, 1);
      d.inductor(0.75, 1, 1.7, 1, `L = ${p.L} mH`, 1);
      d.capacitor(1.7, 1, 1.7, 0, `C = ${p.C.toFixed(1)} µF`, 1);
      d.wire([[1.7, 0], [0, 0]]);
      d.ground(0.85, 0);
      d.flow([[0, 0], [0, 1], [1.7, 1], [1.7, 0], [0, 0]], st.q);
      d.text(0.85, 0.5, `|Z| = ${s.Z.toFixed(1)} Ω · φ = ${(s.phi * 180 / Math.PI).toFixed(0)}°`, 'fg', 'sm');
      d.text(0.85, 0.35, `X_L = ${s.XL.toFixed(1)} Ω · X_C = ${s.XC.toFixed(1)} Ω`, 'muted', 'sm');
      d.text(0.85, -0.3, `f₀ = ${(s.f0 / 1e3).toFixed(2)} kHz ${Math.abs(p.f * 1e3 - s.f0) < 0.02 * s.f0 ? '← resonansi' : ''}`, s.phi > 0.05 ? 'vector2' : s.phi < -0.05 ? 'body2' : 'fg', 'sm');
      d.text(0.85, -0.45, s.phi > 0.05 ? 'induktif: arus tertinggal' : s.phi < -0.05 ? 'kapasitif: arus mendahului' : 'resistif: sefase', 'muted', 'sm');

      // Diagram fasor: pusat (2.8, 0.45); skala 0,5 m untuk V_m
      const cx = 2.8, cy = 0.45, sc = 0.55 / Math.max(p.Vm, 1e-9);
      d.circle(cx, cy, 0.55, 'grid', false, 1);
      d.line(cx - 0.6, cy, cx + 0.6, cy, 'grid', 1); d.line(cx, cy - 0.6, cx, cy + 0.6, 'grid', 1);
      const ang = th - s.phi;                              // sudut fasor arus
      const vec = (mag, a, color, label) => d.arrow(cx, cy, mag * sc * Math.cos(a), mag * sc * Math.sin(a), color, label);
      vec(s.Im * p.R, ang, 'voltage', 'V_R');
      vec(s.Im * s.XL, ang + Math.PI / 2, 'vector2', 'V_L');
      vec(s.Im * s.XC, ang - Math.PI / 2, 'body2', 'V_C');
      vec(p.Vm, th, 'total', 'V');
      d.text(cx, cy + 0.72, 'diagram fasor (berputar ωt)', 'muted', 'sm');
      d.text(cx, cy - 0.72, `I_m = ${(s.Im * 1e3).toFixed(0)} mA searah V_R`, 'current', 'sm');
    }
  });
})();
