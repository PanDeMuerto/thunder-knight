import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HERO_LOOK, type HeroGun } from '@/content/heroLook';
import { recolour } from '@/render/recolour';
import { SHADOW_LAYER } from '@/render/stage';

/** The loaded files: the hero (KayKit hooded rogue, `npm run assets:hero`) and his guns. */
export interface HeroAssets {
  scene: THREE.Group;
  clips: THREE.AnimationClip[];
  guns: Map<HeroGun, THREE.Object3D>;
}

export async function loadHeroAssets(): Promise<HeroAssets> {
  const loader = new GLTFLoader();
  const [hero, guns] = await Promise.all([loader.loadAsync('assets/hero/hero.glb'), loader.loadAsync('assets/hero/guns.glb')]);
  const map = new Map<HeroGun, THREE.Object3D>();
  for (const node of guns.scene.children) map.set(node.name as HeroGun, node);
  const mg = map.get('mg');
  if (mg) dressMachineGun(mg);
  const launcher = map.get('launcher');
  if (launcher) dressLauncher(launcher);
  const minigun = map.get('minigun');
  if (minigun) dressMinigun(minigun);
  const rocket = map.get('rocket');
  if (rocket) dressRocket(rocket);
  return { scene: hero.scene, clips: hero.animations, guns: map };
}

/**
 * A gun's star looks (GDD §8.1), added under it as two hidden groups, `star3` and `star5`: at ★3 a red-dot sight on its
 * top or a drum under it, at ★5 two gold bands round it. Each part is fitted to the gun's own shape where it sits (its
 * top, bottom and thickness across a thin slice there), so one rule fits every gun. Returns the new materials (the
 * hero fades them with the rest of his gun).
 */
function dressStars(gun: THREE.Object3D, id: HeroGun, box: THREE.Box3): THREE.Material[][] {
  const S = HERO_LOOK.stars;
  const look = HERO_LOOK.guns[id];
  const length = box.max.x - box.min.x;
  // The gun's own units in a metre as the hero holds it: sizes below are metres.
  const m = length / look.length;
  const along = (share: number): number => look.grip[0] + (look.muzzle[0] - look.grip[0]) * share;
  const lambert = (color: number, emissive = 0x000000): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ color, emissive, transparent: true });
  const slice = (x: number) => crossSection(gun, x, 0.025 * m);
  const star3 = new THREE.Group();
  star3.name = 'star3';
  const dark = lambert(S.dark);
  const lens = lambert(S.lens, 0x5a1408);
  if (S.star3[id] === 'sight') {
    const x = along(S.sight.at);
    const top = slice(x).top;
    const L = S.sight;
    const body = new THREE.Mesh(new THREE.BoxGeometry(L.length * m, L.height * m, L.width * m), dark);
    body.position.set(x, top + (L.height * m) / 2, 0);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(L.lens * m, L.lens * m, 0.008 * m, 10), lens);
    glass.rotation.z = Math.PI / 2;
    glass.position.set(x + (L.length * m) / 2, top + (L.height * m) / 2, 0);
    star3.add(body, glass);
  } else {
    const x = along(S.drum.at);
    const bottom = slice(x).bottom;
    const r = S.drum.radius * m;
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(r, r, S.drum.width * m, 14), dark);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(x, bottom - r * 0.6, 0);
    star3.add(drum);
  }
  const star5 = new THREE.Group();
  star5.name = 'star5';
  const gold = lambert(S.gold, 0x3a2600);
  for (const share of S.bands.at) {
    const x = along(share);
    const s = slice(x);
    const r = Math.max((s.top - s.bottom) / 2, s.side) + S.bands.gap * m;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r, r, S.bands.width * m, 16, 1, true), gold);
    band.material.side = THREE.DoubleSide;
    band.rotation.z = Math.PI / 2;
    band.position.set(x, (s.top + s.bottom) / 2, 0);
    star5.add(band);
  }
  // A gold plate down each side of its body, where the camera behind him sees it.
  {
    const P = S.plate;
    const x = along(P.at);
    const s = slice(x);
    for (const side of [-1, 1]) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(P.length * m, P.height * m, 0.004 * m), gold);
      plate.position.set(x, (s.top + s.bottom) / 2, side * (s.side + 0.003 * m));
      star5.add(plate);
    }
  }
  for (const g of [star3, star5]) {
    g.visible = false;
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.layers.enable(SHADOW_LAYER);
    });
    gun.add(g);
  }
  return [[dark, lens], [gold]];
}

