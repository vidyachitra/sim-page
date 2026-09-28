/* Koordinat Kartesius dan polar (Kinematika)
 * Asumsi model:
 *  - Titik bergerak di bidang xy; posisi diberikan langsung (lintasan tertutup, bukan hasil gaya).
 *  - θ diukur dari sumbu +x, berlawanan arah jarum jam, ditampilkan 0°–360°.
 *  - Lintasan dijalankan oleh fase u yang bertambah dengan laju ω (rad/s):
 *      lingkaran r = R, θ = u;  elips x = R cos u, y = 0,6R sin u;
 *      spiral Archimedes r = R(0,1 + 0,9 θ/4π), θ = u, dua putaran lalu mulai lagi;
 *      garis lurus y = 0,5R, x bolak-balik antara −1,1R dan 1,1R dengan laju v = ωR;
 *      titik bebas: diam, dapat diseret.
 * Integrator: fase u bertambah ω·dt (eksak, ω tetap selama langkah), dt = 1/240 s.
 * Skala visual: vektor satuan î, ĵ, r̂, θ̂ digambar sepanjang U_LEN = 0,3 m; busur θ berjari-jari ARC_R.
 */
(function () {
  const { sin, cos, atan2, hypot, PI, min, max, abs } = Math;
  const U_LEN = 0.3;              // m, panjang gambar vektor satuan
  const ARC_R = 0.28;             // m, jari-jari busur θ
  const ELL = 0.6;                // sumbu pendek elips = 0,6R
  const LINE_Y = 0.5;             // garis lurus pada y = 0,5R
  const LINE_X = 1.1;             // garis bolak-balik antara ±1,1R
  const SPIRAL_TURNS = 2;         // putaran spiral sebelum mulai lagi
  const XY_MAX = 1.6;             // m, batas seret titik bebas
  const TRAIL_EVERY = 4, TRAIL_N = 420;
  const NAMES = ['garis lurus', 'lingkaran', 'elips', 'spiral', 'titik bebas (seret)'];
  const SHOW = ['Kartesius', 'polar', 'keduanya'];
  const DEG = 180 / PI;

  const mode = p => Math.round(p.path);
  const fmt = (x, dg) => x.toFixed(dg).replace('.', ',').replace('-', '−');

  // Posisi (x, y) dari fase u.
  function pos(s, p) {
    const m = mode(p), R = p.R, u = s.u;
    if (m === 1) {
      const L = 2 * LINE_X, q = ((u % (2 * L)) + 2 * L) % (2 * L);
      return [(q < L ? -LINE_X + q : LINE_X - (q - L)) * R, LINE_Y * R];
    }
    if (m === 2) return [R * cos(u), R * sin(u)];
    if (m === 3) return [R * cos(u), ELL * R * sin(u)];
    if (m === 4) {
      const r = R * (0.1 + 0.9 * u / (2 * PI * SPIRAL_TURNS));
      return [r * cos(u), r * sin(u)];
    }
    return [s.fx, s.fy];
  }
  const polar = (x, y) => {
    let th = atan2(y, x);
    if (th < 0) th += 2 * PI;
    if (th >= 2 * PI) th -= 2 * PI;
    return { r: hypot(x, y), th };
  };

  function dashed(ctx, fn) { ctx.save(); ctx.setLineDash([5, 4]); fn(); ctx.restore(); }

  SimCore.register({
    api: 1,
    id: 'koordinat-2d',
    title: 'Koordinat Kartesius dan polar',
    aspect: 4 / 3,
    view: { x: [-1.85, 3.4], y: [-1.85, 1.85] },     // bidang ±1,85 m; kolom teks di kanan
    dt: 1 / 240,

    params: [
      { key: 'path', label: 'Lintasan', symbol: '', unit: '', min: 1, max: 5, step: 1, value: 2,
        options: NAMES, resets: true },
      { key: 'omega', label: 'Laju sudut', symbol: 'ω', unit: 'rad/s', min: 0, max: 2, step: 0.1, value: 0.8 },
      { key: 'R', label: 'Ukuran lintasan', symbol: 'R', unit: 'm', min: 0.3, max: 1.4, step: 0.05, value: 1 },
      { key: 'show', label: 'Tampilkan', symbol: '', unit: '', min: 1, max: 3, step: 1, value: 3, options: SHOW }
    ],

    graphs: [
      { title: 'Kartesius', unit: 'm', series: [
        { key: 'x', label: 'x', color: 'body', digits: 2 },
        { key: 'y', label: 'y', color: 'body2', digits: 2 }
      ] },
      { title: 'Jarak r', unit: 'm', min: 0, series: [{ key: 'r', label: 'r', color: 'vector', digits: 2 }] },
      { title: 'Sudut θ', unit: '°', min: 0, max: 360, series: [{ key: 'thDeg', label: 'θ', color: 'vector2', digits: 1 }] }
    ],

    init(p) {
      return { u: 0, n: 0, fx: 0.8, fy: 0.6, Rlast: p.R, trail: [] };
    },

    step(s, p, dt) {
      const m = mode(p);
      if (m === 5) return;
      if (p.R !== s.Rlast) { s.trail.length = 0; s.Rlast = p.R; }
      s.u += p.omega * dt;
      if (m === 4 && s.u >= 2 * PI * SPIRAL_TURNS) { s.u -= 2 * PI * SPIRAL_TURNS; s.trail.length = 0; }
      if (s.u > 1e4) s.u %= m === 1 ? 4 * LINE_X : 2 * PI;            // cegah fase membesar tanpa batas
      if (++s.n % TRAIL_EVERY === 0) {
        s.trail.push(pos(s, p));
        if (s.trail.length > TRAIL_N) s.trail.shift();
      }
    },

    measure(s, p) {
      const [x, y] = pos(s, p), q = polar(x, y);
      return { x, y, r: q.r, thDeg: q.th * DEG };
    },

    positions(s, p) {
      const [x, y] = pos(s, p);
      return [[x, y]];
    },

    draw(ctx, s, p, v, d) {
      const px = n => n / v.scale;
      const m = mode(p), sh = Math.round(p.show);
      const showC = sh !== 2, showP = sh !== 1;
      const [x, y] = pos(s, p), { r, th } = polar(x, y);
      const [X0, X1] = [-1.85, 1.85], [Y0, Y1] = [-1.85, 1.85];

      // Kisi dan sumbu
      for (let g = -1.5; g <= 1.51; g += 0.5) {
        if (abs(g) < 1e-9) continue;
        d.line(g, Y0, g, Y1, 'grid', 1);
        d.line(X0, g, X1, g, 'grid', 1);
        if (abs(g % 1) < 1e-9) {
          d.text(g, -px(10), fmt(g, 0), 'muted', 'sm');
          d.text(-px(5), g, fmt(g, 0), 'muted', 'sm', 'right');
        }
      }
      d.arrow(X0, 0, X1 - X0, 0, 'fg');
      d.arrow(0, Y0, 0, Y1 - Y0, 'fg');
      d.text(X1 - px(4), px(12), 'x (m)', 'fg', 'sm', 'right');
      d.text(px(8), Y1 - px(8), 'y (m)', 'fg', 'sm', 'left');
      d.text(-px(6), -px(10), 'O', 'muted', 'sm', 'right');

      // Lintasan
      d.polyline(s.trail, 'trail', 2);

      // Konstruksi Kartesius: proyeksi ke sumbu dan ruas x, y pada sumbu
      if (showC) {
        dashed(ctx, () => { d.line(x, y, x, 0, 'body', 1.5); d.line(x, y, 0, y, 'body', 1.5); });
        d.line(0, 0, x, 0, 'body', 4);
        d.line(0, 0, 0, y, 'body', 4);
        // Label x di bawah sumbu; label y di sisi yang berseberangan dengan label θ (arah θ/2).
        // Dekat O label digeser ke arah ujung ruas agar tidak menabrak busur θ.
        const lab = c => (abs(c) / 2 < ARC_R + 0.15 ? 0.72 * c : c / 2);
        const yLeft = cos(th / 2) >= 0;
        if (abs(x) > px(10)) d.text(lab(x), -px(10), 'x', 'body', 'md');
        if (abs(y) > px(10)) d.text(yLeft ? -px(8) : px(8), lab(y), 'y', 'body', 'md', yLeft ? 'right' : 'left');
      }

      // Konstruksi polar: ruas r dan busur θ dari +x
      if (showP && r > 1e-6) {
        d.line(0, 0, x, y, 'vector', 3);
        const nx = -sin(th), ny = cos(th);                       // normal ruas r (arah θ̂)
        d.text(x / 2 + nx * px(10), y / 2 + ny * px(10), 'r', 'vector', 'md');   // di sisi +θ̂, jauh dari busur
        const ar = min(ARC_R, 0.6 * r), arc = [], N = 48;
        for (let k = 0; k <= N; k++) { const a = th * k / N; arc.push([ar * cos(a), ar * sin(a)]); }
        d.polyline(arc, 'vector2', 2);
        const am = th / 2, lr = ar + px(11);
        if (th > 0.05) d.text(lr * cos(am), lr * sin(am), 'θ', 'vector2', 'md');
      }

      // Titik dan vektor satuan
      if (showC) {
        d.arrow(x, y, U_LEN, 0, 'body', 'î');
        d.arrow(x, y, 0, U_LEN, 'body', 'ĵ');
      }
      if (showP && r > 1e-6) {
        d.arrow(x, y, U_LEN * cos(th), U_LEN * sin(th), 'vector', 'r̂');
        d.arrow(x, y, -U_LEN * sin(th), U_LEN * cos(th), 'vector2', 'θ̂');
      }
      d.dot(x, y, 7, 'current');

      // Kolom teks
      const tx = 1.96, lh = px(17);
      let ty = 1.72;
      const put = (str, col = 'fg', size = 'sm') => { d.text(tx, ty, str, col, size, 'left'); ty -= lh; };
      put(NAMES[m - 1], 'fg', 'md');
      if (m === 1) put(`v = ωR = ${fmt(p.omega * p.R, 2)} m/s`, 'muted');
      else if (m !== 5) put(`ω = ${fmt(p.omega, 1)} rad/s`, 'muted');
      ty -= lh * 0.5;
      put(`x = ${fmt(x, 2)} m`, showC ? 'body' : 'muted');
      put(`y = ${fmt(y, 2)} m`, showC ? 'body' : 'muted');
      put(`r = ${fmt(r, 2)} m`, showP ? 'vector' : 'muted');
      put(`θ = ${fmt(th * DEG, 1)}°`, showP ? 'vector2' : 'muted');
      ty -= lh * 0.5;
      put('x = r cos θ', 'muted');
      put('y = r sin θ', 'muted');
      put('r = √(x² + y²)', 'muted');
      put('θ = atan2(y, x)', 'muted');
      ty -= lh * 0.5;
      put('θ dari +x,', 'muted');
      put('lawan jarum jam', 'muted');
    },

    drag: {
      hit(s, p, x, y, r) {
        if (mode(p) !== 5) return false;
        return hypot(x - s.fx, y - s.fy) < max(r, 0.08);
      },
      move(s, p, x, y) {
        s.fx = max(-XY_MAX, min(XY_MAX, x));
        s.fy = max(-XY_MAX, min(XY_MAX, y));
      }
    }
  });
})();
