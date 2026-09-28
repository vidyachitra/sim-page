/* Radiasi: permukaan hitam dan mengkilap (Kalor dan Termodinamika › Perpindahan Kalor)
 * Asumsi model:
 *  - Dua pelat aluminium tipis 10 cm × 10 cm (A = 0,01 m² per sisi), tebal 0,2 mm, ρ = 2700 kg/m³,
 *    c = 900 J/(kg·K): kapasitas kalor C = 4,86 J/K. Suhu pelat seragam (pelat tipis, konduktif).
 *  - Hukum Kirchhoff: daya serap = emisivitas, jadi pelat menyerap e·I·A dari lampu dan memantulkan
 *    sisanya (1 − e) (pelat buram, tidak meneruskan cahaya).
 *  - Kedua sisi melepas kalor: C dT/dt = e·I·A − 2A[e·σ(T⁴ − T_ling⁴) + h(T − T_ling)],
 *    h = 10 W/(m²·K) (konveksi alami), T_ling = 25 °C. Konstanta waktu ±10–20 s.
 *  - Lampu dianggap memberi intensitas I seragam pada kedua pelat; I = 0 berarti lampu mati.
 * Integrator: RK4, dt = 1/100 s (waktu nyata, tidak dipercepat).
 * Skala visual: ketebalan pelat digambar dibesarkan; jumlah dan panjang gelombang inframerah
 * sebanding daya pancar bersih dengan acuan P_REF = 8 W; panjang panah pantul sebanding (1 − e)·I.
 */
