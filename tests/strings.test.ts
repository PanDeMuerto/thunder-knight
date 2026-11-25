import { describe, expect, it } from 'vitest';
import { LANGUAGE_NAMES, LANGUAGE_TABLES, setLanguage, t } from '@/content/strings';
import { EN, type StringKey } from '@/content/strings/en';

const placeholders = (text: string): string[] => (text.match(/\{\w+\}/g) ?? []).sort();
const codes = Object.keys(LANGUAGE_TABLES).filter((code) => code !== 'en');

describe('languages', () => {
  it('has a name for every language in the picker', () => {
    for (const code of Object.keys(LANGUAGE_TABLES)) expect(LANGUAGE_NAMES[code]).toBeTruthy();
  });

  it('translates every line and keeps every placeholder', () => {
    for (const code of codes) {
      const table = LANGUAGE_TABLES[code]!;
      const missing = (Object.keys(EN) as StringKey[]).filter((key) => !table[key]?.trim());
      expect([code, missing]).toEqual([code, []]);
      for (const key of Object.keys(EN) as StringKey[]) {
        expect([code, key, placeholders(table[key] ?? '')]).toEqual([code, key, placeholders(EN[key])]);
      }
    }
  });

  it('falls back to English for an unknown language', () => {
    setLanguage('xx');
    expect(t('title')).toBe(EN.title);
    setLanguage('en');
  });

  it('keeps onboarding prompts to four words at most (docs/onboarding.md §2)', () => {
    const prompts: StringKey[] = ['move', 'aim', 'shoot', 'grenade', 'support', 'swap', 'nextWave', 'goTruck', 'buy', 'downCaptain', 'stepAside'];
    for (const key of prompts) expect([key, EN[key].split(/\s+/).length <= 4]).toEqual([key, true]);
  });

  it('keeps nameplates to a name and a tip of five words at most (GDD §4.3)', () => {
    for (const key of Object.keys(EN) as StringKey[]) {
      if (!key.startsWith('intro.')) continue;
      const tip = EN[key].split(':')[1] ?? '';
      expect([key, tip.trim().split(/\s+/).length <= 5]).toEqual([key, true]);
    }
  });
});
