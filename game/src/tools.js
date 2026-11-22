// The Midnight Vault — the thief's three tools, two uses each.
// 1 LASER JAMMER freezes the grid dark for 6 seconds.
// 2 DECOY throws a false noise that pulls the nearest guard off patrol.
// 3 LOCKPICK opens one keycard door without the keycard.

import { dist } from './state.js';
import { playTone, playDecoy, playDoorOpen } from './audio.js';

export const JAMMER_SECONDS = 6;

export function useJammer(state) {
  if (state.tools.jammer <= 0) { deny(state, 'NO JAMMERS LEFT'); return false; }
  state.tools.jammer -= 1;
  state.jamTimer = JAMMER_SECONDS;
  state.message = 'LASER JAMMER — GRID DARK FOR 6 SECONDS';
  state.messageTimer = 2.5;
  playTone(880, 0.15, 'triangle', 0.08);
  return true;
}

export function useDecoy(state) {
  if (state.tools.decoy <= 0) { deny(state, 'NO DECOYS LEFT'); return false; }
  state.tools.decoy -= 1;
  // The noise lands ahead of the thief, in the direction they face.
  const dx = Math.cos(state.player.angle), dy = Math.sin(state.player.angle);
  const mark = { x: state.player.x + dx * 130, y: state.player.y + dy * 130, t: 5 };
  state.decoyMark = mark;
  let nearest = null, best = Infinity;
  for (const g of state.world.guards) {
    const d = dist(g.x, g.y, mark.x, mark.y);
    if (d < best) { best = d; nearest = g; }
  }
  if (nearest) nearest.decoy = { x: mark.x, y: mark.y, t: 5 };
  state.message = 'DECOY THROWN — A GUARD GOES TO LISTEN';
  state.messageTimer = 2.5;
  playDecoy();
  return true;
}

export function useLockpick(state) {
  if (state.tools.lockpick <= 0) { deny(state, 'NO LOCKPICKS LEFT'); return false; }
  for (const d of state.world.doors) {
    if (!d.locked) continue;
    const cx = d.x + d.w / 2, cy = d.y + d.h / 2;
    if (dist(state.player.x, state.player.y, cx, cy) < 80) {
      d.locked = false;
      state.tools.lockpick -= 1;
      state.message = d.label + ' PICKED OPEN';
      state.messageTimer = 2.5;
      playDoorOpen();
      return true;
    }
  }
  deny(state, 'NO LOCKED DOOR NEARBY');
  return false;
}

function deny(state, text) {
  state.message = text;
  state.messageTimer = 1.6;
  playTone(160, 0.15, 'square', 0.05);
}
