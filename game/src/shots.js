// The Midnight Vault — deterministic shot staging for screenshots.
// ?shot=start|laser|crack|win (with &seed=N) freezes one readable moment:
// every staged scene keeps the thief, a guard cone, a camera cone, the
// lasers, the loot and the alarm meter in a single 1280x800 frame.

import { createGameState } from './state.js';

function aimGuardAt(guard, tx, ty) {
  guard.angle = Math.atan2(ty - guard.y, tx - guard.x);
}

export function stageShot(name, seed) {
  const state = createGameState(seed);
  state.shotName = name;
  state.screen = 'playing';
  state.frozen = true;
  state.hasKeycard = true;
  state.world.keycard.taken = true;
  state.world.doors[0].locked = false;
  state.world.doors[1].locked = false;

  if (name === 'laser') {
    // Mid-corridor, live beams on, alarm climbing.
    state.player.x = 700; state.player.y = 380; state.player.angle = 0;
    state.alarm = 30;
    state.time = 1.0; // beams 1 and 3 live at this phase
    const warden = state.world.guards[0];
    warden.x = 500; warden.y = 300; aimGuardAt(warden, 700, 380);
    const teller = state.world.guards[1];
    teller.x = 780; teller.y = 470; aimGuardAt(teller, 700, 380);
    const hound = state.world.guards[2];
    hound.x = 1120; hound.y = 260; aimGuardAt(hound, 700, 380);
    state.world.cameras[0].angle = Math.PI / 2 + 0.6;
    state.world.cameras[1].angle = Math.PI / 2 - 0.5;
  } else if (name === 'crack') {
    // At the vault dial, combination half turned, alarm high.
    state.player.x = 1028; state.player.y = 400; state.player.angle = 0;
    state.alarm = 58;
    state.world.vault.progress = 62;
    state.crackHeld = true;
    state.time = 2.0;
    const hound = state.world.guards[2];
    hound.x = 950; hound.y = 300; aimGuardAt(hound, 1028, 400);
    const teller = state.world.guards[1];
    teller.x = 800; teller.y = 420; aimGuardAt(teller, 950, 300);
    state.world.cameras[1].angle = Math.PI / 2 + 0.4;
    state.world.cameras[0].angle = Math.PI / 2 - 0.6;
  } else if (name === 'win') {
    // The getaway paid off: ledger in hand, vault open, win screen.
    state.screen = 'win';
    state.hasLedger = true;
    state.world.vault.open = true;
    state.world.vault.progress = 100;
    state.world.ledger.visible = true;
    state.world.ledger.taken = true;
    state.winTime = 187;
    state.time = 187;
    state.alarm = 44;
    state.player.x = 120; state.player.y = 720;
    const hound = state.world.guards[2];
    hound.x = 1150; hound.y = 220; aimGuardAt(hound, 1042, 400);
    const warden = state.world.guards[0];
    warden.x = 150; warden.y = 150; aimGuardAt(warden, 300, 250);
  } else {
    // 'start' — the cover: mid-heist in the corridor, everything visible.
    state.player.x = 600; state.player.y = 420; state.player.angle = 0;
    state.alarm = 42;
    state.time = 1.0;
    state.world.vault.open = true;
    state.world.vault.progress = 100;
    state.world.ledger.visible = true;
    const warden = state.world.guards[0];
    warden.x = 300; warden.y = 300; aimGuardAt(warden, 600, 420);
    const teller = state.world.guards[1];
    teller.x = 780; teller.y = 470; aimGuardAt(teller, 600, 420);
    const hound = state.world.guards[2];
    hound.x = 1080; hound.y = 620; aimGuardAt(hound, 1042, 400);
    state.world.cameras[0].angle = Math.PI / 2 + 0.7;
    state.world.cameras[1].angle = Math.PI / 2 - 0.45;
  }
  // Frozen shots never run updateLasers, so compute the beam state here.
  for (const beam of state.world.lasers) {
    const phaseTime = ((state.time / state.world.laserPeriod) + beam.phase) % 1;
    beam.hot = phaseTime * state.world.laserPeriod < state.world.laserOnTime;
  }
  return state;
}
