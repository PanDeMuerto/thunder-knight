import { describe, expect, it } from 'vitest';
import { BATTLES, bossWave, LAST_READY } from '@/content/battles';
import { allyBoost, allyCount, bannerMax, crownsFor, firstClearBonus, heroStats, killGold, waveBonus } from '@/state/economy';
import { newGameState } from '@/state/gameState';
import { isNewPlayer, reachedBattle, recordDefeat, recordVictory } from '@/state/progress';
import { act, allCards, handSlots, openTabs, shopCards } from '@/state/shop';

describe('economy', () => {
  it('pays the GDD bonuses', () => {
    expect(waveBonus(1, 1)).toBe(30);
    expect(waveBonus(1, 3)).toBe(50);
    expect(firstClearBonus(1)).toBe(150);
    expect(firstClearBonus(3)).toBe(250);
    expect(killGold('peasant', 1)).toBe(3);
    expect(killGold('captain', 2)).toBe(25);
  });

  it('gives crowns by the banner left, and Battle 1 always 3', () => {
    expect(crownsFor(2, 0.3)).toBe(1);
    expect(crownsFor(2, 0.5)).toBe(2);
    expect(crownsFor(2, 0.85)).toBe(3);
    expect(crownsFor(1, 0.31)).toBe(3);
  });

  it('adds up the hero, the banner and the army', () => {
    const s = newGameState();
    expect(heroStats(s, 1)).toMatchObject({ health: 100, grenades: 0, magnet: 5 });
    expect(heroStats(s, 2).grenades).toBe(2);
    s.hero.health = 2;
    s.hero.grenades = 1;
    expect(heroStats(s, 3)).toMatchObject({ health: 140, grenades: 3 });
    s.army.banner = 2;
    expect(bannerMax(s)).toBeCloseTo(1.4, 5);
    expect(allyCount(s, 'militia', 1)).toBe(6);
    s.army.militia = 2;
    expect(allyCount(s, 'militia', 1)).toBe(10);
    expect(allyCount(s, 'archers', 1)).toBe(0);
  });
});

describe('progress', () => {
  it('opens the next battle on a win, pays the first clear once, keeps the best crowns', () => {
    const s = newGameState();
    expect(isNewPlayer(s)).toBe(true);
    expect(reachedBattle(s)).toBe(1);
    const gold = s.gold;
    expect(recordVictory(s, 1, 0.4)).toEqual({ crowns: 3, firstClear: 150 });
    expect(s.gold).toBe(gold + 150);
    expect(isNewPlayer(s)).toBe(false);
    expect(reachedBattle(s)).toBe(2);
    expect(recordVictory(s, 1, 0.9).firstClear).toBe(0);
    recordVictory(s, 2, 0.9);
    recordVictory(s, 2, 0.2);
    expect(s.battles['2']!.crowns).toBe(3);
  });

  it('never opens past the last battle built', () => {
    const s = newGameState();
    for (let b = 1; b <= 20; b++) recordVictory(s, b, 1);
    expect(reachedBattle(s)).toBe(LAST_READY);
  });

  it('helps quietly after two defeats in a row, until a win', () => {
    const s = newGameState();
    recordDefeat(s, 2);
    expect(allyBoost(s, 2)).toBe(1);
    recordDefeat(s, 2);
    expect(allyBoost(s, 2)).toBeCloseTo(1.15, 5);
    recordVictory(s, 2, 0.6);
    expect(allyBoost(s, 2)).toBe(1);
  });
});

