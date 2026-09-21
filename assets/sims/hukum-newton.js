/* Hukum II Newton: kereta–katrol–beban gantung (Modul 4)
 * Asumsi model:
 *  - Kereta bermassa m_k di lintasan datar, ditarik tali melalui katrol oleh beban gantung m_g.
 *  - Tali tak bermassa dan tak mulur; katrol ideal (tak bermassa, tanpa gesekan).
 *  - Gesekan kinetis μ pada kereta (default 0). Sistem dilepas dari diam, menempuh jarak x = 0,60 m
 *    lalu berhenti di penahan.
 *  - Jika m_g g ≤ μ m_k g (atau massa total nol), sistem tetap diam.
 * Integrator: Euler semi-implisit, dt = 1/240 s (percepatan konstan, jadi eksak).
 * Skala visual: panah kecepatan = 0,25 s × v; panah gaya = 0,25 m/N.
 */
(function () {
  const G = 9.8;
  const D = 0.60;                       // m, jarak tempuh sampai penahan
  const X0 = 0.20;                      // m, posisi awal pusat kereta
  const PX = 1.00, PY = 0.045, PR = 0.03;   // katrol: pusat dan jari-jari (m)
  const CART_W = 0.12, CART_H = 0.06;
  const HANG_W = 0.05, HANG_H = 0.06;
  const V_SCALE = 0.25, F_SCALE = 0.25;

  const accel = (st, p) => {
    if (st.done) return 0;
    const net = p.mg * G - p.mu * p.mk * G, mTot = p.mk + p.mg;
    return (mTot <= 0 || (net <= 0 && st.v <= 0)) ? 0 : net / mTot;
  };

  const measure = (st, p) => {
    const a = accel(st, p);
    const moving = a > 0 || st.v > 0;
    return {
      x: st.x, v: st.v, a,
      F: p.mg * G,
      T: st.done ? 0 : p.mg * (G - a),
      f: st.done ? 0 : (moving ? p.mu * p.mk * G : p.mg * G)   // diam: gesekan statis mengimbangi tarikan
    };
  };

  SimCore.register({
    api: 1,
    id: 'hukum-newton',
    title: 'Hukum II Newton: kereta ditarik beban gantung',
    aspect: 4 / 3,
    view: { x: [-0.16, 1.26], y: [-0.86, 0.26] },
    dt: 1 / 240,

    params: [
      { key: 'mk', label: 'Massa kereta', symbol: 'm_k', unit: 'kg', min: 0, max: 0.30, step: 0.01, value: 0.20, resets: true },
      { key: 'mg', label: 'Massa beban gantung', symbol: 'm_g', unit: 'kg', min: 0, max: 0.10, step: 0.005, value: 0.05, resets: true },
      { key: 'mu', label: 'Gesekan kinetis', symbol: 'μ', unit: '', min: 0, max: 0.10, step: 0.005, value: 0 }
    ],

    graphs: [
      { title: 'Posisi', unit: 'm', min: 0, window: 5, series: [{ key: 'x', label: 'x', color: 'body' }] },
      { title: 'Kecepatan', unit: 'm/s', min: 0, window: 5, series: [{ key: 'v', label: 'v', color: 'vector2' }] },
      { title: 'Percepatan', unit: 'm/s²', min: 0, window: 5, series: [{ key: 'a', label: 'a', color: 'vector' }] },
      { title: 'Gaya', unit: 'N', min: 0, window: 5, series: [
        { key: 'F', label: 'm_g g', color: 'total' },
        { key: 'T', label: 'T', color: 'vector' },
        { key: 'f', label: 'f', color: 'body2' }
      ] }
    ],

    init(p) { return { x: 0, v: 0, done: false }; },

    step(st, p, dt) {
      if (st.done) return;
      st.v += accel(st, p) * dt;
      if (st.v < 0) st.v = 0;
      st.x += st.v * dt;
      if (st.x >= D) { st.x = D; st.v = 0; st.done = true; }
    },

    measure,

    positions(st, p) { return [[X0 + st.x, CART_H / 2], [PX + PR, -0.1 - st.x - HANG_H]]; },

    draw(ctx, st, p, v, d) {
      const cx = X0 + st.x;                       // pusat kereta
      const hy = -0.10 - st.x;                    // atas beban gantung
      const m = measure(st, p);

      // Lintasan, penahan, katrol dan dudukannya
      d.line(-0.1, 0, PX - PR, 0, 'fg', 3);
      d.rect(X0 + D + CART_W / 2, 0, 0.02, 0.09, 'fg');
      d.line(PX - PR, 0, PX - PR, PY, 'muted', 2);
      d.circle(PX, PY, PR, 'muted', false, 2);
      d.dot(PX, PY, 3, 'fg');
      d.line(PX + PR, -0.85, PX + PR, hy - HANG_H - 0.02, 'grid', 1);   // garis bantu jatuh

      // Tali: kereta → atas katrol → beban
      d.line(cx + CART_W / 2, PY, PX, PY + PR, 'fg', 1.5);
      d.line(PX + PR, PY, PX + PR, hy, 'fg', 1.5);

      // Kereta dan beban gantung
      d.rect(cx - CART_W / 2, 0.008, CART_W, CART_H, 'body');
      d.dot(cx - CART_W * 0.3, 0.008, 3, 'fg');
      d.dot(cx + CART_W * 0.3, 0.008, 3, 'fg');
      d.rect(PX + PR - HANG_W / 2, hy - HANG_H, HANG_W, HANG_H, 'body2');
      d.text(cx, CART_H + 0.06, `m_k = ${p.mk.toFixed(2)} kg`, 'muted', 'sm');
      d.text(PX + PR + 0.04, hy - HANG_H / 2, `m_g = ${p.mg.toFixed(3)} kg`, 'muted', 'sm', 'left');

      // Vektor gaya dan kecepatan
      const yc = CART_H / 2;
      d.arrow(cx + CART_W / 2, yc, m.T * F_SCALE, 0, 'vector', 'T');
      if (m.f > 0) d.arrow(cx - CART_W / 2, yc, -m.f * F_SCALE, 0, 'body2', 'f');
      d.arrow(cx, CART_H + 0.01, st.v * V_SCALE, 0, 'vector2', 'v');
      d.arrow(PX + PR, hy - HANG_H, 0, -m.F * F_SCALE, 'total', 'm_g g');

      // Tanda jarak tiap 10 cm dari posisi awal
      for (let i = 0; i <= 6; i++) {
        const x = X0 + CART_W / 2 + i * 0.1;
        d.line(x, 0, x, -(i % 5 ? 0.015 : 0.03), 'muted', 1);
      }
      d.text(X0 + CART_W / 2 + 0.3, -0.07, 'x = 0 … 0,6 m', 'muted', 'sm');
    }
  });
})();
