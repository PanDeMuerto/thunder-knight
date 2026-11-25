import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { SOLDIERS } from '@/content/soldiers';
import { mergeStatic } from '@/render/mergeStatic';
import { SHADOW_LAYER } from '@/render/stage';

/**
 * The War Wagon's look (GDD §9.3, M9): built here in low-poly boxes (no CC0 wagon fits), pulled by two oxen
 * (Quaternius' cow, CC0, repainted brown). Metres; the wagon faces −Z, its right is +X, like a soldier at heading 0.
 */
export const WAGON_LOOK = {
  hull: { length: 3.4, width: 2.0, bottom: 0.55, top: 1.5 },
  wood: 0x6b4a30,
  plank: 0x7d5838,
  iron: 0x4a4e55,
  cloth: 0xa8322c,
  wheel: { radius: 0.62, width: 0.24, wood: 0x7a5634, rim: 0x3e4248 },
  /** The oxen: how far ahead, apart, and how tall; their walk covers this much ground a second at its natural rate. */
  oxen: { ahead: 3.5, apart: 0.75, height: 1.35, walkSpeed: 1.1, hide: 0xa06a40, dark: 0x4a2e1c },
  /** How far it leans toward a broken wheel, radians, and how it settles when it collapses. */
  lean: 0.05,
  collapse: { sink: 0.55, tilt: 0.18, seconds: 1.1 },
} as const;

export async function loadOx(): Promise<{ scene: THREE.Group; clips: THREE.AnimationClip[] }> {
  const gltf = await new GLTFLoader().loadAsync('assets/soldiers/ox.glb');
  return { scene: gltf.scene, clips: gltf.animations };
}

const box = (w: number, h: number, d: number, color: number): THREE.Mesh => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));

/**
 * One War Wagon on the field: the hull with iron plates and a red band, a fighting deck with a rail, four wheels that
 * turn as it rolls (and vanish when broken), a pole and yoke, and two oxen walking in front.
 */
export class WarWagonModel {
  readonly group = new THREE.Group();
  /** The hull and everything on it, which leans and settles. */
  private readonly body = new THREE.Group();
  readonly wheels: THREE.Group[] = [];
  private readonly mixers: THREE.AnimationMixer[] = [];
  private readonly walks: THREE.AnimationAction[] = [];
  private readonly idles: THREE.AnimationAction[] = [];
  private roll = 0;
  private walking = false;

