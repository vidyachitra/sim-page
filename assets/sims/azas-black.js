/* Kalorimetri: Azas Black (Kalor dan Termodinamika › Suhu dan Kalor)
 * Asumsi model:
 *  - Benda panas A (suhu awal T_A) dimasukkan ke air B bersuhu tetap awal T_B,0 = 20 °C di kalorimeter.
 *  - Kalorimeter terisolasi sempurna; kapasitas kalor wadah, pengaduk dan termometer diabaikan.
 *  - Kalor jenis tetap: besi 450, aluminium 900, tembaga 385, air 4186 J/(kg·K). Tanpa perubahan wujud.
 *  - Pertukaran kalor: C_A dT_A/dt = −G(T_A − T_B), C_B dT_B/dt = +G(T_A − T_B), C = m c.
 *    Solusi eksak tiap langkah: rerata berbobot (C_A T_A + C_B T_B)/(C_A + C_B) kekal, selisih
 *    meluruh e^{−G(1/C_A + 1/C_B)t}. Suhu akhir tidak bergantung pada G.
 *  - G_REAL = 5 W/K (≈ h·A untuk balok 200 g dalam air diaduk: h ≈ 1000 W/(m²·K), A ≈ 50 cm²),
 *    dipercepat SPEEDUP = 20× → G = 100 W/K, agar setimbang dalam ±5 s pada nilai bawaan.
 *  - Mode tebak: suhu akhir baru ditampilkan setelah |T_A − T_B| < 0,1 °C.
 * Integrator: pembaruan eksak (eksponensial), dt = 1/120 s.
 * Skala visual: warna d.heat untuk T_MIN = 20 °C … T_MAX = 100 °C; sisi balok ∝ ∛volume (skematik,
 * S0 + S1·∛(V/V_MAX)); tinggi air ∝ m_B; batang kalor penuh = min(C_A, C_B)·(T_A − T_B,0), batas atas
 * kalor yang dapat berpindah (Q akhir berada di 50–100 % skala; suhu akhir tidak terbaca dari skala).
 */
