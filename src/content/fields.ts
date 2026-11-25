/**
 * Region 1's field dressing (GDD §18, M7): pieces from the field kit (`npm run assets:field`, KayKit Medieval Hexagon,
 * CC0) placed round the greybox meadow. The play area stays open: the banner hill, the lanes from the north, west and
 * east edges where squads enter, and the Queen's camp to the south. Big pieces inside the field block the hero, shots
 * and the camera; soldiers path round the base dressing (it's in the flow field), and each battle's landmark stands
 * where enemies never go (the south and the far edges).
 */

export type PieceId =
  | 'windmill'
  | 'watermill'
  | 'homeA'
  | 'homeB'
  | 'well'
  | 'towerRed'
  | 'bridge'
  | 'fenceWood'
  | 'fenceStone'
  | 'wall'
  | 'wallGate'
  | 'treeA'
  | 'treeB'
  | 'treesLarge'
  | 'treesMedium'
  | 'treesSmall'
  | 'treesBLarge'
  | 'treesBMedium'
  | 'rockA'
  | 'rockB'
  | 'rockC'
  | 'reedA'
  | 'reedB'
  | 'reedC'
  | 'lilyA'
  | 'lilyB'
  | 'stump'
  | 'treeRound'
  | 'mountainA'
  | 'mountainB'
  | 'mountainC'
  | 'castle'
  | 'ruin'
  | 'wallCorner'
  | 'weaponrack'
  | 'treeBurnt'
  | 'treesBurnt'
  | 'stumpBurnt'
  | 'tent'
  | 'crate'
  | 'barrel'
  | 'sack'
  | 'wheelbarrow'
  | 'lumber'
  | 'flagRed'
  | 'truck'
  | 'carrot'
  | 'wheat';

/**
 * How much each piece is scaled up from the pack's tabletop size, so it sits right beside 1.6 m soldiers: houses
 * about 6 m tall, the windmill 10 m, trees 7 m, a fence at hip height.
 */
export const PIECE_SCALE: Record<PieceId, number> = {
  windmill: 7,
  watermill: 7,
  homeA: 7,
  homeB: 7,
  well: 5,
  towerRed: 7,
  bridge: 6,
  fenceWood: 2.6,
  fenceStone: 3,
  wall: 4,
  wallGate: 4,
  treeA: 6,
  treeB: 6,
  treesLarge: 7,
  treesMedium: 7,
  treesSmall: 7,
  treesBLarge: 7,
  treesBMedium: 7,
  rockA: 8,
  rockB: 8,
  rockC: 8,
  // The Riverlands' reeds (about 1.3 m) and lilies (about 1 m across), a cut stump; the Highland Pass's mountains.
  reedA: 5.5,
  reedB: 5.5,
  reedC: 5.5,
  lilyA: 5,
  lilyB: 5,
  stump: 4,
  // Quaternius' round tree is at real scale (5.9 m): a little taller in the Riverlands.
  treeRound: 1.35,
  mountainA: 18,
  mountainB: 18,
  mountainC: 18,
  // The Iron Keep: the castle and the ruin at the towers' scale, the burnt orchard at the trees'.
  castle: 7,
  ruin: 7,
  wallCorner: 4,
  weaponrack: 5,
  treeBurnt: 6,
  treesBurnt: 7,
  stumpBurnt: 4,
  tent: 6,
  crate: 5,
  barrel: 5,
  sack: 5,
  wheelbarrow: 5,
  lumber: 5,
  flagRed: 6,
  truck: 1,
  // The farm set's crops are at real scale: a 0.45 m turnip top, waist-high wheat.
  carrot: 0.16,
  wheat: 0.85,
};

export interface Placement {
  piece: PieceId;
  x: number;
  z: number;
  /** Turn, radians. */
  rot?: number;
  /** Times the piece's usual scale. */
  size?: number;
  /** Blocks the hero, shots and the camera (big pieces inside the field). */
  solid?: boolean;
  /** Metres sunk into the ground: the pack's tile pieces (crop fields) are thick blocks, and only their top shows. */
  sink?: number;
}

const P = (piece: PieceId, x: number, z: number, rot = 0, size = 1, solid = false): Placement => ({ piece, x, z, rot, size, solid });

