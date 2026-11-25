import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { migrateSave, SaveStore, SAVE_VERSION, type StorageLike } from '@/save/saveStore';
import { newGameState, STARTING_GOLD } from '@/state/gameState';

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe('saves', () => {
  it('round-trips the game state', () => {
    const store = new SaveStore(memoryStorage());
    const state = newGameState();
    state.gold = 1234;
    state.guns.shotgun = 2;
    state.battles.b01 = { won: true, crowns: 3, defeatsInRow: 0 };
    state.seenLessons.push('move:desktop');
    store.save(state);
    const loaded = store.load();
    expect(loaded?.state.gold).toBe(1234);
    expect(loaded?.state.guns).toEqual({ pistol: 1, shotgun: 2 });
    expect(loaded?.state.battles.b01?.crowns).toBe(3);
    expect(loaded?.state.seenLessons).toEqual(['move:desktop']);
  });

  it('starts a new player with the pistol and a little gold', () => {
    const state = newGameState();
    expect(state.gold).toBe(STARTING_GOLD);
    expect(state.hand).toEqual(['pistol', null]);
  });

  it('fills fields added later with defaults, group by group', () => {
    const old = { version: SAVE_VERSION, state: { gold: 5, hero: { health: 2 } } };
    const migrated = migrateSave(old);
    expect(migrated?.state.gold).toBe(5);
    expect(migrated?.state.hero).toEqual({ health: 2, speed: 0, grenades: 0, magnet: 0 });
    expect(migrated?.state.guns.pistol).toBe(1);
    expect(migrated?.state.stats.knockouts).toBe(0);
  });

  it('never lets a damaged gold value through', () => {
    expect(migrateSave({ version: SAVE_VERSION, state: { gold: -40 } })?.state.gold).toBe(0);
    expect(migrateSave({ version: SAVE_VERSION, state: { gold: 'lots' } })?.state.gold).toBe(STARTING_GOLD);
  });

  it('refuses saves from the future and garbage', () => {
    expect(migrateSave({ version: SAVE_VERSION + 1, state: {} })).toBeNull();
    expect(migrateSave('nonsense')).toBeNull();
    expect(migrateSave(null)).toBeNull();
    expect(migrateSave({ version: SAVE_VERSION })).toBeNull();
  });

  it('keeps working when storage throws, as in some incognito windows', () => {
    const fail = (): never => {
      throw new Error('denied');
    };
    const broken: StorageLike = { getItem: fail, setItem: fail, removeItem: fail };
    const store = new SaveStore(broken);
    expect(store.available).toBe(false);
    expect(store.load()).toBeNull();
    expect(store.save(newGameState())).toBe(false);
    expect(store.loadSettings().sound).toBe(true);
  });

  it('fills in new settings for players who saved settings before them', () => {
    const storage = memoryStorage();
    storage.setItem('thunder-knight.settings', JSON.stringify({ sound: false, sensitivity: 1.4 }));
    const settings = new SaveStore(storage).loadSettings();
    expect(settings.sound).toBe(false);
    expect(settings.sensitivity).toBe(1.4);
    expect(settings.autoFireTouch).toBe(true);
    expect(settings.quality).toBe('auto');
  });

  it('still loads every released save fixture with every field', () => {
    const dir = new URL('./fixtures/saves/', import.meta.url);
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);
    const fresh = newGameState();
    for (const file of files) {
      const loaded = migrateSave(JSON.parse(readFileSync(new URL(file, dir), 'utf8')));
      expect([file, loaded !== null]).toEqual([file, true]);
      for (const key of Object.keys(fresh)) expect([file, key, key in loaded!.state]).toEqual([file, key, true]);
    }
  });
});
