/* Angin darat dan angin laut (Kalor dan Termodinamika › Perpindahan Kalor)
 * Asumsi model:
 *  - Suhu permukaan darat dan laut masing-masing satu nilai, C·dT/dt = S(t) − L·(T − T_ref):
 *    C_darat = 2·10⁵ J/(m²·K) (lapisan tanah ±10 cm yang ikut siklus harian), C_laut = rasio × C_darat,
 *    L = 30 W/(m²·K) (radiasi + konveksi + penguapan, dilinearkan), T_ref = 20 °C.
 *  - S(t) = S_puncak·sin(π(jam − 6)/12) antara pukul 06 dan 18, nol di malam hari (daya yang diserap).
 *  - Angin permukaan w = K·(T_darat − T_laut), K = 0,3 (m/s)/K; w > 0 bertiup ke darat (angin laut),
 *    w < 0 ke laut (angin darat). Dengan rasio 1 kedua suhu sama, jadi tidak ada angin.
 *  - BENTUK sirkulasi ditetapkan (satu gulungan: naik di atas permukaan yang lebih panas, arus balik
 *    di atas); hanya arah dan kekuatannya yang mengikuti w. Penampang skematis, tidak berskala.
 *  - Waktu: 1 s tampilan = 1 jam (HOUR = 3600 s nyata per s tampilan); satu hari = 24 s.
 *    Simulasi mulai pukul 06.00 setelah 5 hari pemanasan awal, jadi siklusnya sudah periodik.
 * Integrator: pembaruan eksponensial eksak per langkah (S ditahan di tengah langkah), dt = 1/100 s.
 * Skala visual: parsel udara PARCEL_SCALE = 0,08 satuan/s per m/s angin; panah angin 0,06 satuan
 * per m/s; perahu hanyut BOAT_SCALE = 0,045 satuan/s per m/s angin.
 */
