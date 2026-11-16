// Mechanisme van de automatische zekering, naar de klassieke schoolfiguur:
// knop (k) met scharnierstang, contactarm met openveer, spoel (s), anker (p) op een vergrendelhefboom met terugtrekveer.
// Coördinaten in het vlak van de zekering: x naar rechts, z omhoog (eenheden ≈ 0,25 mm).
export const Y = { back: -36, wall: -33, in0: -30, in1: -6, cut: 0 };
const arc = (cx, cz, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + r * Math.cos(a), cz + r * Math.sin(a)]; });
// huis: rechthoek met afgeschuinde hoeken rechts en een halve ronde uitstulping links voor de knop
export const HOUSING = [[75, 0], [290, 0], [320, 30], [320, 330], [290, 360], [75, 360], ...arc(75, 165, 46, Math.PI / 2, Math.PI * 1.5, 16).slice(1, -1)];
export const TERM_TOP = { x: [320, 368], z: [252, 288] }, TERM_BOT = { x: [320, 368], z: [36, 72] };
export const FIXED = [[320, 272], [206, 272], [206, 266], [314, 266]];            // vaste contactstrip vanaf de bovenste klem
export const FIXED_TIP = [204, 268];
export const COIL = { cx: 200, z0: 78, z1: 190, r: 18 };                           // spoel (s), verticaal
export const KNOB_PIVOT = [76, 165], ARM_PIVOT = [112, 196], LEVER_PIVOT = [122, 22];
export const SPRING_TOP = [80, 300], SPRING_BOT = [80, 24];

const rot = ([x, z], [cx, cz], a) => [cx + (x - cx) * Math.cos(a) - (z - cz) * Math.sin(a), cz + (x - cx) * Math.sin(a) + (z - cz) * Math.cos(a)];
const bar = (p, q, w) => { const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l * w / 2, nz = dx / l * w / 2; return [[p[0] + nx, p[1] + nz], [q[0] + nx, q[1] + nz], [q[0] - nx, q[1] - nz], [p[0] - nx, p[1] - nz]]; };
const lerp = (a, b, t) => a + (b - a) * t;

// open: 0 = ingeschakeld, 1 = uitgeschakeld; lift: hoe ver het anker (p) naar de spoel is getrokken (0..1)
export function mechanism(open, lift) {
  // contactarm: draait rond ARM_PIVOT; dicht = schuin omhoog tot tegen de vaste strip, open = naar beneden
  const aArm = lerp(0.6, 0.12, open);
  const tip = rot([ARM_PIVOT[0] + 112, ARM_PIVOT[1]], ARM_PIVOT, aArm);
  const arm = bar(ARM_PIVOT, tip, 7);
  const hook = Array.from({ length: 9 }, (_, i) => { const a = Math.PI * 1.1 - Math.PI * 1.2 * i / 8; return [tip[0] + 7 * Math.cos(a + aArm), tip[1] + 7 * Math.sin(a + aArm) + 5]; });
  // knop: staaf door het draaipunt; dicht = naar linksonder, open = naar links omhoog... (zoals in de figuur)
  const aKnob = lerp(-2.25, -2.95, open);
  const kIn = rot([KNOB_PIVOT[0] + 40, KNOB_PIVOT[1]], KNOB_PIVOT, aKnob + Math.PI);
  const kOut = rot([KNOB_PIVOT[0] + 78, KNOB_PIVOT[1]], KNOB_PIVOT, aKnob);
  const knob = bar(kIn, kOut, 11);
  // scharnierstang van het binnenste knoppunt naar de arm (houdt de arm dicht zolang de hefboom vergrendelt)
  const armJoint = rot([ARM_PIVOT[0] + 30, ARM_PIVOT[1]], ARM_PIVOT, aArm);
  const link = bar(kIn, armJoint, 6);
  // vergrendelhefboom: lange balk vanaf LEVER_PIVOT, met een voet naar rechts waarop het anker (p) zit
  const aLev = lerp(-0.2, 0.02, Math.max(open, lift * 0.9));
  const top = rot([LEVER_PIVOT[0], LEVER_PIVOT[1] + 196], LEVER_PIVOT, aLev);
  const leverBar = bar(LEVER_PIVOT, top, 10);
  const footEnd = rot([LEVER_PIVOT[0] + 76, LEVER_PIVOT[1]], LEVER_PIVOT, aLev);
  const footUp = rot([LEVER_PIVOT[0] + 76, LEVER_PIVOT[1] + 40 + 6 * lift], LEVER_PIVOT, aLev);
  const foot = bar(LEVER_PIVOT, footEnd, 8), post = bar(footEnd, footUp, 7);
  const pc = footUp;
  const plate = [[pc[0] - 20, pc[1]], [pc[0] + 20, pc[1]], [pc[0] + 20, pc[1] + 7], [pc[0] - 20, pc[1] + 7]];
  // veren: openveer van het huis naar de arm, terugtrekveer van het huis naar de hefboom
  const springTopEnd = rot([ARM_PIVOT[0] + 50, ARM_PIVOT[1]], ARM_PIVOT, aArm);
  const springBotEnd = rot([LEVER_PIVOT[0], LEVER_PIVOT[1] + 14], LEVER_PIVOT, aLev);
  return { arm, hook, tip, knob, link, leverBar, foot, post, plate, plateTop: [pc[0], pc[1] + 7], springTopEnd, springBotEnd, aArm, leverTop: top };
}
// bimetaal (optie): vast op de onderste aansluiting, buigt naar links tegen de voet van de hefboom
export function bimetal(bend) {
  const pts = [], n = 10, x0 = 252, z0 = 62, L = 70;
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push([x0 - bend * 40 * t * t, z0 + L * t]); }
  return { strip: pts.map(([x, z]) => [x - 2.4, z]).concat(pts.map(([x, z]) => [x + 2.4, z]).reverse()), top: pts[n] };
}
export const springPath = (p, q, coils = 9, w = 6) => {
  const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l, pts = [p];
  for (let i = 1; i < 2 * coils; i++) { const t = i / (2 * coils), s = i % 2 ? w : -w; pts.push([p[0] + dx * t + nx * s, p[1] + dz * t + nz * s]); }
  pts.push(q);
  return pts;
};
