import * as THREE from 'three';
import { SOLDIERS } from '@/content/soldiers';
import { mergeStatic } from '@/render/mergeStatic';
import { SHADOW_LAYER } from '@/render/stage';

/**
 * The Siege Tower's look (GDD §9.3, M9): built in code like the War Wagon (no CC0 siege tower fits). A tall timber
 * frame on four wheels, its sides and back hung with hides, a fighting platform with a rail on top under the Baron's
 * red banner, a drawbridge folded up against its front, a door low on each side, and three glowing support beams on
 * its front (the weak points, where the crowd's beam bodies ride). Metres; it faces −Z, its right is +X.
 */
export const TOWER_LOOK = {
  base: { width: 3.6, depth: 3.6 },
  height: 7.6,
  post: 0.26,
  wood: 0x6b4a30,
  beam: 0x5a3d27,
  plank: 0x7d5838,
  hide: 0xa58260,
  cloth: 0xa8322c,
  iron: 0x4a4e55,
  wheel: { radius: 0.62, width: 0.3, wood: 0x7a5634, rim: 0x3e4248 },
  /** The weak points: warm and softly pulsing, so they read from the hill as the place to shoot. */
  glow: { color: 0xe08a3a, emissive: 0xff8a2a, strength: 0.55, pulse: 0.2, speed: 3, width: 0.38, length: 1.6 },
  door: { width: 1.3, height: 2.1, open: 1.9, seconds: 2.2 },
  /** It tips forward about its front edge when it falls, then sinks with the fallen. */
  topple: { angle: 1.35, seconds: 1.6, under: 3 },
} as const;

const box = (w: number, h: number, d: number, color: number): THREE.Mesh => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));

/** The Siege Tower on the field. */
export class SiegeTowerModel {
  readonly group = new THREE.Group();
  /** Everything above the wheels, pivoted at the front edge so it can topple forward. */
  private readonly pivot = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly beams: THREE.Mesh[] = [];
  private readonly beamMaterial: THREE.MeshLambertMaterial;
  private readonly doors: THREE.Group[] = [];
  private readonly doorOpen = [99, 99];
  private readonly wheels: THREE.Group[] = [];
  private roll = 0;
  private time = 0;

