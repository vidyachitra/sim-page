/* Sistem pegas–massa vertikal (Modul 8: gerak harmonik sederhana)
 * Asumsi model:
 *  - Pegas ideal tak bermassa dengan konstanta k; beban m dianggap titik massa.
 *  - Simpangan x diukur dari titik kesetimbangan (tempat mg = k·Δl), ke atas positif. Dengan pilihan ini
 *    gravitasi tidak muncul dalam persamaan gerak dan energi potensial efektifnya ½ k x².
 *  - Redaman linear −b v (b = 0 mengekalkan energi). Dilepas dari diam pada simpangan A.
 * Integrator: velocity Verlet (simplektik, orde dua), dt = 1/240 s.
 * Skala visual: panah kecepatan = 0,15 s × v; panah percepatan = 0,02 s² × a.
 */
(function () {
  const G = 9.8;
  const L0 = 0.20;                  // m, panjang pegas tanpa beban
  const BLK_W = 0.10, BLK_H = 0.07;
  const V_SCALE = 0.15, A_SCALE = 0.02;

  const accel = (s, p) => -(p.k / p.m) * s.x - (p.b / p.m) * s.v;
  const energy = (s, p) => {
    const KE = 0.5 * p.m * s.v * s.v, PE = 0.5 * p.k * s.x * s.x;
    return { KE, PE, E: KE + PE };
  };
  const yEq = p => -L0 - p.m * G / p.k;              // titik kesetimbangan (atas balok)

  SimCore.register({
    api: 1,
    id: 'pegas-massa',
    title: 'Osilasi sistem pegas–massa vertikal',
    aspect: 1,
    view: { x: [-0.42, 0.42], y: [-0.72, 0.12] },
    dt: 1 / 240,
    conserved: 'E',

    params: [
      { key: 'm', label: 'Massa beban', symbol: 'm', unit: 'kg', min: 0.05, max: 0.25, step: 0.01, value: 0.10, resets: true },
      { key: 'k', label: 'Konstanta pegas', symbol: 'k', unit: 'N/m', min: 10, max: 50, step: 1, value: 20 },
      { key: 'A', label: 'Amplitudo awal', symbol: 'A', unit: 'm', min: 0.02, max: 0.10, step: 0.01, value: 0.05, resets: true },
      { key: 'b', label: 'Redaman', symbol: 'b', unit: 'kg/s', min: 0, max: 0.5, step: 0.02, value: 0 }
    ],

    graphs: [
      { title: 'Energi', unit: 'J', min: 0, window: 8, series: [
        { key: 'KE', label: 'EK', color: 'ke', digits: 4 },
        { key: 'PE', label: 'EP', color: 'pe', digits: 4 },
        { key: 'E', label: 'E', color: 'total', digits: 4 }
      ] },
      { title: 'Simpangan', unit: 'cm', window: 8, series: [{ key: 'xcm', label: 'x', color: 'body', digits: 1 }] },
      { title: 'Kecepatan', unit: 'm/s', window: 8, series: [{ key: 'v', label: 'v', color: 'vector2' }] },
      { title: 'Percepatan', unit: 'm/s²', window: 8, series: [{ key: 'a', label: 'a', color: 'vector' }] }
    ],

    init(p) { return { x: -p.A, v: 0 }; },          // ditarik ke bawah sejauh A lalu dilepas

    step(s, p, dt) {
      const vh = s.v + 0.5 * accel(s, p) * dt;       // setengah langkah kecepatan
      s.x += vh * dt;
      s.v = vh + 0.5 * accel({ x: s.x, v: vh }, p) * dt;
    },

    measure(s, p) {
      const e = energy(s, p);
      return { xcm: s.x * 100, v: s.v, a: accel(s, p), KE: e.KE, PE: e.PE, E: e.E };
    },

    positions(s, p) { return [[0, yEq(p) + s.x - BLK_H]]; },

    draw(ctx, s, p, v, d) {
      const ye = yEq(p), yt = ye + s.x;             // atas balok
      const T = 2 * Math.PI * Math.sqrt(p.m / p.k);

      d.line(-0.3, 0, 0.3, 0, 'fg', 3);                          // penjepit
      d.line(-0.32, ye, -0.12, ye, 'grid', 1);                    // titik setimbang
      d.text(-0.34, ye, 'x = 0', 'muted', 'sm', 'right');
      d.line(-0.32, ye + p.A, -0.12, ye + p.A, 'grid', 1);
      d.line(-0.32, ye - p.A, -0.12, ye - p.A, 'grid', 1);
      d.text(-0.34, ye + p.A, '+A', 'muted', 'sm', 'right');
      d.text(-0.34, ye - p.A, '−A', 'muted', 'sm', 'right');

      d.spring(0, 0, 0, yt, 12, 0.07, 'fg');
      d.rect(-BLK_W / 2, yt - BLK_H, BLK_W, BLK_H, 'body', 'fg');
      d.text(0, yt - BLK_H / 2, `${(p.m * 1000).toFixed(0)} g`, 'bg', 'sm');

      const a = accel(s, p), yc = yt - BLK_H / 2;
      d.arrow(BLK_W / 2 + 0.02, yc, 0, s.v * V_SCALE, 'vector2', 'v');
      d.arrow(BLK_W / 2 + 0.10, yc, 0, a * A_SCALE, 'vector', 'a');

      d.text(0.38, 0.06, `T = 2π√(m/k) = ${T.toFixed(2)} s`, 'fg', 'sm', 'right');
    },

    drag: {
      hit(s, p, x, y, r) {
        const yt = yEq(p) + s.x;
        return Math.abs(x) < BLK_W / 2 + r && y < yt + r && y > yt - BLK_H - r;
      },
      move(s, p, x, y) {
        s.x = Math.max(-0.16, Math.min(0.16, y + BLK_H / 2 - yEq(p)));
        s.v = 0;
      }
    }
  });
})();
