/* Konveksi dalam air (Kalor dan Termodinamika › Perpindahan Kalor)
 * Asumsi model:
 *  - Tangki air 0,40 m × 0,30 m, tebal 0,10 m (12 L), permukaan atas terbuka ke udara 20 °C.
 *  - N = 160 partikel pewarna, masing-masing membawa suhu sepotong air. Air di zona pemanas menerima
 *    daya P merata per volume zona: dT/dt = P/(ρc·V_zona). Suhu dibatasi 100 °C (mendidih).
 *  - Permukaan bebas melepas kalor ke udara 20 °C: lapisan atas 1 cm, h efektif = 150 W/(m²·K)
 *    (konveksi udara + penguapan, sengaja besar agar air tidak terus memanas).
 *  - Pertukaran kalor lokal: tiap partikel mendekati suhu rata-rata sel 5 cm-nya dengan τ = 60 s,
 *    ditambah langkah acak kecil (D = 2·10⁻⁶ m²/s) dari PRNG berbenih (mulberry32).
 *  - BENTUK arus ditetapkan, tidak dihitung dari persamaan Navier–Stokes: fungsi arus
 *    ψ ∝ sin(nπx/W)·sin(πy/H); n = 1 (satu gulungan, naik di dinding kiri) untuk pemanas 1 dan 3,
 *    n = 2 (dua gulungan simetris, naik di tengah) untuk pemanas 2. Hanya KEKUATANNYA yang dihitung,
 *    dari gaya apung pada pola itu: U = K_b·max(0, T̄_naik − T̄_turun), T̄_naik dan T̄_turun = suhu
 *    rata-rata partikel di kolom naik dan kolom turun (dibobot bentuk kecepatan tegak), K_b = 3 mm/s
 *    per K, kelambatan τ_U = 150 s. U = kelajuan maksimum arus.
 *    Selisih rata-rata sepertiga bawah − atas tidak dipakai sebagai pendorong: air panas yang naik
 *    menumpuk di atas ("filling box") sehingga selisih itu berubah tanda walau gulungan berjalan.
 *    Pemanas di atas memanaskan kedua kolom sama banyak dan hanya lapisan atas, jadi U ≈ 0 dan dasar
 *    tetap dingin: hasil model, bukan skrip.
 *  - Waktu dipercepat SPEEDUP = 20×: 1 s tampilan = 20 s nyata. Grafik kecepatan dalam mm/s nyata.
 * Integrator: titik tengah (RK2) untuk adveksi; pembaruan eksponensial eksak untuk pendinginan,
 * pencampuran dan U. dt = 1/120 s tampilan.
 * Skala visual: panah arus = ARROW_SCALE = 8 m panah per m/s kecepatan nyata.
 */
