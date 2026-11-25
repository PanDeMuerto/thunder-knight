/**
 * Soldier types (GDD §9.1 enemies, §10 allies) and how each looks with the KayKit Adventurers models (CC0, Kay
 * Lousberg; `npm run assets:soldiers`). Looks are placeholders until the art pass (M7) picks final kits; the numbers
 * are the GDD's.
 */

/** The character models; every one shares the same rig and clips. */
export type ArchetypeId = 'knight' | 'rogue' | 'rogueHooded' | 'barbarian';

/**
 * Per model: the palette colour its cloth uses (measured from the texture), which the crowd shader repaints in each
 * soldier's colour.
 */
export const ARCHETYPES: Record<ArchetypeId, { file: string; cloth: number }> = {
  knight: { file: 'knight.glb', cloth: 0xc23c47 },
  rogue: { file: 'rogue.glb', cloth: 0x078253 },
  rogueHooded: { file: 'rogueHooded.glb', cloth: 0x078253 },
  barbarian: { file: 'barbarian.glb', cloth: 0x4f6d82 },
};

/**
 * The shield walls' and Sir Grudge's tower shield (GDD §9.1, §9.3, M7): the knight's rectangle shield, as its own part
 * (`Tower_Shield`) on the chest, facing forward. `height` in metres at a soldier's size; `offset` from the chest in
 * metres (the model's left, up, forward).
 */
export const TOWER_SHIELD = { from: 'Rectangle_Shield', height: 0.9, offset: [0.1, -0.22, 0.34] } as const;

/** The clips the crowd plays, by the name the sim uses → the rig's clip name. */
export const CLIPS = {
  idle: 'Idle',
  walk: 'Walking_A',
  run: 'Running_A',
  attackA: '1H_Melee_Attack_Chop',
  attackB: '1H_Melee_Attack_Slice_Diagonal',
  hit: 'Hit_A',
  knocked: 'Death_A',
  cheer: 'Cheer',
  shoot: '1H_Ranged_Shoot',
  reload: '1H_Ranged_Reload',
  block: 'Blocking',
} as const;
export type ClipName = keyof typeof CLIPS;
/** Clips that play once and hold their last frame; the rest loop. */
export const ONE_SHOT: readonly ClipName[] = ['attackA', 'attackB', 'hit', 'knocked', 'shoot', 'reload'];
/** Where in each one-shot the blow lands or the bolt leaves, as a share of the clip. */
export const HIT_AT: Partial<Record<ClipName, number>> = { attackA: 0.45, attackB: 0.42, shoot: 0.3 };

export type Team = 'enemy' | 'ally';

export type SoldierType =
  | 'peasant'
  | 'footman'
  | 'captain'
  | 'eliteCaptain'
  | 'archer'
  | 'militia'
  | 'allyArcher'
  | 'allyManAtArms'
  | 'manAtArms'
  | 'shieldWall'
  | 'shieldBroken'
  | 'grudge'
  | 'grudgeBare'
  | 'rider'
  | 'firebrand'
  | 'warWagon'
  | 'wagonWheel'
  | 'wagonCrossbow'
  | 'brute'
  | 'ram'
  | 'ramCrew'
  | 'allyKnight'
  | 'catapult'
  | 'catapultCrew'
  | 'siegeTower'
  | 'towerBeam'
  | 'towerPusher'
  | 'ironOx';

/** A charge (GDD §9.3): a glowing wind-up aimed at the hero or the banner, then a straight run that bowls people over. */
export interface ChargeDef {
  /** Seconds of the telegraphed wind-up (the lane glows on the ground). */
  windup: number;
  /** Metres a second, and seconds, of the run. */
  speed: number;
  seconds: number;
  /** Damage to whoever it runs into (allies are knocked out). */
  hit: number;
  /** Seconds between charges, and how many (0: no limit). */
  every: number;
  times: number;
  /** The run's lane glows on the ground through the wind-up (bosses). Riders charge in lines without one. */
  lane?: boolean;
}

