# Credits and asset sources

Every third-party asset in the game, where it came from and its licence. Vendor packs live in `C:\PROJECTS\ASSETS` and
are never committed; the game's files are built from them by the scripts named here. The in-game credits screen
(M11) is written from this list.

| Asset | Author | Licence | Source | Downloaded | Built by | Used for |
|---|---|---|---|---|---|---|
| KayKit Adventurers Character Pack 1.0 (Knight, Rogue, Rogue Hooded, Barbarian, their rig and animations, accessories) | Kay Lousberg (kaylousberg.com) | CC0 1.0 (credit appreciated, not required) | github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 | 2026-11-04 to `C:\PROJECTS\ASSETS\3D\kaykit-adventurers` | `npm run assets:soldiers` → `public/assets/soldiers/`; `npm run assets:hero` → `public/assets/hero/` | Both armies' soldiers; the hero (Rogue Hooded, recoloured orange); Rosie (Rogue, recoloured teal); Queen Ada (Rogue with its cape, recoloured royal blue); the tower shield (from the rectangle shield) |
| KayKit Medieval Hexagon Pack 1.0 (buildings, fences, nature, props) | Kay Lousberg (kaylousberg.com) | CC0 1.0 (credit appreciated, not required) | github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0 | 2026-11-05 to `C:\PROJECTS\ASSETS\3D\kaykit-medieval-hexagon` | `npm run assets:field` → `public/assets/field/kit.glb` | Region 1's field dressing: the windmill, houses, well, bridge, watermill, the Baron's tower, tents, trees, rocks, fences, crates; the Riverlands' reeds, lilies and stumps; the Highland Pass's mountains, stone gate and watchtower |
| Pickup truck, carrot and wheat crops; the cow | Quaternius and Kenney, via poly.pizza | CC0 1.0 | poly.pizza (pages listed in `C:\PROJECTS\ASSETS\3D\polypizza-farm\SOURCES.md`; first downloaded for Cluck & Truck) | 2026-11-05 | `npm run assets:field`; the cow by `npm run assets:soldiers` → `ox.glb` | Rosie's truck (recoloured teal), Turnip Field's crops; the War Wagon's oxen (the cow, repainted brown) |
| Pistol, short pump shotgun, SMG, assault rifle, hunting rifle and the machine gun's body (`pistol-b`, `shotgun-short`, `smg-a`, `assault-b`, `sniper-a`, `assault-a` with a drum magazine added in code; thirteen more candidates downloaded) | Quaternius (quaternius.com), via poly.pizza | CC0 1.0 | pages in `C:\PROJECTS\ASSETS\3D\quaternius-guns\SOURCES.md` | 2026-11-05 | `npm run assets:hero` → `public/assets/hero/guns.glb` | The hero's guns and the shop's gun pictures |
| Round tree (`tree-round`; `tree-autumn` downloaded as a candidate) | Quaternius (quaternius.com), via poly.pizza | CC0 1.0 | pages in `C:\PROJECTS\ASSETS\3D\quaternius-trees\SOURCES.md` | 2026-11-06 | `npm run assets:field` → `public/assets/field/kit.glb` | The Riverlands' leafy woods beyond the hedge (M9) |
| Horse (`horse-a`, animated: gallop, walk, idle, kick and more; three more candidates downloaded) | Quaternius (quaternius.com), via poly.pizza | CC0 1.0 | pages in `C:\PROJECTS\ASSETS\3D\quaternius-horses\SOURCES.md` | 2026-11-05 | `npm run assets:soldiers` → `public/assets/soldiers/horse.glb` | The riders' horses (M9); the Iron Baron's donkey (M10: shrunk, long-eared, repainted grey) |
| KayKit Character Pack: Skeletons 1.0 | Kay Lousberg | CC0 1.0 | github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0 | 2026-11-05 to `C:\PROJECTS\ASSETS\3D\kaykit-skeletons` | not yet | M7 look test candidate (same rig as the Adventurers) |
| Quaternius animated characters (Adventurer, Hooded Adventurer, King, Man, Soldier, Wizard, Character) | Quaternius (quaternius.com), via poly.pizza | CC0 1.0 | pages in `C:\PROJECTS\ASSETS\3D\quaternius-characters\SOURCES.md` | 2026-11-05 | not yet | M7 look test candidates |

## Sound and music (M8)

Cut by `npm run audio` (`tools/audio/build_audio.py`) into `public/assets/audio/`, one short clip per sound; the packs
themselves stay in the library. The licences were checked for the owner's earlier games (Scrap Express's
`docs/research/asset-library.md`).

| Asset | Author | Licence | Source | Used for |
|---|---|---|---|---|
| Hollywood Action Sound FX Pack Vol. 2 | Ovani Sound | Royalty-free licence (`Royalty-Free License (Link).pdf` in each pack): commercial games, no credit needed, never resold or shared as files on their own | `C:\PROJECTS\ASSETS\SFX` (bought by the owner) | Pistol, shotgun, SMG and assault-rifle shots, the reload, a pain grunt (pitched as a yelp), Sir Grudge's roar and fall, the shield splintering |
| Casual & Mobile Sound FX Pack Vol. 1 | Ovani Sound | as above | as above | Gasps and "ahh"s for knocked-out soldiers, the firebrand's "aaah!", the coin tick, menu clicks, the purchase, the rift crate, the bow's "thwip" |
| Jingles & Stingers Sound FX Pack Vol. 2 | Ovani Sound | as above | as above | The Baron's horn, war drums, Larkmoor's horn (routs, the rally), wave cleared, the banner warning, the boss's menace, the victory and defeat stings |
| Foley Impacts Vol. 1 | Ovani Sound | as above | as above | Bodies flopping onto grass, crates landing, the hero being hit |
| Environment Ambiences Sound FX Pack Vol. 1 | Ovani Sound | as above | as above | The countryside bed under the battle |
| Fire Sound FX Pack Vol. 1 | Ovani Sound | as above | as above | The firebrand's sizzle (M9) |
| Classical Music Pack Vol. 2 ("The Fair", "March!") and Orchestral Ambient Music Pack Vol. 1 ("Retribution") | Ovani Sound | as above | as above | Break and map music, wave music, the boss's music (60-second cuts, looped) |
| Echoes Audio Super Kit | Pizza Doggy (itch.io) | `Game Asset License Agreement.pdf`: any game, commercial or not, may be modified, never redistributed on its own; credit appreciated | `C:\PROJECTS\ASSETS\PSX SHIT\pizzadoggy assets` (bought by the owner) | Bullet hits on cloth, the grenade's blast and throw, the shield's crack, the firebrand's burst, the hunting rifle's shot |
| Kenney Impact Sounds | Kenney (kenney.nl) | CC0 1.0 | `C:\PROJECTS\ASSETS\SFX\CC0\cc0-sounds-web\kenney_impactsounds` | The clink on armour, the clonk of a bullet on a tower shield, the riders' hoofbeats (grass footsteps pitched down into a canter; the library has no horses) |

Not used, on purpose: the "fantasy ambient" CC0 pack (`kmontesdev-fantasy-ambient`) holds files named `ES_…`, which
look like Epidemic Sound's, so its provenance is unclear.

The in-game credits (M11) list Pizza Doggy and Kay Lousberg, who appreciate credit. Code and everything else in the
game is our own.
