/* Celah muai rel dan jembatan (Kalor › Pemuaian)
 * Asumsi model:
 *  - Suhu harian sinusoidal antara 10 °C (pukul 03.00) dan T_maks (pukul 15.00); struktur langsung
 *    bersuhu udara (tanpa tunda termal, tanpa pemanasan langsung oleh matahari).
 *  - Baja, α = 1,2×10⁻⁵ /K (beton bertulang hampir sama), E = 200 GPa.
 *  - Celah g = g₀ − αL₀(T − T_pasang): setiap segmen memuai ke kedua sisi, jadi satu celah menerima
 *    muai satu panjang segmen. Celah tertutup pada T_tutup = T_pasang + g₀/(αL₀).
 *  - Di atas T_tutup ujung saling menekan dan muai tertahan penuh: σ = Eα(T − T_tutup), tegangan
 *    termal tekan (tanpa gesekan bantalan, tanpa tekuk plastis).
 * Waktu: 1 s tampilan = 1 jam (satu hari = 24 s). Semua besaran dihitung langsung dari jam.
 * Skala visual (bukan besaran fisis): segmen tidak berskala; celah di gambar utama GAP_VIS m per mm;
 * tonjolan tekuk BUCKLE_VIS m per MPa (dibatasi BUCKLE_MAX). Inset detail menggambar celah
 * dalam mm nyata (INSET_MM mm selebar inset). Warna: d.heat untuk T_MIN = 0 °C … T_MAX = 70 °C.
 */
