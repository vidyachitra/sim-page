/* Kurva pemanasan dan kalor laten: es → air → uap (Kalor dan Termodinamika › Suhu dan Kalor)
 * Asumsi model:
 *  - Sampel air bermassa m mulai sebagai es pada T₀ ≤ 0 °C, dipanaskan daya tetap P, tanpa rugi kalor.
 *  - Tekanan 1 atm: es mencair pada 0 °C, air mendidih pada 100 °C; uap tetap di wadah tertutup.
 *  - c_es = 2100, c_air = 4186, c_uap = 2010 J/(kg·K); L_f = 3,34 × 10⁵, L_v = 2,256 × 10⁶ J/kg.
 *    Kalor jenis tetap dalam tiap wujud; kapasitas kalor wadah diabaikan.
 *  - Model entalpi: H += P·dt (eksak). T dan fraksi es/cair/uap adalah fungsi tertutup sepotong-sepotong
 *    dari H. Pemanas mati saat uap mencapai T_OFF = 150 °C; setelah itu H tetap.
 *  - Waktu nyata (tanpa percepatan): massa kecil (gram) agar seluruh kurva selesai dalam ~1 menit.
 * Partikel (gambaran, bukan dinamika molekul): N = 48. Partikel i berwujud menurut fraksi (urutan
 * indeks: yang mencair pertama juga menguap pertama; urutan leleh dari permukaan balok ke dalam).
 * Es bergetar di titik kisi dengan amplitudo ∝ suhu, cair berkeliaran di bagian bawah, uap terbang di
 * seluruh wadah. Arah acak dari PRNG mulberry32 berbenih di state, jadi Ulang dapat diulang persis.
 * Skala visual: A_VIB, V_LIQ, V_GAS (satuan tata letak per s) di bawah; warna d.heat untuk
 * T_MIN = −40 °C … T_MAX = 150 °C; warna pemanas d.heat(P / P_MAX).
 */
