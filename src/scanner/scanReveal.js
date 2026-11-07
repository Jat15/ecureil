// P1 — visuels 3D du scanner spectral
import * as THREE from 'three';
import { PLANET_R } from '../planet.js';
import { trees } from '../trees.js';
import { seeds, stumps } from '../collectables.js';

let overlayMesh = null;
let skeletonLines = null;   // LineSegments dorés (from → to de chaque segment)
let pointCloud = null;      // points dorés sur tips d'arbres
let duskLight = null;
let initialized = false;
let lastTreeCount = -1;

export function initScanReveal(scene) {
  if (initialized) return;
  initialized = true;

  // 1) Overlay bleu nuit
  const overlayGeo = new THREE.SphereGeometry(PLANET_R * 8, 24, 16);
  const overlayMat = new THREE.MeshBasicMaterial({
    color: 0x0a1430, transparent: true, opacity: 0,
    side: THREE.BackSide, depthWrite: false, depthTest: false
  });
  overlayMesh = new THREE.Mesh(overlayGeo, overlayMat);
  overlayMesh.visible = false;
  overlayMesh.renderOrder = 995;
  scene.add(overlayMesh);

  // 2) Lignes dorées — squelette des arbres
  skeletonLines = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
      color: 0xffcc44, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
    })
  );
  skeletonLines.visible = false;
  skeletonLines.renderOrder = 996;
  scene.add(skeletonLines);

  // 3) Points dorés sur les tips
  pointCloud = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({
      color: 0xffdd66, size: 0.4, sizeAttenuation: true,
      transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
    })
  );
  pointCloud.visible = false;
  pointCloud.renderOrder = 997;
  scene.add(pointCloud);

  // 4) Lumière froide
  duskLight = new THREE.HemisphereLight(0x3a5aff, 0x0a0a20, 0);
  scene.add(duskLight);

  rebuildScanGeometry();
}

export function rebuildScanGeometry() {
  if (!skeletonLines || !pointCloud) return;

  const segPositions = [];
  const tipPositions = [];

  for (const tree of trees) {
    if (!tree.segments) continue;
    for (const seg of tree.segments) {
      segPositions.push(seg.from.x, seg.from.y, seg.from.z);
      segPositions.push(seg.to.x, seg.to.y, seg.to.z);
      if (seg.children.length === 0) {
        tipPositions.push(seg.to.x, seg.to.y, seg.to.z);
      }
    }
  }
  // Ajouter seeds et stumps comme points dorés (collectibles)
  for (const s of seeds) {
    if (s.collected) continue;
    tipPositions.push(s.group.position.x, s.group.position.y, s.group.position.z);
  }
  for (const st of stumps) {
    if (st.planted) continue;
    tipPositions.push(st.position.x, st.position.y, st.position.z);
  }

  skeletonLines.geometry.dispose();
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.Float32BufferAttribute(segPositions, 3));
  skeletonLines.geometry = sGeo;

  pointCloud.geometry.dispose();
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.Float32BufferAttribute(tipPositions, 3));
  pointCloud.geometry = pGeo;

  lastTreeCount = trees.length;
}

export function applyScanVisuals(scanState) {
  if (!overlayMesh) return;
  const k = scanState.intensity;
  const visible = k > 0.01;

  overlayMesh.visible = visible;
  skeletonLines.visible = visible;
  pointCloud.visible = visible;

  overlayMesh.material.opacity = k * 0.55;
  skeletonLines.material.opacity = k * 0.55;
  pointCloud.material.opacity = k * 0.9;
  pointCloud.material.size = 0.35 + k * 0.2;
  duskLight.intensity = k * 0.7;

  // Rebuild lazily si de nouveaux arbres ont été plantés et scan actif
  if (visible && trees.length !== lastTreeCount) {
    rebuildScanGeometry();
  }
}