/**
 * A gun's top, bottom and widest side (its own units) across the slice of it within `half` of `x`: from every triangle
 * that crosses the slice (a long low-poly tube or slide has no vertices in the middle, only triangles spanning it).
 */
function crossSection(gun: THREE.Object3D, x: number, half: number): { top: number; bottom: number; side: number } {
  const inverse = new THREE.Matrix4().copy(gun.matrixWorld).invert();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let top = -Infinity;
  let bottom = Infinity;
  let side = 0;
  gun.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const to = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
    const pos = mesh.geometry.attributes.position as THREE.BufferAttribute | undefined;
    if (!pos) return;
    const index = mesh.geometry.index;
    const count = index ? index.count : pos.count;
    for (let t = 0; t + 2 < count; t += 3) {
      const ia = index ? index.getX(t) : t;
      const ib = index ? index.getX(t + 1) : t + 1;
      const ic = index ? index.getX(t + 2) : t + 2;
      a.fromBufferAttribute(pos, ia).applyMatrix4(to);
      b.fromBufferAttribute(pos, ib).applyMatrix4(to);
      c.fromBufferAttribute(pos, ic).applyMatrix4(to);
      if (Math.max(a.x, b.x, c.x) < x - half || Math.min(a.x, b.x, c.x) > x + half) continue;
      top = Math.max(top, a.y, b.y, c.y);
      bottom = Math.min(bottom, a.y, b.y, c.y);
      side = Math.max(side, Math.abs(a.z), Math.abs(b.z), Math.abs(c.z));
    }
  });
  if (!Number.isFinite(top)) return { top: 0, bottom: 0, side: 0 };
  return { top, bottom, side };
}

/** No CC0 rocket launcher fits: the long pump shotgun inside a fat olive tube, a red warhead out front and a sight. */
function dressRocket(gun: THREE.Object3D): void {
  const L = HERO_LOOK.rocketDress;
  const tube = new THREE.MeshStandardMaterial({ color: L.tube, roughness: 0.7, metalness: 0.1 });
  const head = new THREE.MeshStandardMaterial({ color: L.warhead, roughness: 0.6, metalness: 0.2 });
  const sight = new THREE.MeshStandardMaterial({ color: L.sight, roughness: 0.5, metalness: 0.4 });
  const B = L.body;
  const bodyGeo = new THREE.CylinderGeometry(B.radius, B.radius, B.to - B.from, 14);
  bodyGeo.rotateZ(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, tube);
  body.position.set((B.from + B.to) / 2, B.y, 0);
  const H = L.head;
  const headGeo = new THREE.ConeGeometry(H.radius, H.length, 12);
  headGeo.rotateZ(-Math.PI / 2);
  const warhead = new THREE.Mesh(headGeo, head);
  warhead.position.set(B.to + H.length / 2, B.y, 0);
  const scope = new THREE.Mesh(new THREE.BoxGeometry(...L.scope.size), sight);
  scope.position.set(...L.scope.at);
  gun.add(body, warhead, scope);
}

/**
 * No CC0 minigun fits: the second SMG's body gets six long barrels round a spinning hub (a group named `rotor`, which
 * the hero model turns while it fires), two collars and a big olive ammo box under it.
 */
