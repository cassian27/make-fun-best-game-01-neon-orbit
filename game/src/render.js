// render.js — NEON ORBIT rendering: starfield, planet, orbit ring, HUD and
// all menu screens. Everything is drawn in code; there are no image assets.

import { STAGE, CENTER, PLANET_R, COLORS, SHIP } from './config.js';
import { shipPos, drawShip, drawAsteroid } from './entities.js';

export function makeBackground(seed) {
  const rng = (() => { let a = seed; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();
  const stars = [];
  for (let i = 0; i < 160; i++) {
    stars.push({ x: rng() * STAGE.W, y: rng() * STAGE.H, r: 0.5 + rng() * 1.6, tw: rng() * Math.PI * 2, sp: 0.5 + rng() * 2 });
  }
  const nebulae = [];
  const cols = ['#ff2d95', '#00f0ff', '#b967ff', '#ff9f1c'];
  for (let i = 0; i < 5; i++) {
    nebulae.push({ x: rng() * STAGE.W, y: rng() * STAGE.H, r: 140 + rng() * 160, color: cols[i % cols.length] });
  }
  return { stars, nebulae };
}

function drawBackground(ctx, bg, time) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, STAGE.W, STAGE.H);
  for (const n of bg.nebulae) {
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    g.addColorStop(0, n.color + '22');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }
  for (const s of bg.stars) {
    ctx.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(time * s.sp + s.tw));
    ctx.fillStyle = '#cfe9ff';
    ctx.fillRect(s.x, s.y, s.r, s.r);
  }
  ctx.globalAlpha = 1;
}

