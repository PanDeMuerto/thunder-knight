import { describe, expect, it } from 'vitest';
import { LAST_READY } from '@/content/battles';
import { checkTargets, simulate } from '@/state/balance';

describe('balance (GDD §11.2; npm run balance prints the full report)', () => {
  it('meets the economy targets for every battle built', () => {
    expect(checkTargets(simulate(LAST_READY))).toEqual([]);
  });
});
