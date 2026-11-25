import { describe, expect, it } from 'vitest';
import { PlatformSession } from '@/platform/platformSession';
import type { PlatformAdapter } from '@/platform/types';

function recorder(rewardOk = true, ads = true): PlatformAdapter & { log: string[] } {
  const log: string[] = [];
  return {
    ads,
    log,
    init: async () => void log.push('init'),
    loadingFinished: () => void log.push('loadingFinished'),
    gameplayStart: () => void log.push('start'),
    gameplayStop: () => void log.push('stop'),
    commercialBreak: async (onStart) => {
      log.push('commercial');
      onStart();
    },
    rewardedBreak: async (onStart) => {
      log.push('rewarded');
      onStart();
      return rewardOk;
    },
    language: () => 'en',
    measure: (category, what, action) => void log.push(`measure:${category}:${what}:${action}`),
    movePill: () => {},
  };
}

const hooks = { onAdStart: () => {}, onAdEnd: () => {} };

describe('platform session', () => {
  it('never sends start or stop twice in a row', () => {
    const a = recorder();
    const s = new PlatformSession(a, hooks);
    s.gameplayStart();
    s.gameplayStart();
    s.gameplayStop();
    s.gameplayStop();
    expect(a.log).toEqual(['start', 'stop']);
  });

  it('refuses a commercial break during play', async () => {
    const a = recorder();
    const s = new PlatformSession(a, hooks);
    s.gameplayStart();
    await s.commercialBreak();
    expect(a.log).toEqual(['start']);
  });

  it('holds measures sent while loading until gameLoadingFinished', () => {
    const a = recorder();
    const s = new PlatformSession(a, hooks);
    s.measure('battle', 'b01', 'start');
    expect(a.log).toEqual([]);
    s.loadingFinished();
    expect(a.log).toEqual(['loadingFinished', 'measure:battle:b01:start']);
  });

  it('asks for no commercial break before the first gameplayStart (no preroll)', async () => {
    const a = recorder();
    const s = new PlatformSession(a, hooks);
    await s.commercialBreak();
    s.gameplayStart();
    s.gameplayStop();
    await s.commercialBreak();
    expect(a.log).toEqual(['start', 'stop', 'commercial']);
  });

  it('runs the ad hooks around a break, and sends no events during it', async () => {
    const log: string[] = [];
    const a = recorder();
    const s = new PlatformSession(a, {
      onAdStart: () => {
        log.push('adStart');
        s.gameplayStart();
        s.measure('rewarded', 'rally', 'interact');
      },
      onAdEnd: () => void log.push('adEnd'),
    });
    expect(await s.rewardedBreak()).toBe(true);
    expect(log).toEqual(['adStart', 'adEnd']);
    expect(a.log).toEqual(['rewarded']);
  });

  it('stops gameplay before a rewarded break and reports the result', async () => {
    const a = recorder(true);
    const s = new PlatformSession(a, hooks);
    s.gameplayStart();
    expect(await s.rewardedBreak()).toBe(true);
    expect(a.log).toEqual(['start', 'stop', 'rewarded']);
  });

  it('grants nothing when the ad fails, as with an ad blocker', async () => {
    const s = new PlatformSession(recorder(false), hooks);
    expect(await s.rewardedBreak()).toBe(false);
  });

  it('asks for no breaks at all in the ad-free build (itch.io)', async () => {
    const a = recorder(true, false);
    const s = new PlatformSession(a, hooks);
    expect(s.adsAvailable).toBe(false);
    s.gameplayStart();
    s.gameplayStop();
    await s.commercialBreak();
    expect(await s.rewardedBreak()).toBe(false);
    expect(a.log).toEqual(['start', 'stop']);
  });
});
