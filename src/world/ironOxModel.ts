import * as THREE from 'three';
import { mergeStatic } from '@/render/mergeStatic';
import { SHADOW_LAYER } from '@/render/stage';

/**
 * The Iron Ox's look (GDD §9.3, M9): built in code like the other siege engines. A bull-shaped iron engine on four
 * iron wheels: a riveted body with a hump, a lowered head with two curved horns (they glow before it breathes fire),
 * armour plates down its sides and chest (they fall away in phase 3 to show a glowing core), and a tiny turret on its
 * back where the Iron Baron sits in a gold crown. Metres; it faces −Z, its right is +X.
 */
export const OX_LOOK = {
  // Lighter than black iron: a black engine read as a block from the hill.
  iron: 0x5d636c,
  dark: 0x3b4047,
  rust: 0x8a5238,
  plate: 0x858c96,
  hornColour: 0xeadfcc,
  eye: 0xff4a2a,
  gold: 0xf2b632,
  cloth: 0xa8322c,
  skin: 0xe2b48c,
  body: { length: 3.6, width: 2.2, height: 1.5, at: 1.15 },
  hump: { length: 1.6, height: 0.8 },
  head: { size: [1.55, 1.2, 1.3] as [number, number, number], at: [0, 1.6, -2.3] as [number, number, number] },
  horn: { radius: 0.27, length: 1.6, spread: 0.72, rise: 0.75 },
  wheel: { radius: 0.62, width: 0.34 },
  /** The horns' glow while it winds up, and the core's. */
  glow: 0xff7a2a,
  core: { size: [1.0, 0.7, 1.4] as [number, number, number], strength: 1.1 },
  /** Its plates fall away over this long when the core shows. */
  drop: 0.9,
  /** When it falls: it settles crooked, then sinks with the fallen. */
  collapse: { sink: 0.4, tilt: 0.16, seconds: 1, under: 3 },
} as const;

const box = (w: number, h: number, d: number, color: number): THREE.Mesh => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));

/** The Iron Ox on the field. */
export class IronOxModel {
  readonly group = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly plates = new THREE.Group();
  /** The Baron in his turret: he leaves when it falls (M10, `DonkeyEscape`). */
  private readonly rider = new THREE.Group();
  private readonly hornMaterial: THREE.MeshLambertMaterial;
  private readonly coreMaterial: THREE.MeshLambertMaterial;
  private readonly plateList: THREE.Mesh[] = [];
  private time = 0;
  /** Seconds since its plates started to fall (−1: they haven't). */
  private dropped = -1;

