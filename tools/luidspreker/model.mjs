// Model van een elektrodynamische luidspreker (Thiele-Small-achtig, één massa-veersysteem).
export const BL = 7.5;          // B·ℓ (T·m): 1 T in de spleet, 100 windingen van 12 mm straal
export const RE = 8;            // weerstand van de spreekspoel (Ω)
export const MMS = 0.010;       // bewegende massa (kg)
export const KMS = 1200;        // stijfheid van spin en rand (N/m)  →  f0 ≈ 55 Hz
export const RMS = 1.2;         // mechanische demping (kg/s)
export const C_AIR = 343;       // geluidssnelheid (m/s)
export const F0 = Math.sqrt(KMS / MMS) / (2 * Math.PI);
// amplitude van stroom, kracht en uitwijking bij spanning U (V) en frequentie f (Hz)
export function response(U, f) {
  const w = 2 * Math.PI * f;
  const I = U / RE;
  const F = BL * I;
  const re = KMS - MMS * w * w, im = (RMS + BL * BL / RE) * w;   // tegen-emk dempt mee
  const x = F / Math.hypot(re, im);
  return { I, F, x, v: x * w, lambda: C_AIR / f };
}
