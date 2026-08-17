// Web Audio API Generative Cosmic Drone & Ambient Synthesizer

export class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscSub: OscillatorNode | null = null;
  private oscChord1: OscillatorNode | null = null;
  private oscChord2: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private isPlaying = false;

  public init() {
    if (this.ctx) return;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Warm resonant low-pass filter
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(140, this.ctx.currentTime);
    this.filter.Q.setValueAtTime(3.5, this.ctx.currentTime);
    this.filter.connect(this.masterGain);

    // 1. Deep Sub-Bass Sine Drone (55Hz / A1)
    this.oscSub = this.ctx.createOscillator();
    this.oscSub.type = 'sine';
    this.oscSub.frequency.setValueAtTime(55.0, this.ctx.currentTime);

    // 2. Warm Celestial Triangle Harmonics (110Hz / A2)
    this.oscChord1 = this.ctx.createOscillator();
    this.oscChord1.type = 'triangle';
    this.oscChord1.frequency.setValueAtTime(110.0, this.ctx.currentTime);

    // 3. Ethereal Fifth (164.8Hz / E3)
    this.oscChord2 = this.ctx.createOscillator();
    this.oscChord2.type = 'sine';
    this.oscChord2.frequency.setValueAtTime(164.81, this.ctx.currentTime);

    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.5;
    this.oscSub.connect(subGain);
    subGain.connect(this.filter);

    const chordGain = this.ctx.createGain();
    chordGain.gain.value = 0.22;
    this.oscChord1.connect(chordGain);
    this.oscChord2.connect(chordGain);
    chordGain.connect(this.filter);

    this.oscSub.start();
    this.oscChord1.start();
    this.oscChord2.start();
  }

  public toggle(): boolean {
    if (!this.ctx) {
      this.init();
    }

    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.play();
      return true;
    }
  }

  public play() {
    if (!this.ctx || !this.masterGain) return;
    this.isPlaying = true;
    this.masterGain.gain.setTargetAtTime(0.18, this.ctx.currentTime, 1.2);
  }

  public stop() {
    if (!this.ctx || !this.masterGain) return;
    this.isPlaying = false;
    this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.8);
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const soundSynthesizer = new SoundSynthesizer();
