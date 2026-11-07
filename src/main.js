import * as THREE from 'three';
import { initRng } from './rng.js';
import { initRng as _unused } from './rng.js';
import { buildPlanet, PLANET_R } from './planet.js';
import { buildInitialForestV2, trees, uTime } from './trees.js';
import { buildSquirrelMesh, squirrel, legs, membraneL, membraneR, tailPivot } from './squirrel.js';
import { ParticlePool, updateBirds, spawnBird } from './effects.js';
import { state, updateSquirrel, GRAVITY, WALK_SPEED, SQUIRREL_R, getGlideStreak } from './physics.js';
import { initInput, updateInputFrame, input, isTouchDevice, setGameStarted, consumeYawPitch, getCamPitch, setCamPitch, getCamDist } from './input.js';
import { ui, initUI, updateHUD, tickToast, showToast, updatePlanetBar } from './ui.js';
import { terrainRadius } from './planet.js';
import { initRng as initRngAgain } from './rng.js';
import { initGameplay, wireCollectableHooks, makeSnapshot, autoSave, buildSave } from './gameState.js';
import { loadGame, saveGame, clearSave } from './save.js';
import { createSquirrelXray } from './xray.js';
import { toggleGrabPrompt } from './ui.js';
import { updateScanMode, scanState } from './scanner/scanMode.js';
import { initScanReveal, applyScanVisuals } from './scanner/scanReveal.js';
import { updateScanUI } from './scanner/scanUI.js';
import { maybeShowScanTutorial } from './tutorial.js';
import { updateSeeds, updateStumps, updateGrowingTrees, setClockRef, seedCount, plantedCount, totalStumps, setCollectableHooks } from './collectables.js';

// ---------- SCENE ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05080f);
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 3000);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const sun = new THREE.DirectionalLight(0xfff0d6, 2.4);
sun.position.set(60, 40, 45);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x7ab4ff, 0x1a2030, 1.15));
scene.add(new THREE.AmbientLight(0x40506a, 0.9));

(function makeStars() {
  const N = 2600;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(420 + Math.random() * 500);
    pos[i*3]=v.x; pos[i*3+1]=v.y; pos[i*3+2]=v.z;
    c.setHSL(0.55 + Math.random()*0.12, 0.5, 0.55 + Math.random()*0.45);
    col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({
    size: 2.2, sizeAttenuation: true, vertexColors: true,
    transparent: true, opacity: 0.9, depthWrite: false
  })));
})();

// ---------- GAME STATE ----------
let worldSeed = Date.now() & 0xffffffff;
let particles = null;
let camClock = 0;

const overlay = document.getElementById('overlay');
const flashEl = document.getElementById('flash');

// Initialisation UI + input (avant tout car les hooks s'en servent)
initUI();

// P0.3 — touche UI visible si device tactile, caché sinon
if (isTouchDevice) {
  document.body.classList.add('touch-ui-active');
} else {
  document.body.classList.remove('touch-ui-active');
}
// Cacher les boutons tactiles si manette connectée
window.addEventListener('gamepadconnected', () => {
  document.body.classList.add('gamepad-active');
  document.body.classList.remove('touch-ui-active');
});
window.addEventListener('gamepaddisconnected', () => {
  document.body.classList.remove('gamepad-active');
  if (isTouchDevice) document.body.classList.add('touch-ui-active');
});

initInput(renderer, {
  joyBase: ui.joyBase,
  joyKnob: ui.joyKnob,
  jumpBtn: ui.jumpBtn,
  interactBtn: ui.interactBtn,
  scanBtn: ui.scanBtn,
  spiritBtn: ui.spiritBtn,
  touchUI: ui.touchUI
});
wireCollectableHooks(scene, null); // particles set après
particles = new ParticlePool(scene, 250);
setCollectableHooks({ scene, particles });

// Chargement ou génération
const saved = loadGame();
if (saved && saved.seed !== undefined && saved.seed !== null) {
  worldSeed = saved.seed;
}
initRng(worldSeed);
buildPlanet(scene);
buildInitialForestV2(scene);
buildSquirrelMesh(scene);
createSquirrelXray(squirrel);
initScanReveal(scene);

// Restaurer ou setup initial
const savedToRestore = saved && saved.seed === worldSeed ? saved : null;
// Note : initGameplay utilise rng APRÈS initialisation, donc setup graines/souches reproductible
initGameplay(scene, particles, savedToRestore);

