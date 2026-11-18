// input.js — NEON ORBIT input: keyboard, mouse and touch, one shared state.
// Orbit: Left/Right or A/D rotate around the star, Up/Down or W/S change orbit
// radius. Space / click / touch fires. P pauses, M mutes, Enter starts.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false };
    this.touch = { active: false, x: 0, y: 0 };
    this.pressed = new Set(); // edge-triggered keys, consumed once per frame
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.key.toLowerCase());
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.down = false; });

    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener('mousedown', (e) => { this.mouse.down = true; this.pressed.add('click'); });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      const r = canvas.getBoundingClientRect();
      this.touch.active = true; this.touch.x = t.clientX - r.left; this.touch.y = t.clientY - r.top;
      this.pressed.add('click');
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      const r = canvas.getBoundingClientRect();
      this.touch.x = t.clientX - r.left; this.touch.y = t.clientY - r.top;
    }, { passive: false });
    canvas.addEventListener('touchend', () => { this.touch.active = false; });
  }

  held(...names) { return names.some((n) => this.keys.has(n)); }
  wasPressed(...names) { return names.some((n) => this.pressed.has(n)); }
  endFrame() { this.pressed.clear(); }

  // Orbit steering, -1..1 for angle and radius, from keys or touch drag.
  // Touch: drag left/right of the ship rotates, up/down changes radius.
  steer(shipAngle) {
    let angle = 0, radius = 0;
    if (this.held('arrowleft', 'a')) angle -= 1;
    if (this.held('arrowright', 'd')) angle += 1;
    if (this.held('arrowup', 'w')) radius -= 1;
    if (this.held('arrowdown', 's')) radius += 1;
    return { angle, radius };
  }

  get firing() {
    return this.keys.has(' ') || this.mouse.down || this.touch.active;
  }
}
