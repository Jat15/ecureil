import { audio } from './audio.js';

export const input = {
  moveX: 0, moveZ: 0,
  jumpHeld: false, jumpPressed: false, glideHeld: false,
  plantHeld: false, gamepad: false, _jumpPrev: false
};

export let yawDelta = 0, pitchDelta = 0;
export function resetYawPitch() { yawDelta = 0; pitchDelta = 0; }
export function consumeYawPitch() { const y = yawDelta, p = pitchDelta; yawDelta = 0; pitchDelta = 0; return { y, p }; }

export let camPitch = 0.38, camDist = 7.2;
export function getCamPitch() { return camPitch; }
export function setCamPitch(v) { camPitch = v; }
export function getCamDist() { return camDist; }
export function setCamDist(v) { camDist = v; }

export const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

const keys = Object.create(null);
let gamepadIndex = null;
export let gameStarted = false;
export function setGameStarted(v) { gameStarted = v; }

const touchState = {
  joy: { id: null, baseX: 0, baseY: 0, x: 0, y: 0, active: false, maxDist: 64 },
  look: { id: null, lastX: 0, lastY: 0 },
  jump: { id: null, active: false },
  plant: { id: null, active: false }
};
let mouseDrag = { active: false, x: 0, y: 0 };

const dom = {};

export function initInput(renderer, elements) {
  Object.assign(dom, elements);
  const canvas = renderer.domElement;

  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    audio.init();
    if (e.code === 'KeyF5') { e.preventDefault(); dom.onManualSave && dom.onManualSave(); }
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  window.addEventListener('mousemove', e => {
    if (document.pointerLockElement === canvas) {
      yawDelta   -= e.movementX * 0.0026;
      pitchDelta -= e.movementY * 0.0020;
    } else if (mouseDrag.active) {
      yawDelta   -= (e.clientX - mouseDrag.x) * 0.004;
      pitchDelta -= (e.clientY - mouseDrag.y) * 0.003;
      mouseDrag.x = e.clientX; mouseDrag.y = e.clientY;
    }
  });
  canvas.addEventListener('mousedown', e => {
    if (isTouchDevice && e.button === 0) { mouseDrag.active = true; mouseDrag.x = e.clientX; mouseDrag.y = e.clientY; }
  });
  window.addEventListener('mouseup', () => { mouseDrag.active = false; });
  window.addEventListener('wheel', e => {
    camDist = Math.max(3.5, Math.min(16, camDist + e.deltaY * 0.006));
  }, { passive: true });

  function isPointInEl(x, y, el) {
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }
  function onTouchStart(e) {
    if (!gameStarted) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (touchState.jump.id === null && isPointInEl(t.clientX, t.clientY, dom.jumpBtn)) {
        touchState.jump.id = t.identifier; touchState.jump.active = true;
        dom.jumpBtn.classList.add('pressed'); continue;
      }
      if (touchState.plant.id === null && isPointInEl(t.clientX, t.clientY, dom.plantBtn)) {
        touchState.plant.id = t.identifier; touchState.plant.active = true;
        dom.plantBtn.classList.add('pressed'); continue;
      }
      if (t.clientX < window.innerWidth * 0.5 && touchState.joy.id === null) {
        touchState.joy.id = t.identifier;
        touchState.joy.baseX = t.clientX; touchState.joy.baseY = t.clientY;
        touchState.joy.x = 0; touchState.joy.y = 0; touchState.joy.active = true;
        dom.joyBase.style.left = t.clientX + 'px'; dom.joyBase.style.top = t.clientY + 'px';
        dom.joyBase.style.display = 'block';
        dom.joyKnob.style.transform = 'translate(-50%, -50%)';
        continue;
      }
      if (t.clientX >= window.innerWidth * 0.5 && touchState.look.id === null) {
        touchState.look.id = t.identifier;
        touchState.look.lastX = t.clientX; touchState.look.lastY = t.clientY;
      }
    }
  }
  function onTouchMove(e) {
    if (!gameStarted) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === touchState.joy.id) {
        let dx = t.clientX - touchState.joy.baseX;
        let dy = t.clientY - touchState.joy.baseY;
        const d = Math.hypot(dx, dy);
        if (d > touchState.joy.maxDist) { dx = dx / d * touchState.joy.maxDist; dy = dy / d * touchState.joy.maxDist; }
        touchState.joy.x = dx / touchState.joy.maxDist;
        touchState.joy.y = dy / touchState.joy.maxDist;
        dom.joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      } else if (t.identifier === touchState.look.id) {
        yawDelta   -= (t.clientX - touchState.look.lastX) * 0.006;
        pitchDelta -= (t.clientY - touchState.look.lastY) * 0.005;
        touchState.look.lastX = t.clientX; touchState.look.lastY = t.clientY;
      }
    }
  }
  function onTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === touchState.joy.id) {
        touchState.joy.id = null; touchState.joy.active = false;
        touchState.joy.x = 0; touchState.joy.y = 0;
        dom.joyBase.style.display = 'none';
      }
      if (t.identifier === touchState.look.id) touchState.look.id = null;
      if (t.identifier === touchState.jump.id) {
        touchState.jump.id = null; touchState.jump.active = false;
        dom.jumpBtn.classList.remove('pressed');
      }
      if (t.identifier === touchState.plant.id) {
        touchState.plant.id = null; touchState.plant.active = false;
        dom.plantBtn.classList.remove('pressed');
      }
    }
  }
  document.addEventListener('touchstart', onTouchStart, { passive: false });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);
  document.addEventListener('touchcancel', onTouchEnd);

  window.addEventListener('gamepadconnected', e => { gamepadIndex = e.gamepad.index; });
  window.addEventListener('gamepaddisconnected', e => { if (gamepadIndex === e.gamepad.index) gamepadIndex = null; });
}

