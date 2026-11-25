import type { GunId } from './guns';

/** The gun models the hero has so far (Quaternius, `npm run assets:hero`); later guns borrow the nearest until M9 adds theirs. */
export type HeroGun = 'pistol' | 'shotgun' | 'smg' | 'rifle' | 'hunting' | 'mg' | 'launcher' | 'minigun' | 'rocket';

const MODEL: Record<GunId, HeroGun> = {
  pistol: 'pistol',
  shotgun: 'shotgun',
  smg: 'smg',
  assaultRifle: 'rifle',
  huntingRifle: 'hunting',
  machineGun: 'mg',
  grenadeLauncher: 'launcher',
  minigun: 'minigun',
  rocketLauncher: 'rocket',
};

export function heroGunFor(gun: GunId): HeroGun {
  return MODEL[gun];
}

/**
 * How the hero looks (M7, GDD §7, §18.1): KayKit's hooded rogue, a little taller than the soldiers (1.6 m), his green
 * cloth turned into an orange hoodie. Every gun is held in the right hand, arm out (`HeroModel`). Each gun: its length
 * in metres (a little oversized, so it reads from behind past the hood), and points in the model's own units: the grip
 * (on the palm), the muzzle (flash and tracers) and the ejection port (casings).
 */
export const HERO_LOOK = {
  height: 1.8,
  /** The model's height in its own units (hood to feet). */
  modelHeight: 2.25,
  /** Hues (degrees) turned to the hoodie's orange; the rogue's dark green is lifted to a bright orange. */
  cloth: { from: 70, to: 175, hue: 24, saturation: 1.3, light: 2.4 },
  /** The run clip's ground speed at the hero's size, m/s (the legs keep pace with it). */
  runSpeed: 4.2,
  /** Gun parts darker than this (linear lightness) are lifted to it: black guns vanish against the hood and gloves. */
  gunFloor: 0.045,
  /** The machine gun's added drum magazine, in the gun's own units (x along the barrel, y up). */
  mgDress: {
    color: 0x45484e,
    drum: { radius: 0.44, width: 0.36, at: [0.95, -0.42, 0] as [number, number, number] },
  },
  /**
   * A gun's look by its stars (GDD §8.1): at ★3 a red-dot sight on top, or a drum magazine under it (the shotgun and
   * the hunting rifle, which have their scope or no room on top); at ★5 two gold bands round it and a gold plate down
   * its sides. Sizes are in metres as held (the same on a pistol as on a rocket launcher; shares of a gun's length made
   * the pistol's sight invisible); where each sits is a share of the way from its grip to its muzzle.
   */
  stars: {
    star3: {
      pistol: 'sight',
      shotgun: 'drum',
      smg: 'sight',
      rifle: 'sight',
      hunting: 'drum',
      mg: 'sight',
      launcher: 'sight',
      minigun: 'sight',
      rocket: 'sight',
    } satisfies Record<HeroGun, 'sight' | 'drum'>,
    sight: { at: 0.32, length: 0.11, height: 0.05, width: 0.045, lens: 0.02 },
    drum: { at: 0.3, radius: 0.085, width: 0.06 },
    bands: { at: [0.5, 0.86] as [number, number], width: 0.035, gap: 0.01 },
    plate: { at: 0.25, length: 0.16, height: 0.035 },
    dark: 0x2b2f36,
    lens: 0xe0503c,
    gold: 0xf2b632,
  },
  /** The rocket launcher's added tube, warhead and sight, in the gun's own units. */
  rocketDress: {
    tube: 0x55603f,
    warhead: 0x8a3a2c,
    sight: 0x3d4148,
    body: { radius: 0.36, from: -1.3, to: 4.1, y: 0.12 },
    head: { radius: 0.34, length: 0.9 },
    scope: { size: [0.5, 0.22, 0.14] as [number, number, number], at: [1.6, 0.6, -0.18] as [number, number, number] },
  },
  /** The minigun's added barrels (they spin, `rotor`), collar and ammo box, in the gun's own units. */
  minigunDress: {
    metal: 0x3d4148,
    light: 0x6a6f78,
    box: 0x55603f,
    barrels: { count: 6, radius: 0.06, ring: 0.17, from: 1.2, to: 4.3, y: 0.32 },
    collar: { radius: 0.3, length: 0.14, at: [1.35, 3.95] as [number, number] },
    ammo: { size: [0.9, 0.62, 0.5] as [number, number, number], at: [0.45, -0.58, 0] as [number, number, number] },
    /** Full spin, radians a second. */
    spin: 30,
  },
  /** The grenade launcher's added tube over the barrel and revolving drum, in the gun's own units. */
  launcherDress: {
    color: 0x55603f,
    dark: 0x3a3d42,
    tube: { radius: 0.24, from: 1.75, to: 4.1, y: 0.34 },
    drum: { radius: 0.42, length: 0.75, at: 1.35, y: 0.3 },
  },
  guns: {
    pistol: { length: 0.42, grip: [0.12, -0.1, 0], muzzle: [1.48, 0.52, 0], port: [0.75, 0.62, 0] },
    shotgun: { length: 1.1, grip: [0.55, -0.15, 0], muzzle: [4.05, 0.32, 0], port: [1.7, 0.36, 0] },
    smg: { length: 0.85, grip: [0.05, -0.35, 0], muzzle: [2.25, 0.5, 0], port: [0.7, 0.62, 0] },
    rifle: { length: 1.0, grip: [0.03, -0.35, 0], muzzle: [3.82, 0.42, 0], port: [0.7, 0.55, 0] },
    hunting: { length: 1.25, grip: [-0.1, -0.15, 0], muzzle: [5.31, 0.35, 0], port: [0.6, 0.5, 0] },
    // The machine gun: the black rifle, drawn big and heavy (no CC0 machine gun fits).
    mg: { length: 1.2, grip: [0.03, -0.35, 0], muzzle: [3.61, 0.45, 0], port: [0.7, 0.6, 0] },
    // The grenade launcher: the short shotgun with a fat tube and a revolving drum (no CC0 launcher fits).
    launcher: { length: 1.1, grip: [0.55, -0.15, 0], muzzle: [4.1, 0.34, 0], port: [1.7, 0.36, 0] },
    // The minigun: the second SMG's body with six barrels that spin and an ammo box (no CC0 minigun fits).
    minigun: { length: 1.3, grip: [0.05, -0.3, 0], muzzle: [4.3, 0.32, 0], port: [0.6, 0.55, 0] },
    // The rocket launcher: the long pump shotgun inside a fat tube with a warhead (no CC0 launcher fits).
    rocket: { length: 1.35, grip: [0.55, -0.2, 0], muzzle: [5.0, 0.12, 0], port: [1.6, 0.4, 0] },
  } satisfies Record<HeroGun, { length: number; grip: readonly [number, number, number]; muzzle: readonly [number, number, number]; port: readonly [number, number, number] }>,
} as const;
