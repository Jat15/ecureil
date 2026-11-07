const KEY = 'squirrel_save_v1';

export function saveGame(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('save failed', e);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('load failed', e);
    return null;
  }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}

export function buildSaveData({ seed, planted, collectedSeeds, plantedTypes, playerPos, playerUp }) {
  return {
    version: 1,
    seed,
    planted,          // [{ stumpIdx, typeName, isCharged }]
    collectedSeeds,   // [seedIdx, ...]
    plantedTypes: [...plantedTypes],
    playerPos: [playerPos.x, playerPos.y, playerPos.z],
    playerUp: [playerUp.x, playerUp.y, playerUp.z],
    spiritMode: 'squirrel',
    controlledAnimalId: null,
    asleepSquirrelPos: null,
    asleepSquirrelUp: null
  };
}