// Hook auto-save dans UI
ui.onManualSave = () => {
  const data = buildSave(worldSeed);
  saveGame(data);
  showToast('💾 Sauvegardé', true);
};
setGameStarted(false);

// Shadow écureuil
const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.62, 14),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
);
scene.add(shadow);

// ---------- CAMERA ----------
const _camTarget = new THREE.Vector3();

// P0.4b — caméra anti-clipping
const _camRaycaster = new THREE.Raycaster();
const _camDir = new THREE.Vector3();
const _camHitTmp = new THREE.Vector3();
let _camTreeList = null;
let _camTreeListCount = -1;
function _collectTreeMeshes() {
  const list = [];
  const seen = new Set();
  for (const t of trees) {
    if (!t) continue;
    const root = t.group || t.mesh || t.root || t.object3d || t.object || (t.isObject3D ? t : null);
    if (!root || !root.isObject3D) continue;
    root.traverse(o => {
      if (o.isMesh && !seen.has(o)) { seen.add(o); list.push(o); }
    });
  }
  return list;
}
function _getTreeMeshes() {
  if (!_camTreeList || _camTreeListCount !== trees.length) {
    _camTreeList = _collectTreeMeshes();
    _camTreeListCount = trees.length;
  }
  return _camTreeList;
}
function updateCamera(dt) {
  const up = state.up.clone();
  _camTarget.copy(state.pos).addScaledVector(up, 0.75);
  const toCam = camera.position.clone().sub(_camTarget);
  const radialComp = toCam.dot(up);
  let tang = toCam.clone().addScaledVector(up, -radialComp);
  if (tang.lengthSq() < 1e-6) {
    tang.set(1, 0, 0).addScaledVector(up, -up.x);
    if (tang.lengthSq() < 1e-6) tang.set(0, 0, 1).addScaledVector(up, -up.z);
  }
  tang.normalize();
  const yp = consumeYawPitch();
  tang.applyAxisAngle(up, yp.y);
  setCamPitch(THREE.MathUtils.clamp(getCamPitch() + yp.p, -0.30, 1.18));
  const horiz = Math.cos(getCamPitch()) * getCamDist();
  const vert  = Math.sin(getCamPitch()) * getCamDist();
  const desired = _camTarget.clone().addScaledVector(tang, horiz).addScaledVector(up, vert);

  // P0.4b — anti-clipping : raycast pivot -> caméra désirée
  let finalPos = desired;
  _camDir.copy(desired).sub(_camTarget);
  const rayLen = _camDir.length();
  if (rayLen > 1e-4) {
    _camDir.divideScalar(rayLen);
    let nearest = rayLen;

    // Arbres (raycast meshes)
    _camRaycaster.set(_camTarget, _camDir);
    _camRaycaster.far = rayLen;
    const hits = _camRaycaster.intersectObjects(_getTreeMeshes(), false);
    if (hits.length > 0 && hits[0].distance < nearest) nearest = hits[0].distance;

    // Terrain (sphère bruitée, 8 échantillons)
    const SAFETY = 0.35;
    const STEPS = 8;
    for (let i = 1; i <= STEPS; i++) {
      const t = (i / STEPS) * rayLen;
      _camHitTmp.copy(_camTarget).addScaledVector(_camDir, t);
      const r = _camHitTmp.length();
      if (r < 1e-4) continue;
      const dirN = _camHitTmp.clone().divideScalar(r);
      const groundR = terrainRadius(dirN);
      if (r < groundR + SAFETY) {
        if (t < nearest) nearest = t;
        break;
      }
    }

    if (nearest < rayLen - 1e-4) {
      const pulled = Math.max(0.8, nearest - 0.3);
      finalPos = _camTarget.clone().addScaledVector(_camDir, pulled);
    }
  }

  camera.position.lerp(finalPos, 1 - Math.exp(-13 * dt));

  // Plancher sol : ne jamais passer sous le terrain
  const cp = camera.position.length();
  if (cp > 1e-4) {
    const cd = camera.position.clone().divideScalar(cp);
    const gr = terrainRadius(cd) + 0.35;
    if (cp < gr) camera.position.copy(cd).multiplyScalar(gr);
  }

  camera.up.copy(up);
  camera.lookAt(_camTarget);
}
(function initCamera() {
  const up0 = state.up.clone();
  const tgt = state.pos.clone().addScaledVector(up0, 0.75);
  camera.position.copy(tgt)
    .addScaledVector(state.forward, -getCamDist() * Math.cos(getCamPitch()))
    .addScaledVector(up0, getCamDist() * Math.sin(getCamPitch()));
  camera.up.copy(up0);
  camera.lookAt(tgt);
})();

