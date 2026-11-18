// levels.js — NEON ORBIT waves: spawning, difficulty ramp and bosses.
// A wave spawns its asteroids over time; when the field is clear the wave
// ends, a banner shows, and the next wave starts harder. Every 5th wave a
// boss joins the field and must be destroyed before the wave can end.

import { waveSpec, WAVES } from './config.js';
import { makeAsteroid, makeBoss } from './entities.js';

export class LevelManager {
  constructor(rng) {
    this.rng = rng;
    this.wave = 0;
    this.toSpawn = 0;
    this.spawnTimer = 0;
    this.spec = null;
    this.bossSpawned = false;
    this.bossAlive = false;
    this.betweenWaves = 0; // countdown before the next wave starts
    this.banner = '';
    this.bannerTimer = 0;
  }

  startGame() {
    this.wave = 0;
    this.betweenWaves = 1.2;
    this.banner = 'GET READY';
    this.bannerTimer = 1.2;
  }

  startWave(n) {
    this.wave = n;
    this.spec = waveSpec(n);
    this.toSpawn = this.spec.count;
    this.spawnTimer = 0.4;
    this.bossSpawned = false;
    this.bossAlive = this.spec.boss;
    this.banner = this.spec.boss ? `WAVE ${n} — BOSS` : `WAVE ${n}`;
    this.bannerTimer = 1.6;
  }

  // Returns 'spawn' events the game loop turns into entities.
  update(dt, counts) {
    const events = [];
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    if (this.betweenWaves > 0) {
      this.betweenWaves -= dt;
      if (this.betweenWaves <= 0) this.startWave(this.wave + 1);
      return events;
    }
    if (!this.spec) return events;
    if (this.spec.boss && !this.bossSpawned) {
      events.push({ type: 'boss' });
      this.bossSpawned = true;
    }
    if (this.toSpawn > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = this.spec.interval;
        this.toSpawn--;
        events.push({ type: 'asteroid' });
      }
    }
    return events;
  }

  // A wave is clear when nothing is left to spawn and no asteroid/boss remains.
  waveClear(asteroidCount) {
    return this.spec && this.toSpawn <= 0 && asteroidCount === 0 && !this.bossAlive;
  }

  onWaveCleared() {
    this.spec = null;
    this.betweenWaves = 2.2;
    this.banner = `WAVE ${this.wave} CLEAR  +${250}`;
    this.bannerTimer = 2.0;
  }

  onBossKilled() { this.bossAlive = false; }
}
