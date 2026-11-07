import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getBiomeId } from './biomes.js';
import { pickTreeTypeForBiome, rollTreeParams } from './treeTypes.js';
import { terrainRadius, terrainNormal, PLANET_R } from './planet.js';
import { rng } from './rng.js';

export const trees = [];
export const uTime = { value: 0 };

const _yAxis = new THREE.Vector3(0, 1, 0);
const _localUp = new THREE.Vector3(0, 1, 0);
const _qTmp = new THREE.Quaternion();

let _treeMat = null;
export function getTreeMaterial() {
  if (_treeMat) return _treeMat;
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = 'attribute vec3 aSway;\nuniform float uTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       transformed += aSway * sin(uTime * 1.5 + position.x * 0.45 + position.y * 0.35 + position.z * 0.5);`
    );
  };
  _treeMat = m;
  return m;
}

// Distribution Poisson sur la sphère (spherical best-candidate)
// n : nombre de points visés, k : candidats par point
export function poissonSphere(n, k = 20) {
  if (n <= 0) return [];
  const points = [new THREE.Vector3().randomDirection()];
  for (let i = 1; i < n; i++) {
    let best = null, bestDist = -1;
    for (let j = 0; j < k; j++) {
      const cand = new THREE.Vector3().randomDirection();
      let minDist = Infinity;
      for (const p of points) {
        const d = 1 - cand.dot(p); // distance angulaire approx
        if (d < minDist) minDist = d;
      }
      if (minDist > bestDist) { bestDist = minDist; best = cand; }
    }
    if (best) points.push(best);
  }
  return points;
}

// P0.5-hotfix2 — mergeGeometries robuste + diagnostic
function _diagGeom(g, i) {
  const attrs = Object.keys(g.attributes).map(k => {
    const a = g.attributes[k];
    return `${k}(${a.itemSize}${a.normalized ? 'n' : ''})`;
  }).join(',');
  return `[${i}] indexed=${g.index !== null} verts=${g.attributes.position?.count ?? '?'} attrs={${attrs}}`;
}
export function safeMerge(geoms, label = 'trees') {
  if (!geoms || geoms.length === 0) return null;
  // Normalisation non-indexée d'abord : IcosahedronGeometry n'est pas indexé,
  // CylinderGeometry/PlaneGeometry le sont. Uniformise avant merge.
  const flat = geoms.map(g => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(flat, false);
  if (merged) return merged;

  // Fallback diagnostic (ne devrait plus arriver)
  console.warn(`[${label}] mergeGeometries échec persistant (n=${flat.length}), diagnostic :`);
  for (let i = 0; i < Math.min(flat.length, 5); i++) {
    const g = flat[i];
    const attrs = Object.keys(g.attributes).map(k => {
      const a = g.attributes[k];
      return `${k}(${a.itemSize}${a.normalized ? 'n' : ''})`;
    }).join(',');
    console.warn(`  [${i}] indexed=${g.index !== null} verts=${g.attributes.position?.count ?? '?'} attrs={${attrs}}`);
  }
  if (flat.length > 5) console.warn(`  ... et ${flat.length - 5} autres`);
  return null;
}

export function buildOneTree(basePos, nrm, t1, t2, params) {
  const mat4 = new THREE.Matrix4().makeBasis(t1, nrm, t2);
  mat4.setPosition(basePos);
  const rotQ = new THREE.Quaternion().setFromRotationMatrix(mat4);
  const tree = {
    base: basePos.clone(), normal: nrm.clone(), t1: t1.clone(), t2: t2.clone(),
    treeH: params.trunkH, trunkR: params.trunkR * 0.85,
    segments: [], growing: false, typeName: params.typeName
  };
  const parts = [];
  const swayNormH = params.trunkH * 2.5;

  function paint(geo, color) {
    const n = geo.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) { arr[k*3]=color.r; arr[k*3+1]=color.g; arr[k*3+2]=color.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
  }
  function addSway(geo) {
    const p = geo.attributes.position;
    const arr = new Float32Array(p.count * 3);
    for (let k = 0; k < p.count; k++) {
      const yy = Math.max(0, p.getY(k));
      arr[k*3] = Math.pow(Math.min(1, yy / swayNormH), 2) * 0.10;
    }
    geo.setAttribute('aSway', new THREE.BufferAttribute(arr, 3));
    return geo;
  }
  function addSegmentCyl(from, to, radius, color, parentIdx) {
    const dv = new THREE.Vector3().subVectors(to, from);
    const len = dv.length();
    if (len < 1e-4) return -1;
    const g = new THREE.CylinderGeometry(radius * 0.72, radius, len, 5, 1, false);
    g.translate(0, len * 0.5, 0);
    _qTmp.setFromUnitVectors(_yAxis, dv.clone().normalize());
    g.applyQuaternion(_qTmp);
    g.translate(from.x, from.y, from.z);
    paint(g, color); addSway(g); parts.push(g);
    if (params.topShape === 'round') {
      const cap = new THREE.IcosahedronGeometry(radius * 1.05, 0);
      cap.translate(to.x, to.y, to.z);
      paint(cap, color); addSway(cap); parts.push(cap);
    }
    const wf = from.clone().applyMatrix4(mat4);
    const wt = to.clone().applyMatrix4(mat4);
    const idx = tree.segments.length;
    tree.segments.push({ from: wf, to: wt, radius, children: [], parent: parentIdx });
    if (parentIdx >= 0 && tree.segments[parentIdx]) tree.segments[parentIdx].children.push(idx);
    return idx;
  }
  function addLeafCluster(pos, size, color) {
    for (let k = 0; k < 2; k++) {
      const g = new THREE.PlaneGeometry(size, size * 0.72);
      g.rotateY(k * Math.PI / 2 + Math.random() * 0.4);
      g.rotateX((Math.random() - 0.5) * 0.9);
      g.rotateZ((Math.random() - 0.5) * 0.9);
      g.translate(pos.x, pos.y, pos.z);
      paint(g, color); addSway(g); parts.push(g);
    }
  }
  function growBranch(origin, branchDir, length, radius, depth, parentIdx) {
    const tip = origin.clone().addScaledVector(branchDir, length);
    const myIdx = addSegmentCyl(origin, tip, radius, params.trunkColor, parentIdx);
    if (myIdx < 0) return;
    if (depth <= 0) {
      if (params.hasLeaves) {
        for (let l = 0; l < params.leavesPerTip; l++) {
          const off = new THREE.Vector3(
            (Math.random() - 0.5) * params.leafSize * 2.6,
            (Math.random() - 0.3) * params.leafSize * 2.0,
            (Math.random() - 0.5) * params.leafSize * 2.6
          );
          addLeafCluster(tip.clone().add(off), params.leafSize * (0.75 + Math.random() * 0.5), params.leafColor);
        }
      }
      return;
    }
    const nSub = depth === params.maxDepth ? params.mainBranches : (2 + (Math.random() < 0.5 ? 1 : 0));
    for (let s = 0; s < nSub; s++) {
      const ang = (s / nSub) * Math.PI * 2 + Math.random() * 0.7;
      const tilt = depth === params.maxDepth ? params.firstTilt + Math.random() * 0.10 : (0.35 + Math.random() * 0.40);
      let perp = new THREE.Vector3().crossVectors(branchDir, _localUp);
      if (perp.lengthSq() < 1e-6) perp.set(1, 0, 0).cross(branchDir);
      perp.normalize();
      const perp2 = new THREE.Vector3().crossVectors(branchDir, perp).normalize();
      const twist = perp.clone().multiplyScalar(Math.cos(ang)).addScaledVector(perp2, Math.sin(ang)).normalize();
      const newDir = branchDir.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(twist, Math.sin(tilt)).normalize();
      growBranch(tip, newDir, length * 0.72, radius * 0.62, depth - 1, myIdx);
    }
  }
  growBranch(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0),
             params.trunkH, params.trunkR, params.maxDepth, -1);
  const geo = safeMerge(parts, 'tree-part');
  if (!geo) return null;
  const swayAttr = geo.attributes.aSway;
  if (swayAttr) {
    const tmpV = new THREE.Vector3();
    for (let k = 0; k < swayAttr.count; k++) {
      tmpV.fromBufferAttribute(swayAttr, k).applyQuaternion(rotQ);
      swayAttr.setXYZ(k, tmpV.x, tmpV.y, tmpV.z);
    }
  }
  geo.applyMatrix4(mat4);
  return { tree, geo };
}