// ---------- OVERLAY ----------
overlay.addEventListener('click', () => {
  overlay.classList.add('hidden');
  setGameStarted(true);
  if (!isTouchDevice) renderer.domElement.requestPointerLock();
  import('./audio.js').then(m => m.audio.init());
});


  // P0.3 fix — touchstart fallback pour dismiss instantané sur mobile
  overlay.addEventListener('touchstart', (e) => {
    if (overlay.style.pointerEvents === 'none') return;
    if (overlay.classList.contains('hidden')) return;
    e.preventDefault();
    overlay.click();
  }, { passive: false });renderer.domElement.addEventListener('click', () => {
  if (!isTouchDevice && document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
  }
});

// ---------- VISUELS ----------
let clockTime = 0;
let runPhase = 0;
function updateVisuals(dt) {
  clockTime += dt;
  setClockRef(clockTime);
  tickToast(dt);
  const spread = state.gliding ? 1 : 0.10;
  const k = 1 - Math.exp(-14 * dt);
  membraneL.scale.x = THREE.MathUtils.lerp(membraneL.scale.x, spread, k);
  membraneR.scale.x = THREE.MathUtils.lerp(membraneR.scale.x, spread, k);
  const speed = state.vel.length();
  const amp = state.grounded && !state.climbing ? Math.min(speed / WALK_SPEED, 1) * 0.55
    : (state.gliding ? 0.32 : (state.climbing ? 0.45 : 0.12));
  runPhase += dt * (state.grounded ? Math.min(speed, 9) * 2.3 : (state.climbing ? 6 : 2.5));
  for (let i = 0; i < legs.length; i++) {
    const offset = (i % 2 === 0 ? 0 : Math.PI) + (i < 2 ? 0 : Math.PI * 0.55);
    legs[i].rotation.x = Math.sin(runPhase + offset) * amp;
    if (state.gliding) legs[i].rotation.z = (i % 2 === 0 ? 1 : -1) * 0.5;
    else legs[i].rotation.z = THREE.MathUtils.lerp(legs[i].rotation.z, 0, k);
  }
  tailPivot.rotation.z = Math.sin(clockTime * 2.2) * 0.09;
  tailPivot.rotation.x = -0.80 + Math.sin(clockTime * 1.4) * 0.07 + (state.gliding ? 0.20 : 0);

  const d = state.pos.clone().normalize();
  const gr = terrainRadius(d);
  const alt = state.pos.length() - gr - SQUIRREL_R;
  shadow.position.copy(d).multiplyScalar(gr + 0.06);
  shadow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
  const sc = THREE.MathUtils.clamp(1 - alt / 14, 0.15, 1);
  shadow.scale.setScalar(sc * 1.25);
  shadow.material.opacity = 0.30 * sc;
  shadow.visible = !state.climbing;

  updateHUD(makeSnapshot());
}

// ---------- LOOP ----------
let last = performance.now();
let saveAccum = 0;

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  let dt = (now - last) / 1000;
  last = now;
  dt = Math.min(dt, 0.05);

  uTime.value += dt;
  updateInputFrame(dt);
  // P0.2 savePressed (clean)
  if (input.savePressed && ui.onManualSave) ui.onManualSave();
  // Sync glideStreak dans state pour useSeeds
  updateSquirrel(dt, input, camera);
  // Exposer glideStreak
  state._glideStreak = getGlideStreak();
  updateSeeds(dt, clockTime);
  updateStumps(dt, input);
  updateGrowingTrees(dt);
  updateBirds(dt, clockTime);
  particles.update(dt, state.up.clone().negate());
  updateCamera(dt);
  updateVisuals(dt);

  // P1 — scanner spectral
  updateScanMode(dt, clockTime);
  applyScanVisuals(scanState);
  updateScanUI(scanState);
  maybeShowScanTutorial(scanState, showToast);

  toggleGrabPrompt(!!state.nearGrab);

  // Auto-save toutes les 5s (uniquement si jeu démarré)
  if (window.__gameStarted) {
    saveAccum += dt;
    if (saveAccum > 5) {
      saveAccum = 0;
      try { autoSave(worldSeed); } catch (e) {}
    }
  }

  renderer.render(scene, camera);
}
// Marquer démarrage
const origSetGameStarted = setGameStarted;
// Patch simple : on lit ui/overlay
overlay.addEventListener('click', () => { window.__gameStarted = true; }, { once: false });

animate();