(function () {
  const ALPHA = 1.2e-5;      // /K, baja
  const E = 200e9;           // Pa
  const T_NIGHT = 10;        // °C, suhu terendah pukul 03.00
  const H_MIN = 3;           // jam dengan suhu terendah
  const HOURS_PER_S = 1;     // 1 s tampilan = 1 jam
  const H0 = 6;              // jam saat mulai
  const T_MIN = 0, T_MAX = 70;     // °C, rentang skala warna
  const GAP_VIS = 0.004;     // m gambar per mm celah (gambar utama)
  const BUCKLE_VIS = 0.004;  // m gambar per MPa
  const BUCKLE_MAX = 0.3;    // m gambar
  const INSET = { x: 1.0, y: 0.12, w: 2.0, h: 0.62 };
  const INSET_MM = 100;      // mm selebar inset
  const FINGER = 40;         // mm, panjang jari sambungan jembatan
  const CX = 2.0;            // m, letak celah di gambar

  const struct = p => (Math.round(p.kind) === 2 ? 2 : 1);
  const temp = (h, p) => {
    const mid = (p.Tmax + T_NIGHT) / 2, amp = (p.Tmax - T_NIGHT) / 2;
    return mid - amp * Math.cos(2 * Math.PI * (h - H_MIN) / 24);
  };
  const tClose = p => p.Tp + p.g0 * 1e-3 / (ALPHA * p.L0);
  // Keadaan celah pada suhu T: g (mm, ≥ 0) dan σ (MPa, tekan ≥ 0).
  function joint(T, p) {
    const g = p.g0 - ALPHA * p.L0 * (T - p.Tp) * 1e3;
    return g >= 0 ? { g, sigma: 0 } : { g: 0, sigma: E * ALPHA * (T - tClose(p)) / 1e6 };
  }
  const fmt = (x, n) => x.toFixed(n).replace('-', '−').replace('.', ',');
  const heatF = T => (T - T_MIN) / (T_MAX - T_MIN);
  const clock = h => { const m = ((h % 24) + 24) % 24; return `${String(Math.floor(m)).padStart(2, '0')}:${String(Math.floor((m % 1) * 60)).padStart(2, '0')}`; };

  SimCore.register({
    api: 1,
    id: 'celah-muai',
    title: 'Celah muai rel dan jembatan',
    aspect: 4 / 3,
    view: { x: [0, 4], y: [0, 3] },
    dt: 1 / 120,

    params: [
      { key: 'kind', label: 'Struktur (1 rel kereta · 2 jembatan)', symbol: '', unit: '', min: 1, max: 2, step: 1, value: 1, resets: true },
      { key: 'L0', label: 'Panjang segmen', symbol: 'L₀', unit: 'm', min: 10, max: 100, step: 5, value: 25 },
      { key: 'g0', label: 'Celah saat pemasangan', symbol: 'g₀', unit: 'mm', min: 0, max: 30, step: 1, value: 8 },
      { key: 'Tp', label: 'Suhu pemasangan', symbol: 'T_pasang', unit: '°C', min: 0, max: 40, step: 1, value: 25 },
      { key: 'Tmax', label: 'Suhu siang maksimum', symbol: 'T_maks', unit: '°C', min: 30, max: 70, step: 1, value: 55 }
    ],

    graphs: [
      { title: 'Suhu', unit: '°C', min: 0, max: 80, window: 48, series: [
        { key: 'T', label: 'T', color: 'hot', digits: 1 },
        { key: 'Tc', label: 'T_tutup', color: 'muted', digits: 1 }
      ] },
      { title: 'Lebar celah', unit: 'mm', min: 0, window: 48, series: [{ key: 'g', label: 'g', color: 'body', digits: 1 }] },
      { title: 'Tegangan tekan', unit: 'MPa', min: 0, window: 48, series: [{ key: 'sigma', label: 'σ', color: 'vector', digits: 1 }] }
    ],

    init(p) { return { h: H0 }; },

    step(s, p, dt) { s.h += HOURS_PER_S * dt; },

    measure(s, p) {
      const T = temp(s.h, p), j = joint(T, p);
      return { T, Tc: tClose(p), g: j.g, sigma: j.sigma };
    },

    positions(s, p) {
      const j = joint(temp(s.h, p), p);
      return [[CX - j.g * GAP_VIS / 2, 1.2], [0.1, 1.2], [3.9, 1.2 + Math.min(BUCKLE_MAX, j.sigma * BUCKLE_VIS) + 0.3]];
    },

    draw(ctx, s, p, v, d) {
      const T = temp(s.h, p), j = joint(T, p), kind = struct(p), col = d.heat(heatF(T));
      const hr = ((s.h % 24) + 24) % 24, day = hr >= 6 && hr < 18;
      const gv = j.g * GAP_VIS, bump = Math.min(BUCKLE_MAX, j.sigma * BUCKLE_VIS);

      // langit: matahari atau bulan pada busur
      const ang = Math.PI * (((day ? hr - 6 : hr - 18) + 24) % 24) / 12;
      const sx = 2.5 - 0.5 * Math.cos(ang), sy = 2.3 + 0.5 * Math.sin(ang);
      if (day) d.circle(sx, sy, 0.1, 'ke');
      else { d.circle(sx, sy, 0.09, 'muted'); d.circle(sx + 0.04, sy + 0.03, 0.08, 'bg'); }

      // jam
      const cx = 0.33, cy = 2.62, r = 0.24;
      d.circle(cx, cy, r, 'bg'); d.circle(cx, cy, r, 'fg', false, 2);
      for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; d.line(cx + 0.85 * r * Math.sin(a), cy + 0.85 * r * Math.cos(a), cx + r * Math.sin(a), cy + r * Math.cos(a), 'muted', 1); }
      const ah = (hr % 12) / 12 * 2 * Math.PI, am = (hr % 1) * 2 * Math.PI;
      d.line(cx, cy, cx + 0.55 * r * Math.sin(ah), cy + 0.55 * r * Math.cos(ah), 'fg', 3);
      d.line(cx, cy, cx + 0.85 * r * Math.sin(am), cy + 0.85 * r * Math.cos(am), 'fg', 1.5);
      d.text(0.66, 2.72, clock(s.h), 'fg', 'md', 'left');
      d.text(0.66, 2.52, `hari ke-${Math.floor(s.h / 24) + 1} · 1 s = 1 jam`, 'muted', 'sm', 'left');

      // angka
      d.text(3.95, 2.86, `T = ${fmt(T, 1)} °C`, 'fg', 'sm', 'right');
      d.text(3.95, 2.68, `celah g = ${fmt(j.g, 1)} mm`, 'body', 'sm', 'right');
      d.text(3.95, 2.5, `σ = ${fmt(j.sigma, 1)} MPa`, j.sigma > 0 ? 'vector' : 'muted', 'sm', 'right');
      d.text(3.95, 2.32, `T_tutup = ${fmt(tClose(p), 1)} °C`, 'muted', 'sm', 'right');

      // struktur (segmen tidak berskala)
      const yb = kind === 1 ? 1.27 : 1.5, th = kind === 1 ? 0.1 : 0.14;
      const bumpY = (x, x0, x1) => bump * Math.pow(Math.sin(Math.PI * (x - x0) / (x1 - x0)), 2);
      const segment = (x0, x1) => {
        const top = [], bot = [];
        for (let i = 0; i <= 30; i++) { const x = x0 + (x1 - x0) * i / 30, y = yb + bumpY(x, x0, x1); bot.push([x, y]); top.push([x, y + th]); }
        d.polygon(bot.concat(top.reverse()), col, 'fg', 1.5);
      };
      if (kind === 1) {
        d.polygon([[0.05, 1.02], [3.95, 1.02], [3.85, 1.2], [0.15, 1.2]], 'grid');                       // balas
        for (let x = 0.2; x < 3.9; x += 0.3) d.rect(x, 1.2, 0.14, 0.07, 'muted');                     // bantalan
      } else {
        d.line(0.05, 1.02, 3.95, 1.02, 'fg', 2);
        [0.45, 1.75, 2.25, 3.55].forEach(x => d.rect(x - 0.07, 1.02, 0.14, 0.48, 'grid', 'fg'));       // pilar
      }
      segment(0.1, CX - gv / 2);
      segment(CX + gv / 2, 3.9);
      d.text(0.15, yb + th + BUCKLE_MAX + 0.1, `L₀ = ${p.L0} m (tidak berskala)`, 'muted', 'sm', 'left');
      if (j.sigma > 0) d.text(2.9, yb + th + BUCKLE_MAX + 0.1, kind === 1 ? 'rel melengkung!' : 'dek melengkung!', 'vector', 'md');
      d.text(0.1, 2.22, kind === 1 ? 'rel kereta (baja)' : 'jembatan: dek di atas pilar', 'fg', 'sm', 'left');

      // inset: celah dalam mm nyata
      const B = INSET, mm = B.w / INSET_MM, c = B.x + B.w / 2, yc = B.y + B.h / 2;
      d.rect(B.x, B.y, B.w, B.h, 'bg', 'muted');
      d.text(c, B.y + B.h + 0.1, kind === 1 ? 'detail celah (tampak samping, mm nyata)' : 'sambungan jari (tampak atas, mm nyata)', 'muted', 'sm');
      if (kind === 1) {
        const xl = c - j.g * mm / 2, xr = c + j.g * mm / 2, h0 = yc - 0.12;
        d.rect(B.x, h0, xl - B.x, 0.24, col, 'fg');
        d.rect(xr, h0, B.x + B.w - xr, 0.24, col, 'fg');
        if (j.g <= 0) d.line(c, h0 - 0.04, c, h0 + 0.28, 'vector', 3);
      } else {
        const xa = c - (FINGER + j.g) / 2 * mm, xb = xa + (FINGER + j.g) * mm, n = 6, fh = (B.h - 0.12) / n;
        d.rect(B.x, B.y + 0.06, xa - B.x, B.h - 0.12, col, 'fg');
        d.rect(xb, B.y + 0.06, B.x + B.w - xb, B.h - 0.12, col, 'fg');
        for (let i = 0; i < n; i++) {
          const y = B.y + 0.06 + i * fh + fh * 0.12, hh = fh * 0.76;
          if (i % 2 === 0) d.rect(xa, y, FINGER * mm, hh, col, 'fg');
          else d.rect(xb - FINGER * mm, y, FINGER * mm, hh, col, 'fg');
        }
      }
      // penggaris mm dari muka ujung kiri
      const x0 = kind === 1 ? c - j.g * mm / 2 : c - (FINGER + j.g) / 2 * mm + FINGER * mm;
      for (let k = 0; k * 10 * mm <= B.x + B.w - x0 + 1e-9; k++) {
        const x = x0 + k * 10 * mm;
        d.line(x, B.y, x, B.y + (k % 2 ? 0.05 : 0.08), 'fg', 1);
        if (k % 2 === 0) d.text(x, B.y - 0.07, `${k * 10}`, 'muted', 'sm');
      }
      d.text(B.x + B.w + 0.04, B.y + 0.04, 'mm', 'muted', 'sm', 'left');

      // legenda warna
      const lx = 3.2, lw = 0.7, n = 14;
      for (let i = 0; i < n; i++) d.rect(lx + lw * i / n, 0.72, lw / n + 0.003, 0.06, d.heat(i / (n - 1)));
      d.text(lx + lw / 2, 0.62, `${T_MIN}–${T_MAX} °C`, 'muted', 'sm');
    }
  });
})();
