// P1 — tutoriels minimaux non intrusifs

const flags = {
  scanShown: false,
  grabShown: false,
  plantShown: false
};

export function maybeShowScanTutorial(scanState, showToastFn) {
  if (flags.scanShown) return;
  if (scanState.intensity > 0.4) {
    flags.scanShown = true;
    if (showToastFn) showToastFn('🌀 Scanner — maintiens pour révéler la forêt', true);
  }
}

export function resetTutorials() {
  flags.scanShown = false;
  flags.grabShown = false;
  flags.plantShown = false;
}
