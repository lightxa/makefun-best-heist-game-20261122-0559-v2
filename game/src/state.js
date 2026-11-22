// The Midnight Vault — world layout and game state.
// One bank floor, seen whole at 1280x800: teller hall (west), the laser
// corridor and the archive detour (middle), security room (north middle)
// and the vault room (east). Every coordinate below is in that space.

export const VIEW_W = 1280;
export const VIEW_H = 800;
export const HUD_H = 72;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rect(x, y, w, h) { return { x, y, w, h }; }
function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function buildWorld() {
  const walls = [
    // Outer shell (below the HUD strip).
    rect(0, HUD_H, VIEW_W, 16), rect(0, VIEW_H - 16, VIEW_W, 16),
    rect(0, HUD_H, 16, VIEW_H - HUD_H), rect(VIEW_W - 16, HUD_H, 16, VIEW_H - HUD_H),
    // West wall, teller hall | middle. Gaps: keycard door A (y 380..460),
    // archive passage (y 600..680).
    rect(420, 88, 16, 292), rect(420, 460, 16, 140), rect(420, 680, 16, 104),
    // East wall, middle | vault room. Gaps: keycard door B (y 380..460),
    // archive passage (y 600..680).
    rect(860, 88, 16, 292), rect(860, 460, 16, 140), rect(860, 680, 16, 104),
    // Security room floor (y 280), open doorway x 620..700.
    rect(436, 280, 184, 16), rect(700, 280, 160, 16),
    // Archive ceiling (y 520), open doorway x 620..700.
    rect(436, 520, 184, 16), rect(700, 520, 160, 16),
    // Teller desks and archive shelves (solid furniture).
    rect(120, 200, 180, 42), rect(120, 560, 180, 42),
    rect(500, 610, 120, 30), rect(690, 660, 120, 30),
    rect(500, 150, 130, 30), rect(700, 150, 130, 30),
    // The vault block itself, east wall of the vault room.
    rect(1080, 300, 150, 200),
  ];
  return {
    walls,
    doors: [
      { id: 'doorA', x: 420, y: 380, w: 16, h: 80, locked: true, label: 'KEYCARD DOOR A' },
      { id: 'doorB', x: 860, y: 380, w: 16, h: 80, locked: true, label: 'KEYCARD DOOR B' },
    ],
    // Laser grid across the corridor: four beams, staggered phases.
    lasers: [
      { y: 330, phase: 0.00, x0: 470, x1: 840, hot: false, cool: 0 },
      { y: 380, phase: 0.25, x0: 470, x1: 840, hot: false, cool: 0 },
      { y: 430, phase: 0.50, x0: 470, x1: 840, hot: false, cool: 0 },
      { y: 480, phase: 0.75, x0: 470, x1: 840, hot: false, cool: 0 },
    ],
    laserPeriod: 3.0,
    laserOnTime: 1.2,
    guards: [
      { name: 'WARDEN', color: '#8a6d2f', waypoints: [[150, 150], [350, 150], [350, 650], [150, 650]], wp: 0, x: 150, y: 150, angle: 0, speed: 58, alert: 0, decoy: null },
      { name: 'TELLER', color: '#7a3b2e', waypoints: [[500, 420], [800, 420], [800, 640], [500, 640]], wp: 0, x: 500, y: 420, angle: 0, speed: 62, alert: 0, decoy: null },
      { name: 'HOUND', color: '#4a5d23', waypoints: [[950, 150], [1180, 150], [1180, 650], [950, 650]], wp: 0, x: 950, y: 150, angle: 0, speed: 66, alert: 0, decoy: null },
    ],
    cameras: [
      { name: 'CAM 1', x: 640, y: 130, base: Math.PI / 2, sweep: 1.1, speed: 0.55, phase: 0, angle: Math.PI / 2 },
      { name: 'CAM 2', x: 950, y: 120, base: Math.PI / 2, sweep: 0.9, speed: 0.7, phase: 1.3, angle: Math.PI / 2 },
    ],
    keycard: { x: 300, y: 250, taken: false },
    vault: { dialX: 1072, dialY: 400, open: false, progress: 0 },
    ledger: { x: 1042, y: 400, taken: false, visible: false },
    exit: rect(60, 758, 120, 26),
    roomLabels: [
      { text: 'TELLER HALL', x: 218, y: 120 },
      { text: 'SECURITY', x: 520, y: 120 },
      { text: 'VAULT', x: 1062, y: 120 },
      { text: 'CORRIDOR', x: 648, y: 306 },
      { text: 'ARCHIVE', x: 648, y: 556 },
    ],
  };
}

export function createGameState(seed) {
  const rng = mulberry32(seed);
  const world = buildWorld();
  return {
    seed,
    rng,
    world,
    screen: 'title', // title | playing | caught | win
    time: 0,
    frozen: false,
    player: { x: 100, y: 400, r: 12, angle: 0, moving: false, sprint: false },
    moveTarget: null,
    hasKeycard: false,
    hasLedger: false,
    alarm: 0,
    caughtBy: '',
    tools: { jammer: 2, decoy: 2, lockpick: 2 },
    jamTimer: 0,
    decoyMark: null,
    crackHeld: false,
    crackTick: 0,
    winTime: 0,
    seenFlash: 0,
    message: '',
    messageTimer: 0,
    shotName: '',
  };
}

export function solidAt(world, px, py, radius) {
  for (const w of world.walls) {
    if (px + radius > w.x && px - radius < w.x + w.w && py + radius > w.y && py - radius < w.y + w.h) return true;
  }
  for (const d of world.doors) {
    if (d.locked && px + radius > d.x && px - radius < d.x + d.w && py + radius > d.y && py - radius < d.y + d.h) return true;
  }
  return false;
}

// Push a circle out of every solid rect it overlaps (walls and locked
// doors). Run after a move: corners push the thief diagonally clear instead
// of wedging them the way axis-separated checks do.
export function resolveCircleCollision(world, p) {
  const solids = world.walls.concat(world.doors.filter((d) => d.locked));
  for (let pass = 0; pass < 3; pass++) {
    let pushed = false;
    for (const r of solids) {
      const cx = Math.max(r.x, Math.min(p.x, r.x + r.w));
      const cy = Math.max(r.y, Math.min(p.y, r.y + r.h));
      const dx = p.x - cx, dy = p.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= p.r * p.r) continue;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = (p.r - d) / d;
        p.x += dx * push;
        p.y += dy * push;
      } else {
        // Centre inside the rect: push out along the smallest penetration.
        const left = p.x - r.x, right = r.x + r.w - p.x;
        const top = p.y - r.y, bottom = r.y + r.h - p.y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) p.x = r.x - p.r;
        else if (m === right) p.x = r.x + r.w + p.r;
        else if (m === top) p.y = r.y - p.r;
        else p.y = r.y + r.h + p.r;
      }
      pushed = true;
    }
    if (!pushed) break;
  }
}

export function pointInRectExport(px, py, r) { return pointInRect(px, py, r); }

// Line of sight: sample along the segment; a wall or a locked door blocks it.
export function lineBlocked(world, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (solidAt(world, x0 + dx * t, y0 + dy * t, 0)) return true;
  }
  return false;
}

export function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
