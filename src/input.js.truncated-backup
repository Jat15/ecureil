// =====================================================
//  Façade input.js — mêmes exports qu'avant, manager en dessous
// =====================================================
// Ce fichier garde l'API publique utilisée par main.js, physics.js, etc.
// En interne, il utilise le nouveau manager pour clavier/souris.
//
// Tactile et manette sont encore gérés ici (inline) pour ne pas casser.
// Ils seront migrés en P0.2 / P0.3.

import { createInputManager } from './input/manager.js';

// --- Exports compat (mêmes noms qu'avant) ---
export const input = {
  moveX: 0, moveZ: 0,
  jumpHeld: false, jumpPressed: false, glideHeld: false,
  plantHeld: false, interactHeld: false, interactPressed: false,
  scanHeld: false, scanPressed: false,
  transformPressed: false, spiritPressed: false,
  enterBodyPressed: false, exitBodyPressed: false,
  sprintHeld: false,
  pausePressed: false, photoPressed: false, savePressed: false,
  gamepad: false, _jumpPrev: false
};

export let yawDelta = 0, pitchDelta = 0;
export function resetYawPitch() { yawDelta = 0; pitchDelta = 0; }
export function consumeYawPitch() {
  const y = yawDelta, p = pitchDelta;
  yawDelta = 0; pitchDelta = 0;
  return { y, p };
}

export let camPitch = 0.38, camDist = 7.2;
export function getCamPitch() { return camPitch; }
export function setCamPitch(v) { camPitch = v; }
export function getCamDist() { return camDist; }
export function setCamDist(v) { camDist = v; }

export const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

let gameStarted = false;
export function setGameStarted(v) { gameStarted = v; if (manager) manager.setGameStarted(v); }

// --- Manager + état tactile/gamepad legacy ---
let manager = null;

// Tactile : gardé inline pour P0.1 (migré en P0.3)