/* Suhu dan kalor: dua gelas air dipanaskan (Kalor dan Termodinamika › Suhu dan Kalor)
 * Asumsi model:
 *  - Dua gelas air A dan B, masing-masing di atas pemanas berdaya tetap P; semua kalor masuk ke air.
 *  - Gelas terisolasi sempurna: tanpa rugi kalor ke udara, kapasitas kalor gelas diabaikan.
 *  - Kalor masuk Q = P·t (eksak); T = T₀ + Q/(m c), c = 4186 J/(kg·K), sama di seluruh air.
 *  - Pada 100 °C (tekanan 1 atm) air mendidih: T tetap 100 °C, kelebihan kalor menguapkan air,
 *    m_uap = (Q − m c (100 − T₀))/L_v, L_v = 2,256 × 10⁶ J/kg. Uap keluar dari gelas.
 *  - Jika seluruh air sudah menguap, pemanas dianggap mati (Q berhenti bertambah).
 *  - Waktu nyata (tanpa percepatan): massa dan daya dipilih kecil agar kenaikan suhu tampak dalam detik.
 * Integrator: Q += P·dt (eksak untuk P tetap), dt = 1/120 s. Suhu dan penguapan dihitung tertutup dari Q.
 * Skala visual: tinggi air ∝ massa air tersisa (gelas penuh = M_MAX = 500 g); warna air
 * d.heat untuk T_MIN = 0 °C … T_MAX = 100 °C; warna pemanas d.heat(P / P_MAX).
 */
