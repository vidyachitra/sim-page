/* Lonjakan tegangan saat memutus arus induktor (Rangkaian Transien)
 * Asumsi model:
 *  - Sumber tetap 12 V, R, L seri lewat saklar. Saklar terbuka dimodelkan sebagai hambatan celah R_off (busur/udara),
 *    sehingga arus induktor dipaksa turun secepat τ′ = L/(R+R_off) dan v_L = −L di/dt melonjak.
 *  - Dioda flyback (opsional, jatuh tegangan 0,7 V) paralel induktor+R memberi jalan arus: v_L terkunci ≈ −0,7 V
 *    dan arus meluruh dengan τ = L/R.
 *  - Tegangan saklar v_sw = i·R_off. Lonjakan sesungguhnya berlangsung < 1 µs, jadi grafik menampilkan
 *    puncak yang ditahan dan meluruh selama 0,5 ms (garis "puncak") di samping nilai sesaat.
 *  - Diselesaikan eksak per langkah (linear per fase). Diputar lambat 1000×.
 * Animasi: titik muatan sebanding arus (0,8 cm/s tampilan per A).
 */
(function () {
  const TS = 1e-3;
  const K = 0.008;
  const V = 12;                           // V, sumber tetap
  const VF = 0.7;                         // V, jatuh tegangan dioda
  const TAU_HOLD = 0.5e-3;                // s, peluruhan penahan puncak

  // Fase: 'tutup' (sumber memasok), 'dioda' (saklar buka, arus lewat dioda), 'celah' (saklar buka tanpa dioda)
  const phase = (st, p) => (p.sw >= 1 ? 'tutup' : (p.diode >= 1 ? 'dioda' : 'celah'));
  const volts = (st, p) => {
    const ph = phase(st, p);
    if (ph === 'tutup') return { vL: V - st.i * p.R, vsw: 0 };
    if (ph === 'dioda') return { vL: -(st.i * p.R + (st.i > 0 ? VF : 0)), vsw: V + (st.i > 0 ? VF : 0) };
    return { vL: -st.i * (p.R + p.Roff * 1e3) + V, vsw: st.i * p.Roff * 1e3 };
  };

  SimCore.register({
    api: 1,
    id: 'lonjakan-tegangan',
    title: 'Lonjakan tegangan saat arus induktor diputus',
    aspect: 4 / 3,
    view: { x: [-0.5, 2.3], y: [-0.55, 1.5] },
    dt: 1 / 240 * TS,
    timeScale: TS,

    params: [
      { key: 'sw', label: 'Saklar (0 buka, 1 tutup)', symbol: '', unit: '', min: 0, max: 1, step: 1, value: 1 },
      { key: 'R', label: 'Resistor', symbol: 'R', unit: 'Ω', min: 1, max: 100, step: 1, value: 10 },
      { key: 'L', label: 'Induktor', symbol: 'L', unit: 'mH', min: 1, max: 100, step: 1, value: 10 },
      { key: 'Roff', label: 'Hambatan celah saklar', symbol: 'R_off', unit: 'kΩ', min: 0.1, max: 10, step: 0.1, value: 1 },
      { key: 'diode', label: 'Dioda flyback (0 tanpa, 1 ada)', symbol: '', unit: '', min: 0, max: 1, step: 1, value: 0 }
    ],

    graphs: [
      { title: 'Arus induktor', unit: 'A', min: 0, window: 10e-3, series: [{ key: 'i', label: 'i', color: 'current', digits: 3 }] },
      { title: 'Tegangan saklar', unit: 'V', min: 0, window: 10e-3, series: [
        { key: 'vswHold', label: 'puncak', color: 'vector' },
        { key: 'vsw', label: 'sesaat', color: 'muted' }
      ] },
      { title: 'Tegangan induktor', unit: 'V', window: 10e-3, series: [
        { key: 'vLHold', label: 'puncak', color: 'vector' },
        { key: 'vL', label: 'sesaat', color: 'voltage' }
      ] }
    ],

    // Saklar mulai tertutup: arus dibiarkan naik dulu, pengguna lalu membukanya
    init(p) { return { i: 0, q: 0, holdSw: 0, holdL: 0 }; },

    step(st, p, dt) {
      const ph = phase(st, p);
      let iInf, tau;
      if (ph === 'tutup') { iInf = V / p.R; tau = p.L * 1e-3 / p.R; }
      else if (ph === 'dioda') { iInf = -VF / p.R; tau = p.L * 1e-3 / p.R; }
      else { iInf = V / (p.R + p.Roff * 1e3); tau = p.L * 1e-3 / (p.R + p.Roff * 1e3); }
      st.i = iInf + (st.i - iInf) * Math.exp(-dt / tau);
      if (st.i < 0 && ph !== 'tutup') st.i = 0;          // dioda/celah tidak mengalirkan arus balik
      const vv = volts(st, p), decay = Math.exp(-dt / TAU_HOLD);
      st.holdSw = Math.max(Math.abs(vv.vsw), st.holdSw * decay);
      st.holdL = Math.max(Math.abs(vv.vL), st.holdL * decay);
      st.q += st.i * K * dt / TS;
    },

    measure(st, p) {
      const vv = volts(st, p);
      return { i: st.i, vsw: vv.vsw, vswHold: st.holdSw, vL: vv.vL, vLHold: -st.holdL };
    },

    positions() { return [[0, 0], [1.9, 1]]; },

    draw(ctx, st, p, v, d) {
      const on = p.sw >= 1, vv = volts(st, p);
      d.source(0, 0, 0, 1, `${V} V`, false, -1);
      d.wire([[0, 1], [0.3, 1]]);
      d.switch(0.3, 1, 0.7, 1, on, on ? 'tutup' : `buka (R_off ${p.Roff.toFixed(1)} kΩ)`, 1);
      d.wire([[0.7, 1], [1.0, 1]]);
      d.resistor(1.0, 1, 1.6, 1, `R = ${p.R} Ω`, 1);
      d.inductor(1.6, 1, 1.6, 0, `L = ${p.L} mH`, 1);
      d.wire([[1.6, 0], [0, 0]]);
      d.ground(0.8, 0);
      if (p.diode >= 1) {                               // dioda flyback paralel R+L, katoda di atas
        d.wire([[1.0, 1], [1.0, 0.75]]); d.diode(1.0, 0.2, 1.0, 0.75, 'flyback', -1, phase(st, p) === 'dioda' && st.i > 0);
        d.wire([[1.0, 0.2], [1.0, 0]]); d.node(1.0, 1); d.node(1.0, 0);
      }
      const path = on ? [[0, 0], [0, 1], [1.6, 1], [1.6, 0], [0, 0]]
        : (p.diode >= 1 ? [[1.0, 0], [1.0, 1], [1.6, 1], [1.6, 0], [1.0, 0]] : [[0, 0], [0, 1], [1.6, 1], [1.6, 0], [0, 0]]);
      d.flow(path, st.q);

      d.text(2.0, 0.6, `i = ${st.i.toFixed(3)} A`, 'current', 'sm', 'left');
      d.text(2.0, 0.45, `v_L = ${vv.vL.toFixed(0)} V`, 'voltage', 'sm', 'left');
      d.text(2.0, 0.3, `v_sw = ${vv.vsw.toFixed(0)} V`, 'vector', 'sm', 'left');
      const peak = (V / p.R) * p.Roff * 1e3;
      d.text(0.9, -0.3, p.diode >= 1
        ? `dengan dioda: v_L terkunci −${VF} V, arus meluruh dengan τ = ${(p.L / p.R).toFixed(2)} ms`
        : `tanpa dioda: puncak ≈ (V/R)·R_off = ${peak.toFixed(0)} V dalam τ′ = ${(p.L * 1e-3 / (p.R + p.Roff * 1e3) * 1e6).toFixed(1)} µs`, 'fg', 'sm');
      d.text(0.9, 1.35, 'Biarkan arus naik, lalu buka saklar', 'muted', 'sm');
    }
  });
})();