describe('shop', () => {
  it('opens tabs as the battles do', () => {
    expect(openTabs(1)).toEqual(['guns']);
    expect(openTabs(2)).toEqual(['guns', 'army']);
    expect(openTabs(3)).toEqual(['guns', 'army', 'hero']);
  });

  it('offers pistol ★2 for 100 at the first break of Battle 1, recommended', () => {
    const s = newGameState();
    s.gold = 110;
    const cards = allCards(s, 1);
    const pistol = cards.find((c) => c.id === 'gun:pistol')!;
    expect(pistol).toMatchObject({ state: 'buy', price: 100, level: 1, equipped: true, recommended: true });
    // The shotgun shows as the next lock.
    expect(cards.find((c) => c.id === 'gun:shotgun')).toMatchObject({ state: 'locked', unlockBattle: 4 });
    expect(cards.some((c) => c.id === 'gun:smg')).toBe(false);
    expect(act(s, 1, 'gun:pistol')).toBe(true);
    expect(s.gold).toBe(10);
    expect(s.guns.pistol).toBe(2);
    expect(shopCards(s, 1, 'guns')[0]).toMatchObject({ state: 'expensive', price: 180, missing: 170 });
  });

  it('never buys what is locked, maxed or too dear', () => {
    const s = newGameState();
    s.gold = 100000;
    expect(act(s, 1, 'gun:shotgun')).toBe(false);
    s.guns.pistol = 5;
    expect(shopCards(s, 1, 'guns')[0]!.state).toBe('max');
    expect(act(s, 1, 'gun:pistol')).toBe(false);
    s.gold = 10;
    expect(act(s, 2, 'army:militia')).toBe(false);
    expect(s.gold).toBe(10);
  });

  it('puts a new gun in the hand, and equips owned ones', () => {
    const s = newGameState();
    s.gold = 2000;
    expect(act(s, 4, 'gun:shotgun')).toBe(true);
    expect(s.hand).toEqual(['shotgun', null]);
    expect(shopCards(s, 4, 'guns').find((c) => c.id === 'gun:pistol')!.state).toBe('equip');
    act(s, 4, 'gun:pistol');
    expect(s.hand).toEqual(['pistol', null]);
    expect(handSlots(6)).toBe(2);
    act(s, 6, 'gun:shotgun');
    expect(s.hand).toEqual(['pistol', 'shotgun']);
  });

  it('levels the army, the banner and the hero', () => {
    const s = newGameState();
    s.gold = 5000;
    expect(act(s, 3, 'army:militia')).toBe(true);
    expect(act(s, 3, 'army:banner')).toBe(true);
    expect(act(s, 3, 'hero:health')).toBe(true);
    expect(s.army).toMatchObject({ militia: 1, banner: 1 });
    expect(s.hero.health).toBe(1);
    expect(s.gold).toBe(5000 - 150 - 400 - 150);
    // Archers are locked until Battle 6, and shown as the next lock.
    expect(shopCards(s, 3, 'army').find((c) => c.id === 'army:archers')!.state).toBe('locked');
  });
});

describe('battles', () => {
  it('builds Region 1 (Battles 1–5) with the GDD wave counts, each new enemy in its own battle', () => {
    expect(LAST_READY).toBeGreaterThanOrEqual(5);
    // GDD §13.2: 3, 3, 4, 4, then 4 + the boss.
    expect(BATTLES.map((b) => b.waves.length).slice(0, 5)).toEqual([3, 3, 4, 4, 5]);
    const roster = ['peasant', 'footman', 'archer', 'shieldWall', 'grudge'];
    const allowed: Record<number, string[]> = { 1: roster.slice(0, 1), 2: roster.slice(0, 2), 3: roster.slice(0, 3), 4: roster.slice(0, 4), 5: roster };
    for (const b of BATTLES.slice(0, 5)) {
      for (const w of b.waves) for (const s of [...w.squads, ...(w.bossHalf ?? [])]) expect(allowed[b.id]).toContain(s.type);
    }
    // Sir Grudge comes only in Battle 5's last wave, after its last shop.
    expect(bossWave(BATTLES[4]!)).toBe(4);
    expect(BATTLES.slice(0, 4).every((b) => bossWave(b) === -1)).toBe(true);
    expect(BATTLES).toHaveLength(20);
  });
});