/** Crops in rows across a patch (centre, width along x, depth along z), each plant a little turned and sized. */
function rows(piece: PieceId, cx: number, cz: number, width: number, depth: number, along: number, apart: number): Placement[] {
  const out: Placement[] = [];
  let n = 0;
  for (let z = cz - depth / 2 + apart / 2; z < cz + depth / 2; z += apart) {
    for (let x = cx - width / 2 + along / 2; x < cx + width / 2; x += along) {
      n++;
      out.push(P(piece, x + ((n * 37) % 7) * 0.03, z, (n * 1.7) % 6.28, 0.85 + ((n * 13) % 5) * 0.06));
    }
  }
  return out;
}

/** Trees round the outside of the edge wall, so the field is a clearing, and a far forest behind the Baron's reserves. */
function treeLine(kinds: readonly PieceId[] = ['treesBLarge', 'treesBMedium', 'treesBLarge', 'treesSmall']): Placement[] {
  const out: Placement[] = [];
  // Region 1: the rounded cone trees, smooth silhouettes, calmer than the tiered pines at a distance.
  let k = 0;
  for (let t = -60; t <= 60; t += 18) {
    // West and east sides, then the south; the north stays open for the backdrop army on the far hills.
    out.push(P(kinds[k++ % 4]!, -68, t, t * 0.1, 1));
    out.push(P(kinds[k++ % 4]!, 68, t + 6, t * 0.07, 1));
    out.push(P(kinds[k++ % 4]!, t + 4, 68, t * 0.05, 1));
  }
  // Far beyond the north wall, behind the backdrop army (z −78 to −84): one sparse row of pines in the fog. Dense
  // thin trees read as noise for a casual eye (feedback-calm-visuals), so the gaps are wide.
  for (let x = -120; x <= 120; x += 26) out.push(P(kinds[0]!, x + (k++ % 3) * 4, -104, x * 0.03, 1.4));
  return out;
}

/**
 * Each region's tree line beyond the hedge (M9): Region 1's cone pines; the Riverlands' round leafy trees in clumps.
 * Not solid (outside the field), so it can change between battles without touching the crowd's paths.
 */
export const TREE_LINES: Record<number, Placement[]> = {
  1: treeLine(),
  2: [
    ...treeLine(['treeRound', 'treeRound', 'treesBMedium', 'treeRound']),
    // Clumps: a second round tree beside each, so the line reads as woodland, not a row.
    ...treeLine(['treeRound', 'treeRound', 'treeRound', 'treeRound']).map((p) => ({ ...p, x: p.x + 5, z: p.z + 4, size: (p.size ?? 1) * 0.85 })),
    // A third, staggered half a step along, so the woods have no gaps.
    ...treeLine(['treeRound', 'treesBMedium', 'treeRound', 'treeRound']).map((p) => ({ ...p, x: p.x + (Math.abs(p.x) > 60 ? 0 : 9), z: p.z + (Math.abs(p.x) > 60 ? 9 : 0), size: (p.size ?? 1) * 1.1 })),
  ],
  // The Highland Pass: the tiered pines, two deep, and grassy mountains rising behind them in the fog (few and big,
  // so the skyline stays calm).
  3: [
    ...treeLine(['treesLarge', 'treesMedium', 'treesLarge', 'treesBLarge']),
    ...treeLine(['treesMedium', 'treesLarge', 'treesMedium', 'treesLarge']).map((p) => ({ ...p, x: p.x + (Math.abs(p.x) > 60 ? Math.sign(p.x) * 7 : 9), z: p.z + (Math.abs(p.x) > 60 ? 9 : 7), size: (p.size ?? 1) * 1.1 })),
    ...mountains(),
  ],
  // The Iron Keep: the Baron's burnt orchards, charcoal trees with stumps between them, thinner than the woods
  // before (cleared land round a castle); and the Keep itself far north in the mist, walls and towers either side.
  4: [
    ...treeLine(['treeBurnt', 'treesBurnt', 'treeBurnt', 'stumpBurnt']),
    ...treeLine(['stumpBurnt', 'treeBurnt', 'treesBurnt', 'treeBurnt']).map((p) => ({ ...p, x: p.x + (Math.abs(p.x) > 60 ? Math.sign(p.x) * 8 : 9), z: p.z + (Math.abs(p.x) > 60 ? 9 : 8) })),
    ...ironKeep(),
  ],
};

