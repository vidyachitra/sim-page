/* Pengaruh jalur sinyal (kawat / jalur PCB) pada sinyal digital (Rangkaian Transien)
 * Jalur dimodelkan sebagai parasit tergumpal: hambatan R_t dan induktansi L_t seri, kapasitansi C_t ke ground
 * di ujung penerima, dan beban R_L. Sumber: gelombang kotak ideal (tepi tegak) amplitudo 3,3 V, frekuensi f.
 * Asumsi model:
 *  - di/dt = (v_in − i R_t − v_out)/L_t ; dv_out/dt = (i − v_out/R_L)/C_t ; RK4.
 *  - Impedansi karakteristik Z₀ = √(L_t/C_t); redaman ζ = (R_t/Z₀ + Z₀/R_L)/2: beban ≈ Z₀ meredam dering (terminasi).
 *  - Waktu nyata: L dalam nH, C dalam pF, f dalam MHz → dering berorde nanodetik. Diputar lambat 10⁸×.
 * Tampilan: kotak pengirim dan penerima, jalur digambar sebagai R–L dengan C di ujung; tanpa titik muatan.
 */
(function () {
  const TS = 1e-8;
  const VH = 3.3;                         // V, tingkat logika tinggi

  const vin = (t, p) => ((t * p.f * 1e6) % 1 < 0.5 ? VH : 0);
  const Z0 = p => Math.sqrt(p.L * 1e-9 / (p.C * 1e-12));
  const zeta = p => (p.Rt / Z0(p) + Z0(p) / p.RL) / 2;

  SimCore.register({
    api: 1,
    id: 'jalur-sinyal',
    title: 'Pengaruh jalur sinyal pada tepi sinyal digital',
    aspect: 16 / 9,
    view: { x: [-0.5, 3.2], y: [-0.55, 1.55] },
    dt: 1 / 240 * TS,
    timeScale: TS,

    params: [
      { key: 'f', label: 'Frekuensi sinyal', symbol: 'f', unit: 'MHz', min: 5, max: 50, step: 1, value: 20, resets: true },
      { key: 'L', label: 'Induktansi jalur', symbol: 'L_t', unit: 'nH', min: 1, max: 100, step: 1, value: 10 },
      { key: 'C', label: 'Kapasitansi jalur', symbol: 'C_t', unit: 'pF', min: 1, max: 100, step: 1, value: 10 },
      { key: 'Rt', label: 'Hambatan jalur', symbol: 'R_t', unit: 'Ω', min: 0, max: 20, step: 0.5, value: 1 },
      { key: 'RL', label: 'Beban penerima', symbol: 'R_L', unit: 'Ω', min: 10, max: 1000, step: 10, value: 1000 }
    ],

    graphs: [
      { title: 'Tegangan', unit: 'V', window: 100e-9, series: [
        { key: 'vin', label: 'kirim', color: 'muted' },
        { key: 'vout', label: 'terima', color: 'voltage' }
      ] },
      { title: 'Arus jalur', unit: 'mA', window: 100e-9, series: [{ key: 'i', label: 'i', color: 'current' }] },
      { title: 'Lonjakan lewat (overshoot)', unit: '%', min: 0, window: 100e-9, series: [{ key: 'os', label: 'maks', color: 'vector' }] }
    ],

    init(p) { return { t: 0, v: 0, i: 0, vmax: 0 }; },

    step(st, p, dt) {
      const f = (t, y) => [                              // y = [v_out, i]
        (y[1] - y[0] / p.RL) / (p.C * 1e-12),
        (vin(t, p) - y[1] * p.Rt - y[0]) / (p.L * 1e-9)
      ];
      // Sub-langkah agar RK4 stabil terhadap konstanta waktu terkecil (R_L·C_t, √(L_t C_t), L_t/R_t)
      const L = p.L * 1e-9, C = p.C * 1e-12;
      const tauMin = Math.min(p.RL * C, Math.sqrt(L * C), p.Rt > 0 ? L / p.Rt : Infinity);
      const n = Math.min(64, Math.max(1, Math.ceil(dt / (0.4 * tauMin)))), h = dt / n;
      let y = [st.v, st.i];
      for (let k = 0; k < n; k++) { y = SimCore.rk4(f, st.t, y, h); st.t += h; }
      st.v = y[0]; st.i = y[1];
      if (st.v > st.vmax) st.vmax = st.v;
    },

    measure(st, p) {
      return { vin: vin(st.t, p), vout: st.v, i: st.i * 1e3, os: Math.max(0, (st.vmax - VH) / VH * 100) };
    },

    positions() { return [[0, 0], [2.7, 1]]; },

    draw(ctx, st, p, v, d) {
      const z0 = Z0(p), z = zeta(p);
      // Pengirim
      d.rect(-0.3, 0.6, 0.5, 0.5, 'bg', 'fg'); d.text(-0.05, 0.85, 'pengirim', 'fg', 'sm');
      d.text(-0.05, 0.7, `${vin(st.t, p).toFixed(1)} V`, vin(st.t, p) > 0 ? 'current' : 'muted', 'sm');
      d.wire([[0.2, 0.85], [0.5, 0.85]]);
      // Jalur: R_t dan L_t seri, C_t ke ground di ujung
      d.resistor(0.5, 0.85, 1.1, 0.85, `R_t = ${p.Rt.toFixed(1)} Ω`, 1);
      d.inductor(1.1, 0.85, 1.9, 0.85, `L_t = ${p.L} nH`, 1);
      d.wire([[1.9, 0.85], [2.3, 0.85]]);
      d.node(2.0, 0.85);
      d.capacitor(2.0, 0.85, 2.0, 0.2, `C_t = ${p.C} pF`, -1);
      d.wire([[2.0, 0.2], [2.0, 0]]);
      // Penerima dengan beban R_L
      d.rect(2.3, 0.6, 0.5, 0.5, 'bg', 'fg'); d.text(2.55, 0.85, 'penerima', 'fg', 'sm');
      d.text(2.55, 0.7, `${st.v.toFixed(2)} V`, 'voltage', 'sm');
      d.wire([[2.55, 0.6], [2.55, 0.45]]);
      d.resistor(2.55, 0.45, 2.55, 0, `R_L = ${p.RL} Ω`, 1);
      d.wire([[2.55, 0], [-0.05, 0]]); d.wire([[-0.05, 0], [-0.05, 0.6]]);
      d.ground(1.0, 0);
      d.text(1.2, 1.3, `Z₀ = √(L_t/C_t) = ${z0.toFixed(0)} Ω · ζ = ${z.toFixed(2)} ${z < 0.7 ? '(berdering)' : z <= 1.2 ? '(hampir kritis)' : '(teredam lebih, tepi lambat)'}`, 'fg', 'sm');
      d.text(1.2, 1.15, `f_dering ≈ ${(1 / (2 * Math.PI * Math.sqrt(p.L * 1e-9 * p.C * 1e-12)) / 1e6).toFixed(0)} MHz · terminasi cocok: R_L ≈ Z₀`, 'muted', 'sm');
      d.text(1.2, -0.3, `lonjakan lewat maks ${Math.max(0, (st.vmax - VH) / VH * 100).toFixed(0)} % dari ${VH} V`, 'vector', 'sm');
    }
  });
})();
