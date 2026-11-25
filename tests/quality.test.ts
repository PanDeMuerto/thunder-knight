import { describe, expect, it } from 'vitest';
import { steadyFps, TIERS } from '@/render/stage';

describe('quality tiers', () => {
  it('reads the frame rate without its slowest tenth, so one hitch never costs a tier', () => {
    const smooth = new Array(90).fill(1 / 60);
    expect(steadyFps(smooth)).toBeCloseTo(60, 5);
    // Five shader-compile hitches of a quarter second in a window of 90 frames.
    const hitches = [...new Array(85).fill(1 / 60), ...new Array(5).fill(0.25)];
    expect(steadyFps(hitches)).toBeCloseTo(60, 5);
    // A phone that really is slow stays slow.
    expect(steadyFps(new Array(45).fill(1 / 22))).toBeCloseTo(22, 5);
  });

  it('draws less on each lower tier, and keeps the soldier caps from the GDD (§19)', () => {
    const order = [TIERS.high, TIERS.low, TIERS.lowest];
    for (let i = 1; i < order.length; i++) {
      expect(order[i]!.shortEdge).toBeLessThan(order[i - 1]!.shortEdge);
      expect(order[i]!.soldiers).toBeLessThan(order[i - 1]!.soldiers);
      expect(order[i]!.pixelRatio).toBeLessThanOrEqual(order[i - 1]!.pixelRatio);
    }
    expect([TIERS.high.soldiers, TIERS.low.soldiers, TIERS.lowest.soldiers]).toEqual([300, 160, 100]);
    expect(TIERS.lowest.shadow).toBe(0);
  });
});
