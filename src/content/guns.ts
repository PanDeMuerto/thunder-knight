/**
 * The guns (GDD §8.1). Numbers are the GDD's; `feel` is how each shot looks and moves the view (`WeaponFeel` in the
 * GDD). Only the pistol's feel is tuned so far (M1); the others are first guesses until their battles arrive.
 */

export type GunId =
  | 'pistol'
  | 'shotgun'
  | 'smg'
  | 'assaultRifle'
  | 'huntingRifle'
  | 'machineGun'
  | 'grenadeLauncher'
  | 'minigun'
  | 'rocketLauncher';

export interface GunFeel {
  /** The view jumps up this many degrees per shot and springs back (aim is never moved). */
  kick: number;
  /** Sideways jitter of the kick, in degrees. */
  jitter: number;
  /** The field of view widens by this many degrees for a moment. */
  punch: number;
  /** Muzzle flash size in metres. */
  flash: number;
  /** A tracer every Nth round (1 = every shot). */
  tracerEvery: number;
  /** Spent casings fly out. */
  shells: boolean;
  /** The shot's sound (`npm run audio`) and its pitch; later guns borrow the three until M9's sounds. */
  sound: 'pistol' | 'shotgun' | 'smg' | 'rifle' | 'hunting';
  pitch: number;
}

export interface GunDef {
  id: GunId;
  /** The battle that unlocks it in the shop (GDD §8.1). */
  unlockBattle: number;
  /** Shop price in gold (0 = owned from the start). */
  price: number;
  /** Base for level prices (GDD §8.1: ★2–★5 cost 0.5/0.9/1.5/2.5 × value). */
  value: number;
  damage: number;
  /** Rays per shot (the shotgun's 8 pellets). */
  pellets: number;
  /** Shots per second while the trigger is held. */
  rate: number;
  magazine: number;
  /** Seconds. */
  reload: number;
  /** How many soldiers one bullet can hit (each hit spends one). */
  pierce: number;
  /** Metres. Aim assist and auto-fire stop here too. */
  range: number;
  /** Random spread in degrees (each pellet, or each bullet). */
  spread: number;
  /** Light guns do half damage to armoured enemies (GDD §8.1). */
  light: boolean;
  /** Splash radius in metres for explosive rounds (0 = a bullet). */
  splash: number;
  /** Metres each hit shoves a soldier back (the shotgun's knockback; bosses don't budge). */
  push: number;
  /** Seconds the trigger must be held before it fires (the minigun's barrels spinning up); it spins down slower. */
  spinUp?: number;
  /** The hero walks at this share of his speed while it fires (the minigun's weight). */
  firingWalk?: number;
  /** Its rounds fly straight and fast with a smoke trail (the rocket launcher) instead of a short lob. */
  rocket?: boolean;
  /** Damage times this on siege engines and bosses (the rocket launcher: ×2, GDD §8.1). */
  siegeBonus?: number;
  feel: GunFeel;
}

const BULLET = { pellets: 1, spread: 0, light: false, splash: 0, push: 0 };