function drawPlanet(ctx, time) {
  const g = ctx.createRadialGradient(CENTER.x - 14, CENTER.y - 14, 6, CENTER.x, CENTER.y, PLANET_R + 26);
  g.addColorStop(0, '#ffe9a8');
  g.addColorStop(0.35, '#ff9f1c');
  g.addColorStop(0.7, '#b967ff');
  g.addColorStop(1, 'rgba(185,103,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(CENTER.x, CENTER.y, PLANET_R + 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a1650';
  ctx.beginPath(); ctx.arc(CENTER.x, CENTER.y, PLANET_R, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = COLORS.magenta; ctx.lineWidth = 2;
  ctx.shadowColor = COLORS.magenta; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(CENTER.x, CENTER.y, PLANET_R, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 0;
  // Slowly turning surface arcs.
  ctx.strokeStyle = 'rgba(0,240,255,0.7)'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const a0 = time * 0.25 + i * 2.1;
    ctx.beginPath(); ctx.arc(CENTER.x, CENTER.y, PLANET_R - 12 - i * 7, a0, a0 + 1.5); ctx.stroke();
  }
}

function drawOrbit(ctx, ship) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0,240,255,0.35)';
  ctx.setLineDash([6, 10]);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(CENTER.x, CENTER.y, SHIP.minRadius, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(CENTER.x, CENTER.y, SHIP.maxRadius, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(0,240,255,0.7)';
  ctx.beginPath(); ctx.arc(CENTER.x, CENTER.y, ship.radius, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawHud(ctx, s) {
  ctx.save();
  ctx.textBaseline = 'top';
  ctx.font = 'bold 26px "Courier New", monospace';
  ctx.fillStyle = COLORS.white;
  ctx.shadowColor = COLORS.cyan; ctx.shadowBlur = 8;
  ctx.fillText(`SCORE ${String(s.score).padStart(6, '0')}`, 20, 16);
  ctx.fillStyle = COLORS.yellow;
  ctx.fillText(`x${s.combo} COMBO`, 20, 50);
  ctx.fillStyle = COLORS.white;
  ctx.textAlign = 'right';
  ctx.fillText(`WAVE ${s.wave}`, STAGE.W - 20, 16);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '18px "Courier New", monospace';
  ctx.fillText(`BEST ${String(s.high).padStart(6, '0')}`, STAGE.W - 20, 50);
  ctx.textAlign = 'left';
  // Lives as little ships.
  for (let i = 0; i < s.lives; i++) {
    ctx.save();
    ctx.translate(30 + i * 30, STAGE.H - 32);
    ctx.fillStyle = i < s.lives ? COLORS.cyan : '#334';
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, 8); ctx.lineTo(0, 4); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // Active power-up timers.
  let y = STAGE.H - 66;
  ctx.font = 'bold 15px "Courier New", monospace';
  if (s.ship.shield > 0) { ctx.fillStyle = COLORS.green; ctx.fillText(`SHIELD ${Math.ceil(s.ship.shield)}s`, 20, y); y -= 20; }
  if (s.ship.rapid > 0) { ctx.fillStyle = COLORS.orange; ctx.fillText(`RAPID FIRE ${Math.ceil(s.ship.rapid)}s`, 20, y); y -= 20; }
  if (s.ship.slow > 0) { ctx.fillStyle = COLORS.purple; ctx.fillText(`SLOW TIME ${Math.ceil(s.ship.slow)}s`, 20, y); }
  ctx.restore();
}

function drawBanner(ctx, text, alpha) {
  if (!text) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 44px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.yellow;
  ctx.shadowColor = COLORS.yellow; ctx.shadowBlur = 20;
  ctx.fillText(text, STAGE.W / 2, 110);
  ctx.restore();
}

function panel(ctx, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(4,4,20,0.72)';
  ctx.fillRect(0, 0, STAGE.W, STAGE.H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.shadowColor = accent; ctx.shadowBlur = 24;
  ctx.font = 'bold 64px "Courier New", monospace';
  ctx.fillText(title, STAGE.W / 2, 150);
  ctx.shadowBlur = 0;
  ctx.font = '21px "Courier New", monospace';
  ctx.fillStyle = COLORS.white;
  lines.forEach((l, i) => ctx.fillText(l, STAGE.W / 2, 260 + i * 36));
  ctx.restore();
}

export function render(ctx, s, bg, time) {
  ctx.save();
  if (s.shake > 0) ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
  drawBackground(ctx, bg, time);
  drawOrbit(ctx, s.ship);
  drawPlanet(ctx, time);

  // Stars (collectibles).
  for (const st of s.stars) {
    const p = 0.7 + 0.3 * Math.sin(time * 4 + st.pulse);
    ctx.save();
    ctx.translate(st.x, st.y); ctx.rotate(time * 1.5);
    ctx.globalAlpha = p;
    ctx.fillStyle = COLORS.yellow; ctx.shadowColor = COLORS.yellow; ctx.shadowBlur = 14;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? 11 : 4.5;
      const a = (i / 8) * Math.PI * 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  for (const p of s.powerups) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(time * 6 + p.pulse);
    const col = p.type === 'shield' ? COLORS.green : p.type === 'rapid' ? COLORS.orange : COLORS.purple;
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.shadowColor = col; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = col; ctx.font = 'bold 15px "Courier New", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.type === 'shield' ? 'S' : p.type === 'rapid' ? 'R' : 'T', 0, 1);
    ctx.restore();
  }

  for (const a of s.asteroids) drawAsteroid(ctx, a);

  for (const b of s.bullets) {
    ctx.save();
    ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 3; ctx.shadowColor = COLORS.cyan; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.restore();
  }
  for (const b of s.enemyBullets) {
    ctx.save();
    ctx.fillStyle = COLORS.magenta; ctx.shadowColor = COLORS.magenta; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  for (const p of s.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  for (const f of s.floats) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.color; ctx.font = 'bold 18px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }

  if (s.state === 'playing' || s.state === 'paused') drawShip(ctx, s.ship, time);
  drawHud(ctx, s);
  if (s.state === 'playing') drawBanner(ctx, s.banner, Math.min(1, s.bannerTimer));

  if (s.state === 'menu') {
    panel(ctx, 'NEON ORBIT', [
      'Pilot your ship around the star. Blast the asteroids.',
      'Collect stars to build your combo — don\'t let rocks hit the star.',
      '',
      'A / D or ← / →  orbit      W / S or ↑ / ↓  change orbit',
      'SPACE / CLICK / TAP  fire      P  pause      M  mute',
      '',
      `BEST SCORE  ${String(s.high).padStart(6, '0')}`,
      '',
      'Press ENTER or CLICK to launch',
    ], COLORS.cyan);
  } else if (s.state === 'paused') {
    panel(ctx, 'PAUSED', ['Press P or ENTER to resume', 'M to mute sound'], COLORS.yellow);
  } else if (s.state === 'over') {
    panel(ctx, 'GAME OVER', [
      `FINAL SCORE  ${String(s.score).padStart(6, '0')}`,
      `WAVE REACHED  ${s.wave}      BEST  ${String(s.high).padStart(6, '0')}`,
      s.score >= s.high && s.score > 0 ? '★ NEW BEST SCORE ★' : '',
      '',
      'Press ENTER or CLICK to fly again',
    ], COLORS.magenta);
  }
  ctx.restore();
}
