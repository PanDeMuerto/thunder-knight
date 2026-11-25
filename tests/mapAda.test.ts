import { describe, expect, it } from 'vitest';
import { BATTLES, battle, battleName, battleNews } from '@/content/battles';
import { LANGUAGE_TABLES, setLanguage } from '@/content/strings';
import { newGameState } from '@/state/gameState';
import { adaLine } from '@/ui/mapScreen';

const win = (state: ReturnType<typeof newGameState>, upTo: number): void => {
  for (let i = 1; i <= upTo; i++) state.battles[String(i)] = { won: true, crowns: 3, defeatsInRow: 0 };
};

describe("Queen Ada's line on the map (GDD §2, M11)", () => {
  it('speaks of the battle’s region', () => {
    const state = newGameState();
    expect(adaLine(state, battle(1))).toBe('ada.region.1');
    win(state, 7);
    expect(adaLine(state, battle(8))).toBe('ada.region.2');
  });

  it('marks a region won on the next region’s first battle', () => {
    const state = newGameState();
    win(state, 5);
    expect(adaLine(state, battle(6))).toBe('ada.end.1');
    win(state, 10);
    expect(adaLine(state, battle(11))).toBe('ada.end.2');
    win(state, 15);
    expect(adaLine(state, battle(16))).toBe('ada.end.3');
  });

  it('thanks the player once Larkmoor is free', () => {
    const state = newGameState();
    win(state, 20);
    for (const b of BATTLES) expect(adaLine(state, b)).toBe('ada.free');
  });
});

describe('battle names in every language (M11)', () => {
  it('names every battle and its news in each table', () => {
    for (const code of Object.keys(LANGUAGE_TABLES)) {
      setLanguage(code);
      for (const b of BATTLES) {
        expect(battleName(b.id).length, `${code} ${b.id}`).toBeGreaterThan(0);
        expect(battleNews(b.id).length, `${code} ${b.id}`).toBeGreaterThan(0);
      }
    }
    setLanguage('en');
    expect(battleName(20)).toBe(battle(20).name);
  });
});
