import { battle } from '@/content/battles';
import { ARMY, BANNER, COMEBACK, CROWNS, ECONOMY, HERO_BODY, HERO_UPGRADES, type ArmyUnit } from '@/content/economy';
import { HERO } from '@/content/tuning';
import { SOLDIERS, type SoldierType } from '@/content/soldiers';
import type { GameState } from './gameState';

/** Rules for gold, crowns and what the player's upgrades add up to (GDD §7, §10, §11, §13.3). Plain functions. */

export function goldMultiplier(battleId: number): number {
  return ECONOMY.regionGold[battle(battleId).region - 1]!;
}

export function hpMultiplier(battleId: number): number {
  return ECONOMY.regionHp[battle(battleId).region - 1]!;
}

/** Gold a knockout drops, whoever knocked the soldier out (all of it ends up with the hero). */
export function killGold(type: SoldierType, battleId: number): number {
  return Math.round(SOLDIERS[type].gold * goldMultiplier(battleId));
}

/**
 * Gold a whole squad pays, knocked out to the last: its soldiers, its captain, and for a war wagon its wheels, crew
 * and the footmen that spill out of it (GDD §9.3).
 */
export function squadGold(type: SoldierType, count: number, captain: boolean | SoldierType, battleId: number): number {
  const leader = captain === true ? 'captain' : captain || null;
  let gold = count * killGold(type, battleId) + (leader ? killGold(leader, battleId) : 0);
  const w = SOLDIERS[type].wagon;
  if (w) {
    gold += count * (w.wheels.length * killGold(w.wheelType, battleId) + w.crew.length * killGold(w.crewType, battleId));
    for (const s of w.spill) gold += count * s.count * killGold(s.type, battleId);
  }
  return gold;
}

/** `wave` counts from 1. */
export function waveBonus(battleId: number, wave: number): number {
  return Math.round((ECONOMY.waveBonus.base + ECONOMY.waveBonus.perWave * wave) * goldMultiplier(battleId));
}

export function firstClearBonus(battleId: number): number {
  return ECONOMY.firstClear.base + ECONOMY.firstClear.perBattle * battleId;
}

/** 1 for a win, 2 with the banner at 50% or more, 3 at 80% or more; Battle 1 always 3. `banner` is 0 to 1. */
export function crownsFor(battleId: number, banner: number): number {
  if (battleId === 1) return 3;
  const percent = banner * 100;
  return percent >= CROWNS.three ? 3 : percent >= CROWNS.two ? 2 : 1;
}

/** The banner's health as a multiple of the base (Banner levels add 20% each). */
export function bannerMax(state: GameState): number {
  return 1 + BANNER.hpPerLevel * state.army.banner;
}

export interface HeroStats {
  health: number;
  speed: number;
  /** Grenades per wave (0 before Battle 2). */
  grenades: number;
  magnet: number;
}

/** The hero's numbers with the Hero tab's upgrades. `battleId` decides whether grenades have arrived yet. */
export function heroStats(state: GameState, battleId: number): HeroStats {
  const h = state.hero;
  return {
    health: HERO_BODY.health + HERO_UPGRADES.health.per * h.health,
    speed: HERO.speed + HERO_UPGRADES.speed.per * h.speed,
    grenades: battleId >= HERO_BODY.grenadesFrom ? HERO_BODY.grenades + HERO_UPGRADES.grenades.per * h.grenades : 0,
    magnet: HERO_BODY.magnet + HERO_UPGRADES.magnet.per * h.magnet,
  };
}

/** Allies of a kind at the battle's start: the Army tab's squad size, at least what the battle gives. */
export function allyCount(state: GameState, unit: ArmyUnit, battleId: number): number {
  const size = ARMY[unit].sizes[state.army[unit]] ?? 0;
  if (unit === 'militia') return Math.max(size, battle(battleId).militia);
  return size;
}

/** The quiet comeback help: after two defeats in a row on this battle, allies get 15% stronger (GDD §4.8). */
export function allyBoost(state: GameState, battleId: number): number {
  const record = state.battles[String(battleId)];
  return record && record.defeatsInRow >= COMEBACK.defeats ? 1 + COMEBACK.allyBoost : 1;
}
