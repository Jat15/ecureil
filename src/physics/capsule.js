// =====================================================
//  Primitives géométriques pour la physique capsule
// =====================================================
import * as THREE from 'three';

// Retourne le point du segment [a,b] le plus proche de p,
// et le paramètre t (0=sur a, 1=sur b).
export function closestPointSegment(p, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const apx = p.x - a.x, apy = p.y - a.y, apz = p.z - a.z;
  const abLenSq = abx * abx + aby * aby + abz * abz;
  let t = abLenSq > 0 ? (apx * abx + apy * aby + apz * abz) / abLenSq : 0;
  t = Math.max(0, Math.min(1, t));
  return {
    point: new THREE.Vector3(a.x + abx * t, a.y + aby * t, a.z + abz * t),
    t
  };
}

// Distance point → segment
export function distancePointSegment(p, a, b) {
  const { point } = closestPointSegment(p, a, b);
  return p.distanceTo(point);
}

// Intersection capsule (pos + radius) vs capsule (segment + radius).
// Retourne null si pas d'intersection, sinon :
//   { push: Vector3, normal: Vector3, dist, minDist, closestPoint }
export function pushOutCapsule(pos, capsuleRadius, segA, segB, segRadius) {
  const { point } = closestPointSegment(pos, segA, segB);
  const toPos = pos.clone().sub(point);
  const dist = toPos.length();
  const minDist = capsuleRadius + segRadius;

  if (dist >= minDist) return null;

  let normal;
  if (dist < 1e-6) {
    // Le centre du joueur est exactement sur le segment.
    // Prendre une direction perpendiculaire au segment.
    const segDir = new THREE.Vector3().subVectors(segB, segA).normalize();
    normal = new THREE.Vector3().crossVectors(segDir, new THREE.Vector3(0, 1, 0));
    if (normal.lengthSq() < 1e-6) normal = new THREE.Vector3().crossVectors(segDir, new THREE.Vector3(1, 0, 0));
    normal.normalize();
  } else {
    normal = toPos.divideScalar(dist);
  }

  const pushDist = minDist - dist;
  return {
    push: normal.clone().multiplyScalar(pushDist),
    normal,
    dist,
    minDist,
    closestPoint: point
  };
}
