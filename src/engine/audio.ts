import type { WeaponId } from '../types/game';

class TacticalAudio {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private masterGain: GainNode | null = null;
  private volume = 0.75;
  private muted = false;

  public unlock() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);
      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public setConfig(volume: number, muted: boolean) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime,
        0.02
      );
    }
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = ctx.sampleRate * 2.0;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public playGunshot(weaponId: WeaponId, distanceMeters = 0, suppressed = false) {
    if (this.muted || !this.ctx || !this.masterGain || !this.noiseBuffer) return;
    if (distanceMeters > (suppressed ? 95 : 210)) return;

    const now = this.ctx.currentTime;
    const atten =
      distanceMeters <= 2
        ? 1.0
        : Math.max(0.04, 1 / (1 + distanceMeters * (suppressed ? 0.08 : 0.042)));

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = suppressed ? 'lowpass' : 'bandpass';

    const noiseGain = this.ctx.createGain();
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    let duration = 0.22;
    let startFreq = 160;
    let endFreq = 45;
    let filterFreq = 1600;
    let filterQ = 0.8;

    switch (weaponId) {
      case 'm416':
        duration = 0.19;
        startFreq = 190;
        endFreq = 52;
        filterFreq = 1850;
        filterQ = 0.9;
        break;
      case 'akm':
        duration = 0.26;
        startFreq = 145;
        endFreq = 38;
        filterFreq = 1250;
        filterQ = 0.75;
        break;
      case 'kar98k':
        duration = 0.45;
        startFreq = 220;
        endFreq = 32;
        filterFreq = 2200;
        filterQ = 0.65;
        break;
      case 'ump45':
        duration = 0.14;
        startFreq = 210;
        endFreq = 65;
        filterFreq = 2400;
        filterQ = 1.1;
        break;
      case 's12k':
        duration = 0.36;
        startFreq = 120;
        endFreq = 28;
        filterFreq = 950;
        filterQ = 0.55;
        break;
    }

    if (suppressed) {
      duration *= 0.55;
      filterFreq = 720;
      startFreq *= 1.35;
    }

    const distScale = Math.max(0.25, 1 - distanceMeters / 220);
    filter.frequency.setValueAtTime(filterFreq * distScale, now);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(150, 260 * distScale),
      now + duration
    );
    filter.Q.value = filterQ;

    noiseGain.gain.setValueAtTime((suppressed ? 0.3 : 0.56) * atten, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.type = suppressed ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.085);

    oscGain.gain.setValueAtTime((suppressed ? 0.24 : 0.42) * atten, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + duration + 0.02);
    osc.start(now);
    osc.stop(now + 0.1);

    if (weaponId === 'kar98k' && distanceMeters < 8) {
      this.playMetallicClick(now + 0.36, 1300, 0.08);
      this.playMetallicClick(now + 0.52, 1650, 0.08);
    }
  }

  public playHitmarker(kind: 'body' | 'head' | 'kill') {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = kind === 'head' || kind === 'kill' ? 'sine' : 'triangle';

    if (kind === 'kill') {
      osc.frequency.setValueAtTime(980, now);
      osc.frequency.exponentialRampToValueAtTime(1680, now + 0.11);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    } else if (kind === 'head') {
      osc.frequency.setValueAtTime(1500, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.06);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    } else {
      osc.frequency.setValueAtTime(760, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.04);
      gain.gain.setValueAtTime(0.17, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    }

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playExplosion(distanceMeters = 0) {
    if (this.muted || !this.ctx || !this.masterGain || !this.noiseBuffer) return;
    if (distanceMeters > 260) return;

    const now = this.ctx.currentTime;
    const atten = distanceMeters <= 5 ? 1 : Math.max(0.08, 1 / (1 + distanceMeters * 0.028));

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, now);
    filter.frequency.exponentialRampToValueAtTime(95, now + 1.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.95 * atten, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(88, now);
    sub.frequency.exponentialRampToValueAtTime(22, now + 0.55);
    subGain.gain.setValueAtTime(0.75 * atten, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    sub.connect(subGain);
    subGain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 1.2);
    sub.start(now);
    sub.stop(now + 0.65);
  }

  public playSmokeHiss() {
    if (this.muted || !this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 1.55);
  }

  public playParachuteOpen() {
    if (this.muted || !this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + 0.45);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.52);
  }

  public playEnginePulse(speedNorm: number) {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(46 + speedNorm * 68, now);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180 + speedNorm * 220;
    gain.gain.setValueAtTime(0.085, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playReload() {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.playMetallicClick(now, 920, 0.12);
    this.playMetallicClick(now + 0.45, 1180, 0.11);
    this.playMetallicClick(now + 0.95, 1480, 0.14);
  }

  public playFireModeClick() {
    if (this.muted || !this.ctx || !this.masterGain) return;
    this.playMetallicClick(this.ctx.currentTime, 1650, 0.1);
  }

  public playPickup() {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.09);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playFootstep(sprinting: boolean) {
    if (this.muted || !this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = sprinting ? 520 : 380;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(sprinting ? 0.08 : 0.048, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.09);
  }

  public playPlayerHit() {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.12);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playVictory() {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.12;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.52);
    });
  }

  private playMetallicClick(time: number, freq: number, vol: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.45, time + 0.045);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.055);
  }
}

export const tacticalAudio = new TacticalAudio();
