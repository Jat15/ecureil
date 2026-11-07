// =====================================================
//  Façade input.js — délègue entièrement au manager
// =====================================================
// Cette façade garde l'API publique utilisée par main.js, physics.js,
// collectables.js, ui.js, etc. Elle ne fait QUE :
//   1. Exposer l'objet "input" (état unifié)
//   2. Instancier le manager via initInput()
//   3. Appeler manager.update(dt) via updateInputFrame()
//   4. Exposer les helpers (consumeYawPitch, camPitch, camDist, ...)
//
// Toute la logique (clavier, souris, manette, tactile) est dans
// input/manager.js + input/touch.js + input/bindings.js
//
// Post-P0.3 : plus de code legacy inline.

import { createInputManager } from './input/manager.js';

// --- État exposé (rempli par le manager chaque frame) ---
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

// --- Accumulateurs caméra (consommés par physics / caméra) ---
export let yawDelta = 0, pitchDelta = 0;
export function resetYawPitch() { yawDelta = 0; pitchDelta = 0; }
export function consumeYawPitch() {
  const y = yawDelta, p = pitchDelta;
  yawDelta = 0; pitchDelta = 0;
  return { y, p };
}

// --- Caméra (pitch + distance) ---
export let camPitch = 0.38, camDist = 7.2;
export function getCamPitch() { return camPitch; }
export function setCamPitch(v) { camPitch = v; }
export function getCamDist() { return camDist; }
export function setCamDist(v) { camDist = v; }

// --- Détection tactile ---
export const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// --- État global de démarrage ---
let gameStarted = false;
export function setGameStarted(v) {
  gameStarted = v;
  if (manager) manager.setGameStarted(v);
}

// --- Instance du manager (créée par initInput) ---
let manager = null;

// =====================================================
//  initInput — instancie le manager avec tous les éléments DOM
// =====================================================
export function initInput(renderer, elements) {
  elements = elements || {};

  manager = createInputManager(renderer, {
    isTouchDevice,
    joyBase:    elements.joyBase    || document.getElementById('joy-base'),
    joyKnob:    elements.joyKnob    || document.getElementById('joy-knob'),
    jumpBtn:    elements.jumpBtn    || document.getElementById('jump-btn'),
    interactBtn: elements.interactBtn || document.getElementById('interact-btn'),
    scanBtn:    elements.scanBtn    || document.getElementById('scan-btn'),
    spiritBtn:  elements.spiritBtn  || document.getElementById('spirit-btn'),
    touchUI:    elements.touchUI    || document.getElementById('touch-controls')
  }, {
    onStateChange: (s) => {
      // Copier TOUS les champs du manager vers input
      input.moveX = s.moveX;
      input.moveZ = s.moveZ;
      input.jumpHeld = s.jumpHeld;
      input.jumpPressed = s.jumpPressed;
      input.glideHeld = s.glideHeld;
      input.plantHeld = s.plantHeld;
      input.interactHeld = s.interactHeld;
      input.interactPressed = s.interactPressed;
      input.scanHeld = s.scanHeld;
      input.scanPressed = s.scanPressed;
      input.transformPressed = s.transformPressed;
      input.spiritPressed = s.spiritPressed;
      input.enterBodyPressed = s.enterBodyPressed;
      input.exitBodyPressed = s.exitBodyPressed;
      input.sprintHeld = s.sprintHeld;
      input.pausePressed = s.pausePressed;
      input.photoPressed = s.photoPressed;
      input.savePressed = s.savePressed;
      input.gamepad = s.gamepad;
      input._jumpPrev = s._jumpPrev;
    },
    onCamera: (dy, dp) => {
      yawDelta += dy;
      pitchDelta += dp;
    },
    onCamDistChange: (v) => {
      camDist = v;
    },
    onTouchReady: (touchHandler) => {
      // Si le tactile est créé, on s'assure que la visibilité est bonne
      if (isTouchDevice) {
        document.body.classList.add('touch-ui-active');
      }
    }
  });

  manager.setGameStarted(gameStarted);
  return manager;
}

// =====================================================
//  updateInputFrame — appelé chaque frame par main.js
// =====================================================
export function updateInputFrame(dt) {
  if (!manager) return;
  manager.update(dt);
  // Normaliser le vecteur de mouvement
  const len = Math.hypot(input.moveX, input.moveZ);
  if (len > 1) {
    input.moveX /= len;
    input.moveZ /= len;
  }
}

// =====================================================
//  Helpers device (utilisés par UI)
// =====================================================
export function getActiveDevice() {
  return manager ? manager.getActiveDevice() : 'keyboard';
}

export function getGamepad() {
  return manager ? manager.getGamepad() : null;
}
