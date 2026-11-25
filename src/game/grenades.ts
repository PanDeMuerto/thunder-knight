import * as THREE from 'three';
import { SOLDIERS } from '@/content/soldiers';
import { ENEMY, TYPES, type CrowdSim } from '@/crowd/crowdSim';

/** GDD §8.2. */
export const GRENADE = {
  range: 25,
  /** The landing point snaps to the densest enemy group this close to the aim point. */
  snap: 6,
  /** Neighbours within this count toward a group's density. */
  cluster: 2.5,
  flight: 0.75,
  /** Seconds from the throw to the bang. */
  fuse: 1.2,
  damage: 150,
  radius: 5,
} as const;

interface Live {
  from: THREE.Vector3;
  to: THREE.Vector3;
  age: number;
  /** A launcher's round (GDD §8.1): its flight, damage and blast; it bursts on landing and shows no ring. */
  round: Round | null;
}

interface Round {
  flight: number;
  damage: number;
  radius: number;
  /** A rocket: straight, fast, a smoke trail; and its damage times this on siege engines and bosses. */
  rocket: boolean;
  siege: number;
  /** Seconds since its last puff of smoke. */
  trail: number;
}

/** A launcher's round flies this fast (m/s), within these times; a rocket faster, straight. */
const ROUND = { speed: 38, shortest: 0.3, longest: 1.1, rocket: 55, trail: 0.05 };
/** Grenades and launcher rounds in the air at once, at most. */
const MOST = 16;

const tmp = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Grenades (GDD §8.2): thrown at the crosshair, they land on the densest enemy group near it, sit for a moment and
 * burst: 150 damage in 5 m, knocking soldiers away from the blast. A ring on the ground shows where it will land.
 * Enemies only; allies and the hero are never hurt.
 */
export class Grenades {
  readonly group = new THREE.Group();
  private readonly live: Live[] = [];
  private readonly ball: THREE.InstancedMesh;
  private readonly rings: THREE.InstancedMesh;
  onBurst: ((at: THREE.Vector3, round: boolean, rocket: boolean) => void) | null = null;
  /** A rocket's smoke, left where it is now. */
  onTrail: ((at: THREE.Vector3) => void) | null = null;
  private readonly rockets: THREE.InstancedMesh;