/** The Iron Keep on the northern skyline (Region 4): the castle, its walls and two towers, about 130 m out. */
function ironKeep(): Placement[] {
  return [
    P('castle', 0, -132, 0, 2.6),
    P('wall', -26, -124, 0, 2.4),
    P('wall', -45, -124, 0, 2.4),
    P('wall', 26, -124, 0, 2.4),
    P('wall', 45, -124, 0, 2.4),
    P('wallCorner', -60, -124, 0, 2.4),
    P('wallCorner', 60, -124, Math.PI / 2, 2.4),
    P('towerRed', -36, -120, 0.4, 1.7),
    P('towerRed', 36, -120, 2.8, 1.7),
  ];
}

/** The Highland Pass's mountains: a ring far outside the field, open in the north where the Baron's reserves stand. */
function mountains(): Placement[] {
  const kinds: PieceId[] = ['mountainA', 'mountainB', 'mountainC'];
  // About 30 m tall, 130–150 m out: low ridges in the fog above the pines, not cliffs.
  const spots: [number, number, number][] = [
    [-105, -112, 0.8],
    [-45, -140, 0.7],
    [40, -142, 0.75],
    [100, -110, 0.85],
    [-140, -35, 0.75],
    [-138, 40, 0.7],
    [140, -25, 0.8],
    [136, 45, 0.7],
    [-90, 115, 0.7],
    [15, 142, 0.8],
    [95, 112, 0.7],
  ];
  return spots.map(([x, z, size], k) => P(kinds[k % 3]!, x, z, k * 1.3, size));
}

/**
 * Each region's ground (M9), multiplied over the meadow's colours: Region 4's is drier and browner, the Baron's
 * trampled land. 1 (white) leaves the meadow as it is.
 */
export const GROUND_TINT: Record<number, number> = { 1: 0xffffff, 2: 0xffffff, 3: 0xffffff, 4: 0xdbcca2 };

/**
 * The Riverlands' river banks (M9): reeds in small clumps along both banks of a battle's stream, and water lilies on a
 * wide one. Spaced evenly with a fixed jitter, so a battle always looks the same.
 */
export function riverDressing(stream: { points: readonly (readonly [number, number])[]; width: number }): Placement[] {
  const out: Placement[] = [];
  const reeds: PieceId[] = ['reedA', 'reedB', 'reedC'];
  let n = 0;
  const jitter = (k: number): number => ((Math.sin(k * 12.9898) * 43758.5453) % 1 + 1) % 1;
  for (let s = 0; s + 1 < stream.points.length; s++) {
    const [ax, az] = stream.points[s]!;
    const [bx, bz] = stream.points[s + 1]!;
    const len = Math.hypot(bx - ax, bz - az);
    const dx = (bx - ax) / len;
    const dz = (bz - az) / len;
    for (let t = 1.5; t < len; t += 3.2) {
      const side = n % 2 === 0 ? 1 : -1;
      const off = stream.width / 2 + 0.4 + jitter(n) * 0.8;
      const x = ax + dx * t - dz * off * side;
      const z = az + dz * t + dx * off * side;
      out.push(P(reeds[n % 3]!, x, z, jitter(n + 7) * 6.28, 0.8 + jitter(n + 3) * 0.5));
      if (jitter(n + 11) > 0.5) out.push(P(reeds[(n + 1) % 3]!, x + dx * 0.9, z + dz * 0.9, jitter(n + 5) * 6.28, 0.7));
      if (stream.width >= 5 && n % 3 === 0) {
        const w = (jitter(n + 13) - 0.5) * stream.width * 0.5;
        out.push(P(n % 2 ? 'lilyA' : 'lilyB', ax + dx * t - dz * w, az + dz * t + dx * w, jitter(n + 17) * 6.28, 1));
      }
      n++;
    }
  }
  return out;
}

