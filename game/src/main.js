// main.js — NEON ORBIT game loop: state machine, physics, collisions,
// scoring, waves and the screenshot hooks (?shot=menu|play|over).
// Controls: A/D or arrows orbit, W/S change orbit radius, Space/click/tap
// fires (auto-aim at the nearest rock, otherwise radially outward),
// P pause, M mute, Enter start / restart.

import { STAGE, CENTER, PLANET_R, SHIP, SCORE, POWERUPS, LIVES, HIGH_KEY, mulberry32 } from './config.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { LevelManager } from './levels.js';
import { makeShip, shipPos, makeAsteroid, makeBoss, makeBullet, makeStar, makePowerup, makeParticle, makeFloatText } from './entities.js';
import { makeBackground, render } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const input = new Input(canvas);
const audio = new AudioEngine();
const params = new URLSearchParams(location.search);

function loadHigh() {
  try { return Number(localStorage.getItem(HIGH_KEY)) || 0; } catch { return 0; }
}
function saveHigh(v) {
  try { localStorage.setItem(HIGH_KEY, String(v)); } catch { /* private mode */ }
}

const s = {
  state: 'menu', // menu | playing | paused | over
  ship: makeShip(),
  asteroids: [], bullets: [], enemyBullets: [], stars: [], powerups: [],
  particles: [], floats: [],
  score: 0, high: loadHigh(), combo: 1, comboTimer: 0,
  wave: 0, lives: LIVES, kills: 0, starsCollected: 0,
  banner: '', bannerTimer: 0, shake: 0, time: 0,
  levels: new LevelManager(mulberry32((Date.now() % 2147483647) || 7)),
};
const bg = makeBackground(1337);

function announce(msg) { statusEl.textContent = msg; }

function startGame() {
  audio.ensure(); audio.startMusic();
  s.ship = makeShip();
  s.asteroids = []; s.bullets = []; s.enemyBullets = []; s.stars = [];
  s.powerups = []; s.particles = []; s.floats = [];
  s.score = 0; s.combo = 1; s.comboTimer = 0; s.wave = 0;
  s.lives = LIVES; s.kills = 0; s.starsCollected = 0; s.shake = 0;
  s.levels = new LevelManager(mulberry32((Date.now() % 2147483647) || 7));
  s.levels.startGame();
  s.state = 'playing';
  announce('Game started. Wave 1 incoming.');
}

function gameOver() {
  s.state = 'over';
  if (s.score > s.high) { s.high = s.score; saveHigh(s.high); }
  audio.gameOver();
  announce(`Game over. Final score ${s.score}. Press Enter to play again.`);
}

function loseLife(reason) {
  if (s.ship.invuln > 0 && reason === 'ship') return;
  if (s.ship.shield > 0 && reason === 'ship') {
    s.ship.shield = 0;
    s.particles.push(...makeParticle(...Object.values(shipPos(s.ship)), '#39ff88', 18, 200));
    audio.hit();
    return;
  }
  s.lives--;
  s.combo = 1;
  s.shake = 14;
  const p = shipPos(s.ship);
  s.particles.push(...makeParticle(p.x, p.y, '#00f0ff', 26, 260));
  audio.hit();
  if (s.lives <= 0) { gameOver(); return; }
  s.ship.invuln = SHIP.invulnTime;
  announce(`Hit! ${s.lives} ${s.lives === 1 ? 'life' : 'lives'} left.`);
}

function addScore(base, x, y, label) {
  const pts = base * s.combo;
  s.score += pts;
  s.floats.push(makeFloatText(x, y, `+${pts}${label ? ' ' + label : ''}`, '#ffe600'));
}

function nearestRock(x, y) {
  let best = null, bd = 650 * 650;
  for (const a of s.asteroids) {
    const d = (a.x - x) ** 2 + (a.y - y) ** 2;
    if (d < bd) { bd = d; best = a; }
  }
  return best;
}

function fire() {
  const p = shipPos(s.ship);
  const target = nearestRock(p.x, p.y);
  let dx, dy;
  if (target) { dx = target.x - p.x; dy = target.y - p.y; }
  else { dx = p.x - CENTER.x; dy = p.y - CENTER.y; } // radially outward
  const d = Math.hypot(dx, dy) || 1;
  s.bullets.push(makeBullet(p.x + (dx / d) * 18, p.y + (dy / d) * 18, (dx / d) * SHIP.bulletSpeed, (dy / d) * SHIP.bulletSpeed));
  s.particles.push(...makeParticle(p.x + (dx / d) * 18, p.y + (dy / d) * 18, '#00f0ff', 3, 60));
  audio.shoot();
}

function destroyAsteroid(a, idx) {
  s.asteroids.splice(idx, 1);
  s.particles.push(...makeParticle(a.x, a.y, a.hue, a.kind === 'boss' ? 40 : 16, 240));
  s.shake = Math.max(s.shake, a.kind === 'boss' ? 18 : 6);
  audio.explode(a.kind === 'boss');
  if (a.kind === 'boss') {
    addScore(SCORE.boss, a.x, a.y, 'BOSS DOWN');
    s.levels.onBossKilled();
    return;
  }
  s.kills++;
  addScore(SCORE.asteroid, a.x, a.y);
  if (s.kills % 2 === 0) s.stars.push(makeStar(Math.random));
  if (Math.random() < POWERUPS.dropChance) s.powerups.push(makePowerup(a.x, a.y, Math.random));
}

