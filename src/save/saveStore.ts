import type { QualitySetting } from '@/render/stage';
import { newGameState, type GameState } from '@/state/gameState';

export const SAVE_VERSION = 1;
const SAVE_KEY = 'thunder-knight.save';
const SETTINGS_KEY = 'thunder-knight.settings';
// Poki's cloud save skips keys starting poki_ignore, so the probe never syncs.
const PROBE_KEY = 'poki_ignore.thunder-knight.probe';

export interface SaveData {
  version: number;
  state: GameState;
}

/** The player's settings (GDD §15.7). Saved under their own key, merged over the defaults. */
export interface Settings {
  sound: boolean;
  /** Effects volume, 0 to 1. Zero is the same as sound off. */
  volume: number;
  /** Music volume, 0 to 1. */
  music: number;
  /** Look speed multiplier, 0.5 to 2. */
  sensitivity: number;
  invertY: boolean;
  /** Fire while the crosshair is on an enemy. On by default on touch, off with a mouse. */
  autoFireTouch: boolean;
  autoFireMouse: boolean;
  /** Touch only. */
  aimAssist: 'off' | 'normal' | 'strong';
  waveIntros: 'full' | 'short' | 'off';
  shake: 'off' | 'low' | 'full';
  /** Shortens reveal shots, turns shake off and stops flashing. */
  reducedMotion: boolean;
  /** Touch only: the stick on the right and the buttons on the left. */
  leftHanded: boolean;
  vibration: boolean;
  /** HUD text and icon size, 1 to 1.5, as far as the screen has room (render/stage.ts). */
  hudScale: number;
  language: string | null;
  /** Graphics: `auto` (benchmarked) or a fixed quality tier (render/stage.ts). */
  quality: QualitySetting;
}

const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  volume: 1,
  music: 0.7,
  sensitivity: 1,
  invertY: false,
  autoFireTouch: true,
  autoFireMouse: false,
  aimAssist: 'normal',
  waveIntros: 'full',
  shake: 'full',
  // Follows the system's setting until the player picks one.
  reducedMotion: prefersReducedMotion(),
  leftHanded: false,
  vibration: true,
  hudScale: 1,
  language: null,
  quality: 'auto',
};

/** The small part of the Storage interface we use, so tests can pass a fake. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Each step upgrades a save from version N to N + 1. Add one whenever SaveData changes shape, a test in
 * `tests/save.test.ts`, and keep the last released version's fixture in `tests/fixtures/saves/`. Fields added to
 * GameState with a default need no step.
 */
const MIGRATIONS: Record<number, (save: Record<string, unknown>) => Record<string, unknown>> = {};

export function migrateSave(raw: unknown): SaveData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  let save = raw as Record<string, unknown>;
  let version = typeof save.version === 'number' ? save.version : 0;
  if (version < 1 || version > SAVE_VERSION) return null;
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return null;
    save = step(save);
    version += 1;
    save.version = version;
  }
  const data = save as unknown as SaveData;
  if (typeof data.state !== 'object' || data.state === null) return null;
  const fresh = newGameState();
  const s = data.state as Partial<GameState>;
  // Fields added to GameState later get default values on old saves; nested groups merge field by field.
  return {
    version: SAVE_VERSION,
    state: {
      ...fresh,
      ...s,
      gold: Number.isFinite(s.gold) ? Math.max(0, s.gold!) : fresh.gold,
      battles: { ...s.battles },
      guns: { ...fresh.guns, ...s.guns },
      hand: Array.isArray(s.hand) && typeof s.hand[0] === 'string' ? [s.hand[0], s.hand[1] ?? null] : fresh.hand,
      support: { ...fresh.support, ...s.support, owned: { ...s.support?.owned } },
      hero: { ...fresh.hero, ...s.hero },
      army: { ...fresh.army, ...s.army },
      seenLessons: Array.isArray(s.seenLessons) ? [...s.seenLessons] : [],
      stats: { ...fresh.stats, ...s.stats },
      lastStand: { ...s.lastStand },
    },
  };
}

/** All storage goes through here, because storage can throw in incognito or embedded contexts. */
export class SaveStore {
  readonly available: boolean;

  constructor(private readonly storage: StorageLike | null) {
    this.available = SaveStore.probe(storage);
  }

  static fromWindow(): SaveStore {
    try {
      return new SaveStore(window.localStorage);
    } catch {
      return new SaveStore(null);
    }
  }

  private static probe(storage: StorageLike | null): boolean {
    if (!storage) return false;
    try {
      storage.setItem(PROBE_KEY, '1');
      storage.removeItem(PROBE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  private read(key: string): string | null {
    try {
      return this.storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): boolean {
    try {
      this.storage?.setItem(key, value);
      return this.available;
    } catch {
      return false;
    }
  }

  load(): SaveData | null {
    const text = this.read(SAVE_KEY);
    if (!text) return null;
    try {
      return migrateSave(JSON.parse(text));
    } catch {
      return null;
    }
  }

  save(state: GameState): boolean {
    return this.write(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, state }));
  }

  clear(): void {
    try {
      this.storage?.removeItem(SAVE_KEY);
    } catch {
      // Nothing to do. A failed clear only means the old save stays.
    }
  }

  loadSettings(): Settings {
    const text = this.read(SETTINGS_KEY);
    if (!text) return { ...DEFAULT_SETTINGS };
    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(text) as Partial<Settings>) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  saveSettings(settings: Settings): void {
    this.write(SETTINGS_KEY, JSON.stringify(settings));
  }
}