function applyDeadzone(v, dz = 0.15) {
  if (v === undefined || v === null) return 0;
  if (Math.abs(v) < dz) return 0;
  return (v - Math.sign(v) * dz) / (1 - dz);
}

export function updateInputFrame(dt) {
  let mx = 0, mz = 0;
  if (keys['KeyW'] || keys['ArrowUp'])    mz += 1;
  if (keys['KeyS'] || keys['ArrowDown'])  mz -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
  if (keys['KeyA'] || keys['ArrowLeft'])  mx -= 1;
  if (touchState.joy.active) { mx += touchState.joy.x; mz -= touchState.joy.y; }
  let gpJump = false, gpPlant = false;
  const gp = gamepadIndex !== null ? navigator.getGamepads()[gamepadIndex] : null;
  input.gamepad = !!gp;
  if (gp) {
    mx += applyDeadzone(gp.axes[0]);
    mz -= applyDeadzone(gp.axes[1]);
    yawDelta -= applyDeadzone(gp.axes[2]) * 3.2 * dt;
    pitchDelta -= applyDeadzone(gp.axes[3]) * 2.2 * dt;
    if (gp.buttons[6] && gp.buttons[6].pressed) camDist = Math.max(3.5, camDist - 6 * dt);
    if (gp.buttons[7] && gp.buttons[7].pressed) camDist = Math.min(16,  camDist + 6 * dt);
    gpJump = !!(gp.buttons[0] && gp.buttons[0].pressed);
    gpPlant = !!(gp.buttons[2] && gp.buttons[2].pressed);
  }
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  input.moveX = mx; input.moveZ = mz;
  const jumpNow = !!keys['Space'] || touchState.jump.active || gpJump;
  input.jumpHeld = jumpNow;
  input.jumpPressed = jumpNow && !input._jumpPrev;
  input._jumpPrev = jumpNow;
  input.glideHeld = jumpNow || !!keys['ShiftLeft'] || !!keys['ShiftRight'];
  input.plantHeld = !!keys['KeyE'] || touchState.plant.active || gpPlant;
}
