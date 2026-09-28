/* Radiasi benda hitam (Kalor dan Termodinamika › Perpindahan Kalor)
 * Asumsi model:
 *  - Benda hitam sempurna (e = 1). Radiansi spektral Planck:
 *    B_λ(λ, T) = (2hc²/λ⁵) / (exp(hc/(λ k_B T)) − 1), digambar untuk λ = 0…3000 nm dengan satu skala
 *    y bersama untuk kedua suhu (luas di bawah kurva ∝ σT⁴).
 *  - Puncak Wien λ_maks = b/T, b = 2,898·10⁻³ m·K. Daya per luas M = σT⁴ = π∫B_λ dλ.
 *  - Warna bintang: spektrum Planck × fungsi pencocok warna CIE 1931 (pendekatan multi-Gauss
 *    Wyman–Sloan–Shirley 2013), jumlahkan 360–830 nm per 5 nm → XYZ → sRGB linear (putih D65),
 *    kanal negatif dipotong, kanal terbesar dinormalkan ke 1, lalu fungsi transfer sRGB. Kecerahan
 *    tidak ditampilkan (hanya warna).
 *  - Pita tampak 380–750 nm: warna spektral dengan cara yang sama, diredupkan di kedua tepinya.
 * Tidak ada dinamika: grafik mencatat perubahan slider terhadap waktu.
 */
