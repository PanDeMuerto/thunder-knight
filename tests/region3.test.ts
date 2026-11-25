import { describe, expect, it } from 'vitest';
import { battle, bossWave } from '@/content/battles';
import { GUNS } from '@/content/guns';
import { heroGunFor } from '@/content/heroLook';
import { SOLDIERS } from '@/content/soldiers';
import { isStringKey } from '@/content/strings';
import { squadGold } from '@/state/economy';
import { newGameState } from '@/state/gameState';
import { act, allCards, shopCards, supportCharges } from '@/state/shop';

describe('Region 3, part 1 (M9: Battles 11 and 12)', () => {
  const types = (id: number) => new Set(battle(id).waves.flatMap((w) => w.squads.map((s) => s.type)));

  it('brings the Brute in Battle 11 (alone first) and the battering ram in Battle 12', () => {
    expect(battle(11).ready && battle(12).ready).toBe(true);
    expect(battle(11).region).toBe(3);
    expect(battle(11).waves).toHaveLength(6);
    expect(battle(12).waves).toHaveLength(6);
    expect(types(11).has('brute')).toBe(true);
    expect(types(11).has('ram')).toBe(false);
    expect(types(12).has('ram')).toBe(true);
    // The Brute's first wave has no other new thing and only one Brute.
    const first = battle(11).waves.find((w) => w.squads.some((s) => s.type === 'brute'))!;
    expect(first.squads.filter((s) => s.type === 'brute').reduce((n, s) => n + s.count, 0)).toBe(1);
    // Neither battle has a boss (the Highland Pass's is the Siege Tower, Battle 15).
    expect(bossWave(battle(11))).toBe(-1);
    expect(bossWave(battle(12))).toBe(-1);
  });

  it("names them in the army reveal, and the ram's crew pay gold", () => {
    expect(isStringKey('intro.brute') && isStringKey('intro.ram')).toBe(true);
    expect(SOLDIERS.brute.healthBar && SOLDIERS.ram.healthBar).toBe(true);
    expect(squadGold('ram', 1, false, 12)).toBeGreaterThan(squadGold('ramCrew', 6, false, 12));
  });

  it('puts the machine gun on sale at Battle 12, with its own model', () => {
    expect(GUNS.machineGun.unlockBattle).toBe(12);
    expect(heroGunFor('machineGun')).toBe('mg');
  });
});

describe('the battering ram\'s health', () => {
  it('is low enough that a Rift Strike and a few grenades break it (GDD §9.1, built M9)', () => {
    expect(SOLDIERS.ram.hp).toBe(500);
  });
});

describe('Region 3, part 2 (M9: Battles 13 and 14)', () => {
  const types = (id: number) => new Set(battle(id).waves.flatMap((w) => w.squads.map((s) => s.type)));

  it('brings catapults in Battle 14 (one first), and none before', () => {
    expect(battle(13).ready && battle(14).ready).toBe(true);
    expect(battle(13).waves).toHaveLength(6);
    expect(battle(14).waves).toHaveLength(7);
    expect(types(13).has('catapult')).toBe(false);
    expect(types(14).has('catapult')).toBe(true);
    const first = battle(14).waves.find((w) => w.squads.some((s) => s.type === 'catapult'))!;
    expect(first.squads.filter((s) => s.type === 'catapult').length).toBe(1);
    expect(isStringKey('intro.catapult')).toBe(true);
  });

  it('opens the knights at Battle 13 and the grenade launcher at 14, its saving goal', () => {
    expect(GUNS.grenadeLauncher.unlockBattle).toBe(14);
    expect(heroGunFor('grenadeLauncher')).toBe('launcher');
    const cards = shopCards(newGameState(), 13, 'army');
    expect(cards.find((c) => c.id === 'army:knights')?.state).not.toBe('locked');
    const state = newGameState();
    state.gold = 9000;
    expect(allCards(state, 14).find((c) => c.recommended)?.id).toBe('gun:grenadeLauncher');
  });
});

describe('the Sentry Gun in the Hero tab (GDD §8.3)', () => {
  it('goes on when bought, and the Rift Strike then offers Equip (and back)', () => {
    const state = newGameState();
    state.gold = 20000;
    expect(act(state, 13, 'support:riftStrike')).toBe(true);
    expect(state.support.equipped).toBe('riftStrike');
    expect(act(state, 13, 'support:sentryGun')).toBe(true);
    expect(state.support.equipped).toBe('sentryGun');
    expect(supportCharges(state)).toBe(1);
    const rift = shopCards(state, 13, 'hero').find((c) => c.id === 'support:riftStrike')!;
    expect(rift.state).toBe('equip');
    const gold = state.gold;
    expect(act(state, 13, 'support:riftStrike')).toBe(true);
    expect(state.support.equipped).toBe('riftStrike');
    expect(state.gold).toBe(gold);
    // Only the equipped one levels up.
    expect(shopCards(state, 13, 'hero').find((c) => c.id === 'support:sentryGun')!.state).toBe('equip');
  });
});

describe('Region 3, part 3 (M9: Battle 15)', () => {
  it('ends the Highland Pass with the Siege Tower, after its last shop', () => {
    const def = battle(15);
    expect(def.ready).toBe(true);
    expect(def.waves).toHaveLength(7);
    expect(bossWave(def)).toBe(6);
    expect(def.waves[6]!.squads.some((s) => s.type === 'siegeTower')).toBe(true);
    expect(isStringKey('intro.siegeTower') && isStringKey('boss.tower') && isStringKey('battle.towerStall')).toBe(true);
  });

  it('keeps its beams in front of its hull and its side pushers clear of it, so bullets reach both', () => {
    const w = SOLDIERS.siegeTower.wagon!;
    const hull = SOLDIERS.siegeTower.radius!;
    for (const beam of w.wheels) expect(Math.hypot(beam[0], beam[1])).toBeGreaterThanOrEqual(hull);
    const side = w.crew.filter(([x]) => Math.abs(x) > 2);
    expect(side.length).toBe(8);
    for (const [x] of side) expect(Math.abs(x) - 0.35).toBeGreaterThan(hull);
  });
});

describe('the minigun (GDD §8.1, Battle 16)', () => {
  it('fires nothing for its 0.6 s spin-up, then 25 rounds a second, and spins down when let go', async () => {
    const { Gun } = await import('@/game/gun');
    const gun = new Gun(GUNS.minigun, 1);
    let shots = 0;
    // Half a second in: still spinning up.
    for (let k = 0; k < 10; k++) shots += gun.update(0.05, true, false);
    expect(shots).toBe(0);
    for (let k = 0; k < 20; k++) shots += gun.update(0.05, true, false);
    expect(shots).toBeGreaterThanOrEqual(20);
    expect(gun.firing).toBe(true);
    gun.update(0.3, false, false);
    expect(gun.spin).toBeLessThan(1);
    expect(gun.firing).toBe(false);
    expect(heroGunFor('minigun')).toBe('minigun');
  });
});
