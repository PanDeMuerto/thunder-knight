import * as THREE from 'three';
import { ENDING, type EndingSpeaker } from '@/content/ending';
import type { StringKey } from '@/content/strings';
import type { AdaFigure } from '@/world/adaFigure';

/** What the scene needs from the game. */
export interface EndingHost {
  heightAt(x: number, z: number): number;
  /** A tall screen (the shot steps back). */
  portrait(): boolean;
  /** Stands the hero at (x, z) facing `yaw` (0 = −Z). */
  placeHero(x: number, z: number, yaw: number): void;
  /** The scene's camera, held at full weight while it runs. */
  setShot(pos: THREE.Vector3, target: THREE.Vector3): void;
  /** A line at the bottom of the screen. */
  say(who: EndingSpeaker, key: StringKey): void;
  /** The dip to dark (on) or back (off). */
  fade(on: boolean): void;
  /** Everyone cheers: the hero, Rosie, the blues. */
  cheer(): void;
  /** The lines are done (or skipped): the ending card. */
  done(): void;
}

const yawOf = (dx: number, dz: number): number => Math.atan2(-dx, -dz);
/** `yaw` turned `amount` radians toward `toward` (the short way). */
const turn = (yaw: number, toward: number, amount: number): number => {
  const d = Math.atan2(Math.sin(toward - yaw), Math.cos(toward - yaw));
  return yaw + Math.sign(d) * Math.min(Math.abs(d), amount);
};
const pos = new THREE.Vector3();
const target = new THREE.Vector3();

/**
 * Battle 20's ending (M10, `ENDING`): a dip to dark, the hero at the banner, Queen Ada walking up the hill to him,
 * four short lines (a press moves on, Skip ends it), the cheer, then the ending card over the scene. The camera holds
 * on the two of them until the player leaves the card.
 */
export class EndingScene {
  private step: 'fade' | 'walk' | 'lines' | 'over' | null = null;
  private t = 0;
  private line = -1;
  private cheered = false;
  /** Which way the hero faces through the scene (the game turns him with it). */
  heroYaw = 0;

  constructor(
    private readonly host: EndingHost,
    private readonly ada: AdaFigure,
  ) {}

  get active(): boolean {
    return this.step !== null;
  }

  /** The scene's camera holds (from the end of the dip to dark until `stop`). */
  get framing(): boolean {
    return this.step !== null && this.step !== 'fade';
  }

  /** The lines are still running (presses move them on). */
  get speaking(): boolean {
    return this.step === 'fade' || this.step === 'walk' || this.step === 'lines';
  }

  start(): void {
    this.step = 'fade';
    this.t = 0;
    this.line = -1;
    this.cheered = false;
    this.host.fade(true);
  }

  /** A tap, click or key: Ada's walk is cut short, or the next line comes. */
  press(): void {
    if (this.step === 'walk' && this.t > ENDING.minLine) this.arrive();
    else if (this.step === 'lines' && this.t >= ENDING.minLine) this.next();
  }

  /** Skip: straight to the card. */
  skip(): void {
    if (!this.speaking) return;
    if (this.step === 'fade') {
      this.setScene();
      this.host.fade(false);
    }
    this.arrive(false);
    this.finish();
  }

  /** Over (the player left the card): Ada goes. */
  stop(): void {
    this.step = null;
    this.ada.hide();
  }

  update(dt: number): void {
    if (!this.step) return;
    this.t += dt;
    const E = ENDING;
    if (this.step === 'fade' && this.t >= E.fade) {
      this.setScene();
      this.host.fade(false);
      this.step = 'walk';
      this.t = 0;
    } else if (this.step === 'walk') {
      const to = E.ada.to;
      const at = this.ada.root.position;
      const dx = to.x - at.x;
      const dz = to.z - at.z;
      const left = Math.hypot(dx, dz);
      const stride = E.ada.speed * dt;
      if (left <= stride) this.arrive();
      else {
        at.x += (dx / left) * stride;
        at.z += (dz / left) * stride;
        at.y = this.host.heightAt(at.x, at.z);
      }
    } else if (this.step === 'lines' && this.t >= E.lineSeconds) this.next();
    this.ada.update(dt);
    if (this.framing) this.frame();
  }

  /** Under the dark: the hero at the banner, Ada at the foot of the hill walking up, the camera on them. */
  private setScene(): void {
    const E = ENDING;
    const { from, to } = E.ada;
    this.heroYaw = turn(yawOf(to.x - E.hero.x, to.z - E.hero.z), yawOf(E.shot.pos[0] - E.hero.x, E.shot.pos[2] - E.hero.z), E.toCamera);
    this.host.placeHero(E.hero.x, E.hero.z, this.heroYaw);
    this.ada.place(from.x, this.host.heightAt(from.x, from.z), from.z, yawOf(to.x - from.x, to.z - from.z));
    this.ada.play('walk');
    this.frame();
  }

  private frame(): void {
    const S = ENDING.shot;
    target.set(S.target[0], 0, S.target[2]);
    const ground = this.host.heightAt(target.x, target.z);
    target.y = ground + S.target[1];
    pos.set(S.pos[0], 0, S.pos[2]);
    if (this.host.portrait()) {
      // A tall screen: step back along the line of sight so both fit across.
      const dx = pos.x - target.x;
      const dz = pos.z - target.z;
      const d = Math.hypot(dx, dz) || 1;
      pos.x += (dx / d) * S.portraitBack;
      pos.z += (dz / d) * S.portraitBack;
    }
    // Level with them on the hill, never under the slope in front.
    pos.y = Math.max(ground, this.host.heightAt(pos.x, pos.z) + 0.6) + S.pos[1];
    this.host.setShot(pos, target);
  }

  /** She's beside him, facing him: the lines begin. */
  private arrive(talk = true): void {
    const E = ENDING;
    const to = E.ada.to;
    const facing = turn(yawOf(E.hero.x - to.x, E.hero.z - to.z), yawOf(E.shot.pos[0] - to.x, E.shot.pos[2] - to.z), E.toCamera);
    this.ada.place(to.x, this.host.heightAt(to.x, to.z), to.z, facing);
    this.ada.play('idle');
    if (!talk) return;
    this.step = 'lines';
    this.line = -1;
    this.next();
  }

  private next(): void {
    this.line++;
    this.t = 0;
    const L = ENDING.lines[this.line];
    if (!L) {
      this.finish();
      return;
    }
    this.host.say(L.who, L.key);
    this.ada.play(L.act);
    if (L.act === 'cheer') this.cheer();
  }

  private cheer(): void {
    if (this.cheered) return;
    this.cheered = true;
    this.host.cheer();
  }

  private finish(): void {
    this.step = 'over';
    this.ada.play('cheer');
    this.cheer();
    this.host.done();
  }
}