/**
 * A war wagon (GDD §9.3, Battle 10): what rides on it, in its own frame (x to its right, z forward, metres). The hull
 * can't be hurt; its wheels are the weak points. At `stallAt` broken wheels it stops, its crossbows shoot faster and
 * footmen spill out of the back; with every wheel broken it collapses and its army runs.
 */
export interface WagonDef {
  /** Its weak points, in its frame: [x, z], or [x, z, lift] for one up its side (the Siege Tower's beams). */
  wheels: readonly (readonly [number, number] | readonly [number, number, number])[];
  wheelType: SoldierType;
  crew: readonly (readonly [number, number])[];
  crewType: SoldierType;
  /** The deck's height above the ground (the crew stand on it). */
  deck: number;
  stallAt: number;
  /** Squads that spill out of the back when it stalls. */
  spill: readonly { type: SoldierType; count: number }[];
  /** The crossbows' reload, times this, once it stalls. */
  stalledReload: number;
  /** It rolls at the banner until this close (inside the ring: it drains the banner like a boss). */
  stopFrom: number;
  /** It only moves while one of its crew is up (a battering ram, pushed). */
  needsCrew?: boolean;
  /**
   * With its crew all down it's left behind, beaten (a ram, a catapult). False: it only stalls where it stands (the
   * Siege Tower: its beams must still be broken).
   */
  abandon?: boolean;
  /** Doors that open every `every` seconds (the first after `first`), a squad stepping out of alternate sides. */
  doors?: { first: number; every: number; type: SoldierType; count: number };
}

/** A burst (GDD §9.1 Firebrand): within `radius` metres everyone is hurt, both armies and the hero. */
export interface BurstDef {
  radius: number;
  hit: number;
  /** He sprints at the hero (or the banner) once within this many metres of it. */
  sprintFrom: number;
  /** Bursts when this close to what he's running at. */
  reach: number;
  /** Share of the banner's health a burst inside the ring takes. */
  banner: number;
}

/**
 * A catapult's boulder (GDD §9.1): every `every` seconds, while its crew stand and it has stopped, it lobs a boulder at
 * the Queen's soldiers or the banner. A shadow on the ground grows for `warn` seconds before it lands; it hurts
 * everyone of the Queen's within `radius` (and the hero), and takes a share of the banner when it lands in the ring.
 */
export interface LobDef {
  every: number;
  /** Seconds in the air, and the last of them in which its shadow grows. */
  flight: number;
  warn: number;
  radius: number;
  hit: number;
  /** Share of the banner's health a boulder inside the ring takes. */
  banner: number;
  /** It throws at targets between these distances. */
  range: number;
  minRange: number;
  /** Metres a boulder lands from its mark, at most (they're not precise). */
  scatter: number;
}

/**
 * The Iron Ox's fire (GDD §9.3): every `every` seconds its horns glow and a cone on the ground glows with them for
 * `windup` seconds (aimed at the hero within `aimFrom` metres, else the banner); then fire fills the cone: `hit` to
 * each of the Queen's soldiers and the hero in it, and `banner` of the banner if it stands in it.
 */
export interface FireDef {
  every: number;
  windup: number;
  length: number;
  /** Half the cone's angle, radians. */
  half: number;
  hit: number;
  banner: number;
  aimFrom: number;
}

/** The Iron Ox (GDD §9.3, Battle 20): its fire, and the share of its health at which each phase begins. */
export interface OxDef {
  fire: FireDef;
  /** Phase 2: elite captains join (the wave's `bossHalf` squads). */
  summonAt: number;
  /** Phase 3: its plates drop and its core glows. */
  coreAt: number;
  /** Until the core shows, everything but explosions does this share; after, explosions do this much more. */
  armour: number;
  core: number;
}

