// Système d'endurance
// Drain en vol / grimpe · Régénération au sol et au nid
export const endurance = {
  current: 100,
  max: 100,
  drainGlide: 0,     // /s en plané
  drainClimb: 0,     // /s en grimpant
  regenGround: 25,   // /s au sol
  regenNest: 60,     // /s dans un nid
  minGlide: 5,       // en dessous : plus de plané

  reset() { this.current = this.max; },
  spend(amount) { this.current = Math.max(0, this.current - amount); },
  gain(amount) { this.current = Math.min(this.max, this.current + amount); },
  get exhausted() { return this.current <= 0.01; },
  get canGlide() { return this.current > this.minGlide; },
  get ratio() { return this.current / this.max; }
};
