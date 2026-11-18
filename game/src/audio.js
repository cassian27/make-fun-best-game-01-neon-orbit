// audio.js — NEON ORBIT sound: all synthesized with WebAudio, no audio files.
// A tiny synth: laser blips, explosions (filtered noise), pickup arpeggios,
// and a looping neon bassline + arpeggio that starts once the player interacts.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.musicTimer = null;
    this.step = 0;
    this.started = false;
  }

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.16;
    this.musicGain.connect(this.master);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // Short oscillator blip: freq slides from `from` to `to`.
  blip(from, to, dur, type = 'square', vol = 0.25) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // Noise burst through a low-pass filter — explosions and hits.
  noise(dur, vol = 0.4, freq = 900) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  }

  shoot() { this.blip(880, 220, 0.09, 'square', 0.12); }
  explode(big = false) { this.noise(big ? 0.5 : 0.28, big ? 0.5 : 0.3, big ? 500 : 900); this.blip(160, 40, 0.3, 'sawtooth', 0.18); }
  hit() { this.noise(0.2, 0.35, 600); this.blip(220, 60, 0.25, 'sawtooth', 0.2); }
  pickup(combo = 1) { const base = 520 + Math.min(combo, 8) * 60; this.blip(base, base * 1.5, 0.12, 'sine', 0.22); setTimeout(() => this.blip(base * 1.5, base * 2, 0.12, 'sine', 0.18), 70); }
  powerup() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, f, 0.14, 'triangle', 0.22), i * 80)); }
  waveClear() { [392, 523, 659].forEach((f, i) => setTimeout(() => this.blip(f, f * 1.2, 0.18, 'triangle', 0.2), i * 110)); }
  bossAlarm() { this.blip(110, 110, 0.4, 'sawtooth', 0.25); setTimeout(() => this.blip(110, 110, 0.4, 'sawtooth', 0.25), 450); }
  gameOver() { [440, 349, 294, 220].forEach((f, i) => setTimeout(() => this.blip(f, f * 0.9, 0.3, 'triangle', 0.22), i * 180)); }

  // Simple 8-step loop: driving bass notes + a sparkle arpeggio on top.
  startMusic() {
    if (!this.ctx || this.started) return;
    this.started = true;
    const bass = [55, 0, 55, 65.4, 55, 0, 49, 58.3]; // A1 C2 G1 Bb1 pattern
    const arp = [440, 523, 659, 880, 659, 523, 440, 587];
    this.musicTimer = setInterval(() => {
      if (this.muted) return;
      const b = bass[this.step % 8];
      if (b) this.note(b, 0.22, 'sawtooth', 0.20, this.musicGain);
      if (this.step % 2 === 0) this.note(arp[this.step % 8] * 2, 0.1, 'sine', 0.06, this.musicGain);
      this.step++;
    }, 190);
  }

  note(freq, dur, type, vol, dest) {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }
}
