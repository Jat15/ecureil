import * as THREE from 'three';
import { state, initState, restoreState, updateSquirrel, getGlideStreak } from './physics.js';
import { seeds, stumps, growingTrees, updateSeeds, updateStumps,
  updateGrowingTrees, setCollectableHooks, setSeedCount, setPlantedCount,
  setClockRef, seedCount, plantedCount, totalStumps, plantedTypes,
  restorePlantedStump, restoreCollectedSeed } from './collectables.js';
import { setupSeeds, setupStumps } from './collectables.js';
import { updateInputFrame, input, isTouchDevice, camPitch, camDist,
  consumeYawPitch, getCamPitch, setCamPitch, getCamDist } from './input.js';
import { ui, showToast, tickToast, screenFlash,
  fillHerbier, showPlantPrompt, hidePlantPrompt, updatePlanetBar, updateHUD, initUI } from './ui.js';
import { updateBirds, spawnBird } from './effects.js';
import { saveGame, buildSaveData } from './save.js';

export function wireCollectableHooks(scene, particles) {
  setCollectableHooks({
    scene, particles,
    showToast, screenFlash,
    fillHerbier, showPlantPrompt, hidePlantPrompt,
    updatePlanetBar: () => updatePlanetBar(plantedCount, totalStumps),
    spawnBird: (c, n, k) => spawnBird(scene, c, n, k)
  });
}

export function initGameplay(scene, particles, savedData) {
  initState();
  setupSeeds();
  setupStumps();

  if (savedData) {
    // Restaurer plantations
    for (const p of savedData.planted || []) {
      restorePlantedStump(p.stumpIdx, p.typeName, p.isCharged);
    }
    // Restaurer graines collectées
    for (const idx of savedData.collectedSeeds || []) {
      restoreCollectedSeed(idx);
    }
    // Restaurer herbier complet
    for (const t of savedData.plantedTypes || []) {
      plantedTypes.add(t);
      fillHerbier(t);
    }
    // Restaurer position
    if (savedData.playerPos && savedData.playerUp) {
      restoreState(savedData.playerPos, savedData.playerUp);
    }
    updatePlanetBar(plantedCount, totalStumps);
  }
}

export function makeSnapshot() {
  return {
    state, seedCount, plantedCount, totalStumps,
    glideStreak: getGlideStreak(), input, isTouchDevice
  };
}

export function buildSave(seed) {
  const planted = [];
  for (let i = 0; i < stumps.length; i++) {
    const st = stumps[i];
    if (st.planted) {
      // Retrouver le type d'arbre planté : on regarde dans plantedTypes
      // Plus simple : on stocke le type via une map à la plantation.
      // Pour cette V1, on cherche l'arbre poussé le plus proche
      const worldP = st.position;
      let bestTree = null, bestDist = Infinity;
      for (const tr of growingTrees) {} // pas fiable
      // On stocke plutôt via st.plantedTypeName si dispo
      const typeName = st.plantedTypeName || st._lastPlantedType || null;
      if (typeName) {
        planted.push({ stumpIdx: i, typeName, isCharged: !!st._lastPlantedCharged });
      }
    }
  }
  const collected = [];
  for (let i = 0; i < seeds.length; i++) if (seeds[i].collected) collected.push(i);
  return buildSaveData({
    seed,
    planted,
    collectedSeeds: collected,
    plantedTypes,
    playerPos: state.pos,
    playerUp: state.up
  });
}

export function autoSave(seed) {
  const data = buildSave(seed);
  saveGame(data);
}
