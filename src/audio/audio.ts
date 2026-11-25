import { AMBIENCE, BUSES, MIX, MUSIC_NAMES, SOUND_NAMES, YELPS, type MusicName, type SoundName } from '@/content/audio';

export type { MusicName, SoundName } from '@/content/audio';

/**
 * Sound (GDD §17, M8). Clips are cut from the owner's library (`npm run audio`) and load after the first input, so
 * they never slow the first frame; a clip that fails to load only means silence for that sound. Three buses under the
 * master: effects, music and ambience. Everything is muted during ads and pause, and when the player turns sound off.
 */

export interface PlayOptions {
  /** Scales the sound's mix volume (`MIX`), e.g. by distance. */
  gain?: number;
  rate?: number;
}

/** A looping bed (music or ambience) and its own fade gain. */
interface Bed {
  name: string;
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private ambience: GainNode | null = null;
  private volume = 1;
  private musicVolume = 1;
  private readonly buffers = new Map<string, AudioBuffer>();
  private soundOn = true;
  private silenced = 0;
  private loading: Promise<void> | null = null;
  /** When each capped sound last started (`MIX[name].perSecond`), as context times. */
  private readonly starts = new Map<string, number[]>();
  private musicBed: Bed | null = null;
  private ambienceBed: Bed | null = null;
  /** What should be playing, so a track asked for before it loaded starts when it arrives. */
  private wantMusic: MusicName | null = null;
  private wantAmbience = false;

  /** Starts audio on the player's first input, as browsers require, and loads the clips. */
  unlock(): void {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain();
      this.sfx.connect(this.master);
      this.music = this.ctx.createGain();
      this.music.connect(this.master);
      this.ambience = this.ctx.createGain();
      this.ambience.connect(this.master);
      this.applyMix();
    }
    void this.ctx.resume().catch(() => {});
    this.loading ??= this.loadAll();
  }

  private async loadAll(): Promise<void> {
    const ctx = this.ctx!;
    const load = async (name: string): Promise<void> => {
      try {
        const response = await fetch(`assets/audio/${name}.mp3`);
        if (!response.ok) return;
        this.buffers.set(name, await ctx.decodeAudioData(await response.arrayBuffer()));
      } catch {
        // A missing clip only means silence for that sound.
      }
    };
    // Effects first (they're small and the battle needs them), then the beds.
    await Promise.all(SOUND_NAMES.map(load));
    await Promise.all([AMBIENCE, ...MUSIC_NAMES].map(load));
    this.setMusic(this.wantMusic);
    this.setAmbience(this.wantAmbience);
  }

  setSoundOn(on: boolean): void {
    this.soundOn = on;
    this.applyMix();
  }

  /** Effects volume, 0 to 1. */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.applyMix();
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.applyMix();
  }

  /** Ads and pause silence everything; calls nest, so an ad during a pause stays silent. */
  silence(on: boolean): void {
    this.silenced = Math.max(0, this.silenced + (on ? 1 : -1));
    this.applyMix();
  }

  play(name: SoundName, options: PlayOptions = {}): void {
    const ctx = this.ctx;
    const buffer = this.buffers.get(name);
    if (!ctx || !buffer || !this.sfx || this.silenced > 0) return;
    const mix = MIX[name];
    if (mix.perSecond && !this.allow(name, mix.perSecond)) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = options.rate ?? 1;
    const gain = ctx.createGain();
    gain.gain.value = mix.volume * (options.gain ?? 1);
    source.connect(gain).connect(this.sfx);
    source.start();
  }

  /** A knocked-out soldier's yelp: one of a few voices, pitched, at most a few a second (GDD §17). */
  yelp(gain = 1): void {
    if (!this.ctx || this.silenced > 0 || !this.allow('yelp', YELPS.perSecond)) return;
    const name = YELPS.names[Math.floor(Math.random() * YELPS.names.length)]!;
    const { low, high } = YELPS.rate;
    this.play(name, { gain, rate: low + Math.random() * (high - low) });
  }

  /** A gunshot ducks the ambience for a moment (GDD §17). */
  duck(): void {
    if (!this.ctx || !this.ambience) return;
    const now = this.ctx.currentTime;
    const level = BUSES.ambience * this.volume;
    this.ambience.gain.cancelScheduledValues(now);
    this.ambience.gain.setTargetAtTime(level * BUSES.duck, now, 0.01);
    this.ambience.gain.setTargetAtTime(level, now + BUSES.duckSeconds, 0.06);
  }

  /** The music to play (null: none), faded across. Asked for before it has loaded, it starts when it arrives. */
  setMusic(name: MusicName | null): void {
    this.wantMusic = name;
    if (!this.ctx || !this.music) return;
    if (this.musicBed?.name === name) return;
    this.fadeOut(this.musicBed);
    this.musicBed = name ? this.startBed(name, this.music) : null;
  }

  /** The field's ambience on or off. */
  setAmbience(on: boolean): void {
    this.wantAmbience = on;
    if (!this.ctx || !this.ambience) return;
    if (!!this.ambienceBed === on) return;
    this.fadeOut(this.ambienceBed);
    this.ambienceBed = on ? this.startBed(AMBIENCE, this.ambience) : null;
  }

  private startBed(name: string, bus: GainNode): Bed | null {
    const ctx = this.ctx!;
    const buffer = this.buffers.get(name);
    if (!buffer) return null;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(1, ctx.currentTime, BUSES.fade / 3);
    source.connect(gain).connect(bus);
    source.start();
    return { name, source, gain };
  }

  private fadeOut(bed: Bed | null): void {
    if (!bed || !this.ctx) return;
    const now = this.ctx.currentTime;
    bed.gain.gain.cancelScheduledValues(now);
    bed.gain.gain.setTargetAtTime(0, now, BUSES.fade / 4);
    bed.source.stop(now + BUSES.fade * 1.5);
  }

  /** At most `perSecond` starts of `key` a second (below 1: one start per 1 / `perSecond` seconds). */
  private allow(key: string, perSecond: number): boolean {
    const now = this.ctx!.currentTime;
    const window = Math.max(1, 1 / perSecond);
    const limit = Math.max(1, Math.floor(perSecond * window));
    const list = this.starts.get(key) ?? [];
    while (list.length && now - list[0]! > window) list.shift();
    if (list.length >= limit) return false;
    list.push(now);
    this.starts.set(key, list);
    return true;
  }

  private applyMix(): void {
    if (!this.master || !this.sfx || !this.music || !this.ambience || !this.ctx) return;
    const on = this.soundOn && this.silenced === 0;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(on ? BUSES.master : 0, now, 0.03);
    this.sfx.gain.setTargetAtTime(BUSES.sfx * this.volume, now, 0.03);
    this.music.gain.setTargetAtTime(BUSES.music * this.musicVolume, now, 0.03);
    // Ambience rides with the effects volume.
    this.ambience.gain.setTargetAtTime(BUSES.ambience * this.volume, now, 0.03);
  }
}
