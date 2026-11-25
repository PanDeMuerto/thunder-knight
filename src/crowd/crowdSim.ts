import { angleDelta } from '@/core/math';
import { SpatialHash } from '@/core/spatialHash';
import { CLIPS, CROWD, HIT_AT, SOLDIERS, type BurstDef, type ClipName, type SoldierDef, type SoldierType, type WagonDef, type LobDef, type FireDef, type OxDef } from '@/content/soldiers';
import { Bodies, ROLE } from '@/game/bodies';
import type { FlowField } from './flowField';
import { captainSlot, formationSlots, type Formation, type Slot } from './formations';

/** What a soldier is doing. */
/** How far the Queen's knights look for someone to charge (GDD §10). */
const ALLY_CHARGE_REACH = 24;
/** The Iron Ox stops this far from the banner: close enough that its fire reaches it. */
const OX_STOP = 10;

export const STATE = { off: 0, idle: 1, move: 2, attack: 3, hit: 4, knocked: 5, flee: 6, shoot: 7, cheer: 8, windup: 9, charge: 10 } as const;
export type SoldierState = (typeof STATE)[keyof typeof STATE];

export const TYPES = Object.keys(SOLDIERS) as SoldierType[];
export const CLIP_LIST = Object.keys(CLIPS) as ClipName[];
export const CLIP_INDEX = Object.fromEntries(CLIP_LIST.map((c, i) => [c, i])) as Record<ClipName, number>;

/** Team 0 is the Baron's army (the hero shoots them), team 1 the Queen's. */
export const ENEMY = 0;
export const ALLY = 1;
const HERO = -2;
const NONE = -1;
const HIT_STAGGER = 0.35;
const RETARGET_SECONDS = 0.3;
const HERO_RADIUS = 0.4;
/** A shot within this angle of head-on hits a shield (cos 70°). */
const SHIELD_ARC = 0.34;

export interface CrowdWorld {
  heightAt(x: number, z: number): number;
  confine(p: { x: number; z: number }, radius: number): void;
  /** Half the playable field's width. */
  half: number;
}

/** Clip lengths and the walk and run clips' natural speeds (from the soldier kit). */
export interface ClipTimes {
  duration(clip: ClipName): number;
  speed(clip: 'walk' | 'run'): number;
}

export interface SquadSpec {
  type: SoldierType;
  count: number;
  formation: Formation;
  x: number;
  z: number;
  /** Facing, radians (0 looks down −Z). */
  facing: number;
  captain?: boolean;
  /** Led by an elite captain (Region 4): twice the health, a 25 m rout. */
  elite?: boolean;
  /** `attack`: march down the flow field to the banner. `hold`: stand at (x, z) and fight what comes near. */
  order: 'attack' | 'hold';
}

export interface Squad {
  id: number;
  team: number;
  type: SoldierType;
  order: 'attack' | 'hold' | 'routed';
  anchorX: number;
  anchorZ: number;
  facing: number;
  slots: Slot[];
  formation: Formation;
  captain: number;
  /** Simulation time when the squad entered (for the arriving-squad arrows). */
  spawnedAt: number;
  /** Where routed members run to. */
  homeX: number;
  homeZ: number;
  standing: number;
}

/** A catapult's boulder in the air (GDD §9.1), landing at (toX, toZ) when its age reaches its flight. */
export interface Boulder {
  live: boolean;
  /** The catapult that threw it (for its arm), and what it is. */
  from: number;
  lob: LobDef;
  fromX: number;
  fromY: number;
  fromZ: number;
  toX: number;
  toY: number;
  toZ: number;
  age: number;
}

export interface Bolt {
  live: boolean;
  team: number;
  damage: number;
  fromX: number;
  fromY: number;
  fromZ: number;
  toX: number;
  toY: number;
  toZ: number;
  age: number;
  flight: number;
}

const tmp = { x: 0, z: 0 };
const near: number[] = [];

/**
 * The crowd (tech design §5.5): every soldier of both armies as a structure of arrays, ticked at 30 Hz. Squads march
 * their anchor down the flow field to the banner (or hold a spot); soldiers keep their formation slot until an
 * opponent comes near, then fight: melee blows land on the attack clip's hit frame, archers loose bolts that land
 * after a warning. A captain's knockout routs his squad (GDD §4.4). No physics: a spatial hash keeps everyone apart.
 * Positions live in `bodies`, which is also what the hero's shots test against (enemies only).
 */
export class CrowdSim {
  readonly bodies: Bodies;
  readonly capacity: number;
  /** 1 while a soldier is on the field (standing, fleeing or lying). */
  readonly live: Uint8Array;
  readonly team: Uint8Array;
  readonly type: Uint8Array;
  readonly state: Uint8Array;
  readonly squadOf: Int16Array;
  readonly slotOf: Int16Array;
  readonly target: Int16Array;
  readonly vx: Float32Array;
  readonly vz: Float32Array;
  readonly heading: Float32Array;
  readonly timer: Float32Array;
  readonly cooldown: Float32Array;
  readonly retarget: Float32Array;
  readonly prevX: Float32Array;
  readonly prevZ: Float32Array;
  readonly prevHeading: Float32Array;
  /** Animation: the clip playing, when it started, its rate; the clip before it, for the blend. */
  readonly clip: Uint8Array;
  readonly clipStart: Float32Array;
  readonly clipRate: Float32Array;
  readonly prevClip: Uint8Array;
  readonly prevStart: Float32Array;
  readonly prevRate: Float32Array;
  readonly blendStart: Float32Array;
  readonly flash: Float32Array;
  /** Shield health (0: none; Infinity: never breaks), and where a charge runs. */
  readonly shield: Float32Array;
  /** The Iron Ox: seconds left in its fire's wind-up (0: none), and its phase (0, 1, 2). */
  private readonly fireTimer: Float32Array;
  private readonly phase: Uint8Array;
  /** The Siege Tower's doors: seconds to the next opening, and how many times they've opened. */
  private readonly doorClock: Float32Array;
  private readonly doorsOpened: Uint16Array;
  readonly chargeX: Float32Array;
  readonly chargeZ: Float32Array;
  private readonly charges: Uint8Array;
  private readonly nextCharge: Float32Array;
  /**
   * War wagons (M9): who rides on what (−1: nothing), where in its frame, how high above the ground (the renderer
   * lifts them too), the crossbows' reload scale, and each wagon's broken wheels.
   */
  private readonly carrier: Int16Array;
  private readonly carryX: Float32Array;
  private readonly carryZ: Float32Array;
  readonly lift: Float32Array;
  private readonly reloadScale: Float32Array;
  private readonly wheelsBroken: Uint8Array;
  private readonly wagons = new Map<number, { wheels: number[]; crew: number[] }>();
  /** Firebrands (M9): has he burst, and has he begun his sprint (for the scream)? */
  private readonly burstDone: Uint8Array;
  private readonly sprinting: Uint8Array;
  private readonly struck: Uint8Array;
  private readonly dt: Float32Array;
  readonly squads: Squad[] = [];
  readonly bolts: Bolt[] = [];
  private readonly free: number[] = [];
  private readonly hash: SpatialHash;
  /** Seconds of simulation so far (the crowd shader's clock). */
  time = 0;
  ticks = 0;
  private accumulator = 0;
  /** The hero, as a target for enemies and a body soldiers walk round. */
  readonly hero = { x: 0, z: 0, active: false };
  /** Where far-from-camera soldiers start ticking at half rate. */
  readonly camera = { x: 0, z: 0 };
  onHeroHit: ((damage: number, fromX: number, fromZ: number) => void) | null = null;
  /** A knocked-out soldier has hit the ground (dust). */
  onLand: ((x: number, y: number, z: number) => void) | null = null;
  onRout: ((x: number, z: number) => void) | null = null;
  onBoltLand: ((x: number, y: number, z: number) => void) | null = null;
  /** An archer looses a bolt (its "thwip"). */
  onLoose: ((x: number, y: number, z: number) => void) | null = null;
  /** An enemy is knocked out or routed: its gold drops where it stands (battles turn this into coins). */
  onFallen: ((type: SoldierType, x: number, y: number, z: number, routed: boolean) => void) | null = null;
  /** A shield cracks (stage 1 at 66%, 2 at 33%) or breaks; a bullet bounces off one. */
  onShieldCrack: ((i: number, stage: 1 | 2) => void) | null = null;
  onShieldBreak: ((i: number) => void) | null = null;
  /** A boss fell below half health and changed (GDD §9.3: Sir Grudge drops his shield). */
  onBossHalf: ((i: number) => void) | null = null;
  /** The boss was knocked out (his army has routed). */
  onBossDown: ((i: number) => void) | null = null;
  /** A charge's wind-up began (the lane glows), and a charge ran into the hero. */
  onWindup: ((i: number) => void) | null = null;
  /** A firebrand begins his sprint (his scream), and bursts (fire, the banner if he's in the ring). */
  onSprint: ((i: number) => void) | null = null;
  onBurst: ((x: number, y: number, z: number, burst: BurstDef) => void) | null = null;
  /** A catapult throws (its creak and whoosh), and a boulder lands (its thud; the banner if it's in the ring). */
  onLob: ((catapult: number, boulder: Boulder) => void) | null = null;
  onBoulder: ((boulder: Boulder) => void) | null = null;
  /** Boulders in the air. */
  readonly boulders: Boulder[] = [];
  /** The Siege Tower's doors open on one side (−1 left, 1 right) and a squad steps out. */
  onDoors: ((tower: number, side: number) => void) | null = null;
  /** The Iron Ox's horns start to glow (its cone shows), it breathes fire, and its core shows (phase 3). */
  onFireWindup: ((ox: number) => void) | null = null;
  onFire: ((ox: number, dirX: number, dirZ: number, fire: FireDef) => void) | null = null;
  onOxCore: ((ox: number) => void) | null = null;
  /** A war wagon's wheel breaks; the wagon stalls (it stops, footmen spill out). */
  onWheelBreak: ((wheel: number, wagon: number) => void) | null = null;
  onWagonStall: ((wagon: number) => void) | null = null;
  /** The boss on the field, or −1. */
  boss = -1;
  /** Where enemies are headed (the banner): a charge with no hero in reach runs at it. */
  readonly goal = { x: 0, z: 0 };
  /** Enemy health scale (the region's, GDD §9.1) and the allies' comeback boost (GDD §4.8). */
  enemyHp = 1;
  allyBoost = 1;