(function () {
  const { exp, max, min, pow, floor, log10, abs } = Math;
  const H_PL = 6.62607015e-34, C_L = 2.99792458e8, K_B = 1.380649e-23;   // SI
  const SIGMA = 5.670e-8, B_WIEN = 2.898e-3;
  const LAM_MAX = 3000;                  // nm, batas sumbu x
  const BOX = { x: 0.17, y: 0.13, w: 0.78, h: 0.77 };

  const planck = (lamNm, T) => {         // W/(m²·sr·m)
    const l = lamNm * 1e-9, x = H_PL * C_L / (l * K_B * T);
    return x > 700 ? 0 : 2 * H_PL * C_L * C_L / pow(l, 5) / (exp(x) - 1);
  };
  const g = (x, mu, s1, s2) => { const t = (x - mu) / (x < mu ? s1 : s2); return exp(-0.5 * t * t); };
  const cmf = l => [
    1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2),
    0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1),
    1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8)];
  const gam = u => (u <= 0.0031308 ? 12.92 * u : 1.055 * pow(u, 1 / 2.4) - 0.055);
  function xyzToRgb([X, Y, Z]) {
    const r = [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.2040 * Y + 1.0570 * Z]
      .map(c => max(0, c));
    const m = max(r[0], r[1], r[2]) || 1;
    return r.map(c => gam(c / m));
  }
  function starColor(T) {
    const xyz = [0, 0, 0];
    for (let l = 360; l <= 830; l += 5) { const B = planck(l, T), c = cmf(l); xyz[0] += B * c[0]; xyz[1] += B * c[1]; xyz[2] += B * c[2]; }
    return xyzToRgb(xyz);
  }
  const niceStep = v => { const e = pow(10, floor(log10(v))), f = v / e; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * e; };
  const peakB = T => planck(B_WIEN / T * 1e9, T) * 1e-12;   // MW/(m²·sr·µm)

  SimCore.register({
    api: 1,
    id: 'benda-hitam',
    title: 'Radiasi benda hitam',
    aspect: 4 / 3,
    view: { x: [0, 4 / 3], y: [0, 1] },
    dt: 1 / 100,

    params: [
      { key: 'T', label: 'Suhu', symbol: 'T', unit: 'K', min: 1000, max: 12000, step: 100, value: 5800 },
      { key: 'Tp', label: 'Suhu pembanding', symbol: 'T_p', unit: 'K', min: 1000, max: 12000, step: 100, value: 3000 }
    ],

    graphs: [
      { title: 'Puncak Wien', unit: 'nm', min: 0, window: 60, series: [
        { key: 'lam1', label: 'λ_maks (T)', color: 'body', digits: 0 },
        { key: 'lam2', label: 'λ_maks (T_p)', color: 'body2', digits: 0 }
      ] },
      { title: 'Daya per luas σT⁴', unit: 'MW/m²', min: 0, window: 60, series: [
        { key: 'M1', label: 'σT⁴', color: 'body', digits: 2 },
        { key: 'M2', label: 'σT_p⁴', color: 'body2', digits: 2 }
      ] }
    ],

    init(p) { return { t: 0 }; },
    step(s, p, dt) { s.t += dt; },

    measure(s, p) {
      return { lam1: B_WIEN / p.T * 1e9, lam2: B_WIEN / p.Tp * 1e9, M1: SIGMA * p.T ** 4 / 1e6, M2: SIGMA * p.Tp ** 4 / 1e6 };
    },

    positions() { return [[0, 0], [4 / 3, 1]]; },

    draw(ctx, s, p, v, d) {
      const px = n => n / v.scale;
      const ymax = 1.15 * max(peakB(p.T), peakB(p.Tp)), dy = niceStep(ymax / 4);
      const yt = []; for (let y = 0; y <= ymax + 1e-12; y += dy) yt.push(y);
      const pl = d.plot(BOX, {
        x: [0, LAM_MAX], y: [0, ymax], xticks: [0, 500, 1000, 1500, 2000, 2500, 3000], yticks: yt,
        xlabel: 'λ (nm)', ylabel: 'B_{λ} (MW/(m²·sr·µm))'
      });

      // pita cahaya tampak
      for (let l = 380; l < 750; l += 5) {
        const c = xyzToRgb(cmf(l + 2.5)), fade = l < 420 ? 0.35 + 0.65 * (l - 380) / 40 : l > 700 ? 0.35 + 0.65 * (750 - l) / 50 : 1;
        const col = d.rgb(...c.map(u => 1 - fade * (1 - u)));      // campur ke putih di tepi
        d.rect(pl.X(l), BOX.y, pl.X(l + 5) - pl.X(l) + px(0.5), BOX.h * 0.06, col);
      }

      // kurva Planck
      const curve = T => { const pts = [[0, 0]]; for (let l = 10; l <= LAM_MAX; l += 10) pts.push([l, planck(l, T) * 1e-12]); return pts; };
      const c1 = curve(p.T), c2 = curve(p.Tp);
      pl.fill(c1.concat([[LAM_MAX, 0]]), 'trail');
      pl.line(c2, 'body2', 2);
      pl.line(c1, 'body', 2.5);

      // puncak Wien
      const lab = (T, color, dyPx) => {
        const lm = B_WIEN / T * 1e9;
        pl.vline(lm, color, 1);
        const xl = pl.X(lm), right = xl < BOX.x + BOX.w - px(120);          // label di sisi garis, tak tertimpa
        d.text(xl + px(right ? 5 : -5), min(BOX.y + BOX.h - px(8), pl.Y(peakB(T)) + px(dyPx)),
          `λ_maks = ${lm.toFixed(0)} nm`, color, 'sm', right ? 'left' : 'right');
      };
      const l1 = B_WIEN / p.T * 1e9, l2 = B_WIEN / p.Tp * 1e9;
      const close = abs(pl.X(l1) - pl.X(l2)) < px(110) && abs(pl.Y(peakB(p.T)) - pl.Y(peakB(p.Tp))) < px(18);
      lab(p.T, 'body', 12);
      lab(p.Tp, 'body2', close ? -14 : 12);

      // warna bintang
      const sx = 1.14;
      [[p.T, 0.66, 'T', 'body'], [p.Tp, 0.3, 'T_p', 'body2']].forEach(([T, y, sym, col]) => {
        d.circle(sx, y, 0.085, d.rgb(...starColor(T)));
        d.circle(sx, y, 0.085, 'grid', false, 1);
        d.text(sx, y - 0.085 - px(12), `${sym} = ${T} K`, col, 'sm');
      });
      d.text(sx, 0.9, 'warna', 'muted', 'sm');
    }
  });
})();
