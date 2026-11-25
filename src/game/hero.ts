import * as THREE from 'three';
import { angleDelta, damp } from '@/core/math';
import { Spring } from '@/core/spring';
import type { GunId } from '@/content/guns';
import { heroGunFor } from '@/content/heroLook';
import { HERO } from '@/content/tuning';
import { SHADOW_LAYER } from '@/render/stage';
import type { Field } from '@/world/field';
import { HeroModel, type HeroAssets } from './heroModel';

/** The right shoulder, in the hero's own space (metres; −Z is forward). */
const SHOULDER = new THREE.Vector3(0.3, 1.38, 0);
/** The muzzle, in the arm's space: the arm points down its −Z. */
const MUZZLE = new THREE.Vector3(0, 0.07, -0.86);
/** Where casings leave the gun, in the arm's space. */
const PORT = new THREE.Vector3(0.03, 0.08, -0.6);

const tmp = new THREE.Vector3();
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();

/** The crosshair is measured from about chest height, for the body's aim. */
const CHEST = 1.35;

/**
 * The stranger the locals call the Thunder Knight (GDD §2, §7): KayKit's hooded rogue in an orange hoodie with his gun
 * in the right hand (`HeroModel`, M7), or a capsule in the same colours until the model has loaded.
 * - Moves relative to the camera's facing, and turns to face where the camera looks, as over-the-shoulder heroes do.
 * - The gun arm points at whatever the crosshair is on, so tracers leave the muzzle toward it.
 * - Fades when the camera comes close (GDD §5.1).
 */
export class Hero {
  readonly group = new THREE.Group();
  readonly position = new THREE.Vector3();
  /** Facing, radians around Y (0 looks down −Z). */
  yaw = 0;
  private readonly velocity = new THREE.Vector3();
  private readonly body: THREE.Group;
  private readonly arm = new THREE.Group();
  private readonly flash: THREE.Mesh;
  private flashTime = 0;
  private readonly recoil = new Spring(260, 20);
  private readonly materials: THREE.Material[] = [];
  private opacity = 1;
  private bob = 0;
  /** 0 standing to 1 lying (knocked out, GDD §4.6). */
  private down = 0;
  private wantDown = false;
  private model: HeroModel | null = null;
  /** Where the crosshair is against his facing: pitch and yaw (radians), for the body's aim. */
  private aimPitch = 0;
  private aimYaw = 0;

