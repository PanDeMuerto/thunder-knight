// Builds the hero and his guns from CC0 packs in C:\PROJECTS\ASSETS.
//   npm run assets:hero
// - hero.glb: KayKit Adventurers' hooded rogue (Kay Lousberg), its body only (no cape, knives or crossbows), with the
//   clips the hero plays. The game turns the green cloth orange (a hoodie) at load.
// - guns.glb: Quaternius' pistol, short pump shotgun, SMG, assault rifle and scoped hunting rifle (Poly Pizza), one
//   named node each, as authored.
// - ada.glb: KayKit Adventurers' rogue as Queen Ada (the ending), body and cape: a calm idle (not the fists-up Unarmed_Idle), the cheer and a walk.
// - rosie.glb: KayKit Adventurers' rogue as Rosie at her truck, body only, with her idle, wave and serve clips. The game
//   turns her green teal (the truck's colour) at load.
// Writes public/assets/hero/. The vendor packs themselves are never copied into the repo.
import { mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';
import { dedup, flatten, join, mergeDocuments, prune, resample, weld } from '@gltf-transform/functions';

const KAYKIT = process.env.KAYKIT ?? 'C:/PROJECTS/ASSETS/3D/kaykit-adventurers/characters';
const GUNS = process.env.QUATERNIUS_GUNS ?? 'C:/PROJECTS/ASSETS/3D/quaternius-guns';
const OUT = fileURLToPath(new URL('../../public/assets/hero/', import.meta.url));

/** Clips the hero plays (src/game/hero.ts names them). */
const CLIPS = [
  'Idle',
  'Running_A',
  'Walking_Backwards',
  'Running_Strafe_Left',
  'Running_Strafe_Right',
  '1H_Ranged_Aiming',
  '1H_Ranged_Reload',
  'Throw',
  'Death_A',
  'Lie_StandUp',
  'Cheer',
];

/** Rosie's clips (src/world/rosieFigure.ts names them). */
const ROSIE_CLIPS = ['Unarmed_Idle', 'Cheer', 'Interact'];

/** The game's gun ids → the Quaternius file for each. */
const GUN_FILES = { pistol: 'pistol-b.glb', shotgun: 'shotgun-short.glb', smg: 'smg-a.glb', rifle: 'assault-b.glb', hunting: 'sniper-a.glb', mg: 'assault-a.glb', launcher: 'shotgun-short.glb', minigun: 'smg-b.glb', rocket: 'shotgun-a.glb' };

mkdirSync(OUT, { recursive: true });
const io = new NodeIO();

/**
 * A KayKit character's body with only `clips`. Its rigid accessories (capes, knives, crossbows, hats) are dropped, but
 * for those named in `keep`.
 */
async function character(file, clips, out, keep = []) {
  const doc = await io.read(`${KAYKIT}/${file}`);
  const root = doc.getRoot();
  for (const anim of root.listAnimations()) {
    if (clips.includes(anim.getName())) continue;
    for (const channel of anim.listChannels()) channel.dispose();
    for (const sampler of anim.listSamplers()) sampler.dispose();
    anim.dispose();
  }
  const kept = root.listAnimations().map((a) => a.getName());
  const missing = clips.filter((c) => !kept.includes(c));
  if (missing.length) throw new Error(`${file}: missing clips: ${missing.join(', ')}`);
  for (const node of root.listNodes()) if (node.getMesh() && !node.getSkin() && !keep.includes(node.getName())) node.setMesh(null);
  await doc.transform(resample(), dedup(), prune());
  await io.write(`${OUT}${out}`, doc);
  console.log(`${out} ${(statSync(`${OUT}${out}`).size / 1024).toFixed(0)} KB, ${kept.length} clips`);
}

await character('Rogue_Hooded.glb', CLIPS, 'hero.glb');
await character('Rogue.glb', ROSIE_CLIPS, 'rosie.glb');
// Queen Ada (M10, the ending): KayKit's rogue in her cape (the mage read as a young man); the game turns her green
// royal blue and gives her a crown and her cape, so she isn't Rosie's twin.
await character('Rogue.glb', ['Idle', 'Cheer', 'Walking_A'], 'ada.glb', ['Rogue_Cape']);

// The guns, one named node each.
{
  const kit = new Document();
  kit.createBuffer();
  const scene = kit.createScene('guns');
  kit.getRoot().setDefaultScene(scene);
  for (const [name, file] of Object.entries(GUN_FILES)) {
    const doc = await io.read(`${GUNS}/${file}`);
    await doc.transform(flatten(), join({ keepNamed: false }), weld(), prune());
    const holder = doc.createNode(name);
    for (const s of doc.getRoot().listScenes()) {
      for (const child of s.listChildren()) {
        s.removeChild(child);
        holder.addChild(child);
      }
      s.dispose();
    }
    doc.createScene(name).addChild(holder);
    mergeDocuments(kit, doc);
  }
  const buffers = kit.getRoot().listBuffers();
  for (const accessor of kit.getRoot().listAccessors()) accessor.setBuffer(buffers[0]);
  for (const b of buffers.slice(1)) b.dispose();
  for (const s of kit.getRoot().listScenes()) {
    if (s === scene) continue;
    for (const child of s.listChildren()) {
      s.removeChild(child);
      scene.addChild(child);
    }
    s.dispose();
  }
  await kit.transform(dedup(), prune({ keepLeaves: false }));
  await io.write(`${OUT}guns.glb`, kit);
  console.log(`guns.glb ${(statSync(`${OUT}guns.glb`).size / 1024).toFixed(0)} KB: ${scene.listChildren().map((n) => n.getName()).join(', ')}`);
}
