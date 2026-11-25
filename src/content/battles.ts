import { t, type StringKey } from '@/content/strings';
import type { Formation } from '@/crowd/formations';
import { SOLDIERS, type SoldierType } from './soldiers';

/**
 * The campaign's battles (GDD §13.2). Each wave is a list of squads that enter at an edge after `at` seconds; the
 * director plays them under the device's soldier cap (tech design §5.7). Battles 1–5 (Region 1) are playable on the
 * greybox field; the rest are on the map, locked, until their milestones build them.
 */

/** Where squads come from. The enemy edge is north (−Z); the banner is near the middle, the truck south of it. */
export type Edge = 'north' | 'northWest' | 'northEast' | 'west' | 'east';

export interface SquadDef {
  /** Seconds after the wave starts. */
  at: number;
  edge: Edge;
  /** Metres along the edge from its middle (positive is east, or south for the side edges). */
  offset?: number;
  type: SoldierType;
  count: number;
  formation: Formation;
  /** Led by a captain, who routs the squad when knocked out (GDD §4.4). */
  captain?: boolean;
  /** An elite captain leads it (Region 4, GDD §4.4): twice the health, and his fall routs the squad within 25 m. */
  elite?: boolean;
  /**
   * Onboarding holds the squad until the player is ready (onboarding §4: scripted spawns wait for the player). Without
   * the tutorial (replays) it enters at `at` as usual.
   */
  cue?: string;
}

export interface WaveDef {
  squads: SquadDef[];
  /** A boss wave: squads that charge in when the boss falls below half health (GDD §9.3: "Captains join"). */
  bossHalf?: SquadDef[];
}

export interface BattleDef {
  /** 1 to 20. */
  id: number;
  name: string;
  region: 1 | 2 | 3 | 4;
  /** Allies standing at the banner when the battle starts (GDD §10; the Army tab adds to these). */
  militia: number;
  waves: WaveDef[];
  /** Waves, shown on the map before a battle is built. */
  plannedWaves: number;
  /** What's new here, for the map's battle card (GDD §13.2). */
  newThing: string;
  /** Playable in this build. */
  ready: boolean;
}

/** Spawn points on the greybox field (M7's fields carry their own). */
export const EDGES: Record<Edge, { x: number; z: number; alongX: number; alongZ: number }> = {
  north: { x: 0, z: -55, alongX: 1, alongZ: 0 },
  northWest: { x: -42, z: -50, alongX: 0.7, alongZ: 0.7 },
  northEast: { x: 42, z: -50, alongX: 0.7, alongZ: -0.7 },
  west: { x: -55, z: -26, alongX: 0, alongZ: 1 },
  east: { x: 55, z: -26, alongX: 0, alongZ: 1 },
};

const W = (squads: SquadDef[], bossHalf?: SquadDef[]): WaveDef => (bossHalf ? { squads, bossHalf } : { squads });

const PLANNED: [string, 1 | 2 | 3 | 4, number, string][] = [
  ['The Mill', 1, 3, 'Peasants and their captain'],
  ['Turnip Field', 1, 3, 'Footmen, grenades, militia'],
  ['Old Stone Bridge', 1, 4, 'Archers, the Hero tab, the banner'],
  ['Hollow Farm', 1, 4, 'Shield Wall, shotgun, rift crate'],
  ["Grudge's Hill", 1, 5, 'Sir Grudge'],
  ['Ford of Reeds', 2, 5, 'Riders, SMG, second gun'],
  ['Marsh Village', 2, 5, 'Firebrands'],
  ['The Ferry', 2, 5, 'Rift Strike, assault rifle'],
  ['Willow Palisade', 2, 6, 'Men-at-Arms'],
  ['The Long Road', 2, 6, 'The War Wagon'],
  ['Pine Gate', 3, 6, 'The Brute'],
  ['Old Watchtower', 3, 6, 'Battering ram, machine gun'],
  ["Shepherd's Rest", 3, 6, 'Knights, Sentry Gun'],
  ['Cliffside', 3, 7, 'Catapults, grenade launcher'],
  ['Pass of Echoes', 3, 7, 'The Siege Tower'],
  ['Burnt Orchard', 4, 7, 'Minigun'],
  ['Moat Road', 4, 7, 'Rams and catapults'],
  ['The Gatehouse', 4, 8, 'Elite captains, rockets'],
  ['Inner Bailey', 4, 8, 'Everything'],
  ['The Iron Keep', 4, 7, 'The Iron Baron'],
];

