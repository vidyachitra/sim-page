/* Teori kinetik gas (Kalor dan Termodinamika: teori kinetik dan gas ideal)
 * Asumsi model:
 *  - Gas 2D: N cakram keras bermassa atom argon (m = 6,63e-26 kg) dalam kotak; satuan dunia nanometer.
 *  - Diameter tumbukan d = 0,6 nm (argon ≈ 0,34 nm), diperbesar agar relaksasi terlihat dalam beberapa detik.
 *  - Tumbukan antaratom dan dengan dinding lenting sempurna; tanpa gaya tarik, tanpa rotasi.
 *    Pusat atom memantul tepat pada garis dinding (luas yang dijelajahi = A).
 *  - 2D, dua derajat kebebasan: ⟨½mv²⟩ = kT dan PA = NkT (tekanan = gaya per panjang dinding, ditampilkan dalam mN/m).
 *    Dalam 3D: ⟨½mv²⟩ = (3/2)kT dan PV = NkT.
 *  - Awal: semua atom berlaju sama (½mv² = kT), arah acak (PRNG berbenih); tumbukan membawanya ke
 *    distribusi Maxwell–Boltzmann 2D f(v) = (mv/kT)·exp(−mv²/2kT).
 *  - Ukuran cakram yang berhingga membuat P_ukur sedikit di atas NkT/A (≈ 1 + nπd²/2: ≈ 5 % pada bawaan, ≈ 19 % pada N = 200, L = 20 nm).
 *  - Dinding kanan bergerak ke lebar baru dengan laju WALL_SPEED = 40 m/s; atom memantul dalam kerangka
 *    dinding, jadi pemampatan memanaskan dan pemuaian mendinginkan (kerja adiabatik; 2D: TA ≈ tetap).
 *  - P_ukur: impuls ke keempat dinding / (keliling × Δt), dirata-rata bergerak eksponensial τ = 0,1 ns.
 *  - Histogram laju dirata-rata bergerak eksponensial τ = 0,05 ns; kurva teori memakai T saat ini.
 * Waktu: tampilan diperlambat 10¹⁰× (timeScale 1e-10: 1 s tampilan = 0,1 ns). dt = 0,1 ps.
 * Integrator: gerak lurus + tumbukan pasangan diputar mundur ke saat kontak (tanpa terowongan), energi kekal.
 */
