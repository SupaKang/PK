// 오디오 시스템 — Web Audio API 기반 프로시저럴 칩튠 사운드

/**
 * 오디오 매니저 (싱글턴)
 * 모든 사운드를 프로시저럴 생성 — 외부 파일 불필요
 */
class AudioManagerClass {
  constructor() {
    this.ctx = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.masterGain = null;
    this.bgmVolume = 0.3;
    this.sfxVolume = 0.5;
    this.currentBgm = null;
    this.bgmNodes = [];   // 현재 BGM 오실레이터 참조
    this.bgmTimeout = null;
    this._initialized = false;
  }

  /** AudioContext 초기화 (사용자 인터랙션 후 호출) */
  init() {
    if (this._initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;
    this.masterGain.connect(this.ctx.destination);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = this.bgmVolume;
    this.bgmGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);

    this._initialized = true;
  }

  _ensureInit() {
    if (!this._initialized) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  // ─── 환경음 재생 ─────────────────────────────────

  playAmbient(type) {
    this.stopAmbient();
    if (!this._initialized) this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    switch(type) {
      case 'forest': {
        // Gentle bird chirps every few seconds
        this._ambientInterval = setInterval(() => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.frequency.value = 2000 + Math.random() * 1000;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0, this.ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.02, this.ctx.currentTime + 0.05);
          gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(this.ctx.currentTime);
          osc.stop(this.ctx.currentTime + 0.2);
        }, 3000 + Math.random() * 4000);
        break;
      }
      case 'cave': {
        // Dripping water
        this._ambientInterval = setInterval(() => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.frequency.value = 800 + Math.random() * 400;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.015, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(this.ctx.currentTime);
          osc.stop(this.ctx.currentTime + 0.3);
        }, 2000 + Math.random() * 3000);
        break;
      }
      case 'water': {
        // Gentle waves (noise)
        this._ambientInterval = setInterval(() => {
          if (!this.ctx) return;
          const bufferSize = this.ctx.sampleRate * 0.5;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.005 * Math.sin(i / bufferSize * Math.PI);
          }
          const src = this.ctx.createBufferSource();
          src.buffer = buffer;
          src.connect(this.masterGain);
          src.start();
        }, 4000);
        break;
      }
    }
  }

  stopAmbient() {
    if (this._ambientInterval) {
      clearInterval(this._ambientInterval);
      this._ambientInterval = null;
    }
  }

  // ─── 볼륨 제어 ─────────────────────────────────

  setVolume(bgm, sfx) {
    if (bgm !== undefined) {
      this.bgmVolume = Math.max(0, Math.min(1, bgm));
      if (this.bgmGain) this.bgmGain.gain.value = this.bgmVolume;
    }
    if (sfx !== undefined) {
      this.sfxVolume = Math.max(0, Math.min(1, sfx));
      if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
    }
  }

  // ─── BGM 재생 ──────────────────────────────────

  playBgm(trackName) {
    this._ensureInit();
    this.stopBgm();
    this.currentBgm = trackName;

    const track = BGM_TRACKS[trackName];
    if (!track) {
      console.warn(`BGM 트랙 없음: ${trackName}`);
      return;
    }

    this._playBgmLoop(track);
  }

  _playBgmLoop(track) {
    if (!this.currentBgm) return;
    const duration = this._playMelody(track.notes, track.bpm, track.waveform || 'square', this.bgmGain);
    this.bgmTimeout = setTimeout(() => this._playBgmLoop(track), duration * 1000);
  }

  stopBgm() {
    this.currentBgm = null;
    if (this.bgmTimeout) {
      clearTimeout(this.bgmTimeout);
      this.bgmTimeout = null;
    }
    // 현재 BGM 노드 정리
    for (const node of this.bgmNodes) {
      try { node.stop(); } catch (e) { /* 이미 정지됨 */ }
    }
    this.bgmNodes = [];
  }

  // ─── SFX 재생 ──────────────────────────────────

  playSfx(sfxName) {
    this._ensureInit();
    const sfx = SFX_MAP[sfxName];
    if (!sfx) {
      console.warn(`SFX 없음: ${sfxName}`);
      return;
    }
    sfx(this.ctx, this.sfxGain);
  }

  // ─── 내부: 멜로디 재생 ─────────────────────────

  _playMelody(notes, bpm, waveform, destination) {
    const beatDuration = 60 / bpm;
    let time = this.ctx.currentTime + 0.05;
    const startTime = time;

    for (const note of notes) {
      if (note.rest) {
        time += beatDuration * note.duration;
        continue;
      }

      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = waveform;
      osc.frequency.value = note.freq;
      env.gain.setValueAtTime(0.3, time);
      env.gain.exponentialRampToValueAtTime(0.01, time + beatDuration * note.duration * 0.9);

      osc.connect(env);
      env.connect(destination);
      osc.start(time);
      osc.stop(time + beatDuration * note.duration);
      this.bgmNodes.push(osc);

      // 하모닉스 (짝수 노트에 옥타브 위)
      if (note.harmony) {
        const osc2 = this.ctx.createOscillator();
        const env2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.value = note.freq * 2;
        env2.gain.setValueAtTime(0.1, time);
        env2.gain.exponentialRampToValueAtTime(0.01, time + beatDuration * note.duration * 0.8);
        osc2.connect(env2);
        env2.connect(destination);
        osc2.start(time);
        osc2.stop(time + beatDuration * note.duration);
        this.bgmNodes.push(osc2);
      }

      time += beatDuration * note.duration;
    }

    return time - startTime;
  }
}

