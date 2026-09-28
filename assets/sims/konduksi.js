/* Konduksi kalor: dua batang berbeda bahan di antara reservoir panas dan dingin (Kalor › Perpindahan Kalor)
 * Asumsi model:
 *  - Batang L = 0,3 m, penampang A = 1 cm², sisi samping terisolasi: konduksi 1D murni.
 *  - Kedua ujung menempel reservoir bersuhu tetap T_panas (kiri) dan T_dingin (kanan) sejak t = 0;
 *    batang mula-mula bersuhu T_dingin. k dan D (difusivitas) tetap, tak bergantung suhu.
 *  - Tanpa hambatan kontak di ujung dan tanpa rugi kalor ke udara.
 *  - Waktu dipercepat SPEEDUP = 15×: difusivitas dikalikan 15 agar tembaga mendekati keadaan
 *    tunak dalam ±15 s tampilan. Laju kalor H dihitung dengan k asli, jadi nilainya tetap nyata.
 * Integrator: FTCS eksplisit pada 31 simpul (30 sel, Δx = 1 cm), r = D·SPEEDUP·Δt/Δx² ≤ 0,4
 * (sub-langkah bila perlu). Keadaan tunak FTCS tepat linear, jadi H → kAΔT/L.
 * Skala visual (bukan besaran fisis): tebal gambar batang 4 cm; atom bergetar dengan amplitudo
 * VIB_SCALE·√T (T dalam K) pada frekuensi tampilan 14–26 rad/s; panah aliran FLUX_SCALE m per W/m²,
 * dipotong pada ARROW_MAX.
 */