/** The dressing every battle shares (the tree line comes from its region, `TREE_LINES`). */
export const REGION1_BASE: Placement[] = [
  // A few rocks and trees near the edges, clear of the squads' lanes.
  P('rockA', -46, 22, 0.4, 1, true),
  P('rockB', 44, 28, 1.2, 1.2, true),
  P('rockC', -50, -8, 2, 1, true),
  P('rockA', 50, -6, 0.9, 1.1, true),
  P('treeA', -40, 40, 0, 1, true),
  P('treeB', 42, 44, 0.6, 1.1, true),
  P('treeA', 30, 50, 1.2, 0.9, true),
  P('treeB', -26, 52, 2.1, 1, true),
  // The Queen's camp by Rosie's truck: crates, a barrel, sacks (the truck itself is placed by the field).
  P('crate', 14, 9.5, 0.3),
  P('crate', 15, 8.4, 1.1, 0.8),
  P('barrel', 13.6, 10.8, 0),
  P('sack', 15.2, 10.6, 0.5),
  // A low stone wall either side of the south road.
  P('fenceStone', -5, 40, Math.PI / 2, 1),
  P('fenceStone', -5, 44, Math.PI / 2, 1),
  P('fenceStone', 5, 40, Math.PI / 2, 1),
  P('fenceStone', 5, 44, Math.PI / 2, 1),
];

/**
 * Each battle's landmark (GDD §13.2: The Mill, Turnip Field, Old Stone Bridge, Hollow Farm, Grudge's Hill), where
 * enemies never walk: the south-west behind the Queen's camp, or beyond the north hedge for the Baron's camp.
 */
