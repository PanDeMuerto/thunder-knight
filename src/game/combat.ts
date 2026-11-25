import * as THREE from 'three';
import { DEG } from '@/core/math';
import { GUNS, type GunDef } from '@/content/guns';
import type { GameAudio } from '@/audio/audio';
import type { CameraRig } from '@/render/cameraRig';
import { PUFFS, type Effects } from '@/render/effects';
import type { Settings } from '@/save/saveStore';
import type { Hud } from '@/ui/hud';
import type { Field } from '@/world/field';
import { AimAssist, aimProfile, type AimProfile } from './aimAssist';
import type { Bodies } from './bodies';
import { Gun } from './gun';
import type { Hero } from './hero';
import { traceShot, type ShotHit } from './hitscan';

/** What a hit did, reported by whoever owns the bodies (the range now, the crowd from M2). */
export interface HitResult {
  knocked: boolean;
  armoured: boolean;
  captain: boolean;
  /** The bullet hit a shield from the front: no damage, and it stops there (GDD §9.1). */
  blocked: boolean;
}

/** The bodies that can be shot, and what happens to one that is hit. */
export interface Targets {
  readonly bodies: Bodies;
  hit(id: number, damage: number, dirX: number, dirZ: number): HitResult;
  /** Shoves a body back along the shot (the shotgun's knockback, GDD §8.1). */
  /** Shoves a soldier back along the shot; true when that knocked a rider off his horse. */
  push?(id: number, metres: number, dirX: number, dirZ: number): boolean;
}

/** The crosshair's ray reaches this far for pointing the gun arm when it lands on nothing. */
const AIM_REACH = 80;

const eye = new THREE.Vector3();
const head = new THREE.Vector3();
const base = new THREE.Vector3();
const dir = new THREE.Vector3();
const point = new THREE.Vector3();
const end = new THREE.Vector3();
const muzzle = new THREE.Vector3();
const port = new THREE.Vector3();
const right = new THREE.Vector3();
const back = new THREE.Vector3();
const hits: ShotHit[] = [];

/**
 * Shooting (GDD §6, §8; tech design §5.4): the gun in hand, aim assist, auto-fire on touch, and each shot from the
 * crosshair's ray, with its tracer from the muzzle, puffs, numbers, markers and the view's kick.
 *
 * Shots are traced along the camera's ray (what the crosshair shows), starting level with the hero, so nothing
 * between the camera and the hero can be hit, and what the crosshair covers is what gets hit.
 */
