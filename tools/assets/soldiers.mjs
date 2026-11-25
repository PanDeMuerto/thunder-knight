// Builds the soldiers' game files from the CC0 KayKit Adventurers pack (Kay Lousberg) in C:\PROJECTS\ASSETS.
//   npm run assets:soldiers
// - knight.glb keeps the shared rig's animation clips the crowd uses (every KayKit character shares this rig).
// - The other characters keep only their meshes and the accessories the game uses.
// Writes public/assets/soldiers/. The vendor pack itself is never copied into the repo.
import { mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { dedup, prune, resample } from '@gltf-transform/functions';

const PACK = process.env.KAYKIT ?? 'C:/PROJECTS/ASSETS/3D/kaykit-adventurers/characters';
const OUT = fileURLToPath(new URL('../../public/assets/soldiers/', import.meta.url));

/** Clips the crowd plays (src/crowd/soldierKit.ts names them). */
const CLIPS = [
  'Idle',
  'Walking_A',
  'Running_A',
  '1H_Melee_Attack_Chop',
  '1H_Melee_Attack_Slice_Diagonal',
  'Hit_A',
  'Death_A',
  'Cheer',
  '1H_Ranged_Shoot',
  '1H_Ranged_Reload',
  'Blocking',
];

/** Per character: the file, and the accessory nodes to keep (everything else rigid is dropped). */
const CHARACTERS = {
  knight: { file: 'Knight.glb', keep: ['Knight_Helmet', 'Round_Shield', 'Badge_Shield', 'Rectangle_Shield', '1H_Sword', '2H_Sword', 'Knight_Cape'] },
  rogue: { file: 'Rogue.glb', keep: ['Knife', '1H_Crossbow'] },
  rogueHooded: { file: 'Rogue_Hooded.glb', keep: ['1H_Crossbow', 'Knife'] },
  barbarian: { file: 'Barbarian.glb', keep: ['Barbarian_Hat', '1H_Axe', 'Barbarian_Round_Shield', '2H_Axe', 'Barbarian_Cape'] },
};

const io = new NodeIO();
mkdirSync(OUT, { recursive: true });
for (const [name, def] of Object.entries(CHARACTERS)) {
  const doc = await io.read(`${PACK}/${def.file}`);
  const root = doc.getRoot();
  for (const anim of root.listAnimations()) {
    if (name === 'knight' && CLIPS.includes(anim.getName())) continue;
    // Samplers and channels outlive their animation unless disposed too; prune then drops their keyframes.
    for (const channel of anim.listChannels()) channel.dispose();
    for (const sampler of anim.listSamplers()) sampler.dispose();
    anim.dispose();
  }
  if (name === 'knight') {
    const kept = root.listAnimations().map((a) => a.getName());
    const missing = CLIPS.filter((c) => !kept.includes(c));
    if (missing.length) throw new Error(`Missing clips: ${missing.join(', ')}`);
  }
  // Rigid accessories are meshes on nodes without a skin; drop the ones the game doesn't use.
  for (const node of root.listNodes()) {
    if (node.getMesh() && !node.getSkin() && !def.keep.includes(node.getName())) {
      node.setMesh(null);
    }
  }
  await doc.transform(resample(), dedup(), prune());
  const path = `${OUT}${name}.glb`;
  await io.write(path, doc);
  console.log(`${name}.glb ${(statSync(path).size / 1024).toFixed(0)} KB`);
}

// The riders' horse (M9, GDD §9.1): Quaternius' CC0 horse from Poly Pizza (C:\PROJECTS\ASSETS\3D\quaternius-horses),
// with the clips the crowd maps onto its own rows (`HORSE` in src/content/soldiers.ts). The file carries each clip
// twice (plain and "AnimalArmature|…"); the plain ones are kept. Its colours are material colours, which the game
// paints into a small palette at load.
{
  const HORSES = process.env.QUATERNIUS_HORSES ?? 'C:/PROJECTS/ASSETS/3D/quaternius-horses';
  const HORSE_CLIPS = ['Gallop', 'Walk', 'Idle', 'Idle_2', 'Death', 'Attack_Kick', 'Idle_HitReact_Left'];
  const doc = await io.read(`${HORSES}/horse-a.glb`);
  const root = doc.getRoot();
  for (const anim of root.listAnimations()) {
    if (HORSE_CLIPS.includes(anim.getName())) continue;
    for (const channel of anim.listChannels()) channel.dispose();
    for (const sampler of anim.listSamplers()) sampler.dispose();
    anim.dispose();
  }
  const kept = root.listAnimations().map((a) => a.getName());
  const missing = HORSE_CLIPS.filter((c) => !kept.includes(c));
  if (missing.length) throw new Error(`horse: missing clips ${missing.join(', ')}`);
  await doc.transform(resample(), dedup(), prune());
  const path = `${OUT}horse.glb`;
  await io.write(path, doc);
  console.log(`horse.glb ${(statSync(path).size / 1024).toFixed(0)} KB, ${kept.length} clips`);
}

// The War Wagon's oxen (M9, GDD §9.3): Quaternius' CC0 cow from Poly Pizza (C:\PROJECTS\ASSETS\3D\polypizza-farm),
// with its walk and idle. The wagon itself is built by the game (src/world/warWagonModel.ts).
{
  const FARM = process.env.POLYPIZZA_FARM ?? 'C:/PROJECTS/ASSETS/3D/polypizza-farm';
  const OX_CLIPS = ['Armature|Walk', 'Armature|Idle'];
  const doc = await io.read(`${FARM}/cow.glb`);
  const root = doc.getRoot();
  for (const anim of root.listAnimations()) {
    if (OX_CLIPS.includes(anim.getName())) continue;
    for (const channel of anim.listChannels()) channel.dispose();
    for (const sampler of anim.listSamplers()) sampler.dispose();
    anim.dispose();
  }
  await doc.transform(resample(), dedup(), prune());
  const path = `${OUT}ox.glb`;
  await io.write(path, doc);
  console.log(`ox.glb ${(statSync(path).size / 1024).toFixed(0)} KB, ${root.listAnimations().length} clips`);
}
