// P1 — état du mode scanner (pur, sans visuels)
import { input } from '../input.js';

export const scanState = {
  held: false,
  intensity: 0,
  firstScanSeen: false
};

export function updateScanMode(dt, clockTime) {
  scanState.held = !!input.scanHeld;
  const target = scanState.held ? 1 : 0;
  // Lerp exponentiel : 8/s → ~0.4s pour atteindre 96%
  scanState.intensity += (target - scanState.intensity) * (1 - Math.exp(-8 * dt));
  if (scanState.intensity < 0.005) scanState.intensity = 0;
  return scanState;
}