  constructor(
    capacity: number,
    private readonly world: CrowdWorld,
    private readonly flow: FlowField,
    private readonly clips: ClipTimes,
  ) {
    this.capacity = capacity;
    this.bodies = new Bodies(capacity);
    for (let i = 0; i < capacity; i++) this.bodies.add(0, 0, 0, CROWD.radius, CROWD.height, 1);
    this.bodies.alive.fill(0);
    this.live = new Uint8Array(capacity);
    this.team = new Uint8Array(capacity);
    this.type = new Uint8Array(capacity);
    this.state = new Uint8Array(capacity);
    this.squadOf = new Int16Array(capacity).fill(-1);
    this.slotOf = new Int16Array(capacity);
    this.target = new Int16Array(capacity).fill(NONE);
    this.vx = new Float32Array(capacity);
    this.vz = new Float32Array(capacity);
    this.heading = new Float32Array(capacity);
    this.timer = new Float32Array(capacity);
    this.cooldown = new Float32Array(capacity);
    this.retarget = new Float32Array(capacity);
    this.prevX = new Float32Array(capacity);
    this.prevZ = new Float32Array(capacity);
    this.prevHeading = new Float32Array(capacity);
    this.clip = new Uint8Array(capacity);
    this.clipStart = new Float32Array(capacity);
    this.clipRate = new Float32Array(capacity).fill(1);
    this.prevClip = new Uint8Array(capacity);
    this.prevStart = new Float32Array(capacity);
    this.prevRate = new Float32Array(capacity).fill(1);
    this.blendStart = new Float32Array(capacity).fill(-10);
    this.flash = new Float32Array(capacity);
    this.shield = new Float32Array(capacity);
    this.fireTimer = new Float32Array(capacity);
    this.phase = new Uint8Array(capacity);
    this.doorClock = new Float32Array(capacity);
    this.doorsOpened = new Uint16Array(capacity);
    this.chargeX = new Float32Array(capacity);
    this.chargeZ = new Float32Array(capacity);
    this.charges = new Uint8Array(capacity);
    this.nextCharge = new Float32Array(capacity);
    this.carrier = new Int16Array(capacity).fill(-1);
    this.carryX = new Float32Array(capacity);
    this.carryZ = new Float32Array(capacity);
    this.lift = new Float32Array(capacity);
    this.reloadScale = new Float32Array(capacity).fill(1);
    this.wheelsBroken = new Uint8Array(capacity);
    this.burstDone = new Uint8Array(capacity);
    this.sprinting = new Uint8Array(capacity);
    this.struck = new Uint8Array(capacity);
    this.dt = new Float32Array(capacity);
    for (let i = capacity - 1; i >= 0; i--) this.free.push(i);
    const half = world.half + 10;
    this.hash = new SpatialHash(2, -half, -half, half, half, capacity);
  }

  /** Soldiers standing (not lying or fleeing) on a team. */
  standing(team: number): number {
    let n = 0;
    for (let i = 0; i < this.capacity; i++) if (this.live[i] && this.team[i] === team && this.isUp(i)) n++;
    return n;
  }

  /**
   * How hard enemies inside a ring press on it, as the sum of their drain weights (GDD §4.5: light and heavy).
   * `heavy` decides which types count double.
   */
  pressure(x: number, z: number, radius: number, weight: (type: SoldierType) => number): number {
    const b = this.bodies;
    let sum = 0;
    for (let i = 0; i < this.capacity; i++) {
      if (!this.live[i] || this.team[i] !== ENEMY || !this.isUp(i)) continue;
      if (Math.hypot(b.x[i]! - x, b.z[i]! - z) <= radius) sum += weight(TYPES[this.type[i]!]!);
    }
    return sum;
  }

  /** Every standing soldier of a team cheers (victory), and stops fighting. */
  cheer(team: number): void {
    for (let i = 0; i < this.capacity; i++) {
      if (!this.live[i] || this.team[i] !== team || !this.isUp(i)) continue;
      this.target[i] = NONE;
      this.vx[i] = 0;
      this.vz[i] = 0;
      this.state[i] = STATE.cheer;
      this.timer[i] = 0;
      this.play(i, 'cheer', 1);
    }
  }

  /**
   * Grows a squad to `count` and fills its empty slots with fresh soldiers that jog in from (fromX, fromZ) (GDD §10:
   * allies refill at each wave start). Returns how many came.
   */
  refill(squadId: number, count: number, fromX: number, fromZ: number): number {
    const squad = this.squads[squadId];
    if (!squad || squad.order === 'routed') return 0;
    if (count > squad.slots.length) {
      const def = SOLDIERS[squad.type];
      squad.slots = formationSlots(squad.formation, count, def.role === 'ranged' ? 1.6 : 1.15, squad.id + 7);
    }
    const taken = new Set<number>();
    for (let i = 0; i < this.capacity; i++) if (this.live[i] && this.squadOf[i] === squadId && this.isUp(i)) taken.add(this.slotOf[i]!);
    let added = 0;
    for (let s = 0; s < squad.slots.length && this.free.length > 0; s++) {
      if (taken.has(s)) continue;
      const i = this.add(squad.type, fromX + (Math.random() - 0.5) * 3, fromZ + (Math.random() - 0.5) * 3, squad.facing);
      this.squadOf[i] = squadId;
      this.slotOf[i] = s;
      squad.standing++;
      added++;
    }
    return added;
  }

  /** Soldiers on the field in any state (the render and the tier cap count these). */
  get count(): number {
    return this.capacity - this.free.length;
  }

  /** Puts a squad on the field in formation. Returns its id, or -1 if there's no room for all of it. */
  spawnSquad(spec: SquadSpec): number {
    const def = SOLDIERS[spec.type];
    const count = spec.count + (spec.captain ? 1 : 0);
    if (count > this.free.length || count <= 0) return -1;
    const slots = formationSlots(spec.formation, count, def.role === 'ranged' ? 1.6 : 1.15, this.squads.length + 7);
    const team = def.team === 'enemy' ? ENEMY : ALLY;
    // An enemy squad takes a finished one's place (none of its soldiers left on the field), so a long Last Stand's
    // list doesn't grow without end. The Queen's squads keep theirs (the battle refills them by index).
    const reuse = team === ENEMY ? this.finishedSquad() : -1;
    const squad: Squad = {
      id: reuse >= 0 ? reuse : this.squads.length,
      team,
      type: spec.type,
      order: spec.order,
      anchorX: spec.x,
      anchorZ: spec.z,
      facing: spec.facing,
      slots,
      captain: -1,
      formation: spec.formation,
      spawnedAt: this.time,
      // Routed soldiers run back the way they came, past the edge.
      homeX: spec.x + Math.sin(spec.facing) * 30,
      homeZ: spec.z + Math.cos(spec.facing) * 30,
      standing: 0,
    };
    if (reuse >= 0) this.squads[reuse] = squad;
    else this.squads.push(squad);
    const captainAt = spec.captain ? captainSlot(slots) : -1;
    for (let s = 0; s < count; s++) {
      const type = s === captainAt ? (spec.elite ? 'eliteCaptain' : 'captain') : spec.type;
      const p = this.slotPosition(squad, s);
      const i = this.add(type, p.x, p.z, spec.facing);
      this.squadOf[i] = squad.id;
      this.slotOf[i] = s;
      squad.standing++;
      if (s === captainAt) squad.captain = i;
    }
    return squad.id;
  }

  private add(type: SoldierType, x: number, z: number, facing: number): number {
    const i = this.free.pop()!;
    const def = SOLDIERS[type];
    const b = this.bodies;
    b.x[i] = x;
    b.z[i] = z;
    b.y[i] = this.world.heightAt(x, z);
    const hp = def.hp * (def.team === 'enemy' ? this.enemyHp : this.allyBoost);
    b.hp[i] = hp;
    b.maxHp[i] = hp;
    const size = def.size ?? 1;
    b.radius[i] = def.radius ?? CROWD.radius * size;
    b.height[i] = def.height ?? CROWD.height * size;
    b.maxRadius = Math.max(b.maxRadius, b.radius[i]!);
    this.shield[i] = def.shield === undefined ? 0 : Number.isFinite(def.shield) ? def.shield * this.enemyHp : Infinity;
    this.charges[i] = 0;
    this.fireTimer[i] = 0;
    this.phase[i] = 0;
    // The Queen's knights charge as soon as the Baron's men come in reach; the Baron's riders and giants wait a beat.
    this.nextCharge[i] = def.charge ? (def.team === 'ally' ? 0.5 : def.charge.every) : 0;
    this.burstDone[i] = 0;
    this.sprinting[i] = 0;
    this.carrier[i] = -1;
    this.lift[i] = 0;
    this.reloadScale[i] = 1;
    this.wheelsBroken[i] = 0;
    if (def.boss) this.boss = i;
    // Aim assist puts bosses with captains, first (GDD §6.4).
    b.role[i] = def.role === 'captain' || def.boss ? ROLE.captain : def.role === 'ranged' ? ROLE.ranged : ROLE.normal;
    b.armoured[i] = def.armoured ? 1 : 0;
    b.open[i] = def.open ? 1 : 0;
    b.alive[i] = def.team === 'enemy' ? 1 : 0;
    this.live[i] = 1;
    this.team[i] = def.team === 'enemy' ? ENEMY : ALLY;
    this.type[i] = TYPES.indexOf(type);
    this.state[i] = STATE.idle;
    this.target[i] = NONE;
    this.vx[i] = 0;
    this.vz[i] = 0;
    this.heading[i] = facing;
    this.prevX[i] = x;
    this.prevZ[i] = z;
    this.prevHeading[i] = facing;
    this.timer[i] = 0;
    this.cooldown[i] = Math.random() * 0.5;
    // The Iron Ox's first breath comes a few seconds after it enters.
    if (def.ox) this.cooldown[i] = 4;
    this.retarget[i] = Math.random() * RETARGET_SECONDS;
    this.flash[i] = 0;
    this.squadOf[i] = -1;
    this.dt[i] = 0;
    this.clip[i] = CLIP_INDEX.idle;
    this.clipStart[i] = this.time - Math.random() * 2;
    this.clipRate[i] = 1;
    this.blendStart[i] = -10;
    if (def.wagon) this.addWagonParts(i, def.wagon);
    return i;
  }

