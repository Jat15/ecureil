import { TREE_TYPES } from './treeTypes.js';
import { BIOME_LABELS, getBiomeId } from './biomes.js';
import { terrainRadius, PLANET_R } from './planet.js';

export const ui = {
  overlay: null, hudEl: null, toastEl: null, comboEl: null, flashEl: null,
  plantPrompt: null, plantBarFill: null, planetBarFill: null, herbierGrid: null,
  touchUI: null, joyBase: null, joyKnob: null, jumpBtn: null, plantBtn: null,
  herbierCells: {},
  toastTimer: 0,
  onManualSave: null
};

export function initUI() {
  ui.overlay = document.getElementById('overlay');
  ui.hudEl = document.getElementById('hud');
  ui.toastEl = document.getElementById('toast');
  ui.comboEl = document.getElementById('combo');
  ui.flashEl = document.getElementById('flash');
  ui.plantPrompt = document.getElementById('plantPrompt');
  ui.plantBarFill = document.getElementById('plantBarFill');
  ui.planetBarFill = document.getElementById('planetBarFill');
  ui.herbierGrid = document.getElementById('herbierGrid');
  ui.touchUI = document.getElementById('touch-controls');
  ui.joyBase = document.getElementById('joy-base');
  ui.joyKnob = document.getElementById('joy-knob');
  ui.jumpBtn = document.getElementById('jump-btn');
  ui.interactBtn = document.getElementById('interact-btn');
  ui.scanBtn = document.getElementById('scan-btn');
  ui.spiritBtn = document.getElementById('spirit-btn');
  ui.touchUI = document.getElementById('touch-controls');
  // Alias compat : ancien plantBtn → interactBtn
  ui.plantBtn = ui.interactBtn;
  ui.plantBtn = document.getElementById('plant-btn');

  // Herbier
  for (const k of Object.keys(TREE_TYPES)) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.textContent = TREE_TYPES[k].icon || '?';
    cell.title = k;
    ui.herbierGrid.appendChild(cell);
    ui.herbierCells[k] = cell;
  }
}

export function showToast(msg, gold = false) {
  ui.toastEl.textContent = msg;
  ui.toastEl.classList.toggle('gold', gold);
  ui.toastEl.classList.add('visible');
  ui.toastTimer = 2.2;
}
export function tickToast(dt) {
  if (ui.toastTimer > 0) {
    ui.toastTimer -= dt;
    if (ui.toastTimer <= 0) ui.toastEl.classList.remove('visible');
  }
}

export function screenFlash(color = 'white', dur = 0.25) {
  ui.flashEl.style.background = color;
  ui.flashEl.style.transition = 'none';
  ui.flashEl.style.opacity = '0.45';
  requestAnimationFrame(() => {
    ui.flashEl.style.transition = `opacity ${dur}s ease-out`;
    ui.flashEl.style.opacity = '0';
  });
}

export function showCombo(n) {
  ui.comboEl.textContent = `x${n} !`;
  ui.comboEl.classList.add('show', 'pulse');
  setTimeout(() => ui.comboEl.classList.remove('pulse'), 200);
}
export function hideCombo() { ui.comboEl.classList.remove('show'); }

export function fillHerbier(typeName) {
  if (ui.herbierCells[typeName]) ui.herbierCells[typeName].classList.add('filled');
}

export function showPlantPrompt(progress) {
  ui.plantPrompt.classList.add('visible');
  ui.plantBarFill.style.width = (progress * 100) + '%';
}
export function hidePlantPrompt() { ui.plantPrompt.classList.remove('visible'); }

export function updatePlanetBar(planted, total) {
  const pct = total > 0 ? (planted / total) * 100 : 0;
  ui.planetBarFill.style.width = pct + '%';
}

export function updateHUD(snapshot) {
  const { state, seedCount, plantedCount, totalStumps, glideStreak, input, isTouchDevice } = snapshot;
  const d = state.pos.clone().normalize();
  const elev = (terrainRadius(d) - (PLANET_R - 2.4)) / 4.8;
  const biomeId = getBiomeId(d, Math.min(1, Math.max(0, elev)));
  const alt = state.pos.length() - terrainRadius(d) - 0.36;
  const stateLabel = state.climbing ? 'GRIMPE'
    : state.gliding ? 'PLANE'
    : state.grounded ? 'SOL'
    : 'CHUTE';
  let streakLabel = '';
  if (glideStreak > 3) {
    streakLabel = glideStreak > 10 ? ' · <span class="charged">✨ graine chargée</span>'
      : ` · <span class="seed">vol ${glideStreak.toFixed(0)}s</span>`;
  }
  const extra = input.gamepad ? ' · 🎮' : (isTouchDevice ? ' · 👆' : '');
  ui.hudEl.innerHTML = `${stateLabel}${extra} · alt ${Math.max(0, alt).toFixed(1)}<br>
    🌰 ${seedCount} · 🌱 ${plantedCount}/${totalStumps}${streakLabel}<br>
    ${BIOME_LABELS[biomeId]}`;
}


// ============================================================
// v6 — Endurance + Nids
// ============================================================
export function updateEnduranceUI(current, max) {
  const fill = document.getElementById('enduranceFill');
  if (!fill) return;
  const ratio = Math.max(0, Math.min(1, current / max));
  fill.style.width = (ratio * 100) + '%';
  if (ratio < 0.2) fill.style.background = 'linear-gradient(90deg, #ff4444, #ff8844)';
  else if (ratio < 0.5) fill.style.background = 'linear-gradient(90deg, #ffcc44, #ffee44)';
  else fill.style.background = 'linear-gradient(90deg, #3a7bd5, #6fffaa)';
}

export function updateNestCounter(visited, total) {
  const el = document.getElementById('nestCounter');
  if (el) el.textContent = `🥚 ${visited}/${total}`;
}

export function toggleGrabPrompt(show) {
  const el = document.getElementById('grabPrompt');
  if (!el) return;
  if (show) el.classList.add('visible');
  else el.classList.remove('visible');
}
