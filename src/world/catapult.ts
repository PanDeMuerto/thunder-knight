import * as THREE from 'three';
import type { Boulder } from '@/crowd/crowdSim';
import { mergeStatic } from '@/render/mergeStatic';
import { SHADOW_LAYER } from '@/render/stage';

/**
 * The catapult's look (GDD §9.1, M9): built in code like the ram (no CC0 field catapult fits; KayKit's is on a
 * tower). A timber frame on four wheels, two uprights with a crossbar, and a throwing arm with a bucket at one end
 * and a counterweight at the other; the Baron's red on the counterweight. Metres; it faces −Z, its right is +X.
 */
export const CATAPULT_LOOK = {
  frame: { length: 2.8, width: 1.4, height: 0.5, beam: 0.16 },
  uprights: { height: 1.7, at: 0.2 },
  arm: { length: 3.2, back: 0.9, width: 0.14 },
  bucket: 0.32,
  weight: 0.55,
  wood: 0x6b4a30,
  beam: 0x5a3d27,
  cloth: 0xa8322c,
  iron: 0x4a4e55,
  wheel: { radius: 0.38, width: 0.16, wood: 0x7a5634 },
  /** The arm's tilt (radians, about its pivot) cocked back, and thrown forward; the throw is quick, the winch slow. */
  cocked: -1.15,
  thrown: 1.9,
  throwSeconds: 0.22,
  winchSeconds: 3,
  /** When it's abandoned or broken: it settles crooked, then sinks with the fallen. */
  collapse: { sink: 0.3, tilt: 0.14, seconds: 0.8, under: 2.4 },
} as const;

/** The boulder in the air, and its shadow on the ground (GDD §9.1: it grows for the last `warn` seconds). */
export const BOULDER_LOOK = {
  radius: 0.36,
  rock: 0x7d7a74,
  shadow: 0x1c1712,
  shadowOpacity: 0.32,
  /** A faint ring at the blast's full size, so the circle's edge reads from the start of the warning. */
  ring: 0x9a3a2c,
  ringOpacity: 0.45,
  /** Metres of arc over the flight, plus a share of the distance. */
  arc: 6,
  arcShare: 0.22,
} as const;

const box = (w: number, h: number, d: number, color: number): THREE.Mesh => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));

/** One catapult on the field. */
export class CatapultModel {
  readonly group = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly arm = new THREE.Group();
  private readonly wheels: THREE.Group[] = [];
  private roll = 0;
  /** Seconds since its last throw (large: resting cocked). */
  private sinceThrow = 99;

  constructor() {
    const L = CATAPULT_LOOK;
    const { length, width, height, beam } = L.frame;
    for (const sx of [-1, 1]) {
      const rail = box(beam, beam, length, L.beam);
      rail.position.set((sx * (width - beam)) / 2, height, 0);
      this.body.add(rail);
    }
    for (const z of [-length / 2 + beam, length / 2 - beam]) {
      const cross = box(width, beam, beam, L.beam);
      cross.position.set(0, height, z);
      this.body.add(cross);
    }
    // Two uprights and the crossbar the arm swings on.
    const U = L.uprights;
    for (const sx of [-1, 1]) {
      const post = box(beam, U.height, beam, L.wood);
      post.position.set((sx * (width - beam)) / 2, height + U.height / 2, U.at);
      const brace = box(beam * 0.8, U.height * 0.9, beam * 0.8, L.wood);
      brace.position.set((sx * (width - beam)) / 2, height + U.height * 0.42, U.at + 0.55);
      brace.rotation.x = 0.55;
      this.body.add(post, brace);
    }
    const axle = box(width, beam * 0.9, beam * 0.9, L.iron);
    axle.position.set(0, height + U.height, U.at);
    this.body.add(axle);
    // The arm: pivoted at the crossbar; the bucket end points back (+Z) when cocked and swings over the top.
    const A = L.arm;
    const pole = box(A.width, A.width, A.length, L.wood);
    pole.position.z = A.length / 2 - A.back;
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(L.bucket, L.bucket * 0.7, L.bucket * 0.8, 8), new THREE.MeshLambertMaterial({ color: L.beam }));
    bucket.position.set(0, A.width, A.length - A.back);
    const weight = box(L.weight * 1.4, L.weight, L.weight, L.cloth);
    weight.position.set(0, -L.weight * 0.6, -A.back);
    const band = box(L.weight * 1.42, L.weight * 0.2, L.weight * 1.02, L.iron);
    band.position.copy(weight.position);
    this.arm.add(pole, bucket, weight, band);
    this.arm.position.set(0, height + U.height, U.at);
    this.arm.rotation.x = L.cocked;
    this.body.add(this.arm);
    this.group.add(this.body);
    const W = L.wheel;
    const wheelGeo = new THREE.CylinderGeometry(W.radius, W.radius, W.width, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const spokeGeo = new THREE.BoxGeometry(W.width + 0.03, W.radius * 1.6, 0.07);
    const wood = new THREE.MeshLambertMaterial({ color: W.wood });
    const spokes = new THREE.MeshLambertMaterial({ color: L.beam });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const wheel = new THREE.Group();
        wheel.add(new THREE.Mesh(wheelGeo, wood), new THREE.Mesh(spokeGeo, spokes));
        wheel.position.set(sx * (width / 2 + W.width / 2), W.radius, sz * (length / 2 - 0.4));
        this.wheels.push(wheel);
        this.group.add(wheel);
      }
    }
    this.body.position.y = W.radius * 0.4;
    // Its fixed timbers in a few draw calls; the throwing arm (merged on its own) swings.
    mergeStatic(this.body, [this.arm]);
    mergeStatic(this.arm);
    // Its four wheels merged into one still set (a couple of draw calls, not eight): it crawls, so they needn't turn.
    const wheelSet = new THREE.Group();
    for (const wheel of this.wheels) wheelSet.add(wheel);
    this.group.add(wheelSet);
    mergeStatic(wheelSet);
    this.wheels.length = 0;
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.layers.enable(SHADOW_LAYER);
    });
    this.group.visible = false;
  }

  /** It throws now: the arm snaps over, then winches back. */
  fire(): void {
    this.sinceThrow = 0;
  }

  /**
   * Places it at (x, y, z) facing `heading` (radians, 0 = −Z); `moved` metres roll its wheels; `collapsed` seconds
   * since it fell (−1: it hasn't), `sink` 0–1 as the fallen sink away.
   */
  update(dt: number, x: number, y: number, z: number, heading: number, moved: number, collapsed: number, sink: number): void {
    const L = CATAPULT_LOOK;
    this.group.visible = true;
    this.group.position.set(x, y - sink * L.collapse.under, z);
    this.group.rotation.y = heading;
    this.roll += moved;
    for (const w of this.wheels) w.rotation.x = -this.roll / L.wheel.radius;
    this.sinceThrow += dt;
    const t = this.sinceThrow;
    let a: number;
    if (t < L.throwSeconds) a = L.cocked + (L.thrown - L.cocked) * Math.sin(((t / L.throwSeconds) * Math.PI) / 2);
    else {
      const u = Math.min(1, (t - L.throwSeconds) / L.winchSeconds);
      a = L.thrown + (L.cocked - L.thrown) * u * u * (3 - 2 * u);
    }
    // The bucket end rises forward over the top: the arm turns about X, bucket end toward −Z.
    this.arm.rotation.x = -a;
    const c = collapsed < 0 ? 0 : Math.min(1, collapsed / L.collapse.seconds);
    this.body.rotation.z = -c * L.collapse.tilt;
    this.body.position.y = L.wheel.radius * 0.4 - c * L.collapse.sink;
  }

  hide(): void {
    this.group.visible = false;
  }
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const MOST = 12;

