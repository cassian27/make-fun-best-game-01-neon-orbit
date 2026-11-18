// config.js — NEON ORBIT: every tunable number in one place.
// The game runs on a 1280x720 logical stage, scaled to fit the window.

export const STAGE = { W: 1280, H: 720 };
export const CENTER = { x: STAGE.W / 2, y: STAGE.H / 2 };
export const PLANET_R = 46;

export const COLORS = {
  bg: '#04040f',
  cyan: '#00f0ff',
  magenta: '#ff2d95',
  yellow: '#ffe600',
  green: '#39ff88',
  orange: '#ff9f1c',
  purple: '#b967ff',
  white: '#eaf6ff',
  dim: '#8fa8c8',
};

export const SHIP = {
  minRadius: 110,
  maxRadius: 320,
  startRadius: 210,
  angularSpeed: 2.6,      // radians per second at full key press
  radialSpeed: 170,       // px per second
  fireCooldown: 0.16,     // seconds between shots
  rapidCooldown: 0.07,
  bulletSpeed: 620,
  radius: 13,
  invulnTime: 2.0,
};

export const WAVES = {
  baseAsteroids: 6,       // wave 1 spawns 6; +3 per wave
  perWave: 3,
  spawnInterval: 0.9,     // seconds between spawns, shrinking per wave
  minInterval: 0.32,
  asteroidSpeedMin: 55,
  asteroidSpeedMax: 95,
  speedPerWave: 7,
  starEvery: 2,           // a star collectible roughly every 2 asteroid kills
  bossEvery: 5,           // a boss on every 5th wave
  bossHp: 26,             // +6 per boss
};

export const SCORE = {
  asteroid: 100,
  star: 50,
  boss: 1000,
  waveClear: 250,
};

export const POWERUPS = {
  dropChance: 0.14,       // chance an asteroid drops a power-up
  shieldSeconds: 12,
  rapidSeconds: 8,
  slowSeconds: 5,
};

export const LIVES = 3;
export const HIGH_KEY = 'neon-orbit-high-score';

// Wave N difficulty: asteroid count, speed range, spawn interval.
export function waveSpec(n) {
  const count = WAVES.baseAsteroids + (n - 1) * WAVES.perWave;
  const speedMin = WAVES.asteroidSpeedMin + (n - 1) * WAVES.speedPerWave;
  const speedMax = WAVES.asteroidSpeedMax + (n - 1) * WAVES.speedPerWave * 1.4;
  const interval = Math.max(WAVES.minInterval, WAVES.spawnInterval - (n - 1) * 0.07);
  const boss = n % WAVES.bossEvery === 0;
  return { n, count, speedMin, speedMax, interval, boss };
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