function update(dt) {
  s.time += dt;
  if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 30);
  s.bannerTimer = Math.max(0, s.bannerTimer - dt);
  if (s.levels.bannerTimer > 0) { s.banner = s.levels.banner; s.bannerTimer = s.levels.bannerTimer; }

  // Particles and floating text always animate.
  for (const p of s.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  s.particles = s.particles.filter((p) => p.life > 0);
  for (const f of s.floats) { f.y -= 30 * dt; f.life -= dt * 0.9; }
  s.floats = s.floats.filter((f) => f.life > 0);

  if (s.state !== 'playing') return;

  const ship = s.ship;
  const timeScale = ship.slow > 0 ? 0.45 : 1;
  const wdt = dt * timeScale;

  // --- Ship steering ---
  const steer = input.steer();
  ship.angle += steer.angle * SHIP.angularSpeed * dt;
  ship.radius = Math.min(SHIP.maxRadius, Math.max(SHIP.minRadius, ship.radius + steer.radius * SHIP.radialSpeed * dt));
  ship.thrust = Math.abs(steer.angle) + Math.abs(steer.radius);
  ship.invuln = Math.max(0, ship.invuln - dt);
  ship.shield = Math.max(0, ship.shield - dt);
  ship.rapid = Math.max(0, ship.rapid - dt);
  ship.slow = Math.max(0, ship.slow - dt);

  // --- Firing ---
  ship.fireTimer -= dt;
  if (input.firing && ship.fireTimer <= 0) {
    ship.fireTimer = ship.rapid > 0 ? SHIP.rapidCooldown : SHIP.fireCooldown;
    fire();
  }

  // --- Combo decay ---
  if (s.comboTimer > 0) { s.comboTimer -= dt; if (s.comboTimer <= 0) s.combo = 1; }

  // --- Waves ---
  const events = s.levels.update(wdt, { asteroids: s.asteroids.length });
  for (const ev of events) {
    if (ev.type === 'asteroid') s.asteroids.push(makeAsteroid(Math.random, s.levels.spec.speedMin, s.levels.spec.speedMax));
    if (ev.type === 'boss') { s.asteroids.push(makeBoss(Math.random, s.levels.wave)); audio.bossAlarm(); announce(`Boss on wave ${s.levels.wave}!`); }
  }
  s.wave = s.levels.wave;
  if (s.levels.waveClear(s.asteroids.length)) {
    s.score += SCORE.waveClear;
    audio.waveClear();
    s.levels.onWaveCleared();
  }

  // --- Asteroids ---
  const sp = shipPos(ship);
  for (let i = s.asteroids.length - 1; i >= 0; i--) {
    const a = s.asteroids[i];
    a.x += a.vx * wdt; a.y += a.vy * wdt; a.rot += a.rotSpeed * wdt;
    if (a.kind === 'boss') {
      a.shootTimer -= wdt;
      if (a.shootTimer <= 0) {
        a.shootTimer = 2.2;
        const dx = sp.x - a.x, dy = sp.y - a.y, d = Math.hypot(dx, dy) || 1;
        s.enemyBullets.push({ x: a.x, y: a.y, vx: (dx / d) * 170, vy: (dy / d) * 170, r: 6, life: 4 });
      }
    }
    const dPlanet = Math.hypot(a.x - CENTER.x, a.y - CENTER.y);
    if (dPlanet < PLANET_R + a.r * 0.6) {
      // A rock hit the star: it burns up, but you lose a life.
      s.asteroids.splice(i, 1);
      s.particles.push(...makeParticle(a.x, a.y, '#ff9f1c', 22, 260));
      if (a.kind === 'boss') s.levels.onBossKilled();
      loseLife('planet');
      continue;
    }
    const dShip = Math.hypot(a.x - sp.x, a.y - sp.y);
    if (dShip < a.r + SHIP.radius) {
      destroyAsteroid(a, i);
      loseLife('ship');
    }
  }

  // --- Bullets ---
  for (let i = s.bullets.length - 1; i >= 0; i--) {
    const b = s.bullets[i];
    b.x += b.vx * wdt; b.y += b.vy * wdt; b.life -= wdt;
    if (b.life <= 0 || b.x < -20 || b.x > STAGE.W + 20 || b.y < -20 || b.y > STAGE.H + 20) { s.bullets.splice(i, 1); continue; }
    for (let j = s.asteroids.length - 1; j >= 0; j--) {
      const a = s.asteroids[j];
      if (Math.hypot(b.x - a.x, b.y - a.y) < a.r + b.r) {
        s.bullets.splice(i, 1);
        s.particles.push(...makeParticle(b.x, b.y, '#00f0ff', 5, 120));
        a.hp--;
        if (a.hp <= 0) destroyAsteroid(a, j);
        break;
      }
    }
  }

  // --- Enemy bullets ---
  for (let i = s.enemyBullets.length - 1; i >= 0; i--) {
    const b = s.enemyBullets[i];
    b.x += b.vx * wdt; b.y += b.vy * wdt; b.life -= wdt;
    if (b.life <= 0) { s.enemyBullets.splice(i, 1); continue; }
    if (Math.hypot(b.x - sp.x, b.y - sp.y) < SHIP.radius + b.r) {
      s.enemyBullets.splice(i, 1);
      loseLife('ship');
    }
  }

  // --- Stars ---
  for (let i = s.stars.length - 1; i >= 0; i--) {
    const st = s.stars[i];
    st.life -= dt;
    if (st.life <= 0) { s.stars.splice(i, 1); continue; }
    if (Math.hypot(st.x - sp.x, st.y - sp.y) < 30) {
      s.stars.splice(i, 1);
      s.starsCollected++;
      s.combo = Math.min(8, s.combo + 1);
      s.comboTimer = 4;
      s.score += SCORE.star * s.combo;
      s.floats.push(makeFloatText(st.x, st.y - 14, `+${SCORE.star * s.combo} STAR x${s.combo}`, '#ffe600'));
      s.particles.push(...makeParticle(st.x, st.y, '#ffe600', 10, 140));
      audio.pickup(s.combo);
    }
  }

  // --- Power-ups ---
  for (let i = s.powerups.length - 1; i >= 0; i--) {
    const p = s.powerups[i];
    p.life -= dt; p.pulse += dt;
    if (p.life <= 0) { s.powerups.splice(i, 1); continue; }
    if (Math.hypot(p.x - sp.x, p.y - sp.y) < 30) {
      s.powerups.splice(i, 1);
      if (p.type === 'shield') ship.shield = POWERUPS.shieldSeconds;
      if (p.type === 'rapid') ship.rapid = POWERUPS.rapidSeconds;
      if (p.type === 'slow') ship.slow = POWERUPS.slowSeconds;
      s.floats.push(makeFloatText(p.x, p.y - 16, p.type.toUpperCase() + '!', '#39ff88'));
      audio.powerup();
    }
  }
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = STAGE.W * dpr;
  canvas.height = STAGE.H * dpr;
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Letterbox the 1280x720 stage into the window.
  const scale = Math.min(window.innerWidth / STAGE.W, window.innerHeight / STAGE.H);
  const ox = (window.innerWidth - STAGE.W * scale) / 2;
  const oy = (window.innerHeight - STAGE.H / 2 * 2 * scale) / 2;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
}
window.addEventListener('resize', resize);
resize();

