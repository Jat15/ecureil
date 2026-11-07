// =====================================================
//  Touch Handler — gère les inputs tactiles
// =====================================================
// Exposé : { update(dt) → {moveX, moveZ, jumpHeld, ...}, setVisible(bool), state }
//
// Zones :
//   - Moitié gauche  : joystick virtuel (déplacement)
//   - Moitié droite  : drag caméra
//   - Boutons (DOM)  : jump, interact, scan, spirit
//
// Détection de zone au touchstart, attribution d'un identifiant
// tactile unique par zone pour multi-touch propre.

export function createTouchHandler(elements, callbacks = {}) {
  // elements = { joyBase, joyKnob, jumpBtn, interactBtn, scanBtn, spiritBtn, touchUI }
  const state = {
    joy:    { id: null, baseX: 0, baseY: 0, x: 0, y: 0, active: false, maxDist: 64 },
    look:   { id: null, lastX: 0, lastY: 0 },
    jump:   { id: null, active: false, prev: false },
    interact: { id: null, active: false, prev: false },
    scan:   { id: null, active: false, prev: false },
    spirit: { id: null, active: false, prev: false }
  };

  let visible = true;
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  // Actions exposées (état calculé)
  const out = {
    moveX: 0, moveZ: 0,
    cameraYaw: 0, cameraPitch: 0,
    jumpHeld: false, jumpPressed: false,
    interactHeld: false, interactPressed: false,
    scanHeld: false, scanPressed: false,
    spiritPressed: false
  };

  // --- Helpers ---
  function isPointInEl(x, y, el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function setBtnVisual(el, active) {
    if (!el) return;
    if (active) el.classList.add('pressed');
    else el.classList.remove('pressed');
  }

  // --- Touchstart ---
  function onStart(e) {
    if (!visible) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      // 1) Boutons (priorité)
      if (state.jump.id === null && isPointInEl(t.clientX, t.clientY, elements.jumpBtn)) {
        state.jump.id = t.identifier;
        state.jump.active = true;
        setBtnVisual(elements.jumpBtn, true);
        if (callbacks.onHaptic) callbacks.onHaptic('tap');
        continue;
      }
      if (state.interact.id === null && isPointInEl(t.clientX, t.clientY, elements.interactBtn)) {
        state.interact.id = t.identifier;
        state.interact.active = true;
        setBtnVisual(elements.interactBtn, true);
        if (callbacks.onHaptic) callbacks.onHaptic('tap');
        continue;
      }
      if (state.scan.id === null && isPointInEl(t.clientX, t.clientY, elements.scanBtn)) {
        state.scan.id = t.identifier;
        state.scan.active = true;
        setBtnVisual(elements.scanBtn, true);
        if (callbacks.onHaptic) callbacks.onHaptic('tap');
        continue;
      }
      if (state.spirit.id === null && isPointInEl(t.clientX, t.clientY, elements.spiritBtn)) {
        state.spirit.id = t.identifier;
        state.spirit.active = true;
        setBtnVisual(elements.spiritBtn, true);
        if (callbacks.onHaptic) callbacks.onHaptic('tap');
        continue;
      }

      // 2) Joystick (moitié gauche)
      if (t.clientX < window.innerWidth * 0.5 && state.joy.id === null) {
        state.joy.id = t.identifier;
        state.joy.baseX = t.clientX;
        state.joy.baseY = t.clientY;
        state.joy.x = 0;
        state.joy.y = 0;
        state.joy.active = true;
        if (elements.joyBase) {
          elements.joyBase.style.left = t.clientX + 'px';
          elements.joyBase.style.top = t.clientY + 'px';
          elements.joyBase.style.display = 'block';
        }
        if (elements.joyKnob) elements.joyKnob.style.transform = 'translate(-50%, -50%)';
        continue;
      }

      // 3) Drag caméra (moitié droite)
      if (t.clientX >= window.innerWidth * 0.5 && state.look.id === null) {
        state.look.id = t.identifier;
        state.look.lastX = t.clientX;
        state.look.lastY = t.clientY;
      }
    }
  }

  // --- Touchmove ---
  function onMove(e) {
    if (!visible) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === state.joy.id) {
        let dx = t.clientX - state.joy.baseX;
        let dy = t.clientY - state.joy.baseY;
        const d = Math.hypot(dx, dy);
        if (d > state.joy.maxDist) {
          dx = dx / d * state.joy.maxDist;
          dy = dy / d * state.joy.maxDist;
        }
        state.joy.x = dx / state.joy.maxDist;
        state.joy.y = dy / state.joy.maxDist;
        if (elements.joyKnob) {
          elements.joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        }
      } else if (t.identifier === state.look.id) {
        out.cameraYaw   -= (t.clientX - state.look.lastX) * 0.006;
        out.cameraPitch -= (t.clientY - state.look.lastY) * 0.005;
        state.look.lastX = t.clientX;
        state.look.lastY = t.clientY;
      }
    }
  }

  // --- Touchend ---
  function onEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === state.joy.id) {
        state.joy.id = null;
        state.joy.active = false;
        state.joy.x = 0;
        state.joy.y = 0;
        if (elements.joyBase) elements.joyBase.style.display = 'none';
      }
      if (t.identifier === state.look.id) state.look.id = null;
      if (t.identifier === state.jump.id) {
        state.jump.id = null; state.jump.active = false;
        setBtnVisual(elements.jumpBtn, false);
      }
      if (t.identifier === state.interact.id) {
        state.interact.id = null; state.interact.active = false;
        setBtnVisual(elements.interactBtn, false);
      }
      if (t.identifier === state.scan.id) {
        state.scan.id = null; state.scan.active = false;
        setBtnVisual(elements.scanBtn, false);
      }
      if (t.identifier === state.spirit.id) {
        state.spirit.id = null; state.spirit.active = false;
        setBtnVisual(elements.spiritBtn, false);
      }
    }
  }

  // --- Update (appelé chaque frame) ---
  function update() {
    // Axes de mouvement
    out.moveX = state.joy.active ? state.joy.x : 0;
    out.moveZ = state.joy.active ? -state.joy.y : 0;

    // Held
    out.jumpHeld     = state.jump.active;
    out.interactHeld = state.interact.active;
    out.scanHeld     = state.scan.active;

    // Fronts montants
    out.jumpPressed     = state.jump.active && !state.jump.prev;
    out.interactPressed = state.interact.active && !state.interact.prev;
    out.scanPressed     = state.scan.active && !state.scan.prev;
    out.spiritPressed   = state.spirit.active && !state.spirit.prev;

    // Prev
    state.jump.prev = state.jump.active;
    state.interact.prev = state.interact.active;
    state.scan.prev = state.scan.active;
    state.spirit.prev = state.spirit.active;

    // Reset caméra après consommation
    const cam = { yaw: out.cameraYaw, pitch: out.cameraPitch };
    out.cameraYaw = 0;
    out.cameraPitch = 0;

    return { state: out, camera: cam };
  }

  // --- Visibilité ---
  function setVisible(v) {
    visible = v;
    if (elements.touchUI) {
      elements.touchUI.style.display = (v && isTouchDevice) ? 'block' : 'none';
    }
  }

  function attach() {
    document.addEventListener('touchstart', onStart, { passive: false });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
  }

  function detach() {
    document.removeEventListener('touchstart', onStart);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onEnd);
    document.removeEventListener('touchcancel', onEnd);
  }

  attach();

  return { update, setVisible, state, isTouchDevice, detach };
}
