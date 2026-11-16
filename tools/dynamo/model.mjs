// Model van een flesdynamo met lamp. Snelheid in km/h.
export const R_WHEEL = 0.34;         // straal van het wiel (m)
export const R_ROLL = 0.0095;        // straal van het rolletje (m)
export const POLE_PAIRS = 2;         // magneet met 2 noord- en 2 zuidpolen
export const KE = 0.0273;            // effectieve emk per (rad/s) van de magneet: U_eff = KE·ω
export const R_COIL = 4, L_COIL = 0.02, R_LAMP = 12;   // Ω, H, Ω (lamp 6 V / 3 W)
export function state(kmh) {
  const v = kmh / 3.6;
  const wWheel = v / R_WHEEL, wMag = v / R_ROLL;          // rad/s
  const f = POLE_PAIRS * wMag / (2 * Math.PI);            // frequentie van de wisselspanning
  const E = KE * wMag;                                    // effectieve emk
  const X = 2 * Math.PI * f * L_COIL;
  const I = E / Math.hypot(R_COIL + R_LAMP, X);
  return { v, wWheel, wMag, rps: wMag / (2 * Math.PI), f, E, I, U: I * R_LAMP, P: I * I * R_LAMP };
}
