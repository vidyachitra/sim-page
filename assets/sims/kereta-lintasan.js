/* Kereta pada lintasan miring–datar (Modul 2: GLB dan GLBB)
 * Asumsi model:
 *  - Kereta dianggap titik massa; lintasan miring sepanjang L₁ = 1,0 m, lalu datar 1,0 m.
 *  - Dilepas dari diam di puncak bidang miring; sudut θ tetap selama gerak.
 *  - Gesekan kinetis μ (default 0) bekerja di kedua bagian; sambungan mulus, laju tidak berubah.
 *  - Berhenti di penahan ujung lintasan datar.
 * Integrator: Euler semi-implisit, dt = 1/240 s (percepatan konstan per bagian, jadi eksak).
 * Skala visual: panah kecepatan = 0,25 s × v; panah percepatan = 0,25 s² × a.
 * Sisipan grafik s–t² (fase bidang miring) dicuplik tiap 0,05 s; gradiennya a/2.
 */
(function () {
  const L1 = 1.0, L2 = 1.0;   // m, panjang bagian miring dan datar
  const V_SCALE = 0.25;       // s
  const A_SCALE = 0.25;       // s²
  const CART_W = 0.10, CART_H = 0.05;   // m
  const rad = deg => deg * Math.PI / 180;

  // Posisi kereta (x, y) dari jarak tempuh s sepanjang lintasan.
  const pos = (s, th) => s < L1
    ? [s * Math.cos(th), (L1 - s) * Math.sin(th)]
    : [L1 * Math.cos(th) + (s - L1), 0];

  // Percepatan sepanjang lintasan pada bagian tempat kereta berada.
  const accel = (st, p) => {
    const th = rad(p.theta), g = 9.8;
    if (st.s < L1) {
      const a = g * (Math.sin(th) - p.mu * Math.cos(th));
      return (a < 0 && st.v <= 0) ? 0 : a;          // gesekan statis menahan di bidang miring
    }
    return st.v > 0 ? -p.mu * g : 0;
  };

  SimCore.register({
    api: 1,
    id: 'kereta-lintasan',
    title: 'Kereta pada lintasan miring lalu datar',
    aspect: 16 / 9,
    view: { x: [-0.12, 2.16], y: [-0.36, 0.92] },
    dt: 1 / 240,

    params: [
      { key: 'theta', label: 'Sudut miring', symbol: 'θ', unit: '°', min: 0, max: 10, step: 0.5, value: 5, resets: true },
      { key: 'mu', label: 'Gesekan kinetis', symbol: 'μ', unit: '', min: 0, max: 0.10, step: 0.005, value: 0 }
    ],

    graphs: [
      { title: 'Posisi', unit: 'm', min: 0, window: 6, series: [{ key: 's', label: 's', color: 'body' }] },
      { title: 'Kecepatan', unit: 'm/s', min: 0, window: 6, series: [{ key: 'v', label: 'v', color: 'vector2' }] },
      { title: 'Percepatan', unit: 'm/s²', window: 6, series: [{ key: 'a', label: 'a', color: 'vector' }] }
    ],

    init(p) { return { s: 0, v: 0, t: 0, done: false, pts: [], nextSample: 0 }; },

    step(st, p, dt) {
      if (st.done) return;
      const a = accel(st, p);
      st.v += a * dt;                                 // kecepatan dulu
      if (st.v < 0) st.v = 0;
      st.s += st.v * dt;                              // lalu posisi
      st.t += dt;
      if (st.s >= L1 + L2) { st.s = L1 + L2; st.v = 0; st.done = true; }
      if (st.s < L1 && st.t >= st.nextSample) {   // cuplikan untuk grafik s–t²
        st.pts.push([st.t * st.t, st.s]);
        st.nextSample += 0.05;
      }
    },

    measure(st, p) { return { s: st.s, v: st.v, a: st.done ? 0 : accel(st, p) }; },

    positions(st, p) { return [pos(st.s, rad(p.theta))]; },

    draw(ctx, st, p, v, d) {
      const th = rad(p.theta);
      const [jx, jy] = pos(L1, th);                   // sambungan miring–datar
      const top = pos(0, th);

      // Lintasan, penyangga, penahan
      d.line(0, -0.02, 0, top[1], 'muted', 2);
      d.line(top[0], top[1], jx, jy, 'fg', 3);
      d.line(jx, 0, jx + L2, 0, 'fg', 3);
      d.rect(jx + L2, 0, 0.03, 0.08, 'fg');

      // Tanda tiap 10 cm; bagian datar diberi label dari sambungan (x = 0 saat masuk bagian datar)
      for (let i = 0; i <= 10; i++) {
        const s = i * 0.1;
        const [mx, my] = pos(s, th), len = i % 5 ? 0.015 : 0.03;
        d.line(mx, my, mx - Math.sin(th) * len, my - Math.cos(th) * len, 'muted', 1);
        d.line(jx + s, 0, jx + s, -len, 'muted', 1);
        if (i % 5 === 0) d.text(jx + s, -0.08, `${i * 10} cm`, 'muted', 'sm');
      }

      // Kereta: kotak yang mengikuti kemiringan bagian tempatnya berada
      const [cx, cy] = pos(st.s, th);
      const ang = st.s < L1 ? -th : 0;
      const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
      const hw = CART_W / 2;
      const corner = (a, b) => [cx + ux * a + nx * b, cy + uy * a + ny * b];
      d.polygon([corner(-hw, 0.008), corner(hw, 0.008), corner(hw, CART_H), corner(-hw, CART_H)], 'body');
      d.dot(...corner(-hw * 0.6, 0.008), 3, 'fg');
      d.dot(...corner(hw * 0.6, 0.008), 3, 'fg');

      // Vektor kecepatan dan percepatan sepanjang lintasan
      const a = st.done ? 0 : accel(st, p);
      const mid = corner(0, CART_H / 2);
      d.arrow(mid[0], mid[1], ux * st.v * V_SCALE, uy * st.v * V_SCALE, 'vector2', 'v');
      d.arrow(mid[0], mid[1] + 0.06, ux * a * A_SCALE, uy * a * A_SCALE, 'vector', 'a');

      d.text(top[0] - 0.02, top[1] + 0.12, `θ = ${p.theta.toFixed(1)}°`, 'muted', 'sm', 'left');

      // Sisipan: s terhadap t² selama di bidang miring (linear, gradien a/2)
      const ox = 1.05, oy = 0.30, W = 1.0, H = 0.54;
      const aInc = 9.8 * (Math.sin(th) - p.mu * Math.cos(th));        // percepatan di bidang miring
      const t2Max = aInc > 0 ? Math.ceil(2 * L1 / aInc) : 1;         // t² saat mencapai sambungan
      const gx = t2 => ox + Math.min(t2, t2Max) / t2Max * W, gy = sv => oy + sv / L1 * H;
      d.line(ox, oy, ox + W, oy, 'muted', 1);
      d.line(ox, oy, ox, oy + H, 'muted', 1);
      d.text(ox - 0.02, oy, '0', 'muted', 'sm', 'right');
      d.text(ox - 0.02, oy + H, `${L1.toFixed(1)} m`, 'muted', 'sm', 'right');
      d.text(ox + W, oy - 0.06, `${t2Max} s²`, 'muted', 'sm', 'right');
      d.text(ox + 0.02, oy + H + 0.05, 's terhadap t²', 'fg', 'sm', 'left');
      d.line(ox, gy(L1), ox + W, gy(L1), 'grid', 1);
      st.pts.forEach(([t2, sv]) => d.dot(gx(t2), gy(sv), 2.5, 'body'));
      if (st.pts.length > 1) {
        const [t2, sv] = st.pts[st.pts.length - 1];
        d.text(gx(t2) + 0.03, gy(sv), `gradien = a/2 = ${(sv / t2).toFixed(2)}`, 'body', 'sm', 'left');
      }
    }
  });
})();