  constructor(private readonly heightAt: (x: number, z: number) => number) {
    this.ball = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.13, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0x3a4a30 }),
      MOST,
    );
    const ring = new THREE.RingGeometry(GRENADE.radius - 0.25, GRENADE.radius, 40);
    ring.rotateX(-Math.PI / 2);
    this.rings = new THREE.InstancedMesh(
      ring,
      new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0.55, depthWrite: false }),
      MOST,
    );
    // A rocket: a warm red body with a bright tail, pointing where it flies, big enough to follow from behind.
    const rocket = new THREE.CylinderGeometry(0.12, 0.15, 0.95, 8);
    rocket.rotateX(Math.PI / 2);
    this.rockets = new THREE.InstancedMesh(rocket, new THREE.MeshLambertMaterial({ color: 0xc8503a, emissive: 0x5a1a08 }), MOST);
    for (const m of [this.ball, this.rings, this.rockets]) {
      m.count = 0;
      m.frustumCulled = false;
    }
    this.group.add(this.ball, this.rings, this.rockets);
  }

  /**
   * Where a grenade thrown at `aim` lands: no further than its range from the hero, then onto the densest enemy group
   * within 6 m (GDD §8.2).
   */
  target(
    sim: CrowdSim,
    hero: THREE.Vector3,
    aim: THREE.Vector3,
    out: THREE.Vector3,
    range: number = GRENADE.range,
    snap: number = GRENADE.snap,
  ): THREE.Vector3 {
    out.copy(aim);
    tmp.subVectors(out, hero).setY(0);
    if (tmp.length() > range) out.copy(hero).addScaledVector(tmp.normalize(), range);
    const b = sim.bodies;
    let best = -1;
    let bestCount = 0;
    for (let i = 0; i < sim.capacity; i++) {
      if (!b.alive[i] || sim.team[i] !== ENEMY) continue;
      if (Math.hypot(b.x[i]! - out.x, b.z[i]! - out.z) > snap) continue;
      let n = 0;
      for (let j = 0; j < sim.capacity; j++) {
        if (b.alive[j] && Math.hypot(b.x[j]! - b.x[i]!, b.z[j]! - b.z[i]!) < GRENADE.cluster) n++;
      }
      if (n > bestCount) {
        bestCount = n;
        best = i;
      }
    }
    if (best >= 0) out.set(b.x[best]!, 0, b.z[best]!);
    out.y = this.heightAt(out.x, out.z);
    return out;
  }

  throw(from: THREE.Vector3, to: THREE.Vector3): void {
    this.live.push({ from: from.clone(), to: to.clone(), age: 0, round: null });
  }

  /**
   * A launcher's round from the muzzle to where the shot lands: it bursts there, `damage` within `radius`. A rocket
   * flies straight and faster, and does `siege` times the damage to siege engines and bosses.
   */
  launch(from: THREE.Vector3, to: THREE.Vector3, damage: number, radius: number, rocket = false, siege = 1): void {
    const d = from.distanceTo(to);
    const flight = rocket ? Math.max(0.08, d / ROUND.rocket) : Math.min(ROUND.longest, Math.max(ROUND.shortest, d / ROUND.speed));
    this.live.push({ from: from.clone(), to: to.clone(), age: 0, round: { flight, damage, radius, rocket, siege, trail: 0 } });
  }

  clear(): void {
    this.live.length = 0;
    this.ball.count = 0;
    this.rings.count = 0;
  }

  update(dt: number, sim: CrowdSim): void {
    const m = new THREE.Matrix4();
    let n = 0;
    for (let k = this.live.length - 1; k >= 0; k--) {
      const g = this.live[k]!;
      g.age += dt;
      if (g.age >= (g.round?.flight ?? GRENADE.fuse)) {
        this.burst(g.to, sim, g.round);
        this.live.splice(k, 1);
      }
    }
    let r = 0;
    let k = 0;
    for (const g of this.live) {
      if (n >= MOST) break;
      const u = Math.min(1, g.age / (g.round?.flight ?? GRENADE.flight));
      if (g.round?.rocket) {
        // Straight at its mark, pointing along its flight, a puff of smoke behind it every few hundredths.
        tmp.lerpVectors(g.from, g.to, u);
        m.lookAt(g.from, g.to, UP).setPosition(tmp);
        this.rockets.setMatrixAt(k++, m);
        g.round.trail += dt;
        if (g.round.trail >= ROUND.trail) {
          g.round.trail = 0;
          this.onTrail?.(tmp);
        }
        continue;
      }
      // A launcher's round flies flatter (a short lob); a thrown grenade arcs higher.
      const arc = g.round ? Math.min(2.5, g.from.distanceTo(g.to) * 0.08) : Math.min(6, g.from.distanceTo(g.to) * 0.25);
      tmp.lerpVectors(g.from, g.to, u);
      tmp.y += arc * 4 * u * (1 - u) + (u >= 1 ? 0.13 : 0);
      m.makeTranslation(tmp.x, tmp.y, tmp.z);
      this.ball.setMatrixAt(n++, m);
      if (g.round) continue;
      m.makeTranslation(g.to.x, g.to.y + 0.06, g.to.z);
      this.rings.setMatrixAt(r++, m);
    }
    this.ball.count = n;
    this.rings.count = r;
    this.rockets.count = k;
    if (k) this.rockets.instanceMatrix.needsUpdate = true;
    if (n) {
      this.ball.instanceMatrix.needsUpdate = true;
      this.rings.instanceMatrix.needsUpdate = true;
    }
  }

  private burst(at: THREE.Vector3, sim: CrowdSim, round: Round | null): void {
    const b = sim.bodies;
    const radius = round?.radius ?? GRENADE.radius;
    const damage = round?.damage ?? GRENADE.damage;
    for (let i = 0; i < sim.capacity; i++) {
      if (!b.alive[i] || sim.team[i] !== ENEMY) continue;
      const dx = b.x[i]! - at.x;
      const dz = b.z[i]! - at.z;
      // A big body (a ram, a catapult) is hit when the blast reaches its side, not its middle.
      if (Math.hypot(dx, dz) > radius + b.radius[i]! * 0.5) continue;
      // A rocket hits siege engines (their hulls, wheels and beams) and bosses harder (GDD §8.1).
      const def = SOLDIERS[TYPES[sim.type[i]!]!];
      const siege = def.boss || def.wagon || (def.fixture && def.hidden);
      sim.explode(i, damage * (siege ? (round?.siege ?? 1) : 1), dx || 0.01, dz);
    }
    this.onBurst?.(at, !!round, !!round?.rocket);
  }
}
