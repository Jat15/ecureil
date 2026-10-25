import * as THREE from 'three';
import { BIOME_COLORS, getBiomeId } from './biomes.js';

export const PLANET_R = 20;

export function terrainNoise(dir) {
  let s = 0, amp = 1.0, freq = 2.2;
  for (let i = 0; i < 4; i++) {
    s += amp *
      Math.sin(dir.x * freq + Math.cos(dir.y * freq * 0.8) * 1.7) *
      Math.cos(dir.z * freq * 1.1 + Math.sin(dir.x * freq * 0.7) * 1.5);
    amp *= 0.42; freq *= 2.1;
  }
  return s;
}

export function terrainRadius(dir) {
  return PLANET_R + terrainNoise(dir) * 1.3;
}

const _tn1 = new THREE.Vector3();
export function terrainNormal(d) {
  const e = 0.012;
  let t1 = new THREE.Vector3(0, 1, 0).cross(d);
  if (t1.lengthSq() < 1e-8) t1.set(1, 0, 0).cross(d);
  t1.normalize();
  const t2 = new THREE.Vector3().crossVectors(d, t1).normalize();
  const h0 = terrainRadius(d);
  const d1 = d.clone().addScaledVector(t1, e).normalize();
  const d2 = d.clone().addScaledVector(t2, e).normalize();
  const p0 = d.clone().multiplyScalar(h0);
  const p1 = d1.multiplyScalar(terrainRadius(d1));
  const p2 = d2.multiplyScalar(terrainRadius(d2));
  const n = _tn1.crossVectors(p1.clone().sub(p0), p2.clone().sub(p0)).normalize().clone();
  if (n.dot(d) < 0) n.negate();
  return n;
}

export function buildPlanet(scene) {
  const geo = new THREE.IcosahedronGeometry(1, 4);
  const pos = geo.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const da = new THREE.Vector3(), db = new THREE.Vector3(), dc = new THREE.Vector3();
  const avgDir = new THREE.Vector3();
  const minR = PLANET_R - 2.4, maxR = PLANET_R + 2.4;
  const tmpC = new THREE.Color();
  const cLow = new THREE.Color(), cMid = new THREE.Color(), cHigh = new THREE.Color();

  for (let i = 0; i < count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    da.copy(a).normalize(); db.copy(b).normalize(); dc.copy(c).normalize();
    const ra = terrainRadius(da), rb = terrainRadius(db), rc = terrainRadius(dc);
    pos.setXYZ(i, da.x*ra, da.y*ra, da.z*ra);
    pos.setXYZ(i + 1, db.x*rb, db.y*rb, db.z*rb);
    pos.setXYZ(i + 2, dc.x*rc, dc.y*rc, dc.z*rc);
    const avg = (ra + rb + rc) / 3;
    let elev = Math.min(1, Math.max(0, (avg - minR) / (maxR - minR)));
    avgDir.copy(da).add(db).add(dc).normalize();
    // Anti micro-biomes : 3 échantillons + majorité
    const j1 = avgDir.clone().add(new THREE.Vector3(0.12, 0, 0)).normalize();
    const j2 = avgDir.clone().add(new THREE.Vector3(0, 0, 0.12)).normalize();
    const b0 = getBiomeId(avgDir, elev);
    const b1 = getBiomeId(j1, elev);
    const b2 = getBiomeId(j2, elev);
    let stableBiome = b0;
    if (b0 === b1 || b0 === b2) stableBiome = b0;
    else if (b1 === b2) stableBiome = b1;
    const pal = BIOME_COLORS[stableBiome];
    cLow.setHex(pal.low); cMid.setHex(pal.mid); cHigh.setHex(pal.high);
    if (elev < 0.5) tmpC.copy(cLow).lerp(cMid, elev / 0.5);
    else tmpC.copy(cMid).lerp(cHigh, (elev - 0.5) / 0.5);
    tmpC.multiplyScalar(0.93 + Math.random() * 0.14);
    for (let k = 0; k < 3; k++) {
      colors[(i+k)*3] = tmpC.r; colors[(i+k)*3+1] = tmpC.g; colors[(i+k)*3+2] = tmpC.b;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_R * 1.16, 40, 28),
    new THREE.MeshBasicMaterial({
      color: 0x3a7bd5, transparent: true, opacity: 0.09,
      side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending
    })
  ));
}
