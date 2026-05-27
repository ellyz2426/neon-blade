export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(this.ctx.destination);

    this.music = this.ctx.createGain();
    this.music.gain.value = 0.3;
    this.music.connect(this.master);

    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = 0.8;
    this.sfx.connect(this.master);

    this.startAmbient();
  }

  private startAmbient() {
    if (!this.ctx || !this.music) return;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    lfo.frequency.value = 0.1;
    lfoGain.gain.value = 200;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    osc.connect(filter);
    filter.connect(this.music);

    osc.start();
    lfo.start();
  }

  playPunch(type: 'jab' | 'hook' | 'uppercut' | 'block' = 'jab') {
    if (!this.ctx || !this.sfx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const noise = ctx.createBufferSource();
    const noiseGain = ctx.createGain();

    osc.type = type === 'hook' ? 'square' : 'sine';
    osc.frequency.setValueAtTime(type === 'uppercut' ? 180 : type === 'hook' ? 120 : 200, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    noise.buffer = buffer;
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain).connect(this.sfx);
    noise.connect(noiseGain).connect(this.sfx);
    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.13);
    noise.stop(now + 0.06);
  }

  playHit(heavy = false) {
    if (!this.ctx || !this.sfx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(heavy ? 90 : 140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(this.sfx);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playBlock() {
    if (!this.ctx || !this.sfx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain).connect(this.sfx);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playBell() {
    if (!this.ctx || !this.sfx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    [523, 659, 784].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.4, now + i * 0.08 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.8);
      osc.connect(gain).connect(this.sfx);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.9);
    });
  }

  playWhistle() {
    if (!this.ctx || !this.sfx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.linearRampToValueAtTime(1500, now + 0.15);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain).connect(this.sfx);
    osc.start(now);
    osc.stop(now + 0.32);
  }
}
