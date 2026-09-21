/* Tapis RC lolos-rendah dan lolos-tinggi (Arus Bolak-Balik)
 * Asumsi model:
 *  - Sumber sinus V_m sin(ωt) memasok R dan C seri. Lolos-rendah: keluaran di C; lolos-tinggi: keluaran di R.
 *  - dv_C/dt = (v_in − v_C)/(RC), diselesaikan eksak per langkah dengan v_in ditahan selama langkah (stabil
 *    untuk RC sekecil apa pun).
 *  - Keadaan tunak: |H_LP| = 1/√(1 + (f/f_c)²), |H_HP| = (f/f_c)/√(1 + (f/f_c)²), f_c = 1/(2πRC).
 *    Sisipan Bode: |H| dalam dB terhadap f pada skala log 10 Hz–100 kHz, penanda di f sekarang.
 *  - Waktu nyata: R dalam kΩ, C dalam µF, f dalam kHz. Diputar lambat 1000×.
 */
(function () {
  const TS = 1e-3;

  const fc = p => 1 / (2 * Math.PI * p.R * 1e3 * p.C * 1e-6);
  const gain = (p, f) => {
    const r = f / fc(p), den = Math.sqrt(1 + r * r);
    return p.jenis >= 1 ? r / den : 1 / den;
  };
  const vin = (t, p) => p.Vm * Math.sin(2 * Math.PI * p.f * 1e3 * t);

  SimCore.register({
    api: 1,
    id: 'tapis-rc',
    title: 'Tapis RC lolos-rendah dan lolos-tinggi',
    aspect: 16 / 9,
    view: { x: [-0.5, 3.7], y: [-0.7, 1.5] },
    dt: 1 / 240 * TS,
    timeScale: TS,

    params: [
      { key: 'f', label: 'Frekuensi sinyal', symbol: 'f', unit: 'kHz', min: 0.1, max: 10, step: 0.1, value: 1 },
      { key: 'R', label: 'Resistor', symbol: 'R', unit: 'kΩ', min: 0.1, max: 10, step: 0.1, value: 1 },
      { key: 'C', label: 'Kapasitor', symbol: 'C', unit: 'µF', min: 0.01, max: 1, step: 0.01, value: 0.1 },
      { key: 'jenis', label: 'Jenis (0 lolos-rendah, 1 lolos-tinggi)', symbol: '', unit: '', min: 0, max: 1, step: 1, value: 0 },
      { key: 'Vm', label: 'Amplitudo masukan', symbol: 'V_m', unit: 'V', min: 0, max: 5, step: 0.1, value: 1 }
    ],

    graphs: [
      { title: 'Tegangan', unit: 'V', window: 5e-3, series: [
        { key: 'vin', label: 'masukan', color: 'muted' },
        { key: 'vout', label: 'keluaran', color: 'voltage' }
      ] },
      { title: 'Penguatan tunak', unit: '', min: 0, max: 1.05, window: 5e-3, series: [
        { key: 'H', label: '|H|', color: 'body2', digits: 3 },
        { key: 'H3', label: '−3 dB', color: 'grid', digits: 3 }
      ] }
    ],

    init(p) { return { t: 0, vC: 0 }; },

    step(st, p, dt) {
      const vi = vin(st.t, p), tau = p.R * 1e3 * p.C * 1e-6;
      st.vC = vi + (st.vC - vi) * Math.exp(-dt / tau);
      st.t += dt;
    },

    measure(st, p) {
      const vi = vin(st.t, p);
      return { vin: vi, vout: p.jenis >= 1 ? vi - st.vC : st.vC, H: gain(p, p.f * 1e3), H3: Math.SQRT1_2 };
    },

    positions() { return [[0, 0], [1.6, 1]]; },

    draw(ctx, st, p, v, d) {
      const hp = p.jenis >= 1, f = p.f * 1e3, fcv = fc(p);
      // Rangkaian: sumber, R, C; keluaran di C (LPF) atau di R (HPF)
      d.source(0, 0, 0, 1, `V_m = ${p.Vm.toFixed(1)} V`, true, -1);
      if (!hp) {
        d.resistor(0, 1, 1.0, 1, `R = ${p.R.toFixed(1)} kΩ`, 1);
        d.capacitor(1.0, 1, 1.0, 0, `C = ${p.C.toFixed(2)} µF`, -1);
      } else {
        d.capacitor(0, 1, 1.0, 1, `C = ${p.C.toFixed(2)} µF`, 1);
        d.resistor(1.0, 1, 1.0, 0, `R = ${p.R.toFixed(1)} kΩ`, -1);
      }
      d.wire([[1.0, 0], [0, 0]]); d.ground(0.5, 0);
      d.wire([[1.0, 1], [1.5, 1]]); d.node(1.5, 1); d.node(1.5, 0); d.wire([[1.0, 0], [1.5, 0]]);
      d.text(1.6, 1, 'v_out', 'voltage', 'sm', 'left'); d.text(1.6, 0, '0', 'muted', 'sm', 'left');
      d.text(0.5, 0.5, hp ? 'lolos-tinggi' : 'lolos-rendah', 'fg', 'md');
      d.text(0.5, -0.3, `f_c = 1/(2πRC) = ${(fcv / 1e3).toFixed(2)} kHz`, 'fg', 'sm');
      d.text(0.5, -0.45, `f = ${p.f.toFixed(1)} kHz → |H| = ${gain(p, f).toFixed(2)} (${(20 * Math.log10(Math.max(gain(p, f), 1e-6))).toFixed(1)} dB)`, 'body2', 'sm');

      // Sisipan Bode: log f 10 Hz–100 kHz, |H| −40…0 dB
      const ox = 2.1, oy = -0.2, W = 1.4, H = 1.3;
      const lx = ff => ox + W * (Math.log10(ff) - 1) / 4, ly = dB => oy + H * (Math.max(dB, -40) + 40) / 40;
      d.line(ox, oy, ox + W, oy, 'muted', 1); d.line(ox, oy, ox, oy + H, 'muted', 1);
      [-40, -20, 0].forEach(dB => { d.line(ox, ly(dB), ox + W, ly(dB), 'grid', 1); d.text(ox - 0.03, ly(dB), `${dB} dB`, 'muted', 'sm', 'right'); });
      [10, 100, 1e3, 1e4, 1e5].forEach(ff => { d.line(lx(ff), oy, lx(ff), oy + H, 'grid', 1); d.text(lx(ff), oy - 0.08, ff >= 1e3 ? `${ff / 1e3}k` : `${ff}`, 'muted', 'sm'); });
      const pts = [];
      for (let k = 0; k <= 80; k++) { const ff = Math.pow(10, 1 + 4 * k / 80); pts.push([lx(ff), ly(20 * Math.log10(Math.max(gain(p, ff), 1e-6)))]); }
      d.polyline(pts, 'body2', 2);
      d.line(lx(fcv), oy, lx(fcv), oy + H, 'voltage', 1);
      d.dot(lx(f), ly(20 * Math.log10(Math.max(gain(p, f), 1e-6))), 5, 'current');
      d.text(ox + W / 2, oy + H + 0.1, 'Bode |H(f)| · garis biru: f_c', 'fg', 'sm');
      d.text(ox + W, oy - 0.2, 'f (Hz)', 'muted', 'sm', 'right');
    }
  });
})();
