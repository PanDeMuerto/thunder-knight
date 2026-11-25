/**
 * The sound set and its mix (GDD §17, M8). Clips are cut from the owner's library by `npm run audio`
 * (`tools/audio/build_audio.py`, which levels each one), so these volumes are the real mix. Frequent sounds (coins,
 * hits, bolts, yelps) stay quiet and are capped per second; the owner's standing taste is that frequent sounds stay
 * quiet and short.
 */

export const SOUND_NAMES = [
  'pistol',
  'shotgun',
  'smg',
  'rifle',
  'hunting',
  'reload',
  'hit',
  'clink',
  'knock',
  'yelp0',
  'yelp1',
  'yelp2',
  'yelp3',
  'yelp4',
  'coin',
  'throw',
  'blast',
  'click',
  'buy',
  'rift',
  'crate',
  'horn',
  'drums',
  'rout',
  'waveClear',
  'alarm',
  'menace',
  'fanfare',
  'defeat',
  'bolt',
  'block',
  'crack',
  'splinter',
  'windup',
  'bossDown',
  'hurt',
  'hooves',
  'scream',
  'sizzle',
  'burst',
] as const;
export type SoundName = (typeof SOUND_NAMES)[number];

/** Looping beds: the field's ambience and the music (GDD §17: folk-orchestral in breaks, drums and brass in waves). */
export const MUSIC_NAMES = ['musicBreak', 'musicWave', 'musicBoss'] as const;
export type MusicName = (typeof MUSIC_NAMES)[number];
export const AMBIENCE = 'ambField';

/** Each sound's volume (0 to 1) and, for frequent ones, how many may start in a second. */
export const MIX: Record<SoundName, { volume: number; perSecond?: number }> = {
  pistol: { volume: 0.5 },
  shotgun: { volume: 0.55 },
  smg: { volume: 0.4 },
  rifle: { volume: 0.45 },
  hunting: { volume: 0.6 },
  reload: { volume: 0.6 },
  hit: { volume: 0.35, perSecond: 12 },
  clink: { volume: 0.35, perSecond: 10 },
  knock: { volume: 0.45, perSecond: 8 },
  yelp0: { volume: 0.4 },
  yelp1: { volume: 0.4 },
  yelp2: { volume: 0.4 },
  yelp3: { volume: 0.4 },
  yelp4: { volume: 0.4 },
  coin: { volume: 0.32, perSecond: 14 },
  throw: { volume: 0.5 },
  blast: { volume: 0.7 },
  click: { volume: 0.45, perSecond: 8 },
  buy: { volume: 0.55 },
  rift: { volume: 0.4 },
  crate: { volume: 0.55 },
  horn: { volume: 0.55 },
  drums: { volume: 0.5 },
  rout: { volume: 0.5, perSecond: 1 },
  waveClear: { volume: 0.55 },
  alarm: { volume: 0.45, perSecond: 0.3 },
  menace: { volume: 0.6 },
  fanfare: { volume: 0.65 },
  defeat: { volume: 0.6 },
  bolt: { volume: 0.3, perSecond: 4 },
  block: { volume: 0.45, perSecond: 8 },
  crack: { volume: 0.55 },
  splinter: { volume: 0.6 },
  windup: { volume: 0.6 },
  bossDown: { volume: 0.75 },
  hurt: { volume: 0.5, perSecond: 4 },
  // Region 2 (M9): a rider's gallop as he charges, a firebrand's "aaah!" and sizzle as he sprints, his pot bursting.
  hooves: { volume: 0.45, perSecond: 3 },
  scream: { volume: 0.4, perSecond: 2 },
  sizzle: { volume: 0.3, perSecond: 3 },
  burst: { volume: 0.6, perSecond: 5 },
};

/** Knocked-out soldiers' yelps: one of these, pitched a little, at most `perSecond` (GDD §17: 4 a second). */
export const YELPS = { names: ['yelp0', 'yelp1', 'yelp2', 'yelp3', 'yelp4'] as const, perSecond: 4, rate: { low: 0.95, high: 1.35 } };

/**
 * The mix's buses. Music and ambience fade between tracks over `fade` seconds; a gunshot ducks the ambience by `duck`
 * for `duckSeconds` (GDD §17: 80 ms).
 */
export const BUSES = { master: 0.9, sfx: 0.8, music: 0.42, ambience: 0.5, fade: 1.2, duck: 0.45, duckSeconds: 0.08 };

/**
 * Sounds out in the field fade with distance from the hero: full within `near` metres, down to `floor` at `far`.
 */
export const DISTANCE = { near: 8, far: 60, floor: 0.12 };

/** Gold ticks climb in pitch within a combo: each pickup within `window` s of the last is a step up, to `steps`. */
export const COIN_COMBO = { window: 0.7, step: 0.045, steps: 12 };
