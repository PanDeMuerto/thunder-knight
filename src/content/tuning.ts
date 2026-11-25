/**
 * Feel and layout numbers in one place (GDD §5–7). Gameplay tables (guns, enemies, battles) get their own files in
 * this folder as they arrive.
 */

/** Poki's mobile pill moves down out of the HUD's way: in portrait below the top bars, in landscape a little down. */
export const POKI_PILL = {
  portrait: { topPercent: 30, topPx: 0 },
  landscape: { topPercent: 0, topPx: 24 },
} as const;

/** The over-the-shoulder rig (GDD §5.1). M1 tunes these by feel; the landscape and portrait sets blend by aspect. */
export const CAMERA = {
  near: 0.1,
  far: 600,
  landscape: { verticalFov: 55, shoulder: 0.85, pivotHeight: 2.1, distance: 5.2, pitch: -14 },
  portrait: { verticalFov: 72, shoulder: 0.45, pivotHeight: 2.3, distance: 6.0, pitch: -17 },
  /** Portrait keeps at least this much horizontal view. */
  minHorizontalFov: 55,
  maxVerticalFov: 80,
  minPitch: -55,
  maxPitch: 25,
  /** In portrait the crosshair (and the view's centre) sits this far down the screen, above the thumbs. */
  portraitCrosshairY: 0.45,
  /** Seconds for the camera's position to settle (critically damped). Rotation is never smoothed. */
  followTime: 0.08,
  /** Keep the camera this far above the ground, in metres. */
  groundClearance: 0.3,
  /** The camera is a ball this wide when it pulls in against props (GDD §5.1). */
  collisionRadius: 0.3,
  /** After a block clears, the camera eases back out at this rate (per second); pulling in is instant. */
  recoverRate: 5,
  /** The hero fades to `fadeOpacity` when the camera is closer than this, in metres. */
  fadeDistance: 1.8,
  fadeOpacity: 0.4,
  /** Closer still (backed against a wall), the hero all but disappears, so the view is never a wall of hoodie. */
  ghostDistance: 0.9,
  ghostOpacity: 0.12,
  /** Shake setting multipliers for the gun's view kick and punch (Off, Low, Full). */
  shake: { off: 0, low: 0.45, full: 1 },
  // Distance softens the field kit's far trees (M7); the battle itself (within 60 m) stays clear.
  fog: { near: 58, far: 175 },
} as const;

/**
 * Aim assist and auto-fire (GDD §6.4), adapted from Scrap Express. Assist is a bias, never a lock: it never turns
 * against the player's own look, and never reaches through props.
 */
export const AIM = {
  touch: {
    /** Shots bend toward a target inside this cone, in degrees. */
    cone: 7,
    /** Look slows to this share near a target. */
    friction: 0.55,
    /** The view drifts toward a target inside this cone while the player moves or turns. */
    magnetCone: 12,
    /** Degrees per second. */
    magnetRate: 25,
    /** Seconds on target before auto-fire starts, so it reads as a reaction. */
    autoFireDelay: 0.1,
    /** Bodies count as this much wider for hits and the cone. */
    hitScale: 1.3,
    /** How far a shot bends to the target inside the cone (1 = all the way). */
    bend: 1,
  },
  mouse: {
    cone: 3,
    friction: 0.8,
    magnetCone: 0,
    magnetRate: 0,
    autoFireDelay: 0.1,
    hitScale: 1.1,
    bend: 0.6,
  },
  /** The `strong` assist setting widens the cones and the magnet by this much. */
  strongScale: 1.5,
  /** A chosen target is kept until it leaves the cone by this many degrees (no flicker). */
  stickyMargin: 2,
  /** Friction starts this many degrees outside a body. */
  frictionMargin: 4,
} as const;

/** Gun handling that isn't per gun (GDD §6, §8.1). */
export const SHOOTING = {
  /** A magazine that isn't full tops itself up after this long without firing (casual-friendly; R or the ring still reloads early). */
  idleReloadSeconds: 2.5,
  /** Hit markers on the crosshair, in seconds: a hit, and a knockout. */
  hitMarker: 0.12,
  knockMarker: 0.24,
  /** Damage numbers rise this far (CSS px × --s) and last this long. */
  numberRise: 26,
  numberSeconds: 0.55,
  /** Directional damage arcs last this long. */
  arcSeconds: 0.9,
} as const;

/** The hero (GDD §7). */
export const HERO = {
  height: 1.8,
  radius: 0.4,
  speed: 5.0,
  /** How fast the hero turns to face the camera's direction while moving, in radians per second. */
  turnRate: 14,
  /** Seconds to reach full speed and to stop. */
  accelTime: 0.08,
} as const;

/** The greybox field for M0 and M1 (GDD §4.1). Real fields come from content/fields.ts in M3. */
export const GREYBOX = {
  size: 120,
  bannerAt: { x: 0, z: -12 },
  bannerHill: { radius: 15, height: 3 },
  truckAt: { x: 10, z: 6 },
  heroStart: { x: 0, z: 4 },
  /** Where Rosie serves: walk into this ring in a break and the shop opens (GDD §12.1). */
  shopSpot: { x: 7, z: 2.2, radius: 3 },
  /** Where a rift crate lands (GDD §12.3): on the far side of the truck from Rosie's ring. */
  crateAt: { x: 12.2, z: 1.8 },
  /** Battles start with the hero beside the truck, facing the banner (onboarding §4). */
  battleStart: { x: 5.5, z: 0.5 },
} as const;

/**
 * A purchase arrives (GDD §2, M8): a small crate drops out of a rift spark beside Rosie, lands with a thud and a puff
 * of dust, sits a moment and sinks away. Metres and seconds.
 */
export const DELIVERY = { at: { x: 8.1, z: 3.5 }, spread: 0.5, height: 6, fall: 0.55, stay: 1.4, sink: 0.4, size: 0.55 } as const;

/** A moment's freeze on big hits (M8): game time runs at `scale` for these many seconds. */
export const HIT_STOP = { scale: 0.06, rout: 0.07, bossHalf: 0.12, bossDown: 0.22 } as const;
