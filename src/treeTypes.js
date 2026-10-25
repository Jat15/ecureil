import { randInRange, randIntInRange, randPick } from './rng.js';
import * as THREE from 'three';

export const TREE_TYPES = {
  chene:        { trunkH:[2.6,4.2], trunkR:[0.42,0.65], mainBranches:[4,6], maxDepth:[3,4], leafSize:[0.42,0.58], leavesPerTip:[8,11], firstTilt:[0.68,0.86], trunkColors:[0x6b4b34,0x5a3d28,0x4d3624], leafColors:[0x3a6b3f,0x4e8c42,0x5f9e4a], hasLeaves:true, icon:'🌳' },
  pin:          { trunkH:[4.0,6.0], trunkR:[0.28,0.42], mainBranches:[5,7], maxDepth:[3,3], leafSize:[0.30,0.42], leavesPerTip:[6,8], firstTilt:[0.42,0.58], trunkColors:[0x4d3a28,0x3d2f20], leafColors:[0x2a5a2a,0x1f4a1f,0x356030], hasLeaves:true, icon:'🌲' },
  bouleau:      { trunkH:[3.5,5.5], trunkR:[0.22,0.32], mainBranches:[3,3], maxDepth:[3,3], leafSize:[0.32,0.44], leavesPerTip:[5,7], firstTilt:[0.30,0.45], trunkColors:[0xd8d0c0,0xc8c0b0], leafColors:[0x7ab05a,0x8ac06a,0x6aa04a], hasLeaves:true, icon:'🌿' },
  saule:        { trunkH:[2.8,4.5], trunkR:[0.35,0.55], mainBranches:[3,4], maxDepth:[3,4], leafSize:[0.45,0.60], leavesPerTip:[7,10], firstTilt:[0.78,0.98], trunkColors:[0x5a4530,0x4a3520], leafColors:[0x8aa04a,0x7a9040,0x9ab050], hasLeaves:true, icon:'🌾' },
  palmier:      { trunkH:[5.0,8.0], trunkR:[0.25,0.38], mainBranches:[6,8], maxDepth:[1,2], leafSize:[0.60,0.85], leavesPerTip:[8,12], firstTilt:[0.85,1.10], trunkColors:[0x8a6a48,0x7a5a38], leafColors:[0x4a9030,0x5aa038,0x3a8028], hasLeaves:true, icon:'🌴' },
  banian:       { trunkH:[3.5,5.0], trunkR:[0.55,0.85], mainBranches:[5,7], maxDepth:[3,4], leafSize:[0.50,0.70], leavesPerTip:[9,13], firstTilt:[0.75,0.95], trunkColors:[0x4a3520,0x3a2818], leafColors:[0x2a5a2a,0x3a6a35,0x2f6028], hasLeaves:true, icon:'🌳' },
  tropical:     { trunkH:[3.5,5.5], trunkR:[0.35,0.50], mainBranches:[4,5], maxDepth:[3,3], leafSize:[0.40,0.55], leavesPerTip:[7,9], firstTilt:[0.50,0.70], trunkColors:[0x6a5030,0x5a4020], leafColors:[0x3a8a3a,0x4a9a40,0x2a7a2a], hasLeaves:true, icon:'🌴' },
  sapin_neige:  { trunkH:[4.0,7.0], trunkR:[0.32,0.48], mainBranches:[6,7], maxDepth:[3,3], leafSize:[0.28,0.40], leavesPerTip:[6,9], firstTilt:[0.55,0.70], trunkColors:[0x3a2820,0x2a1810], leafColors:[0x2a4a4a,0x1a3a3a,0x3a5a5a], hasLeaves:true, icon:'🌲' },
  bouleau_nain: { trunkH:[1.8,2.8], trunkR:[0.18,0.28], mainBranches:[3,3], maxDepth:[3,3], leafSize:[0.25,0.35], leavesPerTip:[4,6], firstTilt:[0.40,0.55], trunkColors:[0xb8a890,0xa89880], leafColors:[0x6a9a5a,0x7aaa6a], hasLeaves:true, icon:'🌱' },
  cactus_arbre: { trunkH:[3.0,6.0], trunkR:[0.30,0.45], mainBranches:[2,3], maxDepth:[1,1], leafSize:[0,0], leavesPerTip:[0,0], firstTilt:[0.90,1.10], trunkColors:[0x4a7a3a,0x3a6a2a,0x5a8a4a], leafColors:[0x4a7a3a], hasLeaves:false, topShape:'round', icon:'🌵' },
  acacia:       { trunkH:[3.0,5.0], trunkR:[0.30,0.45], mainBranches:[3,4], maxDepth:[2,2], leafSize:[0.40,0.52], leavesPerTip:[5,7], firstTilt:[1.00,1.30], trunkColors:[0x6a4a28,0x5a3a18], leafColors:[0x7a8a3a,0x8a9a4a,0x6a7a2a], hasLeaves:true, icon:'🌳' },
  arbre_mort:   { trunkH:[2.5,4.5], trunkR:[0.25,0.40], mainBranches:[3,5], maxDepth:[3,3], leafSize:[0,0], leavesPerTip:[0,0], firstTilt:[0.60,0.90], trunkColors:[0x4a3a28,0x3a2a18], leafColors:[0x000000], hasLeaves:false, topShape:'none', icon:'🪵' },
  mousse:       { trunkH:[2.0,3.5], trunkR:[0.35,0.55], mainBranches:[4,6], maxDepth:[3,4], leafSize:[0.50,0.65], leavesPerTip:[10,14], firstTilt:[0.70,0.90], trunkColors:[0x4a3a20,0x3a2a15], leafColors:[0x2a5a2a,0x3a6a30,0x1f4a1f], hasLeaves:true, icon:'🍀' },
  arbre_geant:  { trunkH:[12,20], trunkR:[1.4,2.2], mainBranches:[6,8], maxDepth:[4,5], leafSize:[1.2,1.8], leavesPerTip:[14,20], firstTilt:[0.50,0.70], trunkColors:[0x5a3a24,0x4a2a14], leafColors:[0x2a5a2a,0x3a6a30,0x1f4a1f], hasLeaves:true, giant:true, icon:'🌲' }
};