  constructor(ox: { scene: THREE.Group; clips: THREE.AnimationClip[] } | null) {
    const L = WAGON_LOOK;
    const { length, width, bottom, top } = L.hull;
    const hull = box(width, top - bottom, length, L.wood);
    hull.position.y = (top + bottom) / 2;
    // Iron plates down each side and across the front, a red band under the deck's rail.
    for (const side of [-1, 1]) {
      const plate = box(0.06, (top - bottom) * 0.62, length * 0.82, L.iron);
      plate.position.set((side * width) / 2 + side * 0.03, bottom + (top - bottom) * 0.42, 0);
      this.body.add(plate);
    }
    const front = box(width * 0.8, (top - bottom) * 0.6, 0.06, L.iron);
    front.position.set(0, bottom + (top - bottom) * 0.45, -length / 2 - 0.03);
    const band = box(width + 0.08, 0.14, length + 0.08, L.cloth);
    band.position.y = top - 0.07;
    // The deck's rail: low planks round the edge, open at the back where the footmen come out.
    const rail = new THREE.Group();
    const railH = 0.45;
    for (const side of [-1, 1]) {
      const plank = box(0.1, railH, length, L.plank);
      plank.position.set((side * (width - 0.1)) / 2, top + railH / 2, 0);
      rail.add(plank);
    }
    const bow = box(width, railH, 0.1, L.plank);
    bow.position.set(0, top + railH / 2, -length / 2 + 0.05);
    rail.add(bow);
    // A short pole with the Baron's red flag at the back corner.
    const pole = box(0.07, 1.6, 0.07, L.wood);
    pole.position.set(width / 2 - 0.15, top + 0.8, length / 2 - 0.15);
    const flag = box(0.04, 0.45, 0.7, L.cloth);
    flag.position.set(width / 2 - 0.15, top + 1.35, length / 2 + 0.2);
    this.body.add(hull, front, band, rail, pole, flag);
    // The pole and yoke to the oxen.
    const shaft = box(0.12, 0.12, L.oxen.ahead - 0.6, L.wood);
    shaft.position.set(0, 0.75, -length / 2 - (L.oxen.ahead - 0.6) / 2);
    const yoke = box(L.oxen.apart * 2 + 0.6, 0.12, 0.14, L.wood);
    yoke.position.set(0, 1.05, -L.oxen.ahead - 0.2);
    this.group.add(this.body, shaft, yoke);
    // Wheels: an axle along X; spokes as two crossed boards for a readable turn.
    const W = L.wheel;
    const wheelGeo = new THREE.CylinderGeometry(W.radius, W.radius, W.width, 14);
    wheelGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.TorusGeometry(W.radius, 0.05, 6, 18);
    rimGeo.rotateY(Math.PI / 2);
    const spokeGeo = new THREE.BoxGeometry(W.width + 0.04, W.radius * 1.7, 0.1);
    const wood = new THREE.MeshLambertMaterial({ color: W.wood });
    const rim = new THREE.MeshLambertMaterial({ color: W.rim });
    const spokeMat = new THREE.MeshLambertMaterial({ color: L.wood });
    for (const [dx, dz] of SOLDIERS.warWagon.wagon!.wheels) {
      const wheel = new THREE.Group();
      wheel.add(new THREE.Mesh(wheelGeo, wood));
      for (const side of [-1, 1]) {
        const ring = new THREE.Mesh(rimGeo, rim);
        ring.position.x = (side * W.width) / 2;
        wheel.add(ring);
      }
      for (const turn of [0, Math.PI / 2]) {
        const spoke = new THREE.Mesh(spokeGeo, spokeMat);
        spoke.rotation.x = turn;
        wheel.add(spoke);
      }
      // The sim's frame: x right, z forward; the model's forward is −Z.
      wheel.position.set(dx, W.radius, -dz);
      this.wheels.push(wheel);
      this.group.add(wheel);
    }
    // Its hull and deck in a few draw calls; each wheel (they turn and vanish) on its own.
    mergeStatic(this.body);
    for (const wheel of this.wheels) mergeStatic(wheel);
    if (ox) this.addOxen(ox);
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.layers.enable(SHADOW_LAYER);
    });
    this.group.visible = false;
  }

  /** Its two oxen (M11: fetched after the first load; without them it rolls on its own). */
  addOxen(ox: { scene: THREE.Group; clips: THREE.AnimationClip[] }): void {
    if (this.mixers.length > 0) return;
    const L = WAGON_LOOK.oxen;
    const size = new THREE.Box3().setFromObject(ox.scene, true).getSize(new THREE.Vector3());
    const scale = L.height / Math.max(1e-3, size.y);
    // Repainted from a dairy cow to a brown ox.
    const paint = (m: THREE.Material): THREE.Material => {
      const src = m as THREE.MeshStandardMaterial;
      const name = src.name.toLowerCase();
      const color = name.includes('white') ? L.hide : name.includes('black') ? L.dark : 0x9a6a5a;
      return new THREE.MeshLambertMaterial({ color });
    };
    for (const side of [-1, 1]) {
      const one = cloneSkinned(ox.scene) as THREE.Group;
      one.scale.setScalar(scale);
      one.position.set(side * L.apart, 0, -L.ahead);
      // The cow model faces +Z; the wagon's forward is −Z.
      one.rotation.y = Math.PI;
      one.traverse((o) => {
        const m = o as THREE.SkinnedMesh;
        if (!m.isMesh) return;
        m.material = Array.isArray(m.material) ? m.material.map(paint) : paint(m.material);
        m.frustumCulled = false;
        m.castShadow = true;
        m.layers.enable(SHADOW_LAYER);
      });
      const mixer = new THREE.AnimationMixer(one);
      const walk = ox.clips.find((c) => c.name.endsWith('Walk'));
      const idle = ox.clips.find((c) => c.name.endsWith('Idle'));
      if (walk) this.walks.push(mixer.clipAction(walk));
      if (idle) {
        const a = mixer.clipAction(idle);
        a.play();
        this.idles.push(a);
      }
      // Out of step with each other.
      mixer.update(Math.random() * 2);
      this.mixers.push(mixer);
      this.group.add(one);
    }
  }

  /**
   * Places it at (x, y, z) facing `heading` (radians, 0 = −Z) with `broken` wheels gone; `moved` metres since the
   * last frame turn the wheels and walk the oxen; `collapsed` seconds since it fell (−1: it hasn't).
   */
  update(dt: number, x: number, y: number, z: number, heading: number, broken: readonly boolean[], moved: number, collapsed: number): void {
    this.group.visible = true;
    this.group.position.set(x, y, z);
    this.group.rotation.y = heading;
    this.roll += moved / WAGON_LOOK.wheel.radius;
    let leanX = 0;
    let leanZ = 0;
    const spots = SOLDIERS.warWagon.wagon!.wheels;
    this.wheels.forEach((w, k) => {
      w.visible = !broken[k];
      w.rotation.x = -this.roll;
      if (broken[k]) {
        leanX += spots[k]![0];
        leanZ += spots[k]![1];
      }
    });
    // It leans toward its broken wheels, and settles low and crooked when it collapses.
    const c = collapsed < 0 ? 0 : Math.min(1, collapsed / WAGON_LOOK.collapse.seconds);
    this.body.rotation.z = -leanX * WAGON_LOOK.lean - c * WAGON_LOOK.collapse.tilt;
    this.body.rotation.x = leanZ * WAGON_LOOK.lean;
    this.body.position.y = -c * WAGON_LOOK.collapse.sink;
    // The oxen walk while it rolls.
    const walking = moved > dt * 0.3;
    if (walking !== this.walking) {
      this.walking = walking;
      for (const a of this.walks) {
        if (walking) a.reset().fadeIn(0.25).play();
        else a.fadeOut(0.25);
      }
      for (const a of this.idles) {
        if (walking) a.fadeOut(0.25);
        else a.reset().fadeIn(0.25).play();
      }
    }
    for (const a of this.walks) a.timeScale = Math.max(0.5, moved / Math.max(1e-3, dt) / WAGON_LOOK.oxen.walkSpeed);
    for (const m of this.mixers) m.update(dt);
  }

  hide(): void {
    this.group.visible = false;
  }
}
