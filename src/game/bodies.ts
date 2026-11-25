import { SpatialHash } from '@/core/spatialHash';

/** What aim assist cares about when it picks a target (GDD §6.4: captain > ranged > nearest). */
export const ROLE = { normal: 0, ranged: 1, captain: 2 } as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];

/** Hash cells are this many metres (tech design §5.5). */
const CELL = 2;
/** The hash covers the field and a margin round it. */
const BOUND = 110;

/**
 * Everything that can be shot, as a structure of arrays: positions (feet), sizes, health and role. The M1 range
 * fills it with dummies; M2's crowd simulation owns one for the soldiers. A spatial hash over it finds bodies along a
 * shot or near a point without looking at all of them.
 */
export class Bodies {
  count = 0;
  readonly x: Float32Array;
  /** Height of the feet. */
  readonly y: Float32Array;
  readonly z: Float32Array;
  readonly radius: Float32Array;
  readonly height: Float32Array;
  readonly hp: Float32Array;
  readonly maxHp: Float32Array;
  /** 1 while the body can be shot and aimed at. */
  readonly alive: Uint8Array;
  readonly role: Uint8Array;
  /** 1 for armoured enemies: light guns do half damage (GDD §8.1). */
  readonly armoured: Uint8Array;
  /** 1 for an open frame bullets pass through (a catapult): explosions still reach it, shots and aim don't. */
  readonly open: Uint8Array;
  readonly hash: SpatialHash;
  /** The widest body, for the hash's search margin. */
  maxRadius = 0;

  constructor(readonly capacity: number) {
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.z = new Float32Array(capacity);
    this.radius = new Float32Array(capacity);
    this.height = new Float32Array(capacity);
    this.hp = new Float32Array(capacity);
    this.maxHp = new Float32Array(capacity);
    this.alive = new Uint8Array(capacity);
    this.role = new Uint8Array(capacity);
    this.armoured = new Uint8Array(capacity);
    this.open = new Uint8Array(capacity);
    this.hash = new SpatialHash(CELL, -BOUND, -BOUND, BOUND, BOUND, capacity);
  }

  add(x: number, y: number, z: number, radius: number, height: number, hp: number, role: Role = ROLE.normal): number {
    if (this.count >= this.capacity) throw new Error('Bodies: full');
    const id = this.count++;
    this.x[id] = x;
    this.y[id] = y;
    this.z[id] = z;
    this.radius[id] = radius;
    this.height[id] = height;
    this.hp[id] = hp;
    this.maxHp[id] = hp;
    this.alive[id] = 1;
    this.role[id] = role;
    this.armoured[id] = 0;
    this.maxRadius = Math.max(this.maxRadius, radius);
    return id;
  }

  /** Rebuilds the hash from the living bodies. Call once per tick, after moving them. */
  reindex(): void {
    this.hash.clear();
    for (let i = 0; i < this.count; i++) if (this.alive[i]) this.hash.insert(i, this.x[i]!, this.z[i]!);
  }

  /** Takes health off a living body. Returns true when this knocks it out. */
  hurt(id: number, damage: number): boolean {
    if (!this.alive[id]) return false;
    const hp = this.hp[id]! - damage;
    this.hp[id] = hp;
    if (hp > 0) return false;
    this.hp[id] = 0;
    this.alive[id] = 0;
    return true;
  }

  /** Brings a body back at full health. */
  revive(id: number, x: number, y: number, z: number): void {
    this.x[id] = x;
    this.y[id] = y;
    this.z[id] = z;
    this.hp[id] = this.maxHp[id]!;
    this.alive[id] = 1;
  }

  /** The point aim assist aims for: the chest. */
  aimHeight(id: number): number {
    return this.y[id]! + this.height[id]! * 0.62;
  }
}
