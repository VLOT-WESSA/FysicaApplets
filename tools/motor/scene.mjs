// Gedeelde, stilstaande tekening voor de gelijkstroommotor en de generator:
// plankje, hoefijzermagneet, lagers, borstels, kastje (voeding of meter) en snoeren.
// De draaiende delen (spoel, as, commutator of sleepringen) tekent rotor.js in de pagina.
import * as k from "../shared/iso-kit.mjs";
import * as G from "../shared/lathe.mjs";
import { tubePieces, tubeSvg } from "../shared/tube.mjs";

export const W = 900, H = 600;
// Wereld: x naar rechts (van noord- naar zuidpool), y naar de kijker (de as), z omhoog. Eenheden ≈ mm.
export const D = {
  AXZ: 62,                       // hoogte van de as
  R: 33, Y0: -44, Y1: 44, WIRE: 7, // spoel: straal, achter- en voorkant, dikte van de draadbundel
  LEAD: 10,                      // straal waarop de aansluitdraden naar de commutator lopen
  COMM: { r: 17, y0: 52, y1: 63, slit: 2.4 },
  RINGS: [[52, 56.5], [58.5, 63]],
  AXLE: { r: 2.8, y0: -62, y1: 104 },
  POLE: 52,                      // binnenkant van de polen (x = ±POLE)
  FIELD: { ys: [-14, 0, 14], zs: [40, 62, 84] },
};
const BOARD = { x: -112, y: -74, w: 208, d: 192, r: 6 };
const ARM_L = { x: -82, y: -24, w: 30, d: 48, r: 1.5 }, ARM_R = { x: 52, y: -24, w: 30, d: 48, r: 1.5 };
const ARM_TOP = 100;
const YOKE_L = { x: -82, y: -24, w: 82, d: 48, r: 1.5 }, YOKE_R = { x: 0, y: -24, w: 82, d: 48, r: 1.5 };
const POST_B = { x: -6, y: -66, w: 12, d: 7, r: 2 }, POST_F = { x: -5, y: 98, w: 10, d: 6, r: 2 };
const BOX = { x: -102, y: 62, w: 42, d: 34, r: 3 }, BOX_H = 46;
const BRUSH_R = { x: 17.4, y: 51.5, w: 14, d: 6, r: 0.8 }, BRUSH_L = { x: -31.4, y: 58, w: 14, d: 6, r: 0.8 };
const HOLD_R = [35, 54.5], HOLD_L = [-35, 61];

export const projection = () => k.fitProjection(
  [...k.boxCorners(BOARD, -16, 0), [-82, -24, 104], [82, -24, 104], [82, 24, 104]],
  W, H, { pad: 14, azimuth: 60, elevation: 28 });

