// Draaiende delen van motor en generator: spoel, as, naven en commutator of sleepringen.
// Elke stand wordt opnieuw getekend met de schilder (PA), zodat belichting en dekking kloppen.
// Hoek th: de spoelzijde 1 staat op (cos th, sin th) in het vlak loodrecht op de as; th = 0 is horizontaal.
const rotorPoint = (D, th, r, t, y) => [r * Math.cos(th) - t * Math.sin(th), y, D.AXZ + r * Math.sin(th) + t * Math.cos(th)];

function rotorSvg(P, D, th, { mode = "comm", only = "rotor" } = {}) {
  const A = PA.painter(P);
  const c = Math.cos(th), s = Math.sin(th), Z = D.AXZ, TAU = Math.PI * 2;
  const pt = (r, t, y) => [r * c - t * s, y, Z + r * s + t * c];
  const nR = [c, 0, s], nT = [-s, 0, c], neg = (v) => [-v[0], -v[1], -v[2]];
  const face = (pts, n, cls, edges) => A.poly(pts, { cls, n, lines: edges.map(([a, b]) => [[pts[a], pts[b]], "hi"]) });
  // balk in het meedraaiende assenstelsel (r, t, y); lange balken in stukken voor een juiste dekking
  function box(r0, r1, t0, t1, y0, y1, cls, segs = 1) {
    for (let i = 0; i < segs; i++) {
      const ya = y0 + (y1 - y0) * i / segs, yb = y0 + (y1 - y0) * (i + 1) / segs;
      const e = [[1, 2], [3, 0]]; if (i === 0) e.push([0, 1]); if (i === segs - 1) e.push([2, 3]);
      face([pt(r1, t0, ya), pt(r1, t1, ya), pt(r1, t1, yb), pt(r1, t0, yb)], nR, cls, e);
      face([pt(r0, t0, ya), pt(r0, t1, ya), pt(r0, t1, yb), pt(r0, t0, yb)], neg(nR), cls, e);
      face([pt(r0, t1, ya), pt(r1, t1, ya), pt(r1, t1, yb), pt(r0, t1, yb)], nT, cls, e);
      face([pt(r0, t0, ya), pt(r1, t0, ya), pt(r1, t0, yb), pt(r0, t0, yb)], neg(nT), cls, e);
    }
    const all = [[0, 1], [1, 2], [2, 3], [3, 0]];
    face([pt(r0, t0, y1), pt(r1, t0, y1), pt(r1, t1, y1), pt(r0, t1, y1)], [0, 1, 0], cls, all);
    face([pt(r0, t0, y0), pt(r1, t0, y0), pt(r1, t1, y0), pt(r0, t1, y0)], [0, -1, 0], cls, all);
  }
  const ring = (rho, y, a0 = 0, a1 = TAU, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [rho * Math.cos(a), y, Z + rho * Math.sin(a)]; });
  function cyl(rho, y0, y1, cls, { nv = 1, cap = true, n = 18 } = {}) {
    A.patch((u, v) => { const a = TAU * u; return [rho * Math.cos(a), y0 + (y1 - y0) * v, Z + rho * Math.sin(a)]; }, n, nv, { cls, wrapU: true, toward: (m) => [m[0], 0, m[2] - Z] });
    if (cap) { const f = ring(rho, y1, 0, TAU, n).slice(0, -1); A.poly(f, { cls: cls + "!", n: [0, 1, 0], lines: f.map((p, i) => [[p, f[(i + 1) % f.length]], "hi"]), bias: 0.3 }); }
  }

  // de zwengel zit vóór het voorste lager en wordt daarom apart getekend, na het lager
  if (only === "crank") {
    A.setPart("as");
    cyl(D.AXLE.r, D.AXLE.y1 - 6, D.AXLE.y1 + 6, "ax", { n: 10 });
    box(-2.8, 20.5, -2.8, 2.8, D.AXLE.y1 + 2, D.AXLE.y1 + 6.5, "ax");
    box(15.5, 20.5, -2.5, 2.5, D.AXLE.y1 + 6.5, D.AXLE.y1 + 26, "kr");
    return A.render();
  }
  // as, met een naaf vooraan en achteraan waarop de spoel vastzit
  A.setPart("as");
  cyl(D.AXLE.r, D.AXLE.y0, D.AXLE.y1, "ax", { nv: 12, n: 10 });
  cyl(7.5, D.Y0, D.Y0 + D.WIRE, "in");
  cyl(7.5, D.Y1 - D.WIRE, D.Y1, "in");

  // spoel: twee lange zijden, achteraan en vooraan naar de naaf, en twee aansluitdraden
  A.setPart("spoel");
  const w = D.WIRE / 2, R = D.R;
  box(R - w, R + w, -w, w, D.Y0 + D.WIRE, D.Y1 - D.WIRE, "cu", 5);
  box(-R - w, -R + w, -w, w, D.Y0 + D.WIRE, D.Y1 - D.WIRE, "cu", 5);
  for (const sg of [1, -1]) {
    const a = sg > 0 ? 7.5 : -R - w, b = sg > 0 ? R + w : -7.5;
    box(a, b, -w, w, D.Y0, D.Y0 + D.WIRE, "cu");
    box(a, b, -w, w, D.Y1 - D.WIRE, D.Y1, "cu");
    box(sg * D.LEAD - 1.5, sg * D.LEAD + 1.5, -1.5, 1.5, D.Y1, D.COMM.y0, "cu");
  }

  // commutator (twee halve ringen met een spleet) of twee sleepringen
  A.setPart("commutator");
  const C = D.COMM;
  if (mode === "comm") {
    // schijf van isolatiemateriaal met daarop twee koperen halve manen; de rechte spleet is overal even breed
    cyl(C.r - 0.6, C.y0, C.y1, "is", { n: 28 });
    const dl = Math.asin(C.slit / C.r);
    for (const k of [0, 1]) {
      const a0 = th + k * Math.PI - Math.PI / 2 + dl, a1 = th + k * Math.PI + Math.PI / 2 - dl;
      A.patch((u, v) => { const a = a0 + (a1 - a0) * u; return [C.r * Math.cos(a), C.y0 + (C.y1 - C.y0) * v, Z + C.r * Math.sin(a)]; }, 14, 1, { cls: "cu", toward: (m) => [m[0], 0, m[2] - Z] });
      const f = ring(C.r, C.y1 + 0.05, a0, a1, 18);
      A.poly(f, { cls: "cu!", n: [0, 1, 0], lines: f.map((p, i) => [[p, f[(i + 1) % f.length]], "hi"]), bias: 0.6, keyAt: [0, C.y1, Z] });
    }
  } else {
    cyl(C.r - 4, C.y0, C.y1, "in", { cap: false });
    for (const [ya, yb] of D.RINGS) cyl(C.r, ya, yb, "cu", { n: 28 });
  }
  return A.render();
}

// Middellijn van de stroomkring door de spoel, van de aansluiting van zijde 1 naar die van zijde 2.
function coilPath(D, th) {
  const q = (r, y) => rotorPoint(D, th, r, 0, y), m = D.WIRE / 2;
  return [q(D.LEAD, D.COMM.y0), q(D.LEAD, D.Y1 - m), q(D.R, D.Y1 - m), q(D.R, D.Y0 + m), q(-D.R, D.Y0 + m), q(-D.R, D.Y1 - m), q(-D.LEAD, D.Y1 - m), q(-D.LEAD, D.COMM.y0)];
}