export interface SoldierDef {
  team: Team;
  model: ArchetypeId;
  /** Rigid parts shown (from the model's kept accessories, plus `banner` for captains). */
  parts: readonly string[];
  /** Cloth colour (enemies the Baron's red, allies Larkmoor blue, peasants brown). */
  cloth: number;
  /** Multiplies the grey steel: the Baron's charcoal, Larkmoor's bright steel (GDD §18.1), so armies read apart. */
  steel: number;
  hp: number;
  /** Metres a second when marching. */
  speed: number;
  /** Damage per blow or per bolt. */
  hit: number;
  role: 'normal' | 'ranged' | 'captain';
  armoured: boolean;
  /** Ranged soldiers: how far they shoot, and seconds between shots. */
  range?: number;
  reload?: number;
  /** Gold dropped on a knockout (M3). */
  gold: number;
  /** Times the usual size (bosses), for the model, the body that's shot and how close others stand. */
  size?: number;
  /**
   * A shield that stops the hero's bullets from the front (GDD §9.1 Shield Wall), with this much health; cracks show
   * at 66% and 33%. `Infinity`: it never breaks (Sir Grudge's). `brokenAs` is what the soldier becomes without it.
   */
  shield?: number;
  brokenAs?: SoldierType;
  /** A boss: one at a time, a boss bar instead of the enemies bar (GDD §9.3). Below half health it becomes `brokenAs`. */
  boss?: boolean;
  /**
   * Never turns on the hero (Sir Grudge's first phase marches on the banner behind his shield, so the hero can always
   * get round to his side; GDD §9.3).
   */
  ignoresHero?: boolean;
  /** The boss's name for the bar (a string key), and the type whose nameplate introduces him. */
  bossName?: string;
  charge?: ChargeDef;
  /** Rides a horse (drawn under him, `HORSE`). The shotgun knocks him off (GDD §9.1 Rider). */
  mount?: 'horse';
  /** The body's radius in metres when it isn't `CROWD.radius` × size (a horse is long). */
  radius?: number;
  /** Carries a lit fire-pot and bursts (Firebrand). */
  burst?: BurstDef;
  /** The body's height in metres when it isn't `CROWD.height` × size (a wheel, a wagon). */
  height?: number;
  /** Not drawn by the crowd: the War Wagon and its wheels have their own model. */
  hidden?: boolean;
  /** Bullets, blows and blasts never hurt it: the War Wagon's hull (shoot the wheels). */
  invulnerable?: boolean;
  /** No will of its own: it rides on its wagon (a wheel). */
  fixture?: boolean;
  /** A war wagon: its wheels, crew and spill. */
  wagon?: WagonDef;
  /** Only explosions hurt it (a battering ram: grenades, the Rift Strike, rockets). */
  explosiveOnly?: boolean;
  /**
   * An open frame bullets pass through (a catapult): the crew behind it can be shot from the front. A covered ram
   * isn't: its blocked hits show bullets don't work on it.
   */
  open?: boolean;
  /** A captain's fall routs his squad within this many metres (GDD §4.4: 15; elite captains 25). */
  routRadius?: number;
  /** A small health bar floats over it (GDD §9.1: the Brute, champions; the ram, so grenades show they work). */
  healthBar?: boolean;
  /** A catapult: what it throws (it throws only once stopped, while its crew stand). */
  lob?: LobDef;
  /** The Iron Ox: its fire and phases. */
  ox?: OxDef;
}

/**
 * The riders' horse (M9; Quaternius, CC0, `npm run assets:soldiers`). It plays the clip row its rider's body is on,
 * mapped to its own clips here, and is drawn a little chunkier than life to sit with the KayKit soldiers.
 */
export const HORSE = {
  file: 'horse.glb',
  clips: {
    idle: 'Idle',
    walk: 'Walk',
    run: 'Gallop',
    attackA: 'Attack_Kick',
    attackB: 'Idle_2',
    hit: 'Idle_HitReact_Left',
    knocked: 'Gallop',
    cheer: 'Idle_2',
    shoot: 'Idle',
    reload: 'Idle',
    block: 'Idle_2',
  } as Record<ClipName, string>,
  /** Metres from the hooves to the top of the head, and the chunky look: width, height, length multipliers. */
  height: 1.8,
  shape: [1.25, 0.92, 0.95] as const,
  /** Where the rider's feet sit above the ground (his hips land on the saddle; his short legs hide in the horse). */
  saddle: 0.72,
  /** Ground speed of the walk and the gallop at their natural rate, m/s (the legs keep pace). */
  walkSpeed: 1.7,
  gallopSpeed: 6.5,
  /** A riderless horse bolts away from the shot for `seconds` at `speed`, then sinks out of sight. */
  bolt: { speed: 7, seconds: 1.6 },
  /** How long the rider takes to fall from the saddle to the ground. */
  fall: 0.35,
} as const;

