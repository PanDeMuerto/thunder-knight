# Thunder Knight (folder: Knight Makers)

Casual third-person wave shooter for Poki (working title). One stranger with modern guns holds Queen Ada's banner
against the Iron Baron's medieval army: knock out soldiers, rout captains, collect gold, buy guns, upgrades and soldiers
at Rosie's truck between waves. TypeScript, Three.js, Vite.

Read in this order: `docs/milestones.md` (status, what's next), `docs/vision.md` (the owner's decisions in §6),
`docs/gdd.md`, `docs/onboarding.md`, `docs/tech-design.md`. Research is in `docs/research/`.

## Commands

Commands marked with a milestone in brackets aren't in `package.json` yet; that milestone adds them.

- `npm run dev` (port 5180, Browser pane launch config "knight"), `npm test`, `npm run lint`, `npm run typecheck`,
  `npm run build` (typecheck, the Poki build, then the size check)
- `npm run package` makes the Poki zip in `release/`, `npm run package:itch` the ad-free itch.io zip. Bump the version
  in `package.json` first. `npm run qa:build` tests the zip as Poki serves it (an iframe on a scrolling page, an ad
  blocker, incognito, a phone, no outside requests; `-- --real-sdk`, `-- --target=itch`). Before an upload, follow
  `docs/release-checklist.md`
- `npm run qa:poki` checks Poki's event order on desktop and a portrait phone (first input, pause, resume, no
  duplicates, 44 px targets) and the ads: where interstitials are asked for, every card's rewarded button order, size
  and look, rewarded success, failure and an ad blocker, and no 🎬 without ads. Run it after any change to ads, the
  SDK, cards, pause or saves. It needs the dev server. Dev: `?noads` plays the ad-free build, `?crate` forces a rift
  crate, `window.__adMode = 'fail'` or `'blocked'` makes rewarded ads fail
- `npm run qa` plays Battle 1 with real input (desktop and touch) and checks onboarding and Poki's event order. Run it
  after any change to onboarding, the battle loop, the HUD or input; `-- --shots` saves a picture per step, `--only=`
  runs one device. Game time runs 3× (`?speed=3`, dev only)