  constructor() {
    const L = OX_LOOK;
    const B = L.body;
    const hull = box(B.width, B.height, B.length, L.iron);
    hull.position.y = B.at;
    const hump = box(B.width * 0.8, L.hump.height, L.hump.length, L.iron);
    hump.position.set(0, B.at + B.height / 2 + L.hump.height / 2 - 0.1, -0.4);
    const belly = box(B.width * 0.9, 0.3, B.length * 0.9, L.dark);
    belly.position.y = B.at - B.height / 2 - 0.1;
    // Rust bands round its middle and rivets along its spine.
    const band = box(B.width + 0.04, 0.16, 0.24, L.rust);
    for (const z of [-1.1, 0.2, 1.4]) {
      const b = band.clone();
      b.position.set(0, B.at, z);
      this.body.add(b);
    }
    for (let k = 0; k < 6; k++) {
      const rivet = box(0.12, 0.08, 0.12, L.dark);
      rivet.position.set(0, B.at + B.height / 2 + 0.03, 1.5 - k * 0.55);
      this.body.add(rivet);
    }
    // The head, lowered, and its horns.
    const head = box(...L.head.size, L.iron);
    head.position.set(...L.head.at);
    const snout = box(L.head.size[0] * 0.75, L.head.size[1] * 0.55, 0.5, L.dark);
    snout.position.set(0, L.head.at[1] - 0.2, L.head.at[2] - L.head.size[2] / 2 - 0.2);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 12), new THREE.MeshLambertMaterial({ color: L.gold }));
    ring.position.set(0, L.head.at[1] - 0.35, L.head.at[2] - L.head.size[2] / 2 - 0.46);
    this.hornMaterial = new THREE.MeshLambertMaterial({ color: L.hornColour, emissive: L.glow, emissiveIntensity: 0 });
    // Two glowing red eyes: a face, so the engine reads as a bull from the hill.
    const eyes = new THREE.MeshLambertMaterial({ color: L.eye, emissive: L.eye, emissiveIntensity: 0.9 });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.06), eyes);
      eye.position.set(side * 0.38, L.head.at[1] + 0.18, L.head.at[2] - L.head.size[2] / 2 - 0.02);
      this.body.add(eye);
    }
    const H = L.horn;
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(H.radius, H.length, 8), this.hornMaterial);
      horn.position.set(side * H.spread, L.head.at[1] + 0.55, L.head.at[2] - 0.1);
      horn.rotation.z = -side * 1.0;
      horn.rotation.x = -H.rise;
      this.body.add(horn);
    }
    // The turret on its back, the Baron in it: a small round turret, his head, his gold crown and red cloak.
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.5, 10), new THREE.MeshLambertMaterial({ color: L.dark }));
    turret.position.set(0, B.at + B.height / 2 + L.hump.height + 0.1, 0.2);
    this.rider.position.set(0, turret.position.y + 0.2, 0.2);
    const cloak = box(0.5, 0.35, 0.36, L.cloth);
    cloak.position.set(0, 0.2, 0);
    const baron = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshLambertMaterial({ color: L.skin }));
    baron.position.set(0, 0.52, 0);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.14, 8, 1, true), new THREE.MeshLambertMaterial({ color: L.gold, side: THREE.DoubleSide }));
    crown.position.set(0, 0.72, 0);
    this.rider.add(cloak, baron, crown);
    // The core: always glowing inside, hidden behind the plates until they fall.
    this.coreMaterial = new THREE.MeshLambertMaterial({ color: 0xffb070, emissive: L.glow, emissiveIntensity: L.core.strength });
    for (const side of [-1, 1]) {
      const core = new THREE.Mesh(new THREE.BoxGeometry(...L.core.size), this.coreMaterial);
      core.position.set(side * (B.width / 2 - L.core.size[0] / 2 + 0.06), B.at, 0.1);
      this.body.add(core);
    }
    // Armour plates over the core on each side and over its chest.
    for (const side of [-1, 1]) {
      for (const z of [-0.6, 0.8]) {
        const plate = box(0.12, B.height * 0.85, 1.25, L.plate);
        plate.position.set(side * (B.width / 2 + 0.08), B.at, z);
        this.plates.add(plate);
        this.plateList.push(plate);
      }
    }
    const chest = box(B.width * 0.85, B.height * 0.8, 0.12, L.plate);
    chest.position.set(0, B.at, -B.length / 2 - 0.08);
    this.plates.add(chest);
    this.plateList.push(chest);
    this.body.add(hull, hump, belly, head, snout, ring, turret, this.rider, this.plates);
    this.group.add(this.body);
    // Four iron wheels, merged still (it crawls).
    const W = L.wheel;
    const wheelGeo = new THREE.CylinderGeometry(W.radius, W.radius, W.width, 14);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheels = new THREE.Group();
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const wheel = new THREE.Mesh(wheelGeo, new THREE.MeshLambertMaterial({ color: L.dark }));
        wheel.position.set(sx * (B.width / 2 + W.width / 2 - 0.05), W.radius, sz * (B.length / 2 - 0.6));
        wheels.add(wheel);
      }
    }
    this.group.add(wheels);
    // Its fixed iron in a few draw calls; the horns (they glow), the core and the plates (they fall) stay apart.
    mergeStatic(this.body, [this.plates, this.rider]);
    mergeStatic(wheels);
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.layers.enable(SHADOW_LAYER);
    });
    this.group.visible = false;
  }

  /**
   * Places it at (x, y, z) facing `heading` (radians, 0 = −Z). `windup` is 0–1 through its fire's wind-up (the horns
   * glow brighter), `phase` its phase (at 2 the plates fall away), `collapsed` seconds since it fell (−1: it hasn't),
   * `sink` 0–1 as the fallen sink away.
   */
  update(dt: number, x: number, y: number, z: number, heading: number, windup: number, phase: number, collapsed: number, sink: number): void {
    const L = OX_LOOK;
    this.time += dt;
    this.group.visible = true;
    this.group.position.set(x, y - sink * L.collapse.under, z);
    this.group.rotation.y = heading;
    this.hornMaterial.emissiveIntensity = windup > 0 ? 0.3 + windup * 1.2 + 0.2 * Math.sin(this.time * 18) : 0;
    this.coreMaterial.emissiveIntensity = L.core.strength + 0.25 * Math.sin(this.time * 4);
    if (phase >= 2 && this.dropped < 0) this.dropped = 0;
    if (phase < 2 && this.dropped >= 0) this.reset();
    if (this.dropped >= 0) {
      this.dropped += dt;
      const u = Math.min(1, this.dropped / L.drop);
      for (const plate of this.plateList) {
        // Each plate tips outward and drops to the ground, then lies there.
        const out = Math.sign(plate.position.x) || 0;
        plate.rotation.z = -out * u * 1.3;
        plate.rotation.x = out === 0 ? u * 1.3 : 0;
        plate.position.y = L.body.at - u * u * (L.body.at - 0.1);
      }
    }
    const c = collapsed < 0 ? 0 : Math.min(1, collapsed / L.collapse.seconds);
    this.body.rotation.z = c * L.collapse.tilt;
    this.body.position.y = -c * L.collapse.sink;
    // He's out and away on his donkey the moment it falls.
    this.rider.visible = collapsed < 0;
  }

  /** Where the Baron sits in his turret, in the world (where his escape starts). */
  riderAt(out: THREE.Vector3): THREE.Vector3 {
    return this.rider.getWorldPosition(out);
  }

  /** A fresh Ox (a new battle): its plates back on. */
  private reset(): void {
    this.dropped = -1;
    for (const plate of this.plateList) {
      plate.rotation.set(0, 0, 0);
      plate.position.y = OX_LOOK.body.at;
    }
  }

  hide(): void {
    this.group.visible = false;
  }
}
