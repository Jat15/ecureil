// RNG seedé (mulberry32) — reproductibilité du monde
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Instance globale. Remplacée par initRng(seed).
export let rng = Math.random;

export function initRng(seed) {
  rng = mulberry32(seed);
  return rng;
}

// Helpers utilisant le rng courant
export function rand() { return rng(); }
export function randInRange([a, b]) { return a + rng() * (b - a); }
export function randIntInRange([a, b]) { return Math.floor(a + rng() * (b - a + 1)); }
export function randPick(arr) { return arr[(rng() * arr.length) | 0]; }
export function randDir() {
  const u = rng() * 2 - 1;
  const th = rng() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  return { x: Math.cos(th) * r, y: u, z: Math.sin(th) * r };
}
