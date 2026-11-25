import * as THREE from 'three';
import { COINS } from '@/content/economy';

const CAPACITY = 256;
const GRAVITY = 14;
/** Flying coins speed up to this, in metres a second. */
const FLY_SPEED = 16;
const COLLECT_DISTANCE = 0.7;

interface Coin {
  live: boolean;
  p: THREE.Vector3;
  v: THREE.Vector3;
  age: number;
  value: number;
  flying: boolean;
  spin: number;
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Gold coins (GDD §3, §9.1): a knockout throws a few that pop up, bounce and settle; inside the hero's magnet they fly
 * to him and count. At a wave's end every coin left flies in (GDD §4.7). One instanced draw call, pooled.
 */
export class Coins {
  readonly mesh: THREE.InstancedMesh;
  private readonly coins: Coin[] = [];
  /** Called with each coin's gold as it reaches the hero. */
  onCollect: ((value: number) => void) | null = null;
  private vacuum = false;

  constructor(private readonly heightAt: (x: number, z: number) => number) {
    const g = new THREE.CylinderGeometry(0.12, 0.12, 0.035, 14);
    g.rotateX(Math.PI / 2);
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0xf2b632, emissive: 0x4a3200 }), CAPACITY);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < CAPACITY; i++) {
      this.coins.push({ live: false, p: new THREE.Vector3(), v: new THREE.Vector3(), age: 0, value: 0, flying: false, spin: 0 });
    }
  }

  /** Coins on the ground or in the air. */
  get pending(): number {
    return this.coins.reduce((n, c) => n + (c.live ? 1 : 0), 0);
  }

  /** Gold not yet collected. */
  get pendingGold(): number {
    return this.coins.reduce((n, c) => n + (c.live ? c.value : 0), 0);
  }

  /** Splits `gold` into a few coins thrown up from a point. */
  drop(x: number, y: number, z: number, gold: number): void {
    if (gold <= 0) return;
    const n = Math.max(1, Math.min(COINS.maxPerDrop, Math.round(gold / COINS.value)));
    let left = gold;
    for (let k = 0; k < n; k++) {
      const value = k === n - 1 ? left : Math.round(gold / n);
      left -= value;
      const c = this.coins.find((x) => !x.live);
      if (!c) {
        // The pool is full: pay straight away rather than lose gold.
        this.onCollect?.(value);
        continue;
      }
      const a = Math.random() * Math.PI * 2;
      const out = 1 + Math.random() * 1.6;
      c.live = true;
      c.p.set(x, y + 1, z);
      c.v.set(Math.cos(a) * out, 3.6 + Math.random() * 1.6, Math.sin(a) * out);
      c.age = 0;
      c.value = value;
      c.flying = false;
      c.spin = Math.random() * 6;
    }
  }

  /** Every coin left flies to the hero (a wave's end). */
  collectAll(): void {
    this.vacuum = true;
  }

  /** Removes every coin without paying (a new battle). */
  clear(): void {
    for (const c of this.coins) c.live = false;
    this.vacuum = false;
    this.mesh.count = 0;
  }

  update(dt: number, hero: THREE.Vector3, magnet: number): void {
    let n = 0;
    const target = tmpV;
    let any = false;
    for (const c of this.coins) {
      if (!c.live) continue;
      any = true;
      c.age += dt;
      target.set(hero.x, hero.y + 1.1, hero.z);
      const d = c.p.distanceTo(target);
      if (!c.flying && c.age > COINS.settle && (this.vacuum || Math.hypot(c.p.x - hero.x, c.p.z - hero.z) < magnet)) c.flying = true;
      if (c.flying) {
        // Home in, faster and faster; at a wave's end, faster still, so the gold is in before the shop opens.
        const speed = this.vacuum ? Math.min(FLY_SPEED * 2, 8 + c.age * 24) : Math.min(FLY_SPEED, 4 + c.age * 10);
        target.sub(c.p).normalize().multiplyScalar(speed);
        c.v.lerp(target, Math.min(1, dt * 10));
        c.p.addScaledVector(c.v, dt);
        if (d < COLLECT_DISTANCE) {
          c.live = false;
          this.onCollect?.(c.value);
          continue;
        }
      } else {
        c.v.y -= GRAVITY * dt;
        c.p.addScaledVector(c.v, dt);
        const ground = this.heightAt(c.p.x, c.p.z) + 0.12;
        if (c.p.y < ground) {
          c.p.y = ground;
          c.v.y = Math.abs(c.v.y) * 0.35;
          c.v.x *= 0.6;
          c.v.z *= 0.6;
          if (c.v.y < 0.6) c.v.y = 0;
        }
      }
      c.spin += dt * (c.flying ? 14 : 4);
      tmpQ.setFromAxisAngle(UP, c.spin);
      // A pop as it appears.
      tmpS.setScalar(Math.min(1, 0.4 + c.age * 4));
      tmpM.compose(c.p, tmpQ, tmpS);
      this.mesh.setMatrixAt(n++, tmpM);
    }
    if (!any) this.vacuum = false;
    this.mesh.count = n;
    if (n) this.mesh.instanceMatrix.needsUpdate = true;
  }
}
