import * as THREE from 'three';
import { trees } from './trees.js';
import { state } from './physics.js';
import { endurance } from './endurance.js';

export const nests = [];
let visitedCount = 0;

export function setupNests(scene) {
  const candidates = [...trees]
    .filter(t => !t.growing && t.typeName !== 'arbre_geant')
    .sort((a, b) => (b.trunkR * b.treeH) - (a.trunkR * a.treeH));

  const total = Math.min(5, candidates.length);
  const placed = [];

  for (const tree of candidates) {
    if (nests.length >= total) break;
    let ok = true;
    for (const n of placed) {
      if (n.distanceTo(tree.base) < 5) { ok = false; break; }
    }
    if (!ok) continue;
    placed.push(tree.base.clone());

    const segs = tree.segments;
    if (!segs.length) continue;
    const topSeg = segs[Math.min(3, segs.length - 1)];
    const nestPos = topSeg.from.clone().lerp(topSeg.to, 0.7);
    const outward = nestPos.clone().sub(tree.base).normalize();
    nestPos.addScaledVector(outward, tree.trunkR + 0.6);

    const group = new THREE.Group();
    group.position.copy(nestPos);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tree.normal);

    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.35, 0.25, 8, 1, true),
      new THREE.MeshLambertMaterial({ color: 0x8a6a48, side: THREE.DoubleSide, flatShading: true })
    );
    group.add(bowl);

    for (let i = 0; i < 5; i++) {
      const twig = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4),
        new THREE.MeshLambertMaterial({ color: 0x5a3a20, flatShading: true })
      );
      twig.position.set((Math.random() - 0.5) * 0.8, 0.1, (Math.random() - 0.5) * 0.8);
      twig.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      group.add(twig);
    }

    const ringGeo = new THREE.TorusGeometry(0.65, 0.04, 6, 16);
    ringGeo.rotateX(Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: 0xffcc44, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    group.add(ring);

    scene.add(group);
    nests.push({
      group, ring,
      position: nestPos.clone(),
      normal: tree.normal.clone(),
      visited: false,
      isNear: false,
      phase: Math.random() * Math.PI * 2,
      onVisit: null
    });
  }
  console.log(`Nids : ${nests.length}`);
}

export function updateNests(dt, clockTime) {
  for (const nest of nests) {
    nest.ring.material.opacity = 0.3 + Math.sin(clockTime * 2 + nest.phase) * 0.2;
    nest.ring.rotation.z += dt * 0.5;
    nest.ring.scale.setScalar(1 + Math.sin(clockTime * 2.5 + nest.phase) * 0.1);

    const dist = state.pos.distanceTo(nest.position);
    nest.isNear = dist < 2.0;

    if (nest.isNear) endurance.gain(endurance.regenNest * dt);

    if (nest.isNear && !nest.visited) {
      nest.visited = true;
      visitedCount++;
      if (nest.onVisit) nest.onVisit();
    }
  }
}

export function getNearNest() {
  for (const n of nests) if (n.isNear) return n;
  return null;
}

export function getNestProgress() {
  return { visited: visitedCount, total: nests.length };
}
