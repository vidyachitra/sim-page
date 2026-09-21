/* Jatuh bebas dengan hambatan udara (Modul 3: penentuan g)
 * Asumsi model:
 *  - Benda dilepas dari diam pada ketinggian h; hanya gravitasi dan hambatan udara yang bekerja.
 *  - Hambatan udara F_d = ½ρC_dA v², ditulis sebagai a = g − b v² dengan b = ρC_dA/(2m) (satuan 1/m).
 *    b = 0 adalah kasus ideal (kelereng); bola pingpong ≈ 0,14/m.
 *  - Benda berhenti saat menyentuh lantai (tidak memantul).
 * Integrator: RK4, dt = 1/240 s (gaya tak-konservatif).
 * Skala visual: panah kecepatan = 0,08 s × v; panah percepatan = 0,02 s² × a.
 */
(function () {
  const V_SCALE = 0.08, A_SCALE = 0.02;
  const R = 0.05;                            // m, jari-jari gambar benda

  const accel = (v, p) => p.g - p.b * v * v; // ke bawah positif

  SimCore.register({
    api: 1,
    id: 'jatuh-bebas',
    title: 'Jatuh bebas dengan hambatan udara',
    aspect: 1,
    view: { x: [-0.98, 0.98], y: [-0.16, 1.80] },
    dt: 1 / 240,

    params: [
      { key: 'h', label: 'Ketinggian awal', symbol: 'h', unit: 'm', min: 0, max: 1.5, step: 0.05, value: 1, resets: true },
      { key: 'g', label: 'Percepatan gravitasi', symbol: 'g', unit: 'm/s²', min: 0, max: 25, step: 0.1, value: 9.8 },
      { key: 'b', label: 'Hambatan udara', symbol: 'b', unit: '1/m', min: 0, max: 0.3, step: 0.01, value: 0 }
    ],

    graphs: [
      { title: 'Ketinggian', unit: 'm', min: 0, window: 2, series: [{ key: 'y', label: 'h', color: 'body' }] },
      { title: 'Kecepatan', unit: 'm/s', min: 0, window: 2, series: [{ key: 'v', label: 'v', color: 'vector2' }] },
      { title: 'Percepatan', unit: 'm/s²', min: 0, window: 2, series: [{ key: 'a', label: 'a', color: 'vector' }] }
    ],

    init(p) { return { y: p.h, v: 0, t: 0, tFall: null }; },

    step(st, p, dt) {
      if (st.tFall != null) return;
      const f = (t, s) => [-s[1], accel(s[1], p)];       // s = [y, v]
      const out = SimCore.rk4(f, st.t, [st.y, st.v], dt);
      st.y = out[0]; st.v = out[1]; st.t += dt;
      if (st.y <= 0) { st.y = 0; st.v = 0; st.tFall = st.t; }
    },

    measure(st, p) {
      return { y: st.y, v: st.v, a: st.tFall != null ? 0 : accel(st.v, p) };
    },

    positions(st, p) { return [[0, st.y]]; },

    draw(ctx, st, p, v, d) {
      // Lantai dan dinding berskala di kiri
      d.line(-0.9, 0, 0.9, 0, 'fg', 3);
      d.line(-0.6, 0, -0.6, 1.7, 'fg', 2);
      for (let i = 0; i <= 17; i++) {
        const y = i * 0.1, len = i % 5 ? 0.03 : 0.06;
        d.line(-0.6, y, -0.6 + len, y, 'muted', 1);
        if (i % 5 === 0) d.text(-0.66, y, `${(y).toFixed(1)} m`, 'muted', 'sm', 'right');
      }
      // Tinggi pelepasan
      d.line(-0.55, p.h, 0.3, p.h, 'grid', 1);
      d.text(0.34, p.h, `h = ${p.h.toFixed(2)} m`, 'muted', 'sm', 'left');

      // Benda dan vektor
      d.circle(0, st.y + R, R, 'body');
      const a = st.tFall != null ? 0 : accel(st.v, p);
      d.arrow(0, st.y + R, 0, -st.v * V_SCALE, 'vector2', 'v');
      d.arrow(0.12, st.y + R, 0, -a * A_SCALE, 'vector', 'a');

      // Waktu jatuh
      const label = st.tFall == null ? `t = ${st.t.toFixed(2)} s` : `t jatuh = ${st.tFall.toFixed(3)} s`;
      d.text(0.85, 1.7, label, 'fg', 'md', 'right');
    }
  });
})();
