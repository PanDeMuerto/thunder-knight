# Thunder Knight: tech design

How the game is built, and how to change it safely while it is live.

## 1. Stack

- **Language and build:** TypeScript (strict, `noUncheckedIndexedAccess`), Three.js (WebGL2), Vite. Node 22 or newer.
- **Tools:** vitest for rules, Playwright (installed Chrome) for QA, Blender 4.x by script for assets, Python for
  packaging and image checks, ffmpeg for audio.
- **Starting point:** the skeleton reuses Primal Valley's modules (platform, save, input, stage, audio, strings, QA tools,
  packaging); see [research/reuse-from-our-games.md](research/reuse-from-our-games.md). The aim assist comes from Scrap
  Express.
- **Dev server:** port **5180** (Browser pane launch config `knight`).

## 2. Maintainability rules

These rules are also in `CLAUDE.md`.

1. **The SDK is touched only in `src/platform/`, storage only in `src/save/`.**
2. **Content is data.** Guns, enemies, allies, battles, fields, shop items, prices, tuning, ad switches and strings live
   in `src/content/`. A new gun or battle is a data change plus assets, not new code paths.
3. **Rules are pure functions** in `src/state/`, unit-tested: economy, purchases, crowns, unlocks, the recommendation,
   wave bonuses, onboarding progression.
4. **Every save shape change needs a migration** and a save fixture for the released version
   (`tests/fixtures/saves/<version>.json`).
5. **Systems talk through narrow interfaces** (`OnboardingHost`, `HudApi`, `ShopHost`), not through `Game` internals.
6. **Every behaviour change** updates the GDD section and adds a `CHANGELOG.md` line in players' words.
7. **Vendor asset packs are never copied into the repo.** `npm run assets` builds game assets from
   `C:\PROJECTS\ASSETS` by script.
8. **QA tools fake pointer lock** and never move the owner's mouse.
9. **Dev-only code** (dev adapter, dev panel, jump links) is dynamically imported, so it never ships.
10. **Version bump** before every upload. The version shows in Pause → Credits.

## 3. Folders

| Folder | Responsibility |
|---|---|
| `src/main.ts` | Boot: save → platform session → language → game load → `loadingFinished` → start |
| `src/platform/` | `PlatformAdapter`; Poki, web (itch) and dev adapters; `PlatformSession` rule enforcer |
| `src/save/` | `SaveStore`: versioned saves, migrations, settings key, safe storage |
| `src/content/` | Data only: `tuning.ts`, `guns.ts`, `enemies.ts`, `allies.ts`, `battles.ts`, `fields.ts`, `shop.ts`, `ads.ts`, `onboarding.ts` (step table), `strings/` |
| `src/state/` | Pure rules: `economy.ts` (gold, bonuses, crowns, hero and army stats, comeback help), `shop.ts` (cards, states, buying, equipping, Recommended), `progress.ts` (reached battle, wins, defeats), `guns.ts` (levels), `balance.ts` (the economy simulator), plus `gameState.ts` (shape and defaults) |
| `src/game/` | `game.ts` (screens, modes, loop, Poki's gameplay rule), `battle.ts` (one battle's lifetime: phases, banner, hero health and knockouts, grenades, gold), `director.ts` (waves and squads under the cap), `coins.ts`, `grenades.ts`, `hero.ts`, `combat.ts` (the gun in hand, shots, feel), `gun.ts` (magazine, rate, reloads), `bodies.ts` (everything shootable, with its hash), `hitscan.ts`, `aimAssist.ts`, `range.ts` (the M1 test range), `grenades.ts`, `support.ts`, `onboarding.ts` |
| `src/crowd/` | `crowd.ts` (the armies as one object: load, step, draw; `Targets` for shots), `crowdSim.ts` (soldier arrays at 30 Hz: squads, targeting, melee, bolts, routs), `flowField.ts`, `formations.ts`, `soldierKit.ts` (models and the bone texture, built at load), `crowdRender.ts` (instancing, bolts, landing marks, blob shadows, backdrop army), `scenario.ts` (M2 test scenarios until the director) |
| `src/world/` | `field.ts` (terrain from recipe, props, colliders), `banner.ts`, `truck.ts`, `markers.ts` |
| `src/render/` | `stage.ts` (renderer, sizing, `--s`, quality tiers), `cameraRig.ts`, `effects.ts` (pooled particles, coins), `post.ts` (grade, light bloom), `crowdMaterial.ts` (GPU skinning from the bone texture, cloth and steel tints) |
| `src/input/` | `input.ts`: desktop and touch to intents; pointer lock; device switching |
| `src/ui/` | `hud.ts`, `prompts.ts`, `shopPanel.ts`, `cards.ts`, `mapScreen.ts`, `pauseMenu.ts`, `touchControls.ts`, `dom.ts`, `icons.ts`, `styles.css` |
| `src/audio/` | `audio.ts`: Web Audio, typed sound names, buses, positional sounds, silence |
| `src/core/` | `math.ts`, `spring.ts`, `spatialHash.ts`, `pool.ts`, `rng.ts` (seeded) |
| `src/dev/` | Dev panel, jump links (`?battle=7&wave=3&gold=5000`), autopilot hooks (dev only) |
| `tests/` | vitest: state rules, saves (and history fixtures), strings, platform session, balance targets |
| `tools/` | `qa/` (Playwright tools, `fake-lock.mjs`, `noise.py`, `colour_blind.py`), `balance/simulate.ts`, `blender/` (asset scripts), `vat/` (bake), `audio/`, `check-size.mjs`, `package.py` |
| `public/assets/` | Built game assets only (GLB, KTX2/WebP, VAT textures, audio) |
| `docs/` | vision, gdd, onboarding, tech-design, milestones, asset-pipeline, release-checklist, research |