export function buildScene(P, { box = "voeding" } = {}) {
  const S = (p, st) => k.solidSvg(p, st), Ln = (d, st) => k.lineSvg(d, st), at = (p) => k.iso(p, P);
  const r1 = (v) => Math.round(v * 10) / 10;
  const g = (part, svg) => `<g data-p="${part}">${svg}</g>`;
  const back = [], front = [];

  // ---------------------------------------------------------- plankje
  {
    const o = [`<path class="iso-halo" d="${k.haloOf(BOARD, -16, 16, P)}"/>`];
    for (const [x, y] of k.corners(BOARD, 14)) o.push(S(k.cylinder(x, y, 7, -16, 4, P, 24), { tone: "mid" }));
    o.push(S(k.slabOf(BOARD, -12, 12, P, 8, 1.4), { tone: "hi", className: "wood" }));
    o.push(Ln(k.planOutline(k.insetPlan(BOARD, 5), 0, P), { tone: "lo" }));
    for (const y of [-52, -34, 40, 74, 104]) o.push(Ln(k.lineOnTop([BOARD.x + 5, y], [BOARD.x + BOARD.w - 5, y + 2], 0, P), { tone: "faint" }));
    o.push(k.dotsSvg(k.corners(BOARD, 9).map(([x, y]) => at([x, y, 0])), { size: 0.55, tone: "hi" }));
    back.push(g("plankje", o.join("")));
  }

  // ---------------------------------------------------------- hoefijzermagneet (juk onderaan, polen links en rechts)
  const armSvg = (plan, cls) => S(k.slabOf(plan, 18, ARM_TOP - 18, P, 3, 0.8), { tone: "hi", className: cls });
  const yokeSvg = (plan, cls) => S(k.slabOf(plan, 0, 18, P, 3, 0.6), { tone: "hi", className: cls });
  const letter = (plan, part, char) => {
    // voorvlak (y = +30) van de arm: x naar rechts, omlaag langs −z
    const y = plan.y + plan.d + 0.1, o0 = at([plan.x, y, ARM_TOP]), ex = at([plan.x + 1, y, ARM_TOP]), ey = at([plan.x, y, ARM_TOP - 1]);
    const M = [ex[0] - o0[0], ex[1] - o0[1], ey[0] - o0[0], ey[1] - o0[1], o0[0], o0[1]].map((v) => v.toFixed(4)).join(" ");
    return `<g transform="matrix(${M})"><text data-part="${part}" class="pole" x="15" y="27" text-anchor="middle">${char}</text></g>`;
  };
  back.push(g("magneet", yokeSvg(YOKE_L, "poleL") + yokeSvg(YOKE_R, "poleR") + armSvg(ARM_L, "poleL") + letter(ARM_L, "letL", "N")));
  // veldlijnen in de spleet: beide zinnen, de pagina toont er één
  {
    const lines = (dir) => D.FIELD.ys.flatMap((y) => D.FIELD.zs.map((z) => {
      const a = at([-dir * D.POLE, y, z]), m = at([dir * 4, y, z]), b = at([dir * D.POLE, y, z]);
      return `<path d="M${r1(a[0])} ${r1(a[1])}L${r1(m[0])} ${r1(m[1])}L${r1(b[0])} ${r1(b[1])}" marker-mid="url(#arrB)"/>`;
    })).join("");
    back.push(`<g data-part="field" class="field" data-p="magneet"><g data-dir="1">${lines(1)}</g><g data-dir="-1">${lines(-1)}</g></g>`);
  }

  // ---------------------------------------------------------- lagers en borstels
  const post = (plan) => S(k.slabOf(plan, 0, 67, P, 4, 0.8), { tone: "mid", className: "steel" })
    + k.dotsSvg([at([plan.x + plan.w / 2, plan.y + plan.d + 0.1, 8]), at([plan.x + plan.w / 2, plan.y + plan.d + 0.1, 40])], { size: 0.55, tone: "hi" });
  back.push(g("as", post(POST_B)));
  const holder = ([x, y]) => S(k.cylinder(x, y, 6, 0, 3, P, 24, 0.5), { tone: "mid", className: "brass" }) + S(k.cylinder(x, y, 3.2, 3, 66, P, 20, 0.5), { tone: "hi", className: "brass" });
  const brush = (plan) => S(k.slabOf(plan, D.AXZ - 5, 10, P, 2, 0.3), { tone: "hi", className: "carbon" });
  back.push(g("borstels", holder(HOLD_L) + brush(BRUSH_L)));

  front.push(g("magneet", armSvg(ARM_R, "poleR") + letter(ARM_R, "letR", "Z")));
  front.push(g("borstels", brush(BRUSH_R) + holder(HOLD_R)));

  // ---------------------------------------------------------- kastje: voeding (motor) of meter (generator)
  {
    const o = [S(k.slabOf(BOX, 0, BOX_H, P, 3, 0.8), { tone: "hi", className: "psu" })];
    o.push(Ln(k.sideSeam(BOX, BOX_H - 6, P, 3), { tone: "lo" }));
    const y = BOX.y + BOX.d + 0.1, o0 = at([BOX.x, y, BOX_H]), ex = at([BOX.x + 1, y, BOX_H]), ey = at([BOX.x, y, BOX_H - 1]);
    const M = [ex[0] - o0[0], ex[1] - o0[1], ey[0] - o0[0], ey[1] - o0[1], o0[0], o0[1]].map((v) => v.toFixed(4)).join(" ");
    const jacks = `<circle cx="12" cy="37" r="3" class="jack"/><circle cx="30" cy="37" r="3" class="jack"/><text data-part="signA" class="sign" x="12" y="30.5" text-anchor="middle"></text><text data-part="signB" class="sign" x="30" y="30.5" text-anchor="middle"></text>`;
    const face = box === "voeding"
      ? `<rect x="5" y="6" width="32" height="14" rx="1" class="bezel"/><rect x="6.2" y="7.2" width="29.6" height="11.6" class="lcd"/><text data-part="boxText" x="21" y="15.9" text-anchor="middle" class="lcdtext">uit</text>`
      : `<rect x="4" y="4" width="34" height="22" rx="1.5" class="dial"/><path d="M8.2 21.6A14 14 0 0 1 33.8 21.6" class="scale"/>${[-60, -30, 0, 30, 60].map((a) => { const s = Math.sin(a * Math.PI / 180), c = Math.cos(a * Math.PI / 180); return `<path d="M${r1(21 + 12 * s)} ${r1(23 - 12 * c)}L${r1(21 + 14.5 * s)} ${r1(23 - 14.5 * c)}" class="scale"/>`; }).join("")}<text x="8" y="25" text-anchor="middle" class="dialtext">−</text><text x="34" y="25" text-anchor="middle" class="dialtext">+</text><path data-part="needle" d="M21 23L21 9.5" class="needle"/><circle cx="21" cy="23" r="1.4" class="jack"/>`;
    o.push(`<g transform="matrix(${M})">${face}${jacks}</g>`);
    front.push(g(box, o.join("")));
  }

  // ---------------------------------------------------------- snoeren, met een stroompad erbovenop
  {
    const jack = (dx) => [BOX.x + dx, BOX.y + BOX.d + 0.5, BOX_H - 37];
    const cable = (pts, cls, id) => {
      const route = G.fillet(pts, 5, 7);
      return `<g class="cable ${cls}">${tubePieces(route, 1.6, P, { maxLength: 400 }).map((pc) => tubeSvg(pc, { tone: "hi" })).join("")}</g><path class="flow" data-w="${id}" d="${k.pathOf(route.map(at))}"/>`;
    };
    const a = jack(12), b = jack(30);
    // a (linkse bus) → rechterborstel, voor het voorste lager langs; b (rechtse bus) → linkerborstel
    const toRight = [a, [a[0], 110, a[2]], [a[0], 110, 1.8], [50, 110, 1.8], [50, HOLD_R[1], 1.8], [HOLD_R[0] + 5, HOLD_R[1], 1.8]];
    const toLeft = [b, [b[0], 103, b[2]], [b[0], 103, 1.8], [-50, 103, 1.8], [-50, HOLD_L[1], 1.8], [HOLD_L[0] - 5, HOLD_L[1], 1.8]];
    front.push(g("draden", cable(toLeft, "", "left") + cable(toRight, "red", "right")));
  }
  front.push(g("as", post(POST_F)));
  return { back: back.join(""), front: front.join("") };
}

