import * as THREE from 'three';

export const squirrel = new THREE.Group();
export const legs = [];
export let membraneL, membraneR, tailPivot;

export function buildSquirrelMesh(scene) {
  scene.add(squirrel);
  const furMat      = new THREE.MeshLambertMaterial({ color: 0xa9724e, flatShading: true });
  const bellyMat    = new THREE.MeshLambertMaterial({ color: 0xe0c09a, flatShading: true });
  const darkMat     = new THREE.MeshLambertMaterial({ color: 0x2b211c, flatShading: true });
  const membraneMat = new THREE.MeshLambertMaterial({ color: 0xc08a63, flatShading: true, side: THREE.DoubleSide });

  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), furMat);
  body.scale.set(1.0, 0.88, 1.45);
  squirrel.add(body);
  const belly = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), bellyMat);
  belly.scale.set(0.88, 0.62, 1.22);
  belly.position.set(0, -0.13, 0.05);
  squirrel.add(belly);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.235, 1), furMat);
  head.position.set(0, 0.09, 0.42);
  head.scale.set(1, 0.96, 1.06);
  squirrel.add(head);
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.22, 5), bellyMat);
  snout.position.set(0, 0.02, 0.60);
  snout.rotation.x = Math.PI / 2;
  squirrel.add(snout);
  const nose = new THREE.Mesh(new THREE.IcosahedronGeometry(0.048, 0), darkMat);
  nose.position.set(0, 0.02, 0.72);
  squirrel.add(nose);
  const eyeGeo = new THREE.IcosahedronGeometry(0.058, 0);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, darkMat);
    eye.position.set(0.128 * s, 0.155, 0.515);
    squirrel.add(eye);
  }
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.19, 4), furMat);
    ear.position.set(0.125 * s, 0.30, 0.36);
    ear.rotation.set(-0.22, 0, -0.30 * s);
    squirrel.add(ear);
  }
  tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.24, -0.55);
  tailPivot.rotation.x = -0.80;
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.185, 0.80, 6), furMat);
  tail.position.y = 0.40;
  tail.scale.set(0.34, 1, 1);
  tailPivot.add(tail);
  squirrel.add(tailPivot);

  const legGeo = new THREE.CylinderGeometry(0.055, 0.042, 0.26, 4);
  const legPos = [[-0.17, 0.26], [0.17, 0.26], [-0.19, -0.22], [0.19, -0.22]];
  for (const [x, z] of legPos) {
    const leg = new THREE.Mesh(legGeo, furMat);
    leg.position.set(x, -0.17, z);
    squirrel.add(leg);
    legs.push(leg);
  }
  function makeMembrane(side) {
    const v = new Float32Array([
      0.245 * side,  0.07,  0.30,
      0.470 * side, -0.11,  0.15,
      0.450 * side, -0.11, -0.22,
      0.225 * side,  0.05, -0.27
    ]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, membraneMat);
    m.scale.x = 0.1;
    squirrel.add(m);
    return m;
  }
  membraneL = makeMembrane(-1);
  membraneR = makeMembrane(1);
}
