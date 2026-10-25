import * as THREE from 'three';
import { terrainRadius, terrainNormal } from './planet.js';
import { trees } from './trees.js';
import { squirrel } from './squirrel.js';
import { endurance } from './endurance.js';

export const GRAVITY = 26, WALK_SPEED = 6.6, JUMP_SPEED = 11.5,
  GLIDE_SPEED = 11.5, GLIDE_FALL = 2.3, SQUIRREL_R = 0.36, CLIMB_SPEED = 3.4;

export const state = {
  pos: new THREE.Vector3(), vel: new THREE.Vector3(),
  up: new THREE.Vector3(0, 0, 1), forward: new THREE.Vector3(1, 0, 0),
  grounded: false, gliding: false, climbing: false,
  climbTree: null, climbSeg: -1, climbT: 0, climbAngle: 0,
  nearGrab: false
};

export let glideStreak = 0;
export function resetGlideStreak() { glideStreak = 0; }
export function getGlideStreak() { return glideStreak; }

export function initState() {
  endurance.reset();
  const d = new THREE.Vector3(0.35, 0.42, 0.84).normalize();
  state.up.copy(d);
  state.pos.copy(d).multiplyScalar(terrainRadius(d) + SQUIRREL_R);
  state.forward.set(0, 1, 0).cross(state.up);
  if (state.forward.lengthSq() < 1e-6) state.forward.set(1, 0, 0).cross(state.up);
  state.forward.normalize();
  squirrel.position.copy(state.pos);
}

export function restoreState(posArr, upArr) {
  state.pos.set(posArr[0], posArr[1], posArr[2]);
  state.up.set(upArr[0], upArr[1], upArr[2]).normalize();
  state.vel.set(0, 0, 0);
  state.forward.set(0, 1, 0).cross(state.up);
  if (state.forward.lengthSq() < 1e-6) state.forward.set(1, 0, 0).cross(state.up);
  state.forward.normalize();
  squirrel.position.copy(state.pos);
}

