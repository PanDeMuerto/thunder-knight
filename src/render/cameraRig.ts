import * as THREE from 'three';
import { clamp, DEG, damp } from '@/core/math';
import { Spring } from '@/core/spring';
import { CAMERA } from '@/content/tuning';
import type { Field } from '@/world/field';

type RigShape = (typeof CAMERA)['landscape'] | (typeof CAMERA)['portrait'];

/**
 * The over-the-shoulder rig (GDD §5.1), the owner's choice.
 * - Look input turns it 1:1 with no smoothing, so aim feels direct; only the pivot follows the hero with a short
 *   critically damped lag.
 * - Landscape and portrait have their own shoulder, height, distance and default pitch, blended when the screen turns.
 * - The camera pulls in at once when a prop or the ground is in the way, and eases back out when it clears.
 * - A shot kicks the view up and springs back; the aim (`forward`) never moves with it.
 * M4 adds the army-reveal shot.
 */
export class CameraRig {
  /** Facing, radians around Y (0 looks down −Z). */
  yaw = 0;
  /** Radians, negative looks down. */
  pitch = CAMERA.landscape.pitch * DEG;
  /** Where the crosshair points: the aim direction, without any kick. */
  readonly forward = new THREE.Vector3(0, 0, -1);
  /** Metres from the camera to the hero's head, for the hero fade. */
  heroDistance = 10;
  /** Scales the kick and punch: the Camera shake setting (0 to 1). */
  shake = 1;
  /** Extra field of view this frame from shots, in degrees (the stage adds it). */
  fovPunch = 0;
  private readonly pivot = new THREE.Vector3();
  private blend = 0;
  private placed = false;
  /** How far out the camera is allowed this frame, as a share of the full distance. */
  private reach = 1;
  private readonly right = new THREE.Vector3();
  private readonly head = new THREE.Vector3();
  private readonly want = new THREE.Vector3();
  private readonly kickPitch = new Spring(170, 18);
  private readonly kickYaw = new Spring(170, 18);
  private readonly punch = new Spring(150, 16);
  /** A scripted shot (the army reveal), blended over the rig by `shotWeight` (0 to 1). */
  private readonly shotPos = new THREE.Vector3();
  private readonly shotTarget = new THREE.Vector3();
  shotWeight = 0;
  private readonly normalPos = new THREE.Vector3();
  private readonly normalQ = new THREE.Quaternion();

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly field: Field,
  ) {}

  /** Turns the view by look input in degrees (positive x turns right, positive y looks down). */
  look(dxDegrees: number, dyDegrees: number): void {
    this.yaw -= dxDegrees * DEG;
    this.pitch = clamp(this.pitch - dyDegrees * DEG, CAMERA.minPitch * DEG, CAMERA.maxPitch * DEG);
  }

  /** Puts the rig behind a point at once, with the default pitch for the current orientation. */
  snap(target: THREE.Vector3, yaw: number, portrait: boolean): void {
    this.yaw = yaw;
    this.blend = portrait ? 1 : 0;
    this.pitch = this.shape().pitch * DEG;
    this.pivot.copy(target);
    this.reach = 1;
    this.placed = true;
  }

  /** A shot: the view jumps up (degrees) with a little sideways jitter, and widens for a moment. */
  kick(degrees: number, jitter: number, punch: number): void {
    const s = this.shake;
    if (s <= 0) return;
    this.kickPitch.kick(degrees * DEG * 14 * s);
    this.kickYaw.kick((Math.random() * 2 - 1) * jitter * DEG * 14 * s);
    this.punch.kick(punch * 14 * s);
  }

  update(dt: number, target: THREE.Vector3, portrait: boolean): void {
    if (!this.placed) this.snap(target, this.yaw, portrait);
    this.blend = damp(this.blend, portrait ? 1 : 0, 8, dt);
    const rate = 1 / CAMERA.followTime;
    this.pivot.set(
      damp(this.pivot.x, target.x, rate, dt),
      damp(this.pivot.y, target.y, rate, dt),
      damp(this.pivot.z, target.z, rate, dt),
    );
    const s = this.shape();
    const cp = Math.cos(this.pitch);
    this.forward.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    // The full-distance spot, then a sweep from the hero's head out to it: blocked means pull in now.
    this.head.copy(this.pivot);
    this.head.y += s.pivotHeight;
    this.want.copy(this.head).addScaledVector(this.forward, -s.distance).addScaledVector(this.right, s.shoulder);
    const h = this.head;
    const w = this.want;
    const free = this.field.sweep(h.x, h.y, h.z, w.x, w.y, w.z, CAMERA.collisionRadius);
    this.reach = free < this.reach ? free : damp(this.reach, free, CAMERA.recoverRate, dt);
    const cam = this.camera.position;
    cam.lerpVectors(h, w, this.reach);
    const floor = this.field.heightAt(cam.x, cam.z) + CAMERA.groundClearance;
    if (cam.y < floor) cam.y = floor;
    this.heroDistance = cam.distanceTo(h);
    this.camera.lookAt(cam.x + this.forward.x, cam.y + this.forward.y, cam.z + this.forward.z);
    // The kick turns the picture, not the aim.
    const kp = this.kickPitch.update(dt);
    const ky = this.kickYaw.update(dt);
    this.fovPunch = this.punch.update(dt);
    if (kp !== 0 || ky !== 0) {
      this.camera.rotateX(kp);
      this.camera.rotateY(ky);
    }
    if (this.shotWeight > 0.001) this.blendShot();
  }

  /** Frames a scripted shot from `pos` looking at `target`; `shotWeight` blends it in (eased by the caller). */
  setShot(pos: THREE.Vector3, target: THREE.Vector3): void {
    this.shotPos.copy(pos);
    this.shotTarget.copy(target);
  }

  private blendShot(): void {
    const camera = this.camera;
    const w = this.shotWeight * this.shotWeight * (3 - 2 * this.shotWeight);
    this.normalPos.copy(camera.position);
    this.normalQ.copy(camera.quaternion);
    camera.position.copy(this.shotPos);
    camera.lookAt(this.shotTarget);
    camera.position.lerpVectors(this.normalPos, this.shotPos, w);
    camera.quaternion.slerpQuaternions(this.normalQ, camera.quaternion.clone(), w);
  }

  /** The landscape and portrait shapes, blended. */
  private shape(): RigShape {
    const a = CAMERA.landscape;
    const b = CAMERA.portrait;
    const t = this.blend;
    const mix = (x: number, y: number): number => x + (y - x) * t;
    return {
      verticalFov: mix(a.verticalFov, b.verticalFov),
      shoulder: mix(a.shoulder, b.shoulder),
      pivotHeight: mix(a.pivotHeight, b.pivotHeight),
      distance: mix(a.distance, b.distance),
      pitch: mix(a.pitch, b.pitch),
    } as RigShape;
  }
}
