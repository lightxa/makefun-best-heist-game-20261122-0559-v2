// The Midnight Vault — bootstrap, game loop and the rules that tie the
// systems together: movement and collision, pickups, alarm, caught and win.

import { VIEW_W, VIEW_H, HUD_H, createGameState, dist, pointInRectExport, resolveCircleCollision } from './state.js';
import { updateGuards, updateCameras, checkDetection } from './guards.js';
import { updateLasers, laserHit } from './lasers.js';
import { updateCrack, nearVaultDial } from './crack.js';
import { useJammer, useDecoy, useLockpick } from './tools.js';
import { renderGame } from './render.js';
import { createInput, attachInput, moveVector, isSprinting, isCrackKey } from './input.js';
import { stageShot } from './shots.js';
import { ensureAudio, playPickup, playKeycard, playDoorOpen, playLaserZap, playCaught, playWin } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(location.search);
const shot = params.get('shot') || '';
const seed = parseInt(params.get('seed') || '7', 10) || 7;

let state = shot ? stageShot(shot, seed) : createGameState(seed);
const input = createInput();

let scale = 1, offX = 0, offY = 0;
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  scale = Math.min(canvas.width / VIEW_W, canvas.height / VIEW_H);
  offX = (canvas.width - VIEW_W * scale) / 2;
  offY = (canvas.height - VIEW_H * scale) / 2;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function toLogical(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return { x: (clientX - r.left - offX) / scale, y: (clientY - r.top - offY) / scale };
}

function startGame() {
  if (state.screen !== 'title') return;
  ensureAudio();
  state.screen = 'playing';
  statusEl.textContent = 'The heist is on. Find the keycard.';
}

function restartGame() {
  const fresh = createGameState(seed);
  fresh.screen = 'playing';
  state = fresh;
  statusEl.textContent = 'The heist is on. Find the keycard.';
}

function tryOpenDoorNearPlayer() {
  for (const d of state.world.doors) {
    if (d.locked) continue;
  }
  // Doors open automatically once unlocked; this is only the keycard check.
  for (const d of state.world.doors) {
    if (!d.locked) continue;
    const cx = d.x + d.w / 2, cy = d.y + d.h / 2;
    if (dist(state.player.x, state.player.y, cx, cy) < 70 && state.hasKeycard) {
      d.locked = false;
      state.message = d.label + ' UNLOCKED WITH KEYCARD';
      state.messageTimer = 2;
      playDoorOpen();
    }
  }
}

function onKeyDown(key) {
  ensureAudio();
  const k = key.length === 1 ? key.toLowerCase() : key;
  if (state.screen === 'title' && (k === 'enter' || k === ' ')) { startGame(); return; }
  if ((state.screen === 'caught' || state.screen === 'win') && k === 'r') { restartGame(); return; }
  if (state.screen !== 'playing') return;
  if (k === '1') useJammer(state);
  else if (k === '2') useDecoy(state);
  else if (k === '3') useLockpick(state);
  else if (k === 'e') tryOpenDoorNearPlayer();
  else if (k === 'r') restartGame();
}

function onMouseDown(x, y) {
  ensureAudio();
  if (state.screen === 'title') { startGame(); /* fall through: the click also walks */ }
  else if (state.screen === 'caught' || state.screen === 'win') return;
  // Clicking a HUD tool box uses that tool.
  if (y >= 10 && y <= 36) {
    const tools = [[980, () => useJammer(state)], [1076, () => useDecoy(state)], [1172, () => useLockpick(state)]];
    for (const [tx, fn] of tools) {
      if (x >= tx && x <= tx + 88) { fn(); return; }
    }
  }
  state.moveTarget = { x, y };
}

attachInput(input, canvas, toLogical, {
  onKeyDown,
  onKeyUp: () => {},
  onMouseDown,
  onMouseUp: () => {},
});

