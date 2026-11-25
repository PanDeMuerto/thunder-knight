/**
 * Everything the game saves (tech design §5.12). Plain data only: rules that change it live in `state/` as functions,
 * with tests. Fields added later need a default in `newGameState`; old saves get it automatically
 * (save/saveStore.ts). Ids are plain strings until the content tables arrive (M3), then they narrow to unions.
 */

export type BattleId = string;
export type GunId = string;
export type SupportId = string;
export type FieldId = string;

export interface BattleRecord {
  won: boolean;
  /** 0 to 3 (GDD §13.3). */
  crowns: number;
  /** Defeats in a row on this battle, for the quiet comeback help (GDD §4.8). */
  defeatsInRow: number;
}

export interface GameState {
  gold: number;
  battles: Record<BattleId, BattleRecord>;
  /** Owned guns and their level, 1 to 5. */
  guns: Record<GunId, number>;
  /** The equipped slots. The second opens at Battle 6. */
  hand: [GunId, GunId | null];
  support: { owned: Record<SupportId, number>; equipped: SupportId | null };
  hero: { health: number; speed: number; grenades: number; magnet: number };
  army: { militia: number; archers: number; menAtArms: number; knights: number; banner: number };
  /** Onboarding and in-context lessons already shown, by id (controls per device class: `move:touch`). */
  seenLessons: string[];
  stats: { knockouts: number; routs: number; playSeconds: number; battlesWon: number };
  /** Best wave reached in Last Stand, by field. */
  lastStand: Record<FieldId, number>;
}

export const STARTING_GOLD = 50;

export function newGameState(): GameState {
  return {
    gold: STARTING_GOLD,
    battles: {},
    guns: { pistol: 1 },
    hand: ['pistol', null],
    support: { owned: {}, equipped: null },
    hero: { health: 0, speed: 0, grenades: 0, magnet: 0 },
    army: { militia: 0, archers: 0, menAtArms: 0, knights: 0, banner: 0 },
    seenLessons: [],
    stats: { knockouts: 0, routs: 0, playSeconds: 0, battlesWon: 0 },
    lastStand: {},
  };
}
