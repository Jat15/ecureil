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
  // P0.5 — plant-btn retiré (alias interact-btn conservé)
  ui.plantBtn = ui.interactBtn;

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

// P0.5 — combo retiré

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
// P0.4d — Grab prompt (P0.5 : v6 Endurance/Nids retirés)
// ============================================================
export function toggleGrabPrompt(show) {
  // P0.4d — Fallback : créer l'élément si absent du HTML
  let el = document.getElementById('grabPrompt');
  if (!el) {
    el = document.createElement('div');
    el.id = 'grabPrompt';
    el.className = 'grab-prompt';
    el.dataset.dynamic = '1';
    el.textContent = 'S\'accrocher · E';
    Object.assign(el.style, {
      position: 'fixed',
      left: '50%',
      bottom: '22%',
      transform: 'translateX(-50%)',
      padding: '10px 20px',
      background: 'rgba(10, 15, 25, 0.88)',
      border: '1px solid rgba(220, 200, 130, 0.7)',
      color: '#f5efe0',
      borderRadius: '10px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '15px',
      letterSpacing: '0.04em',
      pointerEvents: 'none',
      zIndex: '1000',
      display: 'none',
      boxShadow: '0 6px 20px rgba(0,0,0,0.55)',
      transition: 'opacity 0.18s ease-out'
    });
    document.body.appendChild(el);
  }
  if (!el) return;
  el.classList.toggle('visible', show);
  if (el.dataset.dynamic === '1') {
    el.style.display = show ? 'block' : 'none';
  }
}
