import * as THREE from 'three';
import { DEG } from '@/core/math';
import { AIM } from '@/content/tuning';
import { ROLE, type Bodies } from './bodies';
import { rayCapsule } from './hitscan';

export interface AimProfile {
  cone: number;
  friction: number;
  magnetCone: number;
  magnetRate: number;
  autoFireDelay: number;
  hitScale: number;
  bend: number;
}

/** A line of sight check from one point to another (props and the ground block it). */
export type SightCheck = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => boolean;

/** The profile for a device and the assist setting (GDD §6.4, §15.7). `off` keeps only the wider hit size. */
export function aimProfile(touch: boolean, setting: 'off' | 'normal' | 'strong'): AimProfile {
  const base: AimProfile = touch ? { ...AIM.touch } : { ...AIM.mouse };
  if (setting === 'strong') {
    base.cone *= AIM.strongScale;
    base.magnetCone *= AIM.strongScale;
    base.magnetRate *= AIM.strongScale;
  } else if (setting === 'off') {
    base.cone = 0;
    base.friction = 1;
    base.magnetCone = 0;
    base.magnetRate = 0;
    base.bend = 0;
  }
  return base;
}

const tmp = new THREE.Vector3();

/**
 * Aim help, from Scrap Express (after Fallout 3's console assist), with this game's target priority:
 * - The body under the crosshair always wins (the one a bullet would hit first).
 * - Otherwise, inside the cone: a captain, then an archer, then the nearest by distance.
 * - A chosen target is kept until it leaves the cone by 2°, so aim doesn't flicker between soldiers in a crowd.
 * Assist only ever biases: friction slows the look near a target, the magnet (touch) drifts toward one but never
 * against the player's input, and shots bend toward it inside the cone. Nothing reaches through props.
 */
export class AimAssist {
  /** The body chosen this frame, or -1. */
  target = -1;
  /** Angle from the crosshair to the target's edge in radians (0 or less: the crosshair is on it). */
  edge = Math.PI;
  /** Angle from the crosshair to the target's aim point. */
  angle = Math.PI;
  distance = Infinity;
  /** Seconds the current target has been inside the cone, for auto-fire's reaction delay. */
  onTarget = 0;
  readonly aimPoint = new THREE.Vector3();

  update(
    dt: number,
    eye: THREE.Vector3,
    forward: THREE.Vector3,
    bodies: Bodies,
    profile: AimProfile,
    range: number,
    sight: SightCheck,
    start = 0,
  ): void {
    const cone = profile.cone * DEG;
    const reach = Math.max(cone, profile.magnetCone * DEG, AIM.frictionMargin * DEG) + AIM.stickyMargin * DEG;
    const sticky = cone + AIM.stickyMargin * DEG;
    let best = -1;
    let bestScore = Infinity;
    let bestEdge = Math.PI;
    let bestAngle = Math.PI;
    let bestDistance = Infinity;
    for (let i = 0; i < bodies.count; i++) {
      if (!bodies.alive[i] || bodies.open[i]) continue;
      tmp.set(bodies.x[i]!, bodies.aimHeight(i), bodies.z[i]!).sub(eye);
      const distance = tmp.length();
      // Nothing behind the hero (between the camera and the gun) can be shot.
      if (distance > range || tmp.dot(forward) < start + 0.3) continue;
      tmp.divideScalar(distance);
      const angle = Math.acos(Math.min(1, Math.max(-1, tmp.dot(forward))));
      // How far the crosshair is from the body's side; 0 or less when the crosshair's ray actually touches it.
      const r = bodies.radius[i]! * profile.hitScale;
      const across = Math.atan(r / distance);
      let edge = angle - across;
      if (edge > reach) continue;
      const hit = rayCapsule(
        eye.x,
        eye.y,
        eye.z,
        forward.x,
        forward.y,
        forward.z,
        bodies.x[i]!,
        bodies.y[i]!,
        bodies.z[i]!,
        bodies.height[i]!,
        r,
      );
      edge = hit <= range ? -across : Math.max(edge, 1e-4);
      let score: number;
      if (edge <= 0) score = -1e6 + distance;
      else if (i === this.target && edge <= sticky) score = -1e5 + distance;
      else if (edge <= cone) score = (ROLE.captain - bodies.role[i]!) * 1e3 + distance;
      else score = 1e5 + edge * 1e3 + distance * 0.01;
      if (score >= bestScore) continue;
      if (!sight(eye.x, eye.y, eye.z, bodies.x[i]!, bodies.aimHeight(i), bodies.z[i]!)) continue;
      best = i;
      bestScore = score;
      bestEdge = edge;
      bestAngle = angle;
      bestDistance = distance;
    }
    if (best !== this.target) this.onTarget = 0;
    this.target = best;
    this.edge = bestEdge;
    this.angle = bestAngle;
    this.distance = bestDistance;
    if (best >= 0) this.aimPoint.set(bodies.x[best]!, bodies.aimHeight(best), bodies.z[best]!);
    this.onTarget = this.inCone(profile) ? this.onTarget + dt : 0;
  }

