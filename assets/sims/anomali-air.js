/* Anomali air: danau mendingin pada musim dingin (Kalor › Pemuaian)
 * Asumsi model:
 *  - Kolom air 1D sedalam D = 4 m, 20 sel (Δz = 0,2 m), mula-mula 10 °C merata; dasar terisolasi.
 *  - Air asli: ρ(T) Thiesen, maksimum pada 3,98 °C; es (917 kg/m³) mengapung dan tumbuh dari atas.
 *    "Cairan biasa" (pembanding khayalan): ρ = ρ(4 °C) − 0,027·T kg/m³, turun monoton (terpadat
 *    pada 0 °C) dan padatannya lebih padat daripada cairannya, jadi es tenggelam dan menumpuk dari dasar.
 *  - Permukaan: fluks q = h(T_udara − T_permukaan), h = 20 W/(m²·K); melalui es tebal d:
 *    q = (T_udara − 0)/(1/h + d/k_es), k_es = 2,2 W/(m·K). Es tumbuh pada 0 °C dengan kalor lebur
 *    L = 334 kJ/kg; air di bawah es menyerahkan kalor lewat konduksi k_air = 0,58 W/(m·K).
 *  - Konduksi molekuler antarsel (air tenang); pencampuran konvektif: sel atas yang lebih padat
 *    daripada sel di bawahnya dicampur (dirata-rata), diulang sampai stabil.
 *  - Volume es dianggap sama dengan volume air yang membeku (perubahan volume diabaikan).
 * Waktu dipercepat SPEEDUP = 86 400× (1 s tampilan = 1 hari); tiap langkah dt = 1/100 s = 864 s nyata.
 * Integrator: Euler eksplisit untuk konduksi (bilangan difusi ≈ 0,003, jauh di bawah batas 0,5)
 * dan fluks permukaan; penyesuaian konvektif sesudahnya.
 * Warna: d.heat untuk T_MIN = 0 °C … T_MAX = 10 °C.
 */
