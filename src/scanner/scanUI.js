// P1 — UI HTML du scanner spectral
let _lastIntensity = -1;
let _lastScanClass = null;

export function updateScanUI(scanState) {
  const k = scanState.intensity;
  const active = k > 0.05;

  // Toggle classe body (pour CSS éventuel + curseur)
  if (active !== _lastScanClass) {
    document.body.classList.toggle('scan-active', active);
    _lastScanClass = active;
  }

  // Overlay DOM CSS (bordure spectrale)
  const el = document.getElementById('spectralOverlay');
  if (el) {
    if (Math.abs(k - _lastIntensity) > 0.01) {
      el.style.opacity = String(k * 0.7);
      _lastIntensity = k;
    }
  }
}
