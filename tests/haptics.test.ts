import { afterEach, describe, expect, it, vi } from 'vitest';
import { HAPTICS } from '@/content/haptics';
import { Haptics } from '@/input/haptics';

const calls: (number | number[])[] = [];
const vibrate = (pattern: number | number[]): boolean => {
  calls.push(pattern);
  return true;
};

describe('vibration (M11)', () => {
  afterEach(() => {
    calls.length = 0;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('buzzes only when switched on, and never where the device has no vibration', () => {
    vi.stubGlobal('navigator', { vibrate });
    const h = new Haptics();
    h.pulse('hurt');
    expect(calls).toEqual([]);
    h.enabled = true;
    h.pulse('hurt');
    expect(calls).toEqual([HAPTICS.hurt]);
    vi.stubGlobal('navigator', {});
    expect(() => h.pulse('buy')).not.toThrow();
  });

  it('makes a volley of hits one buzz, but always marks a knockout and a boss falling', () => {
    vi.stubGlobal('navigator', { vibrate });
    vi.useFakeTimers();
    const h = new Haptics();
    h.enabled = true;
    h.pulse('hurt');
    h.pulse('hurt');
    h.pulse('blast');
    expect(calls.length).toBe(1);
    h.pulse('down');
    h.pulse('bossDown');
    expect(calls.slice(1)).toEqual([HAPTICS.down, [...HAPTICS.bossDown]]);
    vi.advanceTimersByTime(HAPTICS.gap * 1000 + 10);
    h.pulse('hurt');
    expect(calls.length).toBe(4);
  });

  it('keeps every pulse short', () => {
    for (const [kind, pattern] of Object.entries(HAPTICS)) {
      if (kind === 'gap') continue;
      const total = typeof pattern === 'number' ? pattern : pattern.reduce((a, b) => a + b, 0);
      expect(total, kind).toBeLessThanOrEqual(200);
    }
  });
});
