// The Midnight Vault — guard patrols, vision cones and camera sweeps.

import { dist, lineBlocked, solidAt } from './state.js';

export const CONE_RANGE = 185;
export const CONE_HALF = 0.62; // radians either side of the facing angle
export const CAM_RANGE = 205;
export const CAM_HALF = 0.5;

function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// True when the watcher at (wx,wy) facing `angle` can see the player.
export function watcherSees(world, wx, wy, angle, range, half, px, py) {
  const d = dist(wx, wy, px, py);
  if (d > range) return false;
  if (Math.abs(angleDiff(angleTo(wx, wy, px, py), angle)) > half) return false;
  if (lineBlocked(world, wx, wy, px, py)) return false;
  return true;
}

function moveGuardToward(guard, tx, ty, speed, dt, world) {
  const dx = tx - guard.x, dy = ty - guard.y;
  const d = Math.hypot(dx, dy);
  if (d < 2) return true;
  const step = Math.min(d, speed * dt);
  const nx = guard.x + (dx / d) * step;
  const ny = guard.y + (dy / d) * step;
  guard.angle = Math.atan2(dy, dx);
  if (!solidAt(world, nx, guard.y, 11)) guard.x = nx;
  if (!solidAt(world, guard.x, ny, 11)) guard.y = ny;
  return d <= step + 1;
}

export function updateGuards(state, dt) {
  const { world, player } = state;
  for (const g of world.guards) {
    if (g.alert > 0) g.alert -= dt;
    // A thrown decoy pulls the guard off patrol for a few seconds.
    if (g.decoy) {
      const arrived = moveGuardToward(g, g.decoy.x, g.decoy.y, g.speed * 1.15, dt, world);
      if (arrived || g.decoy.t <= 0) g.decoy = null;
      if (g.decoy) g.decoy.t -= dt;
      continue;
    }
    // High alarm: the guard rushes the thief's last seen spot.
    if (state.alarm >= 70 && g.alert > 0) {
      moveGuardToward(g, player.x, player.y, g.speed * 1.6, dt, world);
      continue;
    }
    const wp = g.waypoints[g.wp];
    const arrived = moveGuardToward(g, wp[0], wp[1], g.speed, dt, world);
    if (arrived) g.wp = (g.wp + 1) % g.waypoints.length;
  }
}

export function updateCameras(state, dt) {
  for (const c of state.world.cameras) {
    c.phase += dt * c.speed;
    c.angle = c.base + Math.sin(c.phase) * c.sweep;
  }
}

// Returns { seen: bool, by: string } — who, if anyone, has eyes on the thief.
export function checkDetection(state) {
  const { world, player } = state;
  for (const g of world.guards) {
    if (watcherSees(world, g.x, g.y, g.angle, CONE_RANGE, CONE_HALF, player.x, player.y)) {
      return { seen: true, by: g.name };
    }
  }
  for (const c of world.cameras) {
    if (watcherSees(world, c.x, c.y, c.angle, CAM_RANGE, CAM_HALF, player.x, player.y)) {
      return { seen: true, by: c.name };
    }
  }
  return { seen: false, by: '' };
}
