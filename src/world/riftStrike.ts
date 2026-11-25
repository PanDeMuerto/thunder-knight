import * as THREE from 'three';
import { RIFT_STRIKE } from '@/content/support';

interface Shell {
  at: THREE.Vector3;
  /** Seconds after the call when it lands. */
  lands: number;
  landed: boolean;
}

const STREAKS = 8;
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3(1, 1, 1);
const tmpP = new THREE.Vector3();

/**
 * A Rift Strike in progress (GDD §8.3): a red circle on the ground warns, then shells fall one by one as bright
 * streaks out of the sky and burst (the game hurts the Baron's men round each one). Calm: a soft ring, short streaks.
 */
export class RiftStrike {
  readonly group = new THREE.Group();
  private readonly ring: THREE.Mesh;
  private readonly ringMaterial: THREE.MeshBasicMaterial;
  private readonly streaks: THREE.InstancedMesh;
  private shells: Shell[] = [];
  private time = 0;
  private live = false;
  /** A shell lands (its burst: damage, a cloud, a boom). */
  onShell: ((at: THREE.Vector3) => void) | null = null;

  constructor(private readonly heightAt: (x: number, z: number) => number) {
    const r = RIFT_STRIKE.radius;
    const ring = new THREE.RingGeometry(r - 0.35, r, 72);
    ring.rotateX(-Math.PI / 2);
    this.ringMaterial = new THREE.MeshBasicMaterial({ color: 0xe0503c, transparent: true, opacity: 0.5, depthWrite: false });
    this.ring = new THREE.Mesh(ring, this.ringMaterial);
    this.ring.renderOrder = 1;
    const streak = new THREE.CylinderGeometry(0.07, 0.12, 3.2, 6);
    streak.translate(0, 1.6, 0);
    this.streaks = new THREE.InstancedMesh(streak, new THREE.MeshBasicMaterial({ color: 0xe4dcff }), STREAKS);
    this.streaks.frustumCulled = false;
    this.streaks.count = 0;
    this.group.add(this.ring, this.streaks);
    this.group.visible = false;
  }

  get active(): boolean {
    return this.live;
  }

  /** Calls a strike on (x, z): the shells' spots are spread over the circle, the times over its seconds. */
  start(x: number, z: number): void {
    const { radius, shells, warn, seconds } = RIFT_STRIKE;
    this.ring.position.set(x, this.heightAt(x, z) + 0.07, z);
    this.shells = [];
    for (let k = 0; k < shells; k++) {
      const a = Math.random() * Math.PI * 2;
      const d = radius * 0.85 * Math.sqrt(Math.random());
      const sx = x + Math.cos(a) * d;
      const sz = z + Math.sin(a) * d;
      const jitter = (Math.random() - 0.5) * (seconds / shells) * 0.6;
      this.shells.push({ at: new THREE.Vector3(sx, this.heightAt(sx, sz), sz), lands: warn + (k / Math.max(1, shells - 1)) * seconds + jitter, landed: false });
    }
    this.time = 0;
    this.live = true;
    this.group.visible = true;
  }

  /** Ends any strike at once (the battle ended). */
  clear(): void {
    this.live = false;
    this.group.visible = false;
    this.shells = [];
  }

  update(dt: number): void {
    if (!this.live) return;
    this.time += dt;
    const { warn, seconds, drop, fall } = RIFT_STRIKE;
    // The ring breathes gently while the strike lasts.
    this.ringMaterial.opacity = 0.35 + 0.15 * Math.sin(this.time * 6);
    this.ring.visible = this.time < warn + seconds + 0.2;
    let n = 0;
    for (const s of this.shells) {
      const k = (this.time - (s.lands - fall)) / fall;
      if (!s.landed && k >= 0 && k < 1 && n < STREAKS) {
        tmpP.set(s.at.x, s.at.y + drop * (1 - k), s.at.z);
        tmpM.compose(tmpP, tmpQ.identity(), tmpS);
        this.streaks.setMatrixAt(n++, tmpM);
      }
      if (!s.landed && this.time >= s.lands) {
        s.landed = true;
        this.onShell?.(s.at);
      }
    }
    this.streaks.count = n;
    this.streaks.instanceMatrix.needsUpdate = true;
    if (this.shells.every((s) => s.landed) && this.time > warn + seconds + 0.4) this.clear();
  }
}
