import * as THREE from 'three';
import { SENTRY } from '@/content/support';
import { SOLDIERS } from '@/content/soldiers';
import { TYPES, type CrowdSim } from '@/crowd/crowdSim';
import { mergeStatic } from '@/render/mergeStatic';
import { SHADOW_LAYER } from '@/render/stage';
import type { Targets } from './combat';
import { traceShot, type ShotHit } from './hitscan';

/** The turret's look: Queen's blue and gunmetal, about 1.2 m tall. Metres. */
export const SENTRY_LOOK = {
  blue: 0x3b74d6,
  metal: 0x50555e,
  dark: 0x2c3036,
  gold: 0xf2b632,
  legs: { length: 0.95, spread: 0.42 },
  body: { width: 0.5, height: 0.36, depth: 0.62, at: 0.82 },
  barrel: { length: 0.75, radius: 0.06 },
} as const;

/** Where the barrel's middle sits along the head (it slides back from here on each shot). */
const BARREL_Z = -SENTRY_LOOK.body.depth / 2 - SENTRY_LOOK.barrel.length / 2 + 0.05;

interface Turret {
  root: THREE.Group;
  head: THREE.Group;
  barrel: THREE.Mesh;
  muzzle: THREE.Object3D;
  x: number;
  z: number;
  y: number;
  age: number;
  cooldown: number;
  look: number;
  target: number;
  yaw: number;
  landed: boolean;
  /** Recoil: the barrel slides back a little on each shot. */
  kick: number;
}

const hits: ShotHit[] = [];
const from = new THREE.Vector3();
const to = new THREE.Vector3();
const box = (w: number, h: number, d: number, color: number): THREE.Mesh => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));

/**
 * Sentry Guns on the field (GDD §8.3): each falls out of the rift beside the hero, then for its time turns to the
 * nearest of the Baron's men it can see and fires, through two soldiers a shot, and folds away into the ground.
 * The game draws the shots (`onShot`) and the landing (`onLand`).
 */
export class SentryGuns {
  readonly group = new THREE.Group();
  private readonly turrets: Turret[] = [];
  /** A shot from `from` to `to`: whether it hit, knocked someone out, hit armour, or was blocked by a shield. */
  onShot: ((from: THREE.Vector3, to: THREE.Vector3, hit: boolean, knocked: boolean, armoured: boolean, blocked: boolean) => void) | null = null;
  onLand: ((at: THREE.Vector3) => void) | null = null;
  onFold: ((at: THREE.Vector3) => void) | null = null;