  constructor(private readonly field: Field) {
    this.body = new THREE.Group();
    const hoodie = this.material(0xf07d2a);
    const trousers = this.material(0x5b5f4a);
    const skin = this.material(0xe0b48f);
    const cap = this.material(0x262a31);
    const steel = this.material(0x3a3f47);
    const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.55, 4, 10), trousers);
    legs.position.y = 0.55;
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.45, 4, 12), hoodie);
    torso.position.y = 1.15;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), skin);
    head.position.y = 1.62;
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.22), cap);
    brim.position.set(0, 1.74, -0.2);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), cap);
    crown.position.y = 1.68;
    // The gun arm: sleeve, hand and a chunky pistol, all pointing down the arm's −Z.
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.36, 4, 8), hoodie);
    sleeve.rotation.x = Math.PI / 2;
    sleeve.position.z = -0.24;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), skin);
    hand.position.set(0, -0.01, -0.5);
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.3), steel);
    slide.position.set(0, 0.07, -0.68);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, 0.07), steel);
    grip.position.set(0, -0.01, -0.56);
    grip.rotation.x = -0.25;
    this.arm.add(sleeve, hand, slide, grip);
    this.arm.position.copy(SHOULDER);
    // A small four-pointed flash at the muzzle, shown for a few frames per shot.
    this.flash = new THREE.Mesh(
      flashGeometry(),
      // Plain blending in a warm yellow: an additive flash turns white against a bright sky.
      new THREE.MeshBasicMaterial({
        color: 0xffc14d,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    );
    this.flash.position.copy(MUZZLE);
    this.flash.visible = false;
    this.arm.add(this.flash);
    const parts = [legs, torso, head, brim, crown, sleeve, hand, slide, grip];
    for (const p of parts) {
      p.castShadow = true;
      p.layers.enable(SHADOW_LAYER);
    }
    this.body.add(legs, torso, head, brim, crown, this.arm);
    this.group.add(this.body);
  }

  /** Swaps the capsule for the animated model (once its files have loaded). */
  setModel(assets: HeroAssets): void {
    const model = new HeroModel(assets);
    this.model = model;
    this.body.visible = false;
    this.group.add(model.root);
    this.materials.push(...model.materials);
    // The flash moves to the real gun's muzzle (its −Z turned down the barrel, the gun's +X).
    this.arm.remove(this.flash);
    model.muzzle.add(this.flash);
    this.flash.position.set(0, 0, 0);
    this.flash.rotation.set(0, -Math.PI / 2, 0);
  }

  /** Holds a gun (its model and its one- or two-handed pose). */
  /** The minigun's barrels spinning (0–1). */
  setGunSpin(spin: number): void {
    this.model?.setSpin(spin);
  }

  /** Takes a gun in hand, its look by its stars (★3, ★5). */
  setGun(gun: GunId, level = 1): void {
    this.model?.setGun(heroGunFor(gun), level);
  }

  /** A reload lasting `seconds` (the body plays it). */
  reload(seconds: number): void {
    this.model?.reload(seconds);
  }

  /** A grenade leaves his hand. */
  throwGrenade(): void {
    this.model?.throw();
  }

  /** The battle is won. */
  cheer(): void {
    this.model?.cheer();
  }

  /** At ease (the ending, M10): out of his aiming stance, so he doesn't point the gun at anyone. */
  relax(on: boolean): void {
    if (this.model) this.model.relaxed = on;
  }

  private material(color: number): THREE.MeshLambertMaterial {
    // Transparent from the start (at full opacity), so fading never recompiles a shader mid-play.
    const m = new THREE.MeshLambertMaterial({ color, transparent: true });
    this.materials.push(m);
    return m;
  }

  place(x: number, z: number, yaw: number): void {
    this.position.set(x, this.field.heightAt(x, z), z);
    this.yaw = yaw;
    this.velocity.set(0, 0, 0);
    this.sync();
  }

  /**
   * One frame of movement. `moveX`/`moveY` are the stick or keys (right, forward), relative to `viewYaw`, the
   * camera's facing. The hero turns toward the camera's facing so the gun points where the crosshair is.
   */
  update(dt: number, moveX: number, moveY: number, viewYaw: number, speed: number = HERO.speed): void {
    const sin = Math.sin(viewYaw);
    const cos = Math.cos(viewYaw);
    // Forward is −Z at yaw 0; right is +X.
    const wantX = (moveX * cos - moveY * sin) * speed;
    const wantZ = (-moveX * sin - moveY * cos) * speed;
    const rate = 1 / HERO.accelTime;
    this.velocity.x = damp(this.velocity.x, wantX, rate, dt);
    this.velocity.z = damp(this.velocity.z, wantZ, rate, dt);
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.field.confine(this.position, HERO.radius);
    this.position.y = this.field.heightAt(this.position.x, this.position.z);
    const turn = angleDelta(this.yaw, viewYaw);
    this.yaw += turn * Math.min(1, HERO.turnRate * dt);
    if (this.model) {
      // Velocity in his own frame: right and forward (he faces −Z at yaw 0).
      const sinY = Math.sin(this.yaw);
      const cosY = Math.cos(this.yaw);
      const right = this.velocity.x * cosY - this.velocity.z * sinY;
      const forward = -this.velocity.x * sinY - this.velocity.z * cosY;
      this.sync();
      this.model.update(dt, right, forward, speed, this.aimPitch, this.aimYaw);
      if (this.flashTime > 0) {
        this.flashTime -= dt;
        if (this.flashTime <= 0) this.flash.visible = false;
      }
      return;
    }
    // A small bob in step, so walking reads even as a capsule.
    const moving = this.speed / Math.max(0.1, speed);
    this.bob += dt * 9 * moving;
    this.body.position.y = Math.abs(Math.sin(this.bob)) * 0.05 * Math.min(1, moving);
    this.sync();
    if (this.flashTime > 0) {
      this.flashTime -= dt;
      if (this.flashTime <= 0) this.flash.visible = false;
    }
    this.arm.position.z = SHOULDER.z + this.recoil.update(dt);
    this.down += ((this.wantDown ? 1 : 0) - this.down) * Math.min(1, dt * 7);
    // Tumble backward round the feet.
    this.body.rotation.x = this.down * 1.45;
  }

  /** Knocked out (tumbles over) or up again. */
  setDown(down: boolean): void {
    this.wantDown = down;
    if (!down) this.down = 0;
    this.model?.setDown(down);
  }

  /** Points the gun arm at a world point (what the crosshair is on). */
  aimAt(point: THREE.Vector3): void {
    // The body's aim: pitch and yaw of the point from his chest, against his facing.
    const dx = point.x - this.position.x;
    const dz = point.z - this.position.z;
    const flat = Math.hypot(dx, dz);
    if (flat > 0.5) {
      this.aimPitch = Math.atan2(point.y - (this.position.y + CHEST), flat);
      this.aimYaw = angleDelta(this.yaw, Math.atan2(-dx, -dz));
    }
    this.group.updateMatrixWorld();
    tmp.copy(point);
    this.body.worldToLocal(tmp);
    tmp.sub(SHOULDER);
    const yaw = Math.atan2(-tmp.x, -tmp.z);
    const pitch = Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z));
    // The wrist only bends so far; past that the body turn catches up.
    this.arm.rotation.set(Math.max(-1.1, Math.min(1.1, pitch)), Math.max(-0.7, Math.min(0.7, yaw)), 0, 'YXZ');
  }

  /** A shot: the flash shows and the arm kicks back a little. */
  fire(flashSize: number): void {
    this.flash.visible = true;
    // On the model the flash sits in the gun's (scaled) space: undo that scale so its size is in metres.
    const inGun = this.model ? 1 / Math.max(1e-4, this.model.muzzle.getWorldScale(tmp).x) : 1;
    this.flash.scale.setScalar((flashSize / 0.22) * (0.85 + Math.random() * 0.3) * inGun);
    this.model?.fire();
    this.flash.rotation.z = Math.random() * Math.PI;
    this.flashTime = 0.05;
    this.recoil.kick(1.4);
  }

  /** The muzzle in the world, for tracers. */
  muzzle(out: THREE.Vector3): THREE.Vector3 {
    if (this.model) {
      this.group.updateMatrixWorld(true);
      return this.model.muzzle.getWorldPosition(out);
    }
    this.arm.updateMatrixWorld();
    return out.copy(MUZZLE).applyMatrix4(this.arm.matrixWorld);
  }

  /** Where casings fly out, and the gun's right side in the world. */
  ejection(out: THREE.Vector3, right: THREE.Vector3): void {
    if (this.model) {
      this.group.updateMatrixWorld(true);
      this.model.port.getWorldPosition(out);
      // The gun's +Z is the hero's right in the aim pose.
      right.set(0, 0, 1).applyQuaternion(this.model.port.getWorldQuaternion(tmpQ));
      return;
    }
    this.arm.updateMatrixWorld();
    out.copy(PORT).applyMatrix4(this.arm.matrixWorld);
    tmpM.extractRotation(this.arm.matrixWorld);
    right.set(1, 0, 0).applyMatrix4(tmpM);
  }

  /** See-through when the camera is close, so the hero never blocks the view (GDD §5.1). */
  setOpacity(opacity: number): void {
    if (Math.abs(opacity - this.opacity) < 0.005) return;
    this.opacity = opacity;
    // Depth stays on, so a faded hero shows only its outside, not the inside of the cap and sleeves.
    for (const m of this.materials) m.opacity = opacity;
  }

  get speed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  private sync(): void {
    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
  }
}

/** Two crossed quads with a four-pointed star, facing down −Z, so the flash reads from behind and from the side. */
function flashGeometry(): THREE.BufferGeometry {
  const star = new THREE.Shape();
  const points = 8;
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r = i % 2 === 0 ? 0.22 : 0.07;
    if (i === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const face = new THREE.ShapeGeometry(star);
  const side = new THREE.ShapeGeometry(star);
  side.rotateY(Math.PI / 2);
  side.translate(0, 0, -0.08);
  face.translate(0, 0, -0.02);
  const merged = new THREE.BufferGeometry();
  const a = face.attributes.position!.array as Float32Array;
  const b = side.attributes.position!.array as Float32Array;
  const all = new Float32Array(a.length + b.length);
  all.set(a);
  all.set(b, a.length);
  merged.setAttribute('position', new THREE.BufferAttribute(all, 3));
  const ia = face.index ? Array.from(face.index.array) : [];
  const ib = side.index ? Array.from(side.index.array).map((i) => i + a.length / 3) : [];
  merged.setIndex([...ia, ...ib]);
  return merged;
}
