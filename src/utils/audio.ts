import { MapTheme } from '../types';

/**
 * Web Audio API synthesized sound generator and procedural background music loop.
 * Zero external audio assets required.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // Background Music State
  private bgmTimer: number | null = null;
  private currentTheme: MapTheme = 'modern';
  private currentScore: number = 0;
  private noteStep: number = 0;
  private isBgmPlaying: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.isBgmPlaying) {
      this.stopBGM();
    }
  }

  // --- BACKGROUND MUSIC ENGINE ---

  public startBGM(theme: MapTheme, initialScore: number = 0) {
    this.currentTheme = theme;
    this.currentScore = initialScore;
    if (this.isMuted) return;

    this.initCtx();
    if (!this.ctx) return;

    if (this.isBgmPlaying) {
      this.stopBGM();
    }

    this.isBgmPlaying = true;
    this.noteStep = 0;
    this.scheduleNextBgmStep();
  }

  public updateBGM(theme: MapTheme, score: number) {
    this.currentTheme = theme;
    this.currentScore = score;
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmTimer !== null) {
      window.clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private scheduleNextBgmStep() {
    if (!this.isBgmPlaying || this.isMuted || !this.ctx) return;

    // Play current step note
    this.playBgmStepNote();

    // Calculate tempo (BPM) based on theme and score intensity
    // Base BPMs: Modern 118, Desert 105, Steampunk 124
    let baseBpm = 118;
    if (this.currentTheme === 'desert') baseBpm = 105;
    if (this.currentTheme === 'steampunk') baseBpm = 124;

    // Intensity speed scaling: up to +35 BPM as score increases
    const intensityBonus = Math.min(35, Math.floor(this.currentScore * 1.5));
    const currentBpm = baseBpm + intensityBonus;
    const stepDurationMs = (60 / currentBpm / 4) * 1000; // 16th note steps

    this.noteStep = (this.noteStep + 1) % 16;

    this.bgmTimer = window.setTimeout(() => {
      this.scheduleNextBgmStep();
    }, stepDurationMs);
  }

  private playBgmStepNote() {
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const step = this.noteStep;
      const theme = this.currentTheme;
      const score = this.currentScore;

      // Master Gain for BGM (soft background balance)
      const bgmGain = this.ctx.createGain();
      bgmGain.gain.setValueAtTime(0.08, now);
      bgmGain.connect(this.ctx.destination);

      if (theme === 'modern') {
        // --- C Major Pentatonic Upbeat Synth Loop ---
        // Scale: C4(261.63), D4(293.66), E4(329.63), G4(392.00), A4(440.00), C5(523.25)
        const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
        const pattern = [0, 2, 3, 5, 2, 4, 3, 1, 0, 3, 5, 4, 2, 1, 3, 2];
        const freq = scale[pattern[step % pattern.length]];

        // Melody Synth
        if (step % 2 === 0) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain);
          gain.connect(bgmGain);
          osc.start(now);
          osc.stop(now + 0.12);
        }

        // Bassline pulse on downbeats
        if (step % 4 === 0) {
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bassOsc.type = 'sine';
          bassOsc.frequency.setValueAtTime(step % 8 === 0 ? 130.81 : 174.61, now); // C3 or F3
          bassGain.gain.setValueAtTime(0.18, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          bassOsc.connect(bassGain);
          bassGain.connect(bgmGain);
          bassOsc.start(now);
          bassOsc.stop(now + 0.2);
        }

        // High intensity perk notes when score >= 10
        if (score >= 10 && step % 4 === 2) {
          const perkOsc = this.ctx.createOscillator();
          const perkGain = this.ctx.createGain();
          perkOsc.type = 'sine';
          perkOsc.frequency.setValueAtTime(freq * 2, now);
          perkGain.gain.setValueAtTime(0.06, now);
          perkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          perkOsc.connect(perkGain);
          perkGain.connect(bgmGain);
          perkOsc.start(now);
          perkOsc.stop(now + 0.08);
        }
      } else if (theme === 'desert') {
        // --- E Phrygian / Desert Atmospheric Loop ---
        // Scale: E3(164.81), F3(174.61), G3(196.00), B3(246.94), C4(261.63), E4(329.63)
        const scale = [164.81, 174.61, 196.00, 246.94, 261.63, 329.63];
        const pattern = [0, 1, 3, 2, 4, 3, 1, 0, 2, 3, 5, 4, 3, 2, 1, 0];
        const freq = scale[pattern[step % pattern.length]];

        // Warm sine lead
        if (step % 2 === 0) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
          osc.connect(gain);
          gain.connect(bgmGain);
          osc.start(now);
          osc.stop(now + 0.16);
        }

        // Low drone bass
        if (step % 8 === 0) {
          const droneOsc = this.ctx.createOscillator();
          const droneGain = this.ctx.createGain();
          droneOsc.type = 'triangle';
          droneOsc.frequency.setValueAtTime(82.41, now); // E2
          droneGain.gain.setValueAtTime(0.2, now);
          droneGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
          droneOsc.connect(droneGain);
          droneGain.connect(bgmGain);
          droneOsc.start(now);
          droneOsc.stop(now + 0.35);
        }

        // Soft sand shaker click on offbeats
        if (step % 2 === 1) {
          const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.02, this.ctx.sampleRate);
          const data = noiseBuffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
          const noise = this.ctx.createBufferSource();
          noise.buffer = noiseBuffer;
          const noiseGain = this.ctx.createGain();
          noiseGain.gain.setValueAtTime(0.03 + Math.min(0.04, score * 0.002), now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
          noise.connect(noiseGain);
          noiseGain.connect(bgmGain);
          noise.start(now);
        }
      } else if (theme === 'steampunk') {
        // --- Steampunk Clockwork Minor Saw Loop ---
        // Scale: A3(220.00), C4(261.63), D4(293.66), E4(329.63), G4(392.00)
        const scale = [220.00, 261.63, 293.66, 329.63, 392.00];
        const pattern = [0, 3, 1, 4, 0, 2, 3, 1, 0, 4, 2, 3, 1, 0, 3, 2];
        const freq = scale[pattern[step % pattern.length]];

        // Clockwork ticking synth
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = step % 4 === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(step % 4 === 0 ? 0.1 : 0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(bgmGain);
        osc.start(now);
        osc.stop(now + 0.09);

        // Gear mechanical click on every 16th step
        if (step % 2 === 0) {
          const clickOsc = this.ctx.createOscillator();
          const clickGain = this.ctx.createGain();
          clickOsc.type = 'square';
          clickOsc.frequency.setValueAtTime(1200, now);
          clickGain.gain.setValueAtTime(0.02, now);
          clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
          clickOsc.connect(clickGain);
          clickGain.connect(bgmGain);
          clickOsc.start(now);
          clickOsc.stop(now + 0.015);
        }
      }
    } catch {
      // Audio fallback
    }
  }

  // --- SOUND EFFECTS ---

  public playFlap() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Ignore audio context autoplay restriction errors
    }
  }

  public playScore() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      
      // Note 1
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.1);

      // Note 2
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.08); // A5
      gain2.gain.setValueAtTime(0.25, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.22);
    } catch {
      // Audio fallback
    }
  }

  public playHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      
      // Low impact pitch drop
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);

      // Short noise burst for thud
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      noise.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(now);
    } catch {
      // Audio fallback
    }
  }

  public playClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Audio fallback
    }
  }

  public playFanfare() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const startTime = now + idx * 0.09;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.18);
      });
    } catch {
      // Audio fallback
    }
  }
}

export const soundEngine = new SoundEngine();