function dressMinigun(gun: THREE.Object3D): void {
  const L = HERO_LOOK.minigunDress;
  const metal = new THREE.MeshStandardMaterial({ color: L.metal, roughness: 0.5, metalness: 0.4 });
  const light = new THREE.MeshStandardMaterial({ color: L.light, roughness: 0.45, metalness: 0.5 });
  const box = new THREE.MeshStandardMaterial({ color: L.box, roughness: 0.7, metalness: 0.1 });
  const B = L.barrels;
  const rotor = new THREE.Group();
  rotor.name = 'rotor';
  rotor.position.set((B.from + B.to) / 2, B.y, 0);
  const barrelGeo = new THREE.CylinderGeometry(B.radius, B.radius, B.to - B.from, 8);
  barrelGeo.rotateZ(Math.PI / 2);
  for (let k = 0; k < B.count; k++) {
    const a = (k / B.count) * Math.PI * 2;
    const barrel = new THREE.Mesh(barrelGeo, metal);
    barrel.position.set(0, Math.cos(a) * B.ring, Math.sin(a) * B.ring);
    rotor.add(barrel);
  }
  const C = L.collar;
  const collarGeo = new THREE.CylinderGeometry(C.radius, C.radius, C.length, 12);
  collarGeo.rotateZ(Math.PI / 2);
  for (const x of C.at) {
    const collar = new THREE.Mesh(collarGeo, light);
    collar.position.x = x - (B.from + B.to) / 2;
    rotor.add(collar);
  }
  const ammo = new THREE.Mesh(new THREE.BoxGeometry(...L.ammo.size), box);
  ammo.position.set(...L.ammo.at);
  gun.add(rotor, ammo);
}

/**
 * No CC0 grenade launcher fits either: the short pump shotgun gets a fat olive tube over its barrel and a revolving
 * six-round drum in front of the grip, so it reads as a launcher in the hand and the shop.
 */
function dressLauncher(gun: THREE.Object3D): void {
  const L = HERO_LOOK.launcherDress;
  const olive = new THREE.MeshStandardMaterial({ color: L.color, roughness: 0.7, metalness: 0.1 });
  const dark = new THREE.MeshStandardMaterial({ color: L.dark, roughness: 0.55, metalness: 0.35 });
  const T = L.tube;
  const tubeGeo = new THREE.CylinderGeometry(T.radius, T.radius, T.to - T.from, 14);
  tubeGeo.rotateZ(Math.PI / 2);
  const tube = new THREE.Mesh(tubeGeo, olive);
  tube.position.set((T.from + T.to) / 2, T.y, 0);
  const D = L.drum;
  const drumGeo = new THREE.CylinderGeometry(D.radius, D.radius, D.length, 6);
  drumGeo.rotateZ(Math.PI / 2);
  const drum = new THREE.Mesh(drumGeo, dark);
  drum.position.set(D.at, D.y, 0);
  gun.add(tube, drum);
}

/**
 * No CC0 machine gun fits, so the machine gun is Quaternius' carry-handle rifle with a big drum magazine added here
 * (in the gun's own units), so it reads heavier than the assault rifle in the hand and in its shop picture
 * (`renderGunIcons` draws the same node).
 */
function dressMachineGun(gun: THREE.Object3D): void {
  const L = HERO_LOOK.mgDress;
  const metal = new THREE.MeshStandardMaterial({ color: L.color, roughness: 0.55, metalness: 0.35 });
  const drumGeo = new THREE.CylinderGeometry(L.drum.radius, L.drum.radius, L.drum.width, 18);
  drumGeo.rotateX(Math.PI / 2);
  const drum = new THREE.Mesh(drumGeo, metal);
  drum.position.set(...L.drum.at);
  gun.add(drum);
}

/** Bones the legs' clips drive; the rest (spine, chest, arms, head) follow the aim and reload clips. */
const LOWER = /^(root|hips|upperleg|lowerleg|foot|toes|knee|heel|IK-|control-)/;

const tmpQ = new THREE.Quaternion();
const tmpP = new THREE.Quaternion();
const tmpH = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const AXIS_UP = new THREE.Vector3(0, 1, 0);

type Loco = 'idle' | 'run' | 'back' | 'left' | 'right';

