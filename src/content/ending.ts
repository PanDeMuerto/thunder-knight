import type { StringKey } from '@/content/strings';

/**
 * The campaign's end (M10, GDD §2 and §13): the Iron Baron's comedy escape when the Iron Ox falls, and the short scene
 * with Queen Ada after Battle 20's first win. Metres, seconds and radians; hues in degrees.
 */

/**
 * The escape: a small grey donkey (Quaternius' horse, shrunk, its ears stretched) trots up behind the fallen Ox, the
 * Baron hops out of his turret into the saddle and gallops off away from the banner, shaking his fist, until he's a
 * dot. He does it every time the Ox falls (Battle 20 and a Last Stand's Ox waves); the result card waits for it.
 */
export const ESCAPE = {
  donkey: {
    height: 1.2,
    /** Chunky: width, height, length against the horse's own shape. */
    shape: [1.12, 1, 0.9] as const,
    /** The ears' bones stretched along their length (a donkey's long ears). */
    ears: 2.1,
    /** The saddle, metres ahead of the back bone (which sits over the hips). */
    seatForward: 0.24,
    /** The horse's material colours, by name, repainted grey with a pale muzzle and belly. */
    paint: { Main: 0x8f867d, Main_Light: 0xd8d0c4, Main_Dark: 0x655d56, Hair: 0x3d3633, Muzzle: 0xeae3d6, Hooves: 0x3d3633 } as Record<string, number>,
  },
  /** The Baron on it: big for his donkey, charcoal armour, red cape, a gold crown (as in his turret). */
  baron: { dark: 0x3b4047, cloth: 0xa8322c, skin: 0xe2b48c, gold: 0xf2b632, tash: 0x5a3a22 },
  /** Where the donkey comes from (behind the Ox, seen from the banner) and where it waits (beside it). */
  from: { back: 9, side: 2.6 },
  /** The donkey's trot in, the Baron's hop from the turret to the saddle, the gallop away and the fade at the end. */
  trot: 1.3,
  hop: 0.6,
  hopHeight: 1.4,
  gallop: { seconds: 5.2, least: 1.5, speed: 5.6, rate: 1.25, dust: 0.22 },
  fade: 0.5,
  /** He's gone this far inside the field's hedge (where the routed run off). */
  edge: 7,
} as const;

export type EndingSpeaker = 'ada' | 'rosie';

/**
 * The scene after Battle 20's first win: a moment's fade, then the hero at the banner, Queen Ada walking up the hill to
 * him, four short lines at the bottom of the screen (tap, click or a key moves on; Skip ends it), everyone cheering;
 * then the ending card. Replays of Battle 20 go straight to the normal card.
 */
export const ENDING = {
  fade: 0.45,
  /** The hero stands just in front of the banner; Ada walks in from the west along the hilltop and faces him. */
  hero: { x: 1.3, z: -9.4 },
  ada: { from: { x: -5.6, z: -9.0 }, to: { x: -1.1, z: -9.4 }, speed: 1.5 },
  /**
   * The camera: in front of them (south), a little above, looking north at the pair in profile with the banner between
   * and behind them. Heights are above the ground under the target. Portrait steps back to fit both across.
   */
  shot: { pos: [0.2, 2.0, -1.6] as const, target: [0.1, 1.5, -10.2] as const, portraitBack: 2 },
  /** Each turns this far from the other toward the camera (radians), so the two read three-quarter on. */
  toCamera: 0.5,
  /** Seconds each line stays before the next comes by itself, and the shortest a press can cut it to. */
  lineSeconds: 3.6,
  minLine: 0.5,
  /** Who speaks, and what Ada does as she says it. */
  lines: [
    { who: 'ada', key: 'ending.line1', act: 'cheer' },
    { who: 'rosie', key: 'ending.line2', act: 'idle' },
    { who: 'ada', key: 'ending.line3', act: 'idle' },
    { who: 'rosie', key: 'ending.line4', act: 'cheer' },
  ] as readonly { who: EndingSpeaker; key: StringKey; act: 'idle' | 'cheer' }[],
} as const;
