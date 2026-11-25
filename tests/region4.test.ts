import { describe, expect, it } from 'vitest';
import { battle } from '@/content/battles';
import { ECONOMY } from '@/content/economy';
import { GROUND_TINT, LANDMARKS, STREAMS, TREE_LINES } from '@/content/fields';
import { GUNS } from '@/content/guns';
import { newGameState } from '@/state/gameState';
import { allCards } from '@/state/shop';

describe('Region 4, part 1 (M9: Battles 16 and 17)', () => {
  const types = (id: number) => new Set(battle(id).waves.flatMap((w) => w.squads.map((s) => s.type)));

  it('opens the Iron Keep with Burnt Orchard and Moat Road, seven waves each', () => {
    for (const id of [16, 17]) {
      expect(battle(id).ready).toBe(true);
      expect(battle(id).region).toBe(4);
      expect(battle(id).waves).toHaveLength(7);
    }
    // Moat Road brings rams and catapults in the same wave.
    expect(battle(17).waves.some((w) => w.squads.some((s) => s.type === 'ram') && w.squads.some((s) => s.type === 'catapult'))).toBe(true);
    expect(types(16).has('siegeTower')).toBe(false);
  });

  it('has its own look: the burnt orchard and the Keep on the skyline, drier ground, a moat', () => {
    const line = TREE_LINES[4]!;
    expect(line.some((p) => p.piece === 'castle')).toBe(true);
    expect(line.some((p) => p.piece === 'treeBurnt')).toBe(true);
    expect(GROUND_TINT[4]).not.toBe(0xffffff);
    expect(LANDMARKS[16]!.length).toBeGreaterThan(5);
    expect(STREAMS[17]!.width).toBeGreaterThanOrEqual(6);
  });

  it("scales the Baron's health by his gold (×3), and saves for the minigun", () => {
    expect(ECONOMY.regionHp[3]).toBe(ECONOMY.regionGold[3]);
    expect(GUNS.minigun.unlockBattle).toBe(16);
    const state = newGameState();
    state.gold = 13000;
    expect(allCards(state, 16).find((c) => c.recommended)?.id).toBe('gun:minigun');
  });
});


describe('Region 4, part 2 (M9: Battles 18 and 19)', () => {
  it('brings elite captains at The Gatehouse and everything but the Baron at Inner Bailey, eight waves each', () => {
    for (const id of [18, 19]) {
      expect(battle(id).ready).toBe(true);
      expect(battle(id).waves).toHaveLength(8);
    }
    const elite = (id: number) => battle(id).waves.some((w) => w.squads.some((s) => s.elite));
    expect(elite(17)).toBe(false);
    expect(elite(18)).toBe(true);
    // No boss before the Iron Baron: Inner Bailey's last shop isn't "before the boss".
    expect(battle(19).waves.some((w) => w.squads.some((s) => s.type === 'siegeTower'))).toBe(false);
  });

  it('puts the rocket launcher on sale at The Gatehouse, double on siege engines', () => {
    expect(GUNS.rocketLauncher.unlockBattle).toBe(18);
    expect(GUNS.rocketLauncher.siegeBonus).toBe(2);
    const state = newGameState();
    state.gold = 17000;
    expect(allCards(state, 18).find((c) => c.recommended)?.id).toBe('gun:rocketLauncher');
  });
});

describe('Region 4, part 3 (M9: Battle 20 and the Iron Ox)', () => {
  it('ends the campaign with the Iron Ox after the last shop, elite captains joining at 60%', async () => {
    const { bossWave } = await import('@/content/battles');
    const { SOLDIERS } = await import('@/content/soldiers');
    const { isStringKey } = await import('@/content/strings');
    const def = battle(20);
    expect(def.ready).toBe(true);
    expect(def.waves).toHaveLength(7);
    expect(bossWave(def)).toBe(6);
    expect(def.waves[6]!.squads.some((s) => s.type === 'ironOx')).toBe(true);
    expect(def.waves[6]!.bossHalf!.every((s) => s.elite)).toBe(true);
    const ox = SOLDIERS.ironOx.ox!;
    expect(ox.summonAt).toBeGreaterThan(ox.coreAt);
    for (const key of ['intro.ironOx', 'boss.ox', 'battle.oxSummon', 'battle.oxCore']) expect(isStringKey(key)).toBe(true);
  });
});