(function () {
  const { sin, min, max, round } = Math;
  const SIGMA = 5.670e-8;              // W/(m²·K⁴)
  const A = 0.01;                      // m², luas satu sisi
  const THICK = 2e-4, RHO = 2700, C_AL = 900;
  const C = RHO * THICK * A * C_AL;    // J/K = 4,86
  const H_CONV = 10;                   // W/(m²·K)
  const T_ENV = 298.15;                // K (25 °C)
  const I_MAX = 1500;                  // W/m², batas slider
  const P_REF = 8;                     // W, acuan skala gambar inframerah
  const T_MIN = 25, T_MAX = 80;        // °C, rentang termometer (warna d.heat)
  const PLATES = [{ y: 0.43, key: 'e1' }, { y: 0.15, key: 'e2' }];   // pusat pelat (m)
  const PX = 0.46, PH = 0.1, PW = 0.012;                             // posisi x, tinggi, tebal gambar

  const dTdt = (T, e, I) => (e * I * A - 2 * A * (e * SIGMA * (T ** 4 - T_ENV ** 4) + H_CONV * (T - T_ENV))) / C;
  const emit = (T, e) => 2 * e * SIGMA * A * (T ** 4 - T_ENV ** 4);

  SimCore.register({
    api: 1,
    id: 'radiasi',
    title: 'Radiasi: permukaan hitam dan mengkilap',
    aspect: 4 / 3,
    view: { x: [0, 0.8], y: [0, 0.6] },
    dt: 1 / 100,

    params: [
      { key: 'I', label: 'Intensitas lampu', symbol: 'I', unit: 'W/m²', min: 0, max: I_MAX, step: 50, value: 1000 },
      { key: 'e1', label: 'Emisivitas pelat 1', symbol: 'e_1', unit: '', min: 0.05, max: 0.95, step: 0.05, value: 0.95 },
      { key: 'e2', label: 'Emisivitas pelat 2', symbol: 'e_2', unit: '', min: 0.05, max: 0.95, step: 0.05, value: 0.1 }
    ],

    graphs: [
      { title: 'Suhu pelat', unit: '°C', window: 60, series: [
        { key: 'T1', label: 'T_1', color: 'fg', digits: 1 },
        { key: 'T2', label: 'T_2', color: 'body2', digits: 1 }
      ] },
      { title: 'Daya pancar bersih', unit: 'W', window: 60, series: [
        { key: 'P1', label: 'P_1', color: 'fg', digits: 2 },
        { key: 'P2', label: 'P_2', color: 'body2', digits: 2 }
      ] }
    ],

    init(p) { return { T: [T_ENV, T_ENV], t: 0 }; },

    step(s, p, dt) {
      const e = [p.e1, p.e2];
      s.T = SimCore.rk4((t, y) => [dTdt(y[0], e[0], p.I), dTdt(y[1], e[1], p.I)], s.t, s.T, dt);
      s.t += dt;
    },

    measure(s, p) {
      return { T1: s.T[0] - 273.15, T2: s.T[1] - 273.15, P1: emit(s.T[0], p.e1), P2: emit(s.T[1], p.e2) };
    },

    positions(s, p) { return [[0.08, 0.3], [PX, PLATES[0].y + PH / 2], [PX, PLATES[1].y - PH / 2]]; },

    draw(ctx, s, p, v, d) {
      const px = n => n / v.scale, on = p.I > 0, If = p.I / I_MAX;

      // lampu pemanas: reflektor + bola
      const lx = 0.08, ly = 0.29;
      d.polygon([[lx - 0.05, ly + 0.09], [lx + 0.03, ly + 0.05], [lx + 0.03, ly - 0.05], [lx - 0.05, ly - 0.09]], 'grid', 'muted');
      d.circle(lx, ly, 0.03, on ? 'ke' : 'bg');
      d.circle(lx, ly, 0.03, 'fg', false, 1.5);
      d.text(lx - 0.01, ly - 0.12, on ? 'lampu' : 'lampu mati', 'muted', 'sm');

      PLATES.forEach((pl, i) => {
        const e = p[pl.key], T = s.T[i], P = emit(T, e), Tc = T - 273.15;
        // sinar datang
        if (on) {
          [-0.03, 0, 0.03].forEach(o => {
            const x0 = lx + 0.05, y0 = ly + o * 0.5, x1 = PX - 0.012, y1 = pl.y + o;
            d.arrow(x0, y0, (x1 - x0) * 0.92, (y1 - y0) * 0.92, 'ke');
          });
          // pantulan (1 − e): cermin dari sinar datang, panjang ∝ (1 − e)·I
          const r = (1 - e) * If * 0.16;
          if (r > 0.004) [-0.025, 0.025].forEach(o => {
            const dx = PX - 0.012 - (lx + 0.05), dy = pl.y + o - (ly + o * 0.5), L = Math.hypot(dx, dy);
            d.arrow(PX - 0.01, pl.y + o, -r * dx / L, r * dy / L, 'muted');
          });
        }
        // pelat (gelap = e tinggi, terang = e rendah)
        const col = e >= 0.6 ? 'fg' : e >= 0.3 ? 'muted' : 'grid';
        d.rect(PX - PW / 2, pl.y - PH / 2, PW, PH, col, 'fg');
        d.text(PX, pl.y + PH / 2 + px(10), `pelat ${i + 1} (e = ${e.toFixed(2).replace('.', ',')})`, 'fg', 'sm');
        // inframerah: gelombang dari sisi belakang, jumlah & panjang ∝ P
        const n = max(0, min(4, round(4 * P / P_REF + 0.49)));
        const len = 0.05 + 0.07 * min(1, P / P_REF);
        for (let k = 0; k < n; k++) {
          const y0 = pl.y + (k - (n - 1) / 2) * 0.022, x0 = PX + PW / 2 + 0.008, pts = [];
          for (let j = 0; j <= 24; j++) { const u = j / 24; pts.push([x0 + u * len, y0 + 0.006 * sin(u * 6 * Math.PI + s.t * 8)]); }
          d.polyline(pts, 'vector', 1.5);
          d.arrow(x0 + len - 0.004, y0, 0.022, 0, 'vector');
        }
        // termometer
        const tx = 0.71, tb = pl.y - PH / 2, th = PH;
        const f = (Tc - T_MIN) / (T_MAX - T_MIN);
        d.rect(tx, tb, 0.014, th, 'bg', 'muted');
        d.rect(tx, tb, 0.014, th * max(0, min(1, f)), d.heat(f));
        d.circle(tx + 0.007, tb - 0.008, 0.012, d.heat(f));
        d.text(tx + 0.007, tb + th + px(10), `T_${i + 1} = ${Tc.toFixed(1).replace('.', ',')} °C`, 'fg', 'sm');
      });
      d.text(0.795, 0.05 - px(14), `termometer ${T_MIN}–${T_MAX} °C`, 'muted', 'sm', 'right');
      d.text(0.56, 0.29, 'inframerah', 'vector', 'sm');
    }
  });
})();
