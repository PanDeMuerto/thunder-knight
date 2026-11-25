import { ADS } from '@/content/ads';
import { GUNS, type GunId } from '@/content/guns';
import type { GameState } from './gameState';

/**
 * When the game asks for an ad (GDD §16), as plain functions. Poki's own rules (no ad before the first
 * `gameplayStart`, none during an ad, rewards only on success) are enforced by `PlatformSession`; these decide only
 * when the game *asks*.
 */

export type CommercialPoint = 'nextWave' | 'result';

/**
 * An interstitial at a natural stop: pressing Next wave in a break, or leaving a result card. Never in Battle 1 (it's
 * onboarding), and not straight after a rewarded ad at the same stop.
 */
export function commercialAllowed(point: CommercialPoint, battleId: number, rewardedHere: boolean): boolean {
  if (battleId < ADS.firstBattleWithCommercials) return false;
  if (rewardedHere && ADS.skipCommercialAfterRewarded) return false;
  return point === 'nextWave' ? ADS.commercialOnNextWave : ADS.commercialOnResultCard;
}

/** Whether a battle gets a rift crate in one of its breaks: from Battle 4, about every other battle. */
export function crateDue(battleId: number, roll: number): boolean {
  const r = ADS.rewarded;
  return r.riftCrate && battleId >= r.riftCrateFromBattle && roll < r.riftCrateChance;
}

/**
 * The gun a rift crate lends (GDD §12.3): the best one the player doesn't own that opens within a few battles, a
 * taste of what to save for. Null when there's none.
 */
export function crateGun(state: GameState, reached: number): GunId | null {
  let best: GunId | null = null;
  for (const gun of Object.values(GUNS)) {
    if ((state.guns[gun.id] ?? 0) > 0) continue;
    if (gun.unlockBattle > reached + ADS.rewarded.riftCrateLookAhead) continue;
    if (!best || gun.price > GUNS[best].price) best = gun.id;
  }
  return best;
}

/** What ×2 gold adds on the victory card: the battle's knockout gold and wave bonuses again (not the first-win bonus). */
export function doubleGoldBonus(earned: { kills: number; waves: number }): number {
  return earned.kills + earned.waves;
}
