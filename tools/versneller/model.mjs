// Model van een lineaire versneller (Wideröe): protonen, sleepbuizen afgestemd op U0 en f0.
export const Q = 1.602e-19, M = 1.6726e-27;
export const U0 = 50e3, F0 = 10e6, E_INJ = 20e3;   // ontwerp: 50 kV per spleet, 10 MHz, injectie 20 keV
export const N_TUBES = 6;
export const MM_PER_UNIT = 3;                       // 1 wereldeenheid = 3 mm
export const vOf = (eV) => Math.sqrt(2 * eV * Q / M);
// lengte van sleepbuis n (na n spleten): halve periode lang vliegen
export const tubeLen = (n) => vOf(E_INJ + n * U0) / (2 * F0) * 1000 / MM_PER_UNIT;
