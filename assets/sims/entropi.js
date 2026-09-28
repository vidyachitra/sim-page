/* Hukum II dan entropi (Kalor dan Termodinamika: mesin kalor dan entropi)
 * Asumsi model:
 *  - Partikel ideal titik dalam kotak 2 m × 0,9 m: tanpa tumbukan antarpartikel, hanya pantulan lenting di dinding
 *    dan di sekat (x = 0) selama sekat tertutup. Kecepatan awal acak Gaussian (PRNG berbenih, σ = 0,3 m/s per sumbu).
 *  - Mode 1 (ekspansi bebas): semua N partikel mulai di kiri. Mode 2 (pencampuran): N/2 biru di kiri, N/2 merah muda di kanan.
 *  - Entropi butir kasar: keadaan makro hanya menghitung partikel di kiri/kanan.
 *    Mode 1: Ω = C(N, n_kiri). Mode 2: Ω = C(N₁, n₁)·C(N₂, n₂). S/k = ln Ω (lewat ln n!, tanpa luapan).
 *  - Peluang semua partikel kembali ke keadaan awal (tiap partikel di sisi awalnya) = 2^−N.
 *  - Membuka sekat satu arah secara makro: menutupnya lagi hanya mengurung partikel di sisi masing-masing.
 * Integrator: gerak lurus (tanpa gaya) + pantulan, dt = 1/240 s.
 */
