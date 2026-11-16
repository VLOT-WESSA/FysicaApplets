// Model van de elektrische bel (zelfonderbreker). Eenheden: wereldeenheden (≈ mm) en seconden.
export const U = 4.5, R = 3, L_IND = 0.012;         // bron (V), weerstand spoelen (Ω), zelfinductie (H)
export const HIT = 12;                              // uitwijking van de hamer tot hij de bel raakt
export const OPEN = 2.6;                             // vanaf deze uitwijking gaat het contact open
export const W0 = 2 * Math.PI * 11;                  // eigenfrequentie anker + bladveer (rad/s)
export const DAMP = 8;                              // demping (1/s)
export const KF = 2.05e5;                             // sterkte van de magneet (eenheden/s² bij 1,5 A en rustspleet)
export const GAP0 = 6.6, LEVER = 73 / 181;           // rustspleet bij het weekijzer, hefboom anker/hamer

// toestand: { y: uitwijking hamer, v, I, pressed }
export function step(s, dt) {
  const closed = s.pressed && s.y < OPEN;
  const I = s.I + ((closed ? U : 0) - R * s.I) / L_IND * dt;
  const gap = Math.max(0.3, GAP0 - LEVER * s.y);
  const f = KF * (I / (U / R)) ** 2 / (gap / GAP0 + 0.15) ** 2 / (1.15 ** 2);
  let v = s.v + (f - W0 * W0 * s.y - DAMP * s.v) * dt;
  let y = s.y + v * dt, hit = 0;
  if (y >= HIT) { y = HIT; hit = v; v = -0.45 * v; }
  if (y < -0.7) { y = -0.7; v = Math.abs(v) * 0.3; }
  return { ...s, y, v, I: Math.max(0, I), closed, hit, force: f };
}
