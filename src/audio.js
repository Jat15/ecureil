// Audio procédural — aucun fichier
export const audio = {
  ctx: null,
  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur, type = 'sine', vol = 0.1, slideTo = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo !== null) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t); o.stop(t + dur);
  },
  seed() { this.tone(880, 0.1, 'sine', 0.09); setTimeout(() => this.tone(1320, 0.18, 'sine', 0.07), 45); },
  combo(level) {
    const f = 660 + level * 140;
    this.tone(f, 0.18, 'triangle', 0.11);
    setTimeout(() => this.tone(f * 1.5, 0.22, 'triangle', 0.08), 70);
  },
  plantStart() { this.tone(180, 0.5, 'sine', 0.08, 260); },
  plantComplete() {
    this.tone(330, 0.3, 'sine', 0.09);
    setTimeout(() => this.tone(495, 0.35, 'sine', 0.08), 120);
    setTimeout(() => this.tone(660, 0.5, 'sine', 0.07), 240);
    setTimeout(() => this.tone(990, 0.6, 'triangle', 0.05), 400);
  },
  growTick() { this.tone(440 + Math.random() * 200, 0.08, 'sine', 0.02); }
};
