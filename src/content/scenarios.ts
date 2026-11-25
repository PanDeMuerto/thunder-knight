import type { SquadSpec } from '@/crowd/crowdSim';
import type { SoldierType } from './soldiers';

/**
 * Test scenarios for the crowd (M2), until battles arrive from `content/battles.ts` in M3. Counts are written for the
 * High tier's 300 soldiers and scaled down to the device's cap. Enemies come from the north edge (−Z) and march to
 * the banner; allies hold a crescent in front of it (GDD §10).
 */
export interface Scenario {
  squads: SquadSpec[];
  /** Keep each side topped up to this share of the cap, with new squads from these places. */
  topUp?: {
    enemies: number;
    allies: number;
    enemyEdgeZ: number;
    allyFromZ: number;
    enemySquads: { type: SoldierType; count: number; captain?: boolean; formation: SquadSpec['formation'] }[];
  };
  /** Bring the whole scenario back when every enemy is beaten. */
  repeat?: boolean;
}

const NORTH = Math.PI;
const SOUTH = 0;

export const SCENARIOS: Record<'clash' | 'march' | 'none', Scenario> = {
  // 150 against 150 at the banner: the M2 budget test (`npm run perf`).
  clash: {
    squads: [
      { type: 'militia', count: 36, formation: 'crescent', x: -11, z: -23, facing: SOUTH, order: 'hold' },
      { type: 'militia', count: 36, formation: 'crescent', x: 11, z: -23, facing: SOUTH, order: 'hold' },
      { type: 'allyManAtArms', count: 30, formation: 'block', x: 0, z: -22, facing: SOUTH, order: 'hold' },
      { type: 'militia', count: 24, formation: 'mob', x: -22, z: -17, facing: SOUTH, order: 'hold' },
      // Archers on the hill's shoulders, leaving its top (and the camera's view) to the hero.
      { type: 'allyArcher', count: 12, formation: 'line', x: -15, z: -7, facing: SOUTH, order: 'hold' },
      { type: 'allyArcher', count: 12, formation: 'line', x: 15, z: -7, facing: SOUTH, order: 'hold' },
      { type: 'footman', count: 29, formation: 'block', x: -24, z: -50, facing: NORTH, order: 'attack', captain: true },
      { type: 'footman', count: 29, formation: 'block', x: 0, z: -52, facing: NORTH, order: 'attack', captain: true },
      { type: 'footman', count: 29, formation: 'block', x: 24, z: -50, facing: NORTH, order: 'attack', captain: true },
      { type: 'peasant', count: 30, formation: 'mob', x: -8, z: -46, facing: NORTH, order: 'attack' },
      { type: 'archer', count: 15, formation: 'line', x: -14, z: -57, facing: NORTH, order: 'attack' },
      { type: 'archer', count: 15, formation: 'line', x: 14, z: -57, facing: NORTH, order: 'attack' },
    ],
    topUp: {
      enemies: 0.5,
      allies: 0.5,
      enemyEdgeZ: -55,
      allyFromZ: 14,
      enemySquads: [
        { type: 'footman', count: 17, captain: true, formation: 'block' },
        { type: 'footman', count: 20, formation: 'block' },
        { type: 'peasant', count: 18, formation: 'mob' },
        { type: 'archer', count: 10, formation: 'line' },
      ],
    },
  },
  // The high-ground test from M1, now with real soldiers: a block of 60 and a captain marching up the banner hill.
  march: {
    squads: [
      { type: 'footman', count: 59, formation: 'block', x: 0, z: -56, facing: NORTH, order: 'attack', captain: true },
      { type: 'peasant', count: 12, formation: 'mob', x: 18, z: -48, facing: NORTH, order: 'attack' },
      { type: 'archer', count: 8, formation: 'line', x: -16, z: -58, facing: NORTH, order: 'attack' },
    ],
    repeat: true,
  },
  none: { squads: [] },
};

export type ScenarioName = keyof typeof SCENARIOS;

/** Dev scenes for `?scene=` and `npm run shots`: where the hero stands, what it looks at, and which scenario runs. */
export const SCENES = {
  /** The default start: behind the banner hill, looking toward it, with the clash ahead. */
  start: { x: 0, z: 4, lookX: 0, lookZ: -12, pitch: null, scenario: 'clash' },
  /** On the hilltop by the banner, looking down at the march (the high-ground test). */
  hill: { x: 1.2, z: -10.5, lookX: 0, lookZ: -40, pitch: -14, scenario: 'march' },
  /** On the hilltop above the clash. */
  clash: { x: 1.5, z: -9, lookX: 0, lookZ: -40, pitch: -13, scenario: 'clash' },
  /** In the front line, among the allies. */
  front: { x: 3, z: -19, lookX: 0, lookZ: -45, pitch: -8, scenario: 'clash' },
  /** An empty field. */
  empty: { x: 0, z: 4, lookX: 0, lookZ: -12, pitch: null, scenario: 'none' },
} as const satisfies Record<string, { scenario: ScenarioName } & Record<string, unknown>>;

export type SceneName = keyof typeof SCENES;