/** The waves of the battles built so far. */
const WAVES: Record<number, WaveDef[]> = {
  // Battle 1, The Mill (onboarding §4): a scout and a loose mob; two mobs; a captain's band.
  1: [
    W([
      { at: 0, edge: 'north', offset: -14, type: 'peasant', count: 1, formation: 'mob', cue: 'scout' },
      { at: 4, edge: 'north', offset: 4, type: 'peasant', count: 9, formation: 'mob', cue: 'mob' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'peasant', count: 7, formation: 'mob' },
      { at: 3, edge: 'northEast', type: 'peasant', count: 7, formation: 'mob' },
    ]),
    W([{ at: 0, edge: 'north', type: 'peasant', count: 16, formation: 'mob', captain: true }]),
  ],
  // Battle 2, Turnip Field: footmen in blocks join the peasants.
  2: [
    W([
      { at: 0, edge: 'north', offset: -10, type: 'peasant', count: 8, formation: 'mob' },
      { at: 5, edge: 'north', offset: 10, type: 'footman', count: 8, formation: 'block' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'footman', count: 8, formation: 'block' },
      { at: 2, edge: 'north', type: 'peasant', count: 6, formation: 'mob' },
      { at: 6, edge: 'northEast', type: 'footman', count: 8, formation: 'block' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'footman', count: 14, formation: 'block', captain: true },
      { at: 4, edge: 'northWest', type: 'peasant', count: 10, formation: 'mob' },
    ]),
  ],
  // Battle 3, Old Stone Bridge: archers stop at range and volley.
  3: [
    W([
      { at: 0, edge: 'north', offset: 6, type: 'footman', count: 8, formation: 'block' },
      { at: 3, edge: 'north', offset: -12, type: 'archer', count: 4, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'peasant', count: 12, formation: 'mob' },
      { at: 3, edge: 'north', type: 'footman', count: 10, formation: 'block' },
      { at: 6, edge: 'northEast', type: 'archer', count: 4, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'footman', count: 14, formation: 'block', captain: true },
      { at: 5, edge: 'north', offset: 14, type: 'archer', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'footman', count: 12, formation: 'block', captain: true },
      { at: 2, edge: 'northEast', type: 'footman', count: 12, formation: 'block', captain: true },
      { at: 6, edge: 'north', type: 'peasant', count: 8, formation: 'mob' },
      { at: 8, edge: 'north', offset: -8, type: 'archer', count: 6, formation: 'line' },
    ]),
  ],
  // Region 2, the Riverlands (M9 part 1). Enemies have 1.6× health and drop 1.5× gold (GDD §9.1).
  // Battle 6, Ford of Reeds: riders trot in, then charge the hero or the banner in lines. The shotgun knocks them off.
  6: [
    W([
      { at: 0, edge: 'north', offset: -8, type: 'peasant', count: 10, formation: 'mob' },
      { at: 3, edge: 'north', offset: 8, type: 'footman', count: 8, formation: 'block' },
      { at: 8, edge: 'northEast', type: 'rider', count: 3, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'footman', count: 10, formation: 'block' },
      { at: 4, edge: 'northWest', type: 'archer', count: 4, formation: 'line' },
      { at: 8, edge: 'north', offset: 12, type: 'rider', count: 4, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'footman', count: 12, formation: 'block', captain: true },
      { at: 4, edge: 'northEast', type: 'shieldWall', count: 6, formation: 'line' },
      { at: 9, edge: 'northWest', type: 'rider', count: 4, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'peasant', count: 12, formation: 'mob' },
      { at: 3, edge: 'north', offset: 10, type: 'archer', count: 6, formation: 'line' },
      { at: 6, edge: 'northEast', type: 'rider', count: 4, formation: 'line' },
      { at: 12, edge: 'northWest', type: 'rider', count: 4, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'footman', count: 14, formation: 'block', captain: true },
      { at: 4, edge: 'northEast', type: 'shieldWall', count: 6, formation: 'line' },
      { at: 8, edge: 'north', offset: -12, type: 'archer', count: 4, formation: 'line' },
      { at: 10, edge: 'northWest', type: 'rider', count: 6, formation: 'line' },
    ]),
  ],
  // Battle 7, Marsh Village: firebrands sprint at the hero or the banner and burst. Shoot them early.
  7: [
    W([
      { at: 0, edge: 'north', offset: 8, type: 'footman', count: 10, formation: 'block' },
      { at: 5, edge: 'north', offset: -10, type: 'firebrand', count: 3, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'peasant', count: 12, formation: 'mob' },
      { at: 3, edge: 'northEast', type: 'firebrand', count: 4, formation: 'mob' },
      { at: 6, edge: 'north', type: 'archer', count: 4, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'footman', count: 12, formation: 'block', captain: true },
      { at: 4, edge: 'northWest', type: 'firebrand', count: 5, formation: 'mob' },
      { at: 9, edge: 'northEast', type: 'rider', count: 4, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'shieldWall', count: 6, formation: 'line' },
      { at: 3, edge: 'northEast', type: 'firebrand', count: 5, formation: 'mob' },
      { at: 6, edge: 'northWest', type: 'footman', count: 10, formation: 'block' },
      { at: 10, edge: 'north', offset: 10, type: 'firebrand', count: 4, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'footman', count: 14, formation: 'block', captain: true },
      { at: 4, edge: 'northWest', type: 'firebrand', count: 6, formation: 'mob' },
      { at: 8, edge: 'northEast', type: 'rider', count: 5, formation: 'line' },
      { at: 12, edge: 'north', offset: -10, type: 'archer', count: 5, formation: 'line' },
    ]),
  ],
  // Battle 8, The Ferry (M9 part 2): big blocks for Rosie's Rift Strike, and the assault rifle in the shop.
  8: [
    W([
      { at: 0, edge: 'north', type: 'footman', count: 12, formation: 'block' },
      { at: 4, edge: 'northWest', type: 'peasant', count: 10, formation: 'mob' },
      { at: 8, edge: 'northEast', type: 'archer', count: 4, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'footman', count: 12, formation: 'block', captain: true },
      { at: 5, edge: 'northEast', type: 'rider', count: 4, formation: 'line' },
      { at: 9, edge: 'northWest', type: 'firebrand', count: 3, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'shieldWall', count: 8, formation: 'line' },
      { at: 3, edge: 'north', offset: 10, type: 'footman', count: 12, formation: 'block' },
      { at: 7, edge: 'northWest', type: 'archer', count: 5, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'peasant', count: 14, formation: 'mob' },
      { at: 3, edge: 'north', type: 'footman', count: 12, formation: 'block', captain: true },
      { at: 8, edge: 'northEast', type: 'rider', count: 5, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'footman', count: 14, formation: 'block', captain: true },
      { at: 3, edge: 'northWest', type: 'shieldWall', count: 6, formation: 'line' },
      { at: 6, edge: 'northEast', type: 'firebrand', count: 5, formation: 'mob' },
      { at: 9, edge: 'north', offset: -12, type: 'rider', count: 5, formation: 'line' },
      { at: 12, edge: 'north', offset: 12, type: 'archer', count: 5, formation: 'line' },
    ]),
  ],
  // Battle 9, Willow Palisade: the Baron's men-at-arms in full plate (light guns do half), and the Queen's own.
  9: [
    W([
      { at: 0, edge: 'north', offset: 8, type: 'footman', count: 10, formation: 'block' },
      { at: 4, edge: 'north', offset: -8, type: 'manAtArms', count: 4, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'peasant', count: 12, formation: 'mob' },
      { at: 3, edge: 'north', type: 'manAtArms', count: 6, formation: 'block' },
      { at: 7, edge: 'northEast', type: 'archer', count: 4, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'manAtArms', count: 6, formation: 'block', captain: true },
      { at: 5, edge: 'northEast', type: 'rider', count: 4, formation: 'line' },
      { at: 9, edge: 'northWest', type: 'firebrand', count: 4, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'shieldWall', count: 6, formation: 'line' },
      { at: 3, edge: 'northWest', type: 'manAtArms', count: 6, formation: 'block' },
      { at: 6, edge: 'northEast', type: 'footman', count: 10, formation: 'block' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'footman', count: 14, formation: 'block', captain: true },
      { at: 4, edge: 'northEast', type: 'manAtArms', count: 8, formation: 'block' },
      { at: 8, edge: 'northWest', type: 'archer', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'manAtArms', count: 10, formation: 'block', captain: true },
      { at: 4, edge: 'northWest', type: 'rider', count: 6, formation: 'line' },
      { at: 8, edge: 'northEast', type: 'firebrand', count: 5, formation: 'mob' },
      { at: 11, edge: 'north', offset: 12, type: 'shieldWall', count: 6, formation: 'line' },
    ]),
  ],
  // Battle 10, The Long Road (M9 part 3): five waves on the road, the last shop, then the War Wagon (GDD §9.3).
  10: [
    W([
      { at: 0, edge: 'north', type: 'footman', count: 12, formation: 'block' },
      { at: 4, edge: 'northEast', type: 'rider', count: 4, formation: 'line' },
      { at: 8, edge: 'northWest', type: 'archer', count: 4, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'peasant', count: 14, formation: 'mob' },
      { at: 3, edge: 'northEast', type: 'firebrand', count: 4, formation: 'mob' },
      { at: 7, edge: 'north', type: 'manAtArms', count: 4, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'footman', count: 12, formation: 'block', captain: true },
      { at: 4, edge: 'northWest', type: 'shieldWall', count: 6, formation: 'line' },
      { at: 8, edge: 'northEast', type: 'rider', count: 5, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'manAtArms', count: 8, formation: 'block', captain: true },
      { at: 4, edge: 'northEast', type: 'firebrand', count: 5, formation: 'mob' },
      { at: 8, edge: 'northWest', type: 'archer', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'footman', count: 14, formation: 'block', captain: true },
      { at: 4, edge: 'northWest', type: 'rider', count: 6, formation: 'line' },
      { at: 9, edge: 'northEast', type: 'shieldWall', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'warWagon', count: 1, formation: 'block' },
      { at: 3, edge: 'northWest', type: 'footman', count: 10, formation: 'block' },
      { at: 6, edge: 'northEast', type: 'archer', count: 4, formation: 'line' },
    ]),
  ],
  // Battle 11, Pine Gate (M9 part 4): Region 3 opens with the Brute, a champion who charges down a glowing lane (step
  // aside), alone in wave 2, with a shield wall in wave 4, and two at once in the last wave. Eased in M9 part 5 (fewer
  // shield-wall men, archers, footmen and firebrands): it was the hardest battle in the bot's runs, harder than 12–14.
  11: [
    W([
      { at: 0, edge: 'north', type: 'footman', count: 12, formation: 'block', captain: true },
      { at: 4, edge: 'northWest', type: 'peasant', count: 12, formation: 'mob' },
      { at: 8, edge: 'northEast', type: 'archer', count: 4, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'brute', count: 1, formation: 'mob' },
      { at: 5, edge: 'northWest', type: 'footman', count: 8, formation: 'block' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'manAtArms', count: 8, formation: 'block', captain: true },
      { at: 4, edge: 'northEast', type: 'rider', count: 5, formation: 'line' },
      { at: 8, edge: 'northWest', type: 'firebrand', count: 4, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'brute', count: 1, formation: 'mob' },
      { at: 3, edge: 'northEast', type: 'shieldWall', count: 5, formation: 'line' },
      { at: 7, edge: 'northWest', type: 'archer', count: 4, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'footman', count: 12, formation: 'block', captain: true },
      { at: 4, edge: 'northWest', type: 'rider', count: 6, formation: 'line' },
      { at: 8, edge: 'northEast', type: 'manAtArms', count: 6, formation: 'block' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'brute', count: 1, formation: 'mob' },
      { at: 2, edge: 'northEast', type: 'brute', count: 1, formation: 'mob' },
      { at: 5, edge: 'north', type: 'footman', count: 8, formation: 'block' },
      { at: 9, edge: 'north', offset: 12, type: 'firebrand', count: 3, formation: 'mob' },
    ]),
  ],
  // Battle 12, Old Watchtower: battering rams roll at the banner (down their crew, or grenade them), and the machine
  // gun goes on sale after it.
  12: [
    W([
      { at: 0, edge: 'north', type: 'manAtArms', count: 10, formation: 'block', captain: true },
      { at: 4, edge: 'northWest', type: 'archer', count: 6, formation: 'line' },
      { at: 7, edge: 'northEast', type: 'peasant', count: 10, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'ram', count: 1, formation: 'block' },
      { at: 4, edge: 'northEast', type: 'footman', count: 8, formation: 'block' },
      { at: 8, edge: 'northWest', type: 'archer', count: 4, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'rider', count: 5, formation: 'line' },
      { at: 3, edge: 'north', type: 'brute', count: 1, formation: 'mob' },
      { at: 8, edge: 'northEast', type: 'firebrand', count: 3, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'north', offset: -10, type: 'ram', count: 1, formation: 'block' },
      { at: 3, edge: 'north', offset: 10, type: 'shieldWall', count: 8, formation: 'line' },
      { at: 7, edge: 'northWest', type: 'manAtArms', count: 6, formation: 'block' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'footman', count: 14, formation: 'block', captain: true },
      { at: 4, edge: 'northEast', type: 'brute', count: 1, formation: 'mob' },
      { at: 8, edge: 'northWest', type: 'rider', count: 5, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'ram', count: 1, formation: 'block' },
      { at: 3, edge: 'northWest', type: 'brute', count: 1, formation: 'mob' },
      { at: 6, edge: 'northEast', type: 'manAtArms', count: 6, formation: 'block', captain: true },
      { at: 9, edge: 'north', offset: 12, type: 'archer', count: 6, formation: 'line' },
    ]),
  ],
  // Battle 13, Shepherd's Rest (M9 part 5): no new enemy; the Queen's knights join the Army tab, and from wave 2
  // Rosie lends her Sentry Gun for the battle. Brutes and rams return together.
  13: [
    W([
      { at: 0, edge: 'north', type: 'footman', count: 12, formation: 'block', captain: true },
      { at: 4, edge: 'northWest', type: 'peasant', count: 12, formation: 'mob' },
      { at: 8, edge: 'northEast', type: 'archer', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'manAtArms', count: 8, formation: 'block', captain: true },
      { at: 4, edge: 'northWest', type: 'rider', count: 6, formation: 'line' },
      { at: 8, edge: 'northEast', type: 'firebrand', count: 4, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'brute', count: 1, formation: 'mob' },
      { at: 4, edge: 'northEast', type: 'footman', count: 10, formation: 'block' },
      { at: 7, edge: 'northWest', type: 'archer', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'ram', count: 1, formation: 'block' },
      { at: 3, edge: 'northWest', type: 'shieldWall', count: 8, formation: 'line' },
      { at: 7, edge: 'northEast', type: 'rider', count: 5, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'footman', count: 14, formation: 'block', captain: true },
      { at: 4, edge: 'northEast', type: 'manAtArms', count: 6, formation: 'block' },
      { at: 8, edge: 'northWest', type: 'firebrand', count: 5, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'brute', count: 1, formation: 'mob' },
      { at: 3, edge: 'north', type: 'ram', count: 1, formation: 'block' },
      { at: 6, edge: 'northEast', type: 'manAtArms', count: 6, formation: 'block', captain: true },
      { at: 9, edge: 'north', offset: 12, type: 'archer', count: 6, formation: 'line' },
    ]),
  ],
  // Battle 14, Cliffside: catapults roll in to the far edge and lob boulders (watch the shadows; down their crews),
  // one at a time, then in pairs. The grenade launcher goes on sale.
  14: [
    W([
      { at: 0, edge: 'north', type: 'footman', count: 12, formation: 'block', captain: true },
      { at: 4, edge: 'northEast', type: 'archer', count: 6, formation: 'line' },
      { at: 7, edge: 'northWest', type: 'peasant', count: 10, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'northEast', type: 'catapult', count: 1, formation: 'block' },
      { at: 3, edge: 'north', type: 'footman', count: 10, formation: 'block' },
      { at: 7, edge: 'northWest', type: 'archer', count: 4, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'rider', count: 6, formation: 'line' },
      { at: 4, edge: 'north', type: 'manAtArms', count: 8, formation: 'block', captain: true },
      { at: 8, edge: 'northEast', type: 'firebrand', count: 4, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'catapult', count: 1, formation: 'block' },
      { at: 3, edge: 'north', type: 'shieldWall', count: 8, formation: 'line' },
      { at: 8, edge: 'northEast', type: 'brute', count: 1, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'footman', count: 14, formation: 'block', captain: true },
      { at: 4, edge: 'northEast', type: 'ram', count: 1, formation: 'block' },
      { at: 8, edge: 'northWest', type: 'archer', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'northEast', type: 'catapult', count: 1, formation: 'block' },
      { at: 2, edge: 'northWest', type: 'catapult', count: 1, formation: 'block' },
      { at: 5, edge: 'north', type: 'manAtArms', count: 8, formation: 'block' },
      { at: 9, edge: 'north', offset: 12, type: 'rider', count: 5, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'brute', count: 1, formation: 'mob' },
      { at: 3, edge: 'northEast', type: 'catapult', count: 1, formation: 'block' },
      { at: 6, edge: 'northWest', type: 'footman', count: 12, formation: 'block', captain: true },
      { at: 10, edge: 'northEast', type: 'firebrand', count: 5, formation: 'mob' },
    ]),
  ],
  // Battle 15, Pass of Echoes (M9 part 6): everything the Highland Pass has shown, the last shop, then the Siege Tower
  // (GDD §9.3), with footmen and archers beside it and more stepping out of its doors.
  15: [
    W([
      { at: 0, edge: 'north', type: 'footman', count: 14, formation: 'block', captain: true },
      { at: 4, edge: 'northWest', type: 'archer', count: 6, formation: 'line' },
      { at: 7, edge: 'northEast', type: 'peasant', count: 10, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'northEast', type: 'catapult', count: 1, formation: 'block' },
      { at: 4, edge: 'north', type: 'ram', count: 1, formation: 'block' },
      { at: 8, edge: 'northWest', type: 'archer', count: 4, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'brute', count: 1, formation: 'mob' },
      { at: 3, edge: 'northWest', type: 'rider', count: 6, formation: 'line' },
      { at: 8, edge: 'northEast', type: 'firebrand', count: 4, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'manAtArms', count: 10, formation: 'block', captain: true },
      { at: 4, edge: 'northEast', type: 'shieldWall', count: 8, formation: 'line' },
      { at: 6, edge: 'northWest', type: 'catapult', count: 1, formation: 'block' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'brute', count: 1, formation: 'mob' },
      { at: 4, edge: 'northEast', type: 'brute', count: 1, formation: 'mob' },
      { at: 7, edge: 'north', type: 'footman', count: 12, formation: 'block' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'ram', count: 1, formation: 'block' },
      { at: 3, edge: 'northEast', type: 'catapult', count: 1, formation: 'block' },
      { at: 6, edge: 'northWest', type: 'manAtArms', count: 8, formation: 'block', captain: true },
      { at: 9, edge: 'north', offset: 12, type: 'archer', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'siegeTower', count: 1, formation: 'block' },
      { at: 4, edge: 'northWest', type: 'footman', count: 10, formation: 'block' },
      { at: 8, edge: 'northEast', type: 'archer', count: 6, formation: 'line' },
    ]),
  ],
  // Region 4, the Iron Keep (M9 part 7). Battle 16, Burnt Orchard: no new enemy; the Baron's lands are tougher again
  // and the minigun goes on sale. Brutes in pairs at the end.
  16: [
    W([
      { at: 0, edge: 'north', type: 'footman', count: 14, formation: 'block', captain: true },
      { at: 4, edge: 'northWest', type: 'peasant', count: 12, formation: 'mob' },
      { at: 7, edge: 'northEast', type: 'archer', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'manAtArms', count: 10, formation: 'block', captain: true },
      { at: 4, edge: 'northEast', type: 'rider', count: 6, formation: 'line' },
      { at: 8, edge: 'northWest', type: 'firebrand', count: 4, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'brute', count: 1, formation: 'mob' },
      { at: 3, edge: 'northWest', type: 'shieldWall', count: 8, formation: 'line' },
      { at: 7, edge: 'northEast', type: 'archer', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'footman', count: 14, formation: 'block', captain: true },
      { at: 4, edge: 'northEast', type: 'footman', count: 12, formation: 'block', captain: true },
      { at: 8, edge: 'north', type: 'firebrand', count: 5, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'northEast', type: 'catapult', count: 1, formation: 'block' },
      { at: 3, edge: 'north', type: 'manAtArms', count: 8, formation: 'block' },
      { at: 7, edge: 'northWest', type: 'rider', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'ram', count: 1, formation: 'block' },
      { at: 4, edge: 'northWest', type: 'brute', count: 1, formation: 'mob' },
      { at: 8, edge: 'northEast', type: 'archer', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'brute', count: 1, formation: 'mob' },
      { at: 3, edge: 'northEast', type: 'brute', count: 1, formation: 'mob' },
      { at: 6, edge: 'northWest', type: 'manAtArms', count: 10, formation: 'block', captain: true },
      { at: 10, edge: 'north', offset: 12, type: 'firebrand', count: 5, formation: 'mob' },
    ]),
  ],
  // Battle 17, Moat Road: rams and catapults together (GDD §13.2): a pair of rams, a pair of catapults, then both.
  17: [
    W([
      { at: 0, edge: 'north', type: 'footman', count: 14, formation: 'block', captain: true },
      { at: 4, edge: 'northEast', type: 'archer', count: 6, formation: 'line' },
      { at: 6, edge: 'northWest', type: 'shieldWall', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'ram', count: 1, formation: 'block' },
      { at: 2, edge: 'northEast', type: 'catapult', count: 1, formation: 'block' },
      { at: 6, edge: 'northWest', type: 'footman', count: 8, formation: 'block' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'rider', count: 8, formation: 'line' },
      { at: 4, edge: 'north', type: 'manAtArms', count: 8, formation: 'block', captain: true },
      { at: 8, edge: 'northEast', type: 'firebrand', count: 4, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'north', offset: -10, type: 'ram', count: 1, formation: 'block' },
      { at: 3, edge: 'north', offset: 10, type: 'ram', count: 1, formation: 'block' },
      { at: 7, edge: 'northEast', type: 'archer', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'catapult', count: 1, formation: 'block' },
      { at: 2, edge: 'northEast', type: 'catapult', count: 1, formation: 'block' },
      { at: 5, edge: 'north', type: 'brute', count: 1, formation: 'mob' },
      { at: 9, edge: 'north', type: 'footman', count: 10, formation: 'block' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'footman', count: 16, formation: 'block', captain: true },
      { at: 4, edge: 'northEast', type: 'shieldWall', count: 8, formation: 'line' },
      { at: 8, edge: 'northWest', type: 'rider', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'ram', count: 1, formation: 'block' },
      { at: 2, edge: 'northWest', type: 'catapult', count: 1, formation: 'block' },
      { at: 4, edge: 'northEast', type: 'catapult', count: 1, formation: 'block' },
      { at: 7, edge: 'north', type: 'manAtArms', count: 10, formation: 'block', captain: true },
      { at: 10, edge: 'northEast', type: 'brute', count: 1, formation: 'mob' },
    ]),
  ],
  // Battle 18, The Gatehouse (M9 part 8): elite captains lead the blocks (twice the health, a 25 m rout: knock one out
  // and most of his block runs), and the rocket launcher goes on sale.
  18: [
    W([
      { at: 0, edge: 'north', type: 'footman', count: 14, formation: 'block', captain: true, elite: true },
      { at: 4, edge: 'northWest', type: 'archer', count: 6, formation: 'line' },
      { at: 7, edge: 'northEast', type: 'peasant', count: 10, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'manAtArms', count: 10, formation: 'block', captain: true, elite: true },
      { at: 4, edge: 'northEast', type: 'rider', count: 6, formation: 'line' },
      { at: 8, edge: 'northWest', type: 'firebrand', count: 4, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'ram', count: 1, formation: 'block' },
      { at: 2, edge: 'northEast', type: 'catapult', count: 1, formation: 'block' },
      { at: 5, edge: 'northWest', type: 'shieldWall', count: 8, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'footman', count: 14, formation: 'block', captain: true, elite: true },
      { at: 3, edge: 'northEast', type: 'footman', count: 14, formation: 'block', captain: true, elite: true },
      { at: 7, edge: 'north', type: 'archer', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'brute', count: 1, formation: 'mob' },
      { at: 4, edge: 'northWest', type: 'brute', count: 1, formation: 'mob' },
      { at: 8, edge: 'north', type: 'manAtArms', count: 8, formation: 'block' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'catapult', count: 1, formation: 'block' },
      { at: 2, edge: 'northEast', type: 'catapult', count: 1, formation: 'block' },
      { at: 5, edge: 'north', type: 'rider', count: 8, formation: 'line' },
      { at: 9, edge: 'north', offset: 12, type: 'firebrand', count: 5, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'manAtArms', count: 12, formation: 'block', captain: true, elite: true },
      { at: 4, edge: 'northEast', type: 'shieldWall', count: 8, formation: 'line' },
      { at: 8, edge: 'northWest', type: 'ram', count: 1, formation: 'block' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'brute', count: 1, formation: 'mob' },
      { at: 3, edge: 'northEast', type: 'ram', count: 1, formation: 'block' },
      { at: 6, edge: 'northWest', type: 'footman', count: 16, formation: 'block', captain: true, elite: true },
      { at: 10, edge: 'north', offset: 12, type: 'archer', count: 6, formation: 'line' },
    ]),
  ],
  // Battle 19, Inner Bailey: everything the Baron has, but not the Baron (GDD §13.2), eight waves under elite captains.
  19: [
    W([
      { at: 0, edge: 'north', type: 'footman', count: 16, formation: 'block', captain: true, elite: true },
      { at: 4, edge: 'northWest', type: 'peasant', count: 14, formation: 'mob' },
      { at: 6, edge: 'northEast', type: 'archer', count: 6, formation: 'line' },
    ]),
    // Eight riders at once took the ring in seconds (each drains like a footman): five, a few seconds behind.
    W([
      { at: 0, edge: 'north', type: 'manAtArms', count: 10, formation: 'block', captain: true, elite: true },
      { at: 6, edge: 'northWest', type: 'rider', count: 5, formation: 'line' },
      { at: 9, edge: 'northEast', type: 'firebrand', count: 4, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'north', offset: -10, type: 'ram', count: 1, formation: 'block' },
      { at: 3, edge: 'north', offset: 10, type: 'ram', count: 1, formation: 'block' },
      { at: 5, edge: 'northWest', type: 'catapult', count: 1, formation: 'block' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'brute', count: 1, formation: 'mob' },
      { at: 3, edge: 'northEast', type: 'brute', count: 1, formation: 'mob' },
      { at: 6, edge: 'northWest', type: 'shieldWall', count: 8, formation: 'line' },
      { at: 9, edge: 'north', offset: 12, type: 'archer', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'footman', count: 16, formation: 'block', captain: true, elite: true },
      { at: 3, edge: 'northEast', type: 'manAtArms', count: 10, formation: 'block', captain: true, elite: true },
      { at: 7, edge: 'north', type: 'rider', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'northEast', type: 'catapult', count: 1, formation: 'block' },
      { at: 2, edge: 'northWest', type: 'catapult', count: 1, formation: 'block' },
      { at: 5, edge: 'north', type: 'footman', count: 12, formation: 'block' },
      { at: 9, edge: 'north', offset: -12, type: 'firebrand', count: 5, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'manAtArms', count: 12, formation: 'block', captain: true, elite: true },
      { at: 3, edge: 'northWest', type: 'brute', count: 1, formation: 'mob' },
      { at: 6, edge: 'northEast', type: 'ram', count: 1, formation: 'block' },
      { at: 9, edge: 'north', offset: 12, type: 'archer', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'brute', count: 1, formation: 'mob' },
      { at: 2, edge: 'northEast', type: 'brute', count: 1, formation: 'mob' },
      { at: 4, edge: 'northWest', type: 'catapult', count: 1, formation: 'block' },
      { at: 7, edge: 'north', type: 'footman', count: 16, formation: 'block', captain: true, elite: true },
      { at: 10, edge: 'northEast', type: 'firebrand', count: 5, formation: 'mob' },
    ]),
  ],
  // Battle 20, The Iron Keep (M9 part 9): under the Keep's own wall, six waves of everything, the last shop, then the
  // Iron Baron in the Iron Ox (GDD §9.3): two elite captains' blocks join him at 60%. His escape is M10's.
  20: [
    W([
      { at: 0, edge: 'north', type: 'footman', count: 16, formation: 'block', captain: true, elite: true },
      { at: 4, edge: 'northWest', type: 'archer', count: 6, formation: 'line' },
      { at: 7, edge: 'northEast', type: 'peasant', count: 14, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'manAtArms', count: 10, formation: 'block', captain: true, elite: true },
      { at: 6, edge: 'northEast', type: 'rider', count: 5, formation: 'line' },
      { at: 9, edge: 'northWest', type: 'firebrand', count: 4, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'ram', count: 1, formation: 'block' },
      { at: 2, edge: 'northWest', type: 'catapult', count: 1, formation: 'block' },
      { at: 4, edge: 'northEast', type: 'catapult', count: 1, formation: 'block' },
      { at: 7, edge: 'north', offset: 12, type: 'shieldWall', count: 8, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'brute', count: 1, formation: 'mob' },
      { at: 3, edge: 'northWest', type: 'brute', count: 1, formation: 'mob' },
      { at: 6, edge: 'northEast', type: 'footman', count: 14, formation: 'block', captain: true, elite: true },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'manAtArms', count: 10, formation: 'block', captain: true, elite: true },
      { at: 3, edge: 'northEast', type: 'footman', count: 14, formation: 'block', captain: true, elite: true },
      { at: 8, edge: 'north', type: 'rider', count: 5, formation: 'line' },
      { at: 10, edge: 'north', offset: 12, type: 'archer', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'ram', count: 1, formation: 'block' },
      { at: 3, edge: 'northEast', type: 'brute', count: 1, formation: 'mob' },
      { at: 5, edge: 'northWest', type: 'catapult', count: 1, formation: 'block' },
      { at: 8, edge: 'north', type: 'manAtArms', count: 10, formation: 'block', captain: true, elite: true },
    ]),
    W(
      [
        { at: 0, edge: 'north', type: 'ironOx', count: 1, formation: 'block' },
        { at: 4, edge: 'northWest', type: 'footman', count: 12, formation: 'block', captain: true, elite: true },
        { at: 8, edge: 'northEast', type: 'archer', count: 6, formation: 'line' },
      ],
      // Two blocks of ten arriving together took the ring in seconds while the hero fought the Ox: six each, the
      // second a few seconds behind.
      [
        { at: 0, edge: 'northWest', type: 'footman', count: 6, formation: 'block', captain: true, elite: true },
        { at: 6, edge: 'northEast', type: 'footman', count: 6, formation: 'block', captain: true, elite: true },
      ],
    ),
  ],
  // Battle 4, Hollow Farm: shield walls block bullets from the front (go round them, or grenade them).
  4: [
    W([
      { at: 0, edge: 'north', offset: 10, type: 'footman', count: 10, formation: 'block' },
      { at: 4, edge: 'north', offset: -6, type: 'shieldWall', count: 6, formation: 'line' },
      { at: 8, edge: 'northWest', type: 'peasant', count: 12, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'peasant', count: 12, formation: 'mob' },
      { at: 3, edge: 'north', type: 'shieldWall', count: 6, formation: 'line' },
      { at: 6, edge: 'northEast', type: 'archer', count: 4, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'shieldWall', count: 6, formation: 'line', captain: true },
      { at: 4, edge: 'northWest', type: 'footman', count: 10, formation: 'block' },
      { at: 8, edge: 'northEast', type: 'peasant', count: 8, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'footman', count: 12, formation: 'block', captain: true },
      { at: 2, edge: 'northEast', type: 'shieldWall', count: 6, formation: 'line' },
      { at: 6, edge: 'north', offset: 10, type: 'archer', count: 6, formation: 'line' },
      { at: 10, edge: 'north', offset: -8, type: 'peasant', count: 10, formation: 'mob' },
    ]),
  ],
  // Battle 5, Grudge's Hill: four waves, the last shop, then Sir Grudge (GDD §9.3).
  5: [
    W([
      { at: 0, edge: 'north', type: 'footman', count: 10, formation: 'block', captain: true },
      { at: 4, edge: 'northEast', type: 'peasant', count: 10, formation: 'mob' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'shieldWall', count: 8, formation: 'line' },
      { at: 4, edge: 'northWest', type: 'archer', count: 6, formation: 'line' },
      { at: 6, edge: 'northEast', type: 'footman', count: 8, formation: 'block' },
    ]),
    W([
      { at: 0, edge: 'northWest', type: 'peasant', count: 14, formation: 'mob' },
      { at: 3, edge: 'north', type: 'footman', count: 12, formation: 'block', captain: true },
      { at: 7, edge: 'northEast', type: 'shieldWall', count: 6, formation: 'line' },
    ]),
    W([
      { at: 0, edge: 'north', type: 'shieldWall', count: 8, formation: 'line', captain: true },
      { at: 3, edge: 'northWest', type: 'footman', count: 10, formation: 'block' },
      { at: 6, edge: 'northEast', type: 'archer', count: 6, formation: 'line' },
      { at: 9, edge: 'north', offset: -10, type: 'peasant', count: 10, formation: 'mob' },
    ]),
    W(
      [
        { at: 0, edge: 'north', type: 'grudge', count: 1, formation: 'mob' },
        { at: 2, edge: 'northEast', type: 'peasant', count: 10, formation: 'mob' },
      ],
      [
        { at: 0, edge: 'northWest', type: 'footman', count: 6, formation: 'block', captain: true },
        { at: 0, edge: 'northEast', type: 'footman', count: 6, formation: 'block', captain: true },
      ],
    ),
  ],
};

