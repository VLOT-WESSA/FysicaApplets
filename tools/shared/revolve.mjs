// Halve omwentelingslichamen in doorsnede. Een lichaam is een gesloten profiel [[a, R], ...] in het
// meridiaanvlak (a langs de as, R vanaf de as). De helft vóór het snijvlak is weggehaald: we tekenen
// de schalen achter het vlak (psi van 0 = boven, via achter, tot pi = onder) en de snijvlakken.
// frame: { o: oorsprong, ax: eenheid langs de as, up: [0,0,1], back: eenheid van het vlak weg van de kijker }
export function halfBody(S, F, profile, { cls = "m", cut = "x", steps = 28, bias = 0, cutBias = 0, edges = true, closed = true, shells = true, cuts = true, crease = 0.82, smooth = false, psi0 = 0, psi1 = Math.PI } = {}) {
  const pt = (a, R, psi) => [
    F.o[0] + F.ax[0] * a + R * (Math.cos(psi) * F.up[0] + Math.sin(psi) * F.back[0]),
    F.o[1] + F.ax[1] * a + R * (Math.cos(psi) * F.up[1] + Math.sin(psi) * F.back[1]),
    F.o[2] + F.ax[2] * a + R * (Math.cos(psi) * F.up[2] + Math.sin(psi) * F.back[2]),
  ];
  const n = profile.length;
  // oriëntatie van het profiel (tegenwijzerzin in (a, R) → buitennormaal is (dR, -da))
  let area = 0;
  for (let i = 0; i < n; i++) { const [a0, r0] = profile[i], [a1, r1] = profile[(i + 1) % n]; area += a0 * r1 - a1 * r0; }
  const sgn = area > 0 ? 1 : -1;
  if (shells) for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [a0, r0] = profile[i], [a1, r1] = profile[(i + 1) % n];
    if (r0 < 1e-6 && r1 < 1e-6) continue;                       // rand op de as: geen oppervlak
    const len = Math.hypot(a1 - a0, r1 - r0) || 1;
    const na = sgn * (r1 - r0) / len, nr = -sgn * (a1 - a0) / len;
    const nv = Math.max(1, Math.round(len / 7));
    S.patch((u, v) => pt(a0 + (a1 - a0) * v, r0 + (r1 - r0) * v, psi0 + (psi1 - psi0) * u), steps, nv, {
      cls, bias, crease, edges, hideEdges: smooth ? { i0: true, i1: true, j0: true, j1: true } : { i0: true, i1: true },
      toward: (m) => {
        const rel = [m[0] - F.o[0], m[1] - F.o[1], m[2] - F.o[2]];
        const ra = rel[0] * F.ax[0] + rel[1] * F.ax[1] + rel[2] * F.ax[2];
        const radial = [rel[0] - F.ax[0] * ra, rel[1] - F.ax[1] * ra, rel[2] - F.ax[2] * ra];
        const rl = Math.hypot(...radial) || 1;
        return [F.ax[0] * na + radial[0] / rl * nr, F.ax[1] * na + radial[1] / rl * nr, F.ax[2] * na + radial[2] / rl * nr];
      },
    });
  }
  if (cuts) {
    for (const psi of [psi0, psi1]) {
      // normaal van het snijvlak: weg van het lichaam (de kant van de uitsnede)
      const tg = [0, 1, 2].map((i) => -Math.sin(psi) * F.up[i] + Math.cos(psi) * F.back[i]);
      const sg = psi === psi0 ? -1 : 1;
      const nCut = tg.map((x) => x * sg);
      const poly = profile.map(([a, R]) => pt(a, R, psi));
      const lines = poly.map((p, i) => [[p, poly[(i + 1) % poly.length]], "hi"]).filter(([[p, q]], i) => {
        const [a0, r0] = profile[i], [a1, r1] = profile[(i + 1) % n];
        return !(r0 < 1e-6 && r1 < 1e-6);
      });
      S.poly(poly, { cls: cut + "!", n: nCut, lines, bias: cutBias });
    }
  }
  return pt;
}
