// Builds Region 1's field kit from the CC0 KayKit Medieval Hexagon pack (Kay Lousberg) and the CC0 pickup truck from
// Poly Pizza (Quaternius/Kenney), both in C:\PROJECTS\ASSETS.
//   npm run assets:field
// Every piece becomes one named node in public/assets/field/kit.glb, its parts joined into as few meshes as their
// materials allow, at the pack's own (tabletop) scale: content/fields.ts scales them up. The pack's single palette
// texture is stored once per file. The vendor packs themselves are never copied into the repo.
// M11: the pieces only later regions use (src/content/kitLater.json) go in kit-later.glb instead, which the game
// fetches after its first load, so a new player's download is Region 1's.
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { dedup, flatten, join, mergeDocuments, prune, quantize, weld } from '@gltf-transform/functions';

const HEX = process.env.KAYKIT_HEX ?? 'C:/PROJECTS/ASSETS/3D/kaykit-medieval-hexagon/addons/kaykit_medieval_hexagon_pack/Assets/gltf';
const FARM = process.env.POLYPIZZA_FARM ?? 'C:/PROJECTS/ASSETS/3D/polypizza-farm';
const TREES = process.env.QUATERNIUS_TREES ?? 'C:/PROJECTS/ASSETS/3D/quaternius-trees';
const OUT = fileURLToPath(new URL('../../public/assets/field/', import.meta.url));

/** The game's name for each piece → its file. Region 1 is the Queen's land: blue roofs; the Baron's camp is red. */
const PIECES = {
  windmill: `${HEX}/buildings/blue/building_windmill_blue.gltf`,
  watermill: `${HEX}/buildings/blue/building_watermill_blue.gltf`,
  homeA: `${HEX}/buildings/blue/building_home_A_blue.gltf`,
  homeB: `${HEX}/buildings/blue/building_home_B_blue.gltf`,
  well: `${HEX}/buildings/blue/building_well_blue.gltf`,
  towerRed: `${HEX}/buildings/red/building_tower_A_red.gltf`,
  bridge: `${HEX}/buildings/neutral/building_bridge_A.gltf`,
  fenceWood: `${HEX}/buildings/neutral/fence_wood_straight.gltf`,
  fenceStone: `${HEX}/buildings/neutral/fence_stone_straight.gltf`,
  wall: `${HEX}/buildings/neutral/wall_straight.gltf`,
  wallGate: `${HEX}/buildings/neutral/wall_straight_gate.gltf`,
  treeA: `${HEX}/decoration/nature/tree_single_A.gltf`,
  treeB: `${HEX}/decoration/nature/tree_single_B.gltf`,
  treesLarge: `${HEX}/decoration/nature/trees_A_large.gltf`,
  treesMedium: `${HEX}/decoration/nature/trees_A_medium.gltf`,
  treesSmall: `${HEX}/decoration/nature/trees_B_small.gltf`,
  treesBLarge: `${HEX}/decoration/nature/trees_B_large.gltf`,
  treesBMedium: `${HEX}/decoration/nature/trees_B_medium.gltf`,
  rockA: `${HEX}/decoration/nature/rock_single_A.gltf`,
  rockB: `${HEX}/decoration/nature/rock_single_B.gltf`,
  rockC: `${HEX}/decoration/nature/rock_single_C.gltf`,
  // The Riverlands (M9): reeds, water lilies and a cut stump; the Highland Pass's grassy mountains.
  reedA: `${HEX}/decoration/nature/waterplant_A.gltf`,
  reedB: `${HEX}/decoration/nature/waterplant_B.gltf`,
  reedC: `${HEX}/decoration/nature/waterplant_C.gltf`,
  lilyA: `${HEX}/decoration/nature/waterlily_A.gltf`,
  lilyB: `${HEX}/decoration/nature/waterlily_B.gltf`,
  stump: `${HEX}/decoration/nature/tree_single_A_cut.gltf`,
  // Quaternius' round broadleaf tree (CC0, Poly Pizza): the Riverlands' woods.
  treeRound: `${TREES}/tree-round.glb`,
  mountainA: `${HEX}/decoration/nature/mountain_A_grass_trees.gltf`,
  mountainB: `${HEX}/decoration/nature/mountain_B_grass.gltf`,
  mountainC: `${HEX}/decoration/nature/mountain_C_grass_trees.gltf`,
  // The Iron Keep (M9, Region 4): the Baron's castle, a ruin, wall corners, a weapon rack, and the burnt orchard:
  // KayKit's trees and a cut tree darkened to charcoal (`tint`). (Its barracks, forge and second tower cost 480 KB for
  // little the red tower doesn't already say.)
  castle: `${HEX}/buildings/red/building_castle_red.gltf`,
  ruin: `${HEX}/buildings/neutral/building_destroyed.gltf`,
  wallCorner: `${HEX}/buildings/neutral/wall_corner_A_outside.gltf`,
  weaponrack: `${HEX}/decoration/props/weaponrack.gltf`,
  // (The game turns their leaves charcoal at load, `fieldKit.ts`; the tint darkens the trunks.)
  treeBurnt: { file: `${HEX}/decoration/nature/tree_single_A.gltf`, tint: [0.78, 0.74, 0.7] },
  treesBurnt: { file: `${HEX}/decoration/nature/trees_A_medium.gltf`, tint: [0.78, 0.74, 0.7] },
  stumpBurnt: { file: `${HEX}/decoration/nature/tree_single_B_cut.gltf`, tint: [0.5, 0.46, 0.42] },
  tent: `${HEX}/decoration/props/tent.gltf`,
  crate: `${HEX}/decoration/props/crate_A_big.gltf`,
  barrel: `${HEX}/decoration/props/barrel.gltf`,
  sack: `${HEX}/decoration/props/sack.gltf`,
  wheelbarrow: `${HEX}/decoration/props/wheelbarrow.gltf`,
  lumber: `${HEX}/decoration/props/resource_lumber.gltf`,
  flagRed: `${HEX}/decoration/props/flag_red.gltf`,
  truck: `${FARM}/truck.glb`,
  carrot: `${FARM}/carrot.glb`,
  wheat: `${FARM}/wheat.glb`,
};