## 4. The frame

```
input.update()
→ game.update(dt)   [mode: battle | break | card | map | paused | busy(ad)]
    battle.update:  hero → weapons/aim assist → grenades/support → director (spawn squads)
    crowd.step()    fixed 30 Hz: flow field steering → separation (spatial hash) → melee timers → projectiles → routs
    economy events → state rules (gold, kills) → HUD
    onboarding.update(dt, frameEvents)
→ cameraRig.update() → crowdRender.sync() (instance attributes) → effects → render → HUD paint (only changed values)
```

- **Fixed step:** soldiers simulate at a fixed 30 Hz and interpolate in rendering. The hero and camera run every
  frame.
- **No allocation in the hot loop:** pools for coins, particles, projectiles and tracers.

## 5. Systems

### 5.1 Platform and Poki

- **`PlatformSession`** wraps the adapter and enforces Poki's rules:
  - no duplicate start or stop
  - no events during ads
  - no `commercialBreak` while playing
  - a rewarded break stops gameplay first and grants only on `=== true`
  - ad hooks run in try/finally
- **Ad hooks** (`onAdStart`):
  1. Disable input and clear held keys.
  2. Exit pointer lock.
  3. Silence audio.
  4. Set mode to `busy`.

  `onAdEnd` restores them.
- **Dev adapter:** records calls to `window.__platformEvents` and shows a fake ad overlay. `__adMode='fail'` makes a
  rewarded ad play and report no reward; `'blocked'` plays nothing (an ad blocker). `?noads` plays the ad-free build.
- **The session refuses** a `commercialBreak` before the first `gameplayStart` (Poki shows no preroll).
- **When the game asks** (`state/ads.ts`): `commercialAllowed(point, battle, rewardedHere)` for Next wave and the
  result cards; `crateDue` and `crateGun` for the rift crate. The game's ad flows (`requestNextWave`, `leaveCard`,
  `watchReward`) hold an `adPending` flag so presses wait, and `rewardedHere` skips the next interstitial at that stop.
- **Rewarded buttons** are made only by `ui/rewardButton.ts` (order, size, colour, the video mark); `qa:poki` checks
  every card.

| Moment | Calls |
|---|---|
| Boot done | `loadingFinished()` (once) |
| First deliberate input | `gameplayStart()` (also unlocks audio) |
| Pause, shop open, any card, map | `gameplayStop()` |
| Resume, shop closed (in a break, walking) | `gameplayStart()` |
| Next wave pressed (from B2, no rewarded this break) | `gameplayStop()` if playing → `commercialBreak()` → reveal → `gameplayStart()` |
| Continue or Retry on a result card (from B2) | `commercialBreak()` → map or battle |
| Rally, ×2 gold, rift crate | `rewardedBreak()` → grant if `true` |
| Tutorial steps, battles, shop, rewarded exposure | `measure(...)` per GDD §21 |

### 5.2 Input

