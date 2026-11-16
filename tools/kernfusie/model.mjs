// Nulldimensionaal model van een D-T-tokamak (ITER-achtige maten).
// Alle tekst, getallen en beweging in de applet komen hieruit.
export const KEV = 1.602176634e-16;     // J per keV
export const MEV = 1.602176634e-13;     // J per MeV
export const E_FUS = 17.6;              // MeV per D-T-reactie
export const E_ALPHA = 3.5, E_N = 14.1; // MeV
export const VOL = 830;                 // plasmavolume (m^3)
export const LAWSON = 3e21;             // keV·s/m^3 (ontsteking D-T)
export const MK_PER_KEV = 11.6045;      // miljoen kelvin per keV

// Bosch & Hale (1992), <sigma v> voor D(t,n)He4, T in keV -> m^3/s
export function sigmav(T) {
  if (T < 0.2) return 0;
  const BG = 34.3827, mrc2 = 1124656;
  const C1 = 1.17302e-9, C2 = 1.51361e-2, C3 = 7.51886e-2, C4 = 4.60643e-3, C5 = 1.35e-2, C6 = -1.0675e-4, C7 = 1.366e-5;
  const th = T / (1 - (T * (C2 + T * (C4 + T * C6))) / (1 + T * (C3 + T * (C5 + T * C7))));
  const xi = Math.cbrt((BG * BG) / (4 * th));
  return C1 * th * Math.sqrt(xi / (mrc2 * T * T * T)) * Math.exp(-3 * xi) * 1e-6;
}

// Opsluitingstijd: groeit met het veld, daalt met het vermogen (zoals IPB98).
export const tauE = (B, Pin) => 2.7 * Math.pow(B / 5.3, 1.5) * Math.pow(Math.max(Pin, 5) / 155, -0.69);

// n in 1e20 m^-3, T in keV, B in T, Pheat in MW
export function rates({ n, T, B, Pheat }) {
  const ne = n * 1e20;
  const W = 3 * ne * T * KEV * VOL / 1e6;                              // MJ
  const Pfus = (ne / 2) ** 2 * sigmav(T) * E_FUS * MEV * VOL / 1e6;    // MW
  const Palpha = Pfus * E_ALPHA / E_FUS;
  const Pbrem = 5.35e-37 * Z_EFF * ne * ne * Math.sqrt(Math.max(T, 0)) * VOL / 1e6;
  const tau = tauE(B, Pheat + Palpha);
  const Pcond = W / tau;
  const beta = (2 * ne * T * KEV) / ((B * B) / (2 * 4e-7 * Math.PI));
  const reacts = (ne / 2) ** 2 * sigmav(T) * VOL;                      // reacties per seconde
  return { W, Pfus, Palpha, Pbrem, tau, Pcond, beta, reacts, triple: ne * T * tau, Q: Pheat > 0.5 ? Pfus / Pheat : Infinity };
}
export const BETA_MAX = 0.035;
export const Z_EFF = 1.7;

// dW/dt = Pheat + Palpha - W/tau - Pbrem  ->  dT/dt
export function step(s, dt) {
  const r = rates(s);
  const ne = s.n * 1e20;
  const dW = (s.Pheat + r.Palpha - r.Pcond - r.Pbrem) * 1e6;           // W
  const dT = dW / (3 * ne * KEV * VOL);
  return { ...s, T: Math.max(0.05, Math.min(60, s.T + dT * dt)) };
}
