import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ESCAPE } from '@/content/ending';
import { HORSE } from '@/content/soldiers';
import { mergeStatic } from '@/render/mergeStatic';
import { SHADOW_LAYER } from '@/render/stage';

/** The donkey is the riders' horse (already downloaded for the knights), shrunk and repainted. */
export async function loadDonkey(): Promise<{ scene: THREE.Group; clips: THREE.AnimationClip[] }> {
  const gltf = await new GLTFLoader().loadAsync(`assets/soldiers/${HORSE.file}`);
  return { scene: gltf.scene, clips: gltf.animations };
}

const tmp = new THREE.Vector3();
const ease = (u: number): number => u * u * (3 - 2 * u);
/** Yaw (0 = facing −Z) toward a direction on the ground. */
const yawOf = (dx: number, dz: number): number => Math.atan2(-dx, -dz);

/**
 * The Iron Baron's comedy exit (M10, `ESCAPE`): when the Iron Ox falls, a little grey donkey trots up behind it, the
 * Baron pops out of his turret, hops into the saddle and gallops away from the banner shaking his fist, his cape
 * flapping, a puff of dust at every few strides, until he shrinks out of sight.
 */
export class DonkeyEscape {
  readonly group = new THREE.Group();
  private readonly donkey = new THREE.Group();
  private readonly baron = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly cape = new THREE.Group();
  private readonly fist = new THREE.Group();
  private readonly mixer: THREE.AnimationMixer;
  private readonly gallop: THREE.AnimationAction;
  private readonly idle: THREE.AnimationAction;
  private readonly ears: THREE.Object3D[] = [];
  private readonly back: THREE.Object3D | null = null;
  /** The saddle's height above the back bone, metres. */
  private readonly seatUp: number;
  private t = -1;
  private dust = 0;
  private readonly from = new THREE.Vector3();
  private readonly wait = new THREE.Vector3();
  private readonly turret = new THREE.Vector3();
  private awayX = 0;
  private awayZ = -1;
  private comeYaw = 0;
  /** Seconds of gallop: the full run, or less if the field's edge comes first. */
  private runFor = 0;