export function buildInitialForest(scene) {
  const N = 320;
  // Distribution Poisson : points bien répartis
  const dirs = poissonSphere(N, 20);
  const placed = [];
  const allGeoms = [];
  const minDist = 0.11;

  for (const dir of dirs) {
    const rad = terrainRadius(dir);
    if (rad < PLANET_R - 1.0) continue;
    const nrm = terrainNormal(dir);
    if (nrm.dot(dir) < 0.78) continue;
    let ok = true;
    for (const p of placed) if (p.distanceTo(dir) < minDist) { ok = false; break; }
    if (!ok) continue;
    placed.push(dir.clone());

    const biomeId = getBiomeId(dir);
    const typeName = pickTreeTypeForBiome(biomeId);
    const params = rollTreeParams(typeName);
    let t1 = new THREE.Vector3(0, 1, 0).cross(nrm);
    if (t1.lengthSq() < 1e-6) t1.set(1, 0, 0).cross(nrm);
    t1.normalize();
    const t2 = new THREE.Vector3().crossVectors(t1, nrm).normalize();
    const basePos = dir.clone().multiplyScalar(rad - 0.30);
    const result = buildOneTree(basePos, nrm, t1, t2, params);
    if (!result) continue;
    trees.push(result.tree);
    allGeoms.push(result.geo);
  }

  if (!allGeoms.length) return;
  const merged = safeMerge(allGeoms, 'forest');
  const mesh = new THREE.Mesh(merged, getTreeMaterial());
  mesh.frustumCulled = false;
  scene.add(mesh);
  console.log(`Forêt : ${trees.length} arbres`);
}


