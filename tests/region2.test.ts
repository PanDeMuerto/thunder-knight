import { describe, expect, it } from 'vitest';
import { battle } from '@/content/battles';
import { SOLDIERS } from '@/content/soldiers';
import { newGameState } from '@/state/gameState';
import { act, fillSecondHand, handSlots, supportCharges } from '@/state/shop';

describe('Region 2, part 1 (M9: Battles 6 and 7)', () => {
  it('opens the second hand at Battle 6 and fills it with the best other gun', () => {
    const state = newGameState();
    state.guns.shotgun = 1;
    expect(handSlots(5)).toBe(1);
    expect(fillSecondHand(state, 5)).toBe(false);
    expect(fillSecondHand(state, 6)).toBe(true);
    expect(state.hand).toEqual(['pistol', 'shotgun']);
    // Already full: nothing changes.
    expect(fillSecondHand(state, 6)).toBe(false);
  });

  it('leaves the second hand empty with only one gun', () => {
    const state = newGameState();
    expect(fillSecondHand(state, 6)).toBe(false);
    expect(state.hand[1]).toBeNull();
  });

  it('brings riders in Battle 6 and firebrands in Battle 7, each new thing one at a time', () => {
    const types = (id: number) => new Set(battle(id).waves.flatMap((w) => w.squads.map((s) => s.type)));
    expect(types(6).has('rider')).toBe(true);
    expect(types(6).has('firebrand')).toBe(false);
    expect(types(7).has('firebrand')).toBe(true);
    expect(battle(6).ready && battle(7).ready).toBe(true);
  });

  it('gives riders a horse and a charge without a lane, and firebrands a burst', () => {
    expect(SOLDIERS.rider.mount).toBe('horse');
    expect(SOLDIERS.rider.charge?.lane).toBe(false);
    expect(SOLDIERS.firebrand.burst?.radius).toBe(4);
    expect(SOLDIERS.firebrand.burst?.hit).toBe(40);
  });
});

describe('Region 2, part 2 (M9: Battles 8 and 9)', () => {
  it('brings men-at-arms in Battle 9 only, armoured, and the Queen her own', () => {
    const types = (id: number) => new Set(battle(id).waves.flatMap((w) => w.squads.map((s) => s.type)));
    expect(types(8).has('manAtArms')).toBe(false);
    expect(types(9).has('manAtArms')).toBe(true);
    expect(SOLDIERS.manAtArms.team).toBe('enemy');
    expect(SOLDIERS.manAtArms.armoured).toBe(true);
    expect(SOLDIERS.allyManAtArms.team).toBe('ally');
  });

  it('sells the Rift Strike from Battle 8, equips it, and gives 1 charge a wave, +1 a level', () => {
    const state = newGameState();
    state.gold = 10000;
    expect(supportCharges(state)).toBe(0);
    expect(act(state, 7, 'support:riftStrike')).toBe(false);
    expect(act(state, 8, 'support:riftStrike')).toBe(true);
    expect(state.support.equipped).toBe('riftStrike');
    expect(supportCharges(state)).toBe(1);
    expect(act(state, 8, 'support:riftStrike')).toBe(true);
    expect(supportCharges(state)).toBe(2);
    expect(state.gold).toBe(10000 - 2500 - 1500);
  });
});