(function () {
  const { sin, cos, exp, sqrt, min, max, floor, round, imul, PI } = Math;
  const W = 0.4, H = 0.3;            // m, ukuran tangki (penampang)
  const DEPTH = 0.1;                 // m, tebal tangki tegak lurus layar
  const RHO_C = 4.18e6;              // J/(m³·K), ρc air
  const N = 160;                     // partikel pewarna
  const SPEEDUP = 20;                // waktu dipercepat 20×
  const T_AIR = 20;                  // °C, udara dan suhu awal air
  const T_BOIL = 100;                // °C, batas atas suhu partikel
  const T_MIN = 20, T_MAX = 40;      // °C, rentang skala warna
  const H_SURF = 150;                 // W/(m²·K), pelepasan kalor permukaan (konveksi + penguapan)
  const SURF = 0.01;                 // m, tebal lapisan permukaan yang didinginkan
  const K_B = 3e-3;                // (m/s)/K, kekuatan apung: U = K_b·ΔT
  const TAU_U = 150;                  // s nyata, kelambatan arus menyesuaikan ΔT
  const D_MIX = 2e-6;                // m²/s, difusi efektif (langkah acak)
  const TAU_MIX = 60;               // s nyata, pertukaran kalor dengan air sekitar (sel 5 cm)
  const CELL = 0.05;                 // m, ukuran sel pencampuran
  const ARROW_SCALE = 8;             // m panah per m/s kecepatan nyata
  const MODE_NAMES = ['', 'kiri bawah', 'tengah bawah', 'atas'];
  const HEATERS = [null,
    { x0: 0.01, x1: 0.11, y0: 0, y1: 0.05, n: 1 },
    { x0: 0.15, x1: 0.25, y0: 0, y1: 0.05, n: 2 },
    { x0: 0.10, x1: 0.30, y0: 0.235, y1: 0.28, n: 1 }];

  const mode = p => min(3, max(1, round(p.pos)));
  const heater = p => HEATERS[mode(p)];

  function rnd(s) {                  // mulberry32
    s.seed = (s.seed + 0x6D2B79F5) | 0;
    let t = s.seed;
    t = imul(t ^ (t >>> 15), t | 1);
    t ^= t + imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Kecepatan nyata (m/s) di (x, y) untuk kekuatan U; ψ = A sin(kx x) sin(ky y), u = ∂ψ/∂y, v = −∂ψ/∂x.
  function vel(x, y, U, n) {
    const kx = n * PI / W, ky = PI / H;
    const A = (n === 1 ? -1 : 1) * U / max(kx, ky);   // n = 1: naik di kiri; n = 2: naik di tengah
    return [A * ky * sin(kx * x) * cos(ky * y), -A * kx * cos(kx * x) * sin(ky * y)];
  }

  function means(s) {
    let ta = 0, na = 0, tb = 0, nb = 0;
    for (const q of s.tr) {
      if (q[1] > 2 * H / 3) { ta += q[2]; na++; } else if (q[1] < H / 3) { tb += q[2]; nb++; }
    }
    return { top: na ? ta / na : T_AIR, bot: nb ? tb / nb : T_AIR };
  }

  // Suhu rata-rata kolom naik dan kolom turun, dibobot bentuk kecepatan tegak |v̂| (proyeksi apung
  // pada pola arus yang ditetapkan). Selisihnya yang mendorong gulungan.
  function columns(s, n) {
    const kx = n * PI / W, ky = PI / H;
    let tu = 0, wu = 0, td = 0, wd = 0;
    for (const q of s.tr) {
      const c = (n === 1 ? 1 : -1) * cos(kx * q[0]) * sin(ky * q[1]);   // > 0: kolom naik
      if (c > 0) { tu += q[2] * c; wu += c; } else { td -= q[2] * c; wd -= c; }
    }
    return { up: wu ? tu / wu : T_AIR, down: wd ? td / wd : T_AIR };
  }

  SimCore.register({
    api: 1,
    id: 'konveksi',
    title: 'Konveksi dalam air',
    aspect: 4 / 3,
    view: { x: [-0.065, 0.465], y: [-0.07, 0.3275] },
    dt: 1 / 120,

    params: [
      { key: 'pos', label: 'Posisi pemanas', unit: '', min: 1, max: 3, step: 1, value: 1, resets: true, options: ['kiri bawah', 'tengah bawah', 'atas'] },
      { key: 'P', label: 'Daya pemanas', symbol: 'P', unit: 'W', min: 0, max: 500, step: 10, value: 300 }
    ],

    graphs: [
      { title: 'Suhu', unit: '°C', window: 60, series: [
        { key: 'Ttop', label: 'T̄_atas', color: 'vector', digits: 1 },
        { key: 'Tbot', label: 'T̄_bawah', color: 'body', digits: 1 }
      ] },
      { title: 'Kecepatan arus', unit: 'mm/s', min: 0, window: 60, series: [
        { key: 'U', label: 'U', color: 'vector2', digits: 2 }
      ] }
    ],

    init(p) {
      const s = { seed: 12345, U: 0, t: 0, tr: [] };
      for (let i = 0; i < N; i++) s.tr.push([0.005 + (W - 0.01) * rnd(s), 0.005 + (H - 0.01) * rnd(s), T_AIR]);
      return s;
    },

    step(s, p, dt) {
      const hz = heater(p), n = hz.n, tp = dt * SPEEDUP;           // tp: detik nyata per langkah
      const heatRate = p.P / (RHO_C * (hz.x1 - hz.x0) * (hz.y1 - hz.y0) * DEPTH);   // K/s nyata
      const coolK = exp(-H_SURF / (RHO_C * SURF) * tp);
      const jump = sqrt(6 * D_MIX * tp);                        // langkah acak seragam, varians 2·D·t
      for (const q of s.tr) {
        // adveksi (titik tengah), dalam m nyata per detik nyata
        const v1 = vel(q[0], q[1], s.U, n);
        const xm = q[0] + v1[0] * tp / 2, ym = q[1] + v1[1] * tp / 2;
        const v2 = vel(xm, ym, s.U, n);
        q[0] += v2[0] * tp + jump * (2 * rnd(s) - 1);
        q[1] += v2[1] * tp + jump * (2 * rnd(s) - 1);
        // pantul di dinding
        if (q[0] < 0) q[0] = -q[0]; if (q[0] > W) q[0] = 2 * W - q[0];
        if (q[1] < 0) q[1] = -q[1]; if (q[1] > H) q[1] = 2 * H - q[1];
        q[0] = min(W, max(0, q[0])); q[1] = min(H, max(0, q[1]));
        // kalor
        if (q[0] >= hz.x0 && q[0] <= hz.x1 && q[1] >= hz.y0 && q[1] <= hz.y1) q[2] = min(T_BOIL, q[2] + heatRate * tp);
        if (q[1] > H - SURF) q[2] = T_AIR + (q[2] - T_AIR) * coolK;
      }
      // pertukaran kalor lokal: tiap partikel mendekati rata-rata selnya (konduksi + olakan kecil)
      const nx = round(W / CELL), ny = round(H / CELL), sum = new Array(nx * ny).fill(0), cnt = sum.slice();
      const cell = q => min(nx - 1, floor(q[0] / CELL)) + nx * min(ny - 1, floor(q[1] / CELL));
      for (const q of s.tr) { const k = cell(q); sum[k] += q[2]; cnt[k]++; }
      const mixK = exp(-tp / TAU_MIX);
      for (const q of s.tr) { const k = cell(q), Tm = sum[k] / cnt[k]; q[2] = Tm + (q[2] - Tm) * mixK; }
      const c = columns(s, n), Utarget = K_B * max(0, c.up - c.down);
      s.U = Utarget + (s.U - Utarget) * exp(-tp / TAU_U);
      s.t += dt;
    },

    measure(s, p) {
      const m = means(s);
      const c = columns(s, heater(p).n);
      return { Ttop: m.top, Tbot: m.bot, U: s.U * 1e3, dTc: c.up - c.down };
    },

    positions(s, p) { return s.tr.map(q => [q[0], q[1]]); },

    draw(ctx, s, p, v, d) {
      const hz = heater(p), md = mode(p), px = n => n / v.scale;
      const f = T => (T - T_MIN) / (T_MAX - T_MIN);

      // arus (samar), di bawah partikel
      if (s.U * 1e3 > 0.2) {
        for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
          const x = W * (i + 0.5) / 6, y = H * (j + 0.5) / 4, u = vel(x, y, s.U, hz.n);
          d.arrow(x - u[0] * ARROW_SCALE / 2, y - u[1] * ARROW_SCALE / 2, u[0] * ARROW_SCALE, u[1] * ARROW_SCALE, 'grid');
        }
      }

      // pemanas
      const hx = (hz.x0 + hz.x1) / 2, on = p.P > 0;
      if (md < 3) {
        d.rect(hx - 0.04, -0.045, 0.08, 0.008, 'muted');                 // kompor
        if (on) {
          const fh = 0.012 + 0.022 * p.P / 500;
          for (let k = -1; k <= 1; k++) {
            const cx = hx + k * 0.022, flick = 1 + 0.12 * sin(s.t * 13 + k * 2);
            d.polygon([[cx - 0.009, -0.037], [cx + 0.009, -0.037], [cx, -0.037 + fh * flick]], 'warm');
            d.polygon([[cx - 0.004, -0.037], [cx + 0.004, -0.037], [cx, -0.037 + 0.5 * fh * flick]], 'hot');
          }
        }
      } else {
        d.line(hz.x0, 0.2575, hz.x1, 0.2575, on ? 'hot' : 'muted', 6);   // elemen pemanas celup
        d.line(hz.x1, 0.2575, hz.x1 + 0.03, 0.2575, 'fg', 2);
        d.line(hz.x1 + 0.03, 0.2575, hz.x1 + 0.03, H + 0.012, 'fg', 2);
      }

      // partikel pewarna
      for (const q of s.tr) d.dot(q[0], q[1], 3.5, d.heat(f(q[2])));

      // tangki
      d.polyline([[0, H + 0.012], [0, 0], [W, 0], [W, H + 0.012]], 'fg', 3);
      d.line(0, H, W, H, 'pe', 1.5);                                    // permukaan air

      // legenda suhu (kanan)
      const lx = 0.425, ly = 0.04, lh = 0.2;
      for (let k = 0; k < 20; k++) d.rect(lx, ly + lh * k / 20, 0.016, lh / 20 + 0.0005, d.heat((k + 0.5) / 20));
      d.polyline([[lx, ly], [lx + 0.016, ly], [lx + 0.016, ly + lh], [lx, ly + lh], [lx, ly]], 'muted', 1);
      d.text(lx + 0.008, ly + lh + px(10), `${T_MAX} °C`, 'muted', 'sm');
      d.text(lx + 0.008, ly - px(10), `${T_MIN} °C`, 'muted', 'sm');

      // label
      d.text(0, H + px(16), `Pemanas: ${MODE_NAMES[md]}`, 'fg', 'sm', 'left');
      d.text(W, H + px(16), `waktu dipercepat ${SPEEDUP}×`, 'muted', 'sm', 'right');
      const m = means(s);
      const regime = s.U * 1e3 > 0.3 ? 'air panas naik, air dingin turun: konveksi'
        : md === 3 && m.top > m.bot + 0.5 ? 'air panas tetap di atas: tanpa konveksi'
        : on ? 'air mulai memanas' : 'pemanas mati';
      d.text(W / 2, -0.06, regime, 'fg', 'sm');
    }
  });
})();
