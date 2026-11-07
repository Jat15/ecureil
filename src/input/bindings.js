// =====================================================
//  Bindings par périphérique — v2 (P0.2 manette)
// =====================================================
import { ACTIONS } from './actions.js';

// --- Clavier (support AZERTY + QWERTY + flèches) ---
export const KEY_BINDINGS = {
  KeyW: ACTIONS.MOVE_FORWARD,
  KeyZ: ACTIONS.MOVE_FORWARD,   // AZERTY
  ArrowUp: ACTIONS.MOVE_FORWARD,
  KeyS: ACTIONS.MOVE_BACK,
  ArrowDown: ACTIONS.MOVE_BACK,
  KeyA: ACTIONS.MOVE_LEFT,
  KeyQ: ACTIONS.MOVE_LEFT,      // AZERTY
  ArrowLeft: ACTIONS.MOVE_LEFT,
  KeyD: ACTIONS.MOVE_RIGHT,
  ArrowRight: ACTIONS.MOVE_RIGHT,

  Space: ACTIONS.JUMP,
  KeyE: ACTIONS.INTERACT,
  KeyF: ACTIONS.SCAN,           // F (Q est pris par AZERTY)
  KeyR: ACTIONS.TRANSFORM,
  KeyT: ACTIONS.SPIRIT,
  ShiftLeft: ACTIONS.SPRINT,
  ShiftRight: ACTIONS.SPRINT,

  Escape: ACTIONS.PAUSE,
  KeyP: ACTIONS.PHOTO,
  F5: ACTIONS.SAVE
};

// --- Souris ---
export const MOUSE_BINDINGS = {
  0: ACTIONS.INTERACT,
  2: ACTIONS.SCAN
};

// --- Manette (standard W3C / Xbox / PS / Switch Pro) ---
// Index des boutons : voir https://w3c.github.io/gamepad/#remapping
export const GAMEPAD_BINDINGS = {
  // Boutons numériques (index → action)
  buttons: {
    0:  ACTIONS.SCAN,       // A / Croix
    1:  ACTIONS.PAUSE,      // B / Cercle
    2:  ACTIONS.SPRINT,     // X / Carré
    3:  ACTIONS.SPIRIT,     // Y / Triangle — retour à soi / planète-esprit
    4:  ACTIONS.TRANSFORM,  // LB / L1 — roue de formes (maintenu)
    6:  ACTIONS.JUMP,       // LT / L2 — saut / plané (analogique, > 0.5)
    7:  ACTIONS.INTERACT,   // RT / R2 — interagir (analogique, > 0.5)
    8:  ACTIONS.PHOTO,      // Select / Back
    9:  ACTIONS.PAUSE,      // Start / Menu
    14: ACTIONS.ZOOM_IN,    // D-pad G
    15: ACTIONS.ZOOM_OUT,   // D-pad D
    12: ACTIONS.ENTER_BODY, // D-pad H (préparation Phase 5)
    13: ACTIONS.EXIT_BODY   // D-pad B (préparation Phase 5)
  },
  // Seuils
  triggerThreshold: 0.5,
  deadzoneMove: 0.15,
  deadzoneCamera: 0.20,
  // Courbe d'accélération caméra (multiplicateur par seconde)
  cameraSpeedYaw: 3.2,
  cameraSpeedPitch: 2.2
};

// --- Tactile (rempli en P0.3) ---
// --- Tactile (P0.3) ---
// Les zones sont détectées par input/touch.js (pas par bindings).
// Ici on ne garde que les seuils et la config joystick.
export const TOUCH_BINDINGS = {
  joyMaxDist: 64,
  dragSensitivity: 0.006,
  pitchSensitivity: 0.005
};

// --- Helpers ---
export function applyDeadzone(v, dz) {
  if (v === undefined || v === null) return 0;
  if (Math.abs(v) < dz) return 0;
  return (v - Math.sign(v) * dz) / (1 - dz);
}

// Courbe parabolique pour caméra (précision au centre, vitesse aux bords)
export function cameraCurve(v) {
  return v * Math.abs(v);
}