/** The firebrand's pot and flame over his head (drawn by the crowd; GDD §9.1). Metres; the flame flickers gently. */
export const FIRE_POT = { above: 0.08, pot: 0.3, flame: 0.46, flicker: 0.12 } as const;

export const SOLDIERS: Record<SoldierType, SoldierDef> = {
  peasant: { team: 'enemy', model: 'rogue', parts: ['Knife'], cloth: 0x8a6440, steel: 0xffffff, hp: 30, speed: 2.2, hit: 4, role: 'normal', armoured: false, gold: 3 },
  footman: {
    team: 'enemy',
    model: 'knight',
    parts: ['Knight_Helmet', 'Round_Shield', '1H_Sword'],
    cloth: 0xc4302b,
    steel: 0x9a8c8a,
    hp: 60,
    speed: 2.0,
    hit: 7,
    role: 'normal',
    armoured: false,
    gold: 5,
  },
  captain: {
    team: 'enemy',
    model: 'knight',
    parts: ['Knight_Helmet', 'Badge_Shield', '1H_Sword', 'banner'],
    cloth: 0xc4302b,
    steel: 0x9a8c8a,
    hp: 150,
    speed: 2.0,
    hit: 10,
    role: 'captain',
    armoured: false,
    gold: 25,
  },
  // Elite captains (Region 4, GDD §4.4): the Baron's household knights. Gilded armour, a cape and a great sword, a
  // little bigger than a captain, twice his health; his fall routs his squad within 25 m, not 15.
  eliteCaptain: {
    team: 'enemy',
    model: 'knight',
    parts: ['Knight_Helmet', 'Knight_Cape', '2H_Sword', 'banner'],
    cloth: 0x8e1f1c,
    steel: 0xd6ac4a,
    hp: 300,
    speed: 2.0,
    hit: 14,
    role: 'captain',
    armoured: false,
    gold: 60,
    size: 1.15,
    routRadius: 25,
  },
  archer: {
    team: 'enemy',
    model: 'rogueHooded',
    parts: ['1H_Crossbow'],
    cloth: 0xa8322c,
    steel: 0x8a8080,
    hp: 40,
    speed: 2.0,
    hit: 6,
    role: 'ranged',
    armoured: false,
    range: 28,
    reload: 3.2,
    gold: 6,
  },
  militia: {
    team: 'ally',
    model: 'barbarian',
    parts: ['Barbarian_Round_Shield', '1H_Axe'],
    cloth: 0x2f6fd0,
    steel: 0xe8f0ff,
    hp: 70,
    speed: 2.2,
    hit: 7,
    role: 'normal',
    armoured: false,
    gold: 0,
  },
  allyArcher: {
    team: 'ally',
    model: 'rogueHooded',
    parts: ['1H_Crossbow'],
    cloth: 0x2f6fd0,
    steel: 0xe8f0ff,
    hp: 40,
    speed: 2.0,
    hit: 6,
    role: 'ranged',
    armoured: false,
    range: 30,
    reload: 3.0,
    gold: 0,
  },
  // Battle 4's blockers: a tall shield held in front stops bullets until it breaks (or a grenade lands).
  shieldWall: {
    team: 'enemy',
    model: 'knight',
    parts: ['Knight_Helmet', 'Tower_Shield', '1H_Sword'],
    cloth: 0x8f2a26,
    steel: 0x8a807e,
    hp: 70,
    speed: 1.6,
    hit: 8,
    role: 'normal',
    armoured: false,
    gold: 10,
    shield: 150,
    brokenAs: 'shieldBroken',
  },
  shieldBroken: {
    team: 'enemy',
    model: 'knight',
    parts: ['Knight_Helmet', '1H_Sword'],
    cloth: 0x8f2a26,
    steel: 0x8a807e,
    hp: 70,
    speed: 1.6,
    hit: 8,
    role: 'normal',
    armoured: false,
    gold: 10,
  },
  // Sir Grudge, the Black Champion (GDD §9.3, Battle 5): a giant in black steel behind a tower shield. Below half
  // health he throws the shield down and charges three times.
  grudge: {
    team: 'enemy',
    model: 'knight',
    parts: ['Knight_Helmet', 'Tower_Shield', '1H_Sword'],
    cloth: 0x2b2830,
    steel: 0x3c3a44,
    hp: 2400,
    // A giant's walk clip covers 1 m/s at its natural rate: slower than a footman, and his feet stay planted.
    speed: 1.1,
    hit: 22,
    role: 'normal',
    armoured: false,
    gold: 300,
    size: 2,
    shield: Infinity,
    brokenAs: 'grudgeBare',
    boss: true,
    ignoresHero: true,
    bossName: 'boss.grudge',
  },
  grudgeBare: {
    team: 'enemy',
    model: 'knight',
    parts: ['Knight_Helmet', '1H_Sword'],
    cloth: 0x2b2830,
    steel: 0x3c3a44,
    hp: 2400,
    speed: 1.3,
    hit: 22,
    role: 'normal',
    armoured: false,
    gold: 300,
    size: 2,
    boss: true,
    bossName: 'boss.grudge',
    charge: { windup: 1.5, speed: 9, seconds: 1.5, hit: 30, every: 4.5, times: 3 },
  },
  allyManAtArms: {
    team: 'ally',
    model: 'knight',
    parts: ['Knight_Helmet', 'Rectangle_Shield', '1H_Sword'],
    cloth: 0x2f6fd0,
    steel: 0xdde8ff,
    hp: 160,
    speed: 1.8,
    hit: 12,
    role: 'normal',
    armoured: true,
    gold: 0,
  },
  // Region 2 (M9). Riders (Battle 6): a line of horsemen that trots in, then charges the hero or the banner, bowling
  // over the Queen's soldiers in the way. A shotgun hit knocks a rider off his horse.
  rider: {
    team: 'enemy',
    model: 'knight',
    parts: ['Knight_Helmet', 'Round_Shield', '1H_Sword'],
    cloth: 0xc4302b,
    steel: 0x9a8c8a,
    hp: 90,
    speed: 2.8,
    hit: 15,
    role: 'normal',
    armoured: false,
    gold: 12,
    mount: 'horse',
    radius: 0.7,
    charge: { windup: 0.6, speed: 7, seconds: 2.4, hit: 15, every: 5, times: 0, lane: false },
  },
  // Firebrands (Battle 7): a lit fire-pot over his head; he sprints at the hero (or the banner) and bursts, hurting
  // everyone near, his own side too. Shot early, he bursts among his friends.
  firebrand: {
    team: 'enemy',
    model: 'rogue',
    parts: [],
    cloth: 0xb4472a,
    steel: 0xffffff,
    hp: 25,
    speed: 4.5,
    hit: 0,
    role: 'normal',
    armoured: false,
    gold: 6,
    burst: { radius: 4, hit: 40, sprintFrom: 32, reach: 1.4, banner: 0.04 },
  },
  // The War Wagon (Battle 10's boss, GDD §9.3): an armoured wagon pulled by oxen, crossbowmen on its deck. The hull
  // stops bullets; break its four wheels (300 each). Its health on the boss bar is its wheels' together.
  warWagon: {
    team: 'enemy',
    model: 'knight',
    parts: [],
    cloth: 0xc4302b,
    steel: 0x9a8c8a,
    hp: 1200,
    speed: 1.2,
    hit: 0,
    role: 'normal',
    armoured: true,
    gold: 200,
    radius: 1.5,
    height: 2.6,
    boss: true,
    ignoresHero: true,
    bossName: 'boss.wagon',
    hidden: true,
    invulnerable: true,
    wagon: {
      wheels: [
        [-1.25, 1.35],
        [1.25, 1.35],
        [-1.25, -1.35],
        [1.25, -1.35],
      ],
      wheelType: 'wagonWheel',
      crew: [
        [-0.55, 0.7],
        [0.55, 0.7],
        [0, -0.9],
      ],
      crewType: 'wagonCrossbow',
      deck: 1.55,
      stallAt: 2,
      spill: [
        { type: 'footman', count: 6 },
        { type: 'footman', count: 6 },
      ],
      stalledReload: 0.6,
      stopFrom: 4.5,
    },
  },
  wagonWheel: {
    team: 'enemy',
    model: 'knight',
    parts: [],
    cloth: 0xc4302b,
    steel: 0x9a8c8a,
    hp: 300,
    speed: 0,
    hit: 0,
    // The aim assist favours the weak points, as it does captains.
    role: 'captain',
    armoured: false,
    gold: 40,
    radius: 0.6,
    height: 1.25,
    hidden: true,
    fixture: true,
  },
  // Region 3, the Highland Pass (M9 part 4). The Brute (Battle 11): a giant barbarian with a great axe. He charges after
  // a 1.5 s glowing wind-up (its lane glows), knocking back whoever's in the way. Armoured; a health bar over his head.
  brute: {
    team: 'enemy',
    model: 'barbarian',
    parts: ['Barbarian_Hat', '2H_Axe', 'Barbarian_Cape'],
    cloth: 0xa8322c,
    steel: 0x7a7070,
    // GDD §9.1 guessed 1,500 before Region 3's health scale (then ×2.5): about 30 s of the hunting rifle while he
    // flattened the militia at the banner (the bot lost Battle 12 twice). 1,000 (2,200 in the Highland Pass) is ~17 s.
    hp: 1000,
    // 1.5 m/s closing in (the crowd's ×1.25 to a target): the fastest his walk clip keeps his feet planted.
    speed: 1.2,
    hit: 30,
    role: 'normal',
    armoured: true,
    gold: 80,
    size: 2,
    healthBar: true,
    charge: { windup: 1.5, speed: 9, seconds: 1.4, hit: 30, every: 6, times: 0 },
  },
  // The battering ram (Battle 12): a covered ram pushed by six crew. Only explosives hurt it; with its crew down it
  // stops. In the banner's ring it drains 4% a second (GDD §9.1).
  ram: {
    team: 'enemy',
    model: 'knight',
    parts: [],
    cloth: 0xc4302b,
    steel: 0x9a8c8a,
    // GDD §9.1 guessed 1,200 before Region 3's health scale (then ×2.5): that took 20 grenades. 500 (1,100 in the
    // Highland Pass) makes a Rift Strike plus a few grenades a real answer.
    hp: 500,
    speed: 1.2,
    hit: 0,
    role: 'normal',
    armoured: true,
    gold: 60,
    // As wide as its frame (1.3 m): a wider circle stopped bullets meant for the crew walking beside it, so from the
    // front it couldn't be stopped at all.
    radius: 0.7,
    height: 2.2,
    hidden: true,
    invulnerable: true,
    explosiveOnly: true,
    healthBar: true,
    wagon: {
      wheels: [],
      wheelType: 'wagonWheel',
      crew: [
        [-1.2, 1.0],
        [-1.2, 0],
        [-1.2, -1.0],
        [1.2, 1.0],
        [1.2, 0],
        [1.2, -1.0],
      ],
      crewType: 'ramCrew',
      deck: 0,
      stallAt: 99,
      spill: [],
      stalledReload: 1,
      stopFrom: 4.5,
      needsCrew: true,
    },
  },
  ramCrew: {
    team: 'enemy',
    model: 'knight',
    parts: ['Knight_Helmet'],
    cloth: 0xc4302b,
    steel: 0x9a8c8a,
    hp: 60,
    speed: 1.2,
    hit: 0,
    role: 'normal',
    armoured: false,
    gold: 6,
    fixture: true,
  },
  // The Queen's knights (Army tab from Battle 13, GDD §10): blue riders who wait beside the banner and charge the Baron's
  // nearest men within 24 m (a run of about 21 m), bowling them over, then fight on horseback.
  allyKnight: {
    team: 'ally',
    model: 'knight',
    parts: ['Knight_Helmet', 'Round_Shield', '1H_Sword'],
    cloth: 0x2f6fd0,
    steel: 0xdde8ff,
    hp: 220,
    speed: 2.8,
    hit: 16,
    role: 'normal',
    armoured: true,
    gold: 0,
    mount: 'horse',
    radius: 0.7,
    charge: { windup: 0.5, speed: 8, seconds: 2.6, hit: 35, every: 7, times: 0, lane: false },
  },
  // The catapult (Battle 14, GDD §9.1): rolled in by its three crew to about 40 m from the banner, where it lobs a
  // boulder every 6 s at the Queen's soldiers or the banner; a shadow grows where it will land. Like the ram, only
  // explosions hurt the engine itself; with its crew down it's abandoned (beaten).
  catapult: {
    team: 'enemy',
    model: 'knight',
    parts: [],
    cloth: 0xc4302b,
    steel: 0x9a8c8a,
    hp: 800,
    speed: 1.1,
    hit: 0,
    role: 'normal',
    armoured: true,
    gold: 50,
    radius: 0.8,
    height: 2.6,
    hidden: true,
    invulnerable: true,
    explosiveOnly: true,
    healthBar: true,
    open: true,
    wagon: {
      wheels: [],
      wheelType: 'wagonWheel',
      crew: [
        [-1.25, 0.2],
        [1.25, 0.2],
        [0, -1.9],
      ],
      crewType: 'catapultCrew',
      deck: 0,
      stallAt: 99,
      spill: [],
      stalledReload: 1,
      stopFrom: 40,
      needsCrew: true,
    },
    lob: { every: 6, flight: 2.4, warn: 1.5, radius: 3, hit: 40, banner: 0.03, range: 52, minRange: 12, scatter: 2.5 },
  },
  // The Siege Tower (Battle 15's boss, GDD §9.3): a huge wooden tower pushed at the banner by ten men. Knock out the
  // pushers and it stalls where it stands; every 16 s its doors open and a squad of footmen steps out. Three glowing
  // support beams on its front are its weak points (its health on the boss bar): break all three and it topples, and
  // the Baron's army runs.
  siegeTower: {
    team: 'enemy',
    model: 'knight',
    parts: [],
    cloth: 0xc4302b,
    steel: 0x9a8c8a,
    hp: 1500,
    speed: 0.9,
    hit: 0,
    role: 'normal',
    armoured: true,
    gold: 300,
    radius: 1.8,
    height: 8,
    boss: true,
    ignoresHero: true,
    bossName: 'boss.tower',
    hidden: true,
    invulnerable: true,
    wagon: {
      // Flush against its front planks (1.8 m from its middle), in front of its hull's 1.8 m, so bullets reach them.
      wheels: [
        [-1.2, 2.0, 0.7],
        [0, 2.0, 3.2],
        [1.2, 2.0, 0.7],
      ],
      wheelType: 'towerBeam',
      crew: [
        [-2.4, 1.4],
        [-2.4, 0.4],
        [-2.4, -0.6],
        [-2.4, -1.6],
        [2.4, 1.4],
        [2.4, 0.4],
        [2.4, -0.6],
        [2.4, -1.6],
        [-0.8, -2.6],
        [0.8, -2.6],
      ],
      crewType: 'towerPusher',
      deck: 0,
      stallAt: 99,
      spill: [],
      stalledReload: 1,
      stopFrom: 5.5,
      needsCrew: true,
      abandon: false,
      doors: { first: 10, every: 16, type: 'footman', count: 6 },
    },
  },
  towerBeam: {
    team: 'enemy',
    model: 'knight',
    parts: [],
    cloth: 0xc4302b,
    steel: 0x9a8c8a,
    hp: 350,
    speed: 0,
    hit: 0,
    // The aim assist favours the weak points, as it does captains.
    role: 'captain',
    armoured: false,
    gold: 40,
    radius: 0.45,
    height: 1.6,
    hidden: true,
    fixture: true,
  },
  towerPusher: {
    team: 'enemy',
    model: 'knight',
    parts: ['Knight_Helmet'],
    cloth: 0xc4302b,
    steel: 0x9a8c8a,
    hp: 60,
    speed: 0.9,
    hit: 0,
    role: 'normal',
    armoured: false,
    gold: 6,
    fixture: true,
  },
  // The Iron Baron in the Iron Ox (Battle 20's boss, GDD §9.3): a bull-shaped iron engine that rolls at the banner and
  // breathes fire from its horns into a cone it shows on the ground first. At 60% two elite captains' blocks join; at
  // 30% its armour plates drop and its core glows: until then its armour halves everything but explosions, after it
  // explosions do half again more ("rocket time"). Its fall routs the Baron's army; his escape is M10's.
  ironOx: {
    team: 'enemy',
    model: 'knight',
    parts: [],
    cloth: 0xc4302b,
    steel: 0x9a8c8a,
    hp: 5000,
    speed: 0.7,
    hit: 0,
    role: 'normal',
    armoured: true,
    gold: 500,
    radius: 1.7,
    height: 2.8,
    boss: true,
    ignoresHero: true,
    bossName: 'boss.ox',
    hidden: true,
    ox: {
      fire: { every: 7, windup: 1.6, length: 13, half: 0.5, hit: 30, banner: 0.04, aimFrom: 18 },
      summonAt: 0.6,
      coreAt: 0.3,
      armour: 0.5,
      core: 1.5,
    },
  },
  catapultCrew: {
    team: 'enemy',
    model: 'knight',
    parts: ['Knight_Helmet'],
    cloth: 0xc4302b,
    steel: 0x9a8c8a,
    hp: 60,
    speed: 1.1,
    hit: 0,
    role: 'normal',
    armoured: false,
    gold: 6,
    fixture: true,
  },
  wagonCrossbow: {
    team: 'enemy',
    model: 'rogueHooded',
    parts: ['1H_Crossbow'],
    cloth: 0xa8322c,
    steel: 0x8a8080,
    hp: 40,
    speed: 2.0,
    hit: 6,
    role: 'ranged',
    armoured: false,
    range: 30,
    reload: 2.6,
    gold: 8,
  },
  // Men-at-arms (Battle 9): full plate, a two-handed sword and a cape; slow and tough. Armoured: light guns (pistol,
  // SMG) do half damage, with sparks and a clink (GDD §9.1).
  manAtArms: {
    team: 'enemy',
    model: 'knight',
    parts: ['Knight_Helmet', '2H_Sword', 'Knight_Cape'],
    cloth: 0x8f2a26,
    steel: 0xc9c4c0,
    hp: 160,
    speed: 1.8,
    hit: 12,
    role: 'normal',
    armoured: true,
    gold: 15,
  },
};

