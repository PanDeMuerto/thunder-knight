/**
 * The economy and the battle rules' numbers (GDD §4.5–4.8, §7, §10, §11, §13.3). Prices for hero upgrades aren't in
 * the GDD's tables; they're set here and checked by `npm run balance` (GDD §11.2).
 */

export const ECONOMY = {
  startingGold: 50,
  /** Wave bonus: base + per wave number, × the region's gold multiplier (GDD §11.1). */
  waveBonus: { base: 20, perWave: 10 },
  /** First-clear bonus: base + per battle number (once per battle). */
  firstClear: { base: 100, perBattle: 50 },
  /**
   * Region 1–4 multipliers (GDD §9.1). Region 3's health was ×2.5 (+56% on Region 2 with no new gun until the end of
   * Battle 12): the bot's Region 3 battles came out a coin toss. ×2.2 matches its gold. Region 4's ×3.6 would be the
   * same 64% step; ×3 matches its gold too.
   */
  regionGold: [1, 1.5, 2.2, 3],
  regionHp: [1, 1.6, 2.2, 3],
} as const;

/** The banner and its capture ring (GDD §4.5). Health is in percent of the banner's maximum. */
export const BANNER = {
  ringRadius: 6,
  /**
   * Percent a second per enemy inside the ring: light (peasants, archers), heavy (footmen, captains), rams, bosses.
   * Bosses drain like two footmen (a ram's 4 %/s let Sir Grudge take the banner before a casual player could answer,
   * M6 bot runs). Half the
   * GDD's first guess: at 3 %/s a block of twelve emptied the banner in three seconds, too fast to answer (M3 bot runs).
   */
  drain: { light: 0.75, heavy: 1.5, ram: 4, boss: 2 },
  healPerBreak: 20,
  /** Battle 1 can't be lost (GDD §4.5, onboarding §4). */
  floorBattle1: 30,
  /** Each Banner level adds this share of health (GDD §10). */
  hpPerLevel: 0.2,
} as const;

/** Crowns for a win by the banner's health at the end (GDD §13.3). Battle 1 always gives 3. */
export const CROWNS = { two: 50, three: 80 } as const;

/** After this many defeats in a row on a battle, allies get quietly stronger until the next win (GDD §4.8). */
export const COMEBACK = { defeats: 2, allyBoost: 0.15 } as const;

/** The hero's body (GDD §4.6, §7). */
export const HERO_BODY = {
  health: 100,
  regenPerSecond: 15,
  regenDelay: 3,
  /** After each hit, so a mob can't shred the hero in a moment. */
  invulnerable: 0.3,
  knockedSeconds: 5,
  getUpInvulnerable: 2,
  /** Grenades arrive in Battle 2 (GDD §8.2): this many a wave, plus the Hero tab's levels. */
  grenadesFrom: 2,
  grenades: 2,
  /** Coins fly to the hero from this far, plus the magnet upgrade. */
  magnet: 5,
} as const;

export type HeroStat = 'health' | 'speed' | 'grenades' | 'magnet';

/** The Hero tab (GDD §7). `per` is what each level adds. */
export const HERO_UPGRADES: Record<HeroStat, { per: number; prices: readonly number[]; unlockBattle: number }> = {
  health: { per: 20, prices: [150, 280, 450, 700, 1000], unlockBattle: 3 },
  speed: { per: 0.4, prices: [200, 380, 650, 1000], unlockBattle: 3 },
  grenades: { per: 1, prices: [250, 500, 900], unlockBattle: 3 },
  magnet: { per: 1.5, prices: [120, 240, 420, 700], unlockBattle: 3 },
};

export type ArmyUnit = 'militia' | 'archers' | 'menAtArms' | 'knights';

/**
 * The Army tab (GDD §10): squad size at each level (0 to 5), and the price of levels 1 to 5. Militia's curve is gentler
 * than the GDD's first guess (300/500/800/1,200 after level 1) so Battle 2's breaks always offer something
 * (`npm run balance`).
 */
export const ARMY: Record<ArmyUnit, { sizes: readonly number[]; prices: readonly number[]; unlockBattle: number }> = {
  militia: { sizes: [6, 8, 10, 12, 14, 16], prices: [150, 250, 400, 650, 1000], unlockBattle: 2 },
  archers: { sizes: [0, 4, 6, 8, 10, 12], prices: [600, 1000, 1600, 2400, 3500], unlockBattle: 6 },
  menAtArms: { sizes: [0, 3, 4, 5, 6, 8], prices: [1500, 2500, 3800, 5500, 8000], unlockBattle: 9 },
  knights: { sizes: [0, 2, 3, 4, 5, 6], prices: [3000, 4500, 6500, 9000, 12000], unlockBattle: 13 },
};

/** Banner levels: +20% health each (GDD §10). */
export const BANNER_UPGRADE = { prices: [400, 900, 1800], unlockBattle: 3 } as const;

/** Coins: a knockout's gold splits into a few coins (GDD §9.1). */
export const COINS = {
  /** The most coins one knockout throws. */
  maxPerDrop: 5,
  /** Gold per coin when splitting (a 3-gold peasant throws 3 coins; a 25-gold captain 5 coins of 5). */
  value: 1,
  /** Seconds a coin waits on the ground before it can be pulled in, so the pop reads. */
  settle: 0.35,
} as const;
