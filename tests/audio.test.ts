import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AMBIENCE, MIX, MUSIC_NAMES, SOUND_NAMES, YELPS } from '@/content/audio';
import { GUNS } from '@/content/guns';

describe('the sound set (GDD §17)', () => {
  it('has a built file for every sound, the ambience and the music (`npm run audio`)', () => {
    // A name without its file would be a failed request in every session (qa:build checks those too).
    const missing = [...SOUND_NAMES, AMBIENCE, ...MUSIC_NAMES].filter((n) => !existsSync(`public/assets/audio/${n}.mp3`));
    expect(missing).toEqual([]);
  });

  it('keeps frequent sounds quiet and capped', () => {
    for (const name of ['hit', 'coin', 'bolt', 'knock'] as const) {
      expect(MIX[name].volume).toBeLessThanOrEqual(0.45);
      expect(MIX[name].perSecond).toBeGreaterThan(0);
    }
    expect(YELPS.perSecond).toBeLessThanOrEqual(4);
  });

  it('gives every gun a shot sound', () => {
    for (const gun of Object.values(GUNS)) expect(SOUND_NAMES).toContain(gun.feel.sound);
  });
});
