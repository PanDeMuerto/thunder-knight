import * as THREE from 'three';
import { mergeStatic } from '@/render/mergeStatic';
import { SHADOW_LAYER } from '@/render/stage';

/**
 * The battering ram's look (GDD §9.1, M9): built here in low-poly boxes like the War Wagon (no CC0 ram fits). A timber
 * frame on four small wheels under a peaked roof of hides, the Baron's red along the ridge, and a log with an iron head
 * hung from the roof beams. Narrow enough that its six crew walk outside it. Metres; it faces −Z, its right is +X.
 */
export const RAM_LOOK = {
  frame: { length: 3.2, width: 1.3, eaves: 1.55, ridge: 2.15, post: 0.13 },
  wood: 0x6b4a30,
  beam: 0x5a3d27,
  hide: 0x8c6c4a,
  cloth: 0xa8322c,
  iron: 0x4a4e55,
  wheel: { radius: 0.34, width: 0.16, wood: 0x7a5634 },
  log: { radius: 0.17, length: 3.9, hang: 0.95, head: 0.45, ahead: 0.45 },
  /** The log swings this far (metres) as it rolls, once every this many metres. */
  swing: { reach: 0.12, every: 2.4 },
  /** When it's abandoned or broken: it settles crooked, then sinks with the fallen. */
  collapse: { sink: 0.35, tilt: 0.12, seconds: 0.9, under: 2.6 },
} as const;

const box = (w: number, h: number, d: number, color: number): THREE.Mesh => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));

/** One battering ram on the field. */
export class RamModel {
  readonly group = new THREE.Group();
  /** The frame, roof and log, which settle and sink; the wheels stay under it. */
  private readonly body = new THREE.Group();
  private readonly log = new THREE.Group();
  private readonly wheels: THREE.Group[] = [];
  private roll = 0;

  constructor() {
    const L = RAM_LOOK;
    const { length, width, eaves, ridge, post } = L.frame;
    const half = width / 2;
    // Posts at the corners and the middle, beams along the bottom and the eaves.
    for (const sx of [-1, 1]) {
      for (const z of [-length / 2 + post, 0, length / 2 - post]) {
        const p = box(post, eaves - 0.3, post, L.wood);
        p.position.set(sx * (half - post / 2), 0.3 + (eaves - 0.3) / 2, z);
        this.body.add(p);
      }
      for (const y of [0.34, eaves]) {
        const beam = box(post * 1.1, post, length, L.beam);
        beam.position.set(sx * (half - post / 2), y, 0);
        this.body.add(beam);
      }
    }
    // The peaked roof: two hide panels from the eaves to the ridge, a little past the frame at both ends.
    const rise = ridge - eaves;
    const run = half + 0.12;
    const slope = Math.hypot(run, rise);
    for (const sx of [-1, 1]) {
      const panel = box(slope, 0.07, length + 0.35, L.hide);
      panel.position.set((sx * run) / 2, eaves + rise / 2, 0);
      panel.rotation.z = -sx * Math.atan2(rise, run);
      this.body.add(panel);
    }
    const band = box(0.16, 0.1, length + 0.4, L.cloth);
    band.position.set(0, ridge + 0.02, 0);
    this.body.add(band);
    // The log, hung on two ropes, its iron head out in front.
    const G = L.log;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(G.radius, G.radius * 1.08, G.length, 10), new THREE.MeshLambertMaterial({ color: L.wood }));
    trunk.rotation.x = Math.PI / 2;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(G.radius * 1.35, G.radius * 1.35, G.head, 10), new THREE.MeshLambertMaterial({ color: L.iron }));
    head.rotation.x = Math.PI / 2;
    head.position.z = -G.length / 2 - G.head / 2 + 0.1;
    this.log.add(trunk, head);
    this.log.position.set(0, G.hang, -G.ahead);
    for (const z of [-length / 3, length / 3]) {
      const rope = box(0.04, eaves - G.hang, 0.04, 0x3e3228);
      rope.position.set(0, G.hang + (eaves - G.hang) / 2, z - G.ahead);
      this.body.add(rope);
    }
    const crossbeam = box(width - post, post * 0.8, post * 0.8, L.beam);
    for (const z of [-length / 3, length / 3]) {
      const c = crossbeam.clone();
      c.position.set(0, eaves, z - G.ahead);
      this.body.add(c);
    }
    this.body.add(this.log);
    this.group.add(this.body);
    // Four small solid wheels.
    const W = L.wheel;
    const wheelGeo = new THREE.CylinderGeometry(W.radius, W.radius, W.width, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const spokeGeo = new THREE.BoxGeometry(W.width + 0.03, W.radius * 1.6, 0.07);
    const wood = new THREE.MeshLambertMaterial({ color: W.wood });
    const spokes = new THREE.MeshLambertMaterial({ color: L.beam });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const wheel = new THREE.Group();
        wheel.add(new THREE.Mesh(wheelGeo, wood));
        const spoke = new THREE.Mesh(spokeGeo, spokes);
        wheel.add(spoke);
        wheel.position.set(sx * (half + W.width / 2 - 0.02), W.radius, sz * (length / 2 - 0.45));
        this.wheels.push(wheel);
        this.group.add(wheel);
      }
    }
    // Its fixed timbers in a few draw calls; the swinging log stays apart.
    mergeStatic(this.body, [this.log]);
    mergeStatic(this.log);
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

  /**
   * Places it at (x, y, z) facing `heading` (radians, 0 = −Z); `moved` metres since the last frame roll the wheels and
   * swing the log; `collapsed` seconds since it fell (−1: it hasn't), `sink` 0–1 as the fallen sink away.
   */
  update(x: number, y: number, z: number, heading: number, moved: number, collapsed: number, sink: number): void {
    const L = RAM_LOOK;
    this.group.visible = true;
    this.group.position.set(x, y - sink * L.collapse.under, z);
    this.group.rotation.y = heading;
    this.roll += moved;
    for (const w of this.wheels) w.rotation.x = -this.roll / L.wheel.radius;
    this.log.position.z = -L.log.ahead + Math.sin((this.roll / L.swing.every) * Math.PI * 2) * L.swing.reach;
    const c = collapsed < 0 ? 0 : Math.min(1, collapsed / L.collapse.seconds);
    this.body.rotation.z = c * L.collapse.tilt;
    this.body.position.y = -c * L.collapse.sink;
  }

  hide(): void {
    this.group.visible = false;
  }
}
