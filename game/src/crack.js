// The Midnight Vault — the timed safe-crack at the vault door.
// Hold E (or hold the mouse) beside the dial: the combination turns, the
// progress climbs, and the alarm creeps up with it. Fast is loud; patient
// is quiet. Let go and the tumblers hold their place, slowly slipping back.

import { dist } from './state.js';
import { playTone, playVaultOpen, playCrackClick } from './audio.js';

export const CRACK_RATE = 16; // progress per second while held
export const CRACK_ALARM = 7; // alarm per second while cracking
export const CRACK_SLIP = 2; // progress lost per second when released

export function nearVaultDial(state) {
  const v = state.world.vault;
  return dist(state.player.x, state.player.y, v.dialX, v.dialY) < 85;
}

export function updateCrack(state, dt) {
  const v = state.world.vault;
  if (v.open) return;
  if (state.crackHeld && nearVaultDial(state) && state.screen === 'playing') {
    v.progress += CRACK_RATE * dt;
    state.alarm = Math.min(100, state.alarm + CRACK_ALARM * dt);
    state.crackTick += dt;
    if (state.crackTick > 0.4) {
      state.crackTick = 0;
      playCrackClick();
    }
    if (v.progress >= 100) {
      v.progress = 100;
      v.open = true;
      state.world.ledger.visible = true;
      playVaultOpen();
      state.message = 'THE VAULT IS OPEN — TAKE THE AURUM LEDGER';
      state.messageTimer = 3;
    }
  } else if (v.progress > 0) {
    v.progress = Math.max(0, v.progress - CRACK_SLIP * dt);
  }
}

// Re-exported so render.js can name the crack sound without importing audio twice.
export function crackClickSound() { playTone(2400, 0.03, 'square', 0.03); }