(function () {
  const { sin, cos, exp, min, max, PI, imul } = Math;
  const HOUR = 3600;                 // s nyata per s tampilan (1 s = 1 jam)
  const START_HOUR = 6;              // jam pada t = 0
  const C_LAND = 2e5;                // J/(m²·K)
  const L_LOSS = 30;                 // W/(m²·K)
  const T_REF = 20;                  // °C
  const K_WIND = 0.3;                // (m/s)/K
  const T_MIN = 15, T_MAX = 50;      // °C, rentang skala warna
  const SPIN_DAYS = 5;               // hari pemanasan awal di init
  const N_P = 50;                    // parsel udara
  const X0 = -1, X1 = 1, Y0 = 0.03, HA = 0.56;   // kotak sirkulasi (satuan tampilan)
  const PARCEL_SCALE = 0.08;         // satuan/s per m/s
  const WIND_ARROW = 0.06;           // satuan per m/s
  const BOAT_SCALE = 0.045;          // satuan/s per m/s
  const BOAT_MIN = 0.22, BOAT_MAX = 0.95;

  const hourOf = t => ((START_HOUR + t) % 24 + 24) % 24;
  const sun = (p, h) => (h > 6 && h < 18 ? p.S0 * sin(PI * (h - 6) / 12) : 0);
  const wind = s => K_WIND * (s.Td - s.Tl);

  // Satu langkah eksak untuk C dT/dt = S − L(T − T_ref), S tetap selama dtReal.
  function relax(T, S, C, dtReal) {
    const Teq = T_REF + S / L_LOSS;
    return Teq + (T - Teq) * exp(-L_LOSS * dtReal / C);
  }
  function advanceT(s, p, t, dtView) {
    const S = sun(p, hourOf(t + dtView / 2)), dtR = dtView * HOUR;
    s.Td = relax(s.Td, S, C_LAND, dtR);
    s.Tl = relax(s.Tl, S, C_LAND * p.ratio, dtR);
  }

  function rnd(s) {                  // mulberry32
    s.seed = (s.seed + 0x6D2B79F5) | 0;
    let t = s.seed;
    t = imul(t ^ (t >>> 15), t | 1);
    t ^= t + imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Kecepatan parsel (satuan/s tampilan). ψ = A sin(kx(x − X0)) sin(ky(y − Y0)); u(0, Y0) = −w·skala.
  function vel(x, y, w) {
    const kx = PI / (X1 - X0), ky = PI / HA, A = -w * PARCEL_SCALE / ky;
    return [A * ky * sin(kx * (x - X0)) * cos(ky * (y - Y0)), -A * kx * cos(kx * (x - X0)) * sin(ky * (y - Y0))];
  }

  SimCore.register({
    api: 1,
    id: 'angin-darat-laut',
    title: 'Angin darat dan angin laut',
    aspect: 16 / 9,
    view: { x: [-1.1, 1.1], y: [-0.355, 0.8825] },
    dt: 1 / 100,

    params: [
      { key: 'S0', label: 'Intensitas matahari puncak', symbol: 'S_0', unit: 'W/m²', min: 200, max: 1000, step: 50, value: 800 },
      { key: 'ratio', label: 'Kapasitas kalor laut ÷ darat', symbol: 'C_laut/C_darat', unit: '', min: 1, max: 10, step: 0.5, value: 5 }
    ],

    graphs: [
      { title: 'Suhu permukaan', unit: '°C', window: 48, series: [
        { key: 'Td', label: 'T_darat', color: 'vector', digits: 1 },
        { key: 'Tl', label: 'T_laut', color: 'body', digits: 1 }
      ] },
      { title: 'Angin permukaan (+ ke darat)', unit: 'm/s', window: 48, series: [
        { key: 'w', label: 'w', color: 'vector2', digits: 2 }
      ] }
    ],

    init(p) {
      const s = { t: 0, Td: T_REF, Tl: T_REF, seed: 2024, boat: BOAT_MAX, pr: [] };
      const h = 0.1, n = Math.round(SPIN_DAYS * 24 / h);       // pemanasan awal, langkah 0,1 jam
      for (let i = 0; i < n; i++) advanceT(s, p, -SPIN_DAYS * 24 + i * h, h);
      for (let i = 0; i < N_P; i++) s.pr.push([X0 + 0.04 + (X1 - X0 - 0.08) * rnd(s), Y0 + 0.03 + (HA - 0.06) * rnd(s)]);
      return s;
    },

    step(s, p, dt) {
      advanceT(s, p, s.t, dt);
      s.t += dt;
      const w = wind(s);
      for (const q of s.pr) {
        const v1 = vel(q[0], q[1], w), v2 = vel(q[0] + v1[0] * dt / 2, q[1] + v1[1] * dt / 2, w);
        q[0] = min(X1, max(X0, q[0] + v2[0] * dt));
        q[1] = min(Y0 + HA, max(Y0, q[1] + v2[1] * dt));
      }
      s.boat = min(BOAT_MAX, max(BOAT_MIN, s.boat - w * BOAT_SCALE * dt));
    },

    measure(s, p) { return { Td: s.Td, Tl: s.Tl, w: wind(s) }; },

    positions(s, p) { return s.pr.concat([[s.boat, 0.05], [X0, -0.3], [X1, 0.8]]); },

    draw(ctx, s, p, v, d) {
      const px = n => n / v.scale, h = hourOf(s.t), w = wind(s);
      const f = T => (T - T_MIN) / (T_MAX - T_MIN);

      // langit: matahari 06–18, bulan 18–06, pada busur yang sama
      const day = h >= 6 && h < 18, a = PI * (((day ? h - 6 : h + 6) % 24) / 12);
      const bx = -0.95 * cos(a), by = 0.6 + 0.2 * sin(a);
      if (day) {
        for (let k = 0; k < 8; k++) {
          const b = k * PI / 4;
          d.line(bx + 0.055 * cos(b), by + 0.055 * sin(b), bx + 0.08 * cos(b), by + 0.08 * sin(b), 'ke', 2);
        }
        d.circle(bx, by, 0.04, 'ke');
      } else {
        d.circle(bx, by, 0.035, 'muted');
        d.circle(bx + 0.016, by + 0.01, 0.03, 'bg');
      }

      // darat, pantai, laut
      d.polygon([[-1.1, -0.3], [0.08, -0.3], [0.08, -0.05], [0.0, 0], [-1.1, 0]], 'grid');
      d.rect(0.0, -0.3, 1.1, 0.25, 'pe');
      d.polygon([[-1.1, -0.05], [0, -0.05], [0, 0], [-1.1, 0]], d.heat(f(s.Td)));
      d.polygon([[0, -0.05], [1.1, -0.05], [1.1, 0], [0, 0]], d.heat(f(s.Tl)));
      d.line(-1.1, 0, 1.1, 0, 'fg', 1.5);
      d.text(-0.55, -0.14, `darat ${s.Td.toFixed(1)} °C`, 'fg', 'sm');
      d.text(0.55, -0.14, `laut ${s.Tl.toFixed(1)} °C`, 'fg', 'sm');

      // parsel udara
      for (const q of s.pr) d.dot(q[0], q[1], 3, 'body');

      // panah angin permukaan
      if (Math.abs(w) > 0.1) {
        [-0.45, 0.05, 0.55].forEach((x, i) => d.arrow(x + w * WIND_ARROW / 2, 0.1, -w * WIND_ARROW, 0, 'vector2', i === 1 ? 'w' : ''));
      }
      const regime = w > 0.3 ? 'angin laut (siang): bertiup ke darat'
        : w < -0.3 ? 'angin darat (malam): bertiup ke laut' : 'hampir tanpa angin';
      d.text(-0.55, -0.24, regime, 'fg', 'sm');

      // perahu nelayan: hanyut mengikuti angin
      const xb = s.boat, lean = Math.max(-1, Math.min(1, -w / 4));
      d.polygon([[xb - 0.05, 0.02], [xb + 0.05, 0.02], [xb + 0.035, -0.005], [xb - 0.035, -0.005]], 'fg');
      d.line(xb, 0.02, xb, 0.12, 'fg', 1.5);
      d.polygon([[xb, 0.12], [xb, 0.035], [xb + 0.06 * (lean || 0.01), 0.05]], 'bg', 'fg', 1);

      // jam, skala waktu, legenda suhu
      const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
      d.text(-1.08, 0.84, `pukul ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, 'fg', 'md', 'left');
      d.text(-1.08, 0.84 - px(18), '1 s = 1 jam', 'muted', 'sm', 'left');
      const lx = 0.42, ly = 0.83, lw = 0.36;
      for (let k = 0; k < 20; k++) d.rect(lx + lw * k / 20, ly, lw / 20 + 0.002, 0.03, d.heat((k + 0.5) / 20));
      d.text(lx - px(4), ly + 0.015, `${T_MIN} °C`, 'muted', 'sm', 'right');
      d.text(lx + lw + px(4), ly + 0.015, `${T_MAX} °C`, 'muted', 'sm', 'left');
    }
  });
})();
