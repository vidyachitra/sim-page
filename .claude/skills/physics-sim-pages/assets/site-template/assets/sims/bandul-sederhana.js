/* Bandul sederhana (Modul 8: gerak harmonik sederhana)
 * Asumsi model:
 *  - Titik massa m = 1 kg pada batang kaku tak bermassa; poros tetap.
 *  - Dinamika sin(θ) penuh; tanpa pendekatan sudut kecil, jadi periode bertambah pada sudut besar.
 *  - Torsi redaman linear ∝ kecepatan sudut (b). b = 0 mengekalkan energi.
 * Integrator: Euler semi-implisit (simplektik), dt = 1/240 s.
 * Skala visual: panah kecepatan = 0,25 s × v.
 */
(function () {
  const M = 1;           // kg
  const V_SCALE = 0.25;  // s; arrow length per m/s

  const bob = (s, p) => [p.L * Math.sin(s.theta), -p.L * Math.cos(s.theta)];
  const alpha = (s, p) => -(p.g / p.L) * Math.sin(s.theta) - p.b * s.omega;   // rad/s²
  const energy = (s, p) => {
    const KE = 0.5 * M * p.L * p.L * s.omega * s.omega;
    const PE = M * p.g * p.L * (1 - Math.cos(s.theta));
    return { KE, PE, E: KE + PE };
  };

  SimCore.register({
    api: 1,
    id: 'bandul-sederhana',
    title: 'Bandul sederhana',
    aspect: 1,                                   // bandul dapat mencapai seluruh lingkaran
    view: { x: [-1.35, 1.35], y: [-1.35, 1.35] }, // memuat L = 1,2 m pada setiap sudut
    dt: 1 / 240,
    conserved: 'E',

    params: [
      { key: 'L', label: 'Panjang tali', symbol: 'L', unit: 'm', min: 0.2, max: 1.2, step: 0.05, value: 1 },
      { key: 'theta0', label: 'Sudut awal', symbol: 'θ₀', unit: '°', min: 0, max: 170, step: 5, value: 40, resets: true },
      { key: 'g', label: 'Percepatan gravitasi', symbol: 'g', unit: 'm/s²', min: 0, max: 25, step: 0.1, value: 9.8 },
      { key: 'b', label: 'Redaman', symbol: 'b', unit: '1/s', min: 0, max: 1, step: 0.05, value: 0 }
    ],

    graphs: [
      { title: 'Energi', unit: 'J', min: 0, series: [
        { key: 'KE', label: 'EK', color: 'ke', digits: 3 },
        { key: 'PE', label: 'EP', color: 'pe', digits: 3 },
        { key: 'E', label: 'E', color: 'total', digits: 3 }
      ] },
      { title: 'Sudut', unit: '°', series: [{ key: 'thetaDeg', label: 'θ', color: 'body', digits: 1 }] },
      { title: 'Kecepatan sudut', unit: 'rad/s', series: [{ key: 'omega', label: 'ω', color: 'vector2' }] },
      { title: 'Percepatan sudut', unit: 'rad/s²', series: [{ key: 'alpha', label: 'α', color: 'vector' }] }
    ],

    init(p) {
      const s = { theta: p.theta0 * Math.PI / 180, omega: 0, n: 0, trail: [] };
      return s;
    },

    step(s, p, dt) {
      s.omega += alpha(s, p) * dt;     // kecepatan dulu
      s.theta += s.omega * dt;         // lalu posisi
      if (++s.n % 4 === 0) {
        s.trail.push(bob(s, p));
        if (s.trail.length > 120) s.trail.shift();
      }
    },

    measure(s, p) {
      const e = energy(s, p);
      const deg = ((s.theta * 180 / Math.PI + 180) % 360 + 360) % 360 - 180;
      return { thetaDeg: deg, omega: s.omega, alpha: alpha(s, p), KE: e.KE, PE: e.PE, E: e.E };
    },

    positions(s, p) { return [bob(s, p)]; },

    draw(ctx, s, p, v, d) {
      const [bx, by] = bob(s, p);
      d.polyline(s.trail, 'trail', 2);
      d.line(-0.3, 0, 0.3, 0, 'fg', 3);                  // penyangga
      d.line(0, 0, bx, by, 'fg', 2);                     // batang
      d.dot(0, 0, 4, 'fg');                              // poros
      const vx = p.L * s.omega * Math.cos(s.theta), vy = p.L * s.omega * Math.sin(s.theta);
      d.arrow(bx, by, vx * V_SCALE, vy * V_SCALE, 'vector2', 'v');
      d.dot(bx, by, 12, 'body');
      d.text(1.3, 1.25, `T₀ = 2π√(L/g) = ${(2 * Math.PI * Math.sqrt(p.L / p.g)).toFixed(2)} s`, 'fg', 'sm', 'right');
    },

    drag: {
      hit(s, p, x, y, r) { const [bx, by] = bob(s, p); return Math.hypot(x - bx, y - by) < r; },
      move(s, p, x, y) {
        s.theta = Math.atan2(x, -y);
        s.omega = 0;
        s.trail.length = 0;
      }
    }
  });
})();
