/* Penguat transistor emitor bersama dengan bias basis (Elektronika Dasar)
 * Asumsi model:
 *  - NPN, V_cc = 12 V, R_C di kolektor, emitor ke tanah. Basis diberi bias V_BB seri R_B; sinyal v_in seri V_BB.
 *  - Model garis-patah: putus jika V_BB + v_in < 0,7 V (i_B = 0); aktif: i_B = (V_BB + v_in − 0,7)/R_B, i_C = β i_B;
 *    jenuh: i_C dibatasi (V_cc − 0,2)/R_C, V_CE = 0,2 V.
 *  - v_out = V_CE = V_cc − i_C R_C. Penguatan kecil-sinyal ≈ −β R_C / R_B.
 *  - Sisipan: garis beban i_C = (V_cc − V_CE)/R_C dengan titik kerja Q (tanpa sinyal) dan titik sesaat.
 *  - Masukan sinus 1 kHz. Diputar lambat 1000×. Grafik dalam V, mA, µA.
 */
(function () {
  const TS = 1e-3;
  const VCC = 12, VBE = 0.7, VSAT = 0.2;
  const F = 1e3, W = 2 * Math.PI * F;

  const solveAt = (vb, p) => {                          // vb = tegangan penggerak basis (V_BB + v_in)
    const RB = p.RB * 1e3, RC = p.RC * 1e3;
    const iB = Math.max(0, (vb - VBE) / RB);
    const iCsat = (VCC - VSAT) / RC;
    const iC = Math.min(p.beta * iB, iCsat);
    const mode = iB <= 0 ? 'putus' : (p.beta * iB >= iCsat ? 'jenuh' : 'aktif');
    return { iB, iC, vCE: VCC - iC * RC, mode, iCsat };
  };
  const vin = (t, p) => p.Vm * Math.sin(W * t);

  SimCore.register({
    api: 1,
    id: 'bjt-ce',
    title: 'Penguat transistor emitor bersama',
    aspect: 16 / 9,
    view: { x: [-0.6, 3.6], y: [-0.7, 1.55] },
    dt: 1 / 240 * TS,
    timeScale: TS,

    params: [
      { key: 'VBB', label: 'Tegangan bias basis', symbol: 'V_BB', unit: 'V', min: 0, max: 5, step: 0.1, value: 2.7 },
      { key: 'RB', label: 'Resistor basis', symbol: 'R_B', unit: 'kΩ', min: 10, max: 500, step: 10, value: 100 },
      { key: 'RC', label: 'Resistor kolektor', symbol: 'R_C', unit: 'kΩ', min: 0.1, max: 10, step: 0.1, value: 3 },
      { key: 'beta', label: 'Penguatan arus', symbol: 'β', unit: '', min: 20, max: 300, step: 10, value: 100 },
      { key: 'Vm', label: 'Amplitudo sinyal', symbol: 'V_m', unit: 'V', min: 0, max: 3, step: 0.05, value: 0.5 }
    ],

    graphs: [
      { title: 'Tegangan', unit: 'V', window: 4e-3, series: [
        { key: 'vi', label: 'v_in', color: 'muted' },
        { key: 'vo', label: 'v_out = V_CE', color: 'voltage' }
      ] },
      { title: 'Arus kolektor', unit: 'mA', min: 0, window: 4e-3, series: [{ key: 'iC', label: 'i_C', color: 'current', digits: 3 }] },
      { title: 'Arus basis', unit: 'µA', min: 0, window: 4e-3, series: [{ key: 'iB', label: 'i_B', color: 'body2', digits: 1 }] }
    ],

    init(p) { return { t: 0 }; },
    step(st, p, dt) { st.t += dt; },
    measure(st, p) {
      const vi = vin(st.t, p), s = solveAt(p.VBB + vi, p);
      return { vi, vo: s.vCE, iC: s.iC * 1e3, iB: s.iB * 1e6 };
    },
    positions() { return [[0, 0], [2.0, 1.3]]; },

    draw(ctx, st, p, v, d) {
      const vi = vin(st.t, p), s = solveAt(p.VBB + vi, p), q = solveAt(p.VBB, p);
      // Transistor NPN di (1.5, 0.5): basis kiri, kolektor atas, emitor bawah
      const bx = 1.5, by = 0.5;
      d.circle(bx, by, 0.2, 'bg'); d.circle(bx, by, 0.2, 'fg', false, 1.5);
      d.line(bx - 0.08, by - 0.14, bx - 0.08, by + 0.14, 'fg', 3);                 // batang basis
      d.line(bx - 0.08, by + 0.05, bx + 0.1, by + 0.19, 'fg', 2);                  // kolektor
      d.line(bx - 0.08, by - 0.05, bx + 0.1, by - 0.19, 'fg', 2);                  // emitor
      d.arrow(bx + 0.0, by - 0.11, 0.07, -0.06, 'fg');                              // panah emitor (NPN)
      // Basis: V_BB dan sumber sinyal seri, lalu R_B
      d.source(0, -0.3, 0, 0.2, 'v_in', true, -1);
      d.source(0, 0.2, 0, 0.7, `V_BB = ${p.VBB.toFixed(1)} V`, false, -1);
      d.ground(0, -0.3);
      d.wire([[0, 0.7], [0, by], [0.3, by]]);
      d.resistor(0.3, by, bx - 0.08, by, `R_B = ${p.RB} kΩ`, 1);
      // Kolektor: R_C ke V_cc
      d.wire([[bx + 0.1, by + 0.19], [bx + 0.1, 0.9]]);
      d.resistor(bx + 0.1, 0.9, bx + 0.1, 1.4, `R_C = ${p.RC.toFixed(1)} kΩ`, 1);
      d.text(bx + 0.1, 1.5, `V_cc = ${VCC} V`, 'muted', 'sm');
      d.node(bx + 0.1, 0.85); d.wire([[bx + 0.1, 0.85], [2.1, 0.85]]); d.node(2.1, 0.85);
      d.text(2.15, 0.97, `v_out = ${s.vCE.toFixed(2)} V`, 'voltage', 'sm', 'left');
      // Emitor ke tanah
      d.wire([[bx + 0.1, by - 0.19], [bx + 0.1, 0]]); d.ground(bx + 0.1, 0);
      d.text(1.0, -0.42, `Q: i_B = ${(q.iB * 1e6).toFixed(1)} µA · i_C = ${(q.iC * 1e3).toFixed(2)} mA · V_CE = ${q.vCE.toFixed(2)} V`, 'fg', 'sm');
      d.text(1.0, -0.58, `A_v ≈ −β R_C/R_B = ${(-p.beta * p.RC / p.RB).toFixed(1)} · sekarang: ${s.mode}`, s.mode === 'aktif' ? 'muted' : 'vector', 'sm');

      // Sisipan garis beban: sumbu V_CE 0…V_cc, i_C 0…V_cc/R_C
      const ox = 2.55, oy = -0.3, Wd = 0.95, Hd = 0.95, icMax = VCC / (p.RC * 1e3);
      const X = vce => ox + Wd * vce / VCC, Y = ic => oy + Hd * ic / icMax;
      d.line(ox, oy, ox + Wd, oy, 'muted', 1); d.line(ox, oy, ox, oy + Hd, 'muted', 1);
      d.line(X(VCC), Y(0), X(0), Y(icMax), 'fg', 1.5);
      d.dot(X(q.vCE), Y(q.iC), 5, 'muted');
      d.text(X(q.vCE) + 0.05, Y(q.iC) + 0.08, 'Q', 'muted', 'sm', 'left');
      d.dot(X(s.vCE), Y(s.iC), 5, 'current');
      d.line(X(VSAT), oy, X(VSAT), oy + Hd, 'grid', 1);
      d.text(ox + Wd, oy - 0.1, `V_CE (0…${VCC} V)`, 'muted', 'sm', 'right');
      d.text(ox - 0.03, oy + Hd, `${(icMax * 1e3).toFixed(1)} mA`, 'muted', 'sm', 'right');
      d.text(ox + Wd / 2, oy + Hd + 0.1, 'garis beban', 'fg', 'sm');
    }
  });
})();
