import * as THREE from 'three';

// Silhouette X-ray du squirrel
// Ajoute un mesh enfant par mesh existant, rendu toujours au-dessus
// Utilise depthTest:false + renderOrder élevé
export function createSquirrelXray(squirrel) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.28,
    depthTest: false,
    depthWrite: false,
    side: THREE.FrontSide
  });
  const silhouettes = [];
  squirrel.traverse(o => {
    if (o.isMesh && !o.userData.isXray) {
      const clone = new THREE.Mesh(o.geometry, mat);
      clone.renderOrder = 999;
      clone.userData.isXray = true;
      clone.scale.setScalar(1.02);
      o.add(clone);
      silhouettes.push(clone);
    }
  });
  return silhouettes;
}
