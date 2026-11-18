// entities.js — NEON ORBIT entities: ship, asteroids, bullets, stars,
// power-ups, the boss, particles and floating score text. Pure data + update
// + draw helpers; the game loop in main.js owns collisions and scoring.

import { COLORS, SHIP, CENTER } from './config.js';

export function makeShip() {
  return {
    angle: -Math.PI / 2, radius: SHIP.startRadius,
    fireTimer: 0, invuln: 0, shield: 0, rapid: 0, slow: 0,
    thrust: 0, alive: true,
  };
}

export function shipPos(ship) {
  return {
    x: CENTER.x + Math.cos(ship.angle) * ship.radius,
    y: CENTER.y + Math.sin(ship.angle) * ship.radius,
  };
}

export function makeAsteroid(rng, speedMin, speedMax, big = false) {
  // Spawn on a random edge, fly toward the star (with a little sideways drift).
  const edge = Math.floor(rng() * 4);
  let x, y;
  if (edge === 0) { x = rng() * 1280; y = -30; }
  else if (edge === 1) { x = 1310; y = rng() * 720; }
  else if (edge === 2) { x = rng() * 1280; y = 750; }
  else { x = -30; y = rng() * 720; }
  const dx = CENTER.x - x, dy = CENTER.y - y;
  const d = Math.hypot(dx, dy) || 1;
  const speed = speedMin + rng() * (speedMax - speedMin);
  const r = big ? 46 + rng() * 14 : 14 + rng() * 22;
  const verts = [];
  const n = 8 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) verts.push(0.7 + rng() * 0.55);
  return {
    kind: 'asteroid', x, y,
    vx: (dx / d) * speed + (rng() - 0.5) * 40,
    vy: (dy / d) * speed + (rng() - 0.5) * 40,
    r, rot: rng() * Math.PI * 2, rotSpeed: (rng() - 0.5) * 2.2,
    verts, hp: big ? 5 : 1, big,
    hue: rng() < 0.5 ? COLORS.magenta : COLORS.orange,
  };
}

export function makeBoss(rng, wave) {
  const a = makeAsteroid(rng, 26, 30, true);
  a.kind = 'boss';
  a.r = 58;
  a.hp = 26 + (wave / 5 - 1) * 6;
  a.maxHp = a.hp;
  a.hue = COLORS.purple;
  a.shootTimer = 2;
  return a;
}

export function makeBullet(x, y, vx, vy) {
  return { kind: 'bullet', x, y, vx, vy, r: 4, life: 1.6 };
}

export function makeStar(rng) {
  // Stars appear on the orbit band so the player collects them by flying.
  const angle = rng() * Math.PI * 2;
  const radius = 130 + rng() * 170;
  return {
    kind: 'star',
    x: CENTER.x + Math.cos(angle) * radius,
    y: CENTER.y + Math.sin(angle) * radius,
    r: 10, pulse: rng() * Math.PI * 2, life: 9,
  };
}

export function makePowerup(x, y, rng) {
  const types = ['shield', 'rapid', 'slow'];
  return { kind: 'powerup', type: types[Math.floor(rng() * types.length)], x, y, r: 13, life: 10, pulse: 0 };
}

export function makeParticle(x, y, color, count = 10, speed = 160) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random() * 0.7);
    out.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.4, max: 0.9, color, r: 1.5 + Math.random() * 2.5 });
  }
  return out;
}

export function makeFloatText(x, y, text, color) {
  return { x, y, text, color, life: 1.0 };
}

// --- Drawing helpers (canvas 2D, neon glow via shadowBlur) ---

export function drawShip(ctx, ship, time) {
  const p = shipPos(ship);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(ship.angle + Math.PI / 2); // nose points along the orbit
  if (ship.invuln > 0 && Math.floor(time * 12) % 2 === 0) ctx.globalAlpha = 0.35;
  ctx.shadowColor = COLORS.cyan; ctx.shadowBlur = 18;
  ctx.fillStyle = COLORS.cyan;
  ctx.beginPath();
  ctx.moveTo(0, -16); ctx.lineTo(11, 12); ctx.lineTo(0, 6); ctx.lineTo(-11, 12);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#04040f';
  ctx.beginPath(); ctx.arc(0, -3, 4, 0, Math.PI * 2); ctx.fill();
  // Engine flame.
  if (ship.thrust > 0.1) {
    ctx.fillStyle = COLORS.orange;
    ctx.beginPath();
    ctx.moveTo(-6, 12); ctx.lineTo(0, 12 + 10 + Math.random() * 8); ctx.lineTo(6, 12);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  if (ship.shield > 0) {
    ctx.save();
    ctx.strokeStyle = COLORS.green; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(time * 6);
    ctx.lineWidth = 2; ctx.shadowColor = COLORS.green; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(p.x, p.y, 24, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

export function drawAsteroid(ctx, a) {
  ctx.save();
  ctx.translate(a.x, a.y); ctx.rotate(a.rot);
  ctx.strokeStyle = a.hue; ctx.lineWidth = a.kind === 'boss' ? 3 : 2;
  ctx.shadowColor = a.hue; ctx.shadowBlur = 12;
  ctx.fillStyle = 'rgba(20,8,32,0.85)';
  ctx.beginPath();
  for (let i = 0; i < a.verts.length; i++) {
    const ang = (i / a.verts.length) * Math.PI * 2;
    const r = a.r * a.verts[i];
    if (i === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
    else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = a.hue; ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.arc(-a.r * 0.25, -a.r * 0.2, a.r * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(a.r * 0.3, a.r * 0.25, a.r * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (a.kind === 'boss') {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(a.x - 40, a.y - a.r - 16, 80, 7);
    ctx.fillStyle = COLORS.purple;
    ctx.fillRect(a.x - 40, a.y - a.r - 16, 80 * Math.max(0, a.hp / a.maxHp), 7);
    ctx.restore();
  }
}