function movePlayer(dt) {
  const p = state.player;
  const v = moveVector(input);
  let mx = v.x, my = v.y;
  if ((mx === 0 && my === 0) && state.moveTarget) {
    const dx = state.moveTarget.x - p.x, dy = state.moveTarget.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 8) { state.moveTarget = null; }
    else { mx = dx / d; my = dy / d; }
  }
  if (mx === 0 && my === 0) { p.moving = false; return; }
  p.moving = true;
  p.sprint = isSprinting(input);
  const speed = p.sprint ? 250 : 175;
  const stepX = mx * speed * dt, stepY = my * speed * dt;
  p.angle = Math.atan2(my, mx);
  p.x += stepX;
  p.y += stepY;
  resolveCircleCollision(state.world, p);
  p.x = Math.max(16 + p.r, Math.min(VIEW_W - 16 - p.r, p.x));
  p.y = Math.max(HUD_H + 16 + p.r, Math.min(VIEW_H - 16 - p.r, p.y));
}

function updatePlaying(dt) {
  state.time += dt;
  if (state.messageTimer > 0) state.messageTimer -= dt;
  if (state.seenFlash > 0) state.seenFlash -= dt;
  if (state.decoyMark) { state.decoyMark.t -= dt; if (state.decoyMark.t <= 0) state.decoyMark = null; }

  movePlayer(dt);
  updateGuards(state, dt);
  updateCameras(state, dt);
  updateLasers(state, dt);
  state.crackHeld = isCrackKey(input) || (input.mouseDown && nearVaultDial(state));
  updateCrack(state, dt);

  // Keycard pickup from the teller desk.
  const k = state.world.keycard;
  if (!k.taken && dist(state.player.x, state.player.y, k.x, k.y) < 26) {
    k.taken = true;
    state.hasKeycard = true;
    state.message = 'KEYCARD TAKEN — THE VAULT DOORS WILL OPEN';
    state.messageTimer = 3;
    playKeycard();
  }
  tryOpenDoorNearPlayer();

  // Ledger pickup in front of the open vault.
  const l = state.world.ledger;
  if (l.visible && !l.taken && dist(state.player.x, state.player.y, l.x, l.y) < 30) {
    l.taken = true;
    state.hasLedger = true;
    state.message = 'THE AURUM LEDGER IS YOURS — GET OUT';
    state.messageTimer = 3;
    playPickup();
  }

  // Alarm: seen, lasers, sprint noise, and the slow decay of suspicion.
  const found = checkDetection(state);
  if (found.seen) {
    // A brief glimpse stings; only sustained exposure trips the alarm.
    const rate = found.by.startsWith('CAM') ? 22 : 28;
    state.alarm = Math.min(100, state.alarm + rate * dt);
    state.seenFlash = Math.min(1, state.seenFlash + dt * 3);
    for (const g of state.world.guards) if (g.name === found.by) g.alert = 3;
    if (state.alarm >= 70) for (const g of state.world.guards) g.alert = Math.max(g.alert, 2);
  } else {
    state.alarm = Math.max(0, state.alarm - 10 * dt);
  }
  if (state.player.sprint && state.player.moving) {
    state.alarm = Math.min(100, state.alarm + 3 * dt);
  }
  if (laserHit(state)) {
    state.alarm = Math.min(100, state.alarm + 22);
    state.seenFlash = 1;
    playLaserZap();
  }

  // Escape with the ledger wins the night.
  if (state.hasLedger && pointInRectExport(state.player.x, state.player.y, state.world.exit)) {
    state.screen = 'win';
    state.winTime = state.time;
    statusEl.textContent = 'Escaped with the Aurum Ledger.';
    playWin();
    return;
  }
  // Alarm at 100 means the night is over.
  if (state.alarm >= 100) {
    state.screen = 'caught';
    state.caughtBy = found.by || 'THE ALARM';
    statusEl.textContent = 'Caught by ' + state.caughtBy + '.';
    playCaught();
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!state.frozen) {
    if (state.screen === 'playing') updatePlaying(dt);
    else if (state.screen === 'title') state.time += dt;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#061414';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, offX, offY);
  renderGame(ctx, state);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Test hook: the playtest driver reads the live state from here.
window.__midnightVault = {
  get state() { return state; },
  start: startGame,
  restart: restartGame,
};