/** The boulders in the air and their shadows on the ground, drawn from the crowd's list. */
export class Boulders {
  readonly group = new THREE.Group();
  private readonly rocks: THREE.InstancedMesh;
  private readonly shadows: THREE.InstancedMesh;
  private readonly rings: THREE.InstancedMesh;

  constructor() {
    const L = BOULDER_LOOK;
    this.rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(L.radius, 0), new THREE.MeshLambertMaterial({ color: L.rock, flatShading: true }), MOST);
    this.rocks.castShadow = true;
    const disc = new THREE.CircleGeometry(1, 28);
    disc.rotateX(-Math.PI / 2);
    this.shadows = new THREE.InstancedMesh(disc, new THREE.MeshBasicMaterial({ color: L.shadow, transparent: true, opacity: L.shadowOpacity, depthWrite: false }), MOST);
    const ring = new THREE.RingGeometry(0.93, 1, 40);
    ring.rotateX(-Math.PI / 2);
    this.rings = new THREE.InstancedMesh(ring, new THREE.MeshBasicMaterial({ color: L.ring, transparent: true, opacity: L.ringOpacity, depthWrite: false }), MOST);
    for (const m of [this.rocks, this.shadows, this.rings]) {
      m.count = 0;
      m.frustumCulled = false;
    }
    this.shadows.renderOrder = 1;
    this.rings.renderOrder = 1;
    this.group.add(this.rocks, this.shadows, this.rings);
  }

  update(boulders: readonly Boulder[], alpha: number, tick: number): void {
    const L = BOULDER_LOOK;
    let n = 0;
    let s = 0;
    for (const b of boulders) {
      if (!b.live || n >= MOST) continue;
      // Drawn between the crowd's ticks, like the soldiers.
      const age = Math.min(b.lob.flight, b.age + alpha * tick);
      const u = age / b.lob.flight;
      const d = Math.hypot(b.toX - b.fromX, b.toZ - b.fromZ);
      const arc = L.arc + d * L.arcShare;
      tmpP.set(b.fromX + (b.toX - b.fromX) * u, b.fromY + (b.toY - b.fromY) * u + arc * 4 * u * (1 - u), b.fromZ + (b.toZ - b.fromZ) * u);
      tmpQ.setFromAxisAngle(tmpS.set(1, 0.4, 0.2).normalize(), age * 5);
      tmpM.compose(tmpP, tmpQ, tmpS.set(1, 1, 1));
      this.rocks.setMatrixAt(n++, tmpM);
      // Its shadow grows to the blast's size over the last `warn` seconds; the ring marks the full size throughout.
      const left = b.lob.flight - age;
      if (left <= b.lob.warn) {
        const g = 1 - left / b.lob.warn;
        const r = b.lob.radius * (0.25 + 0.75 * g);
        tmpM.compose(tmpP.set(b.toX, b.toY + 0.05, b.toZ), tmpQ.identity(), tmpS.set(r, 1, r));
        this.shadows.setMatrixAt(s, tmpM);
        tmpM.compose(tmpP.set(b.toX, b.toY + 0.06, b.toZ), tmpQ.identity(), tmpS.set(b.lob.radius, 1, b.lob.radius));
        this.rings.setMatrixAt(s, tmpM);
        s++;
      }
    }
    this.rocks.count = n;
    this.shadows.count = s;
    this.rings.count = s;
    for (const m of [this.rocks, this.shadows, this.rings]) m.instanceMatrix.needsUpdate = true;
  }
}
