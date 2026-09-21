/* Hukum Hooke dan susunan pegas (Modul 6)
 * Tiga susunan digantung berdampingan dengan beban yang sama: pegas tunggal k₁, seri k₁–k₂, paralel k₁‖k₂.
 * Asumsi model:
 *  - Pegas ideal tak bermassa, masih dalam batas elastis: F = k x.
 *  - Seri: gaya sama di tiap pegas, regangan dijumlah → 1/k_s = 1/k₁ + 1/k₂.
 *  - Paralel: regangan sama, gaya dijumlah → k_p = k₁ + k₂.
 *  - Regangan diukur dari posisi tanpa beban (x₀). Perubahan beban ditampilkan sebagai relaksasi halus
 *    menuju kesetimbangan (τ = 0,3 s), bukan dinamika osilasi.
 * Integrator: relaksasi orde satu, dt = 1/240 s.
 */
(function () {
  const G = 9.8;
  const TAU = 0.3;                 // s, waktu relaksasi tampilan
  const L0 = 0.22;                 // m, panjang pegas tanpa beban (tunggal, paralel)
  const L0S = 0.16;                // m, panjang tiap pegas pada susunan seri
  const XS = [-0.62, 0, 0.62];     // m, posisi mendatar tiap susunan
  const HOOK_Y = 0;                // m, batang gantung
  const BLK_W = 0.09, BLK_H = 0.06;

  const kEq = p => ({ tunggal: p.k1, seri: p.k1 * p.k2 / (p.k1 + p.k2), paralel: p.k1 + p.k2 });
  const xEq = p => { const k = kEq(p); return { tunggal: p.m * G / k.tunggal, seri: p.m * G / k.seri, paralel: p.m * G / k.paralel }; };

  SimCore.register({
    api: 1,
    id: 'hukum-hooke',
    title: 'Hukum Hooke: pegas tunggal, seri, dan paralel',
    aspect: 16 / 9,
    view: { x: [-0.85, 0.85], y: [-0.72, 0.185] },   // memuat seri k₁ = k₂ = 20 N/m, m = 0,25 kg
    dt: 1 / 240,

    params: [
      { key: 'm', label: 'Massa beban', symbol: 'm', unit: 'kg', min: 0, max: 0.25, step: 0.01, value: 0.10 },
      { key: 'k1', label: 'Konstanta pegas 1', symbol: 'k₁', unit: 'N/m', min: 20, max: 100, step: 5, value: 50 },
      { key: 'k2', label: 'Konstanta pegas 2', symbol: 'k₂', unit: 'N/m', min: 20, max: 100, step: 5, value: 25 }
    ],

    graphs: [
      { title: 'Regangan', unit: 'cm', min: 0, window: 8, series: [
        { key: 'xt', label: 'tunggal', color: 'body', digits: 1 },
        { key: 'xs', label: 'seri', color: 'vector', digits: 1 },
        { key: 'xp', label: 'paralel', color: 'body2', digits: 1 }
      ] },
      { title: 'Konstanta efektif', unit: 'N/m', min: 0, window: 8, series: [
        { key: 'kt', label: 'k₁', color: 'body', digits: 1 },
        { key: 'ks', label: 'k_s', color: 'vector', digits: 1 },
        { key: 'kp', label: 'k_p', color: 'body2', digits: 1 }
      ] }
    ],

    init(p) { const e = xEq(p); return { xt: e.tunggal, xs: e.seri, xp: e.paralel }; },

    step(st, p, dt) {
      const e = xEq(p), f = 1 - Math.exp(-dt / TAU);
      st.xt += (e.tunggal - st.xt) * f;
      st.xs += (e.seri - st.xs) * f;
      st.xp += (e.paralel - st.xp) * f;
    },

    measure(st, p) {
      const k = kEq(p);
      return { xt: st.xt * 100, xs: st.xs * 100, xp: st.xp * 100, kt: k.tunggal, ks: k.seri, kp: k.paralel };
    },

    positions(st, p) {
      return [[XS[0], -L0 - st.xt - BLK_H], [XS[1], -2 * L0S - st.xs - BLK_H], [XS[2], -L0 - st.xp - BLK_H]];
    },

    draw(ctx, st, p, v, d) {
      const F = p.m * G;
      // Batang gantung dan penggaris
      d.line(-0.82, HOOK_Y, 0.82, HOOK_Y, 'fg', 3);
      d.line(-0.82, HOOK_Y, -0.82, -0.62, 'muted', 1);
      for (let i = 0; i <= 6; i++) {
        const y = -i * 0.1, len = i % 5 ? 0.02 : 0.04;
        d.line(-0.82, y, -0.82 + len, y, 'muted', 1);
        if (i % 5 === 0 && i) d.text(-0.77, y, `${i * 10} cm`, 'muted', 'sm', 'left');
      }
      const block = (x, yTop, color) => {
        d.rect(x - BLK_W / 2, yTop - BLK_H, BLK_W, BLK_H, color, 'fg');
        d.text(x, yTop - BLK_H / 2, `${(p.m * 1000).toFixed(0)} g`, 'bg', 'sm');
      };
      const label = (x, name, k, xv) => {
        d.text(x, 0.12, name, 'fg', 'md');
        d.text(x, 0.06, `k = ${k.toFixed(1)} N/m`, 'muted', 'sm');
        d.text(x + BLK_W / 2 + 0.03, -0.02 - L0 / 2 - xv / 2, `x = ${(xv * 100).toFixed(1)} cm`, 'muted', 'sm', 'left');
      };
      const k = kEq(p);

      // Tunggal
      let x = XS[0], yb = -L0 - st.xt;
      d.spring(x, HOOK_Y, x, yb, 10, 0.06, 'body');
      block(x, yb, 'body');
      label(x, 'tunggal', k.tunggal, st.xt);

      // Seri: pegas 1 lalu pegas 2; gaya sama, regangan masing-masing F/k
      x = XS[1];
      const x1 = st.xs * p.k2 / (p.k1 + p.k2), x2 = st.xs * p.k1 / (p.k1 + p.k2);   // x₁ : x₂ = k₂ : k₁
      const ym = -L0S - x1, ys = ym - L0S - x2;
      d.spring(x, HOOK_Y, x, ym, 7, 0.06, 'body');
      d.dot(x, ym, 3, 'fg');
      d.spring(x, ym, x, ys, 7, 0.06, 'vector');
      block(x, ys, 'vector');
      label(x, 'seri', k.seri, st.xs);

      // Paralel: dua pegas berdampingan, regangan sama
      x = XS[2]; yb = -L0 - st.xp;
      d.spring(x - 0.07, HOOK_Y, x - 0.07, yb, 10, 0.05, 'body');
      d.spring(x + 0.07, HOOK_Y, x + 0.07, yb, 10, 0.05, 'vector');
      d.line(x - 0.1, yb, x + 0.1, yb, 'fg', 2);
      block(x, yb, 'body2');
      label(x, 'paralel', k.paralel, st.xp);

      d.text(0, -0.68, `F = m g = ${F.toFixed(2)} N`, 'fg', 'md');
    }
  });
})();