(function () {
  const C_W = 4186;        // J/(kg·K), kalor jenis air
  const L_V = 2.256e6;     // J/kg, kalor uap air pada 100 °C
  const T_BOIL = 100;      // °C, titik didih pada 1 atm
  const T_MIN = 0, T_MAX = 100;   // °C, rentang warna suhu
  const P_MAX = 1000;      // W, rentang slider daya = rentang warna pemanas
  const M_MAX = 500;       // g, gelas penuh
  const XA = 0.55, XB = 2.55;     // m (tata letak), pusat gelas A dan B
  const BEAK_Y = 1.48, BEAK_H = 1.0, BEAK_W = 0.6;

  const fmt = (x, d) => x.toFixed(d).replace('.', ',').replace('-', '−');

  // Keadaan satu gelas dari Q (J), massa m (g), T₀ (°C) — tertutup, dipakai step/measure/draw.
  function glass(Q, mG, T0) {
    const m = mG / 1000;
    const Qs = m * C_W * (T_BOIL - T0);              // kalor sampai mulai mendidih
    const Qmax = Qs + m * L_V;                       // kalor sampai air habis
    const T = Q < Qs ? T0 + Q / (m * C_W) : T_BOIL;
    const evap = Math.min(m, Math.max(0, Q - Qs) / L_V) * 1000;   // g
    return { T, evap, left: mG - evap, boiling: Q >= Qs && Q < Qmax, dry: Q >= Qmax, Qmax };
  }

  SimCore.register({
    api: 1,
    id: 'suhu-kalor',
    title: 'Suhu dan kalor pada dua gelas air',
    aspect: 4 / 3,
    view: { x: [0, 4], y: [0, 3] },
    dt: 1 / 120,

    params: [
      { key: 'mA', label: 'Massa air A', symbol: 'm_A', unit: 'g', min: 20, max: 500, step: 10, value: 100, resets: true },
      { key: 'mB', label: 'Massa air B', symbol: 'm_B', unit: 'g', min: 20, max: 500, step: 10, value: 400, resets: true },
      { key: 'PA', label: 'Daya pemanas A', symbol: 'P_A', unit: 'W', min: 0, max: 1000, step: 10, value: 400 },
      { key: 'PB', label: 'Daya pemanas B', symbol: 'P_B', unit: 'W', min: 0, max: 1000, step: 10, value: 400 },
      { key: 'T0', label: 'Suhu awal', symbol: 'T₀', unit: '°C', min: 0, max: 40, step: 1, value: 20, resets: true }
    ],

    graphs: [
      { title: 'Suhu', unit: '°C', min: 0, max: 100, window: 110, series: [
        { key: 'TA', label: 'T_A', color: 'body', digits: 1 },
        { key: 'TB', label: 'T_B', color: 'body2', digits: 1 }
      ] },
      { title: 'Kalor masuk', unit: 'kJ', min: 0, window: 110, series: [
        { key: 'QA', label: 'Q_A', color: 'body', digits: 2 },
        { key: 'QB', label: 'Q_B', color: 'body2', digits: 2 }
      ] }
    ],

    init(p) { return { QA: 0, QB: 0, t: 0 }; },

    step(s, p, dt) {
      s.QA = Math.min(s.QA + p.PA * dt, glass(0, p.mA, p.T0).Qmax);
      s.QB = Math.min(s.QB + p.PB * dt, glass(0, p.mB, p.T0).Qmax);
      s.t += dt;
    },

    measure(s, p) {
      const a = glass(s.QA, p.mA, p.T0), b = glass(s.QB, p.mB, p.T0);
      return { TA: a.T, TB: b.T, QA: s.QA / 1000, QB: s.QB / 1000, evapA: a.evap, evapB: b.evap };
    },

    positions(s, p) {
      return [[XA - BEAK_W / 2, BEAK_Y], [XB + BEAK_W / 2, BEAK_Y + BEAK_H]];
    },

    draw(ctx, s, p, v, d) {
      const col = f => d.heat((f - T_MIN) / (T_MAX - T_MIN));
      const A = glass(s.QA, p.mA, p.T0), B = glass(s.QB, p.mB, p.T0);
      const sides = [
        { n: 'A', x: XA, g: A, m: p.mA, P: p.PA, Q: s.QA, c: 'body' },
        { n: 'B', x: XB, g: B, m: p.mB, P: p.PB, Q: s.QB, c: 'body2' }
      ];

      // legenda warna suhu (kanan atas)
      for (let k = 0; k < 10; k++) d.rect(3.0 + k * 0.045, 1.12, 0.045, 0.1, col(T_MIN + (k + 0.5) * (T_MAX - T_MIN) / 10));
      d.text(2.97, 1.17, `warna ${T_MIN} °C`, 'muted', 'sm', 'right');
      d.text(3.48, 1.17, `${T_MAX} °C`, 'muted', 'sm', 'left');

      sides.forEach(o => {
        const x0 = o.x - BEAK_W / 2, x1 = o.x + BEAK_W / 2, y0 = BEAK_Y;
        d.text(o.x, 2.89, `Gelas ${o.n}`, o.c, 'md');

        // pemanas: warna menunjukkan daya
        d.rect(o.x - 0.38, 1.34, 0.76, 0.1, o.P > 0 && !o.g.dry ? d.heat(o.P / P_MAX) : 'grid', 'fg');

        // air: tinggi ∝ massa tersisa
        const h = BEAK_H * 0.95 * o.g.left / M_MAX;
        if (h > 0) d.rect(x0, y0, BEAK_W, h, col(o.g.T));
        if (o.g.boiling && h > 0.08) {                 // gelembung (hiasan, deterministik dari t)
          for (let k = 0; k < 6; k++) {
            const u = (s.t * 0.9 + k * 0.37) % 1;
            d.dot(x0 + 0.06 + ((k * 0.61) % 1) * (BEAK_W - 0.3), y0 + u * h, 2.5, 'bg');
          }
        }
        // dinding gelas
        d.polyline([[x0, y0 + BEAK_H], [x0, y0], [x1, y0], [x1, y0 + BEAK_H]], 'fg', 2);

        // termometer 0–100 °C di dalam air
        const tx = x1 - 0.1, ty0 = y0 + 0.1, ty1 = y0 + BEAK_H + 0.2;
        d.rect(tx - 0.03, ty0, 0.06, ty1 - ty0, 'bg', 'fg');
        d.dot(tx, ty0 - 0.02, 6, 'hot');
        const fT = Math.max(0, Math.min(1, (o.g.T - 0) / 100));
        d.rect(tx - 0.015, ty0, 0.03, fT * (ty1 - ty0 - 0.05), 'hot');
        [0, 50, 100].forEach(t => {
          const yy = ty0 + t / 100 * (ty1 - ty0 - 0.05);
          d.line(tx - 0.03, yy, tx - 0.07, yy, 'fg', 1);
        });

        // label
        const lx = x1 + 0.12;
        d.text(lx, 2.35, `m_${o.n} = ${o.m} g`, 'muted', 'sm', 'left');
        d.text(lx, 2.12, `T_${o.n} = ${fmt(o.g.T, 1)} °C`, o.c, 'md', 'left');
        d.text(lx, 1.89, `Q_${o.n} = ${fmt(o.Q / 1000, 2)} kJ`, o.c, 'md', 'left');
        d.text(lx, 1.66, `P_${o.n} = ${o.P} W`, 'muted', 'sm', 'left');
        if (o.g.evap > 0) d.text(lx, 1.45, o.g.dry ? 'air habis' : `menguap ${fmt(o.g.evap, 1)} g`, 'muted', 'sm', 'left');
        if (o.g.boiling) d.text(o.x - 0.14, y0 + BEAK_H + 0.1, 'mendidih', 'muted', 'sm');
      });

      // skala termometer: suhu yang sama pada empat skala
      d.text(0.05, 1.17, 'Skala termometer', 'fg', 'sm', 'left');
      const bx0 = 1.2, bx1 = 2.95;
      const rows = [
        { n: 'Celsius (°C)', lo: 0, hi: 100, f: T => T },
        { n: 'Réaumur (°R)', lo: 0, hi: 80, f: T => 0.8 * T },
        { n: 'Fahrenheit (°F)', lo: 32, hi: 212, f: T => 1.8 * T + 32 },
        { n: 'Kelvin (K)', lo: 273, hi: 373, f: T => T + 273.15 }
      ];
      const xOf = T => bx0 + Math.max(0, Math.min(1, T / 100)) * (bx1 - bx0);
      rows.forEach((r, i) => {
        const y = 0.9 - i * 0.26;
        d.text(0.05, y, r.n, 'muted', 'sm', 'left');
        d.text(bx0 - 0.05, y, String(r.lo), 'muted', 'sm', 'right');
        d.text(bx1 + 0.05, y, String(r.hi), 'muted', 'sm', 'left');
        d.line(bx0, y, bx1, y, 'grid', 6);
        for (let k = 0; k <= 10; k++) d.line(bx0 + k / 10 * (bx1 - bx0), y - 0.04, bx0 + k / 10 * (bx1 - bx0), y + 0.04, 'muted', 1);
        d.text(3.97, y + 0.065, `A ${fmt(r.f(A.T), 1)}`, 'body', 'sm', 'right');
        d.text(3.97, y - 0.065, `B ${fmt(r.f(B.T), 1)}`, 'body2', 'sm', 'right');
      });
      [[A.T, 'body'], [B.T, 'body2']].forEach(([T, c]) => {
        d.line(xOf(T), 0.06, xOf(T), 1.0, c, 1.5);
        rows.forEach((r, i) => d.dot(xOf(T), 0.9 - i * 0.26, 4.5, c));
      });
    }
  });
})();