(function () {
  const D = 4, N = 20, DZ = D / N;   // m
  const T_INIT = 10;                 // °C
  const SPEEDUP = 86400;             // s nyata per s tampilan
  const H = 20;                      // W/(m²·K), permukaan–udara
  const K_ICE = 2.2, K_W = 0.58;     // W/(m·K)
  const RHO_C = 4.19e6;              // J/(m³·K), air
  const RHO_L = 917 * 334e3;         // J/m³, kalor lebur per volume es
  const KAPPA = K_W / RHO_C;         // m²/s, difusivitas termal molekuler
  const T_MIN = 0, T_MAX = 10;       // °C, rentang skala warna
  const CF_SLOPE = 0.027;            // kg/(m³·K), cairan biasa

  const rhoReal = T => 1000 * (1 - (T + 288.9414) * (T - 3.9863) * (T - 3.9863) / (508929.2 * (T + 68.12963)));
  const RHO4 = rhoReal(3.9863);
  const rhoCF = T => RHO4 - CF_SLOPE * T;
  const real = p => Math.round(p.anom) === 1;
  const rho = p => (real(p) ? rhoReal : rhoCF);

  // Sel i (0 = atas) berupa es? Air asli: es di atas; cairan biasa: es di dasar.
  const isIce = (s, p, i) => real(p) ? (i + 0.5) * DZ < s.d : (i + 0.5) * DZ > D - s.d;
  function liquidRange(s, p) {
    let a = 0, b = N - 1;
    while (a < N && isIce(s, p, a)) a++;
    while (b >= 0 && isIce(s, p, b)) b--;
    return a <= b ? [a, b] : null;
  }

  // Pencampuran konvektif: cairan yang lebih padat di atas ditukar-rata dengan sel di bawahnya.
  function convect(T, a, b, r) {
    for (let pass = 0; pass < 4 * N; pass++) {
      let changed = false;
      for (let i = a; i < b; i++) {
        if (r(T[i]) > r(T[i + 1]) + 1e-9) { const m = (T[i] + T[i + 1]) / 2; T[i] = m; T[i + 1] = m; changed = true; }
      }
      if (!changed) break;
    }
  }

  const fmt = (x, n) => x.toFixed(n).replace('-', '−').replace('.', ',');
  const heatF = T => (T - T_MIN) / (T_MAX - T_MIN);

  // Gambar
  const LAKE = { x0: 0.45, x1: 2.15, top: 2.3, bot: 0.25 };
  const S = (LAKE.top - LAKE.bot) / D;          // m gambar per m kedalaman
  const zY = z => LAKE.top - z * S;

  // Suhu pada tiga titik tetap. "Air teratas" (sel cair teratas) melompat tiap kali satu sel
  // membeku, jadi yang digrafikkan: permukaan (air terbuka, atau muka atas es dari neraca fluks
  // T_s = T_udara − q/h), air pada kedalaman 1 m, dan dasar. Sel beku bernilai 0 °C.
  function surfaceBottom(s, p) {
    const lr = liquidRange(s, p);
    return lr ? [s.T[lr[0]], s.T[lr[1]]] : [0, 0];
  }
  const I_1M = Math.floor(1 / DZ);
  function probes(s, p) {
    const cell = i => (isIce(s, p, i) ? 0 : s.T[i]);
    const iceOnTop = real(p) ? s.d > 0 : s.d >= D;
    let surf;
    if (iceOnTop) {
      const q = p.Tair / (1 / H + Math.min(s.d, D) / K_ICE);            // W/m², ke dalam danau
      surf = Math.min(0, p.Tair - q / H);
    } else {
      const lr = liquidRange(s, p);
      surf = lr ? s.T[lr[0]] : 0;
    }
    return { surf, mid: cell(I_1M), bot: cell(N - 1) };
  }

  SimCore.register({
    api: 1,
    id: 'anomali-air',
    title: 'Anomali air pada danau yang membeku',
    aspect: 4 / 3,
    view: { x: [0, 4], y: [0, 3] },
    dt: 1 / 100,

    params: [
      { key: 'Tair', label: 'Suhu udara', symbol: 'T_udara', unit: '°C', min: -15, max: 15, step: 1, value: -10 },
      { key: 'anom', label: 'Anomali', symbol: '', unit: '', min: 0, max: 1, step: 1, value: 1, resets: true, options: ['cairan biasa', 'air asli'] }
    ],

    graphs: [
      { title: 'Suhu', unit: '°C', window: 60, series: [
        { key: 'Tsurf', label: 'permukaan', color: 'cool', digits: 1 },
        { key: 'Tmid', label: 'kedalaman 1 m', color: 'body2', digits: 2 },
        { key: 'Tbot', label: 'dasar', color: 'hot', digits: 2 }
      ] },
      { title: 'Tebal es', unit: 'cm', min: 0, window: 60, series: [{ key: 'ice', label: 'es', color: 'body', digits: 1 }] }
    ],

    init(p) { return { T: new Array(N).fill(T_INIT), d: 0, t: 0 }; },

    step(s, p, dt) {
      const dtp = dt * SPEEDUP, T = s.T, R = real(p), r = rho(p);
      let lr = liquidRange(s, p);

      if (!lr) {                                   // seluruh kolom beku: hanya pelelehan dari atas
        if (p.Tair > 0) s.d = Math.max(0, s.d - H * p.Tair * dtp / RHO_L);
      } else if (R && s.d > 0) {                   // air asli di bawah tutup es
        const it = lr[0], q = p.Tair / (1 / H + s.d / K_ICE);          // W/m², ke dalam danau
        const dist = Math.max(0.01, (it + 0.5) * DZ - s.d);
        const qw = K_W * T[it] / dist;                                   // air → bidang batas es
        T[it] -= qw * dtp / (RHO_C * DZ);
        s.d += (-q - qw) * dtp / RHO_L;
        if (s.d < 0) { T[it] += -s.d * RHO_L / (RHO_C * DZ); s.d = 0; }
      } else {                                     // permukaan air terbuka ke udara
        const it = lr[0];
        T[it] += H * (p.Tair - T[it]) * dtp / (RHO_C * DZ);
        if (T[it] < 0) { s.d += RHO_C * DZ * -T[it] / RHO_L; T[it] = 0; }
        if (!R && s.d > 0) {                       // cairan biasa: es di dasar meleleh lewat konduksi
          const ib = lr[1], dist = Math.max(0.01, D - s.d - (ib + 0.5) * DZ);
          const qw = K_W * T[ib] / dist;
          T[ib] -= qw * dtp / (RHO_C * DZ);
          s.d = Math.max(0, s.d - qw * dtp / RHO_L);
        }
      }
      s.d = Math.min(D, s.d);

      // sel yang kini beku bersuhu 0 °C; konduksi dan konveksi hanya di sel cair
      for (let i = 0; i < N; i++) if (isIce(s, p, i)) T[i] = 0;
      lr = liquidRange(s, p);
      if (lr) {
        const [a, b] = lr, k = KAPPA * dtp / (DZ * DZ), old = T.slice();
        for (let i = a; i <= b; i++) {
          const up = i > a ? old[i - 1] : old[i], dn = i < b ? old[i + 1] : old[i];
          T[i] = old[i] + k * (up - 2 * old[i] + dn);
        }
        convect(T, a, b, r);
      }
      s.t += dtp;
    },

    measure(s, p) {
      const t = probes(s, p);
      return { Tsurf: t.surf, Tmid: t.mid, Tbot: t.bot, ice: s.d * 100 };
    },

    positions(s, p) {
      return [[LAKE.x0, LAKE.bot], [LAKE.x1, LAKE.top], [LAKE.x0, zY(real(p) ? s.d : D - s.d)]];
    },

    draw(ctx, s, p, v, d) {
      const R = real(p), r = rho(p), [tTop, tBot] = surfaceBottom(s, p);

      // udara dan tanah
      d.text(0.1, 2.86, `udara ${fmt(p.Tair, 0)} °C · hari ke-${Math.floor(s.t / 86400) + 1}`, 'fg', 'md', 'left');
      d.text(0.1, 2.64, `waktu dipercepat ${SPEEDUP}× (1 s = 1 hari)`, 'muted', 'sm', 'left');
      d.polygon([[LAKE.x0 - 0.06, LAKE.top + 0.02], [LAKE.x0, LAKE.top + 0.02], [LAKE.x0, LAKE.bot], [LAKE.x1, LAKE.bot],
        [LAKE.x1, LAKE.top + 0.02], [LAKE.x1 + 0.06, LAKE.top + 0.02], [LAKE.x1 + 0.06, LAKE.bot - 0.1], [LAKE.x0 - 0.06, LAKE.bot - 0.1]], 'grid', 'fg', 1);

      // sel air dan es
      for (let i = 0; i < N; i++) {
        const y1 = zY(i * DZ), y0 = zY((i + 1) * DZ);
        d.rect(LAKE.x0, y0, LAKE.x1 - LAKE.x0, y1 - y0 + 0.002, d.heat(heatF(isIce(s, p, i) ? 0 : s.T[i])));
      }
      if (s.d > 0) {
        const ya = R ? zY(s.d) : LAKE.bot, hb = s.d * S;
        d.rect(LAKE.x0, ya, LAKE.x1 - LAKE.x0, hb, 'bg', 'fg');
        for (let x = LAKE.x0 + 0.08; x < LAKE.x1; x += 0.16) d.line(x, ya + hb * 0.25, x + 0.05, ya + hb * 0.75, 'cool', 1);
        d.text(LAKE.x1 + 0.1, ya + hb / 2, 'es', 'fg', 'sm', 'left');
      }
      // label suhu pada beberapa kedalaman
      [0.2, 1.4, 2.6, 3.8].map(z => Math.floor(z / DZ)).forEach(i => {
        if (isIce(s, p, i)) return;
        d.text(LAKE.x1 - 0.05, zY((i + 0.5) * DZ), `${fmt(s.T[i], 1)} °C`, 'fg', 'sm', 'right');
      });
      for (let z = 0; z <= D; z++) {
        d.line(LAKE.x0 - 0.12, zY(z), LAKE.x0 - 0.06, zY(z), 'fg', 1);
        d.text(LAKE.x0 - 0.15, zY(z), z === 0 ? '0 m' : `${z}`, 'muted', 'sm', 'right');
      }

      // inset ρ(T)
      const pl = d.plot({ x: 2.9, y: 1.45, w: 1.0, h: 0.95 }, {
        x: [0, 10], y: [999.65, 1000.0], xticks: [0, 4, 10], yticks: [999.7, 999.8, 999.9, 1000],
        xlabel: 'T (°C)', ylabel: 'ρ (kg/m³)', fmt: t => fmt(t, t > 100 ? 1 : 0)
      });
      const curve = [];
      for (let k = 0; k <= 50; k++) curve.push([k / 5, r(k / 5)]);
      pl.line(curve, 'body', 2);
      pl.vline(R ? 3.98 : 0, 'muted', 1.5);
      pl.dot(tTop, r(tTop), 5, 'cool');
      pl.dot(tBot, r(tBot), 5, 'hot');

      const tx = 2.45;
      d.text(tx, 1.08, R ? 'air asli: ρ maks pada 4 °C' : 'cairan biasa: ρ maks 0 °C', 'fg', 'sm', 'left');
      d.text(tx, 0.9, R ? 'es lebih ringan: mengapung' : 'es lebih berat: tenggelam', 'muted', 'sm', 'left');
      d.text(tx, 0.72, `air: atas ${fmt(tTop, 1)} °C · dasar ${fmt(tBot, 1)} °C`, 'fg', 'sm', 'left');
      d.text(tx, 0.54, `tebal es ${fmt(s.d * 100, 1)} cm`, 'body', 'sm', 'left');
      // legenda warna
      const lx = 2.6, lw = 0.95, n = 20;
      for (let i = 0; i < n; i++) d.rect(lx + lw * i / n, 0.22, lw / n + 0.003, 0.08, d.heat(i / (n - 1)));
      d.text(lx - 0.03, 0.26, `${T_MIN}`, 'muted', 'sm', 'right');
      d.text(lx + lw + 0.03, 0.26, `${T_MAX} °C`, 'muted', 'sm', 'left');
      d.line(lx + lw * 0.4, 0.18, lx + lw * 0.4, 0.34, 'fg', 1);
      d.text(lx + lw * 0.4, 0.1, '4', 'muted', 'sm');
    }
  });
})();