function pointSegmentDistance(p, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const apx = p.x - a.x, apy = p.y - a.y, apz = p.z - a.z;
  const abLenSq = abx*abx + aby*aby + abz*abz;
  let t = abLenSq > 0 ? (apx*abx + apy*aby + apz*abz) / abLenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + abx * t, cy = a.y + aby * t, cz = a.z + abz * t;
  const dx = p.x - cx, dy = p.y - cy, dz = p.z - cz;
  return { dist: Math.sqrt(dx*dx + dy*dy + dz*dz), param: t };
}
function getReferencePerpendicular(axis) {
  const ref = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0));
  if (ref.lengthSq() < 1e-6) ref.set(1, 0, 0).cross(axis);
  return ref.normalize();
}
function getRadialDir(segDir, angle) {
  const ref = getReferencePerpendicular(segDir);
  const ref2 = new THREE.Vector3().crossVectors(segDir, ref).normalize();
  return new THREE.Vector3()
    .addScaledVector(ref, Math.cos(angle))
    .addScaledVector(ref2, Math.sin(angle)).normalize();
}
function recomputeClimbAngle(tree, worldPos) {
  const seg = tree.segments[state.climbSeg];
  const segDir = new THREE.Vector3().subVectors(seg.to, seg.from).normalize();
  const segCenter = new THREE.Vector3().lerpVectors(seg.from, seg.to, state.climbT);
  const perp = worldPos.clone().sub(segCenter);
  perp.addScaledVector(segDir, -perp.dot(segDir));
  if (perp.lengthSq() > 1e-6) {
    perp.normalize();
    const ref = getReferencePerpendicular(segDir);
    const ref2 = new THREE.Vector3().crossVectors(segDir, ref).normalize();
    state.climbAngle = Math.atan2(perp.dot(ref2), perp.dot(ref));
  } else state.climbAngle = 0;
}
function pickChildSegment(tree, parentSeg, worldPos) {
  let best = -1, bestScore = -Infinity;
  const parentDir = new THREE.Vector3().subVectors(parentSeg.to, parentSeg.from).normalize();
  const perp = worldPos.clone().sub(parentSeg.to);
  perp.addScaledVector(parentDir, -perp.dot(parentDir));
  if (perp.lengthSq() > 1e-6) perp.normalize();
  for (const childIdx of parentSeg.children) {
    const child = tree.segments[childIdx];
    const childDir = new THREE.Vector3().subVectors(child.to, child.from).normalize();
    const score = childDir.dot(perp);
    if (score > bestScore) { bestScore = score; best = childIdx; }
  }
  return best;
}
function findClimbableTree() {
  let best = null;
  for (const tree of trees) {
    if (tree.growing) continue;
    if (tree.base.distanceToSquared(state.pos) > 900) continue;
    for (let i = 0; i < tree.segments.length; i++) {
      const seg = tree.segments[i];
      const { dist, param } = pointSegmentDistance(state.pos, seg.from, seg.to);
      if (dist < seg.radius + 0.65 && (!best || dist < best.dist)) {
        best = { tree, segIdx: i, param, dist, seg };
      }
    }
  }
  return best;
}
function enterClimb(hit) {
  state.climbing = true;
  state.climbTree = hit.tree;
  state.climbSeg = hit.segIdx;
  state.climbT = hit.param;
  state.grounded = false;
  state.gliding = false;
  state.vel.set(0, 0, 0);
  const seg = hit.seg;
  const segDir = new THREE.Vector3().subVectors(seg.to, seg.from).normalize();
  const segCenter = new THREE.Vector3().lerpVectors(seg.from, seg.to, hit.param);
  const perp = state.pos.clone().sub(segCenter);
  perp.addScaledVector(segDir, -perp.dot(segDir));
  if (perp.lengthSq() > 1e-6) {
    perp.normalize();
    const ref = getReferencePerpendicular(segDir);
    const ref2 = new THREE.Vector3().crossVectors(segDir, ref).normalize();
    state.climbAngle = Math.atan2(perp.dot(ref2), perp.dot(ref));
  } else state.climbAngle = 0;
  state.up.copy(state.pos).normalize();
}

const _m4 = new THREE.Matrix4();
const _qTarget = new THREE.Quaternion();
export function orientModel(modelUp, modelForward, dt, speed) {
  const right = new THREE.Vector3().crossVectors(modelUp, modelForward).normalize();
  const fwd = new THREE.Vector3().crossVectors(right, modelUp).normalize();
  _m4.makeBasis(right, modelUp, fwd);
  _qTarget.setFromRotationMatrix(_m4);
  squirrel.quaternion.slerp(_qTarget, 1 - Math.exp(-speed * dt));
}