/** Crowd behaviour numbers (GDD §4.2, §4.4, §9.2, §10). */
export const CROWD = {
  /** Simulation ticks a second; soldiers far from the camera tick at half this. */
  tickRate: 30,
  farDistance: 50,
  /** Soldiers are this tall and wide (GDD §5.2: a little smaller than the hero). */
  height: 1.6,
  radius: 0.32,
  /** Enemies break formation to fight anyone within this of their path; allies within this of their slot. */
  engageEnemy: 6,
  engageAlly: 8,
  /** Melee reach beyond touching, and the pause between blows. */
  reach: 0.55,
  attackRest: [0.35, 0.9],
  /** Living captains speed their squad up (GDD §4.4). */
  captainSpeedBonus: 0.15,
  routRadius: 15,
  /** A knockout's tumble (M8): the body slides back along the blow at `speed` m/s, slowing by `decay` a second
   * (about 0.3 m in all). Bosses don't slide. */
  tumble: { speed: 2.4, decay: 7 },
  routSpeed: 1.4,
  /** Seconds: lying after the fall, then sinking away. */
  lie: 1.2,
  sink: 0.9,
  /** Archers' bolts fly this long, and their landing marks show for all of it (GDD §9.1: 1 s warning). */
  boltFlight: 1.1,
  boltRadius: 0.9,
  /** Seconds to blend from one clip to the next. */
  blend: 0.15,
  /** How hard soldiers keep their distance (neighbours closer than this are pushed apart). */
  spacing: 0.78,
} as const;