export const LANDMARKS: Record<number, Placement[]> = {
  // The windmill's sails face the field.
  1: [P('windmill', -34, 20, 0.6 + Math.PI / 2, 1, true), P('homeA', -44, 30, 2.4, 1, true), P('lumber', -28, 26, 0.2), P('wheelbarrow', -30, 15, 1)],
  2: [
    ...rows('carrot', -34, 24, 11, 8, 1.1, 1.3),
    ...rows('wheat', -34, 38, 11, 7, 0.9, 1.1),
    P('homeB', -48, 40, 2.6, 1, true),
    P('fenceWood', -24, 27, Math.PI / 2, 1),
    P('fenceWood', -24, 33, Math.PI / 2, 1),
  ],
  // The bridge spans the stream (STREAMS) where it runs south along the west side.
  3: [P('bridge', -40, 26, Math.PI / 2, 1.4, true), P('watermill', -50, 36, 2.2, 1, true), P('rockB', -31, 32, 0.7, 1.3, true)],
  4: [
    P('homeA', -34, 24, 0.9, 1, true),
    P('homeB', -44, 34, 2.8, 1, true),
    P('well', -30, 34, 0, 1, true),
    P('fenceWood', -26, 20, 0, 1),
    P('fenceWood', -21, 20, 0, 1),
    P('crate', -38, 18, 0.4),
  ],
  // The Baron's camp on the far side: his tower, tents and red flags beyond the north hedge.
  5: [
    P('towerRed', -30, -72, 0.4, 1.2),
    P('tent', -16, -68, 0.8),
    P('tent', 14, -69, 2.2),
    P('tent', 26, -70, 1.4),
    P('flagRed', -6, -66, 0),
    P('flagRed', 6, -66, 0),
  ],
  // Region 2, the Riverlands (M9 part 1; their own field kit comes later in M9). Ford of Reeds: a wide river down the
  // west side, crossed by stepping stones, with reeds (tall grass) on both banks.
  6: [
    P('rockA', -37.5, 22, 0.3, 1.2, true),
    P('rockB', -39.5, 26, 1.2, 1, true),
    P('rockC', -38, 30, 2.1, 1.1, true),
    ...rows('wheat', -31.5, 34, 2.2, 9, 1, 1.2),
    ...rows('wheat', -47, 16, 2.2, 8, 1, 1.2),
    ...rows('wheat', -48.5, 40, 2.2, 6, 1, 1.2),
    P('treeA', -52, 30, 0.4, 1, true),
    P('lumber', -30, 16, 1.2),
  ],
  // Marsh Village: two cottages and a well on muddy ground, a marsh channel and reeds.
  7: [
    P('homeA', -44, 21, 2, 1, true),
    P('homeB', -36, 41, 2.8, 1, true),
    P('well', -37, 29, 0, 1, true),
    ...rows('wheat', -51, 34, 3, 6, 1, 1.1),
    ...rows('wheat', -30, 22, 2.2, 5, 1, 1.1),
    P('barrel', -40, 17, 0),
    P('sack', -41.2, 17.6, 0.6),
    P('fenceWood', -29, 30, Math.PI / 2, 1),
  ],
  // The Ferry: a raft of logs at the river's landing, mooring posts, and the ferryman's hut on the far bank.
  8: [
    P('lumber', -39, 25, Math.PI / 2, 1.6),
    P('lumber', -39, 27.5, Math.PI / 2, 1.6),
    P('fenceWood', -34.5, 23, Math.PI / 2, 0.7),
    P('fenceWood', -34.5, 30, Math.PI / 2, 0.7),
    P('homeB', -50, 30, 1.4, 1, true),
    P('barrel', -32, 27, 0),
    P('crate', -31.5, 24.5, 0.5),
    ...rows('wheat', -46, 44, 2.2, 6, 1, 1.2),
  ],
  // The Long Road: the old road the War Wagon comes down, with fences and milestones along it.
  10: [
    P('fenceWood', -5, -48, 0, 1),
    P('fenceWood', -5, -40, 0.05, 1),
    P('fenceWood', 5, -44, -0.05, 1),
    P('fenceWood', 5, -36, 0, 1),
    P('rockC', -4.5, -28, 0.4, 0.6),
    P('rockA', 4.5, -52, 1.2, 0.6),
    P('wheelbarrow', -30, 18, 2.4),
    P('crate', -28, 22, 0.3),
  ],
  // Region 3, the Highland Pass (M9 part 4). Pine Gate: an old stone gate between pines on the south-west, the road
  // to the Queen's camp running through it.
  11: [
    P('wall', -42, 20, Math.PI / 2, 1, true),
    P('wallGate', -42, 28, Math.PI / 2, 1, true),
    P('wall', -42, 36, Math.PI / 2, 1, true),
    P('flagRed', -39.5, 23.6, 0),
    P('flagRed', -39.5, 32.4, 0),
    P('treesLarge', -52, 20, 0.4, 0.75, true),
    P('treesMedium', -53, 37, 1.1, 0.8, true),
    P('treesMedium', -40, 44, 2.2, 0.7, true),
    P('rockB', -34, 40, 0.7, 0.9, true),
    P('stump', -32, 25, 0.5),
    P('stump', -35, 17, 2.1),
  ],
  // Old Watchtower: the tower on a rise to the south-west, rocks round its foot, crates of the Queen's supplies.
  12: [
    P('towerRed', -40, 28, 2.4, 1.1, true),
    P('rockA', -33, 22, 0.3, 1.2, true),
    P('rockC', -47, 36, 1.4, 1.1, true),
    P('rockB', -45, 20, 2.6, 0.9, true),
    P('crate', -34, 31, 0.5),
    P('crate', -35.2, 32.6, 1.1),
    P('barrel', -32.5, 29.5, 0),
    P('treesMedium', -52, 28, 0.9, 0.9, true),
    P('stump', -29, 18, 1.7),
  ],
  // Shepherd's Rest: a shepherd's cottage with a fenced fold, sacks of feed and a well.
  13: [
    P('homeB', -44, 34, 2.2, 1, true),
    P('well', -32, 30, 0, 1, true),
    P('fenceWood', -30, 18, 0, 1),
    P('fenceWood', -36, 16.5, 0.3, 1),
    P('fenceWood', -27.5, 23, Math.PI / 2, 1),
    P('fenceWood', -42, 18, 0.9, 1),
    P('sack', -34, 21, 0.4),
    P('sack', -35.2, 21.8, 1.3),
    P('barrel', -38, 26, 0),
    P('treesMedium', -52, 22, 0.6, 0.8, true),
    P('stump', -29, 34, 1.1),
  ],
  // Cliffside: the pass narrows under a cliff on the west; boulders lie where they fell.
  14: [
    P('mountainC', -74, 12, 0.4, 0.75),
    P('mountainA', -70, 40, 2.1, 0.6),
    P('rockA', -36, 20, 0.3, 1.4, true),
    P('rockC', -42, 30, 1.8, 1.6, true),
    P('rockB', -31, 32, 2.6, 1.1, true),
    P('rockA', -48, 22, 1.1, 1, true),
    P('treesLarge', -52, 36, 0.4, 0.7, true),
    P('lumber', -30, 24, 0.9),
  ],
  // Pass of Echoes: the pass's walls close in on both sides, boulders at their feet; beyond the north hedge, the
  // Baron's camp where the Siege Tower was built (his tower, tents and red flags, as at Grudge's Hill).
  15: [
    P('mountainB', -72, -20, 0.7, 0.65),
    P('mountainC', -74, 22, 2.4, 0.7),
    P('mountainA', 73, -12, 1.6, 0.65),
    P('mountainB', 75, 26, 0.2, 0.6),
    P('rockA', -38, 22, 0.6, 1.3, true),
    P('rockC', -46, 32, 2.2, 1.2, true),
    P('rockB', -32, 34, 1.4, 1, true),
    P('lumber', -29, 20, 0.4),
    P('lumber', -30.5, 21.8, 0.5),
    P('towerRed', 32, -74, 2.6, 1.1),
    P('tent', 14, -70, 1.9),
    P('tent', -14, -69, 0.7),
    P('flagRed', -5, -66, 0),
    P('flagRed', 5, -66, 0),
  ],
  // Region 4, the Iron Keep (M9 part 7). Burnt Orchard: the Baron burned the Queen's orchard; charcoal trees in rows,
  // stumps, and a burnt-out farmhouse.
  16: [
    ...rows('treeBurnt', -40, 28, 16, 14, 5.5, 5),
    P('ruin', -48, 16, 0.8, 1, true),
    P('stumpBurnt', -30, 18, 0.4),
    P('stumpBurnt', -33, 41, 1.9),
    P('wheelbarrow', -29, 25, 2.1),
  ],
  // Moat Road: the road runs along the castle's moat on the west, a stone bridge over it to a gate in the outer wall.
  17: [
    P('bridge', -40, 24, Math.PI / 2, 1.4, true),
    P('wall', -50, 8, Math.PI / 2, 1.2, true),
    P('wall', -50, 17.6, Math.PI / 2, 1.2, true),
    P('wallGate', -50, 27.2, Math.PI / 2, 1.2, true),
    P('wall', -50, 36.8, Math.PI / 2, 1.2, true),
    P('wallCorner', -50, 46.4, Math.PI, 1.2, true),
    P('weaponrack', -31, 30, Math.PI / 2),
    P('flagRed', -46, 22, 0),
    P('flagRed', -46, 32, 0),
  ],
  // The Gatehouse: the outer wall's gatehouse on the south-west, a red tower either side of the gate, banners.
  18: [
    P('wall', -50, 8, Math.PI / 2, 1.2, true),
    P('wall', -50, 17.6, Math.PI / 2, 1.2, true),
    P('wallGate', -50, 27.2, Math.PI / 2, 1.2, true),
    P('wall', -50, 36.8, Math.PI / 2, 1.2, true),
    P('towerRed', -50, 21, 0.3, 0.9, true),
    P('towerRed', -50, 33.4, 2.4, 0.9, true),
    P('flagRed', -45.5, 24, 0),
    P('flagRed', -45.5, 30.4, 0),
    P('weaponrack', -38, 26, Math.PI / 2),
    P('crate', -36, 18, 0.4),
    P('barrel', -36.5, 33, 0),
  ],
  // Inner Bailey: inside the outer wall, the Baron's yard: a well, tents, weapon racks, crates, a burnt-out house.
  19: [
    P('well', -34, 28, 0, 1, true),
    P('tent', -44, 18, 1.2),
    P('tent', -46, 34, 2.6),
    P('weaponrack', -30, 20, 0.3),
    P('weaponrack', -38, 38, 1.6),
    P('ruin', -52, 26, 1.5, 0.9, true),
    P('crate', -29, 32, 0.6),
    P('crate', -30, 33.4, 1.2),
    P('barrel', -40, 24, 0),
    P('flagRed', -36, 16, 0),
  ],
  // The Iron Keep: the Keep's own wall just beyond the north hedge, its gate where the Baron's army marches out, red
  // towers and banners; the castle itself behind it on the skyline.
  20: [
    P('wall', -40, -70, 0, 1.6),
    P('wall', -27, -70, 0, 1.6),
    P('wall', -14, -70, 0, 1.6),
    P('wallGate', 0, -70, 0, 1.6),
    P('wall', 14, -70, 0, 1.6),
    P('wall', 27, -70, 0, 1.6),
    P('wall', 40, -70, 0, 1.6),
    P('towerRed', -9, -73, 0.2, 1.3),
    P('towerRed', 9, -73, 2.9, 1.3),
    P('flagRed', -5, -66, 0),
    P('flagRed', 5, -66, 0),
    P('ruin', -44, 22, 2.2, 0.9, true),
    P('weaponrack', -32, 26, 1.1),
  ],
  // Willow Palisade: a stake wall in an arc round the willows, with a gap where the road runs through.
  9: [
    P('fenceWood', -27, 18, 0.2, 1.1),
    P('fenceWood', -30, 23, 0.6, 1.1),
    P('fenceWood', -32, 28.5, 1.0, 1.1),
    P('fenceWood', -36, 37, 1.3, 1.1),
    P('fenceWood', -41, 41, 1.7, 1.1),
    P('treeA', -42, 26, 0.3, 1.3, true),
    P('treeB', -46, 33, 1.1, 1.2, true),
    P('treeA', -38, 18, 2.2, 1.1, true),
    P('tent', -48, 22, 0.9),
  ],
};

