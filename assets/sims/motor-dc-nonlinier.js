/* Motor DC nonlinier: respons torsi, kecepatan dan percepatan terhadap tegangan (Elektronika › Motor DC)
 * Asumsi model:
 *  - Rangkaian jangkar R–L seri didorong tegangan V; torsi elektromagnetik menjenuh terhadap arus:
 *    τ_em = Kt·I_sat·tanh(i / I_sat), jadi Kt tetap untuk i kecil dan τ_em membatas untuk i besar
 *    (fluks medan menjenuh). GGL-balik tetap linear, e = Ke·ω (Ke = Kt, satuan SI).
 *  - Torsi lawan = gesekan viskos linear + (gesekan Coulomb tetap + torsi beban) dihaluskan dengan
 *    tanh(ω/ω_ref) agar selalu berlawanan arah putaran dan tetap terhingga saat ω = 0.
 *  - Rotor, sikat/komutator dan induktansi bocor diabaikan di luar model R–L jangkar di atas.
 * Integrator: RK4 untuk (i, ω), dt = 1/480 s (rangkaian didorong/teredam, bukan konservatif).
 * Skala visual: titik muatan = 0,05 m per (A·s); jarum rotor menandai sudut θ, bukan besaran fisis.
 */
(function () {
  const R = 2;        // Ω, resistansi jangkar
  const L = 0.02;      // H, induktansi jangkar
  const KT = 0.08;     // N·m/A, konstanta torsi (= Ke dalam SI) pada arus kecil
  const KE = 0.08;     // V·s/rad, konstanta GGL-balik
  const J = 0.0005;    // kg·m², momen inersia rotor
  const B = 0.0001;    // N·m·s/rad, gesekan viskos
  const TAU_C = 0.003; // N·m, gesekan Coulomb tetap
  const OMEGA_REF = 2; // rad/s, lebar penghalusan sign(ω)
  const TAU_L_MAX = 0.02; // N·m, untuk menskalakan indikator beban pada kanvas
  const Q_SCALE = 0.05;   // m per (A·s), kecepatan tampilan titik arus

  const tauEm = (i, p) => KT * p.isat * Math.tanh(i / p.isat);
  const tauResist = (omega, p) => B * omega + (TAU_C + p.tauL) * Math.tanh(omega / OMEGA_REF);
  const alpha = (s, p) => (tauEm(s.i, p) - tauResist(s.omega, p)) / J;

  SimCore.register({
    api: 1,
    id: 'motor-dc-nonlinier',
    title: 'Motor DC nonlinier',
    aspect: 4 / 3,
    view: { x: [-0.5, 2.9], y: [-1.0, 1.6] },
    dt: 1 / 480,

    params: [
      { key: 'V', label: 'Tegangan input', symbol: 'V', unit: 'V', min: 0, max: 24, step: 0.5, value: 12 },
      { key: 'tauL', label: 'Torsi beban', symbol: 'τ_L', unit: 'N·m', min: 0, max: TAU_L_MAX, step: 0.001, value: 0 },
      { key: 'isat', label: 'Arus saturasi', symbol: 'I_{sat}', unit: 'A', min: 0.5, max: 5, step: 0.1, value: 1.5 }
    ],

    graphs: [
      { title: 'Torsi', unit: 'N·m', series: [
        { key: 'tauEm', label: 'τ_em', color: 'body', digits: 4 },
        { key: 'tauR', label: 'τ_lawan', color: 'body2', digits: 4 }
      ] },
      { title: 'Kecepatan sudut', unit: 'rad/s', series: [{ key: 'omega', label: 'ω', color: 'vector2' }] },
      { title: 'Percepatan sudut', unit: 'rad/s²', series: [{ key: 'alpha', label: 'α', color: 'vector' }] },
      { title: 'Arus jangkar', unit: 'A', series: [{ key: 'i', label: 'i', color: 'current', digits: 3 }] }
    ],

    init(p) { return { i: 0, omega: 0, theta: 0, t: 0, q: 0 }; },

    step(s, p, dt) {
      const f = (t, y) => [
        (p.V - R * y[0] - KE * y[1]) / L,
        (tauEm(y[0], p) - tauResist(y[1], p)) / J
      ];
      const y = SimCore.rk4(f, s.t, [s.i, s.omega], dt);
      s.i = y[0]; s.omega = y[1]; s.t += dt;
      s.theta = (s.theta + s.omega * dt) % (2 * Math.PI);
      s.q += s.i * Q_SCALE * dt;
    },

    measure(s, p) {
      return {
        i: s.i,
        omega: s.omega,
        alpha: alpha(s, p),
        tauEm: tauEm(s.i, p),
        tauR: tauResist(s.omega, p),
        rpm: s.omega * 60 / (2 * Math.PI)
      };
    },

    positions(s, p) { return [[0, 1], [2.0, 0.5]]; },

    draw(ctx, s, p, v, d) {
      // rangkaian jangkar: sumber - R - L - motor
      d.source(0, 0, 0, 1, `V = ${p.V.toFixed(1)} V`, false, -1);
      d.resistor(0, 1, 0.7, 1, `R = ${R} Ω`, 1);
      d.inductor(0.7, 1, 1.3, 1, `L = ${L * 1e3} mH`, 1);
      d.wire([[1.3, 1], [1.55, 1], [2.0, 0.9]]);
      d.wire([[2.0, 0.1], [1.55, 0], [0, 0]]);
      d.ground(0.75, 0);
      d.flow([[0, 0], [0, 1], [0.7, 1], [1.3, 1], [1.55, 1], [2.0, 0.9]], s.q);
      d.flow([[2.0, 0.1], [1.55, 0], [0, 0]], s.q);

      // rotor
      const cx = 2.0, cy = 0.5, rM = 0.4;
      d.circle(cx, cy, rM, 'bg');
      d.circle(cx, cy, rM, 'fg', false, 2);
      d.line(cx - rM * 0.85 * Math.cos(s.theta), cy - rM * 0.85 * Math.sin(s.theta),
             cx + rM * 0.85 * Math.cos(s.theta), cy + rM * 0.85 * Math.sin(s.theta), 'vector2', 3);
      d.text(cx, cy - rM - 0.12, 'motor', 'muted', 'sm');

      // indikator beban: bantalan yang membesar dengan τ_L
      const frac = p.tauL / TAU_L_MAX, h = 0.12 + 0.35 * frac;
      d.rect(cx + rM + 0.02, cy - h / 2, 0.09, h, 'body2');
      d.text(cx + rM + 0.06, cy - h / 2 - 0.1, 'beban', 'muted', 'sm');

      d.text(1.0, -0.55, `i = ${s.i.toFixed(2)} A`, 'current', 'sm');
      d.text(1.0, -0.72, `ω = ${s.omega.toFixed(1)} rad/s (${(s.omega * 60 / (2 * Math.PI)).toFixed(0)} rpm)`, 'vector2', 'sm');
      d.text(1.0, -0.89, `τ_em = ${tauEm(s.i, p).toFixed(4)} N·m`, 'vector', 'sm');
    }
  });
})();