function updateClimb(dt, input) {
  const tree = state.climbTree;
  let seg = tree.segments[state.climbSeg];
  endurance.spend(endurance.drainClimb * dt);
  const prevPos = state.pos.clone();
  const segLen0 = new THREE.Vector3().subVectors(seg.to, seg.from).length();
  state.climbT += input.moveZ * (CLIMB_SPEED / segLen0) * dt;
  if (state.climbT < 0) {
    if (seg.parent >= 0) {
      state.climbSeg = seg.parent; state.climbT = 1.0;
      seg = tree.segments[state.climbSeg];
      recomputeClimbAngle(tree, prevPos);
    } else {
      state.climbing = false; state.climbTree = null; state.climbSeg = -1;
      state.grounded = false; state.vel.set(0, 0, 0);
      state.up.copy(state.pos).normalize();
      return;
    }
  }
  if (state.climbT > 1) {
    if (seg.children.length > 0) {
      const childIdx = pickChildSegment(tree, seg, prevPos);
      if (childIdx >= 0) {
        state.climbSeg = childIdx; state.climbT = 0.0;
        seg = tree.segments[state.climbSeg];
        recomputeClimbAngle(tree, prevPos);
      }
    } else state.climbT = 1.0;
  }
  state.climbAngle += input.moveX * (CLIMB_SPEED / (seg.radius + 0.3)) * dt * 0.75;
  if (input.jumpPressed) {
    const segDir = new THREE.Vector3().subVectors(seg.to, seg.from).normalize();
    const radial = getRadialDir(segDir, state.climbAngle);
    state.vel.copy(radial).multiplyScalar(6.0).addScaledVector(segDir, 7.5);
    state.climbing = false; state.grounded = false; state.climbTree = null;
    state.up.copy(state.pos).normalize();
    return;
  }
  const segDir = new THREE.Vector3().subVectors(seg.to, seg.from).normalize();
  const segCenter = new THREE.Vector3().lerpVectors(seg.from, seg.to, state.climbT);
  const radial = getRadialDir(segDir, state.climbAngle);
  state.pos.copy(segCenter).addScaledVector(radial, seg.radius + 0.30);
  state.up.copy(state.pos).normalize();
  const fwd = input.moveZ < -0.1 ? segDir.clone().negate() : segDir.clone();
  orientModel(radial.clone(), fwd, dt, 14);
}