/** A stream for a battle's landmark (Old Stone Bridge): the line its middle follows, and its width. */
export const STREAMS: Record<number, { points: readonly [number, number][]; width: number }> = {
  // Moat Road's moat: a straight, wide channel along the west, the castle's outer wall behind it.
  17: {
    points: [
      [-40, -14],
      [-40, 8],
      [-40, 30],
      [-40, 56],
    ],
    width: 7,
  },
  3: {
    points: [
      [-37, -6],
      [-39, 8],
      [-40, 26],
      [-42, 42],
      [-46, 58],
      [-50, 76],
    ],
    width: 4.5,
  },
  // Ford of Reeds: the same bend of river, wider and shallower.
  6: {
    points: [
      [-37, -6],
      [-39, 8],
      [-39.5, 26],
      [-42, 42],
      [-46, 58],
      [-50, 76],
    ],
    width: 7,
  },
  // The Ferry: the river runs past the landing.
  8: {
    points: [
      [-38, -6],
      [-40, 8],
      [-41, 26],
      [-43, 42],
      [-47, 58],
      [-51, 76],
    ],
    width: 6,
  },
  // Marsh Village: a narrow marsh channel winding past the cottages.
  7: {
    points: [
      [-56, 12],
      [-48, 26],
      [-50, 36],
      [-45, 48],
      [-47, 62],
    ],
    width: 3.2,
  },
};

