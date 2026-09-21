/* Penyearah dioda setengah dan gelombang penuh dengan tapis kapasitor (Elektronika Dasar)
 * Asumsi model:
 *  - Sumber 50 Hz V_m sin(ωt). Setengah gelombang: satu dioda; gelombang penuh: jembatan empat dioda
 *    (dua dioda menghantar tiap setengah siklus, jatuh tegangan 2·V_f).
 *  - Dioda: jatuh tegangan tetap V_f = 0,7 V dan hambatan hantar R_d = 5 Ω saat v_rect − V_f > v_C; putus jika tidak.
 *  - Kapasitor C paralel beban R_L: saat dioda menghantar, dv_C/dt = ((v_rect − V_f − v_C)/R_d − v_C/R_L)/C;
 *    saat putus, dv_C/dt = −v_C/(R_L C). Diselesaikan eksak per langkah. C = 0: v_out = v_rect − V_f (≥ 0).
 *  - Riak = v_maks − v_min selama satu siklus terakhir. Diputar lambat 100×.
 */
(function () {
  const TS = 1e-2;
  const F = 50, W = 2 * Math.PI * F, T = 1 / F;
  const VF = 0.7, RD = 5;

  const vsrc = (t, p) => p.Vm * Math.sin(W * t);
  const vrect = (t, p) => (p.jenis >= 1 ? Math.abs(vsrc(t, p)) - 2 * VF : vsrc(t, p) - VF);   // sebelum kapasitor

  SimCore.register({
    api: 1,
    id: 'penyearah',
    title: 'Penyearah dioda dengan tapis kapasitor',
    aspect: 16 / 9,
    view: { x: [-0.5, 3.4], y: [-0.7, 1.5] },
    dt: 1 / 240 * TS,
    timeScale: TS,

    params: [
      { key: 'Vm', label: 'Amplitudo sumber', symbol: 'V_m', unit: 'V', min: 2, max: 30, step: 0.5, value: 12 },
      { key: 'C', label: 'Kapasitor tapis', symbol: 'C', unit: 'µF', min: 0, max: 2200, step: 10, value: 470 },
      { key: 'RL', label: 'Beban', symbol: 'R_L', unit: 'kΩ', min: 0.1, max: 10, step: 0.1, value: 1 },
      { key: 'jenis', label: 'Jenis (0 setengah, 1 penuh)', symbol: '', unit: '', min: 0, max: 1, step: 1, value: 0 }
    ],

    graphs: [
      { title: 'Tegangan', unit: 'V', window: 60e-3, series: [
        { key: 'vin', label: 'sumber', color: 'muted' },
        { key: 'vout', label: 'keluaran', color: 'voltage' }
      ] },
      { title: 'Arus dioda', unit: 'mA', min: 0, window: 60e-3, series: [{ key: 'iD', label: 'i_D', color: 'current' }] },
      { title: 'Riak (puncak ke puncak)', unit: 'V', min: 0, window: 60e-3, series: [{ key: 'ripple', label: 'V_pp', color: 'vector' }] }
    ],

    init(p) { return { t: 0, v: 0, on: false, cycMin: 0, cycMax: 0, cycEnd: T, ripple: 0 }; },

    step(st, p, dt) {
      const vr = vrect(st.t, p), RL = p.RL * 1e3, C = p.C * 1e-6;
      st.on = vr > st.v;
      if (C > 0) {
        if (st.on) {
          const veq = (vr / RD) / (1 / RD + 1 / RL), tau = C / (1 / RD + 1 / RL);
          st.v = veq + (st.v - veq) * Math.exp(-dt / tau);
        } else {
          st.v *= Math.exp(-dt / (RL * C));
        }
      } else {
        st.v = Math.max(vr, 0); st.on = vr > 0;
      }
      st.t += dt;
      st.cycMin = Math.min(st.cycMin, st.v); st.cycMax = Math.max(st.cycMax, st.v);
      if (st.t >= st.cycEnd) { st.ripple = st.cycMax - st.cycMin; st.cycMin = st.v; st.cycMax = st.v; st.cycEnd += T; }
    },

    measure(st, p) {
      const vr = vrect(st.t, p);
      const iD = st.on ? (p.C > 0 ? Math.max(0, (vr - st.v) / RD) : st.v / (p.RL * 1e3)) : 0;
      return { vin: vsrc(st.t, p), vout: st.v, iD: iD * 1e3, ripple: st.ripple };
    },

    positions() { return [[0, 0], [2.6, 1]]; },

    draw(ctx, st, p, v, d) {
      const full = p.jenis >= 1, vs = vsrc(st.t, p), pos = vs > 0;
      d.source(0, 0, 0, 1, `${F} Hz · V_m = ${p.Vm} V`, true, -1);
      if (!full) {
        d.wire([[0, 1], [0.5, 1]]);
        d.diode(0.5, 1, 1.1, 1, 'D', 1, st.on);
        d.wire([[1.1, 1], [2.0, 1]]);
        d.wire([[0, 0], [2.0, 0]]);
      } else {
        // Jembatan: berlian dengan simpul kiri (dari sumber atas), kanan (sumber bawah), atas (+), bawah (−)
        const L = [0.6, 0.5], R = [1.4, 0.5], Tn = [1.0, 0.95], B = [1.0, 0.05];
        d.wire([[0, 1], [0.3, 1], [0.3, 0.5], [L[0], L[1]]]);
        d.wire([[0, 0], [0.3, 0], [0.3, 0.2], [1.55, 0.2], [1.55, 0.5], [R[0], R[1]]]);
        d.diode(L[0], L[1], Tn[0], Tn[1], '', 1, pos && st.on);        // kiri → atas
        d.diode(B[0], B[1], L[0], L[1], '', 1, !pos && st.on);         // bawah → kiri
        d.diode(R[0], R[1], Tn[0], Tn[1], '', 1, !pos && st.on);       // kanan → atas
        d.diode(B[0], B[1], R[0], R[1], '', 1, pos && st.on);          // bawah → kanan
        d.wire([[Tn[0], Tn[1]], [1.0, 1.0], [2.0, 1.0]]);
        d.wire([[B[0], B[1]], [1.0, 0.0], [2.0, 0.0]]);
        d.text(1.0, 1.15, '+', 'fg', 'sm'); d.text(1.0, -0.12, '−', 'fg', 'sm');
      }
      d.node(2.0, 1); d.node(2.0, 0);
      if (p.C > 0) d.capacitor(2.0, 1, 2.0, 0, `C = ${p.C} µF`, 1); else d.text(2.0, 0.5, 'C = 0', 'muted', 'sm');
      d.wire([[2.0, 1], [2.6, 1]]); d.wire([[2.0, 0], [2.6, 0]]);
      d.resistor(2.6, 1, 2.6, 0, `R_L = ${p.RL.toFixed(1)} kΩ`, 1);
      d.ground(2.3, 0);
      d.text(2.3, 1.25, `v_out = ${st.v.toFixed(2)} V`, 'voltage', 'md');
      const tauRL = p.RL * 1e3 * p.C * 1e-6;
      d.text(1.3, -0.35, p.C > 0
        ? `τ_kosong = R_L C = ${(tauRL * 1e3).toFixed(0)} ms (${(tauRL / T).toFixed(1)} periode) · riak ≈ ${st.ripple.toFixed(2)} V`
        : `tanpa kapasitor: keluaran mengikuti |v| − V_f`, 'fg', 'sm');
      d.text(1.3, -0.5, full ? 'gelombang penuh: dua dioda menghantar bergantian, riak 100 Hz' : 'setengah gelombang: riak 50 Hz', 'muted', 'sm');
    }
  });
})();