- **Origin:** PV/SE `input.ts`.
- **Touch:** a floating move stick on the left zone; drag-look on the right zone (zones change in portrait); buttons with
  pointer capture.
- **Desktop:** WASD and arrows; mouse look via pointer lock, falling back to drag-look after 400 ms with no lock; losing
  the lock pauses.
- **Device:** the last device used wins, and switching fires `onDeviceChange`, which swaps the HUD and prompts.
- **Output:** one `Intents` object per frame: `move`, `look`, `fireHeld`, `grenade`, `support`, `swap`, `reload`,
  `next`, `pause`.

### 5.3 Camera rig

- **`cameraRig.ts`:** the over-the-shoulder rig with landscape and portrait parameter sets (GDD §5.1), blended when the
  aspect ratio changes.
- **Portrait crosshair:** applied with `camera.setViewOffset`, so the projection centre and crosshair sit at 45% of
  the height.
- **Collision:** `field.sweep` moves a 0.3 m ball from the hero's head out to the camera's spot, against the solid prop
  boxes and the ground. Blocked means pull in at once; clear means ease back out (rate 5/s). The hero fades to 40%
  under 1.8 m and to 12% under 0.9 m (GDD §5.1).
- **Kick:** springs turn the picture on each shot and settle back; `forward` (the aim) never moves with them. The
  Camera shake setting scales them (Off 0, Low 0.45, Full 1).
- **Reveal shots:** a scripted spline with ease in and out.

### 5.4 Hero and weapons

- **Movement:** the hero is a kinematic capsule on the heightfield, colliding with prop boxes, the field edge and soldier
  circles (pushed, never stuck).
- **Firing (`combat.ts`, `hitscan.ts`):** each shot is traced along the **camera's** ray (what the crosshair covers),
  starting level with the hero, so nothing between the camera and the hero can be hit. The tracer is drawn from the
  muzzle to where the bullet stopped. The ray walks the hash cells (2 m) along its path and tests each soldier's
  standing capsule, nearest first.
  - Each hit spends one pierce.
  - A shield facing the shooter stops the ray (M6).
  - Splash weapons query the hash in a radius (M9).
- **Bodies (`bodies.ts`):** everything that can be shot is a structure of arrays (position, size, health, role,
  armour) with its hash. M1's range fills one; M2's crowd owns one. `Combat` only needs a `Targets` (bodies plus a
  `hit` callback), so the crowd plugs in without changing shooting.
- **Gun (`gun.ts`):** pure rules for rate, magazine and reloads (empty, early on request, and a top-up after 2.5 s
  idle), tested in `tests/shooting.test.ts`.
- **Aim assist (`aimAssist.ts`):** from SE, extended with the captain > ranged > nearest priority and the sticky
  target. The body under the crosshair always wins. Profiles per device and per assist setting (off, normal, strong).

### 5.5 Crowd simulation (`src/crowd/`)

- **Data layout:** structure of arrays sized for the High cap plus room for the fallen (360). Positions, sizes, health
  and role live in `game/bodies.ts` (what shots test); `crowdSim.ts` adds velocity, heading, state, timers, target,
  squad and slot, and the animation state the renderer reads (clip, start, rate, the previous clip for the blend).
- **States:** march, engage, attack, shoot, knocked, flee, cheer, idle.
- **Flow field:**
  - One per battlefield, 1 m cells: an integration field from the banner ring with obstacle costs.
  - Built at battle start in under 30 ms. Enemies follow its gradient.
  - Allies use formation slots, plus a local "toward target" steer.
- **Separation:** spatial hash with 2 m cells, at most 6 neighbours checked.
- **Melee:** each attacker locks one target and plays the attack clip; damage lands at the clip's hit frame. No physics.
- **Projectiles:** arrows and boulders are pooled instanced meshes on ballistic curves, with landing marks.
- **LOD:** soldiers more than 50 m from the camera think at 15 Hz but move every tick (they coast on their
  velocity between thoughts, so they never stutter).
- **Built (M2):**
  - Squads with anchors down the flow field, or a held spot.
  - Formation slots, targeting every 0.3 s, melee on the hit frame, staggers, directional knockouts.
  - Routs within 15 m of a fallen captain.
  - Archers' bolts with landing rings.
  - The hero as a target and an obstacle. Tests are in `tests/crowd.test.ts`.
- **Backdrop armies:** cheap instanced crowds outside the field marching on loops, with no simulation.

