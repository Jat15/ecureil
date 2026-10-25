import * as THREE from 'three';

// ---------- PARTICULES ----------
export class ParticlePool {
  constructor(scene, max = 250) {
    this.max = max;
    this.particles = [];
    const geo = new THREE.IcosahedronGeometry(0.08, 0);
    for (let i = 0; i < max; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.particles.push({ mesh, vel: new THREE.Vector3(), life: 0, maxLife: 1 });
    }
    this.idx = 0;
  }
  emit(pos, count, color, speed = 2, life = 1) {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.idx];
      this.idx = (this.idx + 1) % this.max;
      p.mesh.position.copy(pos);
      p.mesh.material.color.set(color);
      p.mesh.material.opacity = 1;
      p.mesh.visible = true;
      p.vel.randomDirection().multiplyScalar(speed * (0.3 + Math.random() * 0.7));
      p.vel.y += speed * 0.3;
      p.life = life * (0.7 + Math.random() * 0.3);
      p.maxLife = p.life;
    }
  }
  emitUp(pos, normal, count, color, speed = 2, life = 1) {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.idx];
      this.idx = (this.idx + 1) % this.max;
      p.mesh.position.copy(pos);
      p.mesh.material.color.set(color);
      p.mesh.material.opacity = 1;
      p.mesh.visible = true;
      p.vel.copy(normal).multiplyScalar(speed * (0.6 + Math.random() * 0.7));
      const tang = new THREE.Vector3().crossVectors(normal, new THREE.Vector3(0, 1, 0)).normalize();
      if (tang.lengthSq() < 1e-6) tang.set(1, 0, 0);
      const tang2 = new THREE.Vector3().crossVectors(normal, tang).normalize();
      const ang = Math.random() * Math.PI * 2;
      const spread = 0.5 + Math.random() * 0.8;
      p.vel.addScaledVector(tang, Math.cos(ang) * spread);
      p.vel.addScaledVector(tang2, Math.sin(ang) * spread);
      p.life = life * (0.7 + Math.random() * 0.3);
      p.maxLife = p.life;
    }
  }
  update(dt, gravityNormal) {
    for (const p of this.particles) {
      if (!p.mesh.visible) continue;
      p.life -= dt;
      if (p.life <= 0) { p.mesh.visible = false; continue; }
      p.mesh.position.addScaledVector(p.vel, dt);
      if (gravityNormal) p.vel.addScaledVector(gravityNormal, -6 * dt);
      p.vel.multiplyScalar(1 - dt * 1.5);
      const t = p.life / p.maxLife;
      p.mesh.material.opacity = t;
      p.mesh.scale.setScalar(0.3 + t * 0.7);
    }
  }
}

// ---------- OISEAUX ----------
export const birds = [];
export function spawnBird(scene, center, normal, count = 2) {
  for (let i = 0; i < count; i++) {
    const color = [0xfff4e0, 0x8fbde6, 0xffcc88, 0xffffff][Math.floor(Math.random()*4)];
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.28, 4),
      new THREE.MeshLambertMaterial({ color, flatShading: true })
    );
    body.rotation.x = Math.PI / 2;
    group.add(body);
    const wingGeo = new THREE.PlaneGeometry(0.32, 0.10);
    const wingMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const wingL = new THREE.Mesh(wingGeo, wingMat);
    wingL.position.set(-0.18, 0, 0);
    wingL.rotation.y = 0.4;
    const wingR = new THREE.Mesh(wingGeo, wingMat.clone());
    wingR.position.set(0.18, 0, 0);
    wingR.rotation.y = -0.4;
    group.add(wingL, wingR);
    scene.add(group);
    birds.push({
      group, wingL, wingR,
      center: center.clone(), normal: normal.clone(),
      radius: 2 + Math.random() * 2.5,
      angle: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.5,
      height: 1.5 + Math.random() * 2.5,
      phase: Math.random() * Math.PI * 2
    });
  }
}
export function updateBirds(dt, clockTime) {
  for (const b of birds) {
    b.angle += b.speed * dt;
    const tang = new THREE.Vector3().crossVectors(b.normal, new THREE.Vector3(0, 1, 0)).normalize();
    if (tang.lengthSq() < 1e-6) tang.set(1, 0, 0);
    const tang2 = new THREE.Vector3().crossVectors(b.normal, tang).normalize();
    const pos = b.center.clone()
      .addScaledVector(b.normal, b.height)
      .addScaledVector(tang, Math.cos(b.angle) * b.radius)
      .addScaledVector(tang2, Math.sin(b.angle) * b.radius);
    b.group.position.copy(pos);
    const tangentV = tang.clone().multiplyScalar(-Math.sin(b.angle))
      .addScaledVector(tang2, Math.cos(b.angle));
    const lookAt = pos.clone().add(tangentV);
    b.group.lookAt(lookAt);
    const flap = Math.sin(clockTime * 12 + b.phase) * 0.5 + 0.5;
    b.wingL.rotation.z = flap * 0.8;
    b.wingR.rotation.z = -flap * 0.8;
  }
}
