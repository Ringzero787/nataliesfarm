import Phaser from 'phaser';

/**
 * SoundManager — handles all game audio.
 * Generates sounds procedurally using Web Audio API so no external files needed.
 * Can be replaced with real audio files later.
 */
export const TRACK_NAMES = ['Sunny Day', 'Peaceful Farm'] as const;
export type TrackName = (typeof TRACK_NAMES)[number];

export class SoundManager {
  private scene: Phaser.Scene;
  private audioCtx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private bgmSource: AudioBufferSourceNode | null = null;
  private muted = false;
  private _currentTrack: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    try {
      this.audioCtx = new AudioContext();
    } catch {
      console.warn('Web Audio API not supported');
    }
  }

  get isMuted(): boolean {
    return this.muted;
  }

  get currentTrack(): number {
    return this._currentTrack;
  }

  get currentTrackName(): string {
    return TRACK_NAMES[this._currentTrack];
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (this.bgmGain) {
      this.bgmGain.gain.value = this.muted ? 0 : 0.15;
    }
  }

  switchTrack(): void {
    this._currentTrack = (this._currentTrack + 1) % TRACK_NAMES.length;
    if (this.bgmSource) {
      this.startBGM();
    }
  }

  /** Resume audio context (required after user interaction on mobile) */
  resume(): void {
    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // ── Sound Effects ──────────────────────────────────────────

  /** Happy chime — star earned, activity complete */
  playSuccess(): void {
    if (this.muted || !this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Ascending arpeggio: C5 → E5 → G5 → C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.35);
    });
  }

  /** Soft pop — heart, food drop, button tap */
  playPop(): void {
    if (this.muted || !this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /** Munch/crunch — feeding */
  playMunch(): void {
    if (this.muted || !this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(150 + Math.random() * 100, now + i * 0.08);
      osc.frequency.exponentialRampToValueAtTime(80, now + i * 0.08 + 0.06);
      gain.gain.setValueAtTime(0.15, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.1);
    }
  }

  /** Splash — washing, water */
  playSplash(): void {
    if (this.muted || !this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // White noise burst filtered to sound watery
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1500;
    filter.Q.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(now);
    source.stop(now + 0.35);
  }

  /** Brush stroke — brushing */
  playBrush(): void {
    if (this.muted || !this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Short filtered noise burst
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(now);
    source.stop(now + 0.2);
  }

  /** Towel rub — drying */
  playRub(): void {
    if (this.muted || !this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.2;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(now);
    source.stop(now + 0.15);
  }

  /** Sweep — cleaning */
  playSweep(): void {
    if (this.muted || !this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.5));
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + 0.2);
    filter.Q.value = 1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(now);
    source.stop(now + 0.25);
  }

  /** Sparkle/twinkle — completion sparkles */
  playSparkle(): void {
    if (this.muted || !this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000 + Math.random() * 1000, now);
    osc.frequency.exponentialRampToValueAtTime(4000, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /** UI click */
  playClick(): void {
    if (this.muted || !this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // ── Background Music ───────────────────────────────────────

  startBGM(): void {
    if (!this.audioCtx) return;
    this.stopBGM();

    const ctx = this.audioCtx;
    const buffer = this._currentTrack === 0
      ? this.createSunnyDayBuffer(ctx)
      : this.createPeacefulFarmBuffer(ctx);

    this.bgmSource = ctx.createBufferSource();
    this.bgmSource.buffer = buffer;
    this.bgmSource.loop = true;

    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.value = this.muted ? 0 : 0.15;

    this.bgmSource.connect(this.bgmGain).connect(ctx.destination);
    this.bgmSource.start(ctx.currentTime);
  }

  // ── Audio rendering helpers ────────────────────────────────

  /** Render a single note into the stereo buffer with rich timbre. */
  private addNote(
    L: Float32Array, R: Float32Array, sr: number,
    freq: number, start: number, dur: number, vol: number,
    type: 'melody' | 'pad' | 'bass',
  ): void {
    const s0 = Math.floor(start * sr);
    const s1 = Math.min(Math.floor((start + dur) * sr), L.length);
    const TAU = 2 * Math.PI;
    for (let i = s0; i < s1; i++) {
      const t = (i - s0) / sr;
      let sample = 0;
      let stereo = 0;

      if (type === 'melody') {
        // Gentle music-box: soft attack, smooth bell-like decay, fewer harmonics
        const env = Math.min(t * 40, 1) * Math.exp(-t * 2.0);
        sample = (
          Math.sin(TAU * freq * t) +
          Math.sin(TAU * freq * 1.002 * t) * 0.5 +       // gentle chorus detune
          Math.sin(TAU * freq * 2 * t) * 0.1              // soft octave harmonic
        ) * env * vol * 0.04;
        stereo = Math.sin(TAU * freq * 1.004 * t) * env * vol * 0.01;
      } else if (type === 'pad') {
        // Lush ethereal pad: very slow attack, thick detuned chorus, slow vibrato
        const atk = Math.min(t / 3.0, 1);
        const rel = Math.min((dur - t) * 1.5, 1);
        const vibrato = 1 + 0.0015 * Math.sin(TAU * 2.5 * t);
        const env = atk * rel;
        const f = freq * vibrato;
        sample = (
          Math.sin(TAU * f * t) +
          Math.sin(TAU * f * 1.005 * t) * 0.5 +           // detune up
          Math.sin(TAU * f * 0.995 * t) * 0.5 +           // detune down
          Math.sin(TAU * f * 1.01 * t) * 0.3 +            // wider detune
          Math.sin(TAU * f * 0.99 * t) * 0.3              // wider detune down
        ) * env * vol * 0.025;
        stereo = Math.sin(TAU * f * 1.008 * t) * env * vol * 0.01;
      } else {
        // Bass: warm fundamental + sub, gentle attack
        const atk = Math.min(t * 5, 1);
        const rel = Math.min((dur - t) * 2, 1);
        const env = atk * rel;
        sample = (
          Math.sin(TAU * freq * t) +
          Math.sin(TAU * freq * 0.5 * t) * 0.3            // sub octave
        ) * env * vol * 0.06;
      }

      L[i] += sample + stereo;
      R[i] += sample - stereo;
    }
  }

  /** Multi-tap delay with cross-feed for a lush reverb effect. */
  private applyReverb(L: Float32Array, R: Float32Array, sr: number): void {
    const Lsrc = new Float32Array(L);
    const Rsrc = new Float32Array(R);
    const taps = [
      { delay: Math.floor(sr * 0.031), gain: 0.20 },
      { delay: Math.floor(sr * 0.053), gain: 0.17 },
      { delay: Math.floor(sr * 0.079), gain: 0.15 },
      { delay: Math.floor(sr * 0.113), gain: 0.13 },
      { delay: Math.floor(sr * 0.157), gain: 0.11 },
      { delay: Math.floor(sr * 0.223), gain: 0.09 },
      { delay: Math.floor(sr * 0.311), gain: 0.06 },
      { delay: Math.floor(sr * 0.419), gain: 0.04 },
    ];
    for (const { delay, gain } of taps) {
      for (let i = delay; i < L.length; i++) {
        L[i] += Lsrc[i - delay] * gain * 0.35 + Rsrc[i - delay] * gain * 0.65;
        R[i] += Rsrc[i - delay] * gain * 0.35 + Lsrc[i - delay] * gain * 0.65;
      }
    }
  }

  // ── Track generators ─────────────────────────────────────

  /**
   * Track 1: "Sunny Day" — calm, warm ambient.
   * C major pentatonic (C D E G A). BPM 72. Sparse music-box melody
   * with warm sustained pad chords and deep slow bass.
   */
  private createSunnyDayBuffer(ctx: AudioContext): AudioBuffer {
    const sr = ctx.sampleRate;
    const bpm = 72;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const totalDur = 8 * bar;
    const len = Math.ceil(sr * (totalDur + 2)); // +2s reverb tail
    const buffer = ctx.createBuffer(2, len, sr);
    const L = buffer.getChannelData(0);
    const R = buffer.getChannelData(1);

    // ── Melody (sparse music-box, C pentatonic: C D E G A) ──
    // Only a few notes per phrase with long gaps
    const m: [number, number, number][] = [ // [freq, startBeat, durBeats]
      // Phrase 1 (bars 1-2): gentle opening
      [523.25, 0, 3],           // C5 — long held note
      [659.25, 5, 2],           // E5
      // Phrase 2 (bars 3-4): answer
      [783.99, 10, 3],          // G5 — long held
      [880.00, 14, 2],          // A5
      // Phrase 3 (bars 5-6): rise
      [523.25, 18, 2],          // C5
      [587.33, 21, 3],          // D5 — long sustained
      // Phrase 4 (bars 7-8): gentle resolve
      [659.25, 26, 2],          // E5
      [523.25, 29, 3],          // C5 — resolve home
    ];
    m.forEach(([f, s, d]) => this.addNote(L, R, sr, f, s * beat, d * beat, 0.8, 'melody'));

    // ── Warm sustained pad chords (pentatonic-friendly) ──
    const chords: [number[], number, number][] = [
      [[261.63, 329.63, 392.00], 0, 8],         // C maj bars 1-2
      [[293.66, 392.00, 440.00], 8, 8],         // Dsus4-ish bars 3-4
      [[220.00, 261.63, 329.63], 16, 8],        // Am bars 5-6
      [[261.63, 329.63, 392.00], 24, 8],        // C maj bars 7-8 resolve
    ];
    chords.forEach(([notes, s, d]) =>
      notes.forEach(f => this.addNote(L, R, sr, f, s * beat, d * beat, 0.5, 'pad')),
    );

    // ── Deep slow bass (whole-note roots) ──
    const bass: [number, number, number][] = [
      [130.81, 0, 8],   // C2 bars 1-2
      [146.83, 8, 8],   // D2 bars 3-4
      [110.00, 16, 8],  // A1 bars 5-6
      [130.81, 24, 8],  // C2 bars 7-8
    ];
    bass.forEach(([f, s, d]) => this.addNote(L, R, sr, f, s * beat, d * beat, 0.45, 'bass'));

    this.applyReverb(L, R, sr);
    return buffer;
  }

  /**
   * Track 2: "Peaceful Farm" — dreamy lullaby waltz.
   * G major pentatonic (G A B D E). BPM 60. 3/4 waltz, very sparse.
   * Only 4-5 notes per 8-bar phrase with lush ethereal pads.
   */
  private createPeacefulFarmBuffer(ctx: AudioContext): AudioBuffer {
    const sr = ctx.sampleRate;
    const bpm = 60;
    const beat = 60 / bpm;
    const bar = beat * 3; // 3/4 waltz
    const totalDur = 8 * bar;
    const len = Math.ceil(sr * (totalDur + 2.5));
    const buffer = ctx.createBuffer(2, len, sr);
    const L = buffer.getChannelData(0);
    const R = buffer.getChannelData(1);

    // ── Melody (very sparse, G pentatonic: G A B D E) ──
    // Only 4-5 notes across 8 bars, long sustained tones
    const m: [number, number, number][] = [ // [freq, startBeat, durBeats]
      [783.99, 0, 5],          // G5 — long held, bars 1-2
      [493.88, 8, 4],          // B4 — bars 3-4
      [587.33, 15, 5],         // D5 — bars 6-7
      [392.00, 21, 3],         // G4 — resolve, bar 8
    ];
    m.forEach(([f, s, d]) => this.addNote(L, R, sr, f, s * beat, d * beat, 0.6, 'melody'));

    // ── Lush ethereal pad chords (ambient drone quality) ──
    const chords: [number[], number, number][] = [
      [[196.00, 246.94, 293.66], 0, 9],        // G maj bars 1-3
      [[164.81, 196.00, 246.94], 9, 6],        // Em bars 4-5
      [[146.83, 196.00, 220.00], 15, 6],       // Dsus bars 6-7
      [[196.00, 246.94, 293.66], 21, 3],       // G resolve bar 8
    ];
    chords.forEach(([notes, s, d]) =>
      notes.forEach(f => this.addNote(L, R, sr, f, s * beat, d * beat, 0.55, 'pad')),
    );

    // ── Barely audible sub-bass ──
    const bass: [number, number, number][] = [
      [98.00, 0, 9],    // G1 bars 1-3
      [82.41, 9, 6],    // E1 bars 4-5
      [73.42, 15, 6],   // D1 bars 6-7
      [98.00, 21, 3],   // G1 bar 8
    ];
    bass.forEach(([f, s, d]) => this.addNote(L, R, sr, f, s * beat, d * beat, 0.35, 'bass'));

    this.applyReverb(L, R, sr);
    return buffer;
  }

  stopBGM(): void {
    if (this.bgmSource) {
      try { this.bgmSource.stop(); } catch { /* already stopped */ }
      this.bgmSource = null;
    }
  }

  destroy(): void {
    this.stopBGM();
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

/**
 * Global sound manager registry.
 * Scenes access it via getSoundManager(scene) which creates one per game instance.
 */
let _soundManager: SoundManager | null = null;

export function getSoundManager(scene: Phaser.Scene): SoundManager {
  if (!_soundManager) {
    _soundManager = new SoundManager(scene);
  }
  return _soundManager;
}