/**
 * The hero's body (M7): KayKit's hooded rogue in an orange hoodie, his gun in the right hand.
 * - Legs: idle, running, walking backwards and strafing, blended by which way he moves against where he faces.
 * - Body: the one-handed aim pose all the time (a gun is always ready), bent at the spine and chest toward the
 *   crosshair's pitch; a reload and a grenade throw play over it. Every gun is held one-handed, arm out to the right:
 *   the two-handed pose holds the gun in front of the face, where the hood hides it from the camera behind him.
 * - Knocked out: he falls (Death_A) and gets up again (Lie_StandUp).
 * The gun is placed so it points where he faces in the aim pose, whatever the hand bone's own axes.
 */
export class HeroModel {
  readonly root = new THREE.Group();
  readonly materials: THREE.Material[] = [];
  private readonly mixer: THREE.AnimationMixer;
  private readonly loco: Record<Loco, THREE.AnimationAction>;
  private readonly aim: THREE.AnimationAction;
  private readonly reloadAction: THREE.AnimationAction;
  private readonly throwAction: THREE.AnimationAction;
  private readonly cheerAction: THREE.AnimationAction;
  private readonly fall: THREE.AnimationAction;
  private readonly rise: THREE.AnimationAction;
  private readonly hips: THREE.Object3D | null;
  private readonly spine: THREE.Object3D | null;
  private readonly chest: THREE.Object3D | null;
  private readonly upperArm: THREE.Object3D | null;
  private readonly slot: THREE.Object3D;
  /** The hips' turn against the root in the standing aim pose: the strafe clips turn the hips from it. */
  private readonly hipsRest = new THREE.Quaternion();
  /** The bent bones' rest poses: a clip may not key them, so each frame's bend starts again from here. */
  private readonly rest = new Map<THREE.Object3D, THREE.Quaternion>();
  private readonly guns = new Map<HeroGun, THREE.Object3D>();
  /** Each gun's length along its barrel (+X), in its own node's units (its parts may carry their own scale). */
  private readonly gunLengths = new Map<HeroGun, number>();
  /** Points in each gun's own space: the muzzle and the ejection port. */
  readonly muzzle = new THREE.Object3D();
  readonly port = new THREE.Object3D();
  private gunId: HeroGun = 'pistol';
  /** How fast the minigun's barrels turn (0–1), and the rotor that turns. */
  private spin = 0;
  private rotor: THREE.Object3D | null = null;
  private downState: 'up' | 'down' | 'rising' = 'up';
  private reloadLeft = 0;
  /** Seconds left of a throw or a cheer (the aim pose steps back meanwhile). */
  private gestureLeft = 0;
  /** At ease (the ending, M10): no aiming stance, the gun down, the clips as they are. */
  relaxed = false;
  private pitch = 0;
  private yawOffset = 0;
  private kick = 0;

