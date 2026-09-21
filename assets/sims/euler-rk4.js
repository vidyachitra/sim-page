/* Metode Euler dan Runge–Kutta (Modul 10): pegas–massa mendatar
 * Tiga salinan sistem yang sama dijalankan berdampingan: solusi eksak x = A cos(ωt), metode Euler
 * eksplisit, dan RK4, keduanya dengan langkah waktu Δt yang dapat diatur.
 * Asumsi model:
 *  - Pegas ideal tanpa gesekan: dx/dt = v, dv/dt = −(k/m) x; dilepas dari diam di x = A.
 *  - Metode numerik melangkah tiap Δt (waktu simulasi); di antara langkah, posisinya tetap.
 *  - Euler dihentikan dan ditandai "divergen" bila |x| > maks(5A, 5 cm), agar grafik tetap terbaca.
 * Integrator tampilan: dt = 1/240 s hanya untuk jam simulasi; fisika numerik memakai Δt.
 */
(function () {
  const WALL = -0.55;                     // m, dinding tempat pegas terpasang
  const ROWS = [0.32, 0, -0.32];          // m, baris: eksak, Euler, RK4
  const BLK = 0.10;                       // m, sisi balok
  const X_MAX = 0.62;                     // m, batas gambar balok

  const omega = p => Math.sqrt(p.k / p.m);
  const energy = (x, v, p) => 0.5 * p.m * v * v + 0.5 * p.k * x * x;

  SimCore.register({
    api: 1,
    id: 'euler-rk4',
    title: 'Metode Euler dan RK4 dibandingkan dengan solusi eksak',
    aspect: 4 / 3,
    view: { x: [-0.78, 0.78], y: [-0.55, 0.62] },
    dt: 1 / 240,

    params: [
      { key: 'h', label: 'Langkah waktu', symbol: 'Δt', unit: 's', min: 0.01, max: 0.25, step: 0.01, value: 0.10, resets: true },
      { key: 'k', label: 'Konstanta pegas', symbol: 'k', unit: 'N/m', min: 0, max: 50, step: 1, value: 20, resets: true },
      { key: 'm', label: 'Massa', symbol: 'm', unit: 'kg', min: 0.1, max: 1.0, step: 0.05, value: 0.5, resets: true },
      { key: 'A', label: 'Amplitudo', symbol: 'A', unit: 'm', min: 0, max: 0.20, step: 0.01, value: 0.10, resets: true }
    ],

    graphs: [
      { title: 'Posisi', unit: 'm', window: 12, series: [
        { key: 'xX', label: 'eksak', color: 'body', digits: 3 },
        { key: 'xE', label: 'Euler', color: 'vector', digits: 3 },
        { key: 'xR', label: 'RK4', color: 'body2', digits: 3 }
      ] },
      { title: 'Energi', unit: 'J', min: 0, window: 12, series: [
        { key: 'EX', label: 'eksak', color: 'body', digits: 4 },
        { key: 'EE', label: 'Euler', color: 'vector', digits: 4 },
        { key: 'ER', label: 'RK4', color: 'body2', digits: 4 }
      ] },
      { title: 'Galat |x − x eksak|', unit: 'm', min: 0, window: 12, series: [
        { key: 'errE', label: 'Euler', color: 'vector', digits: 4 },
        { key: 'errR', label: 'RK4', color: 'body2', digits: 4 }
      ] }
    ],

    init(p) {
      return { t: 0, acc: 0, xE: p.A, vE: 0, xR: p.A, vR: 0, diverged: false };
    },

    step(s, p, dt) {
      s.t += dt; s.acc += dt;
      const f = (t, y) => [y[1], -(p.k / p.m) * y[0]];
      while (s.acc >= p.h - 1e-12) {
        s.acc -= p.h;
        if (!s.diverged) {                        // Euler eksplisit: kemiringan di awal langkah
          const aE = -(p.k / p.m) * s.xE;
          s.xE += p.h * s.vE;
          s.vE += p.h * aE;
          if (Math.abs(s.xE) > Math.max(5 * p.A, 0.05)) s.diverged = true;
        }
        const r = SimCore.rk4(f, 0, [s.xR, s.vR], p.h);
        s.xR = r[0]; s.vR = r[1];
      }
    },

    measure(s, p) {
      const w = omega(p), xX = p.A * Math.cos(w * s.t), vX = -p.A * w * Math.sin(w * s.t);
      return {
        xX, xE: s.xE, xR: s.xR,
        EX: energy(xX, vX, p), EE: energy(s.xE, s.vE, p), ER: energy(s.xR, s.vR, p),
        errE: Math.abs(s.xE - xX), errR: Math.abs(s.xR - xX)
      };
    },

    positions(s, p) {
      const c = x => Math.max(-X_MAX, Math.min(X_MAX, x));
      return [[c(p.A * Math.cos(omega(p) * s.t)), ROWS[0]], [c(s.xE), ROWS[1]], [c(s.xR), ROWS[2]]];
    },

    draw(ctx, s, p, v, d) {
      const rows = [
        { y: ROWS[0], x: p.A * Math.cos(omega(p) * s.t), name: 'eksak', color: 'body' },
        { y: ROWS[1], x: s.xE, name: 'Euler', color: 'vector' },
        { y: ROWS[2], x: s.xR, name: 'RK4', color: 'body2' }
      ];
      d.line(WALL, -0.5, WALL, 0.55, 'fg', 3);                       // dinding
      d.line(0, -0.5, 0, 0.55, 'grid', 1);                            // x = 0
      d.text(0, 0.58, 'x = 0', 'muted', 'sm');
      rows.forEach(r => {
        const x = Math.max(-X_MAX, Math.min(X_MAX, r.x));
        const clipped = x !== r.x;
        d.line(WALL, r.y - BLK / 2 - 0.01, 0.75, r.y - BLK / 2 - 0.01, 'grid', 1);   // lantai
        d.spring(WALL, r.y, x - BLK / 2, r.y, 9, 0.06, 'fg');
        d.rect(x - BLK / 2, r.y - BLK / 2, BLK, BLK, r.color, clipped ? 'vector' : null);
        d.text(WALL - 0.03, r.y, r.name, 'fg', 'md', 'right');
      });
      if (s.diverged) d.text(0.75, ROWS[1] + BLK / 2 + 0.04, 'Euler divergen (|x| > 5A)', 'vector', 'sm', 'right');
      const T = omega(p) > 0 ? `${(2 * Math.PI / omega(p)).toFixed(2)} s` : '∞ (k = 0)';
      d.text(0.75, 0.58, `Δt = ${p.h.toFixed(2)} s · T = ${T}`, 'fg', 'sm', 'right');
    }
  });
})();