- **Shields, bosses and charges (M6):** per soldier, `shield` health (0 none, `Infinity` unbreakable) blocks the
  hero's bullets within 70° of head-on (`CrowdSim.hit` returns `blocked`; combat stops the bullet there);
  `explode` breaks a breakable shield first. A shield break or a boss's half-health swaps the soldier's type to its
  `brokenAs` (the shieldless look and numbers, same health). `size` scales the body that's shot, reach, spacing and
  the clip rates (planted feet stay planted: `qa:feet` checks the 2× walk). A type with `charge` winds up
  (`STATE.windup`: the lane glows via `Markers.setLane`) and runs (`STATE.charge`), every `every` seconds, `times`
  times. `sim.boss` / `bossUp` feed the boss bar; `onBossHalf` brings the wave's `bossHalf` squads
  (`Director.add`); `onBossDown` routs every enemy squad and stops the director.

### 5.6 Crowd rendering (bone textures; built in M2)

- **Why not vertex textures:**
  - Baked vertex positions cost about a megabyte per model.
  - Sampling the rig's bone matrices instead costs a fraction of that.
  - Accessories ride their bones for free, and all models share one set of clips.
- **Building, at load (`soldierKit.ts`):**
  - The KayKit GLBs (trimmed by `npm run assets:soldiers`) load with three's GLTFLoader.
  - Each model's skinned parts and rigid accessories merge into one geometry. Accessories are bound wholly to their
    bone, and a part id per vertex drives masks.
  - The clips (idle, walk, run, two attacks, hit, knocked, cheer, shoot, reload, block) are sampled at 30 fps into a
    float texture of 3×4 bone matrices: 41 bones × 349 frames.
  - The walk and run speeds are measured from the planted toes, so the clip rate matches the ground speed.
- **Instancing:** one `InstancedMesh` per model, through `crowdMaterial.ts`, which patches `MeshLambertMaterial` with
  `onBeforeCompile`, plus a matching depth material for shadows.
- **Instance attributes:**
  - `iClip` and `iPrev`: the clip, frames, start time and rate, and the previous clip for a 0.15 s blend.
  - `iLook`: blend start, hit flash, sink, part mask.
  - `iCloth`, `iSteel`: colours.
  - The shader interpolates between neighbouring frames, so slowed clips stay smooth.
- **Team colours:** palette texels near the model's cloth hue take the soldier's colour, and grey steel is multiplied
  by the army's tint.
- **Variety:** body and accessory variants (helmets, shields, weapons) are sub-meshes toggled by the mask, so one draw
  call still covers the whole archetype.
- **Draw calls (planned):**
  - 3–5 archetypes × 2 LODs
  - projectiles, coins, effects
  - field and props (merged per material)
  - hero, gun, truck, banner, sky
  - about 60–90 in total, against a budget of 150.

### 5.7 Battles (built in M3)

- **Screens (`game.ts`):**
  - `battle`, `map` and `sandbox` (dev scenes).
  - A new player boots into Battle 1; a returning player lands on the map.
  - Victory → card → map. Defeat → card → Retry or Map. Pause → Back to map.
- **Phases (`battle.ts`):**
  - `ready` (2.5 s), then `wave` and `break` in turn, then `victory` or `defeat`.
  - The battle reports phases and events to the game, which owns the cards, the shop panel, the HUD and Poki.
- **Poki:** one rule (`syncGameplay`). Gameplay is on during `ready` and `wave` in play mode after the first input,
  and off in breaks, on the map, on cards, in pause and in ads. `PlatformSession` drops duplicates.
- **Gold:**
  - Enemy knockouts and routs drop coins (`coins.ts`, pooled, one draw call). Inside the magnet they fly to the
    hero; at a wave's end all of them do.
  - Collected gold goes straight into the save (never lost). Wave and first-win bonuses are added by the battle.
- **The shop:** walking into Rosie's ring in a break opens the docked panel (`ui/shopPanel.ts`) and frees the mouse
  (`input.lockAllowed`); walking out, ✕ or Esc closes it. The view shifts so the hero stays visible.
- **Dev links (dev builds only):** `?battle=N&wave=W&gold=G`.

### 5.7b Director (waves)

- **Input:** reads `BattleDef.waves[]`. Each wave is `SquadDef[]` with `at` (seconds into the wave), `edge`, `type`,
  `count`, `formation` and an optional `captain`.
