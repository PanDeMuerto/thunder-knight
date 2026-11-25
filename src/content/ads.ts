/**
 * Every ad placement is a switch here (GDD §16), so live updates can tune them without touching game code. All ads go
 * through `PlatformSession`, which enforces Poki's rules; these switches only decide when the game *asks*.
 */
export const ADS = {
  /** Interstitial when the player presses Next wave in a wave break. */
  commercialOnNextWave: true,
  /** Interstitial on Continue or Retry from a victory or defeat card. */
  commercialOnResultCard: true,
  /** No interstitials until this battle number (Battle 1 is onboarding). */
  firstBattleWithCommercials: 2,
  /** Skip the Next-wave interstitial if a rewarded ad already played in this break. */
  skipCommercialAfterRewarded: true,
  rewarded: {
    /** Defeat card: the banner back to 50% and the wave continues. Once per battle. */
    rally: true,
    /** The banner's health after a Rally, as a share of its most. */
    rallyBanner: 0.5,
    /** Victory card: doubles the battle's kill gold and wave bonuses. */
    doubleGold: true,
    /** In-world rift crate: borrow the best gun you don't own, at ★3, for one wave. */
    riftCrate: true,
    riftCrateFromBattle: 4,
    riftCrateChance: 0.5,
    /** The loan is the best gun not owned that opens within this many battles of the one reached. */
    riftCrateLookAhead: 6,
    riftCrateLevel: 3,
    /** Metres from the crate that open its offer. */
    riftCrateReach: 1.8,
  },
} as const;
