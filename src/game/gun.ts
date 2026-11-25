import type { GunDef } from '@/content/guns';
import { SHOOTING } from '@/content/tuning';
import { gunStats, type GunStats } from '@/state/guns';

export type GunEvent = 'shot' | 'reloadStart' | 'reloadEnd';

/**
 * The held gun's rules (GDD §6, §8.1): fire rate while the trigger is held, the magazine, and reloads. Reloads start by
 * themselves when the magazine runs dry, when the player asks (R or the ammo ring), and when a part-used magazine has
 * been idle a moment, so a casual player rarely reloads mid-fight. No meshes here: `game/weapons` shows it.
 */
export class Gun {
  stats: GunStats;
  ammo: number;
  /** Seconds left in a reload, 0 when not reloading. */
  reloading = 0;
  /** Seconds since the last shot. */
  sinceShot = 99;
  /** What happened this frame, for sounds and the HUD. Emptied by the caller. */
  readonly events: GunEvent[] = [];
  private cooldown = 0;
  private reloadTotal = 1;
  /** The minigun's barrels: 0 at rest, 1 spun up (it fires only at 1). */
  spin = 0;
  /** It fired this frame (or the last few): the hero slows under a minigun's weight. */
  firing = false;

  constructor(
    public def: GunDef,
    public level = 1,
  ) {
    this.stats = gunStats(def, level);
    this.ammo = this.stats.magazine;
  }

  /** Takes a gun in hand, with a full magazine. */
  equip(def: GunDef, level: number): void {
    this.def = def;
    this.level = level;
    this.stats = gunStats(def, level);
    this.ammo = this.stats.magazine;
    this.reloading = 0;
    this.cooldown = 0;
    this.spin = 0;
  }

  /** 0 to 1 through a reload; 1 when not reloading. */
  get reloadProgress(): number {
    return this.reloading > 0 ? 1 - this.reloading / this.reloadTotal : 1;
  }

  get full(): boolean {
    return this.ammo >= this.stats.magazine;
  }

  /** Steps the gun. Returns how many shots fire this frame (usually 0 or 1). */
  update(dt: number, trigger: boolean, wantReload: boolean): number {
    this.sinceShot += dt;
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading > 0) return 0;
      this.reloading = 0;
      this.ammo = this.stats.magazine;
      this.cooldown = 0;
      this.events.push('reloadEnd');
    }
    if (wantReload && !this.full) {
      this.startReload();
      return 0;
    }
    this.cooldown -= dt;
    // Without the trigger, the gun is simply ready: no stored-up burst.
    if (!trigger && this.cooldown < 0) this.cooldown = 0;
    // A minigun spins up while the trigger's held (and it has rounds), and down more slowly; it fires only spun up.
    const spinUp = this.def.spinUp ?? 0;
    if (spinUp > 0) {
      const up = trigger && this.ammo > 0;
      this.spin = Math.max(0, Math.min(1, this.spin + (up ? dt / spinUp : -dt / (spinUp * 2))));
      if (this.spin < 1) {
        this.cooldown = 0;
        this.firing = false;
        return 0;
      }
    }
    let shots = 0;
    while (trigger && this.cooldown <= 0 && this.ammo > 0) {
      this.ammo--;
      this.cooldown += 1 / this.def.rate;
      this.sinceShot = 0;
      shots++;
      this.events.push('shot');
    }
    this.firing = this.sinceShot < 0.15;
    if (this.ammo <= 0) this.startReload();
    else if (!trigger && !this.full && this.sinceShot >= SHOOTING.idleReloadSeconds) this.startReload();
    return shots;
  }

  private startReload(): void {
    if (this.reloading > 0) return;
    this.reloadTotal = this.stats.reload;
    this.reloading = this.reloadTotal;
    this.events.push('reloadStart');
  }
}