  private release(i: number): void {
    if (this.boss === i) this.boss = -1;
    this.live[i] = 0;
    this.state[i] = STATE.off;
    this.bodies.alive[i] = 0;
    // A wagon, ram or catapult gone: its parts list goes too, or the next soldier in this slot would inherit it (a
    // reused slot was skipped as a hull, and its knockout knocked out whoever stood in the old crew's slots).
    this.wagons.delete(i);
    this.carrier[i] = -1;
    this.free.push(i);
  }

  /** An enemy squad that's done with (nobody standing, nobody of it still on the field), or −1. */
  private finishedSquad(): number {
    const used = new Uint8Array(this.squads.length);
    for (let i = 0; i < this.capacity; i++) if (this.live[i] && this.squadOf[i]! >= 0) used[this.squadOf[i]!] = 1;
    for (const s of this.squads) if (s.team === ENEMY && s.standing <= 0 && !used[s.id]) return s.id;
    return -1;
  }

  /** Removes everyone (a new scenario or battle). */
  clear(): void {
    for (let i = 0; i < this.capacity; i++) if (this.live[i]) this.release(i);
    this.squads.length = 0;
    this.boss = -1;
    for (const b of this.bolts) b.live = false;
    for (const b of this.boulders) b.live = false;
  }

  /** The boss while he's standing, or −1 (the boss bar). */
  get bossUp(): number {
    return this.boss >= 0 && this.live[this.boss] && this.isUp(this.boss) ? this.boss : -1;
  }

  /** A war wagon's wheels and crew: added beside it, riding on it from now on. Its health is its wheels'. */
  private addWagonParts(i: number, w: WagonDef): void {
    const parts = { wheels: [] as number[], crew: [] as number[] };
    const b = this.bodies;
    const place = (type: SoldierType, [dx, dz]: readonly [number, number], lift: number): number => {
      if (!this.free.length) return -1;
      const j = this.add(type, b.x[i]!, b.z[i]!, this.heading[i]!);
      this.carrier[j] = i;
      this.carryX[j] = dx;
      this.carryZ[j] = dz;
      this.lift[j] = lift;
      this.carry(j);
      this.prevX[j] = b.x[j]!;
      this.prevZ[j] = b.z[j]!;
      return j;
    };
    for (const spot of w.wheels) {
      const j = place(w.wheelType, [spot[0], spot[1]], spot[2] ?? 0);
      if (j >= 0) parts.wheels.push(j);
    }
    this.doorClock[i] = w.doors?.first ?? 0;
    this.doorsOpened[i] = 0;
    for (const spot of w.crew) {
      const j = place(w.crewType, spot, w.deck);
      if (j >= 0) parts.crew.push(j);
    }
    this.wagons.set(i, parts);
    if (w.wheels.length) {
      this.wagonHealth(i);
      b.maxHp[i] = b.hp[i]!;
    }
  }

  /** A war wagon's parts (its wheels in their order, its crew), or undefined. */
  wagonParts(i: number): { readonly wheels: readonly number[]; readonly crew: readonly number[] } | undefined {
    return this.wagons.get(i);
  }

  /** A wagon's health is what's left of its wheels. */
  private wagonHealth(i: number): void {
    const parts = this.wagons.get(i);
    if (!parts || !parts.wheels.length) return;
    const b = this.bodies;
    let hp = 0;
    for (const w of parts.wheels) if (this.live[w] && this.isUp(w)) hp += Math.max(0, b.hp[w]!);
    b.hp[i] = Math.max(1, hp);
  }

  /** Puts a riding body where it sits on its carrier (after the carrier has moved this tick). */
  private carry(i: number): void {
    const c = this.carrier[i]!;
    const b = this.bodies;
    const h = this.heading[c]!;
    const fx = -Math.sin(h);
    const fz = -Math.cos(h);
    const rx = Math.cos(h);
    const rz = -Math.sin(h);
    const x = b.x[c]! + rx * this.carryX[i]! + fx * this.carryZ[i]!;
    const z = b.z[c]! + rz * this.carryX[i]! + fz * this.carryZ[i]!;
    b.x[i] = x;
    b.z[i] = z;
    b.y[i] = this.world.heightAt(x, z) + this.lift[i]!;
    this.vx[i] = 0;
    this.vz[i] = 0;
    if (SOLDIERS[TYPES[this.type[i]!]!].fixture) this.heading[i] = h;
    // A ram's crew push it: they walk at its pace (and stand when it stops), back on their feet after a stagger.
    if (SOLDIERS[TYPES[this.type[c]!]!].wagon?.needsCrew) {
      const s = this.state[i];
      if (s === STATE.hit && this.timer[i]! < HIT_STAGGER) return;
      if (s !== STATE.idle && s !== STATE.move && s !== STATE.hit) return;
      const speed = Math.hypot(this.vx[c]!, this.vz[c]!);
      const walking = speed > 0.2;
      this.state[i] = walking ? STATE.move : STATE.idle;
      if (walking) this.play(i, 'walk', speed / this.clips.speed('walk'));
      else this.play(i, 'idle', 1);
      return;
    }
    // The crew don't walk about on the deck: anything but a shot or a fall is standing still.
    if (this.state[i] === STATE.move) {
      this.state[i] = STATE.idle;
      this.play(i, 'idle', 1);
    }
  }

  /** A war wagon (GDD §9.3) rolls straight at the banner at its own pace until it stalls or reaches the ring. */
  private updateWagon(i: number, dt: number, moveDt: number, def: SoldierDef, w: WagonDef): void {
    const b = this.bodies;
    if (w.doors) this.updateDoors(i, dt, w.doors);
    const d = Math.hypot(this.goal.x - b.x[i]!, this.goal.z - b.z[i]!);
    const pushers = w.needsCrew ? this.crewUp(i) : w.crew.length;
    if (this.wheelsBroken[i]! >= w.stallAt || d <= w.stopFrom || pushers === 0) {
      this.stop(i, dt);
      this.integrate(i, moveDt, false);
      this.state[i] = STATE.idle;
      if (def.lob && pushers > 0 && d <= w.stopFrom) this.updateLob(i, dt, def.lob);
      return;
    }
    this.target[i] = NONE;
    // A ram slows as its crew fall: the last one pushes it at a crawl.
    const pace = w.needsCrew ? 0.35 + (0.65 * pushers) / Math.max(1, w.crew.length) : 1;
    this.steer(i, this.goal.x, this.goal.z, def.speed * pace, dt);
    this.integrate(i, moveDt, true);
    this.state[i] = STATE.move;
  }

  /**
   * A stopped catapult turns to face the banner and, every `lob.every` seconds, throws at the Queen's soldiers (the
   * thickest group in its reach) or, every other throw or with none in reach, the banner.
   */
  private updateLob(i: number, dt: number, lob: LobDef): void {
    const b = this.bodies;
    const want = Math.atan2(-(this.goal.x - b.x[i]!), -(this.goal.z - b.z[i]!));
    this.heading[i] = this.heading[i]! + angleDelta(this.heading[i]!, want) * Math.min(1, dt * 2);
    this.cooldown[i] = this.cooldown[i]! - dt;
    if (this.cooldown[i]! > 0) return;
    this.cooldown[i] = lob.every;
    this.charges[i] = this.charges[i]! + 1;
    let tx = this.goal.x;
    let tz = this.goal.z;
    if (this.charges[i]! % 2 === 1) {
      // The thickest group of the Queen's soldiers (or the hero among them) in its reach.
      let best = 0;
      for (let j = 0; j < this.capacity; j++) {
        if (!this.live[j] || this.team[j] !== ALLY || !this.isUp(j)) continue;
        const d = Math.hypot(b.x[j]! - b.x[i]!, b.z[j]! - b.z[i]!);
        if (d > lob.range || d < lob.minRange) continue;
        near.length = 0;
        this.hash.queryCircle(b.x[j]!, b.z[j]!, lob.radius, near);
        let n = 0;
        for (const k of near) if (this.team[k] === ALLY) n++;
        if (n > best) {
          best = n;
          tx = b.x[j]!;
          tz = b.z[j]!;
        }
      }
    }
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * lob.scatter;
    let boulder = this.boulders.find((x) => !x.live);
    if (!boulder) {
      boulder = { live: false, from: i, lob, fromX: 0, fromY: 0, fromZ: 0, toX: 0, toY: 0, toZ: 0, age: 0 };
      this.boulders.push(boulder);
    }
    boulder.live = true;
    boulder.from = i;
    boulder.lob = lob;
    boulder.fromX = b.x[i]!;
    boulder.fromY = b.y[i]! + 2.6;
    boulder.fromZ = b.z[i]!;
    boulder.toX = tx + Math.cos(a) * r;
    boulder.toZ = tz + Math.sin(a) * r;
    boulder.toY = this.world.heightAt(boulder.toX, boulder.toZ);
    boulder.age = 0;
    this.onLob?.(i, boulder);
  }

  /** Boulders land: the Queen's soldiers and the hero within the blast are hurt and knocked about. */
  private updateBoulders(dt: number): void {
    const b = this.bodies;
    for (const boulder of this.boulders) {
      if (!boulder.live) continue;
      boulder.age += dt;
      if (boulder.age < boulder.lob.flight) continue;
      boulder.live = false;
      const { toX: x, toZ: z, lob } = boulder;
      near.length = 0;
      this.hash.queryCircle(x, z, lob.radius + CROWD.radius, near);
      for (const j of near.slice()) {
        if (this.team[j] !== ALLY || !this.live[j] || !this.isUp(j)) continue;
        if (Math.hypot(b.x[j]! - x, b.z[j]! - z) > lob.radius + b.radius[j]!) continue;
        this.damage(j, lob.hit, b.x[j]! - x || 0.01, b.z[j]! - z);
      }
      if (this.hero.active && Math.hypot(this.hero.x - x, this.hero.z - z) < lob.radius + HERO_RADIUS) this.onHeroHit?.(lob.hit, x, z);
      this.onBoulder?.(boulder);
    }
  }

