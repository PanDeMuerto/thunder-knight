import { describe, expect, it } from 'vitest';
import { ADS } from '@/content/ads';
import { commercialAllowed, crateDue, crateGun, doubleGoldBonus } from '@/state/ads';
import { newGameState } from '@/state/gameState';

describe('when the game asks for an interstitial (GDD §16)', () => {
  it('never in Battle 1', () => {
    expect(commercialAllowed('nextWave', 1, false)).toBe(false);
    expect(commercialAllowed('result', 1, false)).toBe(false);
  });

  it('from Battle 2, at Next wave and when leaving a result card', () => {
    expect(commercialAllowed('nextWave', 2, false)).toBe(ADS.commercialOnNextWave);
    expect(commercialAllowed('result', 7, false)).toBe(ADS.commercialOnResultCard);
  });

  it('not straight after a rewarded ad at the same stop', () => {
    expect(commercialAllowed('nextWave', 5, true)).toBe(false);
    expect(commercialAllowed('result', 5, true)).toBe(false);
  });
});

describe('the rift crate (GDD §12.3)', () => {
  it('comes from Battle 4, on about half the battles', () => {
    expect(crateDue(3, 0)).toBe(false);
    expect(crateDue(4, 0.1)).toBe(true);
    expect(crateDue(4, 0.9)).toBe(false);
  });

  it('lends the best gun not owned that opens within a few battles', () => {
    const state = newGameState();
    // Battle 4 looks ahead to Battle 10: the hunting rifle is the best of those.
    expect(crateGun(state, 4)).toBe('huntingRifle');
    state.guns.huntingRifle = 1;
    expect(crateGun(state, 4)).toBe('assaultRifle');
    // Late in the campaign, everything owned: no crate gun.
    for (const id of ['shotgun', 'smg', 'assaultRifle', 'machineGun', 'grenadeLauncher', 'minigun', 'rocketLauncher'] as const) state.guns[id] = 1;
    expect(crateGun(state, 20)).toBeNull();
  });
});

describe('×2 gold', () => {
  it('doubles knockout gold and wave bonuses, not the first-win bonus', () => {
    expect(doubleGoldBonus({ kills: 145, waves: 120 })).toBe(265);
  });
});
