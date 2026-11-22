// The Midnight Vault — the laser grid in the corridor.
// Each beam cycles on and off on a shared period with its own phase, so the
// corridor reads as a rhythm to cross, not a wall. A jammer freezes the
// whole grid dark for a few seconds.

import { dist } from './state.js';

export function updateLasers(state, dt) {
  const { world } = state;
  if (state.jamTimer > 0) {
    state.jamTimer -= dt;
    for (const beam of world.lasers) beam.hot = false;
    return;
  }
  const t = state.time;
  for (const beam of world.lasers) {
    const phaseTime = ((t / world.laserPeriod) + beam.phase) % 1;
    beam.hot = phaseTime * world.laserPeriod < world.laserOnTime;
    if (beam.cool > 0) beam.cool -= dt;
  }
}

// The thief touching a live beam trips the alarm. Returns true on a hit.
export function laserHit(state) {
  const { world, player } = state;
  for (const beam of world.lasers) {
    if (!beam.hot || beam.cool > 0) continue;
    if (player.x > beam.x0 - 6 && player.x < beam.x1 + 6 &&
        Math.abs(player.y - beam.y) < player.r + 3) {
      beam.cool = 0.9;
      return true;
    }
  }
  return false;
}

export function laserCycleFraction(state, beam) {
  return ((state.time / state.world.laserPeriod) + beam.phase) % 1;
}

export function lasersJammed(state) { return state.jamTimer > 0; }
export { dist };