- **Alive cap:** honours the tier's cap. Squads queue off-field until there is room.
- **Wave end:** emits `waveCleared` when spawned = defeated and the queue is empty.
- **Scripted battles:** Battle 1 and boss battles use hooks such as `waitForStep` and `bossPhase`.

### 5.8 Economy and shop

- **Rules in `state/`:**
  - `knockoutGold(type, region)`, `waveBonus`, `firstClear`
  - `canBuy(item, state)`, `buy(item, state)` (returns a new state)
  - `recommend(state, catalogue)`, `crowns(bannerPct)`, `unlocked(item, progress)`
- **Shop catalogue:** `content/shop.ts` lists tab, id, kind (gun, gunLevel, hero, ally, support, banner), unlock battle
  and price curve.
- **Balance simulator:** `tools/balance/simulate.ts` replays each battle's waves (kill share 55%, saving player) and
  checks GDD §11.2. It runs in `npm test` as a fast check and in `npm run balance` with a full report.

### 5.9 Onboarding (built in M4)

- **Runner:** `game/onboarding.ts`. Battle 1's script is a step machine (`move` … `map`, `done`); later battles pick
  one lesson at a time (device-change Move and Aim, grenade, army, hero). It reaches the game only through
  `OnboardingHost` (the prompt, Rosie, markers, the HUD, the shop, measures, saves), so it can be read and tested on
  its own.
- **Scripted spawns:** squads with a `cue` in `content/battles.ts` wait until the script calls `battle.releaseCue()`
  (optionally at a chosen spot); replays let them in on time (`director.autoCues`).
- **Progressive HUD:** `battleHud.reveal(part)` and `revealButton()`; Next wave is held back until its step.
- **Prompts:** `ui/prompt.ts` (`PromptSpec`: keys, hand, target, text). `place()` runs every frame and picks the first
  free spot beside the target's card or panel (`besideSpot`).
- **Reveals:** `game/reveal.ts`: `planReveal()` (a pure function, tested) decides the shot and the nameplate;
  `RevealShot` drives the camera rig's scripted shot (`rig.setShot`, `shotWeight`). `#game.is-revealing` hides
  prompts meanwhile.
- **Rules:** steps are saved as seen in `seenLessons`, per device class for controls (`move:touch`), plus `b1` and
  `intro:<type>`. Stuck timers are 6/12/20 s (per-step overrides). Dev scenes (`screen === 'sandbox'`) teach
  nothing.

### 5.10 UI

- **DOM over the canvas.** Every size is `calc(N * var(--s) * 1px)`.
- **Layout:** `#game.is-portrait`, `.is-touch`, safe-area variables. The pill area is kept clear: on a landscape
  phone the pause, gold, shop and map keep 52 px from the top corners; in portrait the shop sheet starts below 30%
  + 62 px. `BattleHud.fit()` moves the bars to the top right when the gold pill would touch them (on resize and
  when the gold gains a digit). The docked shop's width is `--shop-w`, shared with Next wave's position and the
  field's re-centring.
- **Building:** `ui/dom.ts` helpers, inline SVG icons, no framework.
- **Painting:** the HUD only touches the DOM when a value changes.
- **Docked panels:** the shop panel, cards and map are built from shared components (`button`, `priceButton`,
  `rewardedButton`, `card`). The Poki button rules (order, size, colour) are enforced in one place.

### 5.11 Audio

- Web Audio `GameAudio` with typed `SoundName`/`LoopName`, buses (master, music, effects, ambience), positional sound,
  a crowd loop scaled by the number of soldiers nearby, and a variation limiter (at most N of a sound per second).
- `unlock()` runs on first input. `silence(on)` covers ads and pause.

### 5.12 Saves

```ts
interface SaveV1 {
  v: 1;
  gold: number;
  battles: Record<BattleId, { won: boolean; crowns: 0 | 1 | 2 | 3; defeatsInRow: number }>;
  guns: Partial<Record<GunId, number>>;        // owned guns → level 1..5
  hand: [GunId, GunId | null];                 // equipped slots
  support: { owned: Partial<Record<SupportId, number>>; equipped: SupportId | null };
  hero: { health: number; speed: number; grenades: number; magnet: number };
  army: { militia: number; archers: number; menAtArms: number; knights: number; banner: number };
  seenLessons: string[];
  stats: { knockouts: number; routs: number; playSeconds: number; battlesWon: number };
  lastStand: Partial<Record<FieldId, number>>; // best wave
}
```

