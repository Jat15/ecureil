import * as THREE from 'three';
import { trees, buildOneTree, getTreeMaterial } from './trees.js';
import { terrainRadius, terrainNormal, PLANET_R } from './planet.js';
import { getBiomeId } from './biomes.js';
import { pickTreeTypeForBiome, rollTreeParams, TREE_TYPES } from './treeTypes.js';
import { state, SQUIRREL_R } from './physics.js';
import { audio } from './audio.js';
import { rng } from './rng.js';

export const seeds = [];
export const stumps = [];
export const growingTrees = [];
export let seedCount = 0;
export let plantedCount = 0;
export let totalStumps = 0;
export const plantedTypes = new Set();

export function setSeedCount(v) { seedCount = v; }
export function setPlantedCount(v) { plantedCount = v; }

// Hooks injectés par le HUD
const hooks = {};
export function setCollectableHooks(h) { Object.assign(hooks, h); }

export function createSeed(pos, normal, typeName) {
  const group = new THREE.Group();
  group.position.copy(pos);
  const color = 0xffcc44;
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 1), new THREE.MeshBasicMaterial({ color }));
  group.add(core);
  const halo = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.35, 1),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  group.add(halo);
  const beamGeo = new THREE.CylinderGeometry(0.04, 0.18, 4, 6, 1, true);
  beamGeo.translate(0, 2, 0);
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  }));
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  group.add(beam);
  // scene.add — on utilise hooks.scene
  if (hooks.scene) hooks.scene.add(group);
  seeds.push({
    group, core, halo, beam,
    basePos: pos.clone(), normal: normal.clone(),
    phase: Math.random() * Math.PI * 2,
    collected: false, typeName, charged: false
  });
}

export function setupSeeds() {
  const pool = trees.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picks = Math.min(25, pool.length);
  for (let i = 0; i < picks; i++) {
    const tree = pool[i];
    if (!tree.segments.length) continue;
    const tip = tree.segments[tree.segments.length - 1].to;
    const seedPos = tip.clone().addScaledVector(tree.normal, 0.7);
    createSeed(seedPos, tree.normal, tree.typeName);
  }
}

export function setupStumps() {
  const N = 80;
  const ga = Math.PI * (3 - Math.sqrt(5));
  const placedStumps = [];
  for (let i = 0; i < N && stumps.length < 40; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = ga * i * 1.37;
    const d = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).normalize();
    d.x += (rng() - 0.5) * 0.15;
    d.y += (rng() - 0.5) * 0.15;
    d.z += (rng() - 0.5) * 0.15;
    d.normalize();
    let tooClose = false;
    const worldP = d.clone().multiplyScalar(PLANET_R);
    for (const tree of trees) if (tree.base.distanceTo(worldP) < 3.0) { tooClose = true; break; }
    if (tooClose) continue;
    for (const s of placedStumps) if (s.distanceTo(d) < 0.18) { tooClose = true; break; }
    if (tooClose) continue;
    placedStumps.push(d.clone());

    const rad = terrainRadius(d);
    const nrm = terrainNormal(d);
    const basePos = d.clone().multiplyScalar(rad);
    const group = new THREE.Group();
    group.position.copy(basePos);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm);

    const stumpGeo = new THREE.CylinderGeometry(0.35, 0.42, 0.4, 6);
    stumpGeo.translate(0, 0.15, 0);
    const stumpMesh = new THREE.Mesh(stumpGeo, new THREE.MeshLambertMaterial({ color: 0x4a3524, flatShading: true }));
    group.add(stumpMesh);

    const ringGeo = new THREE.TorusGeometry(0.7, 0.07, 6, 20);
    ringGeo.rotateX(Math.PI / 2);
    ringGeo.translate(0, 0.08, 0);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x6fffaa, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    group.add(ring);

    const progressRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.05, 6, 24, Math.PI * 2),
      new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    progressRing.rotation.x = -Math.PI / 2;
    progressRing.position.y = 0.15;
    progressRing.visible = false;
    group.add(progressRing);

    if (hooks.scene) hooks.scene.add(group);
    stumps.push({
      group, ring, stumpMesh, progressRing,
      position: basePos, normal: nrm, dir: d.clone(),
      planted: false, plantProgress: 0, phase: Math.random() * Math.PI * 2
    });
  }
  totalStumps = stumps.length;
}

