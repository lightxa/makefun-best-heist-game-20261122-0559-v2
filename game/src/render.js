// The Midnight Vault — everything the player sees, drawn on one canvas.
// Art-deco bank at midnight: dark green marble, brass trim, gold loot,
// red laser light. Safe cover is teal, danger is red and gold, loot is gold.

import { VIEW_W, VIEW_H, HUD_H, dist } from './state.js';
import { CONE_RANGE, CONE_HALF, CAM_RANGE, CAM_HALF } from './guards.js';
import { nearVaultDial } from './crack.js';

const TEAL_FLOOR = '#0e2f2c';
const TEAL_FLOOR_2 = '#0b2623';
const BRASS = '#c9a227';
const BRASS_DIM = '#7a6420';
const WALL = '#14403a';
const WALL_EDGE = '#c9a227';
const GOLD = '#ffd94d';
const RED = '#ff2e2e';
const INK = '#e8ddc0';

function drawCone(ctx, x, y, angle, range, half, color) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawGuard(ctx, g) {
  drawCone(ctx, g.x, g.y, g.angle, CONE_RANGE, CONE_HALF, 'rgba(255, 214, 90, 0.20)');
  ctx.beginPath();
  ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
  ctx.fillStyle = '#1c1a16';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = g.color;
  ctx.stroke();
  // Cap brim and facing tick.
  ctx.beginPath();
  ctx.arc(g.x, g.y, 7, 0, Math.PI * 2);
  ctx.fillStyle = g.color;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x + Math.cos(g.angle) * 18, g.y + Math.sin(g.angle) * 18);
  ctx.strokeStyle = '#e8ddc0';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = 'bold 11px Georgia, serif';
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.fillText(g.name, g.x, g.y - 20);
}