  constructor(assets: HeroAssets) {
    const model = assets.scene;
    // The models face +Z; the hero faces −Z at yaw 0.
    model.rotation.y = Math.PI;
    model.scale.setScalar(HERO_LOOK.height / HERO_LOOK.modelHeight);
    const lamberts = new Map<THREE.Material, THREE.Material>();
    model.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as THREE.MeshStandardMaterial;
      let mat = lamberts.get(src);
      if (!mat) {
        // The rogue's green cloth becomes an orange hoodie (GDD §18.1); transparent from the start so fading never
        // recompiles a shader mid-play.
        const { cloth } = HERO_LOOK;
        const map = src.map ? recolour(src.map, cloth.from, cloth.to, cloth.hue, { saturation: cloth.saturation, light: cloth.light }) : null;
        mat = new THREE.MeshLambertMaterial({ map, transparent: true });
        lamberts.set(src, mat);
        this.materials.push(mat);
      }
      mesh.material = mat;
      mesh.castShadow = true;
      mesh.layers.enable(SHADOW_LAYER);
      mesh.frustumCulled = false;
    });
    this.root.add(model);
    const bone = (name: string): THREE.Object3D | null => model.getObjectByName(name) ?? null;
    this.hips = bone('hips');
    this.spine = bone('spine');
    this.chest = bone('chest');
    this.upperArm = bone('upperarmr');
    this.slot = bone('handslotr') ?? model;
    for (const b of [this.spine, this.chest, this.upperArm]) if (b) this.rest.set(b, b.quaternion.clone());

    this.mixer = new THREE.AnimationMixer(model);
    const clip = (name: string, part: 'lower' | 'upper' | 'all'): THREE.AnimationClip => {
      const src = assets.clips.find((c) => c.name === name);
      if (!src) throw new Error(`Hero clip ${name} missing`);
      if (part === 'all') return src;
      const tracks = src.tracks.filter((t) => LOWER.test(t.name.split('.')[0]!) === (part === 'lower'));
      return new THREE.AnimationClip(`${name}:${part}`, src.duration, tracks);
    };
    const play = (name: string, part: 'lower' | 'upper' | 'all', loop = true): THREE.AnimationAction => {
      const a = this.mixer.clipAction(clip(name, part));
      if (!loop) {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      return a;
    };
    this.loco = {
      idle: play('Idle', 'lower'),
      run: play('Running_A', 'lower'),
      back: play('Walking_Backwards', 'lower'),
      left: play('Running_Strafe_Left', 'lower'),
      right: play('Running_Strafe_Right', 'lower'),
    };
    for (const a of Object.values(this.loco)) a.play().setEffectiveWeight(0);
    this.loco.idle.setEffectiveWeight(1);
    this.aim = play('1H_Ranged_Aiming', 'upper');
    this.aim.play();
    this.reloadAction = play('1H_Ranged_Reload', 'upper', false);
    this.throwAction = play('Throw', 'upper', false);
    this.cheerAction = play('Cheer', 'upper', false);
    this.fall = play('Death_A', 'all', false);
    this.rise = play('Lie_StandUp', 'all', false);

    for (const [id, node] of assets.guns) {
      const gun = node.clone(true);
      gun.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const color = (mesh.material as THREE.MeshStandardMaterial).color.clone();
        const hsl = color.getHSL({ h: 0, s: 0, l: 0 });
        if (hsl.l < HERO_LOOK.gunFloor) color.setHSL(hsl.h, hsl.s, HERO_LOOK.gunFloor);
        const mat = new THREE.MeshLambertMaterial({ color, transparent: true });
        this.materials.push(mat);
        mesh.material = mat;
        mesh.castShadow = true;
        mesh.layers.enable(SHADOW_LAYER);
      });
      gun.visible = false;
      gun.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(gun, true);
      this.gunLengths.set(id, Math.max(1e-3, box.max.x - box.min.x));
      // Its ★3 and ★5 looks, hidden until its stars reach them (measured after its length, so it fits the same).
      for (const part of dressStars(gun, id, box)) this.materials.push(...part);
      this.guns.set(id, gun);
      this.slot.add(gun);
    }
    this.setGun('pistol');
  }

  /** Holds a gun: its model in the hand. */
  /** The minigun's barrels: 0 still, 1 at full spin (`Gun.spin`). */
  setSpin(spin: number): void {
    this.spin = spin;
  }

  setGun(id: HeroGun, level = 1): void {
    this.gunId = id;
    const held = this.guns.get(id);
    const star3 = held?.getObjectByName('star3');
    const star5 = held?.getObjectByName('star5');
    if (star3) star3.visible = level >= 3;
    if (star5) star5.visible = level >= 5;
    this.rotor = this.guns.get(id)?.getObjectByName('rotor') ?? null;
    const look = HERO_LOOK.guns[id];
    for (const [gid, gun] of this.guns) gun.visible = gid === id;
    const gun = this.guns.get(id);
    if (!gun) return;
    gun.add(this.muzzle, this.port);
    this.muzzle.position.fromArray(look.muzzle);
    this.port.position.fromArray(look.port);
    this.fitGun(gun, look.length, look.grip, this.gunLengths.get(id) ?? 1);
  }

  /**
   * Places the gun in the hand bone so that, in the aim pose, it points where the hero faces with its top up, at
   * `length` metres long, its grip (in its own space) on the palm.
   */
  private fitGun(gun: THREE.Object3D, length: number, grip: readonly [number, number, number], ownLength: number): void {
    this.mixer.stopAllAction();
    this.aim.play().setEffectiveWeight(1);
    this.loco.idle.play().setEffectiveWeight(1);
    this.mixer.update(0);
    this.root.updateMatrixWorld(true);
    // The hero's forward and up in the world: −Z and +Y of his root group.
    const rootQ = this.root.getWorldQuaternion(new THREE.Quaternion());
    if (this.hips) this.hipsRest.copy(rootQ).invert().multiply(this.hips.getWorldQuaternion(tmpP));
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(rootQ);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(rootQ);
    const side = new THREE.Vector3().crossVectors(forward, up);
    // The gun's +X is its barrel, +Y its top: the world rotation that puts them on forward and up.
    const want = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(forward, up, side));
    const slotQ = this.slot.getWorldQuaternion(new THREE.Quaternion());
    gun.quaternion.copy(slotQ.invert().multiply(want));
    const slotScale = this.slot.getWorldScale(new THREE.Vector3()).x;
    const s = length / (ownLength * slotScale);
    gun.scale.setScalar(s);
    // The grip on the palm: shift by the grip point, turned and scaled into the bone's space.
    tmpV.fromArray(grip).multiplyScalar(-s).applyQuaternion(gun.quaternion);
    gun.position.copy(tmpV);
    // Back to the playing set.
    this.restart();
  }

  private restart(): void {
    for (const a of Object.values(this.loco)) a.play();
    this.aim.play().setEffectiveWeight(1);
  }

  /** Knocked out (falls) or up again (gets up). */
  setDown(down: boolean): void {
    if (down && this.downState !== 'down') {
      this.downState = 'down';
      this.rise.stop();
      this.fall.reset().play();
      this.fall.setEffectiveWeight(1);
    } else if (!down && this.downState === 'down') {
      this.downState = 'rising';
      this.fall.stop();
      this.rise.reset().play();
      this.rise.setEffectiveWeight(1);
    }
  }

  /** A reload over `seconds`: the clip is stretched to fit. */
  reload(seconds: number): void {
    const a = this.reloadAction;
    a.reset().play();
    a.timeScale = a.getClip().duration / Math.max(0.3, seconds);
    this.reloadLeft = seconds;
  }

  /** A grenade throw. */
  throw(): void {
    this.gesture(this.throwAction, 1.6);
  }

  /** A cheer (the battle is won). */
  cheer(): void {
    this.gesture(this.cheerAction, 1);
  }

  private gesture(action: THREE.AnimationAction, timeScale: number): void {
    for (const a of [this.throwAction, this.cheerAction]) if (a !== action) a.stop();
    action.reset().play();
    action.timeScale = timeScale;
    this.gestureLeft = action.getClip().duration / timeScale;
  }

  /** A shot's kick: the arm and chest snap back a touch. */
  fire(): void {
    this.kick = 1;
  }

  /**
   * One frame. `moveX`/`moveZ`: velocity in the hero's own frame (right, forward), m/s; `speed` his top speed.
   * `pitch` and `yaw`: where the crosshair is, against his facing (radians).
   */
  update(dt: number, right: number, forward: number, top: number, pitch: number, yaw: number): void {
    if (this.rotor && this.spin > 0) this.rotor.rotation.x += this.spin * HERO_LOOK.minigunDress.spin * dt;
    const speed = Math.hypot(right, forward);
    const moving = Math.min(1, speed / Math.max(0.5, top * 0.35));
    const w: Record<Loco, number> = { idle: 1 - moving, run: 0, back: 0, left: 0, right: 0 };
    if (speed > 0.05) {
      const f = forward / speed;
      const r = right / speed;
      w.run = Math.max(0, f) * moving;
      w.back = Math.max(0, -f) * moving;
      w.right = Math.max(0, r) * moving;
      w.left = Math.max(0, -r) * moving;
      const sum = w.run + w.back + w.left + w.right || 1;
      for (const k of ['run', 'back', 'left', 'right'] as const) w[k] = (w[k] / sum) * moving;
    }
    const fallen = this.downState !== 'up';
    for (const k of Object.keys(this.loco) as Loco[]) {
      const a = this.loco[k];
      a.setEffectiveWeight(fallen ? 0 : w[k]);
      // The legs keep pace with the ground (the run clip covers about 4 m/s at the hero's size).
      a.timeScale = k === 'idle' ? 1 : Math.max(0.6, Math.min(1.5, speed / (k === 'back' ? 1.8 : HERO_LOOK.runSpeed)));
    }
    this.reloadLeft = Math.max(0, this.reloadLeft - dt);
    this.gestureLeft = Math.max(0, this.gestureLeft - dt);
    const busy = this.reloadLeft > 0 || this.gestureLeft > 0;
    this.aim.setEffectiveWeight(fallen || this.relaxed ? 0 : busy ? 0.15 : 1);
    if (this.reloadLeft <= 0) this.reloadAction.stop();
    if (this.gestureLeft <= 0) {
      this.throwAction.stop();
      this.cheerAction.stop();
    }
    if (this.downState === 'rising' && !this.rise.isRunning()) {
      this.downState = 'up';
      this.rise.stop();
    }
    // Clips that don't key the bent bones would leave last frame's bend on them: start from rest.
    for (const [b, q] of this.rest) b.quaternion.copy(q);
    this.mixer.update(dt);
    // Aim: bend at the spine and chest toward the crosshair, and a small twist; a shot kicks the arm up and back.
    this.kick = Math.max(0, this.kick - dt * 9);
    this.pitch += (pitch - this.pitch) * Math.min(1, dt * 18);
    this.yawOffset += (yaw - this.yawOffset) * Math.min(1, dt * 18);
    if (fallen || busy || this.relaxed) return;
    this.root.updateMatrixWorld(true);
    const rootQ = this.root.getWorldQuaternion(tmpQ);
    const rightAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(rootQ);
    const bend = Math.max(-1.1, Math.min(1.1, this.pitch));
    this.rotateWorld(this.spine, rightAxis, bend * 0.45);
    this.rotateWorld(this.chest, rightAxis, bend * 0.55 + this.kick * 0.06);
    // The strafe clips turn the hips sideways: the spine turns back so the chest and gun stay on the crosshair.
    this.rotateWorld(this.spine, AXIS_UP, Math.max(-0.5, Math.min(0.5, this.yawOffset)) * 0.6 - this.hipYaw(rootQ));
    this.rotateWorld(this.upperArm, rightAxis, this.kick * 0.12);
  }

  /** How far the clips have turned the hips from the standing pose, about the up axis (radians, + to his left). */
  private hipYaw(rootQ: THREE.Quaternion): number {
    if (!this.hips) return 0;
    // hips against the root, then against their standing turn: what's left is the clip's own turn.
    const turn = tmpP.copy(rootQ).invert().multiply(this.hips.getWorldQuaternion(tmpH)).multiply(tmpH.copy(this.hipsRest).invert());
    const f = tmpV.set(0, 0, -1).applyQuaternion(turn);
    return Math.atan2(-f.x, -f.z);
  }

  /** Turns a bone by `angle` about a world axis through its own pivot, after the clips have posed it. */
  private rotateWorld(bone: THREE.Object3D | null, axis: THREE.Vector3, angle: number): void {
    if (!bone || !bone.parent || Math.abs(angle) < 1e-4) return;
    bone.parent.updateMatrixWorld(true);
    const parentQ = bone.parent.getWorldQuaternion(tmpP);
    const turn = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    // local' = parent⁻¹ · turn · parent · local
    const inv = parentQ.clone().invert();
    bone.quaternion.premultiply(inv.multiply(turn).multiply(parentQ));
    bone.updateMatrixWorld(true);
  }

  get gun(): HeroGun {
    return this.gunId;
  }
}
