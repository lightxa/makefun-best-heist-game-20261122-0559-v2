// The Midnight Vault — keyboard and mouse input.
// WASD/arrows to walk, Shift to sprint (loud), E to hold the safe dial,
// 1/2/3 for tools, click to walk somewhere, click a HUD tool box to use it.

export function createInput() {
  return {
    keys: new Set(),
    mouseDown: false,
    mouseX: 0,
    mouseY: 0,
    clicked: null,
  };
}

export function attachInput(input, canvas, toLogical, handlers) {
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (!e.repeat) handlers.onKeyDown(e.key);
    input.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    handlers.onKeyUp(e.key);
  });
  canvas.addEventListener('mousedown', (e) => {
    input.mouseDown = true;
    const p = toLogical(e.clientX, e.clientY);
    input.mouseX = p.x; input.mouseY = p.y;
    handlers.onMouseDown(p.x, p.y);
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
    handlers.onMouseUp();
  });
  canvas.addEventListener('mousemove', (e) => {
    const p = toLogical(e.clientX, e.clientY);
    input.mouseX = p.x; input.mouseY = p.y;
  });
}

export function moveVector(input) {
  let x = 0, y = 0;
  const k = input.keys;
  if (k.has('a') || k.has('ArrowLeft')) x -= 1;
  if (k.has('d') || k.has('ArrowRight')) x += 1;
  if (k.has('w') || k.has('ArrowUp')) y -= 1;
  if (k.has('s') || k.has('ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
  return { x, y };
}

export function isSprinting(input) {
  return input.keys.has('Shift');
}

export function isCrackKey(input) {
  return input.keys.has('e');
}
