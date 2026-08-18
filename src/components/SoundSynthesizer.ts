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

  /**
   * Mobile-friendly audio unlock — browsers suspend the AudioContext until a
   * user gesture. Call from any first pointer/key interaction; safe no-op
   * elsewhere. Ambient drones resume without needing a second toggle.
   */
  public unlock() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // ------------------------------------------------------------------
  // UNIVERSAL phenomenon audio — subtle, contextual, never musical.
  // ------------------------------------------------------------------

  /** Very quiet high blip — the pulsar lighthouse crossing the line of sight. */
  public pulsarTick() {
    if (!this.ctx || !this.isPlaying) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1150.0, t);
    osc.frequency.exponentialRampToValueAtTime(620.0, t + 0.07);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** Short low-frequency event at merger — then silence. */
  public mergerThump() {
    if (!this.ctx || !this.isPlaying) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(38.0, t);
    osc.frequency.exponentialRampToValueAtTime(24.0, t + 0.9);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + 1.5);
  }

  // ------------------------------------------------------------------
  // GEMINI living world — city ambience bed
  // ------------------------------------------------------------------

  /** Set the capital-city ambience level (0 = off, 1 = full bed). */
  public cityAmbience(level: number) {
    if (!this.ctx || !this.isPlaying) return;
    const t = this.ctx.currentTime;
    if (level <= 0) {
      if (this.cityHum) {
        this.cityHumGain?.gain.setTargetAtTime(0.0001, t, 0.8);
        this.cityWindGain?.gain.setTargetAtTime(0.0001, t, 1.2);
      }
      return;
    }
    if (!this.cityHum) {
      // Low warm hum — the city's power grid breathing.
      this.cityHum = this.ctx.createOscillator();
      this.cityHum.type = 'sine';
      this.cityHum.frequency.setValueAtTime(52.0, t);
      this.cityHum2 = this.ctx.createOscillator();
      this.cityHum2.type = 'sine';
      this.cityHum2.frequency.setValueAtTime(52.6, t);
      this.cityHumGain = this.ctx.createGain();
      this.cityHumGain.gain.value = 0.0001;
      const cityFilter = this.ctx.createBiquadFilter();
      cityFilter.type = 'lowpass';
      cityFilter.frequency.value = 180;
      this.cityHum.connect(cityFilter);
      this.cityHum2.connect(cityFilter);
      cityFilter.connect(this.cityHumGain);
      this.cityHumGain.connect(this.masterGain!);
      this.cityHum.start();
      this.cityHum2.start();

      // Soft filtered wind across the plaza.
      const noiseLen = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, noiseLen, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / noiseLen) * 0.6;
      }
      this.cityWind = this.ctx.createBufferSource();
      this.cityWind.buffer = buffer;
      this.cityWind.loop = true;
      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 420;
      windFilter.Q.value = 0.6;
      this.cityWindGain = this.ctx.createGain();
      this.cityWindGain.gain.value = 0.0001;
      this.cityWind.connect(windFilter);
      windFilter.connect(this.cityWindGain);
      this.cityWindGain.connect(this.masterGain!);
      this.cityWind.start();
    }
    const l = Math.max(0, Math.min(1, level));
    this.cityHumGain?.gain.setTargetAtTime(0.03 * l, t, 1.5);
    this.cityWindGain?.gain.setTargetAtTime(0.014 * l, t, 2.5);
  }

  private cityHum: OscillatorNode | null = null;
  private cityHum2: OscillatorNode | null = null;
  private cityHumGain: GainNode | null = null;
  private cityWind: AudioBufferSourceNode | null = null;
  private cityWindGain: GainNode | null = null;
}

export const soundSynthesizer = new SoundSynthesizer();
