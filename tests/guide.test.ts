import { describe, expect, it } from 'vitest';
import type { WaveDef } from '@/content/battles';
import type { SoldierType } from '@/content/soldiers';
import { nameplate, planReveal, RevealShot } from '@/game/reveal';

/** A wave of peasants led by a captain, then footmen (GDD §4.3). */
const WAVE: WaveDef = {
  squads: [
    { at: 0, edge: 'north', type: 'peasant', count: 12, formation: 'mob', captain: true },
    { at: 4, edge: 'west', type: 'footman', count: 8, formation: 'block' },
  ],
};
const metOnly =
  (...types: SoldierType[]) =>
  (type: SoldierType): boolean =>
    types.includes(type);

describe('the army reveal (GDD §4.3)', () => {
  it('introduces the first type the player has not met, the captain before his squad', () => {
    expect(planReveal(WAVE, metOnly(), 'full', false).introduce).toBe('captain');
    expect(planReveal(WAVE, metOnly('captain', 'peasant'), 'full', false).introduce).toBe('footman');
    expect(planReveal(WAVE, metOnly('captain', 'peasant', 'footman'), 'full', false).introduce).toBeNull();
  });

  it('lasts 2 s, 2.5 s with a nameplate, 1.2 s with reduced motion', () => {
    expect(planReveal(WAVE, metOnly('captain', 'peasant', 'footman'), 'full', false).seconds).toBe(2);
    expect(planReveal(WAVE, metOnly(), 'full', false).seconds).toBe(2.5);
    expect(planReveal(WAVE, metOnly(), 'full', true).seconds).toBe(1.2);
  });

  it('follows the Wave intros setting: Short only for new enemies, Off never moves the camera', () => {
    expect(planReveal(WAVE, metOnly('captain', 'peasant', 'footman'), 'short', false).seconds).toBe(0);
    expect(planReveal(WAVE, metOnly(), 'short', false).seconds).toBe(2.5);
    const off = planReveal(WAVE, metOnly(), 'off', false);
    expect(off.seconds).toBe(0);
    // The nameplate still names the newcomer.
    expect(off.introduce).toBe('captain');
  });

  it('names each newcomer with a counter tip of five words at most', () => {
    for (const type of ['peasant', 'footman', 'captain', 'archer'] as const) {
      const text = nameplate(type);
      expect(text.length).toBeGreaterThan(0);
      expect(text.split(/\s+/).length).toBeLessThanOrEqual(5);
    }
  });

  it('eases the camera in and out, and a press skips to the ease out', () => {
    const shot = new RevealShot();
    shot.start(planReveal(WAVE, metOnly(), 'full', false));
    expect(shot.active).toBe(true);
    expect(shot.update(0.2)).toBeCloseTo(0.5);
    expect(shot.update(0.4)).toBe(1);
    shot.skip();
    expect(shot.update(0.2)).toBeCloseTo(0.5);
    expect(shot.update(0.3)).toBe(0);
    expect(shot.active).toBe(false);
  });

  it('starts no shot when the plan has none', () => {
    const shot = new RevealShot();
    shot.start(planReveal(WAVE, metOnly(), 'off', false));
    expect(shot.active).toBe(false);
    expect(shot.update(0.1)).toBe(0);
  });
});