export function updateSquirrel(dt, input, camera) {
  const up = state.up;
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  camDir.addScaledVector(up, -camDir.dot(up));
  if (camDir.lengthSq() < 1e-6) {
    camDir.set(1, 0, 0).addScaledVector(up, -up.x);
    if (camDir.lengthSq() < 1e-6) camDir.set(0, 0, 1).addScaledVector(up, -up.z);
  }
  camDir.normalize();
  const camF = camDir.clone();
  const camR = new THREE.Vector3().crossVectors(camF, up).normalize();
  const moveDir = new THREE.Vector3()
    .addScaledVector(camF, input.moveZ)
    .addScaledVector(camR, input.moveX);
  const hasMove = moveDir.lengthSq() > 1e-6;
  if (hasMove) moveDir.normalize();
  state.gliding = false;

  if (state.climbing) {
    updateClimb(dt, input);
    squirrel.position.copy(state.pos);
    return;
  }

  if (state.grounded) {
    glideStreak = 0;
    endurance.gain(endurance.regenGround * dt);
    if (hasMove) {
      const hit = findClimbableTree();
      if (hit) {
        const segDir = new THREE.Vector3().subVectors(hit.seg.to, hit.seg.from).normalize();
        const segCenter = new THREE.Vector3().lerpVectors(hit.seg.from, hit.seg.to, hit.param);
        const radial = state.pos.clone().sub(segCenter);
        radial.addScaledVector(segDir, -radial.dot(segDir));
        if (radial.lengthSq() > 1e-6 && radial.normalize().dot(moveDir) < -0.12) {
          enterClimb(hit);
          squirrel.position.copy(state.pos);
          return;
        }
      }
    }
    const targetVel = moveDir.clone().multiplyScalar(WALK_SPEED);
    state.vel.lerp(targetVel, 1 - Math.exp(-16 * dt));
    state.vel.addScaledVector(up, -state.vel.dot(up));
    state.pos.addScaledVector(state.vel, dt);
    const nd = state.pos.clone().normalize();
    const gr = terrainRadius(nd) + SQUIRREL_R;
    if (state.pos.length() > gr + 0.5) { state.grounded = false; state.up.copy(nd); }
    else { state.pos.copy(nd).multiplyScalar(gr); state.up.copy(nd); }
    if (input.jumpPressed) {
      state.vel.addScaledVector(state.up, JUMP_SPEED);
      if (hasMove) state.vel.addScaledVector(moveDir, 2.0);
      state.grounded = false;
    }
  } else {
    const upA = state.up;
    let vr = state.vel.dot(upA);

    // Détection de grab (proximité d'un segment en vol)
    state.nearGrab = false;
    const grabHit = findClimbableTree();
    if (grabHit && grabHit.dist < grabHit.seg.radius + 1.5) {
      state.nearGrab = true;
      if (input.plantHeld) {
        enterClimb(grabHit);
        return;
      }
    }

    const wantGlide = input.glideHeld && vr < 0.5;
    if (wantGlide && endurance.canGlide) {
      state.gliding = true;
      glideStreak += dt;
      endurance.spend(endurance.drainGlide * dt);
      const vt = state.vel.clone().addScaledVector(upA, -vr);
      let dir;
      if (hasMove) dir = moveDir.clone();
      else if (vt.lengthSq() > 0.4) dir = vt.clone().normalize();
      else dir = state.forward.clone();
      dir.addScaledVector(upA, -dir.dot(upA));
      if (dir.lengthSq() < 1e-6) dir = state.forward.clone();
      dir.normalize();
      const targetVt = dir.multiplyScalar(GLIDE_SPEED);
      vt.lerp(targetVt, 1 - Math.exp(-3.6 * dt));
      vr = THREE.MathUtils.lerp(vr, -GLIDE_FALL, 1 - Math.exp(-3.6 * dt));
      state.vel.copy(vt).addScaledVector(upA, vr);
    } else {
      glideStreak = 0;
      state.vel.addScaledVector(upA, -GRAVITY * dt);
    }
    state.pos.addScaledVector(state.vel, dt);

    // Collision douce en vol
    if (!state.grounded) {
      const colHit = findClimbableTree();
      if (colHit && colHit.dist < colHit.seg.radius + SQUIRREL_R * 0.8) {
        const segDir = new THREE.Vector3().subVectors(colHit.seg.to, colHit.seg.from).normalize();
        const segCenter = new THREE.Vector3().lerpVectors(colHit.seg.from, colHit.seg.to, colHit.param);
        const normal = state.pos.clone().sub(segCenter);
        normal.addScaledVector(segDir, -normal.dot(segDir));
        if (normal.lengthSq() > 1e-6) {
          normal.normalize();
          const pushDist = (colHit.seg.radius + SQUIRREL_R) - colHit.dist + 0.05;
          state.pos.addScaledVector(normal, pushDist);
          const vn = state.vel.dot(normal);
          if (vn < 0) state.vel.addScaledVector(normal, -vn * 1.5);
        }
      }
    }

    const nd = state.pos.clone().normalize();
    const gr = terrainRadius(nd) + SQUIRREL_R;
    state.up.copy(nd);
    if (state.pos.length() <= gr) {
      state.pos.copy(nd).multiplyScalar(gr);
      const vrn = state.vel.dot(nd);
      if (vrn < 0) state.vel.addScaledVector(nd, -vrn);
      state.grounded = true; state.gliding = false;
    }
  }

  const upM = state.up;
  const dir = state.vel.clone().addScaledVector(upM, -state.vel.dot(upM));
  if (dir.lengthSq() > 0.04) {
    dir.normalize();
    const axis = new THREE.Vector3().crossVectors(state.forward, dir);
    if (axis.lengthSq() > 1e-8) {
      axis.normalize();
      const ang = Math.acos(THREE.MathUtils.clamp(state.forward.dot(dir), -1, 1));
      const step = Math.min(ang, (5 + ang * 3) * dt);
      state.forward.applyAxisAngle(axis, step);
    }
  }
  state.forward.addScaledVector(upM, -state.forward.dot(upM));
  if (state.forward.lengthSq() < 1e-6) {
    state.forward.set(0, 1, 0).cross(upM);
    if (state.forward.lengthSq() < 1e-6) state.forward.set(1, 0, 0).cross(upM);
  }
  state.forward.normalize();
  orientModel(upM, state.forward, dt, 13);
  squirrel.position.copy(state.pos);
}
