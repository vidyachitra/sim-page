/* Bimetal dan termostat (Kalor › Pemuaian)
 * Asumsi model:
 *  - Keping bimetal L = 0,1 m dijepit di satu ujung, dua lapisan sama tebal (h/2) dan sama modulus
 *    elastis (Timoshenko): kelengkungan κ = 3(α₁ − α₂)ΔT/(2h), ΔT = T − 25 °C (lurus pada suhu kamar).
 *    Keping melengkung menjadi busur lingkaran; defleksi ujung y = (1 − cos κL)/κ.
 *    Lapisan ber-α lebih besar berada di sisi luar lengkungan (α₁ > α₂: ujung turun, menjauhi kontak).
 *  - Kontak berpegas di atas ujung ikut turun sampai penahan pada kedalaman "celah"; lebih dari itu
 *    ujung lepas dan pemanas mati. Kontak jentik (magnet kecil) memberi histeresis: terbuka saat
 *    y ≥ celah + 0,5 mm, tertutup lagi saat y ≤ celah.
 *  - Kalor satu simpul: C dT/dt = P·(kontak tertutup) − G(T − 25 °C), C = 2,5 J/K (keping ±7 g
 *    beserta elemen pemanas), G = 0,25 W/K (udara dan penjepit). Suhu tertinggi = P/G + 25 °C.
 *  - Suhu keping dianggap merata; tanpa waktu tunda antara pemanas dan keping.
 * Integrator: pembaruan eksponensial eksak untuk T (status kontak tetap selama satu langkah);
 * y dihitung langsung dari T.
 * Skala visual (bukan besaran fisis): panjang dan defleksi keping digambar dalam skala nyata; tebal
 * tiap lapisan digambar LAYER_VIS = 2,2 mm (tidak berskala). Warna: d.heat untuk T_MIN = 25 °C …
 * T_MAX = 200 °C.
 */