- **Settings:** a separate key, merged over defaults.
- **`SaveStore`:**
  - Wraps all storage in try/catch, probing with a `poki_ignore` key.
  - Migrates version N to N+1.
  - Returns null for garbage or future versions, so the game starts fresh.
- **Fixtures:** each released version adds `tests/fixtures/saves/<version>.json`, and a history test loads them all.

### 5.13 Strings and languages

- `content/strings/en.ts` is the source (typed keys). Other languages are `Record<StringKey, string>`.
- `t(key, params)` uses `{name}` placeholders and falls back to English.
- A test checks every key and placeholder.
- **Eleven languages (M11):** en fr it de es pt tr ru zh ja ko, by the base code Poki or the browser gives (`pt` is
  Brazilian Portuguese, `zh` Simplified Chinese); the player's pick in Pause overrides it. The ten translations are
  plain text, `tools/strings/<code>.txt` (`key|text` lines), written into `content/strings/<code>.ts` by `python
  tools/strings/build_strings.py`, which checks every key is there once and gives French its non-breaking space
  before ! ? : ; % ». Edit the text file and rebuild, never the .ts. Battle names and their "New:" lines are strings
  too (`battle.name.N`, `battle.new.N`; `battleName`, `battleNews`).
- **Switching in Pause** applies at once (`Game.applyLanguage`): the page's `lang` (so the browser picks a CJK font
  for zh/ja/ko), every label built once (made with `label(node, key)` in `ui/dom.ts`, redone by `relabel`), the
  open pause card, the map and shop, and the wave label. Everything else is written when it shows.
- **Fonts:** the UI font stack (`--font`) ends in `system-ui, sans-serif`, so Cyrillic and the CJK languages use the
  device's own fonts; nothing is downloaded for them.
- **Check:** `npm run qa:hud -- --langs=all` runs every state in every language on the seven tightest screens.

### 5.14 Hidden tab, resizing and turning (M11)

- **Hidden tab** (`Game.onVisibility`): the game saves and its sound goes quiet (`Audio.silence`, paired with the
  return so the count stays right); a wave in progress opens the pause card (`gameplayStop`), which waits after the
  tab comes back. A shop break, an offer, the map or the ending only go quiet. During an ad nothing changes.
- **Resize and turning** go through `Stage.resize` (window and visual viewport): the canvas, the HUD scale and the
  `is-portrait` class follow, the shop docks right or becomes a bottom sheet, and the wave goes on.
- `npm run qa:edges` checks all of it in real time: hidden mid-wave, in the shop and on the map; a desktop window
  resized to a phone's shape mid-wave and back; a phone turned mid-shop and back; vibration on a phone and not on a
  computer; Reduce motion stopping the UI's animations; no page errors.

## 6. Quality tiers and performance

- **Tiers** (`render/stage.ts`):

  | Tier | Render short edge | Shadows | Soldiers cap | Pixel ratio cap |
  |---|---|---|---|---|
  | High | 1080 | 2048 shadow map | 300 | 2 |
  | Low | 720 | 1024 | 160 | 1.5 |
  | Lowest | 520 | none | 100 | 1 |

- **Auto tier:** a low-end start (touch, 4 or fewer cores, or 3 GB or less memory) begins on Low. A 2 s warm-up and a
  1.5 s benchmark follow, then a check every 3 s that steps down a tier below 40 fps.
- **Performance check:** `npm run perf` throttles the CPU through CDP, counts draw calls over the whole frame and
  measures fps with a full Region 4 wave. Budgets: 150 draw calls, 30+ fps at 4× CPU on Low, and (M11) 30+ fps on
  Lowest at 6× CPU on a portrait phone (`phone-lowest`; `--phone`, `--tier=`, `--cpu=` pick or slow the runs).
