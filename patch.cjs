#!/usr/bin/env node
// =====================================================
//  patch-p0-3-fix3.cjs — Réécriture complète de input.js
//  Fix: fichier tronqué à 47 lignes (crash P0.1)
// =====================================================

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const DRY = process.argv.includes('--check');

if (!fs.existsSync(SRC)) {
  console.error('❌ Dossier src/ introuvable.');
  process.exit(1);
}

console.log(`\n=== FIX3 — Réécriture input.js ${DRY ? '(DRY)' : ''} ===\n`);

// =====================================================
//  1) DIAGNOSTIC des usages attendus dans main.js
// =====================================================
console.log('→ Analyse des usages dans main.js...\n');

const mainPath = path.join(SRC, 'main.js');
let mainSrc = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8').replace(/\r\n/g, '\n') : '';
if (!mainSrc) {
  console.error('❌ main.js introuvable');
  process.exit(1);
}

const importMatch = mainSrc.match(/import\s*\{([^}]+)\}\s*from\s*['"]\.\/input\.js['"]/);
if (!importMatch) {
  console.error('❌ Aucun import depuis input.js dans main.js');
  process.exit(1);
}

const importedNames = importMatch[1].split(',').map(s => s.trim()).filter(Boolean);
console.log('main.js importe depuis input.js :');
for (const n of importedNames) console.log(`  • ${n}`);

// Vérifier l'appel initInput
const initCallMatch = mainSrc.match(/initInput\s*\(\s*renderer\s*,\s*\{[\s\S]*?\}\s*\)/);
if (initCallMatch) {
  console.log('\n✅ initInput(renderer, {...}) trouvé dans main.js');
  console.log('Contenu actuel :');
  console.log(initCallMatch[0]);
} else {
  console.log('\n⚠ initInput(renderer, {...}) NON trouvé dans main.js');
  console.log('  → main.js appelle peut-être initInput sans éléments');
}

// Vérifier updateInputFrame
if (mainSrc.includes('updateInputFrame')) {
  console.log('\n✅ updateInputFrame utilisé dans main.js');
} else {
  console.log('\n⚠ updateInputFrame NON utilisé dans main.js');
}

// =====================================================
//  2) RÉÉCRITURE COMPLÈTE de input.js
// =====================================================
console.log('\n→ Réécriture complète de src/input.js...\n');

const inputPath = path.join(SRC, 'input.js');

// Backup
if (fs.existsSync(inputPath) && !DRY) {
  const backupPath = inputPath + '.truncated-backup';
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(inputPath, backupPath);
    console.log(`  💾 backup : ${backupPath}`);
  }
}

const newInputContent = `// =====================================================
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
`;

if (DRY) {
  console.log('  [dry] réécrirait src/input.js (' + newInputContent.length + ' caractères)');
} else {
  fs.writeFileSync(inputPath, newInputContent);
  console.log(`  ✓ src/input.js réécrit (${newInputContent.length} caractères, ${newInputContent.split('\n').length} lignes)`);
}

// =====================================================
//  3) Vérifier / patcher main.js pour passer les bons éléments
// =====================================================
console.log('\n→ Vérification main.js...\n');

if (initCallMatch) {
  const currentCall = initCallMatch[0];
  const hasInteract = currentCall.includes('interactBtn');
  const hasScan = currentCall.includes('scanBtn');
  const hasSpirit = currentCall.includes('spiritBtn');

  if (hasInteract && hasScan && hasSpirit) {
    console.log('✅ main.js passe déjà les nouveaux boutons à initInput');
  } else {
    console.log('⚠ main.js ne passe pas tous les nouveaux boutons');
    console.log('  interactBtn:', hasInteract ? '✅' : '❌');
    console.log('  scanBtn:', hasScan ? '✅' : '❌');
    console.log('  spiritBtn:', hasSpirit ? '✅' : '❌');

    const newCall = `initInput(renderer, {
  joyBase: ui.joyBase,
  joyKnob: ui.joyKnob,
  jumpBtn: ui.jumpBtn,
  interactBtn: ui.interactBtn,
  scanBtn: ui.scanBtn,
  spiritBtn: ui.spiritBtn,
  touchUI: ui.touchUI
})`;

    if (DRY) {
      console.log('  [dry] remplacerait l\'appel initInput');
    } else {
      mainSrc = mainSrc.replace(initCallMatch[0], newCall);
      fs.writeFileSync(mainPath, mainSrc);
      console.log('  ✓ main.js — initInput patché avec tous les boutons');
    }
  }
} else {
  console.log('⚠ initInput non trouvé dans main.js');
  console.log('  → Il faudra le vérifier manuellement');
}

