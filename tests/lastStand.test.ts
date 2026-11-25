import { describe, expect, it } from 'vitest';
import { LAST_STAND } from '@/content/lastStand';
import { SOLDIERS } from '@/content/soldiers';
import { newGameState } from '@/state/gameState';
import { lastStandBest, lastStandHp, lastStandShopAfter, lastStandUnlocked, lastStandWave, recordLastStand } from '@/state/lastStand';

const soldiers = (field: number, n: number) => lastStandWave(field, n).squads.reduce((s, q) => s + q.count + (q.captain ? 1 : 0), 0);

describe('Last Stand (GDD §13.4, M10)', () => {
  it('opens once the Iron Keep is won', () => {
    const state = newGameState();
    expect(lastStandUnlocked(state)).toBe(false);
    state.battles['20'] = { won: true, crowns: 1, defeatsInRow: 0 };
    expect(lastStandUnlocked(state)).toBe(true);
  });

  it('makes the same wave for the same field and number, and different ones elsewhere', () => {
    expect(lastStandWave(4, 7)).toEqual(lastStandWave(4, 7));
    expect(lastStandWave(4, 7)).not.toEqual(lastStandWave(9, 7));
  });

  it('grows: more soldiers and tougher ones as the waves go on', () => {
    const early = [1, 2, 3].reduce((s, n) => s + soldiers(12, n), 0);
    const late = [21, 22, 23].reduce((s, n) => s + soldiers(12, n), 0);
    expect(late).toBeGreaterThan(early * 1.5);
    expect(lastStandHp(12, 30)).toBeGreaterThan(lastStandHp(12, 1) * 2.5);
    // Nothing the player hasn't met early on: no men-at-arms or riders in the first waves.
    for (const n of [1, 2, 3]) for (const s of lastStandWave(5, n).squads) expect(['peasant', 'footman', 'archer', 'shieldWall', 'firebrand']).toContain(s.type);
  });

  it('brings a boss every tenth wave, in turn, and elite captains from wave 8', () => {
    for (let k = 1; k <= 4; k++) {
      const wave = lastStandWave(3, k * 10);
      expect(wave.squads[0]!.type).toBe(LAST_STAND.bosses[k - 1]);
      expect(SOLDIERS[wave.squads[0]!.type].boss).toBe(true);
    }
    expect(lastStandWave(3, 40).bossHalf?.length).toBe(2);
    const late = Array.from({ length: 10 }, (_, k) => lastStandWave(7, 11 + k)).flatMap((w) => w.squads);
    expect(late.some((s) => s.elite)).toBe(true);
    const early = Array.from({ length: 6 }, (_, k) => lastStandWave(7, 1 + k)).flatMap((w) => w.squads);
    expect(early.some((s) => s.elite)).toBe(false);
  });

  it('keeps every wave within reason (squads under the cap, every soldier a real type)', () => {
    for (let n = 1; n <= 40; n++) {
      const wave = lastStandWave(16, n);
      expect(wave.squads.length).toBeGreaterThan(0);
      expect(wave.squads.length).toBeLessThanOrEqual(LAST_STAND.squads.most + 1);
      for (const s of wave.squads) {
        expect(SOLDIERS[s.type]).toBeDefined();
        expect(s.count).toBeLessThanOrEqual(LAST_STAND.squadMost);
      }
    }
  });

  it('opens the shop after every third wave, and keeps the best wave per field', () => {
    expect([1, 2, 3, 4, 5, 6].map(lastStandShopAfter)).toEqual([false, false, true, false, false, true]);
    const state = newGameState();
    expect(recordLastStand(state, 5, 7)).toEqual({ best: 7, newBest: true });
    expect(recordLastStand(state, 5, 4)).toEqual({ best: 7, newBest: false });
    expect(lastStandBest(state, 5)).toBe(7);
    expect(lastStandBest(state, 6)).toBe(0);
  });
});
