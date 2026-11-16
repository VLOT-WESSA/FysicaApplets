// Profielen van de luidspreker (a langs de as, R vanaf de as) en de bewegende delen.
// De motor (magneet, spleet, spoel) is groter getekend dan in een echte luidspreker, zodat je hem ziet.
export const ZC = 104;                 // hoogte van de as boven de tafel
export const POLE = [[0, 0], [0, 48], [6, 48], [6, 13], [34, 13], [34, 0]];            // achterplaat + poolkern
export const MAG_S = [[6, 20], [6, 48], [15, 48], [15, 20]];
export const MAG_N = [[15, 20], [15, 48], [24, 48], [24, 20]];
export const TOP = [[24, 19.5], [24, 48], [34, 48], [34, 19.5]];
export const FRAME = [[34, 42], [34, 50], [42, 50], [46, 52], [84, 92], [84, 100], [86.5, 100], [86.5, 90], [82, 88], [45, 49], [42, 46.5], [38, 46.5], [38, 42]];
export const BAFFLE = { a0: 87, a1: 99, hole: 90, up: ZC, back: 130 };

const thin = (pts, t) => {                                   // dunne schaal langs een polylijn
  const out = [], inn = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)];
    const da = q[0] - o[0], dr = q[1] - o[1], l = Math.hypot(da, dr) || 1;
    out.push([p[0] + (-dr / l) * t / 2, p[1] + (da / l) * t / 2]);
    inn.push([p[0] - (-dr / l) * t / 2, p[1] - (da / l) * t / 2]);
  }
  return out.concat(inn.reverse());
};

// bewegende delen bij uitwijking d (positief = naar voren)
export function moving(d) {
  const cone = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; cone.push([48 + 36 * Math.pow(t, 0.8) + d, 14.6 + 69.4 * t]); }
  const cap = [];
  for (let i = 0; i <= 8; i++) { const th = (i / 8) * Math.PI / 2; cap.push([52 + d + 9 * Math.sin(th), 18 * Math.cos(th)]); }
  const spider = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10, R = 15 + 29 * t; spider.push([44 + (i % 2 ? 1.6 : -1.6) * (i > 0 && i < 10 ? 1 : 0) + d * (1 - t), R]); }
  const surround = [];
  for (let i = 0; i <= 10; i++) { const th = (i / 10) * Math.PI; surround.push([84 + d * (1 - i / 10) + 3.6 * Math.sin(th) + 2.5 * (i / 10), 88 - 4 * Math.cos(th)]); }
  return {
    former: [[22 + d, 14], [52 + d, 14], [52 + d, 14.6], [22 + d, 14.6]],
    coil: [[25 + d, 14.6], [33 + d, 14.6], [33 + d, 18], [25 + d, 18]],
    cone: thin(cone, 1.2),
    cap: thin(cap, 0.9).map(([a, R]) => [a, Math.max(0, R)]),
    spider: thin(spider, 0.8),
    surround: thin(surround, 0.9),
  };
}
