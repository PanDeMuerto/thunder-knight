import * as THREE from 'three';
import { captainOf, EDGES, type WaveDef } from '@/content/battles';
import { isStringKey, t } from '@/content/strings';
import { GREYBOX } from '@/content/tuning';
import { SOLDIERS, type SoldierType } from '@/content/soldiers';

/** GDD §4.3. */
const REVEAL = { seconds: 2, withNameplate: 2.5, boss: 3, reduced: 1.2, ease: 0.4, height: 18, behind: 26 } as const;

export interface RevealPlan {
  /** Seconds the shot lasts (0: no camera shot). */
  seconds: number;
  /** The type to introduce with a nameplate, if any. */
  introduce: SoldierType | null;
  /** Where the camera looks: the new type's entry point, or the middle of the field. */
  target: THREE.Vector3;
}

/**
 * Decides an army reveal for a wave (GDD §4.3): the types it brings, the first one the player hasn't met (a nameplate
 * names it with a counter tip), and how long the shot lasts by the Wave intros setting (Full: every wave; Short: new
 * enemies only; Off: no camera shot, the nameplate alone). Reduced motion shortens it.
 */
export function planReveal(
  wave: WaveDef,
  met: (type: SoldierType) => boolean,
  intros: 'full' | 'short' | 'off',
  reducedMotion: boolean,
): RevealPlan {
  let introduce: SoldierType | null = null;
  let entry = wave.squads[0];
  for (const s of wave.squads) {
    const captain = captainOf(s);
    const types: SoldierType[] = captain ? [captain, s.type] : [s.type];
    // A boss is always named (GDD §9.3: a name card every time); others the first time they're met.
    const fresh = types.find((type) => (SOLDIERS[type].boss || !met(type)) && isStringKey(`intro.${type}`));
    if (fresh) {
      introduce = fresh;
      entry = s;
      break;
    }
  }
  let seconds = 0;
  if (intros === 'full' || (intros === 'short' && introduce)) {
    seconds = introduce ? (SOLDIERS[introduce].boss ? REVEAL.boss : REVEAL.withNameplate) : REVEAL.seconds;
    if (reducedMotion) seconds = REVEAL.reduced;
  }
  const target = new THREE.Vector3(GREYBOX.bannerAt.x, 0, GREYBOX.bannerAt.z - 24);
  if (entry) {
    const edge = EDGES[entry.edge];
    const x = edge.x + edge.alongX * (entry.offset ?? 0);
    const z = edge.z + edge.alongZ * (entry.offset ?? 0);
    // Between the banner and where they come in, so both read.
    target.set(x * 0.55 + GREYBOX.bannerAt.x * 0.45, 0, z * 0.55 + GREYBOX.bannerAt.z * 0.45);
  }
  return { seconds, introduce, target };
}

/** The nameplate's text for a type ("Captain: they'll run!"). */
export function nameplate(type: SoldierType): string {
  const key = `intro.${type}`;
  return isStringKey(key) ? t(key) : '';
}

/**
 * A running reveal: the camera's weight over time (eased in and out over 0.4 s), the shot's position (high behind
 * the banner) and its target. Skippable.
 */
export class RevealShot {
  active = false;
  private time = 0;
  private seconds = 0;
  readonly pos = new THREE.Vector3();
  readonly target = new THREE.Vector3();

  start(plan: RevealPlan): void {
    this.active = plan.seconds > 0;
    this.time = 0;
    this.seconds = plan.seconds;
    this.target.copy(plan.target);
    this.pos.set(GREYBOX.bannerAt.x, REVEAL.height, GREYBOX.bannerAt.z + REVEAL.behind);
  }

  skip(): void {
    if (this.active && this.time < this.seconds - REVEAL.ease) this.time = this.seconds - REVEAL.ease;
  }

  /** Steps the shot and returns the camera's weight (0 when done). */
  update(dt: number): number {
    if (!this.active) return 0;
    this.time += dt;
    if (this.time >= this.seconds) {
      this.active = false;
      return 0;
    }
    const inW = Math.min(1, this.time / REVEAL.ease);
    const outW = Math.min(1, (this.seconds - this.time) / REVEAL.ease);
    return Math.min(inW, outW);
  }
}
