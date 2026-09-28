/* Koordinat Kartesius, silinder, dan bola (Kinematika)
 * Asumsi model:
 *  - Titik bergerak dalam ruang; posisi diberikan langsung (bukan hasil gaya), dijalankan oleh fase u
 *    yang bertambah dengan laju ω (rad/s):
 *      garis lurus A = (1,0; −0,5; 0,2) m ↔ B = (−0,4; 0,9; 0,8) m bolak-balik, laju v = ω·(1 m);
 *      heliks ρ = 0,8 m, φ = u, z naik-turun antara −0,6 m dan 0,9 m (0,12 m per rad);
 *      spiral pada bola r = 1 m, φ = u, θ bolak-balik 20°–160° (empat putaran per sapuan);
 *      titik tetap (0,4; 0,9; 0,8) m.
 *  - Konvensi fisika (ISO): θ = sudut kutub dari +z (0°–180°), φ = azimut di bidang xy dari +x ke +y (0°–360°);
 *    silinder (ρ, φ, z) memakai φ yang sama.
 *  - Gambar: proyeksi ortografik; kamera pada azimut "sudut pandang" dan elevasi di atas bidang xy.
 *    Bagian di belakang bidang tegak lurus arah pandang melalui O digambar lebih pudar.
 * Integrator: fase u bertambah ω·dt (eksak), dt = 1/240 s.
 * Skala visual: vektor satuan sepanjang U_LEN = 0,3 m; busur sudut berjari-jari ARC_R = 0,32 m.
 */
