import type { Formation } from '@/crowd/formations';
import type { SoldierType } from './soldiers';

/**
 * Last Stand's tuning (GDD §13.4, M10; the rules are in `state/lastStand.ts`). Points: a wave's budget, and what each
 * soldier costs from it (a footman 2, a man-at-arms 5).
 */
export const LAST_STAND = {
  /** Open once this battle is won (the campaign's last). */
  unlockAfter: 20,
  /** The shop opens after every 3rd wave; between the others, a short countdown. */
  shopEvery: 3,
  breakSeconds: 6,
  /** Enemy health grows this share a wave, on top of the field's region. */
  hpPerWave: 0.06,
  budget: { base: 18, perWave: 7 },
  /** Seconds between squads entering. */
  gap: 4,
  squads: { base: 2, every: 4, most: 5 },
  squadMost: 16,
  captainChance: 0.6,
  /** Elite captains lead from this wave. */
  eliteFrom: 8,
  /** Every 10th wave: a boss, in turn, with an escort on part of the budget. */
  bossEvery: 10,
  bosses: ['warWagon', 'siegeTower', 'ironOx', 'grudge'] as const satisfies readonly SoldierType[],
  bossEscort: 0.5,
  /** Champions and siege engines: from which wave, and their cost; the chance one comes grows each wave. */
  specials: [
    { type: 'brute', cost: 16, from: 4 },
    { type: 'ram', cost: 18, from: 5 },
    { type: 'catapult', cost: 18, from: 6 },
  ] as const satisfies readonly { type: SoldierType; cost: number; from: number }[],
  specialChance: 0.3,
  specialGrowth: 0.02,
  /** The rank and file: cost a soldier, the smallest squad, its formation, and from which wave. */
  pool: [
    { type: 'peasant', cost: 1, least: 8, formation: 'mob', from: 1 },
    { type: 'footman', cost: 2, least: 6, formation: 'block', from: 1 },
    { type: 'archer', cost: 2.5, least: 4, formation: 'line', from: 2 },
    { type: 'shieldWall', cost: 3, least: 5, formation: 'line', from: 3 },
    { type: 'firebrand', cost: 2.5, least: 3, formation: 'mob', from: 3 },
    { type: 'rider', cost: 4, least: 4, formation: 'line', from: 4 },
    { type: 'manAtArms', cost: 5, least: 4, formation: 'block', from: 5 },
  ] as const satisfies readonly { type: SoldierType; cost: number; least: number; formation: Formation; from: number }[],
} as const;