let nearStump = null;
export function getNearStump() { return nearStump; }

export function updateSeeds(dt, clockTime) {
  const glideStreak = state._glideStreak || 0;
  for (const s of seeds) {
    if (s.collected) continue;
    s.core.rotation.y += dt * 1.6;
    s.halo.rotation.x += dt * 0.8;
    s.halo.rotation.z += dt * 1.2;
    const bob = Math.sin(clockTime * 2.2 + s.phase) * 0.15;
    s.group.position.copy(s.basePos).addScaledVector(s.normal, bob);
    s.halo.scale.setScalar(1 + Math.sin(clockTime * 3 + s.phase) * 0.18);
    s.beam.material.opacity = 0.12 + Math.sin(clockTime * 2 + s.phase) * 0.06;

    if (state.gliding && glideStreak > 10 && !s.charged) {
      s.charged = true;
      s.core.material.color.setHex(0xff88ff);
      s.halo.material.color.setHex(0xff88ff);
      s.beam.material.color.setHex(0xff88ff);
    }

    if (s.group.position.distanceTo(state.pos) < 1.4) {
      s.collected = true;
      s.group.visible = false;
      seedCount++;
      const seedPos = s.group.position.clone();
      audio.seed();
      if (hooks.particles) hooks.particles.emit(seedPos, 10, s.charged ? 0xff88ff : 0xffcc44, 3, 0.7);
      if (hooks.screenFlash) hooks.screenFlash(s.charged ? 'rgba(255,136,255,0.4)' : 'rgba(255,204,68,0.35)', 0.2);
    }
  }
}

export function updateStumps(dt, input) {
  nearStump = null;
  for (const st of stumps) {
    if (st.planted) continue;
    st.ring.material.opacity = 0.4 + Math.sin(clockTime_global() * 2.5 + st.phase) * 0.25;
    st.ring.rotation.z += dt * 0.6;
    const near = st.position.distanceTo(state.pos) < 1.9;
    if (near && seedCount > 0) {
      nearStump = st;
      st.ring.material.color.setHex(0xffcc44);
    } else {
      st.ring.material.color.setHex(0x6fffaa);
    }
    if (nearStump === st && input.plantHeld && seedCount > 0) {
      if (st.plantProgress === 0) audio.plantStart();
      st.plantProgress += dt / 1.2;
      if (st.plantProgress >= 1) {
        st.plantProgress = 1;
        st.planted = true;
        seedCount--;
        st.ring.visible = false;
        st.progressRing.visible = false;
        st.stumpMesh.scale.setScalar(0.001);
        plantTreeAt(st);
        plantedCount++;
        if (hooks.updatePlanetBar) hooks.updatePlanetBar();
        if (plantedCount % 3 === 0 && hooks.showToast) {
          hooks.showToast(`🌳 Forêt : ${plantedCount}/${totalStumps} plantés !`, false);
          if (hooks.screenFlash) hooks.screenFlash('rgba(111,255,170,0.3)', 0.4);
        }
      }
    } else {
      if (st.plantProgress > 0) st.plantProgress = Math.max(0, st.plantProgress - dt * 3);
    }
    st.progressRing.visible = st.plantProgress > 0.01;
    st.progressRing.scale.setScalar(Math.max(0.01, st.plantProgress));
  }
  if (nearStump && seedCount > 0) {
    if (hooks.showPlantPrompt) hooks.showPlantPrompt(nearStump.plantProgress);
  } else {
    if (hooks.hidePlantPrompt) hooks.hidePlantPrompt();
  }
}

let _clockRef = 0;
function clockTime_global() { return _clockRef; }
export function setClockRef(t) { _clockRef = t; }