const LATER = new Set(JSON.parse(readFileSync(new URL('../../src/content/kitLater.json', import.meta.url), 'utf8')).later);
for (const name of LATER) if (!(name in PIECES)) throw new Error(`kitLater.json names ${name}, which isn't a piece`);

mkdirSync(OUT, { recursive: true });
const io = new NodeIO();

/** Builds one kit file from the pieces `pick` keeps. */
async function buildKit(file, pick) {
const kit = new (await import('@gltf-transform/core')).Document();
kit.createBuffer();
const scene = kit.createScene('kit');
kit.getRoot().setDefaultScene(scene);

for (const [name, entry] of Object.entries(PIECES)) {
  if (!pick(name)) continue;
  const { file, tint } = typeof entry === 'string' ? { file: entry, tint: null } : entry;
  const doc = await io.read(file);
  // A tinted piece (the burnt orchard): its materials' colour multiplied down, so the shared palette reads charred.
  if (tint) for (const m of doc.getRoot().listMaterials()) m.setBaseColorFactor([tint[0], tint[1], tint[2], 1]).setName(`${m.getName()}-${name}`);
  for (const anim of doc.getRoot().listAnimations()) anim.dispose();
  // Within the piece: its parts joined into as few meshes as its materials allow (fewer draw calls).
  await doc.transform(flatten(), join({ keepNamed: false }), weld(), prune());
  // One node per piece: its scene's roots go under a new node named for the game.
  const holder = doc.createNode(name);
  for (const s of doc.getRoot().listScenes()) {
    for (const child of s.listChildren()) {
      s.removeChild(child);
      holder.addChild(child);
    }
    s.dispose();
  }
  const own = doc.createScene(name);
  own.addChild(holder);
  mergeDocuments(kit, doc);
}
// Every merged document brought its own buffer: one is enough for a GLB.
const buffers = kit.getRoot().listBuffers();
for (const accessor of kit.getRoot().listAccessors()) accessor.setBuffer(buffers[0]);
for (const b of buffers.slice(1)) b.dispose();
// The merged scenes become one: each piece's holder node hangs under the kit's scene.
for (const s of kit.getRoot().listScenes()) {
  if (s === scene) continue;
  for (const child of s.listChildren()) {
    s.removeChild(child);
    scene.addChild(child);
  }
  s.dispose();
}
// The pack's palette texture and materials, repeated in every file, are kept once.
// Quantized positions, normals and UVs (KHR_mesh_quantization, which Three's loader reads) halve the file.
await kit.transform(dedup(), prune({ keepLeaves: false }), quantize());
const path = `${OUT}${file}`;
await io.write(path, kit);
const names = scene.listChildren().map((n) => n.getName());
console.log(`${file} ${(statSync(path).size / 1024).toFixed(0)} KB, ${names.length} nodes, ${kit.getRoot().listMeshes().length} meshes, ${kit.getRoot().listTextures().length} textures`);
}

await buildKit('kit.glb', (name) => !LATER.has(name));
await buildKit('kit-later.glb', (name) => LATER.has(name));