  constructor(
    private readonly heightAt: (x: number, z: number) => number,
    private readonly sight: (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => boolean,
  ) {}

  /** Turrets standing (or falling) now. */
  get standing(): number {
    return this.turrets.filter((t) => t.root.visible).length;
  }

  /** Drops a turret at (x, z), facing `yaw` (0 = −Z). False when the most already stand. */
  drop(x: number, z: number, yaw: number): boolean {
    let t = this.turrets.find((u) => !u.root.visible);
    if (!t) {
      if (this.turrets.length >= SENTRY.most) return false;
      t = this.build();
      this.turrets.push(t);
    }
    t.x = x;
    t.z = z;
    t.y = this.heightAt(x, z);
    t.age = 0;
    t.cooldown = 0.4;
    t.look = 0;
    t.target = -1;
    t.yaw = yaw;
    t.landed = false;
    t.kick = 0;
    t.root.visible = true;
    t.root.position.set(x, t.y + SENTRY.drop, z);
    t.root.scale.setScalar(1);
    t.head.rotation.y = yaw;
    return true;
  }

  clear(): void {
    for (const t of this.turrets) t.root.visible = false;
  }

  update(dt: number, sim: CrowdSim, targets: Targets): void {
    for (const t of this.turrets) {
      if (!t.root.visible) continue;
      t.age += dt;
      if (!t.landed) {
        const u = Math.min(1, t.age / SENTRY.fall);
        t.root.position.y = t.y + SENTRY.drop * (1 - u * u);
        if (u >= 1) {
          t.landed = true;
          t.age = 0;
          this.onLand?.(t.root.position);
        }
        continue;
      }
      if (t.age >= SENTRY.seconds) {
        // Its time is up: it sinks away.
        const u = (t.age - SENTRY.seconds) / SENTRY.fold;
        t.root.position.y = t.y - u * 1.4;
        if (u >= 1) {
          t.root.visible = false;
          this.onFold?.(from.set(t.x, t.y, t.z));
        }
        continue;
      }
      t.look -= dt;
      if (t.look <= 0 || !this.valid(sim, t.target)) {
        t.look = SENTRY.retarget;
        t.target = this.choose(sim, t);
      }
      t.kick = Math.max(0, t.kick - dt * 6);
      t.barrel.position.z = BARREL_Z + t.kick * 0.1;
      if (t.target < 0) continue;
      const b = sim.bodies;
      const want = Math.atan2(-(b.x[t.target]! - t.x), -(b.z[t.target]! - t.z));
      let d = want - t.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const step = SENTRY.turn * dt;
      t.yaw += Math.max(-step, Math.min(step, d));
      t.head.rotation.y = t.yaw;
      t.cooldown -= dt;
      if (t.cooldown > 0 || Math.abs(d) > 0.2) continue;
      t.cooldown += 1 / SENTRY.rate;
      if (t.cooldown < 0) t.cooldown = 0;
      this.fire(t, sim, targets);
    }
  }

  private valid(sim: CrowdSim, i: number): boolean {
    return i >= 0 && sim.bodies.alive[i] === 1;
  }

  /** The nearest of the Baron's men it can see, within range; hulls (wagon, ram, catapult) aren't worth its shots. */
  private choose(sim: CrowdSim, t: Turret): number {
    const b = sim.bodies;
    let best = -1;
    let bestD: number = SENTRY.range;
    const eyeY = t.y + SENTRY_LOOK.body.at;
    for (let i = 0; i < sim.capacity; i++) {
      if (!b.alive[i] || SOLDIERS[TYPES[sim.type[i]!]!].hidden) continue;
      const d = Math.hypot(b.x[i]! - t.x, b.z[i]! - t.z);
      if (d >= bestD) continue;
      if (!this.sight(t.x, eyeY, t.z, b.x[i]!, b.aimHeight(i), b.z[i]!)) continue;
      bestD = d;
      best = i;
    }
    return best;
  }

  private fire(t: Turret, sim: CrowdSim, targets: Targets): void {
    const b = sim.bodies;
    t.muzzle.getWorldPosition(from);
    to.set(b.x[t.target]!, b.aimHeight(t.target), b.z[t.target]!);
    const dir = to.clone().sub(from);
    const length = dir.length();
    dir.divideScalar(length || 1);
    const n = traceShot(b, from.x, from.y, from.z, dir.x, dir.y, dir.z, 0, SENTRY.range, SENTRY.pierce, 1, hits);
    let hit = false;
    let knocked = false;
    let armoured = false;
    let blocked = false;
    let stop = n > 0 ? hits[n - 1]!.t : length;
    for (let h = 0; h < n; h++) {
      const result = targets.hit(hits[h]!.id, SENTRY.damage, dir.x, dir.z);
      if (result.blocked) {
        blocked = true;
        stop = hits[h]!.t;
        break;
      }
      hit = true;
      knocked ||= result.knocked;
      armoured ||= result.armoured;
    }
    t.kick = 1;
    to.copy(from).addScaledVector(dir, stop);
    this.onShot?.(from, to, hit, knocked, armoured, blocked);
  }

  /** A turret: three legs, a blue body with a gold band, a gunmetal barrel; the head turns. */
  private build(): Turret {
    const L = SENTRY_LOOK;
    const root = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const leg = box(0.07, L.legs.length, 0.07, L.dark);
      leg.position.set(Math.sin(a) * L.legs.spread * 0.5, L.legs.length / 2 - 0.05, Math.cos(a) * L.legs.spread * 0.5);
      // Tops meet under the body, feet spread on the ground.
      leg.rotation.set(-Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45);
      root.add(leg);
    }
    const head = new THREE.Group();
    head.position.y = L.body.at;
    const body = box(L.body.width, L.body.height, L.body.depth, L.blue);
    const band = box(L.body.width + 0.02, 0.07, L.body.depth * 0.6, L.gold);
    band.position.y = L.body.height / 2 - 0.02;
    const back = box(L.body.width * 0.7, L.body.height * 0.8, 0.2, L.metal);
    back.position.z = L.body.depth / 2 + 0.08;
    const barrelGeo = new THREE.CylinderGeometry(L.barrel.radius, L.barrel.radius * 1.15, L.barrel.length, 10);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, new THREE.MeshLambertMaterial({ color: L.metal }));
    barrel.position.set(0, 0.02, BARREL_Z);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0.02, BARREL_Z - L.barrel.length / 2);
    head.add(body, band, back, barrel, muzzle);
    root.add(head);
    // The legs in one draw call, the head's body in a few; the head turns and the barrel kicks.
    mergeStatic(root, [head]);
    mergeStatic(head, [barrel]);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.layers.enable(SHADOW_LAYER);
    });
    root.visible = false;
    this.group.add(root);
    return { root, head, barrel, muzzle, x: 0, z: 0, y: 0, age: 0, cooldown: 0, look: 0, target: -1, yaw: 0, landed: false, kick: 0 };
  }
}