  constructor() {
    const L = TOWER_LOOK;
    const { width, depth } = L.base;
    const hw = width / 2;
    const hd = depth / 2;
    const lift = L.wheel.radius * 0.9;
    // Corner posts and floors.
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        // The corner posts stand proud of the hides, so the frame reads as timbers.
        const post = box(L.post, L.height, L.post, L.beam);
        post.position.set(sx * hw, L.height / 2, sz * hd);
        this.body.add(post);
      }
    }
    for (const y of [0.15, 2.6, 5.1, L.height - 0.6]) {
      const floor = box(width, 0.16, depth, L.beam);
      floor.position.y = y;
      this.body.add(floor);
    }
    // Hides down the sides and back; planks behind the beams on the front, below the drawbridge.
    const sideHide = box(0.08, L.height - 1.2, depth - 0.3, L.hide);
    for (const sx of [-1, 1]) {
      const s = sideHide.clone();
      s.position.set(sx * (hw - 0.06), (L.height - 1.2) / 2 + 0.4, 0);
      this.body.add(s);
    }
    // Dark crossbeams round all four faces at each floor.
    for (const y of [2.6, 5.1]) {
      for (const sx of [-1, 1]) {
        const band = box(0.16, 0.24, depth + 0.1, L.beam);
        band.position.set(sx * (hw + 0.02), y, 0);
        this.body.add(band);
      }
      for (const sz of [-1, 1]) {
        const band = box(width + 0.1, 0.24, 0.16, L.beam);
        band.position.set(0, y, sz * (hd + 0.02));
        this.body.add(band);
      }
    }
    const back = box(width - 0.3, L.height - 1.2, 0.08, L.hide);
    back.position.set(0, (L.height - 1.2) / 2 + 0.4, hd);
    const front = box(width - 0.3, 4.6, 0.08, L.plank);
    front.position.set(0, 2.7, -hd + 0.04);
    // The drawbridge, folded up against the front's top.
    const bridge = box(width - 0.5, 2, 0.14, L.wood);
    bridge.position.set(0, L.height - 1.7, -hd - 0.05);
    const chain = box(0.05, 1.2, 0.05, L.iron);
    for (const sx of [-1, 1]) {
      const c = chain.clone();
      c.position.set(sx * (hw - 0.4), L.height - 0.5, -hd - 0.08);
      this.body.add(c);
    }
    // The fighting platform's rail and the Baron's banner.
    for (const sx of [-1, 1]) {
      const rail = box(0.12, 0.6, depth, L.plank);
      rail.position.set(sx * (hw - 0.06), L.height - 0.2, 0);
      this.body.add(rail);
    }
    const railBack = box(width, 0.6, 0.12, L.plank);
    railBack.position.set(0, L.height - 0.2, hd - 0.06);
    const pole = box(0.08, 2, 0.08, L.wood);
    pole.position.set(hw - 0.3, L.height + 0.9, hd - 0.3);
    const flag = box(0.05, 0.7, 1.1, L.cloth);
    flag.position.set(hw - 0.3, L.height + 1.5, hd + 0.3);
    this.body.add(back, front, bridge, railBack, pole, flag);
    // The glowing support beams where the crowd's weak points ride (its frame: x right, z forward; the model's
    // forward is −Z).
    const G = L.glow;
    this.beamMaterial = new THREE.MeshLambertMaterial({ color: G.color, emissive: G.emissive, emissiveIntensity: G.strength });
    for (const spot of SOLDIERS.siegeTower.wagon!.wheels) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(G.width, G.length, G.width), this.beamMaterial);
      // The body stands on its wheels (`lift`); the beam's bottom matches its crowd body's height above the ground.
      beam.position.set(spot[0], (spot[2] ?? 0) - lift + G.length / 2, -spot[1]);
      this.beams.push(beam);
      this.body.add(beam);
    }
    // A door low on each side, hinged at its front edge.
    const D = L.door;
    for (const sx of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set(sx * (hw + 0.05), 0.3, -D.width / 2);
      const panel = box(0.1, D.height, D.width, L.plank);
      panel.position.set(0, D.height / 2, D.width / 2);
      const band = box(0.12, 0.12, D.width, L.iron);
      band.position.set(0, D.height * 0.7, D.width / 2);
      hinge.add(panel, band);
      this.doors.push(hinge);
      this.body.add(hinge);
    }
    // The pivot sits at the front edge, so the whole tower tips forward about it.
    this.body.position.set(0, lift, hd);
    this.pivot.position.set(0, 0, -hd);
    this.pivot.add(this.body);
    this.group.add(this.pivot);
    const W = L.wheel;
    const wheelGeo = new THREE.CylinderGeometry(W.radius, W.radius, W.width, 14);
    wheelGeo.rotateZ(Math.PI / 2);
    const spokeGeo = new THREE.BoxGeometry(W.width + 0.04, W.radius * 1.7, 0.12);
    const wood = new THREE.MeshLambertMaterial({ color: W.wood });
    const rim = new THREE.MeshLambertMaterial({ color: W.rim });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const wheel = new THREE.Group();
        wheel.add(new THREE.Mesh(wheelGeo, wood));
        const spoke = new THREE.Mesh(spokeGeo, rim);
        wheel.add(spoke);
        wheel.position.set(sx * (hw + W.width / 2), W.radius, sz * (hd - 0.6));
        this.wheels.push(wheel);
        this.group.add(wheel);
      }
    }
    // Its fixed timbers in a few draw calls; the beams (they drop away) and doors (they swing) stay apart.
    mergeStatic(this.body, [...this.beams, ...this.doors]);
    for (const door of this.doors) mergeStatic(door);
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

  /** A door swings open (−1 left, 1 right) and closes again. */
  openDoor(side: number): void {
    this.doorOpen[side < 0 ? 0 : 1] = 0;
  }

  /**
   * Places it at (x, y, z) facing `heading` (radians, 0 = −Z) with `broken` beams gone; `moved` metres roll the
   * wheels; `collapsed` seconds since it fell (−1: it hasn't), `sink` 0–1 as the fallen sink away.
   */
  update(dt: number, x: number, y: number, z: number, heading: number, broken: readonly boolean[], moved: number, collapsed: number, sink: number): void {
    const L = TOWER_LOOK;
    this.time += dt;
    this.group.visible = true;
    this.group.position.set(x, y - sink * L.topple.under, z);
    this.group.rotation.y = heading;
    this.roll += moved / L.wheel.radius;
    for (const w of this.wheels) w.rotation.x = -this.roll;
    this.beams.forEach((b, k) => (b.visible = !broken[k]));
    this.beamMaterial.emissiveIntensity = L.glow.strength + L.glow.pulse * Math.sin(this.time * L.glow.speed);
    this.doors.forEach((door, k) => {
      this.doorOpen[k] = this.doorOpen[k]! + dt;
      const t = this.doorOpen[k]!;
      const D = L.door;
      // Swings out over a quarter of its time, stays, swings back.
      const u = t >= D.seconds ? 0 : Math.min(1, t / (D.seconds * 0.2), (D.seconds - t) / (D.seconds * 0.25));
      // Each swings outward, away from the tower's side.
      door.rotation.y = (k === 0 ? -1 : 1) * u * D.open;
    });
    // It tips forward slowly at first, then falls.
    const c = collapsed < 0 ? 0 : Math.min(1, collapsed / L.topple.seconds);
    this.pivot.rotation.x = -c * c * L.topple.angle;
  }

  hide(): void {
    this.group.visible = false;
  }
}
