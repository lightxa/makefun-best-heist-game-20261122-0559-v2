// The Midnight Vault — all sound is synthesized with WebAudio; no audio files.

let ctx = null;
let humNodes = null;

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    startMidnightHum();
  } catch (e) {
    ctx = null;
  }
  return ctx;
}

// A low, quiet room tone: two detuned sines under everything, started once.
function startMidnightHum() {
  if (!ctx || humNodes) return;
  const gain = ctx.createGain();
  gain.gain.value = 0.015;
  gain.connect(ctx.destination);
  const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 55;
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 55.7;
  o1.connect(gain); o2.connect(gain);
  o1.start(); o2.start();
  humNodes = { gain, o1, o2 };
}

export function playTone(freq, dur, type, vol, when = 0) {
  const ac = ensureAudio();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain); gain.connect(ac.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}

export function playPickup() { playTone(660, 0.12, 'triangle', 0.09); playTone(990, 0.18, 'triangle', 0.07, 0.09); }
export function playKeycard() { playTone(520, 0.1, 'square', 0.05); playTone(780, 0.14, 'square', 0.05, 0.08); }
export function playDoorOpen() { playTone(180, 0.35, 'sawtooth', 0.04); playTone(320, 0.3, 'triangle', 0.05, 0.1); }
export function playLaserZap() { playTone(1400, 0.09, 'sawtooth', 0.07); playTone(900, 0.12, 'sawtooth', 0.05, 0.05); }
export function playCrackClick() { playTone(2400, 0.03, 'square', 0.03); }
export function playVaultOpen() {
  playTone(220, 0.5, 'triangle', 0.08);
  playTone(330, 0.5, 'triangle', 0.07, 0.12);
  playTone(440, 0.6, 'triangle', 0.08, 0.24);
}
export function playCaught() {
  playTone(320, 0.25, 'sawtooth', 0.09);
  playTone(210, 0.4, 'sawtooth', 0.09, 0.2);
  playTone(140, 0.7, 'sawtooth', 0.08, 0.45);
}
export function playWin() {
  [523, 659, 784, 1047].forEach((f, i) => playTone(f, 0.35, 'triangle', 0.08, i * 0.14));
}
export function playDecoy() { playTone(1100, 0.08, 'square', 0.06); playTone(1100, 0.08, 'square', 0.06, 0.16); }