(function () {
  const L = 0.1;             // m, panjang keping
  const T_AMB = 25;          // °C, suhu kamar (keping lurus)
  const C = 2.5;             // J/K, kapasitas kalor keping + pemanas
  const G = 0.25;            // W/K, konduktansi kalor ke lingkungan
  const HYS = 0.5e-3;        // m, histeresis kontak jentik
  const LAYER_VIS = 0.0022;  // m, tebal gambar tiap lapisan (tidak berskala)
  const T_MIN = 25, T_MAX = 200;  // °C, rentang skala warna
  const POST_X = 0.128;      // m, tiang kontak

  const kappa = (p, T) => 3 * (p.a1 - p.a2) * 1e-6 * (T - T_AMB) / (2 * p.h * 1e-3);   // 1/m
  // Defleksi ujung (positif = turun, menjauhi kontak) untuk kelengkungan k.
  const defl = k => Math.abs(k * L) < 1e-6 ? k * L * L / 2 : (1 - Math.cos(k * L)) / k;
  // Suhu saat defleksi mencapai y (bisection pada κ ∈ [0, π/L)); null bila tak mungkin.
  function tempAt(p, y) {
    const per = 3 * (p.a1 - p.a2) * 1e-6 / (2 * p.h * 1e-3);                            // κ per K
    if (!(per > 0)) return null;
    let lo = 0, hi = Math.PI / L;
    if (defl(hi) < y) return null;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (defl(mid) < y) lo = mid; else hi = mid; }
    return T_AMB + lo / per;
  }
  // Titik garis tengah keping pada panjang busur u (y ke atas positif di dunia).
  function arc(k, u, off = 0) {
    if (Math.abs(k) < 1e-9) return [u, off];
    const a = k * u;                                    // sudut arah garis singgung, turun untuk k > 0
    const x = Math.sin(a) / k, y = -(1 - Math.cos(a)) / k;
    return [x - Math.sin(a) * off, y + Math.cos(a) * off];   // geser sepanjang normal (ke atas)
  }
  const fmt = (x, n) => x.toFixed(n).replace('-', '−').replace('.', ',');
  const heatF = T => (T - T_MIN) / (T_MAX - T_MIN);

  SimCore.register({
    api: 1,
    id: 'bimetal',
    title: 'Bimetal dan termostat',
    aspect: 4 / 3,
    view: { x: [-0.025, 0.14], y: [-0.05, 0.07375] },
    dt: 1 / 120,

    params: [
      { key: 'a1', label: 'Koefisien muai lapisan atas', symbol: 'α₁', unit: '×10⁻⁶ /K', min: 5, max: 25, step: 1, value: 19 },
      { key: 'a2', label: 'Koefisien muai lapisan bawah', symbol: 'α₂', unit: '×10⁻⁶ /K', min: 5, max: 25, step: 1, value: 12 },
      { key: 'h', label: 'Tebal total', symbol: 'h', unit: 'mm', min: 0.5, max: 3, step: 0.1, value: 1 },
      { key: 'gap', label: 'Celah kontak', symbol: 'y_c', unit: 'mm', min: 1, max: 15, step: 0.5, value: 3 },
      { key: 'P', label: 'Daya pemanas', symbol: 'P', unit: 'W', min: 0, max: 40, step: 1, value: 20 }
    ],

    graphs: [
      { title: 'Suhu', unit: '°C', window: 30, series: [{ key: 'T', label: 'T', color: 'hot', digits: 1 }] },
      { title: 'Defleksi ujung', unit: 'mm', window: 30, series: [
        { key: 'y', label: 'y', color: 'body', digits: 2 },
        { key: 'gap', label: 'celah', color: 'muted', digits: 1 }
      ] }
    ],

    init(p) { return { T: T_AMB, closed: true, t: 0 }; },

    step(s, p, dt) {
      const Tinf = T_AMB + (s.closed ? p.P : 0) / G;
      s.T = Tinf + (s.T - Tinf) * Math.exp(-dt * G / C);
      const y = defl(kappa(p, s.T)), g = p.gap * 1e-3;
      if (s.closed && y >= g + HYS) s.closed = false;
      else if (!s.closed && y <= g) s.closed = true;
      s.t += dt;
    },

    measure(s, p) {
      return { T: s.T, y: defl(kappa(p, s.T)) * 1e3, gap: p.gap };
    },

    positions(s, p) { return [arc(kappa(p, s.T), L), [-0.012, 0.012], [POST_X, -0.04]]; },

    draw(ctx, s, p, v, d) {
      const k = kappa(p, s.T), y = defl(k), g = p.gap * 1e-3, n = 40;
      const on = s.closed && p.P > 0;

      // pemanas dan kalor
      const zig = [];
      for (let i = 0; i <= 16; i++) zig.push([0.01 + 0.08 * i / 16, -0.032 + (i % 2 ? 0.003 : -0.003) * (i > 0 && i < 16)]);
      d.polyline(zig, on ? 'hot' : 'muted', on ? 3 : 2);
      if (on) [0.025, 0.05, 0.075].forEach(x => d.arrow(x, -0.027, 0, 0.006, 'hot'));
      d.text(0.05, -0.039, on ? `pemanas NYALA · P = ${p.P} W` : (s.closed ? 'pemanas MATI · P = 0 W' : 'pemanas MATI (kontak terbuka)'),
        on ? 'hot' : 'muted', 'sm');

      // keping: dua lapisan sebagai busur
      const band = (o0, o1, color) => {
        const pts = [];
        for (let i = 0; i <= n; i++) pts.push(arc(k, L * i / n, o1));
        for (let i = n; i >= 0; i--) pts.push(arc(k, L * i / n, o0));
        d.polygon(pts, color, 'fg', 1);
      };
      band(0, LAYER_VIS, 'body');
      band(-LAYER_VIS, 0, 'body2');
      d.text(0.004, 0.0065, `α₁ = ${p.a1}×10⁻⁶ /K`, 'body', 'sm', 'left');
      d.text(0.004, -0.0068, `α₂ = ${p.a2}×10⁻⁶ /K`, 'body2', 'sm', 'left');
      d.rect(-0.012, -0.012, 0.012, 0.024, 'grid', 'fg');                               // penjepit

      // kontak berpegas + penahan
      const tip = arc(k, L, LAYER_VIS), yl = s.closed ? tip[1] : LAYER_VIS - g;
      const xl = s.closed ? tip[0] : Math.min(tip[0], L);
      d.line(POST_X, -0.045, POST_X, 0.016, 'fg', 3);
      d.polyline([[POST_X, 0.014], [0.119, yl + 0.0015], [xl, yl + 0.0015]], 'fg', 2);
      d.dot(xl + 0.001, yl + 0.0012, 4, s.closed ? 'current' : 'muted');
      d.polygon([[0.11, LAYER_VIS - g + 0.0006], [0.1075, LAYER_VIS - g - 0.004], [0.1125, LAYER_VIS - g - 0.004]], 'grid', 'fg', 1);
      d.line(0.11, LAYER_VIS - g - 0.004, 0.11, -0.042, 'muted', 2);
      d.line(tip[0] + 0.002, LAYER_VIS, 0.12, LAYER_VIS, 'grid', 1);                  // posisi lurus
      d.text(0.138, -0.047, `celah y_c = ${fmt(p.gap, 1)} mm`, 'muted', 'sm', 'right');

      // angka dan status
      const Tc = tempAt(p, g), To = tempAt(p, g + HYS), Tmax = T_AMB + p.P / G;
      d.text(-0.022, 0.068, `T = ${fmt(s.T, 1)} °C · y = ${fmt(y * 1e3, 2)} mm`, 'fg', 'sm', 'left');
      let msg;
      if (Tc === null) msg = p.a1 === p.a2 ? 'α₁ = α₂: keping tetap lurus, kontak tak pernah membuka'
        : 'α₁ < α₂: ujung naik, kontak tak pernah membuka';
      else if (To > Tmax) msg = `T_buka = ${fmt(To, 0)} °C > T_maks = P/G + 25 = ${fmt(Tmax, 0)} °C`;
      else msg = `kontak menutup ${fmt(Tc, 0)} °C · membuka ${fmt(To, 0)} °C`;
      d.text(-0.022, 0.058, msg, 'muted', 'sm', 'left');
      d.text(-0.022, 0.048, 'panjang dan defleksi skala nyata; tebal tidak', 'muted', 'sm', 'left');

      // termometer warna
      const lx = -0.02, lw = 0.05, ly = 0.036, nn = 20;
      for (let i = 0; i < nn; i++) d.rect(lx + lw * i / nn, ly, lw / nn + 0.0002, 0.003, d.heat(i / (nn - 1)));
      const mx = lx + lw * Math.max(0, Math.min(1, heatF(s.T)));
      d.polygon([[mx, ly], [mx - 0.0015, ly - 0.003], [mx + 0.0015, ly - 0.003]], 'fg');
      d.text(lx + lw + 0.002, ly + 0.0015, `${T_MIN}–${T_MAX} °C`, 'muted', 'sm', 'left');
    }
  });
})();
