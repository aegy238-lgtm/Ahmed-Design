/**
 * High-Fidelity Web Audio Engine for Alex Life Simulator.
 * Features:
 * 1. Complete Separation of Car Engine Sound vs Radio Music Sound (Engine Mute, Radio Mute, Independent Volumes).
 * 2. Realistic Engine Simulation (Combustion pulses, RPM pitch, throttle roar, turbo spool).
 * 3. Egyptian Radio Tuner with 5 authentic stations & rhythms:
 *    - Station 1: مهرجانات التوك توك الشعبية 🔥 (إيقاع 808 وطبلة مقسوم حماسية)
 *    - Station 2: إذاعة شط إسكندرية 🌊 (شط إسكندرية يا شط الهوى)
 *    - Station 3: كاسيت التاكسي السكندري 📼 (طرب زمان عبد الحليم وأم كلثوم)
 *    - Station 4: نجوم إف إم الكورنيش ✨ (أغاني مصرية شبابية)
 *    - Station 5: تواشيح الفجر وابتهالات البحر 🌙
 * 4. Egyptian Taxi Double-Horn ("طاط-طاط" / "بيب بيب") and Tuk-Tuk squeak horn.
 * 5. Realistic tire screech, crash impacts, taxi meter tick, and seaside wave ambience.
 */

export interface RadioStation {
  id: string;
  nameAr: string;
  genreAr: string;
  currentTrackAr: string;
  color: string;
}