export function plantTreeAt(stump, forceType = null, forceScale = 1) {
  const biomeId = getBiomeId(stump.dir);
  const typeName = forceType || pickTreeTypeForBiome(biomeId);
  const isCharged = forceType ? forceScale > 1 : Math.random() < 0.2;
  const params = rollTreeParams(typeName, isCharged ? 1.3 : 1);

  let t1 = new THREE.Vector3(0, 1, 0).cross(stump.normal);
  if (t1.lengthSq() < 1e-6) t1.set(1, 0, 0).cross(stump.normal);
  t1.normalize();
  const t2 = new THREE.Vector3().crossVectors(t1, stump.normal).normalize();
  const basePos = stump.position.clone().addScaledVector(stump.normal, -0.28);

  const result = buildOneTree(basePos, stump.normal, t1, t2, params);
  if (!result) return null;

  result.tree.growing = true;
  const mesh = new THREE.Mesh(result.geo, getTreeMaterial());
  mesh.frustumCulled = false;
  mesh.scale.setScalar(0.001);
  if (hooks.scene) hooks.scene.add(mesh);

  trees.push(result.tree);
  growingTrees.push({
    mesh, target: 1.0, current: 0.001, tree: result.tree,
    elapsed: 0, duration: 5.0, normal: stump.normal.clone(),
    lastTick: 0, stumpPos: stump.position.clone()
  });

  if (!plantedTypes.has(typeName)) {
    plantedTypes.add(typeName);
    if (hooks.fillHerbier) hooks.fillHerbier(typeName);
    setTimeout(() => {
      if (hooks.showToast) hooks.showToast(`✨ Nouvelle espèce : ${typeName} !`, true);
      if (hooks.screenFlash) hooks.screenFlash('rgba(255,204,68,0.5)', 0.5);
      audio.combo(8);
    }, 800);
  }

  audio.plantComplete();
  stump.plantedTypeName = typeName;
  stump._lastPlantedCharged = isCharged;
  return { typeName, isCharged };
}

export function updateGrowingTrees(dt) {
  for (let i = growingTrees.length - 1; i >= 0; i--) {
    const g = growingTrees[i];
    g.elapsed += dt;
    const t = Math.min(1, g.elapsed / g.duration);
    const eased = 1 - Math.pow(1 - t, 3);
    g.current = 0.001 + eased * (g.target - 0.001);
    g.mesh.scale.setScalar(g.current);
    if (Math.random() < dt * 20 && hooks.particles) {
      hooks.particles.emitUp(g.stumpPos, g.normal, 2, 0x6fffaa, 2.5, 1.2);
    }
    g.lastTick += dt;
    if (g.lastTick > 0.3) { g.lastTick = 0; audio.growTick(); }
    if (t >= 1) {
      g.tree.growing = false;
      if (hooks.spawnBird) hooks.spawnBird(g.tree.base.clone().addScaledVector(g.tree.normal, 0.5), g.tree.normal, 1 + Math.floor(Math.random() * 2));
      growingTrees.splice(i, 1);
    }
  }
}

// Restauration : marque une souche comme déjà plantée sans rejouer l'animation
export function restorePlantedStump(stumpIdx, typeName, isCharged = false) {
  const st = stumps[stumpIdx];
  if (!st || st.planted) return;
  st.planted = true;
  st.ring.visible = false;
  st.stumpMesh.scale.setScalar(0.001);
  const result = plantTreeAt(st, typeName, isCharged ? 1.3 : 1);
  if (result) {
    // Skip animation : on force la taille finale
    const g = growingTrees[growingTrees.length - 1];
    if (g) {
      g.mesh.scale.setScalar(1.0);
      g.tree.growing = false;
      growingTrees.pop();
    }
    plantedCount++;
    if (!plantedTypes.has(typeName)) {
      plantedTypes.add(typeName);
      if (hooks.fillHerbier) hooks.fillHerbier(typeName);
    }
    return true;
  }
  return false;
}

// Restauration : marque une graine comme collectée
export function restoreCollectedSeed(seedIdx) {
  const s = seeds[seedIdx];
  if (!s || s.collected) return;
  s.collected = true;
  s.group.visible = false;
  seedCount++;
}
