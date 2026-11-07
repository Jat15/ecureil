// =====================================================
//  Input Manager — agrège clavier, souris, manette
// =====================================================
import { ACTIONS, PRESSED_ACTIONS } from './actions.js';
import {
  KEY_BINDINGS, MOUSE_BINDINGS, GAMEPAD_BINDINGS,
  applyDeadzone, cameraCurve
} from './bindings.js';
import { setActiveGamepadGetter, vibrateHaptic } from './vibration.js';
import { createTouchHandler } from './touch.js';
import { audio } from '../audio.js';

export function createInputManager(renderer, elements, callbacks) {
  const canvas = renderer.domElement;

  // --- État brut ---
  const heldKeys = new Set();
  const heldMouseButtons = new Set();
  let cameraAccum = { yaw: 0, pitch: 0 };
  let mouseDrag = { active: false, x: 0, y: 0 };
  let gamepadIndex = null;
  let activeDevice = 'keyboard';      // 'keyboard' | 'mouse' | 'gamepad' | 'touch'

  // Handler tactile (créé dans attach())
  let touchHandler = null;
  let camDist = 7.2;

  // --- État exposé ---
  const state = {
    moveX: 0, moveZ: 0,
    jumpHeld: false, jumpPressed: false, glideHeld: false,
    plantHeld: false,
    interactHeld: false, interactPressed: false,
    scanHeld: false, scanPressed: false,
    transformPressed: false,
    spiritPressed: false,
    enterBodyPressed: false,
    exitBodyPressed: false,
    sprintHeld: false,
    pausePressed: false,
    photoPressed: false,
    savePressed: false,
    gamepad: false,
    _jumpPrev: false,
    _interactPrev: false,
    _scanPrev: false,
    _spiritPrev: false,
    _transformPrev: false
  };

  // --- Lecture manette ---
  function readGamepad() {
    if (gamepadIndex === null) return null;
    return navigator.getGamepads()[gamepadIndex] || null;
  }

  function readGamepadActions(gp) {
    const active = new Set();
    if (!gp) return active;
    const btnMap = GAMEPAD_BINDINGS.buttons;
    for (const idxStr of Object.keys(btnMap)) {
      const idx = parseInt(idxStr, 10);
      const b = gp.buttons[idx];
      if (!b) continue;
      // Pour triggers analogiques (LT/RT) : value > threshold
      const isTrigger = (idx === 6 || idx === 7);
      const pressed = isTrigger ? (b.value > GAMEPAD_BINDINGS.triggerThreshold) : b.pressed;
      if (pressed) active.add(btnMap[idx]);
    }
    return active;
  }

  function readGamepadAnalog(gp) {
    if (!gp) return { moveX: 0, moveZ: 0, cameraYaw: 0, cameraPitch: 0 };
    const dzM = GAMEPAD_BINDINGS.deadzoneMove;
    const dzC = GAMEPAD_BINDINGS.deadzoneCamera;
    const mx = applyDeadzone(gp.axes[0], dzM);
    const my = applyDeadzone(gp.axes[1], dzM);
    const cx = cameraCurve(applyDeadzone(gp.axes[2], dzC));
    const cy = cameraCurve(applyDeadzone(gp.axes[3], dzC));
    return { moveX: mx, moveZ: -my, cameraYaw: cx, cameraPitch: cy };
  }

  // --- Actions actives clavier + souris ---
  function computeActiveActions(gpActive) {
    const active = new Set();
    for (const code of heldKeys) {
      const a = KEY_BINDINGS[code];
      if (a) active.add(a);
    }
    for (const btn of heldMouseButtons) {
      const a = MOUSE_BINDINGS[btn];
      if (a) active.add(a);
    }
    // Ajouter les actions manette
    for (const a of gpActive) active.add(a);
    return active;
  }

  // --- Détection device ---
  function setDevice(d) {
    if (activeDevice !== d) {
      activeDevice = d;
      if (callbacks.onDeviceChange) callbacks.onDeviceChange(d);
    }
  }

  // --- Update ---
  function update(dt) {
    const gp = readGamepad();
    state.gamepad = !!gp;
    const gpActive = readGamepadActions(gp);
    const gpAnalog = readGamepadAnalog(gp);
    const active = computeActiveActions(gpActive);

    // Mouvement (clavier + manette)
    let mx = 0, mz = 0;
    if (active.has(ACTIONS.MOVE_RIGHT)) mx += 1;
    if (active.has(ACTIONS.MOVE_LEFT))  mx -= 1;
    if (active.has(ACTIONS.MOVE_FORWARD)) mz += 1;
    if (active.has(ACTIONS.MOVE_BACK))    mz -= 1;
    mx += gpAnalog.moveX;
    mz += gpAnalog.moveZ;
    state.moveX = mx;
    state.moveZ = mz;

    // Caméra manette (stick D)
    if (gpAnalog.cameraYaw !== 0 || gpAnalog.cameraPitch !== 0) {
      cameraAccum.yaw   -= gpAnalog.cameraYaw * GAMEPAD_BINDINGS.cameraSpeedYaw * dt;
      cameraAccum.pitch -= gpAnalog.cameraPitch * GAMEPAD_BINDINGS.cameraSpeedPitch * dt;
      setDevice('gamepad');
    }

    // Held
    state.jumpHeld     = active.has(ACTIONS.JUMP);
    state.interactHeld = active.has(ACTIONS.INTERACT);
    state.plantHeld    = state.interactHeld;
    state.scanHeld     = active.has(ACTIONS.SCAN);
    state.sprintHeld   = active.has(ACTIONS.SPRINT);
    state.glideHeld    = state.jumpHeld || state.sprintHeld;

    // Fronts montants
    state.jumpPressed     = state.jumpHeld && !state._jumpPrev;
    state.interactPressed = state.interactHeld && !state._interactPrev;
    state.scanPressed     = state.scanHeld && !state._scanPrev;
    state.spiritPressed   = active.has(ACTIONS.SPIRIT) && !state._spiritPrev;
    state.transformPressed = active.has(ACTIONS.TRANSFORM) && !state._transformPrev;
    state.enterBodyPressed = active.has(ACTIONS.ENTER_BODY);
    state.exitBodyPressed  = active.has(ACTIONS.EXIT_BODY);
    state.pausePressed    = active.has(ACTIONS.PAUSE);
    state.photoPressed    = active.has(ACTIONS.PHOTO);
    state.savePressed     = active.has(ACTIONS.SAVE);

    // Prev
    state._jumpPrev      = state.jumpHeld;
    state._interactPrev  = state.interactHeld;
    state._scanPrev      = state.scanHeld;
    state._spiritPrev    = active.has(ACTIONS.SPIRIT);
    state._transformPrev = active.has(ACTIONS.TRANSFORM);

    // Zoom (D-pad ou molette)
    if (active.has(ACTIONS.ZOOM_IN))  camDist = Math.max(3.5, camDist - 6 * dt);
    if (active.has(ACTIONS.ZOOM_OUT)) camDist = Math.min(16, camDist + 6 * dt);

    // Fusion tactile (P0.3)
    if (touchHandler && touchHandler.isTouchDevice) {
      const t = touchHandler.update(dt);
      state.moveX += t.state.moveX;
      state.moveZ += t.state.moveZ;
      if (t.state.jumpHeld) {
        state.jumpHeld = true;
        if (t.state.jumpPressed) state.jumpPressed = true;
        state.glideHeld = true;
      }
      if (t.state.interactHeld) {
        state.interactHeld = true;
        state.plantHeld = true;
        if (t.state.interactPressed) state.interactPressed = true;
      }
      if (t.state.scanHeld) {
        state.scanHeld = true;
        if (t.state.scanPressed) state.scanPressed = true;
      }
      if (t.state.spiritPressed) state.spiritPressed = true;
      if (t.camera.yaw !== 0 || t.camera.pitch !== 0) {
        cameraAccum.yaw += t.camera.yaw;
        cameraAccum.pitch += t.camera.pitch;
        setDevice('touch');
      }
    }

    // Callbacks
    if (callbacks.onStateChange) callbacks.onStateChange(state);
    if (cameraAccum.yaw !== 0 || cameraAccum.pitch !== 0) {
      if (callbacks.onCamera) callbacks.onCamera(cameraAccum.yaw, cameraAccum.pitch);
      cameraAccum.yaw = 0; cameraAccum.pitch = 0;
    }
    if (callbacks.onCamDistChange) callbacks.onCamDistChange(camDist);
  }

  // --- Listeners ---
  function onKeyDown(e) {
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    audio.init();
    heldKeys.add(e.code);
    if (e.code === 'F5') e.preventDefault();
    setDevice('keyboard');
  }
  function onKeyUp(e) { heldKeys.delete(e.code); }
  function onBlur() { heldKeys.clear(); heldMouseButtons.clear(); }
  function onMouseMove(e) {
    if (document.pointerLockElement === canvas) {
      cameraAccum.yaw   -= e.movementX * 0.0026;
      cameraAccum.pitch -= e.movementY * 0.0020;
      setDevice('mouse');
    } else if (mouseDrag.active) {
      cameraAccum.yaw   -= (e.clientX - mouseDrag.x) * 0.004;
      cameraAccum.pitch -= (e.clientY - mouseDrag.y) * 0.003;
      mouseDrag.x = e.clientX;
      mouseDrag.y = e.clientY;
      setDevice('mouse');
    }
  }
  function onMouseDown(e) {
    if (elements.isTouchDevice && e.button === 0) {
      mouseDrag.active = true;
      mouseDrag.x = e.clientX;
      mouseDrag.y = e.clientY;
      return;
    }
    if (MOUSE_BINDINGS[e.button] !== undefined) {
      heldMouseButtons.add(e.button);
      if (e.button === 2) e.preventDefault();
      setDevice('mouse');
    }
  }
  function onMouseUp(e) {
    if (e.button === 0) mouseDrag.active = false;
    heldMouseButtons.delete(e.button);
  }
  function onWheel(e) {
    camDist = Math.max(3.5, Math.min(16, camDist + e.deltaY * 0.006));
    if (callbacks.onCamDistChange) callbacks.onCamDistChange(camDist);
    setDevice('mouse');
  }
  function onContextMenu(e) { e.preventDefault(); }

  function onGamepadConnected(e) {
    gamepadIndex = e.gamepad.index;
    setDevice('gamepad');
    console.log('🎮 Manette connectée :', e.gamepad.id);
  }
  function onGamepadDisconnected(e) {
    if (gamepadIndex === e.gamepad.index) {
      gamepadIndex = null;
      console.log('🎮 Manette déconnectée');
    }
  }

  function attach() {
    // Créer le handler tactile
    touchHandler = createTouchHandler(elements, {
      onHaptic: (kind) => vibrateHaptic(kind)
    });
    if (callbacks.onTouchReady) callbacks.onTouchReady(touchHandler);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('wheel', onWheel, { passive: true });
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('gamepadconnected', onGamepadConnected);
    window.addEventListener('gamepaddisconnected', onGamepadDisconnected);
    // Détecter une manette déjà branchée au démarrage
    const initial = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of initial) {
      if (gp) { gamepadIndex = gp.index; break; }
    }
  }

  function detach() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('gamepadconnected', onGamepadConnected);
    window.removeEventListener('gamepaddisconnected', onGamepadDisconnected);
  }

  attach();
  // Brancher vibration
  setActiveGamepadGetter(() => readGamepad());

  return {
    update,
    state,
    setGameStarted(v) { /* conservé pour compat */ },
    getCamDist() { return camDist; },
    setCamDist(v) { camDist = v; },
    getActiveDevice() { return activeDevice; },
    getGamepad() { return readGamepad(); },
    detach
  };
}