(function () {
  const T_B0 = 20;                        // °C, suhu awal air (tetap)
  const T_MIN = 20, T_MAX = 100;          // °C, rentang warna suhu
  const G_REAL = 5, SPEEDUP = 20;         // W/K
  const G = G_REAL * SPEEDUP;             // W/K
  const C_W = 4186;
  const MATS = [
    { n: 'besi', c: 450, rho: 7870 },
    { n: 'aluminium', c: 900, rho: 2700 },
    { n: 'tembaga', c: 385, rho: 8960 },
    { n: 'air', c: 4186, rho: 1000 }
  ];
  const EQ_TOL = 0.1;                     // °C, ambang setimbang
  const V_MAX = 500e-6;                   // m³, volume terbesar (500 g air)
  const S0 = 0.06, S1 = 0.2;              // sisi balok tampilan
  // tata letak kalorimeter
  const CX0 = 0.3, CX1 = 1.3, CY0 = 0.4, CH = 1.1;

  const mat = p => MATS[Math.max(0, Math.min(3, Math.round(p.bahan) - 1))];
  const caps = p => ({ CA: p.mA / 1000 * mat(p).c, CB: p.mB / 1000 * C_W });
  const blackT = p => { const { CA, CB } = caps(p); return (CA * p.TA + CB * T_B0) / (CA + CB); };
  const fmt = (x, n) => x.toFixed(n).replace('.', ',').replace('-', '−');

  SimCore.register({
    api: 1,
    id: 'azas-black',
    title: 'Kalorimetri dan Azas Black',
    aspect: 4 / 3,
    view: { x: [0, 3.2], y: [0, 2.4] },
    dt: 1 / 120,

    params: [
      { key: 'bahan', label: 'Bahan A (1 besi · 2 aluminium · 3 tembaga · 4 air)', symbol: '', unit: '', min: 1, max: 4, step: 1, value: 1, resets: true },
      { key: 'mA', label: 'Massa benda A', symbol: 'm_A', unit: 'g', min: 20, max: 500, step: 10, value: 200, resets: true },
      { key: 'TA', label: 'Suhu awal A', symbol: 'T_A', unit: '°C', min: 30, max: 100, step: 1, value: 90, resets: true },
      { key: 'mB', label: 'Massa air B', symbol: 'm_B', unit: 'g', min: 50, max: 500, step: 10, value: 200, resets: true },
      { key: 'guess', label: 'Tebakan suhu akhir', symbol: 'T_c', unit: '°C', min: 20, max: 100, step: 0.5, value: 50 }
    ],

    graphs: [
      { title: 'Suhu', unit: '°C', min: 20, max: 100, window: 20, series: [
        { key: 'TA', label: 'T_A', color: 'vector', digits: 1 },
        { key: 'TB', label: 'T_B', color: 'body', digits: 1 },
        { key: 'guess', label: 'tebakan', color: 'muted', digits: 1 }
      ] },
      { title: 'Kalor', unit: 'kJ', min: 0, window: 20, series: [
        { key: 'Qlepas', label: 'Q_lepas', color: 'vector', digits: 2 },
        { key: 'Qterima', label: 'Q_terima', color: 'body', digits: 2 }
      ] }
    ],

    init(p) { return { TA: p.TA, TB: T_B0, t: 0, done: 0 }; },

    step(s, p, dt) {
      const { CA, CB } = caps(p);
      const mean = (CA * s.TA + CB * s.TB) / (CA + CB);
      const diff = (s.TA - s.TB) * Math.exp(-G * (1 / CA + 1 / CB) * dt);
      s.TA = mean + diff * CB / (CA + CB);
      s.TB = mean - diff * CA / (CA + CB);
      s.t += dt;
      if (Math.abs(s.TA - s.TB) < EQ_TOL) s.done = 1;
    },

    measure(s, p) {
      const { CA, CB } = caps(p);
      return {
        TA: s.TA, TB: s.TB, guess: p.guess,
        Qlepas: CA * (p.TA - s.TA) / 1000, Qterima: CB * (s.TB - T_B0) / 1000
      };
    },

    positions(s, p) { return [[CX0 - 0.15, CY0 - 0.15], [CX1 + 0.15, CY0 + CH + 0.6]]; },

    draw(ctx, s, p, v, d) {
      const M = mat(p), { CA, CB } = caps(p);
      const col = T => d.heat((T - T_MIN) / (T_MAX - T_MIN));

      // kalorimeter: jaket isolasi, bejana dalam, tutup
      d.rect(CX0 - 0.12, CY0 - 0.12, CX1 - CX0 + 0.24, CH + 0.12, 'grid', 'muted');
      d.rect(CX0, CY0, CX1 - CX0, CH, 'bg', 'fg');
      const wh = CH * (0.3 + 0.6 * p.mB / 500);                    // tinggi air ∝ m_B
      d.rect(CX0, CY0, CX1 - CX0, wh, col(s.TB));
      d.rect(CX0 - 0.16, CY0 + CH, CX1 - CX0 + 0.32, 0.08, 'fg');   // tutup

      // benda A tergantung tali, terendam di tengah air
      const V = p.mA / 1000 / M.rho, side = S0 + S1 * Math.cbrt(V / V_MAX);
      const bx = (CX0 + CX1) / 2 - 0.15, by = CY0 + Math.max(0.05, wh / 2 - side / 2);
      d.line(bx, by + side, bx, CY0 + CH + 0.3, 'muted', 1);
      d.rect(bx - side / 2, by, side, side, col(s.TA), 'fg');
      d.text(bx - side / 2 - 0.04, by + side / 2, 'A', 'fg', 'sm', 'right');
      d.text(CX1 - 0.05, CY0 + wh - 0.08, 'B', 'fg', 'sm', 'right');

      // pengaduk (gerak naik-turun hanya hiasan selama belum setimbang)
      const sx = CX1 - 0.2, sy = CY0 + 0.12 + (s.done ? 0 : 0.06 * (1 - Math.cos(2 * Math.PI * s.t)));
      d.line(sx, sy, sx, CY0 + CH + 0.45, 'fg', 2);
      d.line(sx - 0.12, sy, sx + 0.12, sy, 'fg', 3);

      d.text(0.05, 2.28, `A: ${M.n}, c = ${M.c} J/(kg·K)`, 'fg', 'sm', 'left');
      d.text(0.05, 2.07, `G dipercepat ${SPEEDUP}×`, 'muted', 'sm', 'left');
      d.text(CX0 - 0.12, 0.13, `warna ${T_MIN} °C`, 'muted', 'sm', 'left');
      for (let k = 0; k < 8; k++) d.rect(0.95 + k * 0.05, 0.08, 0.05, 0.1, d.heat((k + 0.5) / 8));
      d.text(1.37, 0.13, `${T_MAX} °C`, 'muted', 'sm', 'left');

      // neraca kalor: dua batang pada skala yang sama
      const Qs = Math.min(CA, CB) * (p.TA - T_B0);               // skala penuh = batas atas Q
      const QL = CA * (p.TA - s.TA), QT = CB * (s.TB - T_B0);
      const bY = 0.45, bH = 0.95, bw = 0.28;
      [[1.95, QL, 'Q_lepas', 'vector'], [2.55, QT, 'Q_terima', 'body']].forEach(([x, Q, lab, c]) => {
        d.rect(x - bw / 2, bY, bw, bH, 'bg', 'grid');
        d.rect(x - bw / 2, bY, bw, bH * Math.max(0, Math.min(1, Q / Qs)), c);
        d.text(x, bY - 0.1, lab, c, 'sm');
        d.text(x, bY + bH + 0.1, `${fmt(Q / 1000, 2)} kJ`, c, 'sm');
      });
      d.text(2.25, bY + bH + 0.3, 'neraca kalor', 'muted', 'sm');

      // tebak lalu bandingkan
      const lx = 1.6;
      if (!s.done) {
        d.text(lx, 2.28, `Tebakanmu: ${fmt(p.guess, 1)} °C`, 'fg', 'md', 'left');
        d.text(lx, 2.07, 'suhu akhir muncul saat setimbang', 'muted', 'sm', 'left');
      } else {
        const Tf = (s.TA * CA + s.TB * CB) / (CA + CB);
        d.text(lx, 2.28, `Suhu akhir ${fmt(Tf, 1)} °C`, 'fg', 'md', 'left');
        d.text(lx, 2.07, `tebakanmu ${fmt(p.guess, 1)} °C · selisih ${fmt(Math.abs(p.guess - Tf), 1)} °C`, 'muted', 'sm', 'left');
        d.text(lx, 1.88, `rumus Black: T_c = ${fmt(blackT(p), 2)} °C`, 'fg', 'sm', 'left');
      }
    }
  });
})();