(function () {
  const TS = 1e-10;              // s simulasi per s tampilan
  const K_B = 1.380649e-23;      // J/K
  const M = 6.63e-26;            // kg, argon
  const H = 30;                  // nm, tinggi kotak
  const R = 0.3;                 // nm, jari-jari tumbukan
  const NM = 1e9;                // nm per m
  const WALL_SPEED = 40;         // m/s, laju dinding kanan
  const TAU_P = 1e-10;           // s, rata-rata tekanan
  const TAU_H = 5e-11;           // s, rata-rata histogram
  const NBIN = 24;               // pita histogram
  const HIST_EVERY = 4;          // langkah per pembaruan histogram
  const TRAIL_EVERY = 10, TRAIL_LEN = 100;

  function rng(s) {              // mulberry32; state s.seed
    s.seed = (s.seed + 0x6D2B79F5) | 0;
    let t = s.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const kinetic = s => { let e = 0; for (let i = 0; i < s.n; i++) e += s.vx[i] * s.vx[i] + s.vy[i] * s.vy[i]; return 0.5 * M * e; };
  const tempOf = s => kinetic(s) / (s.n * K_B);
  const vScale = T => Math.sqrt(K_B * T / M);                  // laju paling mungkin 2D
  const fmt = (x, dg) => x.toFixed(dg).replace('.', ',');

  // Histogram laju sesaat (fraksi per pita) ke dalam out.
  function instHist(s, out) {
    out.fill(0);
    const w = s.vmax / NBIN;
    for (let i = 0; i < s.n; i++) {
      const b = Math.floor(Math.hypot(s.vx[i], s.vy[i]) / w);
      if (b < NBIN) out[b] += 1 / s.n;
    }
  }
  function resetHist(s, T) {
    s.Tref = T;
    s.vmax = 4.5 * vScale(T);
    instHist(s, s.hist);
  }

  SimCore.register({
    api: 1,
    id: 'teori-kinetik',
    title: 'Teori kinetik gas',
    aspect: 4 / 3,
    view: { x: [-3, 83], y: [-30.5, 35] },   // nm
    dt: 1e-13,
    timeScale: TS,
    conserved: 'Ek',                         // dinding diam pada bawaan: energi kinetik total kekal

    params: [
      { key: 'N', label: 'Jumlah atom', symbol: 'N', unit: '', min: 20, max: 200, step: 10, value: 100, resets: true },
      { key: 'T0', label: 'Suhu awal', symbol: 'T₀', unit: 'K', min: 100, max: 1000, step: 50, value: 300, resets: true },
      { key: 'L', label: 'Lebar kotak', symbol: 'L', unit: 'nm', min: 20, max: 60, step: 1, value: 40 }
    ],

    graphs: [
      { title: 'Suhu', unit: 'K', min: 0, series: [{ key: 'T', label: 'T', color: 'vector', digits: 0 }] },
      { title: 'Tekanan', unit: 'mN/m', min: 0, series: [
        { key: 'Pu', label: 'P_ukur', color: 'body', digits: 3 },
        { key: 'Pt', label: 'P_teori = NkT/A', color: 'muted', digits: 3 }
      ] }
    ],

    init(p) {
      const n = Math.round(p.N);
      const s = { seed: 12345, n, wx: p.L, u: 0, x: new Array(n), y: new Array(n), vx: new Array(n), vy: new Array(n),
        order: [], J: 0, Psum: 0, Pw: 0, hist: new Array(NBIN).fill(0), tmp: new Array(NBIN).fill(0),
        vmax: 1, Tref: p.T0, k: 0, trail: [] };
      // Atom di sel kisi (acak di dalam sel) agar tak ada yang tumpang tindih.
      const cols = Math.ceil(Math.sqrt(n * p.L / H)), rows = Math.ceil(n / cols);
      const cw = p.L / cols, ch = H / rows, v0 = Math.sqrt(2 * K_B * p.T0 / M);
      const cells = [];
      for (let c = 0; c < cols * rows; c++) cells.push(c);
      for (let c = cells.length - 1; c > 0; c--) { const j = Math.floor(rng(s) * (c + 1)); [cells[c], cells[j]] = [cells[j], cells[c]]; }
      for (let i = 0; i < n; i++) {
        const cx = cells[i] % cols, cy = Math.floor(cells[i] / cols);
        s.x[i] = (cx + 0.5) * cw + (rng(s) - 0.5) * Math.max(0, cw - 2.2 * R);
        s.y[i] = (cy + 0.5) * ch + (rng(s) - 0.5) * Math.max(0, ch - 2.2 * R);
        const a = 2 * Math.PI * rng(s);
        s.vx[i] = v0 * Math.cos(a); s.vy[i] = v0 * Math.sin(a);
        s.order.push(i);
      }
      resetHist(s, p.T0);
      return s;
    },

    step(s, p, dt) {
      const n = s.n, d = 2 * R, d2 = d * d;
      // Dinding kanan menuju lebar slider dengan laju berhingga.
      const gap = p.L - s.wx, move = WALL_SPEED * dt * NM;
      s.u = Math.abs(gap) <= move ? 0 : Math.sign(gap) * WALL_SPEED;
      s.wx = Math.abs(gap) <= move ? p.L : s.wx + Math.sign(gap) * move;

      // Gerak lurus.
      const f = dt * NM;
      for (let i = 0; i < n; i++) { s.x[i] += s.vx[i] * f; s.y[i] += s.vy[i] * f; }

      // Tumbukan antaratom: urutkan menurut x (sisip, hampir terurut), cek pasangan yang dekat.
      const o = s.order;
      for (let a = 1; a < n; a++) {
        const k = o[a], xk = s.x[k];
        let b = a - 1;
        while (b >= 0 && s.x[o[b]] > xk) { o[b + 1] = o[b]; b--; }
        o[b + 1] = k;
      }
      for (let a = 0; a < n; a++) {
        const i = o[a];
        for (let b = a + 1; b < n; b++) {
          const j = o[b];
          const dx = s.x[j] - s.x[i];
          if (dx >= d) break;
          const dy = s.y[j] - s.y[i];
          const r2 = dx * dx + dy * dy;
          if (r2 >= d2) continue;
          const dvx = (s.vx[j] - s.vx[i]) * f, dvy = (s.vy[j] - s.vy[i]) * f;   // nm per langkah
          const bb = dx * dvx + dy * dvy;
          if (bb >= 0) continue;                                          // sudah menjauh
          // Putar mundur ke saat kontak: |Δr + Δv·τ| = d, τ ∈ [−1, 0] (dalam satuan langkah).
          const aa = dvx * dvx + dvy * dvy;
          let tau = (-bb - Math.sqrt(Math.max(0, bb * bb - aa * (r2 - d2)))) / aa;
          if (!(tau >= -1)) tau = -1;
          const cx = dx + dvx * tau, cy = dy + dvy * tau, cl = Math.hypot(cx, cy) || d;
          const nx = cx / cl, ny = cy / cl;
          const jn = (s.vx[j] - s.vx[i]) * nx + (s.vy[j] - s.vy[i]) * ny;    // m/s, < 0
          // Tukar komponen normal (massa sama), lalu pindahkan posisi sesuai lintasan baru.
          s.vx[i] += jn * nx; s.vy[i] += jn * ny; s.vx[j] -= jn * nx; s.vy[j] -= jn * ny;
          const sh = -tau * f;                                              // sisa waktu × f
          s.x[i] += jn * nx * sh; s.y[i] += jn * ny * sh; s.x[j] -= jn * nx * sh; s.y[j] -= jn * ny * sh;
        }
      }

      // Dinding: pantul dalam kerangka dinding; catat impuls.
      let J = 0;
      for (let i = 0; i < n; i++) {
        // Pusat atom memantul pada garis dinding, jadi luas yang dijelajahi pusat = A persis.
        if (s.x[i] < 0) { s.x[i] = -s.x[i]; if (s.vx[i] < 0) { J += -2 * M * s.vx[i]; s.vx[i] = -s.vx[i]; } }
        if (s.x[i] > s.wx) {
          s.x[i] = 2 * s.wx - s.x[i];
          if (s.vx[i] > s.u) { J += 2 * M * (s.vx[i] - s.u); s.vx[i] = 2 * s.u - s.vx[i]; }
        }
        if (s.x[i] > s.wx) s.x[i] = s.wx;
        if (s.x[i] < 0) s.x[i] = 0;
        if (s.y[i] < 0) { s.y[i] = -s.y[i]; if (s.vy[i] < 0) { J += -2 * M * s.vy[i]; s.vy[i] = -s.vy[i]; } }
        if (s.y[i] > H) { s.y[i] = 2 * H - s.y[i]; if (s.vy[i] > 0) { J += 2 * M * s.vy[i]; s.vy[i] = -s.vy[i]; } }
      }
      // Tekanan: rata-rata bergerak eksponensial dengan koreksi bias awal.
      const Pinst = J / (2 * (s.wx + H) / NM * dt), g = dt / TAU_P;
      s.Psum += (Pinst - s.Psum) * g; s.Pw += (1 - s.Pw) * g;

      s.k++;
      if (s.k % HIST_EVERY === 0) {
        const T = tempOf(s);
        if (Math.abs(T / s.Tref - 1) > 0.4) resetHist(s, T);            // rentang laju ikut T bila berubah jauh
        else {
          instHist(s, s.tmp);
          const gh = HIST_EVERY * dt / TAU_H;
          for (let b = 0; b < NBIN; b++) s.hist[b] += (s.tmp[b] - s.hist[b]) * gh;
        }
      }
      if (s.k % TRAIL_EVERY === 0) {
        s.trail.push([s.x[0], s.y[0]]);
        if (s.trail.length > TRAIL_LEN) s.trail.shift();
      }
    },

    measure(s, p) {
      const T = tempOf(s), A = s.wx * H / (NM * NM);
      return { T, Pu: s.Pw > 0 ? 1e3 * s.Psum / s.Pw : 0, Pt: 1e3 * s.n * K_B * T / A, Ek: kinetic(s) * 1e21 };   // mN/m, zJ
    },

    positions(s) {
      const pts = [[0, 0], [s.wx, H]];
      for (let i = 0; i < s.n; i++) pts.push([s.x[i], s.y[i]]);
      return pts;
    },

    draw(ctx, s, p, v, d) {
      const m = this.measure(s, p);
      // Kotak dan dinding kanan (piston).
      d.rect(0, 0, s.wx, H, 'bg', 'grid');
      d.polyline([[s.wx, 0], [0, 0], [0, H], [s.wx, H]], 'fg', 2);
      d.line(s.wx, -1, s.wx, H + 1, s.u ? 'vector' : 'fg', 4);
      if (s.u) d.arrow(s.wx, H / 2, Math.sign(s.u) * 4, 0, 'vector');
      // Atom; satu disorot dengan jejak.
      d.polyline(s.trail, 'trail', 2);
      for (let i = 1; i < s.n; i++) d.circle(s.x[i], s.y[i], R, 'body');
      d.circle(s.x[0], s.y[0], 1.6 * R, 'vector');
      d.text(0, H + 2.4, `N = ${s.n} atom argon · kotak ${fmt(s.wx, 1)} nm × ${H} nm`, 'muted', 'sm', 'left');

      // Histogram laju (rata-rata waktu) dan kurva Maxwell–Boltzmann 2D.
      const T = m.T, kt = K_B * T / M, w = s.vmax / NBIN;
      const peak = w * Math.exp(-0.5) / Math.sqrt(kt);                   // fraksi puncak teori per pita
      const tickStep = s.vmax > 2400 ? 1000 : s.vmax > 1200 ? 500 : 200;
      const xt = []; for (let t = 0; t <= s.vmax; t += tickStep) xt.push(t);
      const pl = d.plot({ x: 6, y: -24, w: 46, h: 17 }, {
        x: [0, s.vmax], y: [0, 1.6 * peak], xlabel: 'v (m/s)', ylabel: 'fraksi atom per pita',
        xticks: xt, fmt: t => String(t)
      });
      for (let b = 0; b < NBIN; b++) {
        const h = s.hist[b];
        if (h > 0) pl.fill([[b * w, 0], [(b + 1) * w, 0], [(b + 1) * w, h], [b * w, h]], 'trail', 'body');
      }
      const curve = [];
      for (let k = 0; k <= 80; k++) { const vv = s.vmax * k / 80; curve.push([vv, w * vv / kt * Math.exp(-vv * vv / (2 * kt))]); }
      pl.line(curve, 'vector', 2);
      d.text(52, -5, 'teori MB 2D', 'vector', 'sm', 'right');

      // Besaran makro.
      const A = s.wx * H;
      const X0 = 58, lines = [
        [`T = ${fmt(T, 0)} K`, 'vector'],
        [`P = ${fmt(m.Pu, 3)} mN/m`, 'body'],
        [`NkT/A = ${fmt(m.Pt, 3)} mN/m`, 'muted'],
        [`A (≙ V) = ${fmt(A, 0)} nm²`, 'fg'],
        [`N = ${s.n}`, 'fg']
      ];
      lines.forEach(([t, c], i) => d.text(X0, -7 - i * 4.3, t, c, 'sm', 'left'));
      d.text(80, H + 2.4, 'diperlambat 10¹⁰×', 'muted', 'sm', 'right');
    }
  });
})();