// ─── 음계 헬퍼 ──────────────────────────────────

const NOTE = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  C6: 1046.50,
};

function n(freq, duration, harmony = false) { return { freq, duration, harmony }; }
function rest(duration) { return { rest: true, duration }; }

// ─── BGM 트랙 정의 ──────────────────────────────

const BGM_TRACKS = {
  battle_bgm: {
    bpm: 160,
    waveform: 'square',
    notes: [
      n(NOTE.E4, 0.5), n(NOTE.E4, 0.5), n(NOTE.G4, 0.5), n(NOTE.A4, 0.5),
      n(NOTE.B4, 0.5, true), n(NOTE.A4, 0.5), n(NOTE.G4, 0.5), n(NOTE.E4, 0.5),
      n(NOTE.D4, 0.5), n(NOTE.E4, 0.5), n(NOTE.G4, 1, true),
      rest(0.5),
      n(NOTE.A4, 0.5), n(NOTE.B4, 0.5), n(NOTE.C5, 0.5, true), n(NOTE.B4, 0.5),
      n(NOTE.A4, 0.5), n(NOTE.G4, 0.5), n(NOTE.A4, 0.5), n(NOTE.E4, 1),
      rest(0.5),
      n(NOTE.E4, 0.25), n(NOTE.G4, 0.25), n(NOTE.B4, 0.5, true), n(NOTE.A4, 0.5),
      n(NOTE.G4, 0.5), n(NOTE.E4, 0.5), n(NOTE.D4, 0.5), n(NOTE.E4, 1.5),
    ],
  },

  town_bgm: {
    bpm: 110,
    waveform: 'triangle',
    notes: [
      n(NOTE.C4, 1), n(NOTE.E4, 0.5), n(NOTE.G4, 0.5), n(NOTE.A4, 1, true),
      n(NOTE.G4, 0.5), n(NOTE.E4, 0.5), n(NOTE.F4, 1),
      rest(0.5),
      n(NOTE.E4, 0.5), n(NOTE.D4, 0.5), n(NOTE.C4, 1, true),
      n(NOTE.D4, 0.5), n(NOTE.E4, 0.5), n(NOTE.F4, 0.5), n(NOTE.G4, 1.5),
      rest(0.5),
      n(NOTE.A4, 0.5), n(NOTE.G4, 0.5), n(NOTE.F4, 0.5), n(NOTE.E4, 1, true),
      n(NOTE.D4, 0.5), n(NOTE.C4, 1.5),
      rest(1),
    ],
  },

  route_bgm: {
    bpm: 130,
    waveform: 'square',
    notes: [
      n(NOTE.G4, 0.5), n(NOTE.A4, 0.5), n(NOTE.B4, 0.5, true), n(NOTE.G4, 0.5),
      n(NOTE.E4, 1), n(NOTE.D4, 0.5), n(NOTE.E4, 0.5),
      n(NOTE.G4, 0.5), n(NOTE.A4, 0.5), n(NOTE.B4, 1, true),
      rest(0.5),
      n(NOTE.C5, 0.5), n(NOTE.B4, 0.5), n(NOTE.A4, 0.5), n(NOTE.G4, 0.5),
      n(NOTE.E4, 0.5), n(NOTE.D4, 0.5), n(NOTE.E4, 1.5),
      rest(0.5),
      n(NOTE.D4, 0.5), n(NOTE.E4, 0.5), n(NOTE.G4, 0.5), n(NOTE.A4, 1, true),
      n(NOTE.G4, 0.5), n(NOTE.E4, 1),
      rest(0.5),
    ],
  },

  boss_bgm: {
    bpm: 180,
    waveform: 'sawtooth',
    notes: [
      n(NOTE.E3, 0.25), n(NOTE.E3, 0.25), n(NOTE.G3, 0.25), n(NOTE.E3, 0.25),
      n(NOTE.B3, 0.5, true), n(NOTE.A3, 0.5),
      n(NOTE.E3, 0.25), n(NOTE.E3, 0.25), n(NOTE.G3, 0.25), n(NOTE.A3, 0.25),
      n(NOTE.B3, 0.5, true), n(NOTE.C4, 0.5),
      n(NOTE.B3, 0.25), n(NOTE.A3, 0.25), n(NOTE.G3, 0.25), n(NOTE.A3, 0.25),
      n(NOTE.B3, 0.5), n(NOTE.E4, 0.5, true),
      n(NOTE.D4, 0.25), n(NOTE.C4, 0.25), n(NOTE.B3, 0.5), n(NOTE.A3, 0.5),
      n(NOTE.G3, 0.25), n(NOTE.E3, 0.25), n(NOTE.E3, 1),
      rest(0.5),
      n(NOTE.E4, 0.25), n(NOTE.D4, 0.25), n(NOTE.C4, 0.25), n(NOTE.B3, 0.25),
      n(NOTE.A3, 0.5, true), n(NOTE.B3, 0.5), n(NOTE.E3, 1),
    ],
  },

  victory_fanfare: {
    bpm: 140,
    waveform: 'square',
    notes: [
      n(NOTE.C5, 0.25), n(NOTE.D5, 0.25), n(NOTE.E5, 0.25), n(NOTE.F5, 0.25),
      n(NOTE.G5, 0.75, true), n(NOTE.E5, 0.25), n(NOTE.G5, 1.5, true),
      rest(0.5),
      n(NOTE.A5, 0.25), n(NOTE.G5, 0.25), n(NOTE.A5, 0.25), n(NOTE.G5, 0.25),
      n(NOTE.C6, 2, true),
    ],
  },
};