  /** The crosshair is over the target, give or take the cone. */
  inCone(profile: AimProfile): boolean {
    return this.target >= 0 && this.edge <= profile.cone * DEG;
  }

  /** The crosshair is right over the target's body. */
  get onBody(): boolean {
    return this.target >= 0 && this.edge <= 0;
  }

  /** Multiplier for look speed this frame. */
  friction(profile: AimProfile): number {
    if (this.target < 0) return 1;
    return this.edge < AIM.frictionMargin * DEG ? profile.friction : 1;
  }

  /**
   * The pull toward the target in degrees of look (positive x turns right, positive y looks down), given the player's
   * own look this frame. A part that would fight the player's input is dropped. Only while the player is moving or
   * turning (`active`), so a still view never drifts by itself.
   */
  magnet(
    dt: number,
    profile: AimProfile,
    active: boolean,
    eye: THREE.Vector3,
    yaw: number,
    pitch: number,
    lookX: number,
    lookY: number,
  ): { x: number; y: number } {
    if (this.target < 0 || !active || profile.magnetRate <= 0) return { x: 0, y: 0 };
    if (this.angle > profile.magnetCone * DEG || this.edge < 0) return { x: 0, y: 0 };
    const dx = this.aimPoint.x - eye.x;
    const dy = this.aimPoint.y - eye.y;
    const dz = this.aimPoint.z - eye.z;
    const wantYaw = Math.atan2(-dx, -dz);
    const wantPitch = Math.atan2(dy, Math.hypot(dx, dz));
    let dYaw = wantYaw - yaw;
    dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
    const dPitch = wantPitch - pitch;
    const step = profile.magnetRate * DEG * dt;
    // Look input turns right with +x, which lowers yaw; +y looks down, which lowers pitch.
    let x = -Math.max(-step, Math.min(step, dYaw)) / DEG;
    let y = -Math.max(-step, Math.min(step, dPitch)) / DEG;
    if (lookX !== 0 && Math.sign(lookX) !== Math.sign(x)) x = 0;
    if (lookY !== 0 && Math.sign(lookY) !== Math.sign(y)) y = 0;
    return { x, y: y * 0.5 };
  }

  /**
   * The direction a shot takes from `eye`. Inside the cone and in range it bends toward the target (all the way on
   * touch, partly with a mouse); otherwise straight along `forward`. Returns true when it bent.
   */
  shotDirection(
    eye: THREE.Vector3,
    forward: THREE.Vector3,
    profile: AimProfile,
    range: number,
    out: THREE.Vector3,
  ): boolean {
    out.copy(forward);
    if (!this.inCone(profile) || this.distance > range || profile.bend <= 0) return false;
    tmp.subVectors(this.aimPoint, eye).normalize();
    out.lerp(tmp, profile.bend).normalize();
    return true;
  }
}