- **Loading (M11):** the first download is what Region 1 needs: the code, `kit.glb` (Region 1's pieces and the ones
  every battle shares), the hero, his guns, Rosie and the soldiers (the barbarian too: the Queen's militia wear it).
  Once the first screen is up, `Game.loadLater` fetches the rest in the background: `kit-later.glb` (the pieces only
  Regions 2–4 use, listed in `content/kitLater.json`, checked by `tests/kitSplit.test.ts`), the riders' horse
  (`Crowd.addMount`, a batch added to the crowd's renderer) and the War Wagon's oxen (`WarWagonModel.addOxen`), then
  warms their shaders. A battle from Region 2 on starts through `playBattle`, which waits for it (the map's button
  reads "Loading…"); each part falls back on its own if it fails (bare fields, riders on foot, a wagon without oxen).
  Queen Ada is fetched when Battle 20 starts, the first time it can end the story. `tools/check-size.mjs` counts all
  of these, and the audio, as after the first load: at most 3.5 MB first and 8 MB in all on the wire.

## 7. QA tools

| Command | What | When |
|---|---|---|
| `npm run typecheck`, `lint`, `test` | Types, lint, rules, saves, strings, platform session, balance fast check | Every change |
| `npm run qa` | Autopilot plays Battle 1 with real input (desktop and touch), checks onboarding steps, Poki event order, no ads in B1 | Gameplay, onboarding or HUD changes |
| `npm run qa:poki` | Poki's event order on desktop and a phone; interstitial points; every card's rewarded button order, size and look; rewarded success, fail and blocked; the mouse freed and input off in ads; no 🎬 without ads | Any ad, SDK, card, pause or save change |
| `npm run qa:hud` | 19 sizes × HUD states × cards (longest strings): overlaps, clipping, pill area, targets ≥44 px. `--langs=all` | Any HUD, CSS or text change |
| `npm run perf` | The clash at the cap: fps and draw calls on High, on Low at 4× CPU, and on a Low phone | Render or crowd changes |
| `npm run qa:feet` | Planted feet don't slide under a jogging and a walking soldier | Animation, crowd speed or soldier asset changes |
| `npm run assets:soldiers` | Rebuilds `public/assets/soldiers/` from the KayKit pack | Changing clips or kept parts |
| `npm run balance` | Economy simulator report against GDD §11.2 (a fast version is in `npm test`) | Any price, gold or wave change |
| `npm run qa:battles` | A scripted player wins Battles 1–3 from a new save through the map, buys Recommended items, loses one on purpose, reloads | Battle, economy, shop, card or save changes |
| `npm run shots` | Named scenes at chosen sizes, frame-stepped (`tools/qa/shots.mjs`) | Visual reviews |
| `npm run record` | Frame-exact clips with scripted look and fire, plus a contact sheet (`tools/qa/record.mjs`, ffmpeg) | Feel reviews |
| `npm run build`, `package`, `qa:build` | Poki zip, size check, zip tested in an iframe as Poki serves it (`--real-sdk`) | Before every upload |
| `python tools/qa/noise.py` | Grain and busyness metric before and after look changes | Art and look changes |

## 8. Release and live updates

1. Bump the version in `package.json`.
2. Add a `CHANGELOG.md` entry.
3. Add a save fixture if the save shape changed.
4. Run `npm run test`, `qa`, `qa:poki`, `qa:hud`, `perf` and `balance`.
5. Run `npm run package` and `qa:build`.
6. The owner uploads `release/thunder-knight-<version>-poki.zip` and checks it in the Poki Inspector.

**Seasonal content:** date-windowed entries in `content/events.ts`, read from the local clock. There is no server; Poki
forbids external requests.

## 9. How to

- **Add a gun:**
  1. Add a `GunDef` in `content/guns.ts` (stats, feel, unlock battle, price).
  2. Add a shop entry in `content/shop.ts`.
  3. Add the model to `tools/blender/guns.py`, then run `npm run assets`.
  4. Add an icon render and strings.
  5. Run `npm run balance`.
- **Add an enemy:**
  1. Add an `EnemyDef` (role, stats, behaviour flags, sounds, nameplate string).
  2. Add the VAT archetype or variant.
  3. Use it in `battles.ts`.
  4. Add a nameplate lesson in the onboarding table if it is new.
- **Add a battle:**
  1. Add a `BattleDef` (field, waves, unlocks, first-clear bonus).
  2. Add a map node.
  3. Run `npm run balance`.
  4. Use the dev jump link `?battle=N` to play it.
- **Add an ad placement:**
  1. Add a switch in `content/ads.ts`.
  2. Use the `rewardedButton` component (enforces the rules).
  3. Add `measure` calls.
  4. Add a `qa:poki` case.
- **Change the save shape:**
  1. Bump `SAVE_VERSION`.
  2. Add a migration and defaults.
  3. Add a fixture for the last released version.
  4. Run `npm test`.