  /**
   * The Siege Tower's doors (GDD §9.3): every so often, moving or stalled, a squad steps out of one side and then the
   * other and marches on the banner.
   */
  private updateDoors(i: number, dt: number, doors: NonNullable<WagonDef['doors']>): void {
    this.doorClock[i] = this.doorClock[i]! - dt;
    if (this.doorClock[i]! > 0) return;
    this.doorClock[i] = doors.every;
    const side = this.doorsOpened[i]! % 2 === 0 ? -1 : 1;
    this.doorsOpened[i] = this.doorsOpened[i]! + 1;
    const b = this.bodies;
    const h = this.heading[i]!;
    const x = b.x[i]! + Math.cos(h) * side * 3.6;
    const z = b.z[i]! - Math.sin(h) * side * 3.6;
    this.spawnSquad({ type: doors.type, count: doors.count, formation: 'block', x, z, facing: h, order: 'attack' });
    this.onDoors?.(i, side);
  }

  /**
   * The Iron Ox (GDD §9.3): rolls at the banner until it's close enough to burn it, turning to face what it's about to
   * burn. Every so often its horns glow through a wind-up (the cone shows on the ground), then fire fills the cone.
   */
  private updateOx(i: number, dt: number, moveDt: number, def: SoldierDef, ox: OxDef): void {
    const b = this.bodies;
    const f = ox.fire;
    this.target[i] = NONE;
    if (this.fireTimer[i]! > 0) {
      // Winding up: it stands, turns to its mark, and breathes when the glow is full.
      this.stop(i, dt);
      this.integrate(i, moveDt, false);
      const want = Math.atan2(-this.chargeX[i]!, -this.chargeZ[i]!);
      this.heading[i] = this.heading[i]! + angleDelta(this.heading[i]!, want) * Math.min(1, dt * 4);
      this.fireTimer[i] = this.fireTimer[i]! - dt;
      if (this.fireTimer[i]! <= 0) {
        this.fireTimer[i] = 0;
        this.breathe(i, f);
      }
      return;
    }
    this.cooldown[i] = this.cooldown[i]! - dt;
    if (this.cooldown[i]! <= 0) {
      this.cooldown[i] = f.every;
      const toHero = this.hero.active && Math.hypot(this.hero.x - b.x[i]!, this.hero.z - b.z[i]!) < f.aimFrom;
      const dx = (toHero ? this.hero.x : this.goal.x) - b.x[i]!;
      const dz = (toHero ? this.hero.z : this.goal.z) - b.z[i]!;
      const d = Math.hypot(dx, dz) || 1;
      this.chargeX[i] = dx / d;
      this.chargeZ[i] = dz / d;
      this.fireTimer[i] = f.windup;
      this.onFireWindup?.(i);
      return;
    }
    const d = Math.hypot(this.goal.x - b.x[i]!, this.goal.z - b.z[i]!);
    if (d <= OX_STOP) {
      this.stop(i, dt);
      this.integrate(i, moveDt, false);
      this.state[i] = STATE.idle;
      return;
    }
    this.steer(i, this.goal.x, this.goal.z, def.speed, dt);
    this.integrate(i, moveDt, true);
    this.state[i] = STATE.move;
  }

  /** Fire fills the Iron Ox's cone: the Queen's soldiers and the hero in it are burned; the game burns the banner. */
  private breathe(i: number, f: FireDef): void {
    const b = this.bodies;
    const x = b.x[i]!;
    const z = b.z[i]!;
    const dirX = this.chargeX[i]!;
    const dirZ = this.chargeZ[i]!;
    const cos = Math.cos(f.half);
    near.length = 0;
    this.hash.queryCircle(x, z, f.length + CROWD.radius, near);
    for (const j of near.slice()) {
      if (this.team[j] !== ALLY || !this.live[j] || !this.isUp(j)) continue;
      const dx = b.x[j]! - x;
      const dz = b.z[j]! - z;
      const d = Math.hypot(dx, dz);
      if (d > f.length || d < 0.01 || (dx * dirX + dz * dirZ) / d < cos) continue;
      this.damage(j, f.hit * 2, dx, dz);
    }
    if (this.hero.active) {
      const dx = this.hero.x - x;
      const dz = this.hero.z - z;
      const d = Math.hypot(dx, dz);
      if (d <= f.length && d > 0.01 && (dx * dirX + dz * dirZ) / d >= cos) this.onHeroHit?.(f.hit, x, z);
    }
    this.onFire?.(i, dirX, dirZ, f);
  }

  /** The Iron Ox winding up its fire: where it is, which way it will breathe, and how far (for the cone on the ground). */
  fireCone(i: number): { x: number; z: number; dirX: number; dirZ: number; length: number; half: number; left: number } | null {
    const f = SOLDIERS[TYPES[this.type[i]!]!].ox?.fire;
    if (!f || !this.live[i] || this.fireTimer[i]! <= 0) return null;
    const b = this.bodies;
    return { x: b.x[i]!, z: b.z[i]!, dirX: this.chargeX[i]!, dirZ: this.chargeZ[i]!, length: f.length, half: f.half, left: this.fireTimer[i]! };
  }

  /** The Iron Ox's phase: 0 at first, 1 once the elite captains have joined, 2 once its core shows. */
  oxPhase(i: number): number {
    return this.phase[i]!;
  }

  /** How many of a wagon's or ram's crew are on their feet. */
  crewUp(i: number): number {
    let n = 0;
    for (const c of this.wagons.get(i)?.crew ?? []) if (this.live[c] && this.isUp(c)) n++;
    return n;
  }

  /** A wheel breaks: the wagon stalls at its `stallAt`, and collapses with the last one (its army runs). */
  private breakWheel(wheel: number, wagon: number): void {
    const def = SOLDIERS[TYPES[this.type[wagon]!]!];
    const w = def.wagon!;
    const b = this.bodies;
    this.carrier[wheel] = -1;
    // A broken wheel is gone at once (the wagon's model shows it).
    this.timer[wheel] = this.knockedSeconds;
    this.wheelsBroken[wagon] = this.wheelsBroken[wagon]! + 1;
    this.onWheelBreak?.(wheel, wagon);
    this.wagonHealth(wagon);
    const parts = this.wagons.get(wagon);
    if (this.wheelsBroken[wagon] === w.stallAt) {
      // Stalled: the crossbows shoot faster, and footmen spill out of the back.
      for (const c of parts?.crew ?? []) this.reloadScale[c] = w.stalledReload;
      const h = this.heading[wagon]!;
      const bx = b.x[wagon]! + Math.sin(h) * 2.6;
      const bz = b.z[wagon]! + Math.cos(h) * 2.6;
      w.spill.forEach((squad, k) => {
        const side = k % 2 === 0 ? -1 : 1;
        this.spawnSquad({ type: squad.type, count: squad.count, formation: 'block', x: bx + Math.cos(h) * side * 1.8, z: bz - Math.sin(h) * side * 1.8, facing: h, order: 'attack' });
      });
      this.onWagonStall?.(wagon);
    }
    if (this.wheelsBroken[wagon]! >= w.wheels.length && this.isUp(wagon)) {
      // The crew tumble off as it collapses.
      for (const c of parts?.crew ?? []) {
        if (!this.live[c]) continue;
        this.carrier[c] = -1;
        this.lift[c] = 0;
        if (this.isUp(c)) this.knock(c, 0, 0);
      }
      this.knock(wagon, 0, 0);
    }
  }

  /** Someone is winding up or running a charge. */
  get charging(): boolean {
    for (let i = 0; i < this.capacity; i++) if (this.live[i] && (this.state[i] === STATE.windup || this.state[i] === STATE.charge)) return true;
    return false;
  }

  /** A soldier in a charge's wind-up, with where it will run (for the glowing lane), or −1 from `from` on. */
  windingUp(from = 0): number {
    for (let i = from; i < this.capacity; i++) {
      if (this.live[i] && this.state[i] === STATE.windup && SOLDIERS[TYPES[this.type[i]!]!].charge?.lane !== false) return i;
    }
    return -1;
  }

  /** Seconds since a soldier was knocked out (riders fall from the saddle, their horses bolt), or −1. */
  knockedTime(i: number): number {
    return this.state[i] === STATE.knocked ? this.timer[i]! : -1;
  }

  isUp(i: number): boolean {
    const s = this.state[i];
    return s !== STATE.off && s !== STATE.knocked && s !== STATE.flee;
  }

  /**
   * Advances the crowd by real time in fixed 30 Hz ticks. Returns how far between the last two ticks the present is
   * (0 to 1), for drawing smoothly at any frame rate.
   */
  step(dt: number): number {
    const tick = 1 / CROWD.tickRate;
    this.accumulator = Math.min(this.accumulator + dt, tick * 4);
    while (this.accumulator >= tick) {
      this.accumulator -= tick;
      this.tick(tick);
    }
    return this.accumulator / tick;
  }

  /** One fixed tick. */
  tick(dt: number): void {
    this.time += dt;
    this.ticks++;
    const b = this.bodies;
    this.hash.clear();
    for (let i = 0; i < this.capacity; i++) {
      if (!this.live[i]) continue;
      this.prevX[i] = b.x[i]!;
      this.prevZ[i] = b.z[i]!;
      this.prevHeading[i] = this.heading[i]!;
      if (this.isUp(i)) this.hash.insert(i, b.x[i]!, b.z[i]!);
    }
    for (const squad of this.squads) this.moveAnchor(squad, dt);
    const far2 = CROWD.farDistance * CROWD.farDistance;
    for (let i = 0; i < this.capacity; i++) {
      if (!this.live[i]) continue;
      this.dt[i] = this.dt[i]! + dt;
      // Far from the camera, soldiers think at half rate (tech design §5.5).
      const dx = b.x[i]! - this.camera.x;
      const dz = b.z[i]! - this.camera.z;
      if (dx * dx + dz * dz > far2 && (i + this.ticks) % 2 === 1 && this.state[i] !== STATE.knocked) {
        // Thinking skipped this tick, but the body keeps moving, so far soldiers glide rather than stutter.
        this.coast(i, dt);
        continue;
      }
      const step = this.dt[i]!;
      this.dt[i] = 0;
      this.flash[i] = Math.max(0, this.flash[i]! - step * 9);
      this.update(i, step, dt);
    }
    for (let i = 0; i < this.capacity; i++) {
      const c = this.carrier[i]!;
      if (c < 0 || !this.live[i]) continue;
      if (!this.live[c]) this.carrier[i] = -1;
      else this.carry(i);
    }
    this.updateBolts(dt);
    this.updateBoulders(dt);
    b.reindex();
  }

