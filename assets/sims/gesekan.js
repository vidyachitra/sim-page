/* Gesekan statis dan kinetis: balok ditarik beban gantung (Modul 5)
 * Asumsi model:
 *  - Balok bermassa M di lintasan datar, ditarik tali melalui katrol ideal oleh beban gantung m_g.
 *  - Diam selama m_g g ≤ μ_s M g (gesekan statis mengimbangi tarikan); setelah bergerak berlaku f_k = μ_k M g.
 *  - Dilepas dari diam, menempuh jarak x = 0,60 m lalu berhenti di penahan.
 *  - Jika sedang bergerak dan μ_k M g > m_g g, balok melambat sampai berhenti lalu diam kembali.
 * Integrator: Euler semi-implisit, dt = 1/240 s (percepatan konstan per fase, jadi eksak).
 * Skala visual: panah kecepatan = 0,25 s × v; panah gaya = 0,25 m/N.
 */
(function () {
  const G = 9.8;
  const D = 0.60;                       // m
  const X0 = 0.20;                      // m, posisi awal pusat balok
  const PX = 1.00, PY = 0.045, PR = 0.03;
  const BLK_W = 0.12, BLK_H = 0.07;
  const HANG_W = 0.05, HANG_H = 0.06;
  const V_SCALE = 0.25, F_SCALE = 0.25;

  // Fase gerak: 'statis' (diam, tarikan ≤ f_s,maks) atau 'kinetis' (bergerak).
  const phase = (st, p) => {
    if (st.done) return 'selesai';
    if (st.v > 0) return 'kinetis';
    return p.mg * G > p.mus * p.M * G ? 'kinetis' : 'statis';
  };
  const accel = (st, p) => {
    if (phase(st, p) !== 'kinetis') return 0;
    return (p.mg * G - p.muk * p.M * G) / (p.M + p.mg);
  };
  const measure = (st, p) => {
    const ph = phase(st, p), a = accel(st, p);
    const F = p.mg * G;
    return {
      x: st.x, v: st.v, a, F,
      f: ph === 'kinetis' ? p.muk * p.M * G : (ph === 'statis' ? F : 0),
      fsmax: p.mus * p.M * G
    };
  };

  SimCore.register({
    api: 1,
    id: 'gesekan',
    title: 'Gesekan statis dan kinetis pada balok yang ditarik',
    aspect: 4 / 3,
    view: { x: [-0.16, 1.26], y: [-0.86, 0.26] },
    dt: 1 / 240,

    params: [
      { key: 'M', label: 'Massa balok', symbol: 'M', unit: 'kg', min: 0.10, max: 0.30, step: 0.01, value: 0.20, resets: true },
      { key: 'mg', label: 'Massa beban gantung', symbol: 'm_g', unit: 'kg', min: 0, max: 0.12, step: 0.005, value: 0.03, resets: true },
      { key: 'mus', label: 'Koefisien statis', symbol: 'μ_s', unit: '', min: 0.05, max: 0.60, step: 0.01, value: 0.20 },
      { key: 'muk', label: 'Koefisien kinetis', symbol: 'μ_k', unit: '', min: 0.05, max: 0.60, step: 0.01, value: 0.16 }
    ],

    graphs: [
      { title: 'Gaya', unit: 'N', min: 0, window: 5, series: [
        { key: 'F', label: 'm_g g', color: 'total' },
        { key: 'f', label: 'f', color: 'body2' },
        { key: 'fsmax', label: 'μ_s M g', color: 'muted' }
      ] },
      { title: 'Percepatan', unit: 'm/s²', window: 5, series: [{ key: 'a', label: 'a', color: 'vector' }] },
      { title: 'Kecepatan', unit: 'm/s', min: 0, window: 5, series: [{ key: 'v', label: 'v', color: 'vector2' }] },
      { title: 'Posisi', unit: 'm', min: 0, window: 5, series: [{ key: 'x', label: 'x', color: 'body' }] }
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

    positions(st, p) { return [[X0 + st.x, BLK_H / 2], [PX + PR, -0.1 - st.x - HANG_H]]; },

    draw(ctx, st, p, v, d) {
      const cx = X0 + st.x, hy = -0.10 - st.x;
      const m = measure(st, p), ph = phase(st, p);

      d.line(-0.1, 0, PX - PR, 0, 'fg', 3);
      d.rect(X0 + D + BLK_W / 2, 0, 0.02, 0.09, 'fg');
      d.line(PX - PR, 0, PX - PR, PY, 'muted', 2);
      d.circle(PX, PY, PR, 'muted', false, 2);
      d.dot(PX, PY, 3, 'fg');
      d.line(PX + PR, -0.85, PX + PR, hy - HANG_H - 0.02, 'grid', 1);

      d.line(cx + BLK_W / 2, PY, PX, PY + PR, 'fg', 1.5);
      d.line(PX + PR, PY, PX + PR, hy, 'fg', 1.5);

      d.rect(cx - BLK_W / 2, 0, BLK_W, BLK_H, 'body', 'fg');
      d.rect(PX + PR - HANG_W / 2, hy - HANG_H, HANG_W, HANG_H, 'body2');
      d.text(cx, BLK_H + 0.07, `M = ${p.M.toFixed(2)} kg`, 'muted', 'sm');
      d.text(cx, BLK_H / 2, ph, 'bg', 'sm');
      d.text(PX + PR + 0.04, hy - HANG_H / 2, `m_g = ${p.mg.toFixed(3)} kg`, 'muted', 'sm', 'left');

      const yc = BLK_H / 2;
      const T = ph === 'kinetis' ? p.mg * (G - m.a) : m.F;   // tali menarik balok
      d.arrow(cx + BLK_W / 2, yc, T * F_SCALE, 0, 'vector', 'T');
      if (m.f > 0) d.arrow(cx - BLK_W / 2, yc, -m.f * F_SCALE, 0, 'body2', ph === 'kinetis' ? 'f_k' : 'f_s');
      d.arrow(cx, BLK_H + 0.01, st.v * V_SCALE, 0, 'vector2', 'v');
      d.arrow(PX + PR, hy - HANG_H, 0, -m.F * F_SCALE, 'total', 'm_g g');

      for (let i = 0; i <= 6; i++) {
        const x = X0 + BLK_W / 2 + i * 0.1;
        d.line(x, 0, x, -(i % 5 ? 0.015 : 0.03), 'muted', 1);
      }
      d.text(X0 + BLK_W / 2 + 0.3, -0.07, 'x = 0 … 0,6 m', 'muted', 'sm');
    }
  });
})();