// ============================================================
// v6 — Distribution avec exclusion + mini-arbres 25%
// ============================================================
export function buildInitialForestV2(scene) {
  const N_REGULAR = 200;
  const dirs = poissonSphere(N_REGULAR, 20);
  const placed = [];
  const allGeoms = [];

  // 1) Arbres géants d'abord (1-2 par planète)
  const giantsCount = 1 + Math.floor(rng() * 2);
  for (let g = 0; g < giantsCount; g++) {
    let bestDir = null, bestMinDist = -1;
    for (let t = 0; t < 12; t++) {
      const cand = new THREE.Vector3().randomDirection();
      let minDist = Infinity;
      for (const p of placed) {
        const d = 1 - cand.dot(p.dir);
        if (d < minDist) minDist = d;
      }
      if (minDist > bestMinDist) { bestMinDist = minDist; bestDir = cand; }
    }
    if (!bestDir) continue;
    const rad = terrainRadius(bestDir);
    const nrm = terrainNormal(bestDir);
    if (nrm.dot(bestDir) < 0.75) continue;
    const params = rollTreeParams('arbre_geant');
    let t1 = new THREE.Vector3(0, 1, 0).cross(nrm);
    if (t1.lengthSq() < 1e-6) t1.set(1, 0, 0).cross(nrm);
    t1.normalize();
    const t2 = new THREE.Vector3().crossVectors(t1, nrm).normalize();
    const basePos = bestDir.clone().multiplyScalar(rad - 0.4);
    const result = buildOneTree(basePos, nrm, t1, t2, params);
    if (!result) continue;
    trees.push(result.tree);
    allGeoms.push(result.geo);
    placed.push({ dir: bestDir.clone(), excl: params.trunkR * 3 });
  }

  // 2) Arbres réguliers avec exclusion
  for (const dir of dirs) {
    const rad = terrainRadius(dir);
    if (rad < PLANET_R - 1.0) continue;
    const nrm = terrainNormal(dir);
    if (nrm.dot(dir) < 0.78) continue;

    const biomeId = getBiomeId(dir);
    const typeName = pickTreeTypeForBiome(biomeId);
    if (typeName === 'arbre_geant') continue;
    const params = rollTreeParams(typeName);
    const exclusion = Math.max(params.trunkR * 4, 1.0);

    let ok = true;
    for (const p of placed) {
      const dWorld = dir.distanceTo(p.dir) * PLANET_R;
      if (dWorld < (exclusion + p.excl)) { ok = false; break; }
    }
    if (!ok) continue;

    let t1 = new THREE.Vector3(0, 1, 0).cross(nrm);
    if (t1.lengthSq() < 1e-6) t1.set(1, 0, 0).cross(nrm);
    t1.normalize();
    const t2 = new THREE.Vector3().crossVectors(t1, nrm).normalize();
    const basePos = dir.clone().multiplyScalar(rad - 0.30);
    const result = buildOneTree(basePos, nrm, t1, t2, params);
    if (!result) continue;
    trees.push(result.tree);
    allGeoms.push(result.geo);
    placed.push({ dir: dir.clone(), excl: exclusion });

    // Mini-arbre 25%
    if (rng() < 0.25) {
      let perp = new THREE.Vector3(0, 1, 0).cross(dir);
      if (perp.lengthSq() < 1e-6) perp.set(1, 0, 0).cross(dir);
      perp.normalize();
      const perp2 = new THREE.Vector3().crossVectors(dir, perp).normalize();
      const angle = rng() * Math.PI * 2;
      const offsetDir = perp.clone().multiplyScalar(Math.cos(angle))
        .addScaledVector(perp2, Math.sin(angle));
      const offsetLen = (params.trunkR * 3.5 + 0.8) / PLANET_R;
      const miniDir = dir.clone().addScaledVector(offsetDir, offsetLen).normalize();
      const miniRad = terrainRadius(miniDir);
      const miniNrm = terrainNormal(miniDir);
      const miniTypeName = pickTreeTypeForBiome(getBiomeId(miniDir));
      if (miniTypeName === 'arbre_geant') continue;
      const miniParams = rollTreeParams(miniTypeName, 0.5);
      let mt1 = new THREE.Vector3(0, 1, 0).cross(miniNrm);
      if (mt1.lengthSq() < 1e-6) mt1.set(1, 0, 0).cross(miniNrm);
      mt1.normalize();
      const mt2 = new THREE.Vector3().crossVectors(mt1, miniNrm).normalize();
      const miniBasePos = miniDir.clone().multiplyScalar(miniRad - 0.15);
      const miniResult = buildOneTree(miniBasePos, miniNrm, mt1, mt2, miniParams);
      if (miniResult) {
        trees.push(miniResult.tree);
        allGeoms.push(miniResult.geo);
      }
    }
  }

  if (!allGeoms.length) return;
  const merged = safeMerge(allGeoms, 'forest');
  const mesh = new THREE.Mesh(merged, getTreeMaterial());
  mesh.frustumCulled = false;
  scene.add(mesh);
  console.log(`Forêt v2 : ${trees.length} arbres`);
}