/** Tilled soil under a battle's crops (Turnip Field): centre, width (x) and depth (z) in metres. */
export const SOIL: Record<number, { x: number; z: number; width: number; depth: number }[]> = {
  2: [
    { x: -34, z: 24, width: 12.5, depth: 9.5 },
    { x: -34, z: 38, width: 12.5, depth: 8.5 },
  ],
  // Marsh Village's mud round the well.
  7: [{ x: -39, z: 30, width: 11, depth: 9 }],
  // The Long Road: a packed-earth road from the north edge to the banner's hill.
  10: [{ x: 0, z: -41, width: 5, depth: 38 }],
};

/**
 * Queen Ada's banner (GDD §4.1, §18.1, M7): a wooden pole with a gold knob and a crossbar, and a swallow-tailed blue
 * flag with a gold crown near the pole. The flag carries a gentle, still ripple (no motion: the look stays calm).
 * Metres; `ripple` is the flag's sideways bend at its far end.
 */
export const BANNER_LOOK = {
  pole: { height: 6, radius: 0.08, color: 0x6b4a2b },
  knob: { radius: 0.14, color: 0xf2b632 },
  flag: { width: 2.3, height: 1.5, top: 5.85, notch: 0.5, ripple: 0.14, waves: 1.3, color: 0x3b74d6 },
  crown: { size: 0.62, at: 0.62, color: 0xf2b632 },
} as const;

/**
 * The meadow's ground (M7, GDD §18.1): very soft, large patches of lighter and darker grass, and a worn track where the
 * armies come down to the banner and on to the camp. Kept faint: the look stays calm (`tools/qa/noise.py`).
 * `patches.amount`: the patches' lightness swing (share); `wavelengths`: metres. Track points run north to the camp.
 */
export const GROUND_LOOK = {
  patches: { amount: 0.045, wavelengths: [41, 26] },
  track: {
    points: [
      [-6, -62],
      [-3, -44],
      [-1, -30],
      [0, -19],
    ],
    camp: [
      [0.5, -5.5],
      [3, -1.5],
      [6.5, 1.8],
    ],
    /** Half-width of the worn middle, and the soft edge beyond it, metres. */
    half: 1.1,
    soft: 1.6,
    color: 0xb3b06e,
    strength: 0.42,
  },
} as const;