(function () {
  const C_ICE = 2100, C_WAT = 4186, C_STM = 2010;   // J/(kg·K)
  const L_F = 3.34e5, L_V = 2.256e6;                // J/kg
  const T_OFF = 150;                                // °C, pemanas mati
  const T_MIN = -40, T_MAX = 150;                   // °C, rentang warna suhu
  const P_MAX = 2000;                               // W

  const N = 48, COLS = 8, ROWS = 6, SP = 0.13;      // kisi es
  const XL = 0.15, XR = 2.05, YB = 0.35, YT = 1.85; // dinding dalam wadah
  const LIQ_TOP = 0.85;                             // batas atas daerah cair
  const R = 0.03;                                   // jari-jari partikel untuk pantulan
  const A_VIB = 0.03;       // amplitudo getar es pada 0 °C
  const F_VIB = 3;          // Hz, frekuensi getar tampilan
  const V_LIQ = 0.3;        // kelajuan tampilan cair
  const V_GAS = 1.6;        // kelajuan tampilan uap pada 100 °C (∝ √T_K)
  const SINK = 0.5;         // laju turun partikel yang baru mencair di atas daerah cair

  function mulberry32(s) {                           // mengembalikan [bilangan 0…1, benih baru]
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
  }

  // Batas entalpi (J) untuk massa m (g) dan T₀ (°C).
  function bounds(p) {
    const m = p.m / 1000;
    const h1 = m * C_ICE * (0 - p.T0);
    const h2 = h1 + m * L_F;
    const h3 = h2 + m * C_WAT * 100;
    const h4 = h3 + m * L_V;
    const h5 = h4 + m * C_STM * (T_OFF - 100);
    return { m, h1, h2, h3, h4, h5 };
  }
  // Suhu dan fraksi wujud dari H — tertutup.
  function phase(H, p) {
    const b = bounds(p), m = b.m;
    if (H < b.h1) return { T: p.T0 + H / (m * C_ICE), es: 1, cair: 0, uap: 0, k: 0 };
    if (H < b.h2) { const f = (H - b.h1) / (m * L_F); return { T: 0, es: 1 - f, cair: f, uap: 0, k: 1 }; }
    if (H < b.h3) return { T: (H - b.h2) / (m * C_WAT), es: 0, cair: 1, uap: 0, k: 2 };
    if (H < b.h4) { const f = (H - b.h3) / (m * L_V); return { T: 100, es: 0, cair: 1 - f, uap: f, k: 3 }; }
    return { T: Math.min(T_OFF, 100 + (H - b.h4) / (m * C_STM)), es: 0, cair: 0, uap: 1, k: 4 };
  }
  const NAMES = ['es', 'es + air (mencair)', 'air', 'air + uap (mendidih)', 'uap'];
  const latent = (ph, p) => p.m / 1000 * (L_F * (1 - ph.es) + L_V * ph.uap);   // J

  // Titik kisi dan urutan leleh: dari permukaan (atas dan sisi) ke dalam, seri diacak ringan.
  function lattice(seed) {
    const x0 = (XL + XR) / 2 - (COLS - 1) * SP / 2, y0 = YB + 0.08;
    const sites = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      let u; [u, seed] = mulberry32(seed);
      const depth = Math.min(ROWS - 1 - r, c, COLS - 1 - c);
      sites.push({ x: x0 + c * SP, y: y0 + r * SP, r, c, key: depth + 0.9 * u });
    }
    sites.sort((a, b) => a.key - b.key);
    return { sites, seed };
  }

  SimCore.register({
    api: 1,
    id: 'kurva-pemanasan',
    title: 'Kurva pemanasan es menjadi uap',
    aspect: 4 / 3,
    view: { x: [0, 3.3], y: [0, 2.475] },
    dt: 1 / 240,

    params: [
      { key: 'm', label: 'Massa', symbol: 'm', unit: 'g', min: 10, max: 100, step: 5, value: 20, resets: true },
      { key: 'P', label: 'Daya pemanas', symbol: 'P', unit: 'W', min: 100, max: 2000, step: 50, value: 1000 },
      { key: 'T0', label: 'Suhu awal es', symbol: 'T₀', unit: '°C', min: -40, max: 0, step: 1, value: -20, resets: true }
    ],

    graphs: [
      { title: 'Suhu', unit: '°C', min: -50, max: 150, window: 90, series: [{ key: 'T', label: 'T', color: 'hot', digits: 1 }] },
      { title: 'Kalor masuk', unit: 'kJ', min: 0, window: 90, series: [
        { key: 'Q', label: 'Q', color: 'total', digits: 2 },
        { key: 'QL', label: 'Q_laten', color: 'muted', digits: 2 }
      ] },
      { title: 'Fraksi wujud', unit: '%', min: 0, max: 100, window: 90, series: [
        { key: 'es', label: 'es', color: 'pe', digits: 0 },
        { key: 'cair', label: 'cair', color: 'body', digits: 0 },
        { key: 'uap', label: 'uap', color: 'vector', digits: 0 }
      ] }
    ],

    init(p) {
      const L = lattice(20240917);
      const parts = L.sites.map((st, i) => ({ sx: st.x, sy: st.y, x: st.x, y: st.y, vx: 0, vy: 0, ph: 2 * Math.PI * ((i * 0.618) % 1) }));
      return { H: 0, t: 0, seed: L.seed, parts };
    },

    step(s, p, dt) {
      const b = bounds(p);
      s.H = Math.min(s.H + p.P * dt, b.h5);
      s.t += dt;
      const ph = phase(s.H, p);
      const amp = A_VIB * Math.max(0.2, (Math.min(ph.T, 0) - T_MIN) / (0 - T_MIN));
      const vLiq = V_LIQ * (0.6 + 0.4 * Math.min(1, Math.max(0, ph.T) / 100));
      const vGas = V_GAS * Math.sqrt((ph.T + 273.15) / 373.15);
      const relax = 1 - Math.exp(-dt / 0.05);
      const rnd = () => { let u; [u, s.seed] = mulberry32(s.seed); return u; };

      s.parts.forEach((q, i) => {
        const u = (i + 0.5) / N;
        const kind = u < ph.uap ? 2 : u < ph.uap + ph.cair ? 1 : 0;
        if (kind === 0) {                              // es: getar di titik kisi
          const w = 2 * Math.PI * F_VIB * s.t + q.ph;
          const tx = q.sx + amp * Math.sin(w), ty = q.sy + amp * Math.cos(1.3 * w + 1);
          q.x += (tx - q.x) * relax; q.y += (ty - q.y) * relax; q.vx = 0; q.vy = 0;
          return;
        }
        let sp = Math.hypot(q.vx, q.vy);
        if (sp < 1e-6) { const a = 2 * Math.PI * rnd(); q.vx = Math.cos(a) * 1e-3; q.vy = Math.sin(a) * 1e-3; sp = 1e-3; }
        const target = kind === 1 ? vLiq : vGas;
        const k = 1 + (target / sp - 1) * Math.min(1, dt / 0.3);          // kelajuan menuju target
        let vx = q.vx * k, vy = q.vy * k;
        if (kind === 1) {                              // cair: arah berkelana acak
          const a = (rnd() - 0.5) * 0.5, c = Math.cos(a), sn = Math.sin(a);
          [vx, vy] = [vx * c - vy * sn, vx * sn + vy * c];
        }
        q.x += vx * dt; q.y += vy * dt;
        const top = kind === 1 ? LIQ_TOP : YT - R;
        if (q.x < XL + R) { q.x = XL + R; vx = Math.abs(vx); }
        if (q.x > XR - R) { q.x = XR - R; vx = -Math.abs(vx); }
        if (q.y < YB + R) { q.y = YB + R; vy = Math.abs(vy); }
        if (q.y > YT - R) { q.y = YT - R; vy = -Math.abs(vy); }
        if (q.y > top) { q.y -= SINK * dt; vy = -Math.abs(vy); }       // cair turun ke bawah
        q.vx = vx; q.vy = vy;
      });
    },

    measure(s, p) {
      const ph = phase(s.H, p);
      return { T: ph.T, Q: s.H / 1000, QL: latent(ph, p) / 1000, es: 100 * ph.es, cair: 100 * ph.cair, uap: 100 * ph.uap };
    },

    positions(s, p) { return s.parts.map(q => [q.x, q.y]).concat([[XL, YB], [XR, YT]]); },

    draw(ctx, s, p, v, d) {
      const b = bounds(p), ph = phase(s.H, p), on = s.H < b.h5;
      const fmt = (x, n) => x.toFixed(n).replace('.', ',').replace('-', '−');
      const col = d.heat((ph.T - T_MIN) / (T_MAX - T_MIN));

      // pemanas dan wadah tertutup
      d.rect(XL - 0.05, 0.14, XR - XL + 0.1, 0.12, on ? d.heat(p.P / P_MAX) : 'grid', 'fg');
      d.rect(XL - 0.03, YB - 0.03, XR - XL + 0.06, YT - YB + 0.06, 'bg', 'fg');

      // ikatan antar partikel es bertetangga di kisi
      const iceIdx = s.parts.map((q, i) => (i + 0.5) / N >= ph.uap + ph.cair);
      for (let i = 0; i < N; i++) {
        if (!iceIdx[i]) continue;
        const a = s.parts[i];
        for (let j = i + 1; j < N; j++) {
          if (!iceIdx[j]) continue;
          const c = s.parts[j];
          if (Math.abs(Math.hypot(a.sx - c.sx, a.sy - c.sy) - SP) < 1e-6) d.line(a.x, a.y, c.x, c.y, 'muted', 1.5);
        }
      }
      s.parts.forEach(q => d.dot(q.x, q.y, 5, col));
      s.parts.forEach(q => d.circle(q.x, q.y, 5 / v.scale, 'fg', false, 0.75));

      // pesan dataran
      if (ph.k === 1 || ph.k === 3) d.text((XL + XR) / 2, 2.2, 'kalor masuk memutus ikatan, suhu tetap', 'fg', 'sm');
      else d.text((XL + XR) / 2, 2.2, on ? 'kalor masuk menaikkan suhu' : 'pemanas mati pada 150 °C', 'muted', 'sm');

      // label kanan
      const lx = 2.2;
      d.text(lx, 1.8, `T = ${fmt(ph.T, 1)} °C`, 'hot', 'md', 'left');
      d.text(lx, 1.58, NAMES[ph.k], 'fg', 'sm', 'left');
      d.text(lx, 1.3, `Q = ${fmt(s.H / 1000, 2)} kJ`, 'total', 'sm', 'left');
      d.text(lx, 1.1, `Q_laten = ${fmt(latent(ph, p) / 1000, 2)} kJ`, 'muted', 'sm', 'left');
      d.text(lx, 0.82, `m = ${p.m} g`, 'muted', 'sm', 'left');
      d.text(lx, 0.62, on ? `P = ${p.P} W` : 'pemanas mati', 'muted', 'sm', 'left');

      // legenda warna suhu
      for (let k = 0; k < 10; k++) d.rect(lx + k * 0.08, 0.3, 0.08, 0.08, d.heat((k + 0.5) / 10));
      d.text(lx, 0.2, `${fmt(T_MIN, 0)} °C`, 'muted', 'sm', 'left');
      d.text(lx + 0.8, 0.2, `${T_MAX} °C`, 'muted', 'sm', 'right');
      d.text(lx, 0.46, 'warna suhu', 'muted', 'sm', 'left');
    }
  });
})();
