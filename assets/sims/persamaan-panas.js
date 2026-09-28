/* Persamaan panas 1D dengan skema FTCS (Kalor › Perpindahan Kalor; jembatan ke metode numerik)
 * ∂T/∂t = D ∂²T/∂x² pada batang 1 m, dibagi N = 50 sel (Δx = 2 cm, suhu di pusat sel).
 * Asumsi model:
 *  - Difusivitas D = 1e-4 m²/s (orde logam), tetap; sisi samping batang terisolasi.
 *  - Batas suhu tetap: sel bayangan T_{-1} = 2T_b − T_0, jadi T_b berlaku tepat di ujung batang.
 *    Batas terisolasi: sel bayangan T_{-1} = T_0 (fluks nol), jadi rata-rata suhu kekal tepat.
 *  - Satu pembaruan FTCS per langkah simulasi: waktu model maju Δt = rΔx²/D tiap langkah
 *    (1/240 s tampilan), jadi waktu dipercepat SPEEDUP = Δt/(1/240 s), bergantung pada r.
 *  - r > 0,5 tidak stabil: osilasi papan catur tumbuh ×|1 − 4r| per langkah. Bila maks|T| > T_FREEZE
 *    keadaan dibekukan (tetap berhingga) sampai Ulang atau kondisi awal diganti.
 * Skala warna: T_MIN–T_MAX = 0–100 °C. Sumbu waktu grafik = waktu tampilan, bukan waktu model.
 */