// ─── SFX 정의 ────────────────────────────────────

function createSfx(fn) { return fn; }

const SFX_MAP = {
  sfx_hit: createSfx((ctx, dest) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
    env.gain.setValueAtTime(0.4, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(env);
    env.connect(dest);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }),

  sfx_super_effective: createSfx((ctx, dest) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.25);
    env.gain.setValueAtTime(0.5, t);
    env.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
    osc.connect(env);
    env.connect(dest);
    osc.start(t);
    osc.stop(t + 0.25);
  }),

  sfx_not_effective: createSfx((ctx, dest) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.2);
    env.gain.setValueAtTime(0.3, t);
    env.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.connect(env);
    env.connect(dest);
    osc.start(t);
    osc.stop(t + 0.2);
  }),

  sfx_capture_shake: createSfx((ctx, dest) => {
    const t = ctx.currentTime;
    // 딸각 소리
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.setValueAtTime(400, t + 0.05);
    osc.frequency.setValueAtTime(600, t + 0.1);
    env.gain.setValueAtTime(0.3, t);
    env.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc.connect(env);
    env.connect(dest);
    osc.start(t);
    osc.stop(t + 0.15);
  }),

  sfx_capture_success: createSfx((ctx, dest) => {
    const t = ctx.currentTime;
    // 성공 팡파르
    [0, 0.12, 0.24, 0.36].forEach((offset, i) => {
      const freq = [523.25, 659.25, 783.99, 1046.50][i];
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0.3, t + offset);
      env.gain.exponentialRampToValueAtTime(0.01, t + offset + 0.3);
      osc.connect(env);
      env.connect(dest);
      osc.start(t + offset);
      osc.stop(t + offset + 0.3);
    });
  }),

  sfx_levelup: createSfx((ctx, dest) => {
    const t = ctx.currentTime;
    const freqs = [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      const start = t + i * 0.1;
      env.gain.setValueAtTime(0.3, start);
      env.gain.exponentialRampToValueAtTime(0.01, start + 0.25);
      osc.connect(env);
      env.connect(dest);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  }),

  sfx_evolve: createSfx((ctx, dest) => {
    const t = ctx.currentTime;
    // 진화 사운드 — 상승 스위프
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.8);
    env.gain.setValueAtTime(0.3, t);
    env.gain.setValueAtTime(0.3, t + 0.6);
    env.gain.exponentialRampToValueAtTime(0.01, t + 0.9);
    osc.connect(env);
    env.connect(dest);
    osc.start(t);
    osc.stop(t + 0.9);

    // 마무리 효과음
    const osc2 = ctx.createOscillator();
    const env2 = ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.value = NOTE.C5;
    env2.gain.setValueAtTime(0, t + 0.8);
    env2.gain.setValueAtTime(0.4, t + 0.85);
    env2.gain.exponentialRampToValueAtTime(0.01, t + 1.3);
    osc2.connect(env2);
    env2.connect(dest);
    osc2.start(t + 0.8);
    osc2.stop(t + 1.3);
  }),

  sfx_select: createSfx((ctx, dest) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 600;
    env.gain.setValueAtTime(0.2, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.connect(env);
    env.connect(dest);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  }),

  sfx_cancel: createSfx((ctx, dest) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
    env.gain.setValueAtTime(0.2, t);
    env.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.connect(env);
    env.connect(dest);
    osc.start(t);
    osc.stop(t + 0.1);
  }),

  sfx_cursor: createSfx((ctx, dest) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 800;
    env.gain.setValueAtTime(0.15, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
    osc.connect(env);
    env.connect(dest);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  }),
};

// ─── 싱글턴 인스턴스 ─────────────────────────────

export const AudioManager = new AudioManagerClass();