export const BIOME_TREE_WEIGHTS = {
  glacier:  [['sapin_neige',3],['bouleau_nain',2]],
  tempere:  [['chene',3],['pin',2],['bouleau',2],['saule',1]],
  tropical: [['palmier',2],['banian',2],['tropical',3]],
  desert:   [['cactus_arbre',2],['acacia',2],['arbre_mort',1]],
  marais:   [['saule',2],['arbre_mort',2],['mousse',3]]
};

export function pickTreeTypeForBiome(biomeId) {
  const weights = BIOME_TREE_WEIGHTS[biomeId] || BIOME_TREE_WEIGHTS.tempere;
  let total = 0;
  for (const w of weights) total += w[1];
  let r = Math.random() * total;
  for (const [name, w] of weights) { r -= w; if (r <= 0) return name; }
  return weights[0][0];
}

export function rollTreeParams(typeName, scaleMul = 1) {
  const t = TREE_TYPES[typeName];
  return {
    typeName,
    trunkH: randInRange(t.trunkH) * scaleMul,
    trunkR: randInRange(t.trunkR) * scaleMul,
    mainBranches: randIntInRange(t.mainBranches),
    maxDepth: randIntInRange(t.maxDepth),
    leafSize: t.hasLeaves ? randInRange(t.leafSize) * scaleMul : 0,
    leavesPerTip: t.hasLeaves ? randIntInRange(t.leavesPerTip) : 0,
    firstTilt: randInRange(t.firstTilt),
    trunkColor: new THREE.Color(randPick(t.trunkColors)),
    leafColor: new THREE.Color(randPick(t.leafColors)),
    hasLeaves: t.hasLeaves,
    topShape: t.topShape || 'normal'
  };
}
