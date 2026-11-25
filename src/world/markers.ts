import * as THREE from 'three';

const DOTS = 12;
/** Lane patches per lane (two columns), how many lanes can glow at once, and the metres between rows. */
const LANE = 40;
const LANES = 3;
const LANE_STEP = 0.9;
const SPACING = 1.4;

/** The Iron Ox's fire cone: from (x, z) along (dirX, dirZ), `length` metres, `half` its half-angle (radians). */
export interface ConeSpec {
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
  length: number;
  half: number;
}

/** Patches for a fire cone, and the metres between its rows and its columns. */
const CONE = 140;
const CONE_STEP = 1.1;
const CONE_GAP = 1.25;

/** A charge's lane: from (x, z) along the unit direction (dirX, dirZ), metres long and wide. */
export interface LaneSpec {
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
  length: number;
  width: number;
}

/**
 * Markers in the world for onboarding (onboarding §2): a soft gold ground ring for "go here", and a dotted trail of
 * footprints on the ground toward a goal (the world helping a stuck player). Calm: soft colours, a gentle pulse.
 */
export class Markers {
  readonly group = new THREE.Group();
  private readonly ring: THREE.Mesh;
  private readonly dots: THREE.InstancedMesh;
  private readonly lane: THREE.InstancedMesh;
  private time = 0;
  private trail: { fromX: number; fromZ: number; toX: number; toZ: number } | null = null;
  private lanes: readonly LaneSpec[] = [];
  private readonly cone: THREE.InstancedMesh;
  private cones: readonly ConeSpec[] = [];

  constructor(private readonly heightAt: (x: number, z: number) => number) {
    const ring = new THREE.RingGeometry(1, 1.25, 48);
    ring.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(
      ring,
      new THREE.MeshBasicMaterial({ color: 0xf2c94c, transparent: true, opacity: 0.75, depthWrite: false }),
    );
    this.ring.visible = false;
    const dot = new THREE.CircleGeometry(0.16, 12);
    dot.rotateX(-Math.PI / 2);
    this.dots = new THREE.InstancedMesh(
      dot,
      new THREE.MeshBasicMaterial({ color: 0xf7dc8a, transparent: true, opacity: 0.85, depthWrite: false }),
      DOTS,
    );
    this.dots.count = 0;
    this.dots.frustumCulled = false;
    // A charge's lane (GDD §9.3): soft red patches on the ground where the boss will run, pulsing toward the end.
    // M11: light enough to stand out from the grass by brightness too (red-weak and green-weak eyes lose the hue).
    const patch = new THREE.CircleGeometry(0.42, 14);
    patch.rotateX(-Math.PI / 2);
    this.lane = new THREE.InstancedMesh(
      patch,
      new THREE.MeshBasicMaterial({ color: 0xff8a70, transparent: true, opacity: 0.6, depthWrite: false }),
      LANE * LANES,
    );
    this.lane.count = 0;
    this.lane.frustumCulled = false;
    // The Iron Ox's fire cone (GDD §9.3): orange patches fanning out on the ground ahead of its horns, pulsing; light
    // amber so it reads by brightness as well as hue (M11's colour-blind check).
    const ember = new THREE.CircleGeometry(0.4, 12);
    ember.rotateX(-Math.PI / 2);
    this.cone = new THREE.InstancedMesh(
      ember,
      new THREE.MeshBasicMaterial({ color: 0xffbe5c, transparent: true, opacity: 0.62, depthWrite: false }),
      CONE,
    );
    this.cone.count = 0;
    this.cone.frustumCulled = false;
    this.group.add(this.ring, this.dots, this.lane, this.cone);
  }

  /** The lanes charges will run down, each from (x, z) along a unit direction; an empty list hides them. */
  setLanes(lanes: readonly LaneSpec[]): void {
    this.lanes = lanes.slice(0, LANES);
    if (!lanes.length) this.lane.count = 0;
  }

  /** The fire cones about to burn; an empty list hides them. */
  setCones(cones: readonly ConeSpec[]): void {
    this.cones = cones;
    if (!cones.length) this.cone.count = 0;
  }