// Screenshot hooks: ?shot=menu (default), ?shot=play (a busy mid-wave
// scene), ?shot=over (the results screen). Real renders of the live game.
function applyShotHook() {
  const shot = params.get('shot');
  if (shot === 'play') {
    startGame();
    const rng = mulberry32(42);
    s.score = 2450; s.combo = 4; s.comboTimer = 4; s.wave = 3; s.lives = 3;
    s.levels.startWave(3);
    s.levels.betweenWaves = 0; // hold the demo wave: no auto-advance
    s.levels.toSpawn = 0; // freeze the demo field: no new spawns
    for (let i = 0; i < 7; i++) s.asteroids.push(makeAsteroid(rng, 60, 90));
    s.asteroids[0].x = 950; s.asteroids[0].y = 220;
    s.asteroids[1].x = 420; s.asteroids[1].y = 520;
    s.asteroids[2].x = 1050; s.asteroids[2].y = 520;
    for (let i = 0; i < 3; i++) s.stars.push(makeStar(rng));
    s.powerups.push(makePowerup(760, 300, rng));
    s.bullets.push(makeBullet(700, 360, 400, -300));
    s.bullets.push(makeBullet(700, 360, 500, -100));
    s.particles.push(...makeParticle(950, 220, '#ff2d95', 12, 180));
    s.banner = 'WAVE 3'; s.bannerTimer = 2;
  } else if (shot === 'over') {
    startGame();
    s.score = 3850; s.wave = 4; s.lives = 0;
    s.high = Math.max(s.high, 3850);
    s.state = 'over';
    announce('Game over. Final score 3850.');
  }
}
// Debug handle for automated play-testing (read-only state snapshot).
window.NEON_DEBUG = {
  get state() { return s.state; },
  get score() { return s.score; },
  get wave() { return s.wave; },
  get lives() { return s.lives; },
  get asteroids() { return s.asteroids.length; },
  get bullets() { return s.bullets.length; },
};
applyShotHook();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (input.wasPressed('enter', ' ')) {
    if (s.state === 'menu' || s.state === 'over') startGame();
    else if (s.state === 'paused') s.state = 'playing';
  }
  if (input.wasPressed('click') && (s.state === 'menu' || s.state === 'over')) startGame();
  if (input.wasPressed('p', 'escape')) {
    if (s.state === 'playing') { s.state = 'paused'; announce('Paused.'); }
    else if (s.state === 'paused') s.state = 'playing';
  }
  if (input.wasPressed('m')) { audio.ensure(); audio.toggleMute(); }
  update(dt);
  render(ctx, s, bg, s.time);
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