- `npm run qa:hud` checks the HUD and cards on 19 screen sizes (overlaps, clipping, 44 px targets, Poki's pill area).
  Run it after any HUD, CSS or text change; `-- --hud=1.5` checks the biggest HUD size, `--langs=all` every language,
  `--screens=`/`--states=` narrow it. Pictures go to `qa-output/hud/`
- `npm run qa:edges` checks the edge cases in real time (M11): the tab hidden mid-wave (pause, quiet), in a shop and on
  the map (quiet only); a window resized mid-wave and a phone turned mid-shop (canvas, HUD and shop on screen);
  vibration on a phone only; Reduce motion. Run it after changes to pause, audio, resizing, the shop or settings
- `npm run qa:soak` plays a Last Stand for 30 waves (`--waves=`, `--field=`) and fails if the JS heap grows over 25%
  from wave 10, GPU objects keep growing, or a frame goes over 150 draw calls (M10's exit). Dev link: `?stand=N` opens
  a Last Stand on Battle N's field
- `npm run perf` reports fps and draw calls with the clash at the cap (`-- --battle=N --wave=W` measures a battle's wave instead): High, Low at 4× CPU, a Low phone, a Lowest phone at 6× CPU (budget 150
  draw calls, 60 fps on High, 30+ fps at 4× CPU on Low and at 6× CPU on Lowest; `-- --phone --tier=lowest --cpu=6`
  picks runs). Run it after render or crowd changes
- **Loading (M11):** Region 1 is the first download; the later regions' field pieces (`kit-later.glb`, listed in
  `src/content/kitLater.json`), the riders' horse and the oxen come after the first screen (`Game.loadLater`). Start a
  later region's battle with `playBattle` (it waits); QA tools that call `startBattle` directly go through
  `tools/qa/stepper.mjs`, which waits for `g.laterDone`. A new field piece only a later region uses goes in
  `kitLater.json` (`tests/kitSplit.test.ts` checks)
- `npm run qa:feet` checks that planted feet don't slide. Run it after animation, crowd speed or soldier asset changes
- `npm run assets:soldiers` rebuilds `public/assets/soldiers/` from the KayKit pack, and `npm run assets:field` the
  field kit (`public/assets/field/kit.glb`) from KayKit Medieval Hexagon and the Poly Pizza farm set
  (`docs/asset-pipeline.md`, `docs/credits.md`). Dev: `?nokit` shows the greybox field for before-and-after checks
- `npm run balance` runs the economy simulator against GDD §11.2. Run it after any price, gold or wave change; `npm
  test` includes a fast version
- `npm run qa:battles` plays the whole campaign, Battles 1–20, end to end with a scripted player (map, shop, shield walls, Sir Grudge,
  riders, firebrands, men-at-arms, the War Wagon, Brutes, battering rams, catapults, the Siege Tower; it calls its support when foes are
  near; a defeat, a reload; from Battle 5 a battle may take a second try). It plays like a fair player: carries its
  two guns with the most damage a second, steps out of glowing lanes, goes for far archers and far crews, and prints a
  report on a defeat or timeout (the wave, hand, purse, who's in the ring or still standing). Run it after battle, economy, shop, card or save changes. `node qa-output/m9/bot-region3.mjs
  <battle>` plays one battle with the same bot from the simulator's purse and logs who drains the banner. Dev links:
  `?battle=N&wave=W&gold=G`; `?battle=5&wave=5&boss=2` starts Sir Grudge's second phase; `?battle=10&wave=6` the War
  Wagon; `?battle=11&wave=2` a Brute; `?battle=12&wave=2` a ram. M9 review scripts: `node qa-output/m9/riders.mjs` (and
  `firebrands`, `landmarks`, `part2`, `part2b`, `wagon`; `part4` for the Brute, the ram and Region 3's fields; `mg` and
  `mg-icon` for the machine gun; `part5` for the knights, the Sentry Gun, catapults, the grenade launcher and Battles
  13–14's fields; `part6` for the Siege Tower and Pass of Echoes; `part7` for the Iron Keep's look, Battles 16–17 and the minigun; `part8` for elite captains, the rocket
  launcher and Battles 18–19; `part9` for the Iron Ox and Battle 20; `stars` for every gun in the hand at ★1/★3/★5;
  `m11-fields` for a field from each kit file;
  `m10-stand` for a Last Stand's flow (countdown, shop break, record, card); `m10-ending [screen]` for the Baron's
  donkey escape and Battle 20's ending scene and card; `ada` and `ada-poses` for Queen Ada;
  `drawcalls [battle] [waves]` counts draw calls in a battle's heaviest waves, which `perf` doesn't see: keep them
  under 150, and merge a new model's fixed parts with `render/mergeStatic.ts`).
  `?battle=15&wave=7` starts the Siege Tower, `?battle=20&wave=7` the Iron Ox
- `npm run shots -- <scene> --screens=d1280,p390,l844` (scenes: start, hill, clash, front, firing, captain, wall, arcs,
  reload, battleWave, shop, victory, defeat, map, shieldWall, boss, bossCharge) and `npm run record -- <clip>` (wave,
  mouse, touch, touchLandscape, front, march, feet, wall; clips carry the game's sound, mixed from a log) for reviews
  by eye. Both step exact frames headless and need the dev server; output goes to `qa-output/`. `?scene=hill` (or
  clash, front, empty) opens the dev server at a scene (a clean sandbox, no onboarding); `g.devAdvance(seconds)` runs
  the armies forward. A fresh save is a new player and
  boots into Battle 1's script. The Browser pane runs its loop slowly while hidden, so judge pictures from these.
  Don't edit source files while a tool runs: the dev server reloads the page and the run fails.
- `npm run assets:hero` rebuilds `public/assets/hero/` (the hero, his guns and Rosie) from KayKit Adventurers and the
  Quaternius guns (`docs/asset-pipeline.md`). Review scripts for the hero, Rosie, shields, banner and gun icons are in
  `qa-output/m7/` (`node qa-output/m7/<name>.mjs`; they need the dev server)
- `npm run audio` cuts the sounds and music from the owner's library into `public/assets/audio/` (ffmpeg; names in
  `src/content/audio.ts`, which also holds the mix). `-- --candidates` writes the music candidates page for the owner
  (`http://localhost:5180/qa-output/music/index.html`). `node qa-output/m8/audio-check.mjs` checks the clips load and
  the music follows the phases. Frequent sounds stay quiet and capped per second
- `npm run thumbs` renders Poki's thumbnails (two candidates, 1080 and 628 px, no HUD) and the 6 s hover video into
  `release/poki-submission/` (`-- minigun`, `ox`, `hover` for one); `node tools/qa/store-shots.mjs` the five store
  screenshots. The texts are in `docs/store-listing.md`. Both need the dev server
- `python tools/strings/build_strings.py` writes the ten translations (`src/content/strings/<code>.ts`) from
  `tools/strings/<code>.txt` (`key|text` lines). A new English line in `en.ts` needs a line in each text file, then
  this; `npm test` checks every key and placeholder, `npm run qa:hud -- --langs=all` the layout in every language.
  Labels built once in a UI constructor use `label(node, key)` (`ui/dom.ts`) so a language change in Pause redoes them
- `python tools/qa/noise.py <before folder> <after folder>` keeps the look calm; `python tools/qa/colour_blind.py
  <png>...` simulates the three colour blindnesses (output in `qa-output/colour-blind/`)

## Rules

- **Poki** (full notes in `docs/research/poki-and-ux-guidelines.md`):
  - One currency (gold).
  - No ad timers. No interstitial before the first `gameplayStart`, in Battle 1, or mid-wave.
  - The standard option comes first and is equal or larger. Reward buttons are never green and always show 🎬. Rewards
    only on `success === true`.
  - Release pointer lock, mute and disable input during ads.
  - All ages: bloodless knockouts (tumble, dust, coins). No blood, wounds or gore.
  - No external requests, CDNs or links. Every game must work in portrait and landscape.
- **Originality:** the game is an original work inspired by a genre. Never use names, art, audio, maps or text from
  Kingmakers or any other game. "Knight Makers" is only the folder name; it must not become the store title.
- **Where code goes:**
  - Tuning, tables and text go in `src/content/`.
  - Game rules go in `src/state/` as plain functions, with tests.
  - Only `src/platform/` may touch the SDK. Only `src/save/` may touch storage.
  - Save shape changes need a migration and a fixture for the last released version.
- **Assets:**
  - Vendor packs (CC0 Quaternius, KayKit, Kenney in `C:\PROJECTS\ASSETS`) are never committed. Game assets are built
    from them by script. Every source is listed in `docs/credits.md`.
  - Check every new or changed asset by eye, in review renders *and* in the running game: at rest and moving, near and
    far, in a crowd, in landscape and portrait. No artifacts.
- **Playtests must never take the owner's mouse.** Every QA tool fakes pointer lock (`tools/qa/fake-lock.mjs`, before the
  first `goto`). In the Browser pane, read the game with JavaScript rather than clicking into the canvas.
- **Onboarding** follows `docs/onboarding.md`:
  - One thing at a time, ended by doing it, taught where it's needed.
  - Key pictures and hands, at most 4 words.
  - Prompts never mid-screen.
- **The HUD** stays small, see-through and at the edges. Dev panels are opt-in (`?dev`). Check at the Browser pane's size
  (about 800×560) as well as phone and 1280.
- **The look** stays calm for a casual audience: no grain, dither, wobble or busy detail. Effects stay small.
- **Decisions** made with the owner are in `docs/vision.md` §6. Don't change them without asking.
- **Status and next steps:** `docs/milestones.md`. Every change gets a line in `CHANGELOG.md`, in players' words.
- **End of every task:** open the build in the Browser pane (launch config "knight") and give the link, plus the zip path
  if one was packaged.
