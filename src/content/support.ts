/**
 * Support call-ins (GDD §8.3): one equipped, a few charges a wave, bought in the Hero tab: the Rift Strike (Battle 8)
 * and the Sentry Gun (Battle 13). A newly bought one is equipped; the other's card offers to equip it again.
 */
export type SupportId = 'riftStrike' | 'sentryGun';

export interface SupportDef {
  unlockBattle: number;
  /** Buy, then each level (GDD: 2,500, then two levels). */
  prices: readonly number[];
  /** Charges a wave at each level (level 1 is the purchase). */
  charges: readonly number[];
}

export const SUPPORT: Record<SupportId, SupportDef> = {
  riftStrike: { unlockBattle: 8, prices: [2500, 1500, 2500], charges: [1, 2, 3] },
  sentryGun: { unlockBattle: 13, prices: [6000, 3000, 4500], charges: [1, 2, 3] },
};

export const SUPPORT_ORDER = Object.keys(SUPPORT) as SupportId[];

/**
 * The Rift Strike (GDD §8.3): Rosie drops shells through the rift into a circle at the aim point, snapped to the
 * densest enemy group nearby. A red circle warns first; then the shells fall one by one. Metres, seconds, damage
 * (before region scaling of enemy health, like every other hit). Only the Baron's men are hurt (they're Rosie's
 * shells).
 */
export const RIFT_STRIKE = {
  radius: 10,
  /** The aim point snaps to the densest group within this many metres of it. */
  snap: 6,
  /** The red circle shows this long before the first shell. */
  warn: 1,
  shells: 6,
  /** Seconds over which the shells land. */
  seconds: 2,
  /** Each shell: damage within its blast, and the blast's radius. It breaks shields, like a grenade. */
  damage: 130,
  blast: 3.5,
  /** A shell falls from this high, taking this long (a bright streak out of the rift). */
  drop: 22,
  fall: 0.28,
  /** Furthest from the hero a strike can be called. */
  range: 45,
} as const;

/**
 * The Sentry Gun (GDD §8.3): Rosie drops a turret through the rift beside the hero. It fights for `seconds`, turning
 * to the nearest of the Baron's men it can see within `range` and firing `rate` shots a second (each through `pierce`
 * soldiers, full damage on armour, before region scaling), then folds away. Metres and seconds.
 */
export const SENTRY = {
  seconds: 25,
  range: 32,
  rate: 5,
  damage: 24,
  pierce: 2,
  /** It lands this far to the hero's right and a little ahead, falling from this high over this long. */
  side: 1.8,
  ahead: 1,
  drop: 18,
  fall: 0.45,
  /** How fast its head turns (radians a second), and how long it looks for a target between shots. */
  turn: 9,
  retarget: 0.3,
  /** At most this many stand at once (more charges a wave than this wait for one to fold). */
  most: 3,
  /** It sinks into the ground over this long when its time is up. */
  fold: 0.6,
} as const;