  private moveAnchor(squad: Squad, dt: number): void {
    if (squad.order !== 'attack' || squad.standing <= 0) return;
    const def = SOLDIERS[squad.type];
    const left = this.flow.distance(squad.anchorX, squad.anchorZ);
    if (left < 0.6) return;
    // Wait for stragglers: the anchor slows when the squad falls behind it.
    let lag = 0;
    let n = 0;
    for (let i = 0; i < this.capacity; i++) {
      if (this.squadOf[i] !== squad.id || !this.isUp(i) || this.target[i] !== NONE) continue;
      const p = this.slotPosition(squad, this.slotOf[i]!);
      lag += Math.hypot(p.x - this.bodies.x[i]!, p.z - this.bodies.z[i]!);
      n++;
    }
    const behind = n ? lag / n : 0;
    const bonus = squad.captain >= 0 && this.isUp(squad.captain) ? 1 + CROWD.captainSpeedBonus : 1;
    const speed = def.speed * bonus * Math.max(0, Math.min(1, 1.6 - behind / 2.5));
    if (n === 0) return;
    this.flow.direction(squad.anchorX, squad.anchorZ, tmp);
    if (tmp.x === 0 && tmp.z === 0) return;
    const move = Math.min(left, speed * dt);
    squad.anchorX += tmp.x * move;
    squad.anchorZ += tmp.z * move;
    squad.facing += angleDelta(squad.facing, Math.atan2(-tmp.x, -tmp.z)) * Math.min(1, dt * 1.5);
  }

  /** Where a squad slot stands in the world. */
  slotPosition(squad: Squad, slot: number): { x: number; z: number } {
    const s = squad.slots[slot] ?? { x: 0, z: 0 };
    const sin = Math.sin(squad.facing);
    const cos = Math.cos(squad.facing);
    // Forward is (−sin, −cos); right is (cos, −sin); slot z runs backward.
    return { x: squad.anchorX + s.x * cos + s.z * sin, z: squad.anchorZ - s.x * sin + s.z * cos };
  }

  /**
   * One soldier's tick. `dt` is the time since he last thought (two ticks when far); `moveDt` the time since he last
   * moved (always one tick).
   */
  private update(i: number, dt: number, moveDt: number): void {
    const state = this.state[i]!;
    const b = this.bodies;
    if (state === STATE.knocked) {
      // The tumble: a short slide back along the blow.
      if (this.vx[i] !== 0 || this.vz[i] !== 0) {
        tmp.x = b.x[i]! + this.vx[i]! * dt;
        tmp.z = b.z[i]! + this.vz[i]! * dt;
        this.world.confine(tmp, CROWD.radius);
        b.x[i] = tmp.x;
        b.z[i] = tmp.z;
        b.y[i] = this.world.heightAt(tmp.x, tmp.z);
        const keep = Math.exp(-CROWD.tumble.decay * dt);
        this.vx[i] = this.vx[i]! * keep;
        this.vz[i] = this.vz[i]! * keep;
        if (Math.hypot(this.vx[i]!, this.vz[i]!) < 0.08) this.vx[i] = this.vz[i] = 0;
      }
      const before = this.timer[i]!;
      this.timer[i] = before + dt;
      const fall = this.clips.duration('knocked') * 0.7;
      if (before < fall && this.timer[i]! >= fall) this.onLand?.(b.x[i]!, b.y[i]!, b.z[i]!);
      if (this.timer[i]! >= this.knockedSeconds) this.release(i);
      return;
    }
    if (state === STATE.flee) {
      const squad = this.squads[this.squadOf[i]!];
      this.steer(i, squad?.homeX ?? 0, squad?.homeZ ?? -80, SOLDIERS[TYPES[this.type[i]!]!].speed * CROWD.routSpeed, dt);
      this.integrate(i, moveDt, false);
      this.play(i, 'run', Math.hypot(this.vx[i]!, this.vz[i]!) / this.clips.speed('run'));
      const edge = this.world.half + 4;
      if (Math.abs(b.x[i]!) > edge || Math.abs(b.z[i]!) > edge || this.timer[i]! > 12) this.release(i);
      this.timer[i] = this.timer[i]! + dt;
      return;
    }
    const def = SOLDIERS[TYPES[this.type[i]!]!];
    this.cooldown[i] = this.cooldown[i]! - dt;
    this.timer[i] = this.timer[i]! + dt;
    // The time to the next charge runs whatever he's doing; the charge starts when he's free.
    if (def.charge) this.nextCharge[i] = this.nextCharge[i]! - dt;
    if (state === STATE.cheer) {
      this.stop(i, dt);
      return;
    }
    if (state === STATE.windup || state === STATE.charge) {
      this.updateCharge(i, dt, moveDt, def);
      return;
    }
    if (def.burst && this.updateFirebrand(i, dt, moveDt, def, def.burst)) return;
    if (def.fixture) return this.stop(i, dt);
    if (def.wagon) return this.updateWagon(i, dt, moveDt, def, def.wagon);
    if (def.ox) return this.updateOx(i, dt, moveDt, def, def.ox);
    if (state === STATE.hit) {
      this.stop(i, dt);
      if (this.timer[i]! >= HIT_STAGGER) this.setState(i, STATE.idle);
      return;
    }
    if (state === STATE.attack || state === STATE.shoot) {
      this.stop(i, dt);
      this.face(i, dt);
      const clip: ClipName = state === STATE.shoot ? 'shoot' : this.clip[i] === CLIP_INDEX.attackB ? 'attackB' : 'attackA';
      const length = this.clips.duration(clip);
      if (!this.struck[i] && this.timer[i]! >= length * (HIT_AT[clip] ?? 0.5)) {
        this.struck[i] = 1;
        if (state === STATE.shoot) this.loose(i);
        else this.blow(i);
      }
      if (this.timer[i]! >= length) {
        this.setState(i, STATE.idle);
        const [lo, hi] = CROWD.attackRest;
        this.cooldown[i] = def.role === 'ranged' ? (def.reload ?? 3) * this.reloadScale[i]! : lo + Math.random() * (hi - lo);
      }
      return;
    }
    this.retarget[i] = this.retarget[i]! - dt;
    if (this.retarget[i]! <= 0 || !this.targetValid(i)) {
      this.retarget[i] = RETARGET_SECONDS * (0.8 + Math.random() * 0.4);
      this.chooseTarget(i, def.role === 'ranged' ? (def.range ?? 28) : 0);
    }
    if (def.charge && this.startCharge(i, def)) return;
    const t = this.target[i]!;
    const squad = this.squads[this.squadOf[i]!];
    if (t !== NONE) {
      const tx = t === HERO ? this.hero.x : b.x[t]!;
      const tz = t === HERO ? this.hero.z : b.z[t]!;
      const gap = Math.hypot(tx - b.x[i]!, tz - b.z[i]!) - b.radius[i]! - (t === HERO ? HERO_RADIUS : b.radius[t]!);
      if (def.role === 'ranged') {
        if (gap > (def.range ?? 28) && squad?.order !== 'hold') {
          this.steer(i, tx, tz, def.speed, dt);
        } else {
          this.stop(i, dt);
          this.face(i, dt);
          if (this.cooldown[i]! <= 0) this.setState(i, STATE.shoot);
        }
      } else if (gap > this.reachOf(i)) {
        this.steer(i, tx, tz, def.speed * 1.25, dt);
      } else {
        this.stop(i, dt);
        this.face(i, dt);
        if (this.cooldown[i]! <= 0) this.setState(i, STATE.attack);
      }
    } else if (squad) {
      const p = this.slotPosition(squad, this.slotOf[i]!);
      const d = Math.hypot(p.x - b.x[i]!, p.z - b.z[i]!);
      if (d > 0.3) {
        // Catch up a little faster when far from the slot.
        const bonus = squad.captain >= 0 && this.isUp(squad.captain) ? 1 + CROWD.captainSpeedBonus : 1;
        const speed = def.speed * bonus * Math.min(1.35, 0.8 + d / 4);
        this.steer(i, p.x, p.z, Math.min(speed, (d / dt) * 0.5), dt);
      } else {
        this.stop(i, dt);
        this.heading[i] = this.heading[i]! + angleDelta(this.heading[i]!, squad.facing) * Math.min(1, dt * 5);
      }
    } else {
      this.stop(i, dt);
    }
    this.integrate(i, moveDt, true);
    // An attack or a shot just began: its clip is set, so don't fall back to walking or standing.
    if (this.state[i] === STATE.attack || this.state[i] === STATE.shoot) return;
    const speed = Math.hypot(this.vx[i]!, this.vz[i]!);
    const moving = speed > 0.25;
    this.state[i] = moving ? STATE.move : STATE.idle;
    if (moving) {
      // A bigger soldier's stride covers more ground: his clips play slower, so planted feet don't slide.
      const size = def.size ?? 1;
      // Giants (bosses, the Brute) only run in a charge: a giant's run clip can't slow enough for a walk.
      const run = !def.boss && size < 2 && speed > this.clips.speed('walk') * size * 1.45;
      const clip = run ? 'run' : 'walk';
      this.play(i, clip, speed / (this.clips.speed(clip) * size));
    } else {
      this.play(i, 'idle', 1);
    }
  }

  private get knockedSeconds(): number {
    return this.clips.duration('knocked') + CROWD.lie + CROWD.sink;
  }

  /** Seconds since a knocked-out soldier began to sink (for the renderer), or 0. */
  sinkAmount(i: number): number {
    if (this.state[i] !== STATE.knocked) return 0;
    const start = this.clips.duration('knocked') + CROWD.lie;
    return Math.max(0, (this.timer[i]! - start) / CROWD.sink);
  }