  constructor(assets: { scene: THREE.Group; clips: THREE.AnimationClip[] }) {
    const D = ESCAPE.donkey;
    const model = assets.scene;
    const box = new THREE.Box3().setFromObject(model, true);
    const s = D.height / Math.max(1e-3, box.max.y - box.min.y);
    model.scale.set(s * D.shape[0], s * D.shape[1], s * D.shape[2]);
    // The horse faces +Z; the donkey's yaw 0 faces −Z, like everything else.
    model.rotation.y = Math.PI;
    const paints = new Map<THREE.Material, THREE.Material>();
    let back: THREE.Object3D | null = null;
    model.traverse((o) => {
      if (/^Ear1/.test(o.name)) this.ears.push(o);
      if (o.name === 'Back') back = o;
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      const repaint = (m: THREE.Material): THREE.Material => {
        let p = paints.get(m);
        if (!p) {
          const src = m as THREE.MeshStandardMaterial;
          p = new THREE.MeshLambertMaterial({ color: D.paint[src.name] ?? src.color.getHex() });
          paints.set(m, p);
        }
        return p;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(repaint) : repaint(mesh.material);
      mesh.castShadow = true;
      mesh.layers.enable(SHADOW_LAYER);
      mesh.frustumCulled = false;
    });
    this.back = back;
    this.donkey.add(model);
    this.group.add(this.donkey);
    // The saddle sits a little above the back bone at rest: measured once from the model.
    model.updateMatrixWorld(true);
    const backY = back ? (back as THREE.Object3D).getWorldPosition(tmp).y : D.height * 0.5;
    this.seatUp = Math.max(0, D.height * 0.6 - backY);
    this.mixer = new THREE.AnimationMixer(model);
    const clip = (name: string): THREE.AnimationClip => {
      const c = assets.clips.find((k) => k.name === name);
      if (!c) throw new Error(`Donkey clip ${name} missing`);
      return c;
    };
    this.gallop = this.mixer.clipAction(clip(HORSE.clips.run));
    this.idle = this.mixer.clipAction(clip(HORSE.clips.idle));
    this.buildBaron();
    this.group.add(this.baron);
    this.group.visible = false;
  }

  /** The Baron: built like his turret self, charcoal armour, a red cape, his crown, a fist to shake. */
  private buildBaron(): void {
    const B = ESCAPE.baron;
    const mat = (color: number): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ color });
    const dark = mat(B.dark);
    const cloth = mat(B.cloth);
    const skin = mat(B.skin);
    const gold = new THREE.MeshLambertMaterial({ color: B.gold, emissive: 0x3a2600 });
    const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.layers.enable(SHADOW_LAYER);
      parent.add(mesh);
      return mesh;
    };
    // His origin is the seat; he faces −Z.
    for (const side of [-1, 1]) {
      const leg = add(this.baron, new THREE.BoxGeometry(0.15, 0.4, 0.17), dark, side * 0.24, -0.14, -0.06);
      leg.rotation.z = side * 0.25;
    }
    add(this.baron, new THREE.BoxGeometry(0.48, 0.5, 0.34), dark, 0, 0.27, 0);
    const belly = add(this.baron, new THREE.SphereGeometry(0.23, 12, 8), dark, 0, 0.2, -0.1);
    belly.scale.set(1, 0.9, 0.85);
    // His head turns to look back at the banner as he flees.
    this.head.position.set(0, 0.68, 0);
    this.baron.add(this.head);
    add(this.head, new THREE.SphereGeometry(0.18, 12, 9), skin, 0, 0, 0);
    add(this.head, new THREE.BoxGeometry(0.26, 0.05, 0.06), mat(B.tash), 0, -0.06, -0.16);
    const band = add(this.head, new THREE.CylinderGeometry(0.14, 0.15, 0.1, 10, 1, true), gold, 0, 0.17, 0);
    (band.material as THREE.MeshLambertMaterial).side = THREE.DoubleSide;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      add(this.head, new THREE.ConeGeometry(0.035, 0.08, 5), gold, Math.sin(a) * 0.14, 0.26, Math.cos(a) * 0.14);
    }
    // The cape hangs from his shoulders and blows back as he gallops.
    this.cape.position.set(0, 0.5, 0.18);
    this.baron.add(this.cape);
    add(this.cape, new THREE.BoxGeometry(0.52, 0.66, 0.04), cloth, 0, -0.33, 0);
    // The right arm shakes a fist overhead; the left holds the reins.
    this.fist.position.set(0.29, 0.46, 0);
    this.baron.add(this.fist);
    add(this.fist, new THREE.BoxGeometry(0.12, 0.38, 0.12), dark, 0, 0.19, 0);
    add(this.fist, new THREE.SphereGeometry(0.08, 8, 6), dark, 0, 0.4, 0);
    const rein = new THREE.Group();
    rein.position.set(-0.29, 0.46, 0);
    rein.rotation.x = 1.05;
    this.baron.add(rein);
    add(rein, new THREE.BoxGeometry(0.12, 0.36, 0.12), dark, 0, -0.18, 0);
    // His fixed armour in one draw per colour; the head, cape and fist move on their own.
    mergeStatic(this.baron, [this.head, this.cape, this.fist]);
    mergeStatic(this.head);
    mergeStatic(this.fist);
    this.baron.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.layers.enable(SHADOW_LAYER);
    });
  }

  get active(): boolean {
    return this.t >= 0;
  }

  /**
   * Starts the escape from the fallen Ox: `ox` is where it lies, `turret` where the Baron sits in it, `away` the way
   * from the banner past the Ox (he flees that way), `half` the field's half-size (he's gone before its hedge).
   */
  begin(ox: THREE.Vector3, turret: THREE.Vector3, awayX: number, awayZ: number, heightAt: (x: number, z: number) => number, half: number): void {
    const len = Math.hypot(awayX, awayZ) || 1;
    this.awayX = awayX / len;
    this.awayZ = awayZ / len;
    // Right of the way out, so the donkey comes up beside the Ox rather than through it.
    const rx = -this.awayZ;
    const rz = this.awayX;
    const F = ESCAPE.from;
    this.from.set(ox.x + this.awayX * F.back + rx * F.side, 0, ox.z + this.awayZ * F.back + rz * F.side);
    this.from.y = heightAt(this.from.x, this.from.z);
    this.wait.set(ox.x + rx * F.side, 0, ox.z + rz * F.side);
    this.wait.y = heightAt(this.wait.x, this.wait.z);
    this.turret.copy(turret);
    // How far he can run before the hedge: to the first side of the square he'd cross.
    const edge = half - ESCAPE.edge;
    const reach = (from: number, dir: number): number => (dir > 1e-3 ? (edge - from) / dir : dir < -1e-3 ? (-edge - from) / dir : Infinity);
    const room = Math.max(0, Math.min(reach(this.wait.x, this.awayX), reach(this.wait.z, this.awayZ)));
    this.runFor = Math.max(ESCAPE.gallop.least, Math.min(ESCAPE.gallop.seconds, room / ESCAPE.gallop.speed));
    this.comeYaw = yawOf(this.wait.x - this.from.x, this.wait.z - this.from.z);
    this.t = 0;
    this.dust = 0;
    this.group.visible = true;
    this.group.scale.setScalar(1);
    this.gallop.reset().play();
    this.gallop.timeScale = ESCAPE.gallop.rate;
    this.idle.stop();
  }

  /** Cut short (a new battle, the map). */
  stop(): void {
    this.t = -1;
    this.group.visible = false;
  }

  /** Steps the escape; `puff` is called with a spot at the hooves for a cloud of dust. */
  update(dt: number, heightAt: (x: number, z: number) => number, puff: (at: THREE.Vector3) => void): void {
    if (this.t < 0) return;
    const E = ESCAPE;
    this.t += dt;
    const t = this.t;
    const hopAt = E.trot;
    const runAt = E.trot + E.hop;
    const endAt = runAt + this.runFor;
    const pos = this.donkey.position;
    let yaw: number;
    if (t < hopAt) {
      // Trotting up beside the Ox.
      const u = ease(t / E.trot);
      pos.lerpVectors(this.from, this.wait, u);
      yaw = this.comeYaw;
    } else if (t < runAt) {
      // Waiting while he hops on, turning round to face the way out.
      pos.copy(this.wait);
      const u = ease((t - hopAt) / E.hop);
      const out = yawOf(this.awayX, this.awayZ);
      yaw = this.comeYaw + Math.atan2(Math.sin(out - this.comeYaw), Math.cos(out - this.comeYaw)) * u;
      if (!this.idle.isRunning()) {
        this.idle.reset().fadeIn(0.15).play();
        this.gallop.fadeOut(0.15);
      }
    } else {
      // Off he goes.
      const run = t - runAt;
      pos.set(this.wait.x + this.awayX * E.gallop.speed * run, 0, this.wait.z + this.awayZ * E.gallop.speed * run);
      pos.y = heightAt(pos.x, pos.z);
      yaw = yawOf(this.awayX, this.awayZ);
      if (this.idle.isRunning() && run < 0.2) {
        this.gallop.reset().fadeIn(0.12).play();
        this.idle.fadeOut(0.12);
      }
      this.dust -= dt;
      if (this.dust <= 0) {
        this.dust = E.gallop.dust;
        puff(tmp.set(pos.x, pos.y + 0.1, pos.z));
      }
    }
    if (t < hopAt) pos.y = heightAt(pos.x, pos.z);
    this.donkey.rotation.y = yaw;
    this.mixer.update(dt);
    // Long ears: stretched after the clip has posed them (no clip scales them, but it keeps them so).
    for (const ear of this.ears) ear.scale.y = E.donkey.ears;
    // The seat: on the donkey's back as it moves, or in his turret, or in the air between.
    const seat = tmp;
    if (this.back) {
      // In the group's own space: it shrinks at the end.
      this.group.worldToLocal(this.back.getWorldPosition(seat));
      seat.y += this.seatUp;
    } else seat.set(pos.x, pos.y + E.donkey.height * 0.6, pos.z);
    // The back bone sits over the hips: the saddle is a little ahead of it.
    seat.x -= Math.sin(yaw) * E.donkey.seatForward;
    seat.z -= Math.cos(yaw) * E.donkey.seatForward;
    const b = this.baron;
    const time = this.t;
    if (t < hopAt) {
      // He pops up in his turret, shaking his fist at the hero.
      b.position.copy(this.turret);
      b.position.y += Math.min(1, t / 0.4) * 0.3;
      b.rotation.set(0, yawOf(-this.awayX, -this.awayZ), 0);
    } else if (t < runAt) {
      const u = (t - hopAt) / E.hop;
      b.position.lerpVectors(this.turret, seat, ease(u));
      b.position.y += Math.sin(u * Math.PI) * E.hopHeight;
      b.rotation.set(Math.sin(u * Math.PI) * 0.5, yaw, 0);
    } else {
      b.position.copy(seat);
      b.rotation.set(0, yaw, 0);
    }
    // He looks back at the banner while he runs, and shakes his fist all the while.
    const looking = t > runAt + 0.6 && Math.sin((t - runAt) * 1.3) > -0.2;
    this.head.rotation.y = THREE.MathUtils.damp(this.head.rotation.y, looking ? 2.4 : 0, 6, dt);
    this.fist.rotation.z = -0.25 + Math.sin(time * 15) * 0.32;
    // Negative tips its hem back (+Z, behind him).
    this.cape.rotation.x = t >= runAt ? -0.6 - Math.sin(time * 13) * 0.18 : -0.05 - Math.sin(time * 3) * 0.04;
    // The end: he shrinks out of sight in a last puff.
    if (t > endAt) {
      const u = Math.min(1, (t - endAt) / E.fade);
      this.group.scale.setScalar(1 - ease(u));
      this.group.position.set(pos.x * ease(u), pos.y * ease(u), pos.z * ease(u));
      if (u >= 1) {
        puff(tmp.set(pos.x, pos.y + 0.3, pos.z));
        this.stop();
      }
    } else {
      this.group.position.set(0, 0, 0);
    }
  }
}