(function () {
  const W = 1, H = 0.9;          // m, setengah lebar dan tinggi kotak
  const SIGMA = 0.3;             // m/s, sebaran kecepatan per sumbu
  const NMAX = 200;
  const LNF = [0];               // ln n!
  for (let k = 1; k <= NMAX; k++) LNF.push(LNF[k - 1] + Math.log(k));
  const lnC = (n, k) => (k < 0 || k > n) ? -Infinity : LNF[n] - LNF[k] - LNF[n - k];

  function rng(s) {              // mulberry32
    s.seed = (s.seed + 0x6D2B79F5) | 0;
    let t = s.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const gauss = s => Math.sqrt(-2 * Math.log(1 - rng(s))) * Math.cos(2 * Math.PI * rng(s));

  const groups = s => s.mode === 2 ? [Math.ceil(s.n / 2), Math.floor(s.n / 2)] : [s.n, 0];
  function counts(s) {
    const c = [0, 0];
    for (let i = 0; i < s.n; i++) if (s.x[i] < 0) c[s.col[i]]++;
    return c;
  }
  function entropy(s) {
    const [N1, N2] = groups(s), c = counts(s);
    return { c, N1, N2, S: lnC(N1, c[0]) + lnC(N2, c[1]),
      Smax: lnC(N1, Math.floor(N1 / 2)) + lnC(N2, Math.floor(N2 / 2)) };
  }
  // 2^N sebagai "a × 10ᵇ" dengan koma desimal dan pangkat superskrip.
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  function pow2(N) {
    if (N < 20) return String(Math.pow(2, N)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const e = N * Math.LOG10E * Math.LN2, b = Math.floor(e), a = Math.pow(10, e - b);
    return `${a.toFixed(1).replace('.', ',')} × 10${String(b).split('').map(ch => SUP[ch]).join('')}`;
  }

  SimCore.register({
    api: 1,
    id: 'entropi',
    title: 'Hukum II dan entropi',
    aspect: 1,
    view: { x: [-1.12, 1.12], y: [-1.3, 1.02] },
    dt: 1 / 240,

    params: [
      { key: 'mode', label: 'Mode', symbol: '', unit: '', min: 1, max: 2, step: 1, value: 1, resets: true, options: ['ekspansi bebas', 'pencampuran dua warna'] },
      { key: 'N', label: 'Jumlah partikel', symbol: 'N', unit: '', min: 4, max: 200, step: 2, value: 60, resets: true },
      { key: 'sekat', label: 'Sekat', symbol: '', unit: '', min: 0, max: 1, step: 1, value: 1, options: ['dibuka', 'tertutup'] }
    ],

    graphs: [
      { title: 'Partikel di kiri', unit: '', min: 0, series: [
        { key: 'nA', label: 'n_kiri biru', color: 'body', digits: 0 },
        { key: 'nB', label: 'n_kiri merah muda', color: 'body2', digits: 0 }
      ] },
      { title: 'Entropi', unit: 'S/k', min: 0, series: [
        { key: 'S', label: 'S/k', color: 'vector', digits: 1 },
        { key: 'Smax', label: 'S_maks/k', color: 'muted', digits: 1 }
      ] }
    ],

    init(p) {
      const n = Math.round(p.N), mode = Math.round(p.mode);
      const s = { seed: 2024, n, mode, x: [], y: [], vx: [], vy: [], col: [] };
      const nLeft = mode === 2 ? Math.ceil(n / 2) : n;
      for (let i = 0; i < n; i++) {
        const left = i < nLeft;
        s.col.push(mode === 2 && !left ? 1 : 0);
        const u = 0.02 + 0.96 * rng(s);
        s.x.push(left ? -W * u : W * u);
        s.y.push(H * (0.02 + 0.96 * rng(s)));
        s.vx.push(SIGMA * gauss(s)); s.vy.push(SIGMA * gauss(s));
      }
      return s;
    },

    step(s, p, dt) {
      const closed = p.sekat >= 0.5;
      for (let i = 0; i < s.n; i++) {
        const x0 = s.x[i];
        let x = x0 + s.vx[i] * dt, y = s.y[i] + s.vy[i] * dt;
        if (x < -W) { x = -2 * W - x; s.vx[i] = Math.abs(s.vx[i]); }
        if (x > W) { x = 2 * W - x; s.vx[i] = -Math.abs(s.vx[i]); }
        if (closed && (x0 < 0) !== (x < 0)) { x = -x; s.vx[i] = -s.vx[i]; }   // pantul di sekat
        if (y < 0) { y = -y; s.vy[i] = Math.abs(s.vy[i]); }
        if (y > H) { y = 2 * H - y; s.vy[i] = -Math.abs(s.vy[i]); }
        s.x[i] = x; s.y[i] = y;
      }
    },

    measure(s, p) {
      const e = entropy(s);
      return { nA: e.c[0], nB: e.c[1], S: e.S, Smax: e.Smax };
    },

    positions(s) {
      const pts = [[-W, 0], [W, H]];
      for (let i = 0; i < s.n; i++) pts.push([s.x[i], s.y[i]]);
      return pts;
    },

    draw(ctx, s, p, v, d) {
      const e = entropy(s), [N1, N2] = [e.N1, e.N2], closed = p.sekat >= 0.5;
      const nKiri = e.c[0] + e.c[1];
      // Kotak, sekat, partikel.
      d.rect(-W, 0, 2 * W, H, 'bg', 'fg');
      if (closed) d.line(0, 0, 0, H, 'fg', 4);
      else { d.line(0, 0, 0, 0.04, 'muted', 2); d.line(0, H - 0.04, 0, H, 'muted', 2); }
      const rp = s.n > 120 ? 2.5 : 3.5;
      for (let i = 0; i < s.n; i++) d.dot(s.x[i], s.y[i], rp, s.col[i] ? 'body2' : 'body');
      d.text(-W, H + 0.07, s.mode === 2 ? 'Pencampuran dua warna' : 'Ekspansi bebas', 'fg', 'sm', 'left');
      d.text(W, H + 0.07, closed ? 'sekat tertutup' : 'sekat dibuka', closed ? 'fg' : 'vector', 'sm', 'right');

      // Batang jumlah kiri/kanan (bertumpuk per warna).
      const bx = [-0.95, -0.62], bw = 0.2, by = -1.0, bh = 0.72, sc = bh / s.n;
      const side = [[e.c[0], e.c[1]], [N1 - e.c[0], N2 - e.c[1]]];
      ['kiri', 'kanan'].forEach((nm, k) => {
        const [a, b] = side[k];
        d.rect(bx[k], by, bw, bh, 'bg', 'grid');
        if (a > 0) d.rect(bx[k], by, bw, a * sc, 'body');
        if (b > 0) d.rect(bx[k], by + a * sc, bw, b * sc, 'body2');
        d.text(bx[k] + bw / 2, by - 0.06, nm, 'muted', 'sm');
        d.text(bx[k] + bw / 2, by + bh + 0.06, String(a + b), 'fg', 'sm');
      });
      d.line(bx[0] - 0.03, by + bh / 2, bx[1] + bw + 0.03, by + bh / 2, 'muted', 1);

      // ln Ω(n) terhadap n: mode 1 satu kurva; mode 2 satu kurva per warna.
      const Nx = s.mode === 2 ? N1 : s.n, ymax = Math.max(1, lnC(Nx, Math.floor(Nx / 2))) * 1.1;
      const xt = [0, Nx / 2, Nx].map(Math.round);
      const yt = []; const ys = ymax > 100 ? 40 : ymax > 45 ? 20 : ymax > 20 ? 10 : ymax > 8 ? 4 : ymax > 3 ? 1 : 0.5;
      for (let t = 0; t <= ymax; t += ys) yt.push(t);
      const pl = d.plot({ x: -0.12, y: -1.0, w: 1.08, h: 0.72 }, {
        x: [-0.04 * Nx, 1.04 * Nx], y: [0, ymax], xlabel: s.mode === 2 ? 'n_kiri per warna' : 'n_kiri', ylabel: 'ln Ω',
        xticks: xt, yticks: yt, fmt: t => String(t)
      });
      const curve = NN => { const c = []; for (let k = 0; k <= NN; k++) c.push([k, lnC(NN, k)]); return c; };
      if (s.mode === 2) {
        pl.line(curve(N1), 'body', 2);
        if (N2 !== N1) pl.line(curve(N2), 'body2', 2);
        pl.dot(e.c[0], lnC(N1, e.c[0]), 5, 'body');
        pl.dot(e.c[1], lnC(N2, e.c[1]), 5, 'body2');
      } else {
        pl.line(curve(s.n), 'body', 2);
        pl.dot(nKiri, lnC(s.n, nKiri), 5, 'vector');
      }

      // Angka.
      d.text(-W, -0.13, `S/k = ln Ω = ${e.S.toFixed(1).replace('.', ',')}   (maks ${e.Smax.toFixed(1).replace('.', ',')})`, 'vector', 'sm', 'left');
      d.text(-W, -1.22, `peluang semua kembali ke sisi awal: 1 dalam ${pow2(s.n)}`, 'muted', 'sm', 'left');
    }
  });
})();