(function () {
  const { sin, cos, atan2, hypot, PI, min, max, abs } = Math;
  const DEG = 180 / PI, RAD = PI / 180;
  const U_LEN = 0.3;                  // m, panjang gambar vektor satuan
  const ARC_R = 0.32;                 // m, jari-jari busur θ dan φ
  const AX_POS = 1.35, AX_NEG = 0.9;  // m, panjang sumbu positif / negatif
  const R_REF = 1;                    // m, garis lurus: v = ω·R_REF
  const LA = [1.0, -0.5, 0.2], LB = [-0.4, 0.9, 0.8];
  const H_RHO = 0.8, H_Z0 = -0.6, H_Z1 = 0.9, H_PITCH = 0.12;
  const S_R = 1, S_TH0 = 20 * RAD, S_TH1 = 160 * RAD, S_TURNS = 4;
  const FIXED = [0.4, 0.9, 0.8];
  const TRAIL_EVERY = 3, TRAIL_N = 600;
  const PATHS = ['garis lurus', 'heliks', 'spiral pada bola', 'titik tetap'];
  const SYSTEMS = ['Kartesius', 'silinder', 'bola'];

  const fmt = (x, dg) => x.toFixed(dg).replace('.', ',').replace('-', '−');
  const tri = (u, L) => { const q = ((u % (2 * L)) + 2 * L) % (2 * L); return q < L ? q : 2 * L - q; };   // 0…L…0
  const LD = hypot(LB[0] - LA[0], LB[1] - LA[1], LB[2] - LA[2]);

  function pos(s, p) {
    const m = Math.round(p.path), u = s.u;
    if (m === 1) {
      const f = tri(u * R_REF, LD) / LD;
      return [LA[0] + (LB[0] - LA[0]) * f, LA[1] + (LB[1] - LA[1]) * f, LA[2] + (LB[2] - LA[2]) * f];
    }
    if (m === 2) return [H_RHO * cos(u), H_RHO * sin(u), H_Z0 + H_PITCH * tri(u, (H_Z1 - H_Z0) / H_PITCH)];
    if (m === 3) {
      const th = S_TH0 + (S_TH1 - S_TH0) * tri(u, 2 * PI * S_TURNS) / (2 * PI * S_TURNS);
      return [S_R * sin(th) * cos(u), S_R * sin(th) * sin(u), S_R * cos(th)];
    }
    return FIXED.slice();
  }
  // Kartesius → silinder dan bola. φ ∈ [0, 2π), θ ∈ [0, π].
  function coords(x, y, z) {
    let ph = atan2(y, x);
    if (ph < 0) ph += 2 * PI;
    if (ph >= 2 * PI) ph -= 2 * PI;
    const rho = hypot(x, y), r = hypot(rho, z);
    return { rho, ph, r, th: atan2(rho, z) };
  }
  // Kamera ortografik: kanan layar, atas layar, dan arah ke pengamat.
  function camera(p) {
    const a = p.az * RAD, e = p.el * RAD, ca = cos(a), sa = sin(a), ce = cos(e), se = sin(e);
    const R = [-sa, ca, 0], U = [-se * ca, -se * sa, ce], C = [ce * ca, ce * sa, se];
    return {
      pr: P => [P[0] * R[0] + P[1] * R[1], P[0] * U[0] + P[1] * U[1] + P[2] * U[2]],
      dir: V => [V[0] * R[0] + V[1] * R[1], V[0] * U[0] + V[1] * U[1] + V[2] * U[2]],
      depth: P => P[0] * C[0] + P[1] * C[1] + P[2] * C[2]
    };
  }
  const add = (A, B, k = 1) => [A[0] + B[0] * k, A[1] + B[1] * k, A[2] + B[2] * k];

  function withStyle(ctx, alpha, dash, fn) {
    ctx.save(); ctx.globalAlpha *= alpha; if (dash) ctx.setLineDash([5, 4]); fn(); ctx.restore();
  }

  SimCore.register({
    api: 1,
    id: 'koordinat-3d',
    title: 'Koordinat Kartesius, silinder, dan bola',
    aspect: 4 / 3,
    view: { x: [-1.5, 2.57], y: [-1.5, 1.55] },     // pemandangan dalam lingkaran ±1,5 m; kolom teks di kanan
    dt: 1 / 240,

    params: [
      { key: 'path', label: 'Lintasan', symbol: '', unit: '', min: 1, max: 4, step: 1, value: 2,
        options: PATHS, resets: true },
      { key: 'sys', label: 'Sistem', symbol: '', unit: '', min: 1, max: 3, step: 1, value: 2, options: SYSTEMS },
      { key: 'az', label: 'Sudut pandang', symbol: '', unit: '°', min: -180, max: 180, step: 5, value: 35 },
      { key: 'el', label: 'Elevasi', symbol: '', unit: '°', min: 0, max: 90, step: 5, value: 25 },
      { key: 'omega', label: 'Laju sudut', symbol: 'ω', unit: 'rad/s', min: 0, max: 2, step: 0.1, value: 0.8 }
    ],

    graphs: [
      { title: 'Kartesius', unit: 'm', series: [
        { key: 'x', label: 'x', color: 'body', digits: 2 },
        { key: 'y', label: 'y', color: 'body2', digits: 2 },
        { key: 'z', label: 'z', color: 'total', digits: 2 }
      ] },
      { title: 'Jarak', unit: 'm', min: 0, series: [
        { key: 'rho', label: 'ρ', color: 'pe', digits: 2 },
        { key: 'r', label: 'r', color: 'vector', digits: 2 }
      ] },
      { title: 'Sudut', unit: '°', min: 0, max: 360, series: [
        { key: 'thDeg', label: 'θ', color: 'vector2', digits: 1 },
        { key: 'phDeg', label: 'φ', color: 'accent', digits: 1 }
      ] }
    ],

    init(p) { return { u: 0, n: 0, trail: [] }; },

    step(s, p, dt) {
      if (Math.round(p.path) === 4) return;
      s.u += p.omega * dt;
      if (++s.n % TRAIL_EVERY === 0) {
        s.trail.push(pos(s, p));
        if (s.trail.length > TRAIL_N) s.trail.shift();
      }
    },

    measure(s, p) {
      const [x, y, z] = pos(s, p), c = coords(x, y, z);
      return { x, y, z, rho: c.rho, r: c.r, thDeg: c.th * DEG, phDeg: c.ph * DEG };
    },

    positions(s, p) {
      const cam = camera(p), P = pos(s, p), pts = [cam.pr(P)];
      for (let k = 0; k < 3; k++) {
        const e = [0, 0, 0]; e[k] = AX_POS; pts.push(cam.pr(e));
        e[k] = -AX_NEG; pts.push(cam.pr(e));
      }
      return pts;
    },

    draw(ctx, s, p, v, d) {
      const px = n => n / v.scale;
      const cam = camera(p), pr = cam.pr, sys = Math.round(p.sys), m = Math.round(p.path);
      const P = pos(s, p), [x, y, z] = P, c = coords(x, y, z);
      const cp = cos(c.ph), sp = sin(c.ph), ct = cos(c.th), st = sin(c.th);
      const O = [0, 0, 0], F = [x, y, 0];
      const far = Q => cam.depth(Q) < -1e-9;
      const seg = (A, B, color, w, dash, alpha = 1) => {
        const a = pr(A), b = pr(B);
        withStyle(ctx, alpha, dash, () => d.line(a[0], a[1], b[0], b[1], color, w));
      };
      // Kurva 3D; bagian di belakang O digambar lebih pudar.
      const curve = (pts, color, w, aNear, aFar) => {
        let run = [], back = null;
        const flush = () => { if (run.length > 1) withStyle(ctx, back ? aFar : aNear, false, () => d.polyline(run, color, w)); };
        for (const Q of pts) {
          const b = far(Q);
          if (back !== null && b !== back) { const last = run[run.length - 1]; flush(); run = [last]; }
          back = b; run.push(pr(Q));
        }
        flush();
      };
      const arc = (u1, u2, t0, t1, rad) => {             // busur rad·(cos t·u1 + sin t·u2)
        const pts = [], N = 40;
        for (let k = 0; k <= N; k++) { const t = t0 + (t1 - t0) * k / N; pts.push(add(add(O, u1, rad * cos(t)), u2, rad * sin(t))); }
        return pts;
      };
      // Label di tengah ruas, digeser tegak lurus di layar menjauhi titik acuan (proyeksi).
      const label = (A, B, str, color, ref) => {
        const a = pr(A), b = pr(B), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        let nx = -(b[1] - a[1]), ny = b[0] - a[0];
        const L = hypot(nx, ny);
        if (L < px(12)) return;
        nx /= L; ny /= L;
        const r = pr(ref);
        if ((r[0] - mx) * nx + (r[1] - my) * ny > 0) { nx = -nx; ny = -ny; }
        d.text(mx + nx * px(10), my + ny * px(10), str, color, 'md');
      };
      const at3 = (Q, str, color) => { const q = pr(Q); d.text(q[0], q[1], str, color, 'md'); };
      const vec = (V, color, str) => { const q = pr(P), dv = cam.dir(V); d.arrow(q[0], q[1], dv[0] * U_LEN, dv[1] * U_LEN, color, str); };

      // Kisi bidang xy
      for (let g = -1; g <= 1.001; g += 0.5) {
        curve([[g, -1, 0], [g, 1, 0]], 'grid', 1, 1, 0.6);
        curve([[-1, g, 0], [1, g, 0]], 'grid', 1, 1, 0.6);
      }

      // Kerangka tipis: silinder berjari-jari ρ atau bola berjari-jari r
      if (sys === 2 && c.rho > 1e-6) {
        const circ = h => arc([c.rho, 0, 0], [0, c.rho, 0], 0, 2 * PI, 1).map(Q => [Q[0], Q[1], h]);
        curve(circ(0), 'muted', 1, 0.45, 0.2);
        if (abs(z) > 1e-6) curve(circ(z), 'muted', 1, 0.45, 0.2);
        for (let k = 1; k < 4; k++) {
          const a = c.ph + k * PI / 2, Q = [c.rho * cos(a), c.rho * sin(a), 0];
          curve([Q, [Q[0], Q[1], z]], 'muted', 1, 0.45, 0.2);
        }
      }
      if (sys === 3 && c.r > 1e-6) {
        const o = pr(O);
        withStyle(ctx, 0.35, false, () => d.circle(o[0], o[1], c.r, 'muted', false, 1));
        for (let k = 0; k < 4; k++) {                         // meridian
          const a = k * PI / 4;
          curve(arc([0, 0, c.r], [c.r * cos(a), c.r * sin(a), 0], 0, 2 * PI, 1), 'muted', 1, 0.4, 0.15);
        }
        for (const t of [PI / 4, PI / 2, 3 * PI / 4]) {         // paralel
          const rr = c.r * sin(t), h = c.r * cos(t);
          curve(arc([rr, 0, 0], [0, rr, 0], 0, 2 * PI, 1).map(Q => [Q[0], Q[1], h]), 'muted', 1, 0.4, 0.15);
        }
      }

      // Sumbu: bagian negatif tipis, positif dengan panah dan label
      const AXN = ['x', 'y', 'z'];
      for (let k = 0; k < 3; k++) {
        const e = [0, 0, 0], n = [0, 0, 0]; e[k] = AX_POS; n[k] = -AX_NEG;
        seg(O, n, 'fg', 1, false, 0.6);
        const a = pr(O), b = pr(e), L = hypot(b[0] - a[0], b[1] - a[1]);
        if (L > px(4)) {
          d.arrow(a[0], a[1], b[0] - a[0], b[1] - a[1], 'fg');
          d.text(b[0] + (b[0] - a[0]) / L * px(12), b[1] + (b[1] - a[1]) / L * px(12), AXN[k], 'fg', 'md');
        }
      }

      // Lintasan
      curve(s.trail, 'trail', 2, 1, 0.5);

      // Konstruksi
      const ex = [1, 0, 0], ey = [0, 1, 0], ez = [0, 0, 1];
      const rhoH = [cp, sp, 0], phH = [-sp, cp, 0];
      if (sys === 1) {
        const X = [x, 0, 0], Y = [0, y, 0], Z = [0, 0, z];
        seg(P, F, 'body', 1.5, true); seg(F, X, 'body', 1.5, true); seg(F, Y, 'body', 1.5, true); seg(P, Z, 'body', 1.5, true);
        seg(O, X, 'body', 4); seg(O, Y, 'body', 4); seg(O, Z, 'body', 4);
        label(O, X, 'x', 'body', F); label(O, Y, 'y', 'body', F); label(O, Z, 'z', 'body', P);
      } else if (sys === 2) {
        seg(O, F, 'vector', 3); seg(F, P, 'body', 3);
        label(O, F, 'ρ', 'vector', [cos(c.ph / 2), sin(c.ph / 2), 0]);   // menjauhi busur φ
        label(F, P, 'z', 'body', O);
        if (c.rho > 1e-6) {
          const ar = min(ARC_R, 0.7 * c.rho);
          curve(arc(ex, ey, 0, c.ph, ar), 'vector2', 2, 1, 1);
          if (c.ph > 0.08) at3(arc(ex, ey, c.ph / 2, c.ph / 2, ar + px(12))[0], 'φ', 'vector2');
        }
      } else {
        seg(O, F, 'muted', 1, true); seg(F, P, 'muted', 1, true);
        seg(O, P, 'vector', 3);
        label(O, P, 'r', 'vector', [st * cp * 0.5, st * sp * 0.5, 1]);   // menjauhi busur θ (sisi +z)
        if (c.r > 1e-6) {
          const ar = min(ARC_R, 0.7 * c.r);
          curve(arc(ez, rhoH, 0, c.th, ar), 'vector2', 2, 1, 1);
          if (c.th > 0.08) at3(arc(ez, rhoH, c.th / 2, c.th / 2, ar + px(12))[0], 'θ', 'vector2');
          if (c.rho > 1e-6) {
            curve(arc(ex, ey, 0, c.ph, ar), 'vector2', 2, 1, 1);
            if (c.ph > 0.08) at3(arc(ex, ey, c.ph / 2, c.ph / 2, ar + px(12))[0], 'φ', 'vector2');
          }
        }
      }

      // Titik dan vektor satuan
      const q = pr(P);
      if (sys === 1) { vec(ex, 'body', 'î'); vec(ey, 'body', 'ĵ'); vec(ez, 'body', 'k̂'); }
      else if (sys === 2) { vec(rhoH, 'vector', 'ρ̂'); vec(phH, 'vector2', 'φ̂'); vec(ez, 'body', 'k̂'); }
      else {
        vec([st * cp, st * sp, ct], 'vector', 'r̂');
        vec([ct * cp, ct * sp, -st], 'vector2', 'θ̂');
        vec(phH, 'vector2', 'φ̂');
      }
      d.dot(q[0], q[1], 7, 'current');

      // Kolom teks: ketiga sistem selalu, yang dipilih ditonjolkan
      const tx = 1.55, lh = px(15.5);
      let ty = 1.46;
      const put = (str, col, size = 'sm', dx = 0) => { d.text(tx + dx, ty, str, col, size, 'left'); ty -= lh; };
      put(PATHS[m - 1], 'fg', 'md');
      if (m === 1) put(`v = ${fmt(p.omega * R_REF, 2)} m/s`, 'muted');
      else if (m !== 4) put(`ω = ${fmt(p.omega, 1)} rad/s`, 'muted');
      const block = (k, title, lines) => {
        ty -= lh * 0.3;
        const on = sys === k;
        put((on ? '▸ ' : '') + title, on ? 'fg' : 'muted', on ? 'md' : 'sm');
        lines.forEach(([str, col]) => put(str, on ? col : 'muted', 'sm', px(10)));
      };
      block(1, 'Kartesius', [[`x = ${fmt(x, 2)} m`, 'body'], [`y = ${fmt(y, 2)} m`, 'body'], [`z = ${fmt(z, 2)} m`, 'body']]);
      block(2, 'Silinder', [[`ρ = ${fmt(c.rho, 2)} m`, 'vector'], [`φ = ${fmt(c.ph * DEG, 1)}°`, 'vector2'], [`z = ${fmt(z, 2)} m`, 'body']]);
      block(3, 'Bola', [[`r = ${fmt(c.r, 2)} m`, 'vector'], [`θ = ${fmt(c.th * DEG, 1)}°`, 'vector2'], [`φ = ${fmt(c.ph * DEG, 1)}°`, 'vector2']]);
      d.text(-1.46, -1.42, 'θ dari +z (0–180°) · φ dari +x ke +y (0–360°)', 'muted', 'sm', 'left');
    }
  });
})();
