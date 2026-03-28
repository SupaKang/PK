/**
 * audio.js — Chiptune BGM generator + SFX using Web Audio API
 * Procedural 8-bit music and sound effects
 */

export class AudioManager {
  constructor() {
    this.ctx = null; // AudioContext, lazy init
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.currentBgm = null;
    this.bgmInterval = null;
    this.muted = false;
    this.volume = 0.3;
    this.bgmVolume = 0.2;
    this.sfxVolume = 0.4;
  }

  /**
   * Initialize AudioContext (must be called after user interaction)
   */
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this.bgmVolume;
      this.bgmGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      console.log('[PK] Audio initialized');
    } catch (e) {
      console.warn('[PK] Audio init failed:', e);
    }
  }

  /**
   * Play a simple chiptune note
   */
  _playNote(freq, duration, type = 'square', gainNode) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0.3, this.ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    osc.connect(env);
    env.connect(gainNode || this.sfxGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  }

  // === BGM ===

  /**
   * Play BGM for a scene
   * @param {'title'|'map'|'battle'|'boss'|'menu'|'victory'} scene
   */
  playBgm(scene) {
    if (this.currentBgm === scene) return;
    this.stopBgm();
    this.currentBgm = scene;

    if (!this.ctx || this.muted) return;

    const patterns = BGM_PATTERNS[scene];
    if (!patterns) return;

    let step = 0;
    const tempo = patterns.tempo || 200;

    this.bgmInterval = setInterval(() => {
      if (!this.ctx || this.muted) return;
      const notes = patterns.notes;
      const note = notes[step % notes.length];
      if (note > 0) {
        this._playNote(note, tempo / 1000 * 0.8, 'square', this.bgmGain);
      }
      // Bass line
      if (patterns.bass) {
        const bassNote = patterns.bass[step % patterns.bass.length];
        if (bassNote > 0) {
          this._playNote(bassNote, tempo / 1000 * 0.9, 'triangle', this.bgmGain);
        }
      }
      step++;
    }, tempo);
  }

  stopBgm() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    this.currentBgm = null;
  }

  // === SFX ===

  playSfx(name) {
    if (!this.ctx || this.muted) return;
    const sfx = SFX_DEFS[name];
    if (!sfx) return;

    for (const note of sfx) {
      setTimeout(() => {
        this._playNote(note.freq, note.dur, note.type || 'square', this.sfxGain);
      }, note.delay || 0);
    }
  }

  // === Controls ===

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this.volume;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
    }
    if (this.muted) this.stopBgm();
    return this.muted;
  }
}

// === BGM Patterns (simple chiptune melodies) ===
const C4=262,D4=294,E4=330,F4=349,G4=392,A4=440,B4=494;
const C5=523,D5=587,E5=659,F5=698,G5=784,A5=880;

const BGM_PATTERNS = {
  title: {
    tempo: 250,
    notes: [E4,G4,A4,G4, E4,D4,C4,D4, E4,G4,A4,B4, C5,B4,A4,G4],
    bass:  [C4,0,G4,0,   C4,0,G4,0,   A4,0,E4,0,   F4,0,G4,0],
  },
  map: {
    tempo: 200,
    notes: [C5,E5,G5,E5, D5,F5,A5,F5, C5,G4,E4,G4, A4,C5,E5,C5],
    bass:  [C4,0,E4,0,   D4,0,F4,0,   C4,0,E4,0,   A4,0,C4,0],
  },
  battle: {
    tempo: 150,
    notes: [E5,E5,0,E5,  0,C5,E5,G5,  0,G4,0,0,    C5,0,G4,0, E4,0,A4,B4,  0,A4,0,G4, E5,G5,A5,0,  F5,G5,0,E5],
    bass:  [C4,C4,0,C4,  0,C4,C4,C4,  0,G4,0,0,    E4,0,C4,0, A4,0,A4,A4,  0,A4,0,G4, C4,C4,C4,0,  F4,F4,0,E4],
  },
  boss: {
    tempo: 130,
    notes: [E4,0,E4,E4,  0,E4,F4,G4,  A4,0,A4,G4,  F4,E4,D4,0, E4,0,E4,E4,  0,E4,F4,G4, A4,G4,A4,B4, C5,0,0,0],
    bass:  [A4,0,A4,0,   A4,0,A4,0,   F4,0,F4,0,   D4,0,D4,0, A4,0,A4,0,   A4,0,A4,0,  F4,0,F4,0,   C4,0,0,0],
  },
  victory: {
    tempo: 180,
    notes: [C5,E5,G5,C5, E5,G5,C5,E5, G5,A5,G5,E5, C5,D5,E5,C5],
    bass:  [C4,0,E4,0,   G4,0,C4,0,   E4,0,G4,0,   C4,0,C4,0],
  },
};

// === SFX Definitions ===
const SFX_DEFS = {
  attack:   [{ freq: 200, dur: 0.05 }, { freq: 400, dur: 0.08, delay: 50 }, { freq: 100, dur: 0.1, delay: 100 }],
  hit:      [{ freq: 150, dur: 0.1, type: 'sawtooth' }, { freq: 80, dur: 0.15, delay: 50, type: 'sawtooth' }],
  levelup:  [{ freq: 523, dur: 0.1 }, { freq: 659, dur: 0.1, delay: 100 }, { freq: 784, dur: 0.15, delay: 200 }, { freq: 1047, dur: 0.3, delay: 300 }],
  capture:  [{ freq: 440, dur: 0.1 }, { freq: 330, dur: 0.1, delay: 100 }, { freq: 440, dur: 0.1, delay: 200 }, { freq: 550, dur: 0.2, delay: 350 }],
  menu:     [{ freq: 800, dur: 0.03 }],
  select:   [{ freq: 600, dur: 0.03 }, { freq: 900, dur: 0.05, delay: 40 }],
  heal:     [{ freq: 400, dur: 0.1 }, { freq: 500, dur: 0.1, delay: 80 }, { freq: 600, dur: 0.1, delay: 160 }, { freq: 800, dur: 0.2, delay: 240 }],
  error:    [{ freq: 200, dur: 0.15, type: 'sawtooth' }],
};
