# Asset pipeline

Every model in the game is built from the CC0 packs in `C:\PROJECTS\ASSETS` by a script, so it can be reviewed,
restyled and rebuilt at any time. Vendor packs are never committed; `docs/credits.md` lists every source.

| Command | Builds | From |
|---|---|---|
| `npm run assets:soldiers` | `public/assets/soldiers/*.glb`: the rig and clips (in `knight.glb`) and each character's meshes and kept accessories; `horse.glb`, the riders' horse (M9) | KayKit Adventurers (`3D\kaykit-adventurers`), Quaternius horses (`3D\quaternius-horses`, Poly Pizza) |
| `npm run assets:field` | `public/assets/field/kit.glb`: one named node per field piece Region 1 shows (the first download); `kit-later.glb`: the pieces only Regions 2–4 use (`src/content/kitLater.json`, M11) | KayKit Medieval Hexagon (`3D\kaykit-medieval-hexagon`), Poly Pizza farm set (`3D\polypizza-farm`: the truck, crops) |
| `npm run assets:hero` | `public/assets/hero/`: `hero.glb` (the hooded rogue and the clips he plays), `guns.glb` (one node per gun), `rosie.glb` (the rogue and her three clips), `ada.glb` (the rogue in her cape, three clips: M10's ending) | KayKit Adventurers, Quaternius guns (`3D\quaternius-guns`, Poly Pizza) |

All three scripts use glTF Transform (Node), not Blender: the packs are already game-ready low-poly glTF with one
palette texture, so the build only picks, merges and slims them. Blender is used for review renders.

## The field kit (`tools/assets/field.mjs`)

1. Reads each piece's file and drops its animations.
2. Within each piece, flattens its node tree and joins its parts into as few meshes as its materials allow.
3. Puts the piece under one node named for the game (`windmill`, `treesBLarge`, `truck`, …; `PieceId` in
   `src/content/fields.ts`).
4. Merges every piece into one document, keeps the pack's palette texture and materials once (`dedup`), and
   quantizes positions, normals and UVs (`KHR_mesh_quantization`, read natively by Three's loader). About 0.9 MB on
   disk, 0.3 MB gzipped.

The pieces stay at the pack's tabletop scale; `PIECE_SCALE` in `content/fields.ts` sizes them beside 1.6 m soldiers
(houses about 6 m, the windmill 10 m, trees 7 m). The farm set's crops and truck are at real scale.

**In the game** (`src/world/fieldKit.ts`): each piece is drawn once for all its copies (`InstancedMesh`), with Lambert
materials like the rest of the field. Solid placements return footprints that block the hero, shots and the camera;
the base dressing's footprints are in the crowd's flow field (it's dressed before the crowd loads), and each battle's
landmark stands where enemies never walk. Rosie's truck is the pickup with its blue paint turned teal in its palette
at load (`recolour`).

**Layout** (`src/content/fields.ts`):
- `REGION1_BASE`: the tree lines beyond the hedge (the rounded cone trees: the tiered pines measured busier), rocks
  and single trees near the edges, the camp by the truck, a stone wall along the south road.
- `LANDMARKS`: each battle's set piece in the south-west or beyond the north hedge: the windmill (The Mill), turnip
  and wheat rows on tilled soil (Turnip Field), the bridge over a stream (Old Stone Bridge), the farmhouses and well
  (Hollow Farm), the Baron's tower and tents (Grudge's Hill).
- `SOIL` and `STREAMS`: flat strips the field draws itself (`Field.ribbon`).
- `TREE_LINES` (M9): each region's woods beyond the hedge, swapped when a battle starts (`Field.setRegion`): Region 1's
  cone trees; the Riverlands' round leafy trees (Quaternius) in clumps, three rows deep; the Highland Pass's tiered
  pines two deep with KayKit's grassy mountains far out in the fog (about 30 m tall, 130–150 m away, so they read as
  ridges, not cliffs). From Region 2, a battle's stream gets reeds along both banks and lilies on a wide one
  (`riverDressing`, a fixed jitter so a battle always looks the same).
- Region 3's landmarks: Pine Gate (KayKit's stone wall and gate between pines), Old Watchtower (the tower with rocks
  and the Queen's supply crates).
- Region 4, the Iron Keep: KayKit's red castle on the northern skyline about 130 m out (scaled 2.6, walls, corners and
  two red towers either side), the burnt orchard beyond the hedge, and the ground tinted drier (`GROUND_TINT`, a
  multiply over the meadow's colours). The burnt trees are KayKit's pine and pine clump with a light multiply in the
  build (`tint` in `field.mjs`, darkening the trunks) and their leaves turned charcoal brown at load (`recolour` in
  `fieldKit.ts`): a darker colour alone only made them dark green, and pure charcoal read nearly black. The castle
  (318 KB raw) is the region's one heavy piece; its barracks, forge and second tower were left out (480 KB for little).
  Landmarks: Burnt Orchard (charred trees in rows, KayKit's destroyed building), Moat Road (a 7 m moat along the west
  with the bridge to a gate in a stone wall).

## The battering ram (`src/world/ramModel.ts`)

Built in code from boxes and cylinders like the War Wagon (no CC0 ram fits): a timber frame on four small wheels, a
peaked roof of hides with the Baron's red along the ridge, and a log with an iron head hung on two ropes. It is
narrow (1.3 m) so its six crew, ordinary crowd soldiers carried beside it, walk outside it. The log swings as it rolls
and thuds into the banner when it gets there; abandoned or broken, it settles crooked and sinks with the fallen.

## The Iron Ox (`src/world/ironOxModel.ts`)

Built in code: a riveted iron body with a hump and rust bands on four iron wheels (merged still), a lowered head with
two big pale horns (their material glows through a fire wind-up), glowing red eyes and a gold nose ring, and a tiny
round turret on its back with the Baron (a head, a red cloak, a gold crown). A glowing core sits in each side behind
lighter armour plates; at phase 3 the plates tip outward and drop to the ground. The first version was near-black iron
with small horns and read as a block from the hill; lighter iron, bigger horns and the eyes made it a bull. Rivets on
the moving plates cost 20 draw calls and were dropped.

## The Siege Tower (`src/world/siegeTowerModel.ts`)

Built in code like the wagon (no CC0 siege tower fits): a 7.6 m timber frame on four wheels, corner posts standing
proud of tan hide panels, dark crossbeams round every face at each floor, a drawbridge folded up against the front's
top, a fighting platform with a rail under the Baron's red banner, and a door low on each side that swings outward
when a squad steps out. Its three weak points are warm orange beams flush on its front, softly pulsing, at the same
heights as their crowd bodies; a broken one drops away. When it falls it tips forward about its front edge (slowly,
then all at once) and sinks with the fallen. The first version read as a plain brown slab from the side; the posts and
bands fixed that.

## The catapult, its boulders and the Sentry Gun (`src/world/catapult.ts`, `src/game/sentry.ts`)

Built in code like the ram (KayKit's catapult sits on a tower; no CC0 field engine fits). The catapult is a timber
frame on four wheels with two uprights and a throwing arm: a bucket at one end, the Baron's red counterweight at the
other. Cocked, the bucket rests low at the back; on a throw it snaps over the top in 0.22 s and winches back over 3 s.
Boulders are low-poly rocks on an arc; in the last 1.5 s of a flight a dark shadow grows inside a faint ring at the
blast's size where it will land. The Sentry Gun is a blue body with a gold band and a gunmetal barrel on a tripod;
its head turns to its target and the barrel kicks back on each shot. Abandoned or broken catapults settle crooked and
sink with the fallen.

## The hero, his guns and Rosie (`tools/assets/hero.mjs`)

The owner picked KayKit's humans for the look (vision §6, 2026-11-05).

- **The hero** is KayKit's hooded rogue, body only (the cape, knives and crossbows are dropped), with the clips he
  plays: idle, run, walk back, strafes, the one-handed aim and reload, throw, fall, get up and cheer. 0.6 MB. At load
  (`src/game/heroModel.ts`) his green cloth is turned into the orange hoodie (`recolour`, `HERO_LOOK.cloth`) and he
  stands 1.8 m tall, above the 1.6 m soldiers.
  - Legs and body play separately: the legs blend idle, run, back and strafes by where he moves against where he
    faces; the body holds the aim pose, bent at the spine and chest toward the crosshair. The strafe clips turn the
    hips, so the spine turns back by the same amount and the chest and gun stay on the crosshair.
  - Every gun is held one-handed with the arm out to the right: the two-handed pose holds a gun in front of the face,
    where the big hood hides it from the camera behind him.
- **The guns** are Quaternius' pistol, short pump shotgun (its pistol-grip stock suits one hand) and SMG, one named
  node each. `HERO_LOOK.guns` gives each its length (a little oversized so it reads past the hood) and, in the gun's own
  units, the grip, muzzle (flash and tracers) and ejection port (casings). The game lifts near-black parts to dark grey
  (`gunFloor`). Region 2–3's guns: the assault rifle (`assault-b`), the hunting rifle (`sniper-a`), the machine gun
  (`assault-a` with a drum magazine added in code), the grenade launcher (the short shotgun again, with a fat olive
  tube and a revolving drum added in code), the rocket launcher (`shotgun-a` inside a fat olive tube with a red
  warhead cone and a sight; `dressRocket`) and the minigun (`smg-b` with six barrels round a hub named `rotor` that the
  hero model spins while it turns, two collars and an olive ammo box; `dressMachineGun`, `dressLauncher`,
  `dressMinigun` in `heroModel.ts`).
- **Star looks** (`dressStars` in `heroModel.ts`, GDD §8.1): every gun gets two hidden groups at load, `star3` (a
  red-dot sight on top, or a drum under the shotgun and the hunting rifle) and `star5` (two gold bands round it and a
  gold plate down each side), shown by its level in `setGun(id, level)`. Each part is sized in metres as held and
  placed on the gun's own top, bottom and thickness where it sits, measured from the triangles crossing a thin slice
  there (measuring from vertices sank the pistol's sight into its slide and shrank the rocket launcher's bands: long
  low-poly parts have no vertices mid-length). Shares of a gun's length made the pistol's sight invisible.
- **Gun icons** for the shop and the gun button are rendered from the same models at load, as white side-view
  silhouettes the UI paints in its own colour (`src/render/gunIcons.ts`, `gunArt`).
- **Rosie** is KayKit's red-haired rogue with her green turned the truck's teal (`ROSIE_LOOK`), standing behind the
  tailgate in her ring: she watches the hero, waves him over in breaks, reaches out when the shop opens or he buys,
  and cheers a win (`src/world/rosieFigure.ts`).
- **The tower shield** of the shield walls and Sir Grudge is built by the crowd at load (`soldierKit.ts`): the
  knight's rectangle shield turned to face forward, sized to 0.9 m and set in front of the chest, on the chest bone
  (`TOWER_SHIELD` in `content/soldiers.ts`).
- **Queen Ada's banner** is drawn by the game (`src/world/bannerModel.ts`, `BANNER_LOOK`): pole, gold knob, crossbar,
  a swallow-tailed blue flag with a still ripple and a gold crown.
- **Queen Ada** (M10, the ending) is KayKit's red-haired rogue again, this time in her cape (`hero.mjs` keeps the rigid
  `Rogue_Cape` mesh), so she isn't Rosie in blue: her greens turn royal blue (`ADA_LOOK`), her hair stays auburn (it
  shares its hue with her skin, so recolouring it caught only a few strands), and a gold crown built in code sits on
  her head bone, sized in metres by undoing the bone's scale. KayKit's mage came first and read as a young man. Her
  clips: `Idle` (the calm one: `Unarmed_Idle` is a boxer's fists-up stance), `Cheer` and `Walking_A`; she isn't in the
  first download (`loadAda` when Battle 20 starts, the first time it can end the story). Review:
  `qa-output/m9/ada.mjs` (front, three-quarter, side, face), `ada-poses.mjs` (clips side by side).
- **The Baron's donkey** (M10) is the riders' horse once more (`horse.glb`, already downloaded for the knights), loaded
  whole when an Iron Ox first appears: 1.2 m, chunky, its `Ear1` bones stretched 2.1× along their length, its
  materials repainted grey with a pale muzzle and belly (`ESCAPE.donkey`). The Baron on it is built in code (charcoal
  armour, a red cape, his crown, a moustache, a fist), merged per colour except the parts that move. Review:
  `qa-output/m9/m10-ending.mjs`.

Review: `qa-output/m7/hero.mjs` (close-ups), `hero-ots.mjs` (the game's view with each gun), `hero-motion.mjs` (run,
strafes, back, reload, throw, fall, get up, cheer), `rosie.mjs`, `shields.mjs`, `banner.mjs`, `icons.mjs`.

## The riders' horse (M9)

Four Quaternius horses (CC0, Poly Pizza) were rendered beside a KayKit knight; the detailed brown one won (the boxy
one looked blocky beside KayKit's rounded soldiers). `assets:soldiers` keeps seven of its clips (Gallop, Walk, Idle,
Idle_2, Death, Attack_Kick, Idle_HitReact_Left) and drops the duplicate "AnimalArmature|…" copies.

In the game (`SoldierKit.buildMount`): it keeps its own rig, but its clips are sampled into the soldiers' clip rows
(`HORSE.clips` maps each soldier clip to a horse clip, stretched to the same number of frames), so a horse plays
whatever its rider's body plays and needs no clip table of its own. Its material colours become a small palette
texture (the crowd's shader paints from one), with a cloth colour it never has, so nothing on it is repainted. Its
size is measured relative to the model's root (the file's mesh node carries a scale). The crowd draws it under each
rider, 1.25× wide and 0.92× tall (`HORSE.shape`), the walk and gallop re-timed to its own stride
(`HORSE.walkSpeed`, `gallopSpeed`). Review: `qa-output/m9/riders.mjs`.

## The War Wagon (M9)

No CC0 wagon was found (Poly Pizza's are all CC-BY), so `src/world/warWagonModel.ts` builds it from boxes and
cylinders in the palette (`WAGON_LOOK`): a wooden hull with iron plates and a red band, a deck with a plank rail, a
pole with the Baron's flag, four spoked wheels that turn with the distance rolled and vanish when broken, a pole and
yoke. Quaternius' CC0 cow (`assets:soldiers` makes `ox.glb`, its walk and idle) pulls it in pairs, repainted from a
dairy cow's black and white to a brown ox. It leans toward broken wheels and settles low and crooked when it
collapses. Review: `qa-output/m9/wagon.mjs`.

## Sound and music (`tools/audio/build_audio.py`, M8)

`npm run audio` cuts every clip from the library with ffmpeg (Shotcut's, `C:/SOFT/Shotcut/ffmpeg.exe`, or `FFMPEG`),
the same way as the owner's earlier games. `python tools/audio/build_audio.py pistol coin` rebuilds just those.

- **Effects** (`EFFECTS`): leading silence trimmed, cut to length with a short fade, levelled to a loudness each
  (`loudnorm`), mono MP3 at 80 kbps. The mix in `src/content/audio.ts` (`MIX`) then sets each one's volume and how many
  may start in a second, so frequent sounds (hits, coins, bolts, yelps) stay quiet and never pile up.
- **Ambience** (`LOOPS`): the countryside bed, made seamless by laying its end over its start.
- **Sequences** (`SEQUENCES`, M9): a sound built from one short sample played at set times, pitches and gains. The
  riders' hoofbeats are Kenney's grass footstep pitched down into a three-beat canter, four strides long.
- **Music** (`MUSIC`): Ovani's 60-second cuts, stereo at 80 kbps, with each track's reverb tail (the "RT" in its folder
  name) laid over its start, so it loops without a seam. About 0.58 MB each.
- **Candidates**: `python tools/audio/build_audio.py --candidates` writes 45-second previews of every music candidate
  and a page to compare them, at `qa-output/music/` (open `http://localhost:5180/qa-output/music/index.html` while the
  dev server runs). Nothing there ships.
- Every clip loads after the first input (`assets/audio/` is outside the size check's initial budget); a missing clip
  is silence, and `tests/audio.test.ts` fails if a named sound has no file.

**Checking a sound** without ears: `qa-output/audio-waves/sheet.png` shows every effect's waveform and length (late
starts, double shots and quiet rustles show up there), and `qa-output/m8/audio-check.mjs` confirms in the running
game that every clip loads with no failed requests and that the music follows the screen and the phase. The owner
judges by ear.

## Checking a piece

1. A Blender review render beside a KayKit knight for scale (the M7 look test's `hex_sheet.py` pattern).
2. In the running game: `npm run shots -- start hill clash front boss` at `d1280,p390,l844`, plus the landmark view
   (the hero at (−12, 6) looking south-west).
3. Calm: `python tools/qa/noise.py qa-output/noise/before qa-output/noise/after`, with `?nokit` for the greybox
   "before" (`GAME_URL="http://localhost:5180/?nodev&nokit"`).
4. Performance: `npm run perf` (budget 150 draw calls).

Look for: scale beside the soldiers, pieces on the ground (not floating or sunk too far), sails and doors facing the
field, no hex-tile bases or cliff sides showing, nothing in the squads' lanes.