(function () {
  const L = 0.3;             // m, panjang batang
  const A = 1e-4;            // m², luas penampang (1 cm²)
  const N = 30;              // sel; N + 1 simpul
  const DX = L / N;          // m
  const SPEEDUP = 15;        // waktu dipercepat 15×
  const R_MAX = 0.4;         // batas bilangan difusi FTCS per sub-langkah
  const T_MIN = 0, T_MAX = 100;   // °C, rentang skala warna
  const KELVIN = 273.15;

  // Bahan: k W/(m·K), D m²/s (nilai buku teks pada suhu kamar)
  const MAT = [
    { name: 'tembaga', k: 401, D: 1.11e-4 },
    { name: 'aluminium', k: 237, D: 9.7e-5 },
    { name: 'besi', k: 80, D: 2.3e-5 },
    { name: 'kaca', k: 1.0, D: 3.4e-7 },
    { name: 'kayu', k: 0.12, D: 8.2e-8 }
  ];
  const mat = i => MAT[Math.max(0, Math.min(MAT.length - 1, Math.round(i) - 1))];

  // Gambar
  const ROD_H = 0.04;                    // m, tebal gambar batang
  const ROD_Y = [0.22, 0.10];            // m, tepi bawah batang 1 dan 2
  const RES_W = 0.06;                    // m, lebar blok reservoir
  const ROWS = [-0.013, 0, 0.013];       // m, baris atom relatif pusat batang
  const VIB_SCALE = 0.0035 / Math.sqrt(373); // m/√K: amplitudo 3,5 mm pada 100 °C
  const FLUX_SCALE = 2.8e-7;             // m per W/m²: fluks tunak tembaga (ΔT = 80 K) ≈ 3 cm
  const ARROW_MAX = 0.045;               // m, panjang panah maksimum
  const ARROW_EVERY = 5;                 // sel antar-panah

  function mulberry32(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const fmt = (x, d) => x.toFixed(d).replace('.', ',').replace('-', '−');
  function fmtW(h) {
    const a = Math.abs(h);
    if (a >= 1) return fmt(h, a >= 10 ? 1 : 2) + ' W';
    if (a >= 1e-3) return fmt(h * 1e3, a >= 1e-2 ? 1 : 2) + ' mW';
    return fmt(h * 1e6, a >= 1e-5 ? 1 : 2) + ' µW';
  }
  const heatF = T => (T - T_MIN) / (T_MAX - T_MIN);
  const hSteady = (m, p) => m.k * A * (p.Th - p.Tc) / L;           // W
  const hCold = (T, m) => -m.k * A * (T[N] - T[N - 1]) / DX;        // W, di ujung dingin

  SimCore.register({
    api: 1,
    id: 'konduksi',
    title: 'Konduksi kalor pada dua batang berbeda bahan',
    aspect: 4 / 3,
    view: { x: [-0.09, 0.39], y: [-0.02, 0.34] },
    dt: 1 / 240,

    params: [
      { key: 'm1', label: 'Bahan batang 1', symbol: '', unit: '', min: 1, max: 5, step: 1, value: 1, resets: true, options: ['tembaga', 'aluminium', 'besi', 'kaca', 'kayu'] },
      { key: 'm2', label: 'Bahan batang 2', symbol: '', unit: '', min: 1, max: 5, step: 1, value: 3, resets: true, options: ['tembaga', 'aluminium', 'besi', 'kaca', 'kayu'] },
      { key: 'Th', label: 'Suhu reservoir panas', symbol: 'T_panas', unit: '°C', min: 20, max: 100, step: 1, value: 100 },
      { key: 'Tc', label: 'Suhu reservoir dingin', symbol: 'T_dingin', unit: '°C', min: 0, max: 40, step: 1, value: 20 }
    ],

    graphs: [
      { title: 'Suhu tengah batang', unit: '°C', window: 30, series: [
        { key: 'Tm1', label: 'batang 1', color: 'body', digits: 1 },
        { key: 'Tm2', label: 'batang 2', color: 'body2', digits: 1 }
      ] },
      { title: 'Laju kalor', unit: 'W', window: 30, series: [
        { key: 'H1', label: 'H₁', color: 'body', digits: 2 },
        { key: 'H2', label: 'H₂', color: 'body2', digits: 2 }
      ] }
    ],

    init(p) {
      const rods = [p.m1, p.m2].map(() => {
        const T = new Array(N + 1).fill(p.Tc);
        T[0] = p.Th;
        return T;
      });
      // Fase dan frekuensi getaran atom dari PRNG berbiji (Reset selalu sama).
      const rnd = mulberry32(20240917);
      const atoms = [];
      for (let r = 0; r < 2; r++) for (let j = 0; j < ROWS.length; j++) for (let i = 0; i <= N; i++) {
        atoms.push({ wx: 14 + 12 * rnd(), wy: 14 + 12 * rnd(), px: 2 * Math.PI * rnd(), py: 2 * Math.PI * rnd() });
      }
      return { t: 0, rods, atoms };
    },

    step(s, p, dt) {
      const mats = [mat(p.m1), mat(p.m2)];
      const Dmax = Math.max(mats[0].D, mats[1].D) * SPEEDUP;
      const nSub = Math.max(1, Math.ceil(Dmax * dt / (DX * DX) / R_MAX));
      const h = dt / nSub;
      s.rods.forEach((T, ri) => {
        const r = mats[ri].D * SPEEDUP * h / (DX * DX);
        T[0] = p.Th; T[N] = p.Tc;                 // reservoir (slider suhu langsung berlaku)
        const nx = new Array(N + 1);
        for (let k = 0; k < nSub; k++) {
          nx[0] = p.Th; nx[N] = p.Tc;
          for (let i = 1; i < N; i++) nx[i] = T[i] + r * (T[i + 1] - 2 * T[i] + T[i - 1]);
          for (let i = 0; i <= N; i++) T[i] = nx[i];
        }
      });
      s.t += dt;
    },

    measure(s, p) {
      const m1 = mat(p.m1), m2 = mat(p.m2);
      return {
        Tm1: s.rods[0][N / 2], Tm2: s.rods[1][N / 2],
        H1: hCold(s.rods[0], m1), H2: hCold(s.rods[1], m2)
      };
    },

    positions(s, p) {
      return [[-RES_W, ROD_Y[1]], [L + RES_W, ROD_Y[0] + ROD_H], [0, ROD_Y[0]], [L, ROD_Y[1]]];
    },

    draw(ctx, s, p, v, d) {
      const mats = [mat(p.m1), mat(p.m2)];
      const yLo = ROD_Y[1] - 0.035, yHi = ROD_Y[0] + ROD_H + 0.035;

      // reservoir
      d.rect(-RES_W, yLo, RES_W, yHi - yLo, d.heat(heatF(p.Th)), 'fg');
      d.rect(L, yLo, RES_W, yHi - yLo, d.heat(heatF(p.Tc)), 'fg');
      d.text(-0.087, 0.322, `T_panas = ${p.Th} °C`, 'fg', 'sm', 'left');
      d.text(0.387, 0.322, `T_dingin = ${p.Tc} °C`, 'fg', 'sm', 'right');

      s.rods.forEach((T, ri) => {
        const m = mats[ri], y0 = ROD_Y[ri], yc = y0 + ROD_H / 2;
        // sel berwarna menurut suhu
        for (let i = 0; i < N; i++) d.rect(i * DX, y0, DX + 0.0004, ROD_H, d.heat(heatF((T[i] + T[i + 1]) / 2)));
        d.polyline([[0, y0], [L, y0], [L, y0 + ROD_H], [0, y0 + ROD_H], [0, y0]], 'fg', 1.5);
        // kisi atom: amplitudo ∝ √T (K)
        for (let j = 0; j < ROWS.length; j++) for (let i = 0; i <= N; i++) {
          const a = s.atoms[(ri * ROWS.length + j) * (N + 1) + i];
          const amp = VIB_SCALE * Math.sqrt(Math.max(0, T[i] + KELVIN));
          const xi = Math.min(L - 0.004, Math.max(0.004, i * DX));
          d.dot(xi + amp * Math.sin(a.wx * s.t + a.px), yc + ROWS[j] + amp * Math.sin(a.wy * s.t + a.py), 2.2, 'fg');
        }
        // panah aliran kalor, panjang ∝ fluks lokal q = −k dT/dx
        for (let i = Math.floor(ARROW_EVERY / 2); i < N; i += ARROW_EVERY) {
          const q = -m.k * (T[i + 1] - T[i]) / DX;
          const len = Math.max(-ARROW_MAX, Math.min(ARROW_MAX, q * FLUX_SCALE));
          const xm = (i + 0.5) * DX;
          d.arrow(xm - len / 2, y0 - 0.013, len, 0, 'vector');
        }
        d.text(0.004, y0 + ROD_H + 0.016, `${ri + 1}: ${m.name} · k = ${String(m.k).replace('.', ',')} W/(m·K)`, 'fg', 'sm', 'left');
        d.text(0.004, y0 - 0.034, `H_tunak = kAΔT/L = ${fmtW(hSteady(m, p))}`, 'muted', 'sm', 'left');
      });

      // legenda warna dan waktu
      const lx = -0.085, lw = 0.1, ly = 0.012, lh = 0.012, n = 20;
      for (let i = 0; i < n; i++) d.rect(lx + lw * i / n, ly, lw / n + 0.0003, lh, d.heat(i / (n - 1)));
      d.text(lx, ly - 0.013, `${T_MIN} °C`, 'muted', 'sm', 'left');
      d.text(lx + lw, ly - 0.013, `${T_MAX} °C`, 'muted', 'sm', 'right');
      d.text(0.387, 0.018, `t = ${fmt(s.t * SPEEDUP, 0)} s · waktu dipercepat ${SPEEDUP}×`, 'muted', 'sm', 'right');
    }
  });
})();