export const SCENE_CSS = `
  .s path{stroke-width:.45;stroke-linejoin:round}
  .lh,.lm,.ll,.lf{fill:none;stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
  .lh{stroke:var(--anatomy-hi)}.lm{stroke:var(--anatomy-mid)}.ll{stroke:var(--anatomy-lo)}.lf{stroke:var(--anatomy-faint)}
  .wood>.iso-top{fill:#f3e6cf}.wood>.iso-shade{fill:#e2cda9}
  .steel>.iso-top{fill:#e6e9ec}.steel>.iso-shade[data-shade="0"]{fill:#aab1b9}.steel>.iso-shade[data-shade="1"]{fill:#b8bec5}.steel>.iso-shade[data-shade="2"]{fill:#c7ccd2}.steel>.iso-shade[data-shade="3"]{fill:#d5d9de}
  .brass>.iso-top{fill:#f1dfa8}.brass>.iso-shade{fill:#dcc27c}.brass>.iso-shade[data-shade="0"]{fill:#c9ab5c}
  .carbon>.iso-top{fill:#5b6573}.carbon>.iso-shade{fill:#3f4650}
  .psu>.iso-top{fill:#e8eaec}.psu>.iso-shade{fill:#cfd3d8}
  /* noord rood, zuid blauw; data-mag op de figuur wisselt de polen */
  .fig[data-mag="1"] .poleL>.iso-top,.fig[data-mag="-1"] .poleR>.iso-top{fill:#e2847c}
  .fig[data-mag="1"] .poleL>.iso-shade,.fig[data-mag="-1"] .poleR>.iso-shade{fill:#c8534a}
  .fig[data-mag="1"] .poleL>.iso-shade[data-shade="0"],.fig[data-mag="-1"] .poleR>.iso-shade[data-shade="0"]{fill:#a8433b}
  .fig[data-mag="1"] .poleL>.iso-shade[data-shade="3"],.fig[data-mag="-1"] .poleR>.iso-shade[data-shade="3"]{fill:#d4675e}
  .fig[data-mag="1"] .poleR>.iso-top,.fig[data-mag="-1"] .poleL>.iso-top{fill:#86a3e0}
  .fig[data-mag="1"] .poleR>.iso-shade,.fig[data-mag="-1"] .poleL>.iso-shade{fill:#4a74c8}
  .fig[data-mag="1"] .poleR>.iso-shade[data-shade="0"],.fig[data-mag="-1"] .poleL>.iso-shade[data-shade="0"]{fill:#3b5fa8}
  .fig[data-mag="1"] .poleR>.iso-shade[data-shade="3"],.fig[data-mag="-1"] .poleL>.iso-shade[data-shade="3"]{fill:#6189d6}
  .pole{font-family:var(--font-body);font-weight:700;font-size:20px;fill:#fffdf7}
  .bezel{fill:#5b6573}.lcd{fill:#dfe9d2}.lcdtext{font-family:var(--font-mono);font-size:7px;fill:#2d5a3a}
  .dial{fill:#fffdf7;stroke:#1d2a3a;stroke-width:.6}.scale{fill:none;stroke:#1d2a3a;stroke-width:.6}.dialtext{font-family:var(--font-mono);font-size:5px;fill:#1d2a3a}
  .needle{stroke:#b8311f;stroke-width:1.1;stroke-linecap:round}
  .jack{fill:#1d2a3a}.sign{font-family:var(--font-mono);font-weight:600;font-size:8px;fill:#1d2a3a}
  .cable .tb-body{fill:#4d5866}.cable .tb-shine{fill:#7d8896}.cable .tb-shade{fill:#36404b}
  .cable.red .tb-body{fill:#b8453a}.cable.red .tb-shine{fill:#d8776c}.cable.red .tb-shade{fill:#8f2f27}
  .flow{fill:none;stroke:#e0a020;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:3 8;opacity:0;vector-effect:non-scaling-stroke}
  .field{opacity:0;transition:opacity .25s}.field[data-on]{opacity:1}
  .field path{fill:none;stroke:#1f7f86;stroke-width:1.5;vector-effect:non-scaling-stroke}
  .fig[data-mag="1"] .field [data-dir="-1"],.fig[data-mag="-1"] .field [data-dir="1"]{display:none}
  /* draaiende delen (schilder in de pagina) */
  .cu0,.cu1{fill:#b8733a;stroke:#b8733a}.cu2{fill:#c4834b;stroke:#c4834b}.cu3{fill:#cf8f59;stroke:#cf8f59}.cut,.cu{fill:#e0a575;stroke:#e0a575}
  .ax0,.ax1{fill:#aab1b9;stroke:#aab1b9}.ax2,.ax3{fill:#c7ccd2;stroke:#c7ccd2}.axt,.ax{fill:#e6e9ec;stroke:#e6e9ec}
  .in0,.in1,.in2,.in3,.int,.in{fill:#3f4650;stroke:#3f4650}
  .is0,.is1{fill:#cfc9bc;stroke:#cfc9bc}.is2,.is3{fill:#dedad0;stroke:#dedad0}.ist,.is{fill:#f4f1ea;stroke:#f4f1ea}
  .kr0,.kr1{fill:#8a5a3a;stroke:#8a5a3a}.kr2,.kr3{fill:#a9764f;stroke:#a9764f}.krt,.kr{fill:#c08f66;stroke:#c08f66}
  .curflow{fill:none;stroke:#e0a020;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:3 8;vector-effect:non-scaling-stroke}
  .curhead{fill:#e0a020;stroke:#fffdf7;stroke-width:.5}
  .force{fill:none;stroke:#a3302a;stroke-width:3;stroke-linecap:round;vector-effect:non-scaling-stroke}
  .flab{font-family:var(--font-mono);font-weight:600;font-size:14px;fill:#a3302a;paint-order:stroke;stroke:#fbf8f1;stroke-width:3px}
  .now{flex:none;display:flex;gap:10px;align-items:flex-start;min-height:58px;background:var(--accent-soft);border:1px solid var(--ink);border-radius:4px;box-shadow:var(--shadow);padding:9px 14px;font-size:14px;line-height:1.4;color:var(--ink)}
  .now b{font-family:var(--font-mono);font-weight:600;font-size:12px;flex:none;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--accent);color:#fff}
  .now b:empty{display:none}
`;

export const DEFS = `<defs>
<marker id="arrB" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0.5L10 5L0 9.5z" fill="#1f7f86"/></marker>
<marker id="arrF" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="3.6" markerHeight="3.6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#a3302a"/></marker>
</defs>`;
