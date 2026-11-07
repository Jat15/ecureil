// =====================================================
//  Vibration manette — helper simple
// =====================================================
// Usage :
//   import { vibrate } from './input/vibration.js';
//   vibrate(0.3, 80);   // intensité 0-1, durée ms
//   vibrate(0.6, 200, 'pattern');

let _getActiveGamepad = null;

export function setActiveGamepadGetter(fn) {
  _getActiveGamepad = fn;
}

export function vibrate(intensity = 0.3, duration = 80, kind = 'dual-rumble') {
  if (!_getActiveGamepad) return false;
  const gp = _getActiveGamepad();
  if (!gp || !gp.vibrationActuator) return false;
  try {
    gp.vibrationActuator.playEffect(kind, {
      duration,
      strongMagnitude: Math.min(1, intensity),
      weakMagnitude: Math.min(1, intensity * 0.6)
    });
    return true;
  } catch (e) {
    return false;
  }
}

// Vibrations prédéfinies (pour hooks collectables/UI)
export const VIBRATION_PRESETS = {
  seed:      { intensity: 0.25, duration: 60 },
  plant:     { intensity: 0.45, duration: 120 },
  scan:      { intensity: 0.20, duration: 50 },
  discover:  { intensity: 0.60, duration: 200 },
  soft:      { intensity: 0.15, duration: 40 }
};

export function vibratePreset(name) {
  const p = VIBRATION_PRESETS[name];
  if (p) vibrate(p.intensity, p.duration);
}

// =====================================================
//  Haptique mobile (navigator.vibrate)
// =====================================================
export function vibrateHaptic(kind = 'tap') {
  if (!navigator.vibrate) return false;
  const patterns = {
    tap:    [12],
    soft:   [8],
    seed:   [15, 30, 15],
    plant:  [25, 40, 25, 40, 40],
    scan:   [10],
    discover: [30, 60, 30, 60, 80]
  };
  const p = patterns[kind] || patterns.tap;
  try { return navigator.vibrate(p); } catch { return false; }
}