(function () {
  const LEN = 1;               // m, panjang batang
  const N = 50;                // jumlah sel
  const DX = LEN / N;          // m
  const D = 1e-4;              // m²/s, difusivitas
  const T_LEFT = 100;          // °C, batas kiri bila suhu tetap
  const T_RIGHT = 0;           // °C, batas kanan bila suhu tetap
  const T_MIN = 0, T_MAX = 100;   // °C, rentang skala warna dan sumbu plot
  const T_FREEZE = 1e4;        // °C, batas beku saat tidak stabil
  const DT_VIEW = 1 / 240;     // s tampilan per langkah
  const PROBES = [0.25, 0.5, 0.75];   // m
  const PROBE_COLORS = ['body', 'body2', 'vector2'];
  const IC_NAMES = ['dingin merata', 'titik panas di tengah', 'setengah panas'];

  const xc = i => (i + 0.5) * DX;                        // pusat sel
  const heatF = T => (T - T_MIN) / (T_MAX - T_MIN);
  const fixedL = p => Math.round(p.bl) === 1;
  const fixedR = p => Math.round(p.br) === 1;
  const fmt = (x, d) => x.toFixed(d).replace('.', ',').replace('-', '−');
  function probe(T, x) {                                   // interpolasi linear antar pusat sel
    const u = Math.max(0, Math.min(N - 1, x / DX - 0.5)), i = Math.min(N - 2, Math.floor(u)), f = u - i;
    return T[i] * (1 - f) + T[i + 1] * f;
  }
  const mean = T => T.reduce((a, b) => a + b, 0) / N;

  // Profil tunak untuk batas yang sedang dipilih (garis tipis pembanding).
  function steady(s, p) {
    const L = fixedL(p), R = fixedR(p);
    if (L && R) return [[0, T_LEFT], [LEN, T_RIGHT]];
    const c = L ? T_LEFT : R ? T_RIGHT : mean(s.T);
    return [[0, c], [LEN, c]];
  }

  SimCore.register({
    api: 1,
    id: 'persamaan-panas',
    title: 'Persamaan panas 1D dengan skema FTCS',
    aspect: 4 / 3,
    view: { x: [-0.2, 1.2], y: [-0.4, 0.65] },
    dt: DT_VIEW,
    conserved: 'Tmean',          // default: kedua ujung terisolasi
    driftTolerance: 1e-9,

    params: [
      { key: 'ic', label: 'Kondisi awal (1 dingin merata · 2 titik panas di tengah · 3 setengah panas)', symbol: '', unit: '', min: 1, max: 3, step: 1, value: 3, resets: true },
      { key: 'bl', label: 'Batas kiri (1 suhu tetap 100 °C · 2 terisolasi)', symbol: '', unit: '', min: 1, max: 2, step: 1, value: 2 },
      { key: 'br', label: 'Batas kanan (1 suhu tetap 0 °C · 2 terisolasi)', symbol: '', unit: '', min: 1, max: 2, step: 1, value: 2 },
      { key: 'r', label: 'Bilangan difusi DΔt/Δx²', symbol: 'r', unit: '', min: 0.05, max: 0.6, step: 0.01, value: 0.25 }
    ],

    graphs: [
      { title: 'Suhu titik', unit: '°C', series: PROBES.map((x, i) => (
        { key: 'T' + (i + 1), label: `x = ${fmt(x, 2)} m`, color: PROBE_COLORS[i], digits: 1 })) },
      { title: 'Suhu rata-rata', unit: '°C', series: [{ key: 'Tmean', label: 'T_rata', color: 'total', digits: 3 }] }
    ],

    init(p) {
      const ic = Math.round(p.ic), T = new Array(N);
      for (let i = 0; i < N; i++) {
        if (ic === 2) T[i] = (i >= N / 2 - 2 && i < N / 2 + 2) ? 100 : 0;   // 4 sel = 8 cm
        else if (ic === 3) T[i] = i < N / 2 ? 100 : 0;
        else T[i] = 0;
      }
      return { T, n: 0, tm: 0, frozen: 0 };
    },

    step(s, p, dt) {
      if (s.frozen) return;
      const T = s.T, r = p.r;
      const gl = fixedL(p) ? 2 * T_LEFT - T[0] : T[0];            // sel bayangan kiri
      const gr = fixedR(p) ? 2 * T_RIGHT - T[N - 1] : T[N - 1];   // sel bayangan kanan
      const nx = new Array(N);
      let big = 0;
      for (let i = 0; i < N; i++) {
        const a = i === 0 ? gl : T[i - 1], b = i === N - 1 ? gr : T[i + 1];
        nx[i] = T[i] + r * (b - 2 * T[i] + a);
        big = Math.max(big, Math.abs(nx[i]));
      }
      if (big > T_FREEZE) { s.frozen = 1; return; }                 // tidak stabil: bekukan
      for (let i = 0; i < N; i++) T[i] = nx[i];
      s.n++;
      s.tm += r * DX * DX / D;
    },

    measure(s, p) {
      return { T1: probe(s.T, PROBES[0]), T2: probe(s.T, PROBES[1]), T3: probe(s.T, PROBES[2]), Tmean: mean(s.T) };
    },

    positions(s, p) { return [[-0.13, -0.2], [1.13, -0.13], [0, 0.52], [LEN, 0.02]]; },

    draw(ctx, s, p, v, d) {
      const unstable = p.r > 0.5;
      const dtm = p.r * DX * DX / D;

      // profil T(x)
      const box = { x: 0, y: 0.02, w: LEN, h: 0.5 };
      const pl = d.plot(box, { x: [0, LEN], y: [T_MIN, T_MAX], xlabel: 'x (m)', ylabel: 'T (°C)',
        xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 25, 50, 75, 100], fmt: t => String(t).replace('.', ',') });
      PROBES.forEach((x, i) => pl.vline(x, PROBE_COLORS[i], 1));
      pl.line(steady(s, p), 'muted', 1);
      pl.line(s.T.map((T, i) => [xc(i), T]), 'fg', 2);
      PROBES.forEach((x, i) => pl.dot(x, probe(s.T, x), 4, PROBE_COLORS[i]));
      if (s.frozen) {
        d.rect(0.12, 0.2, 0.76, 0.17, 'bg', 'vector');
        d.text(0.5, 0.315, 'tidak stabil: r > 0,5', 'vector', 'md');
        d.text(0.5, 0.25, 'dibekukan · tekan Ulang', 'muted', 'sm');
      }

      // batang berwarna
      const ry = -0.2, rh = 0.07;
      for (let i = 0; i < N; i++) d.rect(i * DX, ry, DX + 0.001, rh, d.heat(heatF(s.T[i])));
      d.polyline([[0, ry], [LEN, ry], [LEN, ry + rh], [0, ry + rh], [0, ry]], 'fg', 1.5);
      PROBES.forEach((x, i) => d.dot(x, ry + rh + 0.018, 4, PROBE_COLORS[i]));

      // ikon batas
      const icon = (x0, fixed, Tb) => {
        if (fixed) {
          d.rect(x0, ry - 0.02, 0.12, rh + 0.04, d.heat(heatF(Tb)), 'fg');
          d.text(x0 + 0.06, -0.255, `${Tb} °C tetap`, 'fg', 'sm');
        } else {
          d.rect(x0, ry - 0.02, 0.12, rh + 0.04, 'grid', 'muted');
          for (let k = 1; k <= 4; k++) d.line(x0 + 0.024 * k - 0.02, ry - 0.02, x0 + 0.024 * k + 0.02, ry + rh + 0.02, 'muted', 1);
          d.text(x0 + 0.06, -0.255, 'terisolasi', 'fg', 'sm');
        }
      };
      icon(-0.13, fixedL(p), T_LEFT);
      icon(LEN + 0.01, fixedR(p), T_RIGHT);
      d.text(0.5, -0.255, `Δt = rΔx²/D = ${fmt(dtm, 2)} s per langkah`, 'muted', 'sm');

      // teks status
      d.text(-0.19, 0.615, `r = ${fmt(p.r, 2)} · ${unstable ? 'tidak stabil (r > 0,5)' : 'stabil (r ≤ 0,5)'}`,
        unstable ? 'vector' : 'fg', 'sm', 'left');
      const ins = !fixedL(p) && !fixedR(p);
      d.text(1.19, 0.615, `T_rata = ${fmt(mean(s.T), 2)} °C${ins ? ' (kekal)' : ''}`, 'fg', 'sm', 'right');
      d.text(1.19, 0.565, IC_NAMES[Math.round(p.ic) - 1], 'muted', 'sm', 'right');

      // legenda warna dan waktu
      const lx = 0, lw = 0.25, ly = -0.345, lh = 0.03, n = 20;
      for (let i = 0; i < n; i++) d.rect(lx + lw * i / n, ly, lw / n + 0.001, lh, d.heat(i / (n - 1)));
      d.text(lx - 0.015, ly + lh / 2, `${T_MIN} °C`, 'muted', 'sm', 'right');
      d.text(lx + lw + 0.015, ly + lh / 2, `${T_MAX} °C`, 'muted', 'sm', 'left');
      d.text(1.19, ly + lh / 2, `t = ${fmt(s.tm, 0)} s · waktu dipercepat ${fmt(dtm / DT_VIEW, 0)}×`, 'muted', 'sm', 'right');
    }
  });
})();