function drawCamera(ctx, c) {
  drawCone(ctx, c.x, c.y, c.angle, CAM_RANGE, CAM_HALF, 'rgba(255, 80, 80, 0.16)');
  ctx.beginPath();
  ctx.arc(c.x, c.y, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#22201c';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = RED;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.font = 'bold 10px Georgia, serif';
  ctx.fillStyle = '#ffb3b3';
  ctx.textAlign = 'center';
  ctx.fillText(c.name, c.x, c.y - 15);
}

function drawLasers(ctx, state) {
  const { world } = state;
  for (const beam of world.lasers) {
    ctx.beginPath();
    ctx.moveTo(beam.x0, beam.y);
    ctx.lineTo(beam.x1, beam.y);
    if (beam.hot) {
      ctx.strokeStyle = RED;
      ctx.lineWidth = 3;
      ctx.shadowColor = RED;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Emitter posts at both ends.
      for (const ex of [beam.x0, beam.x1]) {
        ctx.beginPath();
        ctx.arc(ex, beam.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = RED;
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = 'rgba(255, 46, 46, 0.18)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  if (state.jamTimer > 0) {
    ctx.font = 'bold 13px Georgia, serif';
    ctx.fillStyle = '#9fd8ff';
    ctx.textAlign = 'center';
    ctx.fillText('LASER GRID JAMMED — ' + Math.ceil(state.jamTimer) + 's', 648, 312);
  }
}

function drawFloor(ctx) {
  ctx.fillStyle = TEAL_FLOOR;
  ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
  // Marble tiles with brass seams.
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.14)';
  ctx.lineWidth = 1;
  for (let x = 16; x < VIEW_W; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, HUD_H); ctx.lineTo(x, VIEW_H - 16); ctx.stroke();
  }
  for (let y = HUD_H + 16; y < VIEW_H; y += 80) {
    ctx.beginPath(); ctx.moveTo(16, y); ctx.lineTo(VIEW_W - 16, y); ctx.stroke();
  }
  // Checker accents.
  ctx.fillStyle = TEAL_FLOOR_2;
  for (let x = 16; x < VIEW_W - 80; x += 160) {
    for (let y = HUD_H + 16; y < VIEW_H - 80; y += 160) {
      ctx.fillRect(x + 80, y, 80, 80);
    }
  }
}

function drawWallsAndDoors(ctx, state) {
  const { world } = state;
  for (const w of world.walls) {
    ctx.fillStyle = WALL;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = WALL_EDGE;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);
  }
  for (const d of world.doors) {
    ctx.fillStyle = d.locked ? '#3a2f10' : '#274d2e';
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.strokeStyle = d.locked ? GOLD : '#7ee787';
    ctx.lineWidth = 2;
    ctx.strokeRect(d.x + 1, d.y + 1, d.w - 2, d.h - 2);
    ctx.save();
    ctx.translate(d.x + d.w / 2, d.y + d.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = 'bold 10px Georgia, serif';
    ctx.fillStyle = d.locked ? GOLD : '#b9f5c4';
    ctx.textAlign = 'center';
    ctx.fillText(d.locked ? 'KEYCARD' : 'OPEN', 0, 3);
    ctx.restore();
  }
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillStyle = 'rgba(232, 221, 192, 0.55)';
  ctx.textAlign = 'center';
  for (const label of world.roomLabels) ctx.fillText(label.text, label.x, label.y);
}

function drawVault(ctx, state) {
  const v = state.world.vault;
  // Vault block face.
  ctx.fillStyle = '#2b2417';
  ctx.fillRect(1080, 300, 150, 200);
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 3;
  ctx.strokeRect(1081.5, 301.5, 147, 197);
  // Brass dial and spokes.
  ctx.beginPath();
  ctx.arc(1155, 400, 52, 0, Math.PI * 2);
  ctx.fillStyle = v.open ? '#3d2f10' : '#6b5518';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = GOLD;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(1155, 400, 34, 0, Math.PI * 2);
  ctx.strokeStyle = BRASS_DIM;
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + (v.open ? 0.4 : v.progress / 100 * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(1155 + Math.cos(a) * 34, 400 + Math.sin(a) * 34);
    ctx.lineTo(1155 + Math.cos(a) * 50, 400 + Math.sin(a) * 50);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillStyle = GOLD;
  ctx.textAlign = 'center';
  ctx.fillText(v.open ? 'OPEN' : 'VAULT', 1155, 332);
  // The Aurum Ledger, glowing gold once the vault opens.
  if (state.world.ledger.visible && !state.world.ledger.taken) {
    const pulse = 0.6 + 0.4 * Math.sin(state.time * 4);
    ctx.save();
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 18 * pulse;
    ctx.fillStyle = GOLD;
    ctx.fillRect(1024, 388, 36, 24);
    ctx.restore();
    ctx.strokeStyle = '#7a5c00';
    ctx.lineWidth = 2;
    ctx.strokeRect(1024, 388, 36, 24);
    ctx.beginPath();
    ctx.moveTo(1042, 388); ctx.lineTo(1042, 412);
    ctx.strokeStyle = '#7a5c00';
    ctx.stroke();
    ctx.font = 'bold 11px Georgia, serif';
    ctx.fillStyle = GOLD;
    ctx.textAlign = 'center';
    ctx.fillText('THE AURUM LEDGER', 1042, 378);
  }
}

function drawKeycardAndExit(ctx, state) {
  const k = state.world.keycard;
  if (!k.taken) {
    ctx.save();
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 10;
    ctx.fillStyle = GOLD;
    ctx.fillRect(k.x - 14, k.y - 9, 28, 18);
    ctx.restore();
    ctx.strokeStyle = '#7a5c00';
    ctx.lineWidth = 2;
    ctx.strokeRect(k.x - 14, k.y - 9, 28, 18);
    ctx.font = 'bold 10px Georgia, serif';
    ctx.fillStyle = '#3a2f10';
    ctx.textAlign = 'center';
    ctx.fillText('KEYCARD', k.x, k.y + 3);
  }
  const e = state.world.exit;
  ctx.fillStyle = state.hasLedger ? 'rgba(126, 231, 135, 0.35)' : 'rgba(126, 231, 135, 0.15)';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = '#7ee787';
  ctx.lineWidth = 2;
  ctx.strokeRect(e.x, e.y, e.w, e.h);
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillStyle = '#b9f5c4';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT — FRONT DOOR', e.x + e.w / 2, e.y - 6);
}

function drawPlayer(ctx, state) {
  const p = state.player;
  if (state.moveTarget) {
    ctx.beginPath();
    ctx.arc(state.moveTarget.x, state.moveTarget.y, 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(232, 221, 192, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (state.decoyMark) {
    ctx.beginPath();
    ctx.arc(state.decoyMark.x, state.decoyMark.y, 10 + 4 * Math.sin(state.time * 8), 0, Math.PI * 2);
    ctx.strokeStyle = '#9fd8ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = 'bold 10px Georgia, serif';
    ctx.fillStyle = '#9fd8ff';
    ctx.textAlign = 'center';
    ctx.fillText('?!', state.decoyMark.x, state.decoyMark.y - 14);
  }
  // The thief: black suit, brass collar, fedora brim.
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fillStyle = '#141210';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = BRASS;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(p.x, p.y - 3, 15, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1c1a16';
  ctx.fill();
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(p.x, p.y - 4, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#2a2721';
  ctx.fill();
  ctx.font = 'bold 11px Georgia, serif';
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.fillText('YOU', p.x, p.y - 20);
}

function drawHud(ctx, state) {
  ctx.fillStyle = '#081a18';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, HUD_H - 1); ctx.lineTo(VIEW_W, HUD_H - 1);
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillStyle = GOLD;
  ctx.fillText('THE MIDNIGHT VAULT', 18, 30);
  ctx.font = '12px Georgia, serif';
  ctx.fillStyle = INK;
  ctx.fillText('Midnight at the Meridian Bank — steal the Aurum Ledger', 18, 52);

  // Alarm meter.
  const ax = 470, ay = 16, aw = 260, ah = 20;
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillStyle = state.alarm >= 70 ? RED : INK;
  ctx.fillText('ALARM', ax, ay + 14);
  ctx.fillStyle = '#1a2a28';
  ctx.fillRect(ax + 62, ay, aw, ah);
  const frac = state.alarm / 100;
  ctx.fillStyle = state.alarm >= 70 ? RED : state.alarm >= 40 ? '#ff9f2e' : '#3fae6a';
  ctx.fillRect(ax + 62, ay, aw * frac, ah);
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ax + 62.5, ay + 0.5, aw - 1, ah - 1);
  ctx.fillStyle = INK;
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillText(Math.round(state.alarm) + '%', ax + 62 + aw + 8, ay + 15);

  // Loot and tools.
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillStyle = state.hasLedger ? GOLD : INK;
  ctx.fillText(state.hasLedger ? 'LEDGER ✓' : 'LEDGER —', 830, 30);
  ctx.fillStyle = state.hasKeycard ? GOLD : INK;
  ctx.fillText(state.hasKeycard ? 'KEYCARD ✓' : 'KEYCARD —', 830, 52);
  const tools = [['1 JAMMER', state.tools.jammer], ['2 DECOY', state.tools.decoy], ['3 LOCKPICK', state.tools.lockpick]];
  tools.forEach((t, i) => {
    const tx = 980 + i * 96;
    ctx.fillStyle = '#1a2a28';
    ctx.fillRect(tx, 10, 88, 26);
    ctx.strokeStyle = t[1] > 0 ? BRASS : '#444';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tx + 0.5, 10.5, 87, 25);
    ctx.fillStyle = t[1] > 0 ? INK : '#777';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.fillText(t[0] + ' ×' + t[1], tx + 6, 27);
  });
  ctx.font = '12px Georgia, serif';
  ctx.fillStyle = INK;
  ctx.textAlign = 'right';
  ctx.fillText('TIME ' + fmtTime(state.time), VIEW_W - 16, 58);
  ctx.textAlign = 'left';

  // Objective line under the HUD.
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillStyle = '#d8c98a';
  ctx.textAlign = 'center';
  const objective = !state.hasKeycard ? 'OBJECTIVE: TAKE THE KEYCARD FROM THE TELLER DESK'
    : !state.world.vault.open ? 'OBJECTIVE: REACH THE VAULT — CRACK THE SAFE (HOLD E)'
    : !state.hasLedger ? 'OBJECTIVE: TAKE THE AURUM LEDGER'
    : 'OBJECTIVE: ESCAPE THROUGH THE FRONT DOOR';
  ctx.fillText(objective, VIEW_W / 2, HUD_H + 22);
  ctx.textAlign = 'left';
  if (state.messageTimer > 0) {
    ctx.font = 'bold 14px Georgia, serif';
    ctx.fillStyle = '#ffd94d';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, VIEW_W / 2, HUD_H + 44);
    ctx.textAlign = 'left';
  }
}

function fmtTime(t) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function drawCrackPrompt(ctx, state) {
  const v = state.world.vault;
  if (v.open) return;
  if (nearVaultDial(state)) {
    const bx = 960, by = 560, bw = 260, bh = 18;
    ctx.fillStyle = 'rgba(8, 26, 24, 0.9)';
    ctx.fillRect(bx - 10, by - 34, bw + 20, 62);
    ctx.strokeStyle = BRASS;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx - 10.5, by - 34.5, bw + 19, 61);
    ctx.font = 'bold 13px Georgia, serif';
    ctx.fillStyle = GOLD;
    ctx.textAlign = 'center';
    ctx.fillText('HOLD E — CRACKING THE SAFE', bx + bw / 2, by - 14);
    ctx.fillStyle = '#1a2a28';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = GOLD;
    ctx.fillRect(bx, by, bw * (v.progress / 100), bh);
    ctx.strokeStyle = BRASS;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    ctx.textAlign = 'left';
  }
}

function drawOverlay(ctx, state) {
  ctx.fillStyle = 'rgba(4, 12, 11, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  if (state.screen === 'title') {
    ctx.font = 'bold 54px Georgia, serif';
    ctx.fillStyle = GOLD;
    ctx.fillText('THE MIDNIGHT VAULT', VIEW_W / 2, 210);
    ctx.strokeStyle = BRASS;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(340, 240); ctx.lineTo(940, 240);
    ctx.stroke();
    ctx.font = '20px Georgia, serif';
    ctx.fillStyle = INK;
    ctx.fillText('Midnight at the Meridian Bank. One thief, three guards,', VIEW_W / 2, 290);
    ctx.fillText('a grid of red lasers — and the Aurum Ledger in the vault.', VIEW_W / 2, 320);
    ctx.font = '16px Georgia, serif';
    ctx.fillText('WASD / ARROWS move  •  CLICK to walk  •  SHIFT sprint (loud)', VIEW_W / 2, 380);
    ctx.fillText('E hold to crack the safe  •  1 jammer  2 decoy  3 lockpick (2 each)', VIEW_W / 2, 408);
    ctx.fillText('Read the cones. Cross the lasers when they sleep. Get out.', VIEW_W / 2, 436);
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillStyle = state.time % 1 < 0.7 ? GOLD : '#8a7a3a';
    ctx.fillText('CLICK OR PRESS ENTER TO BEGIN', VIEW_W / 2, 510);
  } else if (state.screen === 'caught') {
    ctx.font = 'bold 52px Georgia, serif';
    ctx.fillStyle = RED;
    ctx.fillText('CAUGHT', VIEW_W / 2, 300);
    ctx.font = '20px Georgia, serif';
    ctx.fillStyle = INK;
    ctx.fillText('Spotted by ' + state.caughtBy + ' — the alarm hit 100%.', VIEW_W / 2, 350);
    ctx.fillText('The vault keeps its ledger tonight.', VIEW_W / 2, 380);
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillStyle = GOLD;
    ctx.fillText('PRESS R TO TRY AGAIN', VIEW_W / 2, 450);
  } else if (state.screen === 'win') {
    ctx.font = 'bold 52px Georgia, serif';
    ctx.fillStyle = GOLD;
    ctx.fillText('THE VAULT IS YOURS', VIEW_W / 2, 280);
    ctx.font = '20px Georgia, serif';
    ctx.fillStyle = INK;
    ctx.fillText('The Aurum Ledger is gone before dawn. Time: ' + fmtTime(state.winTime), VIEW_W / 2, 340);
    ctx.fillText('Alarm at escape: ' + Math.round(state.alarm) + '%', VIEW_W / 2, 372);
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillStyle = GOLD;
    ctx.fillText('PRESS R TO RUN IT AGAIN', VIEW_W / 2, 440);
  }
  ctx.textAlign = 'left';
}

export function renderGame(ctx, state) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx);
  drawWallsAndDoors(ctx, state);
  drawLasers(ctx, state);
  drawVault(ctx, state);
  drawKeycardAndExit(ctx, state);
  for (const c of state.world.cameras) drawCamera(ctx, c);
  for (const g of state.world.guards) drawGuard(ctx, g);
  drawPlayer(ctx, state);
  drawCrackPrompt(ctx, state);
  if (state.seenFlash > 0) {
    ctx.fillStyle = 'rgba(255, 46, 46, ' + (state.seenFlash * 0.18) + ')';
    ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
  }
  drawHud(ctx, state);
  if (state.screen !== 'playing') drawOverlay(ctx, state);
}