  /** A gold ring on the ground at (x, z), `radius` metres; null hides it. */
  setGoal(goal: { x: number; z: number; radius: number } | null): void {
    this.ring.visible = !!goal;
    if (!goal) return;
    this.ring.position.set(goal.x, this.heightAt(goal.x, goal.z) + 0.06, goal.z);
    this.ring.scale.setScalar(goal.radius);
  }

  /** Footprints from (fromX, fromZ) toward (toX, toZ); null hides them. */
  setTrail(trail: { fromX: number; fromZ: number; toX: number; toZ: number } | null): void {
    this.trail = trail;
    if (!trail) this.dots.count = 0;
  }

  update(dt: number): void {
    this.time += dt;
    if (this.ring.visible) {
      const s = 1 + Math.sin(this.time * 3) * 0.04;
      this.ring.scale.x = this.ring.scale.z = this.ring.scale.y * s;
    }
    this.updateLane();
    this.updateCones();
    const t = this.trail;
    if (!t) return;
    const dx = t.toX - t.fromX;
    const dz = t.toZ - t.fromZ;
    const length = Math.hypot(dx, dz);
    const n = Math.min(DOTS, Math.floor((length - 1.5) / SPACING));
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const along = 1.5 + i * SPACING;
      // Alternate left and right like footsteps, and a wave of size running toward the goal.
      const side = (i % 2 ? 0.18 : -0.18) / Math.max(length, 1e-3);
      const x = t.fromX + (dx / length) * along - dz * side;
      const z = t.fromZ + (dz / length) * along + dx * side;
      const pulse = 0.75 + 0.25 * Math.sin(this.time * 5 - i * 0.7);
      m.makeScale(pulse, 1, pulse).setPosition(x, this.heightAt(x, z) + 0.05, z);
      this.dots.setMatrixAt(i, m);
    }
    this.dots.count = Math.max(0, n);
    this.dots.instanceMatrix.needsUpdate = true;
  }

  /** Rows of patches across each cone, widening with distance, following the ground (it may run up the banner's hill). */
  private updateCones(): void {
    if (!this.cones.length) return;
    const m = new THREE.Matrix4();
    let n = 0;
    for (const c of this.cones) {
      const px = -c.dirZ;
      const pz = c.dirX;
      for (let along = 1.5; along <= c.length && n < CONE; along += CONE_STEP) {
        const halfWidth = Math.tan(c.half) * along;
        const columns = Math.max(1, Math.floor((halfWidth * 2) / CONE_GAP));
        const pulse = 0.8 + 0.2 * Math.sin(this.time * 8 - along * 0.5);
        for (let k = 0; k <= columns && n < CONE; k++) {
          const s = -halfWidth + (k / columns) * halfWidth * 2;
          const x = c.x + c.dirX * along + px * s;
          const z = c.z + c.dirZ * along + pz * s;
          m.makeScale(pulse, 1, pulse).setPosition(x, this.heightAt(x, z) + 0.07, z);
          this.cone.setMatrixAt(n++, m);
        }
      }
    }
    this.cone.count = n;
    this.cone.instanceMatrix.needsUpdate = true;
  }

  private updateLane(): void {
    if (!this.lanes.length) return;
    const m = new THREE.Matrix4();
    let n = 0;
    for (const l of this.lanes) {
      const rows = Math.min(LANE / 2, Math.floor(l.length / LANE_STEP));
      const side = l.width / 4;
      for (let r = 0; r < rows; r++) {
        const along = 0.8 + r * LANE_STEP;
        const pulse = 0.8 + 0.2 * Math.sin(this.time * 7 - r * 0.6);
        for (const s of [-side, side]) {
          const x = l.x + l.dirX * along - l.dirZ * s;
          const z = l.z + l.dirZ * along + l.dirX * s;
          m.makeScale(pulse, 1, pulse).setPosition(x, this.heightAt(x, z) + 0.06, z);
          this.lane.setMatrixAt(n++, m);
        }
      }
    }
    this.lane.count = n;
    this.lane.instanceMatrix.needsUpdate = true;
  }
}