export const RADIO_STATIONS: RadioStation[] = [
  {
    id: 'shaabi_mahraganat',
    nameAr: 'مهرجانات التوك توك الشعبية 🔥',
    genreAr: 'مهرجانات وإيقاع مقسوم 808',
    currentTrackAr: 'مهرجان إسكندرية ماريا وشوارع بحري 🥁',
    color: '#ea580c',
  },
  {
    id: 'shatt_alex',
    nameAr: 'إذاعة شط إسكندرية 🌊',
    genreAr: 'طرب ساحلي هادئ',
    currentTrackAr: 'شط إسكندرية يا شط الهوى - فيروز 🎶',
    color: '#0284c7',
  },
  {
    id: 'tarab_cassette',
    nameAr: 'كاسيت التاكسي السكندري 📼',
    genreAr: 'طرب الزمن الجميل',
    currentTrackAr: 'سواح وماشي في البلاد - عبد الحليم 🎙️',
    color: '#8b5cf6',
  },
  {
    id: 'noujoum_fm',
    nameAr: 'نجوم إف إم الكورنيش ✨',
    genreAr: 'أغاني مصرية شبابية',
    currentTrackAr: 'يا مسهرني في ليالي ستانلي 🎵',
    color: '#10b981',
  },
  {
    id: 'fajr_chants',
    nameAr: 'تواشيح الفجر وابتهالات البحر 🌙',
    genreAr: 'ابتهالات هادئة',
    currentTrackAr: 'مولاي إني ببابك قد كتبت دعائي 🕊️',
    color: '#f59e0b',
  },
];

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private ambientGain: GainNode | null = null;

  public isMuted: boolean = false;
  public isEngineMuted: boolean = false;
  public isRadioMuted: boolean = false;

  private soundVolume: number = 0.85;
  private engineVolume: number = 0.65;
  private radioVolume: number = 0.85;
  private isEngineRunning: boolean = false;

  // Radio state
  public isRadioOn: boolean = false;
  public currentStationIndex: number = 0;
  private radioInterval: any = null;
  private radioGain: GainNode | null = null;
  private radioStep: number = 0;

  constructor() {}

  private initContext() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.soundVolume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.radioGain = this.ctx.createGain();
        this.radioGain.gain.setValueAtTime(this.radioVolume, this.ctx.currentTime);
        this.radioGain.connect(this.masterGain);

        this.startSeaAmbience();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolumes(master: number, engine: number, radio: number) {
    this.soundVolume = master;
    this.engineVolume = engine;
    this.radioVolume = radio;

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : master, this.ctx.currentTime);
    }
    if (this.engineGain && this.ctx) {
      const effEngVol = (this.isMuted || this.isEngineMuted) ? 0 : engine * 0.45;
      this.engineGain.gain.setValueAtTime(effEngVol, this.ctx.currentTime);
    }
    if (this.radioGain && this.ctx) {
      const effRadioVol = (this.isMuted || this.isRadioMuted) ? 0 : radio;
      this.radioGain.gain.setValueAtTime(effRadioVol, this.ctx.currentTime);
    }
  }

  public toggleEngineMute(): boolean {
    this.isEngineMuted = !this.isEngineMuted;
    this.setVolumes(this.soundVolume, this.engineVolume, this.radioVolume);
    return this.isEngineMuted;
  }

  public toggleRadioMute(): boolean {
    this.isRadioMuted = !this.isRadioMuted;
    this.setVolumes(this.soundVolume, this.engineVolume, this.radioVolume);
    return this.isRadioMuted;
  }

  public setEngineVolume(vol: number) {
    this.engineVolume = vol;
    this.setVolumes(this.soundVolume, this.engineVolume, this.radioVolume);
  }

  public setRadioVolume(vol: number) {
    this.radioVolume = vol;
    this.setVolumes(this.soundVolume, this.engineVolume, this.radioVolume);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.setVolumes(this.soundVolume, this.engineVolume, this.radioVolume);
    return this.isMuted;
  }

  // Realistic Engine Sound
  public startEngine(type: 'taxi' | 'tuktuk' | 'scooter' | 'sedan' = 'taxi') {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isEngineRunning) return;

    try {
      this.engineGain = this.ctx.createGain();
      const effEngVol = (this.isMuted || this.isEngineMuted) ? 0 : this.engineVolume * 0.45;
      this.engineGain.gain.setValueAtTime(effEngVol, this.ctx.currentTime);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(type === 'tuktuk' ? 480 : 320, this.ctx.currentTime);
      this.engineFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc2 = this.ctx.createOscillator();

      if (type === 'tuktuk') {
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc2.type = 'square';
        this.engineOsc1.frequency.setValueAtTime(68, this.ctx.currentTime);
        this.engineOsc2.frequency.setValueAtTime(136, this.ctx.currentTime);
      } else if (type === 'scooter') {
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc2.type = 'triangle';
        this.engineOsc1.frequency.setValueAtTime(60, this.ctx.currentTime);
        this.engineOsc2.frequency.setValueAtTime(120, this.ctx.currentTime);
      } else {
        // Taxi / Sedan 4-cylinder engine
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc2.type = 'triangle';
        this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);
        this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);
      }

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOsc1.start();
      this.engineOsc2.start();
      this.isEngineRunning = true;
    } catch {
      // autoplay fallback
    }
  }

  public updateEngine(speedKmh: number, throttle: boolean, type: string = 'taxi') {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter) return;

    const baseFreq = type === 'tuktuk' ? 68 : type === 'scooter' ? 60 : 45;
    const speedRatio = Math.min(Math.abs(speedKmh) / 110, 1.3);
    const throttleMultiplier = throttle ? 1.4 : 1.0;

    const targetFreq1 = baseFreq * (1 + speedRatio * 3.0) * throttleMultiplier;
    const targetFreq2 = targetFreq1 * (type === 'tuktuk' ? 2.0 : 1.5);
    const filterFreq = (type === 'tuktuk' ? 450 : 320) + speedRatio * 950 + (throttle ? 400 : 0);

    const now = this.ctx.currentTime;
    this.engineOsc1.frequency.setTargetAtTime(targetFreq1, now, 0.07);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq2, now, 0.07);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.07);
  }

  public stopEngine() {
    try {
      if (this.engineOsc1) { this.engineOsc1.stop(); this.engineOsc1.disconnect(); this.engineOsc1 = null; }
      if (this.engineOsc2) { this.engineOsc2.stop(); this.engineOsc2.disconnect(); this.engineOsc2 = null; }
      if (this.engineFilter) { this.engineFilter.disconnect(); this.engineFilter = null; }
      if (this.engineGain) { this.engineGain.disconnect(); this.engineGain = null; }
      this.isEngineRunning = false;
    } catch {
      // ignore
    }
  }

  public playHorn(type: 'taxi' | 'tuktuk' = 'taxi') {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const f1 = type === 'tuktuk' ? 620 : 440;
    const f2 = type === 'tuktuk' ? 780 : 554;

    const playBeep = (startTime: number, duration: number) => {
      if (!this.ctx || !this.masterGain) return;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(f1, startTime);
      osc2.frequency.setValueAtTime(f2, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02);
      gain.gain.setValueAtTime(0.35, startTime + duration - 0.02);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration);
      osc2.stop(startTime + duration);
    };

    playBeep(now, 0.12);
    playBeep(now + 0.17, 0.16);
  }

  public playMeterTick() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playTireSkid() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.22;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, now);
    filter.Q.setValueAtTime(3.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.0, now + 0.22);

    noise.connect(filter);
    filter.connect(this.masterGain);

    noise.start(now);
  }

  public playPassengerBoard() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const notes = [587.33, 659.25, 880.0];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);

      gain.gain.setValueAtTime(0.25, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.3);
    });
  }

  public playCrash(impactIntensity: number = 0.5) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.07));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300 + impactIntensity * 450, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.min(0.85, impactIntensity * 0.75), now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    noise.connect(filter);
    filter.connect(this.masterGain);

    noise.start(now);
  }

  public playCashEarned() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const notes = [1046.5, 1318.5, 1567.98, 2093.0];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.22, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.35);
    });
  }

  private startSeaAmbience() {
    if (!this.ctx || !this.masterGain) return;
    try {
      const bufferSize = this.ctx.sampleRate * 2.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2) * 0.12;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, this.ctx.currentTime);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);

      noise.start();
    } catch {
      // ignore
    }
  }

  public toggleRadio(): boolean {
    this.initContext();
    if (!this.ctx || !this.radioGain) return false;

    if (this.isRadioOn) {
      this.stopRadio();
      return false;
    } else {
      this.startRadio();
      return true;
    }
  }

  public nextStation(): RadioStation {
    this.currentStationIndex = (this.currentStationIndex + 1) % RADIO_STATIONS.length;
    if (this.isRadioOn) {
      this.stopRadio();
      this.startRadio();
    }
    return RADIO_STATIONS[this.currentStationIndex];
  }

  public prevStation(): RadioStation {
    this.currentStationIndex = (this.currentStationIndex - 1 + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    if (this.isRadioOn) {
      this.stopRadio();
      this.startRadio();
    }
    return RADIO_STATIONS[this.currentStationIndex];
  }

  public startRadio() {
    this.initContext();
    if (!this.ctx || !this.radioGain) return;

    this.isRadioOn = true;
    this.radioStep = 0;
    const station = RADIO_STATIONS[this.currentStationIndex];

    this.playTuningStatic();

    const mahraganatMelody = [
      440.00, 440.00, 493.88, 523.25, 587.33, 523.25, 493.88, 440.00,
      392.00, 440.00, 493.88, 440.00, 392.00, 349.23, 329.63, 329.63,
      659.25, 659.25, 587.33, 523.25, 493.88, 523.25, 587.33, 493.88,
      440.00, 493.88, 392.00, 349.23, 329.63, 349.23, 329.63, 329.63,
    ];

    const shattMelody = [
      293.66, 329.63, 349.23, 392.00, 440.00, 392.00, 349.23, 329.63,
      293.66, 349.23, 440.00, 523.25, 493.88, 440.00, 392.00, 349.23,
      392.00, 440.00, 493.88, 523.25, 587.33, 523.25, 493.88, 440.00,
      392.00, 349.23, 329.63, 293.66, 261.63, 293.66, 293.66, 293.66,
    ];

    const tarabMelody = [
      220.00, 246.94, 261.63, 293.66, 329.63, 293.66, 261.63, 246.94,
      220.00, 293.66, 329.63, 392.00, 369.99, 329.63, 293.66, 261.63,
      329.63, 392.00, 440.00, 493.88, 440.00, 392.00, 329.63, 293.66,
      261.63, 246.94, 220.00, 196.00, 220.00, 220.00, 220.00, 220.00,
    ];

    const popMelody = [
      329.63, 392.00, 440.00, 493.88, 523.25, 493.88, 440.00, 392.00,
      329.63, 440.00, 493.88, 587.33, 523.25, 493.88, 440.00, 329.63,
      392.00, 440.00, 523.25, 587.33, 659.25, 587.33, 523.25, 440.00,
      493.88, 440.00, 392.00, 329.63, 293.66, 329.63, 329.63, 329.63,
    ];

    const fajrMelody = [
      196.00, 220.00, 246.94, 261.63, 293.66, 261.63, 246.94, 220.00,
      196.00, 246.94, 293.66, 329.63, 293.66, 246.94, 220.00, 196.00,
    ];

    const melodies = [mahraganatMelody, shattMelody, tarabMelody, popMelody, fajrMelody];
    const currentMelody = melodies[this.currentStationIndex % melodies.length];
    const tempoMs = station.id === 'shaabi_mahraganat' ? 180 : station.id === 'shatt_alex' ? 310 : 260;

    this.radioInterval = setInterval(() => {
      if (!this.ctx || !this.radioGain || !this.isRadioOn) return;

      const note = currentMelody[this.radioStep % currentMelody.length];
      const now = this.ctx.currentTime;

      const leadOsc = this.ctx.createOscillator();
      const leadGain = this.ctx.createGain();

      if (station.id === 'shaabi_mahraganat') {
        leadOsc.type = 'sawtooth';
      } else if (station.id === 'shatt_alex') {
        leadOsc.type = 'triangle';
      } else if (station.id === 'fajr_chants') {
        leadOsc.type = 'sine';
      } else {
        leadOsc.type = 'square';
      }

      leadOsc.frequency.setValueAtTime(note, now);

      const effVol = (this.isMuted || this.isRadioMuted) ? 0 : 0.22;
      leadGain.gain.setValueAtTime(effVol, now);
      leadGain.gain.exponentialRampToValueAtTime(0.002, now + (tempoMs / 1000) * 0.95);

      leadOsc.connect(leadGain);
      leadGain.connect(this.radioGain);

      leadOsc.start(now);
      leadOsc.stop(now + (tempoMs / 1000) * 0.95);

      const isDum = this.radioStep % 4 === 0;
      const isTak = this.radioStep % 4 === 2 || this.radioStep % 8 === 7;

      if (isDum && !this.isRadioMuted && !this.isMuted) {
        const dumOsc = this.ctx.createOscillator();
        const dumGain = this.ctx.createGain();
        dumOsc.frequency.setValueAtTime(station.id === 'shaabi_mahraganat' ? 140 : 110, now);
        dumOsc.frequency.exponentialRampToValueAtTime(40, now + 0.14);
        dumGain.gain.setValueAtTime(0.28, now);
        dumGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        dumOsc.connect(dumGain);
        dumGain.connect(this.radioGain);
        dumOsc.start(now);
        dumOsc.stop(now + 0.17);
      } else if (isTak && !this.isRadioMuted && !this.isMuted) {
        const takOsc = this.ctx.createOscillator();
        const takGain = this.ctx.createGain();
        takOsc.type = 'triangle';
        takOsc.frequency.setValueAtTime(800, now);
        takOsc.frequency.exponentialRampToValueAtTime(320, now + 0.06);
        takGain.gain.setValueAtTime(0.18, now);
        takGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        takOsc.connect(takGain);
        takGain.connect(this.radioGain);
        takOsc.start(now);
        takOsc.stop(now + 0.08);
      }

      this.radioStep++;
    }, tempoMs);
  }

  private playTuningStatic() {
    if (!this.ctx || !this.radioGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.22;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.connect(this.radioGain);
    noise.start(now);
  }

  public stopRadio() {
    if (this.radioInterval) {
      clearInterval(this.radioInterval);
      this.radioInterval = null;
    }
    this.isRadioOn = false;
  }
}

export const soundManager = new SoundManager();