export class Combat {
  readonly gun = new Gun(GUNS.pistol);
  readonly aim = new AimAssist();
  profile: AimProfile = aimProfile(false, 'normal');
  /** Where the crosshair's ray lands this frame. */
  readonly aimPoint = new THREE.Vector3();
  /** Shots fired and knockouts, for QA and the dev panel. */
  shots = 0;
  knockouts = 0;
  /** A light gun (pistol, SMG) hit armour: half damage (GDD §9.1). Battle 9's armour tip listens. */
  onLightOnArmour: (() => void) | null = null;
  /** A launcher's round leaves the muzzle for where the shot lands, with its damage and blast (GDD §8.1). */
  onLaunch: ((from: THREE.Vector3, to: THREE.Vector3, damage: number, radius: number, def: GunDef) => void) | null = null;
  /** True while auto-fire is pulling the trigger (touch). */
  autoFiring = false;
  private shotCount = 0;
  /** How far along the camera's ray the hero stands: shots start here. */
  private start = 0;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly rig: CameraRig,
    private readonly hero: Hero,
    private readonly field: Field,
    private readonly effects: Effects,
    private readonly hud: Hud,
    private readonly audio: GameAudio,
  ) {}

  /** Picks the assist profile for the device and the setting. */
  configure(touch: boolean, settings: Settings): void {
    this.profile = aimProfile(touch, settings.aimAssist);
  }

  /** Look input after friction and the magnet, in degrees. Call before turning the rig. */
  steerLook(dt: number, raw: { x: number; y: number }, active: boolean): { x: number; y: number } {
    const friction = this.aim.friction(this.profile);
    let x = raw.x * friction;
    let y = raw.y * friction;
    const pull = this.aim.magnet(dt, this.profile, active, this.camera.position, this.rig.yaw, this.rig.pitch, x, y);
    x += pull.x;
    y += pull.y;
    return { x, y };
  }

  /**
   * One frame of shooting, after the rig has moved. `held` is the mouse trigger; `autoFire` whether auto-fire is on
   * for this device; `reload` an early reload request.
   */
  update(dt: number, targets: Targets, held: boolean, autoFire: boolean, reload: boolean, touch: boolean): void {
    const forward = this.rig.forward;
    eye.copy(this.camera.position);
    head.copy(this.hero.position);
    head.y += 1.4;
    this.start = Math.max(0, head.sub(eye).dot(forward));
    const def = this.gun.def;
    const sight = (ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean =>
      this.field.clear(ax, ay, az, bx, by, bz);
    this.aim.update(dt, eye, forward, targets.bodies, this.profile, def.range + this.start, sight, this.start);
    this.findAimPoint(targets, forward);
    this.hero.aimAt(this.aimPoint);

    const inReach = this.aim.inCone(this.profile) && this.aim.distance - this.start <= def.range;
    this.autoFiring = autoFire && inReach && this.aim.onTarget >= this.profile.autoFireDelay;
    const shots = this.gun.update(dt, held || this.autoFiring, reload);
    for (let i = 0; i < shots; i++) this.fire(targets);
    for (const event of this.gun.events.splice(0)) if (event === 'reloadStart') this.audio.play('reload');

    const onTarget = this.aim.onBody || (touch && inReach);
    this.hud.setAim(onTarget, onTarget && targets.bodies.role[this.aim.target] === 2);
    this.hud.setAutoPip(!autoFire ? 'off' : this.autoFiring ? 'armed' : 'idle');
    this.hud.setAmmo(this.gun.ammo, this.gun.stats.magazine, this.gun.reloadProgress);
  }

  /** The point under the crosshair: a body, a prop or the ground, or far ahead. */
  private findAimPoint(targets: Targets, forward: THREE.Vector3): void {
    const reach = this.start + AIM_REACH;
    end.copy(eye).addScaledVector(forward, reach);
    const free = this.field.sweep(eye.x, eye.y, eye.z, end.x, end.y, end.z, 0);
    let t = reach * free;
    if (traceShot(targets.bodies, eye.x, eye.y, eye.z, forward.x, forward.y, forward.z, this.start, t, 1, 1, hits)) {
      t = hits[0]!.t;
    }
    // Never closer than a couple of metres past the hero, or the arm would fold back.
    this.aimPoint.copy(eye).addScaledVector(forward, Math.max(t, this.start + 2));
  }

  private fire(targets: Targets): void {
    const def = this.gun.def;
    const forward = this.rig.forward;
    const range = def.range;
    this.shots++;
    this.shotCount++;
    this.aim.shotDirection(eye, forward, this.profile, range + this.start, base);
    this.hero.muzzle(muzzle);
    // A launcher's round (GDD §8.1): it flies to where the shot would land (the first soldier, a prop, the ground or
    // its range) and bursts there; the game flies it.
    if (def.splash > 0) {
      const far = this.start + range;
      end.copy(eye).addScaledVector(base, far);
      const startPoint = point.copy(eye).addScaledVector(base, this.start);
      const free = this.field.sweep(startPoint.x, startPoint.y, startPoint.z, end.x, end.y, end.z, 0);
      let t = this.start + range * free;
      if (traceShot(targets.bodies, eye.x, eye.y, eye.z, base.x, base.y, base.z, this.start, t, 1, this.profile.hitScale, hits)) t = hits[0]!.t;
      point.copy(eye).addScaledVector(base, t);
      this.onLaunch?.(muzzle, point, this.gun.stats.damage, def.splash, def);
      const feel = def.feel;
      this.hero.fire(feel.flash);
      this.rig.kick(feel.kick, feel.jitter, feel.punch);
      this.hud.kick(Math.min(1, 0.4 + feel.kick * 0.5));
      this.audio.play(feel.sound, { rate: feel.pitch * (0.96 + Math.random() * 0.08) });
      this.audio.duck();
      return;
    }
    let anyHit = false;
    let anyKnock = false;
    let anyBlocked = false;
    let anyArmour = false;
    let lightOnArmour = false;
    for (let p = 0; p < def.pellets; p++) {
      dir.copy(base);
      if (def.spread > 0) {
        // A random point in a disc across the shot, so the spread is round.
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * Math.tan(def.spread * DEG);
        right.set(-dir.z, 0, dir.x).normalize();
        const up = point.crossVectors(right, dir).normalize();
        dir.addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
      }
      const far = this.start + range;
      end.copy(eye).addScaledVector(dir, far);
      const startPoint = point.copy(eye).addScaledVector(dir, this.start);
      const free = this.field.sweep(startPoint.x, startPoint.y, startPoint.z, end.x, end.y, end.z, 0);
      const limit = this.start + range * free;
      const n = traceShot(targets.bodies, eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, this.start, limit, def.pierce, this.profile.hitScale, hits);
      back.copy(dir).negate();
      let stopT = n >= def.pierce && n > 0 ? hits[n - 1]!.t : limit;
      for (let h = 0; h < n; h++) {
        const hit = hits[h]!;
        const armoured = targets.bodies.armoured[hit.id] === 1;
        const damage = this.gun.stats.damage * (armoured && def.light ? 0.5 : 1);
        if (armoured && def.light) lightOnArmour = true;
        const result = targets.hit(hit.id, damage, dir.x, dir.z);
        point.copy(eye).addScaledVector(dir, hit.t);
        if (result.blocked) {
          // A shield from the front: sparks and a clonk, and the bullet stops (no pierce through it).
          this.effects.puff(point, PUFFS.spark, back);
          anyBlocked = true;
          stopT = hit.t;
          break;
        }
        // The shotgun's knockback; a rider is knocked off his horse (a knockout).
        if (def.push > 0 && !result.knocked && targets.push?.(hit.id, def.push, dir.x, dir.z)) {
          anyKnock = true;
          this.knockouts++;
        }
        this.effects.puff(point, armoured ? PUFFS.spark : PUFFS.hit, back);
        this.hud.damageNumber(point, damage, armoured);
        anyHit = true;
        anyArmour ||= armoured;
        if (result.knocked) {
          anyKnock = true;
          this.knockouts++;
        }
      }
      // The tracer ends where the bullet stopped: a shield, its last body when out of pierce, else the ground, a prop
      // or range.
      end.copy(eye).addScaledVector(dir, stopT);
      if (n === 0 && free < 1) this.effects.puff(end, PUFFS.ground, back);
      if (def.feel.tracerEvery > 0 && this.shotCount % def.feel.tracerEvery === 0 && p < 3) this.effects.tracer(muzzle, end);
    }
    const feel = def.feel;
    this.hero.fire(feel.flash);
    this.rig.kick(feel.kick, feel.jitter, feel.punch);
    this.hud.kick(Math.min(1, 0.4 + feel.kick * 0.5));
    if (feel.shells) {
      this.hero.ejection(port, right);
      this.effects.shell(port, right);
    }
    // A very fast gun (the minigun's 25 a second) sounds every other round, or it would drown the battle.
    if (def.rate <= 15 || this.shotCount % 2 === 0) this.audio.play(feel.sound, { rate: feel.pitch * (0.96 + Math.random() * 0.08) });
    this.audio.duck();
    if (lightOnArmour) this.onLightOnArmour?.();
    if (anyHit) {
      this.hud.hitMarker(anyKnock);
      // A tick on cloth, a clink on armour (the body's flop and yelp come as it falls: game.ts).
      this.audio.play(anyArmour ? 'clink' : 'hit', { rate: 0.95 + Math.random() * 0.1 });
    } else if (anyBlocked) {
      this.hud.blocked();
      this.audio.play('block', { rate: 0.9 + Math.random() * 0.15 });
    }
  }
}
