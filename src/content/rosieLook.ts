/**
 * Rosie at her truck (M7, GDD §2, §18.1): KayKit's red-haired rogue, her green tunic turned the truck's teal. She
 * stands in her ring (`GREYBOX.shopSpot`) behind the truck, and keeps an eye on the hero.
 */
export const ROSIE_LOOK = {
  height: 1.6,
  /** Hues (degrees) turned teal: the rogue's green, like the truck's paint (`fieldKit.ts`). */
  cloth: { from: 70, to: 175, hue: 176, saturation: 1, light: 1.25 },
  /** Where she stands: behind the tailgate (the truck's bed faces the banner), inside her ring. */
  at: { x: 9.1, z: 2.7 },
  /** She faces the hero while he's this near (metres), else the banner. */
  watch: 35,
  /** How fast she turns, radians per second. */
  turnRate: 3,
  /** In a break, while the hero is out of her ring, she waves him over this often (seconds). */
  waveEvery: 7,
} as const;