  private targetValid(i: number): boolean {
    const t = this.target[i]!;
    if (t === NONE) return true;
    if (t === HERO) return this.hero.active;
    return this.live[t] === 1 && this.isUp(t);
  }

  /** Picks the nearest opponent in reach: enemies within 6 m of themselves, allies within 8 m of their slot. */
  private chooseTarget(i: number, range: number): void {
    const b = this.bodies;
    const team = this.team[i]!;
    const squad = this.squads[this.squadOf[i]!];
    let cx = b.x[i]!;
    let cz = b.z[i]!;
    let radius: number = team === ENEMY ? CROWD.engageEnemy : CROWD.engageAlly;
    if (team === ALLY && squad?.order === 'hold') {
      const p = this.slotPosition(squad, this.slotOf[i]!);
      cx = p.x;
      cz = p.z;
    }
    if (range > 0) {
      cx = b.x[i]!;
      cz = b.z[i]!;
      radius = range;
    }
    near.length = 0;
    this.hash.queryCircle(cx, cz, radius, near);
    let best = NONE;
    let bestD = Infinity;
    for (const j of near) {
      if (this.team[j] === team || !this.isUp(j)) continue;
      if (Math.hypot(b.x[j]! - cx, b.z[j]! - cz) > radius) continue;
      const d = Math.hypot(b.x[j]! - b.x[i]!, b.z[j]! - b.z[i]!);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    if (team === ENEMY && this.hero.active && !SOLDIERS[TYPES[this.type[i]!]!].ignoresHero) {
      const dh = Math.hypot(this.hero.x - cx, this.hero.z - cz);
      const d = Math.hypot(this.hero.x - b.x[i]!, this.hero.z - b.z[i]!);
      if (dh <= radius && d < bestD) best = HERO;
    }
    this.target[i] = best;
  }

  /** The other side's nearest standing soldier within `reach` (and at least a few metres off), or −1. Hulls don't count. */
  private nearestFoe(i: number, reach: number): number {
    const b = this.bodies;
    near.length = 0;
    this.hash.queryCircle(b.x[i]!, b.z[i]!, reach, near);
    let best = -1;
    let bestD = Infinity;
    for (const j of near) {
      if (this.team[j] === this.team[i] || !this.isUp(j) || SOLDIERS[TYPES[this.type[j]!]!].hidden) continue;
      const d = Math.hypot(b.x[j]! - b.x[i]!, b.z[j]! - b.z[i]!);
      if (d < 5 || d > reach || d >= bestD) continue;
      bestD = d;
      best = j;
    }
    return best;
  }

  /** A melee blow lands (the attack clip's hit frame), if the target is still in reach. */
  private blow(i: number): void {
    const t = this.target[i]!;
    const b = this.bodies;
    const def = SOLDIERS[TYPES[this.type[i]!]!];
    if (t === HERO) {
      if (!this.hero.active) return;
      const gap = Math.hypot(this.hero.x - b.x[i]!, this.hero.z - b.z[i]!) - b.radius[i]! - HERO_RADIUS;
      if (gap <= this.reachOf(i) + 0.4) this.onHeroHit?.(def.hit, b.x[i]!, b.z[i]!);
      return;
    }
    if (t < 0 || !this.isUp(t)) return;
    const gap = Math.hypot(b.x[t]! - b.x[i]!, b.z[t]! - b.z[i]!) - b.radius[i]! - b.radius[t]!;
    if (gap > this.reachOf(i) + 0.4) return;
    const hit = def.team === 'ally' ? def.hit * this.allyBoost : def.hit;
    this.damage(t, hit, b.x[t]! - b.x[i]!, b.z[t]! - b.z[i]!);
  }

  /** An archer looses a bolt at where the target will be when it lands. */
  private loose(i: number): void {
    const t = this.target[i]!;
    const b = this.bodies;
    if (t === NONE || (t !== HERO && !this.isUp(t))) return;
    const flight = CROWD.boltFlight;
    const tx = t === HERO ? this.hero.x : b.x[t]! + this.vx[t]! * flight * 0.6;
    const tz = t === HERO ? this.hero.z : b.z[t]! + this.vz[t]! * flight * 0.6;
    let bolt = this.bolts.find((x) => !x.live);
    if (!bolt) {
      bolt = { live: false, team: 0, damage: 0, fromX: 0, fromY: 0, fromZ: 0, toX: 0, toY: 0, toZ: 0, age: 0, flight };
      this.bolts.push(bolt);
    }
    bolt.live = true;
    bolt.team = this.team[i]!;
    bolt.damage = SOLDIERS[TYPES[this.type[i]!]!].hit;
    bolt.fromX = b.x[i]!;
    bolt.fromY = b.y[i]! + 1.2;
    bolt.fromZ = b.z[i]!;
    this.onLoose?.(bolt.fromX, bolt.fromY, bolt.fromZ);
    // A little scatter, so a volley lands as a pattern rather than one point.
    bolt.toX = tx + (Math.random() - 0.5) * 1.2;
    bolt.toZ = tz + (Math.random() - 0.5) * 1.2;
    bolt.toY = this.world.heightAt(bolt.toX, bolt.toZ);
    bolt.age = 0;
    bolt.flight = flight;
  }

  private updateBolts(dt: number): void {
    const b = this.bodies;
    for (const bolt of this.bolts) {
      if (!bolt.live) continue;
      bolt.age += dt;
      if (bolt.age < bolt.flight) continue;
      bolt.live = false;
      this.onBoltLand?.(bolt.toX, bolt.toY, bolt.toZ);
      if (bolt.team === ENEMY && this.hero.active && Math.hypot(this.hero.x - bolt.toX, this.hero.z - bolt.toZ) < CROWD.boltRadius) {
        this.onHeroHit?.(bolt.damage, bolt.fromX, bolt.fromZ);
        continue;
      }
      near.length = 0;
      this.hash.queryCircle(bolt.toX, bolt.toZ, CROWD.boltRadius, near);
      let best = -1;
      let bestD: number = CROWD.boltRadius;
      for (const j of near) {
        if (this.team[j] === bolt.team || !this.isUp(j)) continue;
        const d = Math.hypot(b.x[j]! - bolt.toX, b.z[j]! - bolt.toZ);
        if (d < bestD) {
          bestD = d;
          best = j;
        }
      }
      if (best >= 0) this.damage(best, bolt.damage, bolt.toX - bolt.fromX, bolt.toZ - bolt.fromZ);
    }
  }

  /**
   * Damage from anyone. Knocks the soldier out at 0 health (falling away from `dirX`/`dirZ`, the blow's direction);
   * otherwise a short stagger. Returns true on a knockout.
   */
  damage(i: number, amount: number, dirX: number, dirZ: number, blast = false): boolean {
    const hurtDef = SOLDIERS[TYPES[this.type[i]!]!];
    if (!this.live[i] || !this.isUp(i) || (hurtDef.invulnerable && !(blast && hurtDef.explosiveOnly))) return false;
    const b = this.bodies;
    const ox = hurtDef.ox;
    // The Iron Ox's armour halves all but explosions; once its core shows, explosions do half again more.
    if (ox) amount *= this.phase[i]! < 2 ? (blast ? 1 : ox.armour) : blast ? ox.core : 1;
    b.hp[i] = b.hp[i]! - amount;
    if (ox && b.hp[i]! > 0) {
      if (this.phase[i] === 0 && b.hp[i]! <= b.maxHp[i]! * ox.summonAt) {
        this.phase[i] = 1;
        this.onBossHalf?.(i);
      }
      if (this.phase[i]! < 2 && b.hp[i]! <= b.maxHp[i]! * ox.coreAt) {
        this.phase[i] = 2;
        this.onOxCore?.(i);
      }
    }
    this.flash[i] = 1;
    const carrier = this.carrier[i]!;
    if (carrier >= 0 && this.wagons.has(carrier)) this.wagonHealth(carrier);
    if (b.hp[i]! > 0) {
      const def = SOLDIERS[TYPES[this.type[i]!]!];
      // A boss below half health changes (Sir Grudge throws his shield down).
      if (def.boss && def.brokenAs && b.hp[i]! <= b.maxHp[i]! / 2) this.becomeBare(i, def.brokenAs, true);
      const s = this.state[i];
      // Bosses don't stagger, and a charge isn't stopped by a hit.
      if (s !== STATE.attack && s !== STATE.shoot && s !== STATE.windup && s !== STATE.charge && !def.boss && !def.burst) this.setState(i, STATE.hit);
      return false;
    }
    this.knock(i, dirX, dirZ);
    return true;
  }

  private knock(i: number, dirX: number, dirZ: number, paid = true): void {
    const b = this.bodies;
    b.hp[i] = 0;
    b.alive[i] = 0;
    const l = Math.hypot(dirX, dirZ);
    const tumble = l > 1e-4 && !SOLDIERS[TYPES[this.type[i]!]!].boss ? CROWD.tumble.speed / l : 0;
    this.vx[i] = dirX * tumble;
    this.vz[i] = dirZ * tumble;
    // Face where the blow came from, so the fall (backward) goes with it.
    if (Math.hypot(dirX, dirZ) > 1e-4) this.heading[i] = Math.atan2(dirX, dirZ);
    this.prevHeading[i] = this.heading[i]!;
    this.setState(i, STATE.knocked);
    if (paid && this.team[i] === ENEMY) this.onFallen?.(TYPES[this.type[i]!]!, b.x[i]!, b.y[i]!, b.z[i]!, false);
    const squad = this.squads[this.squadOf[i]!];
    if (squad) {
      squad.standing--;
      if (squad.captain === i) this.rout(squad, b.x[i]!, b.z[i]!, false, SOLDIERS[TYPES[this.type[i]!]!].routRadius);
    }
    // A wagon's wheel breaks; a ram's pusher falls where he stood.
    const carrier = this.carrier[i]!;
    const parts = carrier >= 0 ? this.wagons.get(carrier) : undefined;
    if (parts?.wheels.includes(i)) this.breakWheel(i, carrier);
    else if (parts && SOLDIERS[TYPES[this.type[carrier]!]!].wagon?.needsCrew) {
      this.carrier[i] = -1;
      this.lift[i] = 0;
      // The last pusher down: a ram is abandoned where it stands (beaten, it no longer drains the banner); the Siege
      // Tower only stalls (its beams still stand).
      if (this.crewUp(carrier) === 0 && this.isUp(carrier)) {
        if (SOLDIERS[TYPES[this.type[carrier]!]!].wagon?.abandon === false) this.onWagonStall?.(carrier);
        else this.knock(carrier, 0, 0);
      }
    }
    // A ram broken by explosions: its crew are thrown down with it.
    const own = this.wagons.get(i);
    if (own && !own.wheels.length) {
      for (const c of own.crew) {
        if (!this.live[c]) continue;
        this.carrier[c] = -1;
        this.lift[c] = 0;
        if (this.isUp(c)) this.knock(c, b.x[c]! - b.x[i]!, b.z[c]! - b.z[i]!);
      }
    }
    // A firebrand shot down bursts where he falls (among his own side if shot early).
    if (SOLDIERS[TYPES[this.type[i]!]!].burst && !this.burstDone[i]) this.burst(i);
    // The boss is down: his whole army breaks and runs (GDD §9.3).
    if (SOLDIERS[TYPES[this.type[i]!]!].boss) {
      for (const s of this.squads) if (s.team === ENEMY && s.order !== 'routed' && s.standing > 0) this.rout(s, b.x[i]!, b.z[i]!, true);
      this.onBossDown?.(i);
    }
  }

  /**
   * The captain is down: his squad within 15 m (an elite captain's: 25) flees and counts as beaten (GDD §4.4). A boss's
   * fall: all of it.
   */
  private rout(squad: Squad, x: number, z: number, everyone = false, radius: number = CROWD.routRadius): void {
    squad.order = 'routed';
    const b = this.bodies;
    for (let i = 0; i < this.capacity; i++) {
      if (this.squadOf[i] !== squad.id || !this.isUp(i)) continue;
      if (!everyone && Math.hypot(b.x[i]! - x, b.z[i]! - z) > radius) continue;
      b.alive[i] = 0;
      squad.standing--;
      this.target[i] = NONE;
      this.setState(i, STATE.flee);
      // Each one bursts his gold as he runs (GDD §4.4).
      if (this.team[i] === ENEMY) this.onFallen?.(TYPES[this.type[i]!]!, b.x[i]!, b.y[i]!, b.z[i]!, true);
    }
    this.onRout?.(x, z);
  }

  private setState(i: number, state: SoldierState): void {
    this.state[i] = state;
    this.timer[i] = 0;
    this.struck[i] = 0;
    if (state === STATE.attack) this.play(i, Math.random() < 0.5 ? 'attackA' : 'attackB', 1, true);
    else if (state === STATE.shoot) this.play(i, 'shoot', 1, true);
    else if (state === STATE.hit) this.play(i, 'hit', 1, true);
    else if (state === STATE.knocked) this.play(i, 'knocked', 1, true);
    else if (state === STATE.windup) this.play(i, 'block', 1, true);
    else if (state === STATE.charge) this.play(i, 'run', 1.8, true);
  }

  /**
   * Starts a clip, keeping the last one for a short blend. A looping clip that's already playing keeps its phase,
   * even when its rate changes (so walking feet never jump).
   */
  private play(i: number, clip: ClipName, rate: number, restart = false): void {
    const index = CLIP_INDEX[clip];
    const r = Math.max(0.5, Math.min(1.8, rate));
    if (index === this.clip[i] && !restart) {
      const old = this.clipRate[i]!;
      if (Math.abs(r - old) > old * 0.04) {
        const phase = (this.time - this.clipStart[i]!) * old;
        this.clipRate[i] = r;
        this.clipStart[i] = this.time - phase / r;
      }
      return;
    }
    this.prevClip[i] = this.clip[i]!;
    this.prevStart[i] = this.clipStart[i]!;
    this.prevRate[i] = this.clipRate[i]!;
    this.blendStart[i] = this.time;
    this.clip[i] = index;
    this.clipRate[i] = r;
    // Loops start at a random point, so no two soldiers step in time.
    const loops = clip === 'idle' || clip === 'walk' || clip === 'run' || clip === 'cheer' || clip === 'block';
    this.clipStart[i] = loops ? this.time - Math.random() * this.clips.duration(clip) : this.time;
  }

  private steer(i: number, tx: number, tz: number, speed: number, dt: number): void {
    const b = this.bodies;
    let dx = tx - b.x[i]!;
    let dz = tz - b.z[i]!;
    const d = Math.hypot(dx, dz);
    if (d < 1e-4) return this.stop(i, dt);
    dx /= d;
    dz /= d;
    // Enemies far from their goal follow the flow field round props; close in, they head straight there.
    if (this.team[i] === ENEMY && d > 4 && this.target[i] === NONE) {
      this.flow.direction(b.x[i]!, b.z[i]!, tmp);
      if (tmp.x || tmp.z) {
        dx = dx * 0.5 + tmp.x * 0.5;
        dz = dz * 0.5 + tmp.z * 0.5;
        const l = Math.hypot(dx, dz) || 1;
        dx /= l;
        dz /= l;
      }
    }
    const k = Math.min(1, dt * 6);
    this.vx[i] = this.vx[i]! + (dx * speed - this.vx[i]!) * k;
    this.vz[i] = this.vz[i]! + (dz * speed - this.vz[i]!) * k;
  }

  private stop(i: number, dt: number): void {
    const k = Math.min(1, dt * 10);
    this.vx[i] = this.vx[i]! * (1 - k);
    this.vz[i] = this.vz[i]! * (1 - k);
  }

  /** Turns toward the target. */
  private face(i: number, dt: number): void {
    const t = this.target[i]!;
    if (t === NONE) return;
    const b = this.bodies;
    const tx = t === HERO ? this.hero.x : b.x[t]!;
    const tz = t === HERO ? this.hero.z : b.z[t]!;
    const want = Math.atan2(-(tx - b.x[i]!), -(tz - b.z[i]!));
    this.heading[i] = this.heading[i]! + angleDelta(this.heading[i]!, want) * Math.min(1, dt * 10);
  }

  /** A skipped tick: carry on at the same velocity. */
  private coast(i: number, dt: number): void {
    const s = this.state[i];
    if (s !== STATE.move && s !== STATE.flee) return;
    const b = this.bodies;
    tmp.x = b.x[i]! + this.vx[i]! * dt;
    tmp.z = b.z[i]! + this.vz[i]! * dt;
    this.world.confine(tmp, CROWD.radius);
    b.x[i] = tmp.x;
    b.z[i] = tmp.z;
    b.y[i] = this.world.heightAt(tmp.x, tmp.z);
  }

  /** Moves, keeps soldiers apart and off the hero, and turns them the way they walk. */
  private integrate(i: number, dt: number, separate: boolean): void {
    const b = this.bodies;
    let x = b.x[i]! + this.vx[i]! * dt;
    let z = b.z[i]! + this.vz[i]! * dt;
    if (separate) {
      near.length = 0;
      const ri = b.radius[i]!;
      // Big soldiers (bosses) barely give way; everyone keeps clear of them.
      const give = ri > CROWD.radius * 1.5 ? 0.1 : 0.5;
      this.hash.queryCircle(x, z, CROWD.spacing + b.maxRadius, near);
      let checked = 0;
      for (const j of near) {
        if (j === i || checked >= 6) continue;
        const ci = this.carrier[i]!;
        if (this.carrier[j] === i || ci === j || (ci >= 0 && ci === this.carrier[j])) continue;
        const dx = x - b.x[j]!;
        const dz = z - b.z[j]!;
        const d2 = dx * dx + dz * dz;
        const min = Math.max(CROWD.spacing, ri + b.radius[j]! + 0.1);
        if (d2 >= min * min) continue;
        checked++;
        const d = Math.sqrt(d2) || 1e-3;
        const push = (min - d) * give;
        x += (dx / d) * push;
        z += (dz / d) * push;
      }
      if (this.hero.active) {
        const dx = x - this.hero.x;
        const dz = z - this.hero.z;
        const d = Math.hypot(dx, dz);
        const min = HERO_RADIUS + ri;
        if (d < min && d > 1e-4) {
          x = this.hero.x + (dx / d) * min;
          z = this.hero.z + (dz / d) * min;
        }
      }
    }
    tmp.x = x;
    tmp.z = z;
    this.world.confine(tmp, CROWD.radius);
    b.x[i] = tmp.x;
    b.z[i] = tmp.z;
    b.y[i] = this.world.heightAt(tmp.x, tmp.z);
    const speed = Math.hypot(this.vx[i]!, this.vz[i]!);
    if (speed > 0.2 && this.state[i] !== STATE.attack && this.target[i] === NONE) {
      const want = Math.atan2(-this.vx[i]!, -this.vz[i]!);
      this.heading[i] = this.heading[i]! + angleDelta(this.heading[i]!, want) * Math.min(1, dt * 8);
    } else if (speed > 0.2 && this.target[i] !== NONE) {
      this.face(i, dt);
    }
  }

  /**
   * A bullet from the hero (only enemies are in `bodies` as shootable). Returns what it did, for the HUD and effects.
   */
  hit(i: number, damage: number, dirX: number, dirZ: number): { knocked: boolean; armoured: boolean; captain: boolean; blocked: boolean } {
    const captain = this.bodies.role[i] === ROLE.captain;
    const armoured = this.bodies.armoured[i] === 1;
    if (SOLDIERS[TYPES[this.type[i]!]!].invulnerable) return { knocked: false, armoured, captain, blocked: true };
    if (this.shield[i]! > 0 && this.headOn(i, dirX, dirZ)) {
      this.hitShield(i, damage);
      return { knocked: false, armoured, captain, blocked: true };
    }
    const knocked = this.damage(i, damage, dirX, dirZ);
    return { knocked, armoured, captain, blocked: false };
  }

  /**
   * Shoves a standing soldier back along a shot (bosses don't budge). A rider is knocked off his horse instead: true
   * when that happened (it counts as a knockout).
   */
  push(i: number, metres: number, dirX: number, dirZ: number): boolean {
    const def = SOLDIERS[TYPES[this.type[i]!]!];
    if (!this.live[i] || !this.isUp(i) || def.boss) return false;
    if (def.mount) {
      this.knock(i, dirX, dirZ);
      return true;
    }
    const l = Math.hypot(dirX, dirZ) || 1;
    tmp.x = this.bodies.x[i]! + (dirX / l) * metres;
    tmp.z = this.bodies.z[i]! + (dirZ / l) * metres;
    this.world.confine(tmp, CROWD.radius);
    this.bodies.x[i] = tmp.x;
    this.bodies.z[i] = tmp.z;
    return false;
  }

  /** An explosion (a grenade): it breaks a breakable shield at once, then hurts (GDD §8.2). */
  explode(i: number, amount: number, dirX: number, dirZ: number): boolean {
    if (!this.live[i] || !this.isUp(i)) return false;
    if (this.shield[i]! > 0 && Number.isFinite(this.shield[i]!)) this.breakShield(i);
    return this.damage(i, amount, dirX, dirZ, true);
  }

  /** The shot travels along (dirX, dirZ); the soldier faces (−sin, −cos) of his heading. Head-on when they oppose. */
  private headOn(i: number, dirX: number, dirZ: number): boolean {
    const h = this.heading[i]!;
    const l = Math.hypot(dirX, dirZ) || 1;
    return (dirX * -Math.sin(h) + dirZ * -Math.cos(h)) / l < -SHIELD_ARC;
  }

  private hitShield(i: number, damage: number): void {
    const left = this.shield[i]!;
    if (!Number.isFinite(left)) return;
    const def = SOLDIERS[TYPES[this.type[i]!]!];
    const max = (def.shield ?? 1) * this.enemyHp;
    const after = left - damage;
    this.shield[i] = after;
    if (after <= 0) this.breakShield(i);
    else if (left / max > 0.66 && after / max <= 0.66) this.onShieldCrack?.(i, 1);
    else if (left / max > 0.33 && after / max <= 0.33) this.onShieldCrack?.(i, 2);
  }

  private breakShield(i: number): void {
    const def = SOLDIERS[TYPES[this.type[i]!]!];
    this.shield[i] = 0;
    if (def.brokenAs) this.becomeBare(i, def.brokenAs, false);
    this.onShieldBreak?.(i);
  }

  /** Swaps to the shieldless look and numbers, keeping health and place. */
  private becomeBare(i: number, type: SoldierType, boss: boolean): void {
    this.type[i] = TYPES.indexOf(type);
    this.shield[i] = 0;
    const def = SOLDIERS[type];
    this.charges[i] = 0;
    // The first charge comes soon after the change.
    this.nextCharge[i] = def.charge ? Math.min(def.charge.every, 1.5) : 0;
    if (boss) this.onBossHalf?.(i);
  }

  /** Melee reach beyond touching: bigger for bigger soldiers. */
  private reachOf(i: number): number {
    return CROWD.reach * (SOLDIERS[TYPES[this.type[i]!]!].size ?? 1);
  }

  /**
   * A firebrand (GDD §9.1): marches with his squad until there's something to run at: the hero within sprint range, a
   * blue within reach of a fight, or the banner's ring when he's near it. Then he sprints and bursts on arrival.
   * Returns false while he simply marches.
   */
  private updateFirebrand(i: number, dt: number, moveDt: number, def: SoldierDef, burst: BurstDef): boolean {
    const b = this.bodies;
    const x = b.x[i]!;
    const z = b.z[i]!;
    let tx = Number.NaN;
    let tz = Number.NaN;
    let reach = burst.reach;
    if (this.hero.active && Math.hypot(this.hero.x - x, this.hero.z - z) < burst.sprintFrom) {
      tx = this.hero.x;
      tz = this.hero.z;
      reach += HERO_RADIUS;
    } else {
      let best: number = CROWD.engageEnemy;
      near.length = 0;
      this.hash.queryCircle(x, z, best, near);
      for (const j of near) {
        if (this.team[j] !== ALLY || !this.isUp(j)) continue;
        const d = Math.hypot(b.x[j]! - x, b.z[j]! - z);
        if (d < best) {
          best = d;
          tx = b.x[j]!;
          tz = b.z[j]!;
        }
      }
      if (Number.isNaN(tx) && Math.hypot(this.goal.x - x, this.goal.z - z) < burst.sprintFrom * 0.6) {
        tx = this.goal.x;
        tz = this.goal.z;
        // Anywhere inside the ring will do.
        reach = 4;
      }
    }
    if (Number.isNaN(tx)) return false;
    if (Math.hypot(tx - x, tz - z) <= reach) {
      this.burst(i);
      return true;
    }
    if (!this.sprinting[i]) {
      this.sprinting[i] = 1;
      this.onSprint?.(i);
    }
    this.steer(i, tx, tz, def.speed, dt);
    this.integrate(i, moveDt, true);
    this.state[i] = STATE.move;
    this.play(i, 'run', Math.hypot(this.vx[i]!, this.vz[i]!) / this.clips.speed('run'));
    return true;
  }

  /** A firebrand's pot bursts: everyone within its radius is hurt, both armies and the hero; he's gone with it. */
  private burst(i: number): void {
    if (this.burstDone[i]) return;
    this.burstDone[i] = 1;
    const def = SOLDIERS[TYPES[this.type[i]!]!];
    const burst = def.burst!;
    const b = this.bodies;
    const x = b.x[i]!;
    const z = b.z[i]!;
    this.onBurst?.(x, b.y[i]!, z, burst);
    // Bursting of his own accord: no gold, and nothing left to lie on the field.
    if (this.isUp(i)) {
      this.knock(i, 0, 0, false);
      this.timer[i] = this.knockedSeconds;
    }
    // Copied: a burst can knock out another firebrand, whose burst queries the hash again.
    near.length = 0;
    this.hash.queryCircle(x, z, burst.radius + CROWD.radius, near);
    for (const j of near.slice()) {
      if (j === i || !this.live[j] || !this.isUp(j)) continue;
      if (Math.hypot(b.x[j]! - x, b.z[j]! - z) > burst.radius + b.radius[j]!) continue;
      this.damage(j, burst.hit, b.x[j]! - x, b.z[j]! - z);
    }
    if (this.hero.active && Math.hypot(this.hero.x - x, this.hero.z - z) < burst.radius + HERO_RADIUS) {
      this.onHeroHit?.(burst.hit, x, z);
    }
  }

  /**
   * Charges (GDD §9.3): every so often, aim at the hero if he's within 30 m (else the banner), glow through the
   * wind-up, then run straight. Returns true when a wind-up begins.
   */
  private startCharge(i: number, def: SoldierDef): boolean {
    const c = def.charge!;
    if (this.nextCharge[i]! > 0 || (c.times > 0 && this.charges[i]! >= c.times)) return false;
    const b = this.bodies;
    let tx: number;
    let tz: number;
    if (this.team[i] === ALLY) {
      // The Queen's knights charge the Baron's nearest man within reach (none: they wait a moment and look again).
      const j = this.nearestFoe(i, ALLY_CHARGE_REACH);
      if (j < 0) {
        this.nextCharge[i] = 0.5;
        return false;
      }
      tx = b.x[j]!;
      tz = b.z[j]!;
    } else {
      const toHero = this.hero.active && Math.hypot(this.hero.x - b.x[i]!, this.hero.z - b.z[i]!) < 30;
      tx = toHero ? this.hero.x : this.goal.x;
      tz = toHero ? this.hero.z : this.goal.z;
    }
    const dx = tx - b.x[i]!;
    const dz = tz - b.z[i]!;
    const d = Math.hypot(dx, dz);
    if (d < 3) {
      this.nextCharge[i] = 1;
      return false;
    }
    this.chargeX[i] = dx / d;
    this.chargeZ[i] = dz / d;
    this.charges[i] = this.charges[i]! + 1;
    this.nextCharge[i] = c.every;
    this.target[i] = NONE;
    this.setState(i, STATE.windup);
    this.onWindup?.(i);
    return true;
  }

  private updateCharge(i: number, dt: number, moveDt: number, def: SoldierDef): void {
    const c = def.charge;
    const b = this.bodies;
    if (!c) return this.setState(i, STATE.idle);
    const want = Math.atan2(-this.chargeX[i]!, -this.chargeZ[i]!);
    this.heading[i] = this.heading[i]! + angleDelta(this.heading[i]!, want) * Math.min(1, dt * 10);
    if (this.state[i] === STATE.windup) {
      this.stop(i, dt);
      // A boss's glow pulses through the wind-up (the shader's flash), steady enough to read, not to strobe. Riders
      // don't glow: their cue is the lowered sword and the hoofbeats.
      if (c.lane !== false) this.flash[i] = 0.35 + 0.25 * Math.sin(this.timer[i]! * 9);
      if (this.timer[i]! >= c.windup) this.setState(i, STATE.charge);
      return;
    }
    this.vx[i] = this.chargeX[i]! * c.speed;
    this.vz[i] = this.chargeZ[i]! * c.speed;
    this.integrate(i, moveDt, false);
    this.play(i, 'run', c.speed / (this.clips.speed('run') * (def.size ?? 1)));
    // Anyone in the way is bowled over: the Queen's soldiers take a heavy blow once each (hurt ones go down), the
    // hero is hit once.
    const reach = b.radius[i]! + 0.6;
    near.length = 0;
    this.hash.queryCircle(b.x[i]!, b.z[i]!, reach + CROWD.radius, near);
    for (const j of near) {
      if (this.team[j] === this.team[i] || !this.isUp(j) || this.state[j] === STATE.hit) continue;
      if (Math.hypot(b.x[j]! - b.x[i]!, b.z[j]! - b.z[i]!) > reach + b.radius[j]!) continue;
      this.damage(j, c.hit * 2, this.chargeX[i]!, this.chargeZ[i]!);
    }
    if (this.team[i] === ENEMY && !this.struck[i] && this.hero.active && Math.hypot(this.hero.x - b.x[i]!, this.hero.z - b.z[i]!) < reach + HERO_RADIUS) {
      this.struck[i] = 1;
      this.onHeroHit?.(c.hit, b.x[i]! - this.chargeX[i]!, b.z[i]! - this.chargeZ[i]!);
    }
    if (this.timer[i]! >= c.seconds) {
      this.setState(i, STATE.idle);
      this.cooldown[i] = 0.8;
    }
  }
}
