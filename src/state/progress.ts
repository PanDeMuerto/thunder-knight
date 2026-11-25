import { LAST_READY } from '@/content/battles';
import { crownsFor, firstClearBonus } from './economy';
import type { GameState } from './gameState';

/** Campaign progress (GDD §13): which battle is next, wins, defeats, crowns. Plain functions on the save. */

/** The furthest battle open: one past the highest won (at least 1, at most the last one built). */
export function reachedBattle(state: GameState): number {
  let highest = 0;
  for (const [id, record] of Object.entries(state.battles)) if (record.won) highest = Math.max(highest, Number(id));
  return Math.max(1, Math.min(LAST_READY, highest + 1));
}

/** True until Battle 1 is won: first-time players start straight in it, never on the map (GDD §15.2). */
export function isNewPlayer(state: GameState): boolean {
  return !state.battles['1']?.won;
}

export function isOpen(state: GameState, battleId: number): boolean {
  return battleId >= 1 && battleId <= reachedBattle(state);
}

export interface VictoryResult {
  crowns: number;
  /** 0 on replays. */
  firstClear: number;
}

/**
 * Records a win: crowns (the best so far are kept), the first-clear bonus on the first win, and the end of any
 * comeback help. Adds the bonus to the gold. Returns what changed.
 */
export function recordVictory(state: GameState, battleId: number, banner: number): VictoryResult {
  const key = String(battleId);
  const before = state.battles[key];
  const crowns = crownsFor(battleId, banner);
  const firstClear = before?.won ? 0 : firstClearBonus(battleId);
  state.battles[key] = { won: true, crowns: Math.max(crowns, before?.crowns ?? 0), defeatsInRow: 0 };
  state.gold += firstClear;
  state.stats.battlesWon += 1;
  return { crowns, firstClear };
}

/** Records a defeat (nothing is lost; it only counts toward the comeback help). */
export function recordDefeat(state: GameState, battleId: number): void {
  const key = String(battleId);
  const before = state.battles[key] ?? { won: false, crowns: 0, defeatsInRow: 0 };
  state.battles[key] = { ...before, defeatsInRow: before.defeatsInRow + 1 };
}

export function totalCrowns(state: GameState): number {
  return Object.values(state.battles).reduce((n, b) => n + b.crowns, 0);
}
