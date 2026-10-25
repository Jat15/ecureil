import * as THREE from 'three';
import { initRng } from './rng.js';
import { initRng as _unused } from './rng.js';
import { buildPlanet, PLANET_R } from './planet.js';
import { buildInitialForestV2, trees, uTime } from './trees.js';
import { buildSquirrelMesh, squirrel, legs, membraneL, membraneR, tailPivot } from './squirrel.js';
import { ParticlePool, updateBirds, spawnBird } from './effects.js';
import { state, updateSquirrel, GRAVITY, WALK_SPEED, SQUIRREL_R, getGlideStreak } from './physics.js';
import { initInput, updateInputFrame, input, isTouchDevice, setGameStarted,
  consumeYawPitch, getCamPitch, setCamPitch, getCamDist } from './input.js';
import { ui, initUI, updateHUD, tickToast, showToast, updatePlanetBar } from './ui.js';
import { terrainRadius } from './planet.js';
import { initRng as initRngAgain } from './rng.js';
import { initGameplay, wireCollectableHooks, makeSnapshot, autoSave, buildSave } from './gameState.js';
import { loadGame, saveGame, clearSave } from './save.js';
import { endurance } from './endurance.js';
import { setupNests, updateNests, getNestProgress, nests } from './nests.js';
import { createSquirrelXray } from './xray.js';
import { updateEnduranceUI, updateNestCounter, toggleGrabPrompt } from './ui.js';
import { updateSeeds, updateStumps, updateGrowingTrees, setClockRef,
  seedCount, plantedCount, totalStumps, setCollectableHooks } from './collectables.js';

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
initInput(renderer, {
  joyBase: ui.joyBase, joyKnob: ui.joyKnob, jumpBtn: ui.jumpBtn, plantBtn: ui.plantBtn
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

// Restaurer ou setup initial
const savedToRestore = saved && saved.seed === worldSeed ? saved : null;
// Note : initGameplay utilise rng APRÈS initialisation, donc setup graines/souches reproductible
initGameplay(scene, particles, savedToRestore);
setupNests(scene);
for (const n of nests) {
  n.onVisit = () => {
    showToast('🥚 Nid découvert !', true);
    endurance.gain(30);
  };
}

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
  camera.position.lerp(desired, 1 - Math.exp(-13 * dt));
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
renderer.domElement.addEventListener('click', () => {
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
  // Sync glideStreak dans state pour useSeeds
  updateSquirrel(dt, input, camera);
  // Exposer glideStreak
  state._glideStreak = getGlideStreak();
  updateSeeds(dt, clockTime);
  updateStumps(dt, input);
  updateGrowingTrees(dt);
  updateBirds(dt, clockTime);
  updateNests(dt, clockTime);
  particles.update(dt, state.up.clone().negate());
  updateCamera(dt);
  updateVisuals(dt);

  updateEnduranceUI(endurance.current, endurance.max);
  const np = getNestProgress();
  updateNestCounter(np.visited, np.total);
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