export const GUNS: Record<GunId, GunDef> = {
  pistol: {
    ...BULLET,
    id: 'pistol',
    unlockBattle: 1,
    price: 0,
    value: 200,
    damage: 20,
    rate: 4,
    magazine: 12,
    reload: 1.0,
    pierce: 1,
    range: 40,
    spread: 0.6,
    light: true,
    feel: { kick: 0.55, jitter: 0.15, punch: 0.6, flash: 0.13, tracerEvery: 1, shells: true, sound: 'pistol', pitch: 1 },
  },
  shotgun: {
    ...BULLET,
    id: 'shotgun',
    unlockBattle: 4,
    price: 600,
    // Its levels are priced from 350 (★2 175, ★3 315), not its price: Region 1's last breaks always offer a shotgun
    // level after the big purchase (`npm run balance`).
    value: 350,
    damage: 9,
    pellets: 8,
    rate: 1.2,
    magazine: 6,
    reload: 1.6,
    pierce: 1,
    range: 14,
    spread: 5,
    // A full load shoves a soldier about a metre back (GDD §8.1: knocks them back).
    push: 0.15,
    feel: { kick: 1.6, jitter: 0.4, punch: 1.6, flash: 0.36, tracerEvery: 1, shells: true, sound: 'shotgun', pitch: 1 },
  },
  smg: {
    ...BULLET,
    id: 'smg',
    unlockBattle: 6,
    price: 1200,
    value: 1200,
    damage: 12,
    rate: 12,
    magazine: 40,
    reload: 1.4,
    pierce: 1,
    range: 25,
    spread: 1.6,
    light: true,
    feel: { kick: 0.3, jitter: 0.2, punch: 0.25, flash: 0.2, tracerEvery: 3, shells: true, sound: 'smg', pitch: 1 },
  },
  assaultRifle: {
    ...BULLET,
    id: 'assaultRifle',
    unlockBattle: 8,
    price: 2200,
    value: 2200,
    damage: 26,
    rate: 8,
    magazine: 30,
    reload: 1.5,
    pierce: 2,
    range: 45,
    spread: 0.9,
    feel: { kick: 0.45, jitter: 0.2, punch: 0.4, flash: 0.26, tracerEvery: 2, shells: true, sound: 'rifle', pitch: 1 },
  },
  huntingRifle: {
    ...BULLET,
    id: 'huntingRifle',
    unlockBattle: 10,
    price: 3500,
    value: 3500,
    damage: 120,
    rate: 1.1,
    magazine: 5,
    reload: 1.8,
    pierce: 6,
    range: 70,
    feel: { kick: 1.8, jitter: 0.3, punch: 1.4, flash: 0.32, tracerEvery: 1, shells: true, sound: 'hunting', pitch: 1 },
  },
  machineGun: {
    ...BULLET,
    id: 'machineGun',
    unlockBattle: 12,
    price: 5500,
    value: 5500,
    damage: 24,
    rate: 11,
    magazine: 100,
    reload: 3.0,
    pierce: 2,
    range: 45,
    spread: 1.4,
    feel: { kick: 0.5, jitter: 0.3, punch: 0.4, flash: 0.3, tracerEvery: 2, shells: true, sound: 'rifle', pitch: 0.85 },
  },
  grenadeLauncher: {
    ...BULLET,
    id: 'grenadeLauncher',
    unlockBattle: 14,
    price: 8000,
    value: 8000,
    damage: 90,
    rate: 1.5,
    magazine: 6,
    reload: 2.2,
    pierce: 1,
    range: 40,
    splash: 4,
    // A deep thump: the short shotgun's sound pitched well down.
    feel: { kick: 1.2, jitter: 0.2, punch: 1, flash: 0.3, tracerEvery: 0, shells: false, sound: 'shotgun', pitch: 0.62 },
  },
  minigun: {
    ...BULLET,
    id: 'minigun',
    unlockBattle: 16,
    price: 12000,
    value: 12000,
    damage: 18,
    rate: 25,
    magazine: 200,
    reload: 3.5,
    pierce: 2,
    range: 40,
    spread: 2,
    spinUp: 0.6,
    firingWalk: 0.8,
    // Every other round sounds (25 a second would drown the battle), a little lower than the SMG.
    feel: { kick: 0.2, jitter: 0.25, punch: 0.15, flash: 0.3, tracerEvery: 3, shells: true, sound: 'smg', pitch: 0.92 },
  },
  rocketLauncher: {
    ...BULLET,
    id: 'rocketLauncher',
    unlockBattle: 18,
    price: 16000,
    value: 16000,
    damage: 300,
    rate: 0.7,
    magazine: 3,
    reload: 2.5,
    pierce: 1,
    range: 60,
    splash: 6,
    rocket: true,
    siegeBonus: 2,
    feel: { kick: 2.2, jitter: 0.3, punch: 2, flash: 0.4, tracerEvery: 0, shells: false, sound: 'shotgun', pitch: 0.5 },
  },
};

/** Gun levels ★1–★5 (GDD §8.1). */
export const GUN_LEVELS = {
  max: 5,
  damagePerLevel: 0.2,
  magazinePerLevel: 0.15,
  reloadPerLevel: -0.05,
  /** Price of ★2, ★3, ★4, ★5 as a share of the gun's value. */
  priceShares: [0.5, 0.9, 1.5, 2.5],
} as const;