/** The type of a squad's captain, if it has one. */
export function captainOf(s: SquadDef): SoldierType | null {
  return s.captain ? (s.elite ? 'eliteCaptain' : 'captain') : null;
}

/** The wave a battle's boss comes in (its last), or −1. */
export function bossWave(def: BattleDef): number {
  return def.waves.findIndex((w) => w.squads.some((s) => SOLDIERS[s.type].boss));
}

export const BATTLES: BattleDef[] = PLANNED.map(([name, region, plannedWaves, newThing], i) => {
  const id = i + 1;
  const waves = WAVES[id] ?? [];
  return { id, name, region, militia: 6, waves, plannedWaves: waves.length || plannedWaves, newThing, ready: waves.length > 0 };
});

/** A battle's name in the player's language (the map card, the battle's title). */
export function battleName(id: number): string {
  return t(`battle.name.${id}` as StringKey);
}

/** What a battle brings that's new, in the player's language (the map card). */
export function battleNews(id: number): string {
  return t(`battle.new.${id}` as StringKey);
}

export function battle(id: number): BattleDef {
  const def = BATTLES[id - 1];
  if (!def) throw new Error(`No battle ${id}`);
  return def;
}

/** The highest battle that can be played in this build. */
export const LAST_READY = BATTLES.filter((b) => b.ready).length;