// =====================================================
//  4) VÉRIFICATION finale
// =====================================================
console.log('\n=== VÉRIFICATION ===\n');

if (!DRY) {
  const finalInput = fs.readFileSync(inputPath, 'utf8');
  const finalMain = fs.readFileSync(mainPath, 'utf8');

  const checks = [
    { ok: finalInput.includes('export function initInput'), label: 'input.js — initInput défini' },
    { ok: finalInput.includes('export function updateInputFrame'), label: 'input.js — updateInputFrame défini' },
    { ok: finalInput.includes('interactBtn'), label: 'input.js — interactBtn passé' },
    { ok: finalInput.includes('scanBtn'), label: 'input.js — scanBtn passé' },
    { ok: finalInput.includes('spiritBtn'), label: 'input.js — spiritBtn passé' },
    { ok: finalInput.includes('onStateChange'), label: 'input.js — callback onStateChange' },
    { ok: finalInput.includes('input.moveX = s.moveX'), label: 'input.js — moveX copié' },
    { ok: /initInput\s*\(renderer/.test(finalMain), label: 'main.js — initInput appelé' },
    { ok: finalMain.includes('interactBtn: ui.interactBtn'), label: 'main.js — interactBtn passé' },
    { ok: finalMain.includes('updateInputFrame'), label: 'main.js — updateInputFrame utilisé' }
  ];

  let okCount = 0;
  for (const c of checks) {
    if (c.ok) { console.log(`  ✅ ${c.label}`); okCount++; }
    else { console.log(`  ⚠ ${c.label}`); }
  }

  // Vérif accolades
  const openB = (finalInput.match(/\{/g) || []).length;
  const closeB = (finalInput.match(/\}/g) || []).length;
  if (openB === closeB) {
    console.log(`  ✅ input.js — accolades équilibrées (${openB}/${closeB})`);
    okCount++;
  } else {
    console.log(`  ⚠ input.js — accolades déséquilibrées (${openB} vs ${closeB})`);
  }

  // Vérif parenthèses
  const openP = (finalInput.match(/\(/g) || []).length;
  const closeP = (finalInput.match(/\)/g) || []).length;
  if (openP === closeP) {
    console.log(`  ✅ input.js — parenthèses équilibrées (${openP}/${closeP})`);
  } else {
    console.log(`  ⚠ input.js — parenthèses déséquilibrées (${openP} vs ${closeP})`);
  }

  console.log(`\n=== FIN : ${okCount}/${checks.length + 1} OK ===\n`);

  if (okCount === checks.length + 1) {
    console.log('✅ input.js réécrit avec succès.\n');
    console.log('Tests à faire :');
    console.log('  1. Ctrl+Shift+R dans le navigateur (vider cache)');
    console.log('  2. Console F12 → aucune erreur');
    console.log('');
    console.log('  DESKTOP :');
    console.log('  3. ZQSD/WASD → squirrel bouge');
    console.log('  4. Souris → caméra tourne');
    console.log('  5. Espace → saut / plané');
    console.log('  6. E → interact');
    console.log('  7. Manette → tout fonctionne');
    console.log('  8. Pas de boutons tactiles visibles (desktop)');
    console.log('');
    console.log('  MOBILE :');
    console.log('  9. Tape l\'écran titre → jeu se lance');
    console.log(' 10. Boutons SAUT / AGIR / SCAN / ESPRIT visibles');
    console.log(' 11. Joystick G → bouge');
    console.log(' 12. Bouton SAUT → saute / plane');
    console.log(' 13. Bouton AGIR près d\'une souche → prompt plantation');
    console.log('');
    console.log('Si problème :');
    console.log('  → backup dans src/input.js.truncated-backup');
    console.log('  → copie-moi le message d\'erreur console F12');
  } else {
    console.log('⚠ Certaines vérifications ont échoué.');
    process.exit(1);
  }
}
