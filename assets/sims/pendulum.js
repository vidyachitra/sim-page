/* Simple pendulum
 * Model assumptions:
 *  - Point mass m = 1 kg on a massless rigid rod; fixed pivot.
 *  - Full sin(θ) dynamics; no small-angle approximation.
 *  - Linear damping torque ∝ angular velocity (b). b = 0 conserves energy.
 * Integrator: semi-implicit (symplectic) Euler, dt = 1/240 s.
 * Visual scale: velocity arrow = 0.25 s × v (constant).
 */
(function () {
  const M = 1;           // kg
  const V_SCALE = 0.25;  // s; arrow length per m/s

  const bob = (s, p) => [p.L * Math.sin(s.theta), -p.L * Math.cos(s.theta)];
  const energy = (s, p) => {
    const KE = 0.5 * M * p.L * p.L * s.omega * s.omega;
    const PE = M * p.g * p.L * (1 - Math.cos(s.theta));
    return { KE, PE, E: KE + PE };
  };

  SimCore.register({
    api: 1,
    id: 'pendulum',
    title: 'Simple pendulum',
    aspect: 4 / 3,
    view: { x: [-2.2, 2.2], y: [-1.7, 1.6] },
    dt: 1 / 240,
    conserved: 'E',

    params: [
      { key: 'L', label: 'Length', symbol: 'L', unit: 'm', min: 0.2, max: 1.5, step: 0.05, value: 1 },
      { key: 'theta0', label: 'Start angle', symbol: 'θ₀', unit: '°', min: 5, max: 170, step: 5, value: 40, resets: true },
      { key: 'g', label: 'Gravity', symbol: 'g', unit: 'm/s²', min: 1, max: 25, step: 0.1, value: 9.8 },
      { key: 'b', label: 'Damping', symbol: 'b', unit: '1/s', min: 0, max: 1, step: 0.05, value: 0 }
    ],

    readouts: [
      { key: 'thetaDeg', label: 'θ', unit: '°', digits: 1 },
      { key: 'KE', label: 'KE', unit: 'J', digits: 3, color: 'ke' },
      { key: 'PE', label: 'PE', unit: 'J', digits: 3, color: 'pe' },
      { key: 'E', label: 'E', unit: 'J', digits: 3, color: 'total' }
    ],

    init(p) {
      const s = { theta: p.theta0 * Math.PI / 180, omega: 0, n: 0, trail: [] };
      s.E0 = energy(s, p).E;
      return s;
    },

    step(s, p, dt) {
      s.omega += (-(p.g / p.L) * Math.sin(s.theta) - p.b * s.omega) * dt;  // velocity first
      s.theta += s.omega * dt;                                             // then position
      if (++s.n % 4 === 0) {
        s.trail.push(bob(s, p));
        if (s.trail.length > 120) s.trail.shift();
      }
    },

    measure(s, p) {
      const e = energy(s, p);
      const deg = ((s.theta * 180 / Math.PI + 180) % 360 + 360) % 360 - 180;
      return { thetaDeg: deg, KE: e.KE, PE: e.PE, E: e.E };
    },

    positions(s, p) { return [bob(s, p)]; },

    draw(ctx, s, p, v, d) {
      const [bx, by] = bob(s, p);
      const e = energy(s, p);
      d.polyline(s.trail, 'trail', 2);
      d.line(-0.3, 0, 0.3, 0, 'fg', 3);                  // support
      d.line(0, 0, bx, by, 'fg', 2);                     // rod
      d.dot(0, 0, 4, 'fg');                              // pivot
      const vx = p.L * s.omega * Math.cos(s.theta), vy = p.L * s.omega * Math.sin(s.theta);
      d.arrow(bx, by, vx * V_SCALE, vy * V_SCALE, 'vector2', 'v');
      d.dot(bx, by, 12, 'body');
      d.energyBars([
        { value: e.KE, color: 'ke', label: 'KE' },
        { value: e.PE, color: 'pe', label: 'PE' },
        { value: e.E, color: 'total', label: 'E' }
      ], s.E0);
    },

    drag: {
      hit(s, p, x, y, r) { const [bx, by] = bob(s, p); return Math.hypot(x - bx, y - by) < r; },
      move(s, p, x, y) {
        s.theta = Math.atan2(x, -y);
        s.omega = 0;
        s.trail.length = 0;
        s.E0 = energy(s, p).E;
      }
    }
  });
})();
