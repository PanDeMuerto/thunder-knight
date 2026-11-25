import type { SquadDef, WaveDef } from '@/content/battles';
import { LAST_STAND } from '@/content/lastStand';
import type { SoldierType } from '@/content/soldiers';
import { hpMultiplier } from './economy';
import type { GameState } from './gameState';

/**
 * Last Stand (GDD §13.4, M10): endless waves on any cleared battlefield, getting harder, with a shop every few waves
 * and a best-wave record per field. These are its rules, as plain functions; `game/battle.ts` runs them.
 */

/** Open once the campaign's last battle is won. */
export function lastStandUnlocked(state: GameState): boolean {
  return !!state.battles[String(LAST_STAND.unlockAfter)]?.won;
}

/** The best wave held on a field (0: never played). */
export function lastStandBest(state: GameState, field: number): number {
  return state.lastStand[String(field)] ?? 0;
}

/** A run held `held` waves on `field`: the record goes up if it's better. */
export function recordLastStand(state: GameState, field: number, held: number): { best: number; newBest: boolean } {
  const before = lastStandBest(state, field);
  if (held > before) state.lastStand[String(field)] = held;
  return { best: Math.max(before, held), newBest: held > before };
}

/** After wave `n` (from 1): the shop opens (true) or a short countdown runs to the next wave (false). */
export function lastStandShopAfter(n: number): boolean {
  return n % LAST_STAND.shopEvery === 0;
}

/** Wave `n` (from 1) is a boss wave. */
export function lastStandBossWave(n: number): boolean {
  return n % LAST_STAND.bossEvery === 0;
}

/** Enemy health for wave `n` on `field`: the field's region, then a little more every wave. */
export function lastStandHp(field: number, n: number): number {
  return hpMultiplier(field) * (1 + LAST_STAND.hpPerWave * (n - 1));
}

/** A small, fast, seeded random source, so a field's wave `n` is always the same wave. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const EDGES: SquadDef['edge'][] = ['north', 'northWest', 'northEast'];

/**
 * Wave `n` (from 1) of a Last Stand on `field`: a points budget that grows each wave, spent on squads of the Baron's
 * soldiers (more of them, and from wave 8 led by elite captains), a champion or siege engine now and then once they
 * can come, and every tenth wave a boss with an escort. Seeded by the field and the wave.
 */
export function lastStandWave(field: number, n: number): WaveDef {
  const L = LAST_STAND;
  const rng = random(field * 7919 + n * 104729);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(rng() * list.length)]!;
  let budget = L.budget.base + L.budget.perWave * n;
  const squads: SquadDef[] = [];
  let at = 0;
  let edge = Math.floor(rng() * EDGES.length);
  const next = (): { at: number; edge: SquadDef['edge'] } => {
    const out = { at, edge: EDGES[edge % EDGES.length]! };
    at += L.gap;
    edge++;
    return out;
  };
  if (lastStandBossWave(n)) {
    const boss = L.bosses[(n / L.bossEvery - 1) % L.bosses.length]!;
    squads.push({ at: 0, edge: 'north', type: boss, count: 1, formation: boss === 'grudge' ? 'mob' : 'block' });
    edge = 1;
    budget *= L.bossEscort;
  } else {
    // A champion or a siege engine now and then, once they can come.
    const ready = L.specials.filter((s) => n >= s.from);
    if (ready.length && rng() < L.specialChance + n * L.specialGrowth) {
      const s = pick(ready);
      squads.push({ ...next(), type: s.type, count: 1, formation: s.type === 'brute' ? 'mob' : 'block' });
      budget -= s.cost;
    }
  }
  const pool = L.pool.filter((p) => n >= p.from);
  const count = Math.min(L.squads.most, L.squads.base + Math.floor(n / L.squads.every));
  for (let k = 0; k < count && budget > 0; k++) {
    const p = pick(pool);
    const share = budget / (count - k);
    const size = Math.max(p.least, Math.min(L.squadMost, Math.round(share / p.cost)));
    const led = p.formation === 'block' && rng() < L.captainChance;
    const squad: SquadDef = { ...next(), type: p.type as SoldierType, count: size, formation: p.formation };
    if (led) {
      squad.captain = true;
      if (n >= L.eliteFrom) squad.elite = true;
    }
    squads.push(squad);
    budget -= size * p.cost;
  }
  const wave: WaveDef = { squads };
  // Sir Grudge throws down his shield at half and calls two blocks, as in his own battle.
  if (squads[0]?.type === 'grudge') {
    wave.bossHalf = [
      { at: 0, edge: 'northWest', type: 'footman', count: 8, formation: 'block', captain: true, elite: n >= L.eliteFrom },
      { at: 0, edge: 'northEast', type: 'footman', count: 8, formation: 'block', captain: true, elite: n >= L.eliteFrom },
    ];
  }
  if (squads[0]?.type === 'ironOx') wave.bossHalf = [{ at: 0, edge: 'northWest', type: 'footman', count: 10, formation: 'block', captain: true, elite: true }];
  return wave;
}
