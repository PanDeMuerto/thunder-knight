# Thunder Knight: milestones

Each milestone ends with something testable. The **Exit** list is the definition of done. Status: ⬜ not started ·
🟨 in progress or waiting on the owner · ✅ done.

## Overview

| # | Milestone | Outcome | Estimate (sessions) | Status |
|---|---|---|---|---|
| P | Plan | Research, vision, GDD, onboarding, tech design, this plan | 1 | ✅ |
| M0 | Foundations | Skeleton running on port 5180, Poki SDK wired, saves, strings, QA and packaging | 1 | ✅ |
| M1 | Hero, camera and gun feel | Over-the-shoulder rig (landscape and portrait), mouse and touch controls, pistol, aim assist, dummies | 1 | 🟨 built; the owner's playtest |
| M2 | Crowds | Bone-texture instanced soldiers, 30 Hz crowd simulation, red against blue clash at budget | 1–2 | ✅ (a real phone at the checkpoint) |
| M3 | Core battle loop | Banner, waves, gold, walk-up shop, Next wave, victory and defeat, map, saves; Battles 1–3 in greybox | 2 | ✅ |
| M4 | HUD, UX and onboarding | Final HUD in both orientations, prompts, Battle 1 script, lessons for B2–B4, pause and settings | 1–2 | 🟨 built; the owner's cold playtest |
| M5 | Poki ads | Interstitials, Rally, ×2 gold, rift crate; `qa:poki`, `qa:build`; itch build | 1 | 🟨 built; the owner's Inspector run |
| M6 | Region 1 complete | Shield Wall, Sir Grudge, B4–B5, every Region 1 shop item, balance through B5 | 1 | ✅ |
| M7 | Art: Region 1 | CC0 packs downloaded and evaluated, asset pipeline, hero, guns, soldiers, truck, field kit, look | 2 | 🟨 built; the owner's look approval |
| M8 | Audio and juice | Sounds, music candidates, hit-stop, tumbles, rout moment, reveal, fanfare | 1 | 🟨 built; the owner's listening notes |
| ✋ | **Checkpoint: Region 1 slice** | The owner plays B1–B5 on desktop and a phone; the plan is adjusted | — | 🟨 kit ready (`docs/playtest.md`); waiting on the owner |
| M9 | Regions 2–4 | B6–B20: enemies, bosses, guns, allies, support, swap, three new field kits | 3–4 | ✅ Done (0.20.0) |
| M10 | Ending and Last Stand | Final boss, ending, Last Stand mode | 1 | ✅ Done (0.22.0) |
| M11 | Polish and performance | Tiers, phone perf, loading, size, 11 languages, accessibility, credits | 2 | ✅ Done (0.25.0) |
| M12 | Poki release | Thumbnails, store texts, screenshots, checklist, zip; the owner uploads | 1 | 🟨 1.0.0 on Poki: playtest and Player Fit Test started 23 Nov; results pending |
| M13+ | Live operations | Updates every 1–2 weeks per GDD §20 | ongoing | ⬜ |

## Status on 16 Nov 2026 (version 1.0.0, M12: the release candidate and its store package)

The owner said "continue according to plan" again. What's left of M12 is the owner's: upload, Inspector, playtest and
Web Fit. Open with it: the Region 1 checkpoint playtest (`docs/playtest.md`), Battle 20's difficulty (below), the store
title, the thumbnail pick, and a native speaker's read of each language.

**Built:**
- **Thumbnails** (`npm run thumbs`, `tools/qa/thumbnails.mjs`): rendered from the game, frame-exact, the HUD hidden, a
  camera placed by hand round the hero, square at 1080 and 628 px. Candidate A (recommended): the hero from behind
  his shoulder, the ★5 gold minigun blazing, brass flying, a crowd of peasants and footmen charging up the hill.
  Candidate B: the hero squaring up to the Iron Ox under the Iron Keep, horns aglow, the Baron in his turret, the
  fire marked on the grass. First drafts showed the hero's back hidden behind his own men, the camera at his ear, the
  banner pole down the middle, the Ox hidden behind him; each was moved and looked at again. The archers' red landing
  rings are hidden for the pictures.
- **The hover video** (`thumbnail-hover.mp4`): 1080 × 1080, 30 fps, 6 s, muted: candidate A in motion, the block
  charging and tumbling as he sweeps the minigun, the camera pushing gently in (a wider swing lost him off the edge).
- **Screenshots** (`tools/qa/store-shots.mjs`): 1280 × 720 with the HUD: a wave at the Ferry with the machine gun,
  the Iron Ox fight with its boss bar, Rosie's shop, the map with Queen Ada's line, the ending. Lessons, nameplates and
  toasts are cleared from the staged two.
- **Store texts** (`docs/store-listing.md`): the name (Thunder Knight, to be confirmed), category ideas (Shooting Games
  main; Action, Strategy, 3D), and a one-liner, description and controls (desktop and touch) in all eleven languages.
- **The release checklist** (`docs/release-checklist.md`) brought up to date: everything ours is ticked; open are a
  real low-end phone, a native read of each language, the title, and Poki for Developers.
- **1.0.0:** no change to the game since 0.25.0 (only tools and docs), so 0.25.0's full QA stands for it: `npm test`
  (152), lint, `qa`, `qa:poki`, `qa:edges`, `qa:hud` (19 screens, the biggest HUD, every language), `qa:soak`,
  `perf`, and `qa:battles` with no console errors. On 1.0.0 itself: `npm test`, lint, the build's size check (1,938 KB
  first, 4,909 KB in all), `qa`, `qa:poki`, and `qa:build` on both zips and with Poki's real SDK. Zip
  `release/thunder-knight-1.0.0-poki.zip` (4,804 KB); the itch.io zip beside it.
- **Battle 20** still loses the bot's first try more often than not (five of the last six runs), winning on the retry
  with the comeback help. Unchanged, as the owner hasn't asked for it; easing it (a second more between the Ox's two
  escort blocks, or blocks of five) is a small change for 1.0.1 if the playtest agrees.

**Uploaded (on the owner's request, through their Chrome):** 1.0.0 went up on 16 Nov 2026 as a new game, "Thunder
Knight" (game `70427d96-38c0-40d9-8bef-dfafd117e71a`, version `a9efaae9-a6bc-43fd-b907-8111197bd1b1`, Ready). The
preview on poki.com loads and starts Battle 1 in Poki's frame. Poki's initial content check is pending; until it
passes, the game's settings and testing are closed. The owner asked for the upload only: the thumbnail, hover video,
category and orientations are theirs to add (the files and texts are in `release/poki-submission/` and
`docs/store-listing.md`).

**Tests started (23 Nov 2026, on the owner's request, through their Chrome):** the content check had passed. The
owner's own icon (the knight on a red motorbike with goblins, `release/poki-submission/icon-owner-1254.png`) is the
game's thumbnail; categories are Shooting Games (main), Action Games and Strategy Games; Level 2's steps are ticked.
The Inspector's SDK Basics are 6 of 6 on 1.0.0 (events fired with keys sent to the game's frame, never a click into
it: start, stop on Pause, start on resume, no duplicates). A playtest of 10 recordings and a Player Fit Test of 500
gameplays (any device, both orientations; results within about 3 hours) are running. Not done: both orientations in
Settings, the hover video, the Inspector's other four modules.

**Next:** read the Player Fit Test's result (to pass: 3+ minutes on average and 25%+ of players at 3+ minutes) and
watch the 10 recordings; fix the worst moment (Battle 20's difficulty too, if they show it) in 1.0.1, then the Web Fit
test (Level 4). M13 (live updates, GDD §20) follows what those show.

## Status on 8 Nov 2026 (version 0.25.0, M11 complete: accessibility, credits, haptics, edge cases)

The owner said "continue according to plan" again. The Region 1 checkpoint is still waiting on the owner
(`docs/playtest.md`), and so is the question from 0.24.0 about easing Battle 20 (below).

**Built (part 3):**
- **Reduce motion** (GDD §15.8): the setting already followed the device's preference and cut the camera's shake and
  the army reveal, but it had no switch; now it's in Settings, and it also ends the UI's own animations and fades
  (`#game.is-reduced-motion`; `qa:edges` checks the Next wave button's breathing stops).
- **The colour-blind pass** (`colour_blind.py` on a wave, a boss, the map, the Ox's wind-up, a charge): the armies,
  bars (with their icons) and toasts hold up in all three, but the Iron Ox's fire cone and a charge's lane (orange and
  red at 45%) sank into the grass for red-weak and green-weak eyes, and the hero's deep red health bar into its track.
  The cone is now light amber at 62%, the lane light coral at 60%, the health bar coral; re-simulated, all three read
  by brightness.
- **HUD size:** `qa:hud -- --hud=1.5` clean on all 19 screens.
- **Credits** (`content/credits.ts`): a screen with a heading per group (3D models; sound and music, translated) and the
  makers' names (KayKit · Kay Lousberg, Quaternius, Kenney, Poly Pizza; Ovani Sound, Echoes Audio · Pizza Doggy,
  Kenney), then "everything else was made for this game". `credits.body` is gone; a `qa:hud` state checks it in every
  language.
- **Vibration** (`content/haptics.ts`, `input/haptics.ts`): the setting existed but nothing buzzed. Now a phone gives a
  short pulse when the hero is hit (22 ms) or knocked down, a boss changes or falls, a blast lands close, or a purchase
  goes through; a volley of hits is one buzz (0.25 s apart, a knockdown and a boss's fall always come through); never
  on a computer, and it follows a switch between mouse and touch. Tested, and checked in `qa:edges` with a recorded
  `navigator.vibrate`.
- **Edge cases** (tech design §5.14): a hidden tab only saved; now it also goes quiet, and a wave in progress pauses
  (`gameplayStop`) and waits; a shop break, an offer, the map and the ending only go quiet. New `npm run qa:edges`, in
  real time: hidden mid-wave, in the shop and on the map; a desktop window resized to a phone's shape mid-wave and
  back (canvas follows, HUD on screen, the wave goes on); a phone turned mid-shop and back (the shop stays open and on
  screen, Next wave clear of it); vibration; Reduce motion; no page errors. Resizing and turning needed no fixes.
- **M11's exit:** first download 1,938 KB of 3.5 MB, total 4.9 MB of 8 MB; 30+ fps on Lowest at 6× CPU (part 1);
  every language clean in `qa:hud` (part 2); no console errors in a full playthrough (`qa:battles`, below).
- **QA:** `npm test` (152), lint, `qa`, `qa:poki`, `qa:edges`, `qa:hud` (the biggest HUD on 19 screens; Settings,
  credits and pause in every language) and `qa:build` (both zips) pass. `qa:battles` passes with no console errors;
  Battle 20 lost its first try again (five of the last six runs), then won with the comeback help at 102%. The easing
  question stays open for the owner. Zip `release/thunder-knight-0.25.0-poki.zip` (4,804 KB).

**Next:** M12, the Poki release: thumbnails, store title and description, screenshots, `docs/release-checklist.md`
(including a native speaker's read of each language), the final `qa`, `qa:poki`, `qa:build --real-sdk`, and
`thunder-knight-1.0.0-poki.zip`. Before it, the owner's playtest (Region 1 checkpoint, and Battle 20's difficulty).

## Status on 7 Nov 2026 (version 0.24.0, M11 part 2: eleven languages)

The owner said "continue according to plan" again. The Region 1 checkpoint is still waiting on the owner
(`docs/playtest.md`). A native speaker's read of each language would be worth having before release (the
translations are mine, written for short, casual lines; flagged for M12's checklist).

**Built (part 2):**
- **Eleven languages** (tech design §5.13): English plus French, Italian, German, Spanish, Brazilian Portuguese,
  Turkish, Russian, Simplified Chinese, Japanese and Korean, 266 lines each. Picked from Poki's or the browser's
  language, or in Pause, Settings, where a change applies at once: the page's `lang` (the browser picks CJK fonts),
  the labels built once (`label`/`relabel` in `ui/dom.ts`: Next wave, the map and shop titles, the buttons' names for
  screen readers), the open pause card (focus stays on the picker), the map, the shop and the wave label. Checked in
  the pane: French, then Japanese, live. The translations are plain text in `tools/strings/<code>.txt`, written into
  `src/content/strings/<code>.ts` by `python tools/strings/build_strings.py` (every key once; French gets its
  non-breaking spaces before ! ? : ; %). Voice: the prompts and Rosie speak to the player as a friend (tu, du, tú,
  ты; Rosie casual in Japanese and Korean, the Queen polite); Thunder Knight stays as is; Larkmoor, Rosie and Ada are
  transliterated in Russian, Chinese, Japanese and Korean.
- **Battle names are strings now** (`battle.name.N`, `battle.new.N`; `battleName`, `battleNews`), so the map card and
  the battle's title toast are translated too. The credits line now names everyone (KayKit, Quaternius, Kenney,
  Ovani Sound, Echoes Audio by Pizza Doggy).
- **Queen Ada on the map** (GDD §2): her face and a line on the battle card, about the battle's region, or about the
  region just freed on the next region's first battle, or her thanks once Larkmoor is free (`adaLine`, tested).
- **Layout in every language** (`qa:hud -- --langs=all`, a new `mapLong` state with each language's longest battle
  name and news): the first runs found long toasts stretching the top HUD's column until the bars went under Poki's
  pill on a 568 px phone (the column is now `minmax(0, 1fr)`), the CJK system fonts' taller lines pushing toasts into
  Rosie's bubble and the prompt (the UI now has one line height, 1.2), the nameplate reaching the action buttons on a
  landscape phone, Italian and Spanish "Next wave" reaching under the shop, Japanese breaking ヒーロー across its tab,
  and a tall map card squeezing the road until a battle sat under the pill (the portrait road keeps 46 px clear).
  Toasts first wrapped, which put a second line into Rosie's bubble; now `BattleHud.fitToast` shrinks a long toast's
  font to about three quarters before it takes a second line, and the longest Italian and Russian battle names were
  shortened (Torre di guardia, Ponte di pietra, Borgo della Palude; Старый дозор, Каменный мост). The test data had a
  bug of its own: its "longest toast" picked up the battles' names and news, which are never toasts.
  Result: 1,463 checks, every state in every language on the seven tightest screens, clean; English on all 19.
- **QA:** `npm test` (149: the strings in every language, Ada's line, battle names everywhere), lint, `qa`, `qa:poki`,
  `qa:hud` (English on 19 screens, all eleven languages on 7) and `qa:build` (both zips) pass. The first download is
  1,938 KB on the wire (+33 KB for ten languages). `qa:battles` passes; Battle 20 lost its first try again (the third
  full run in a row, four of the last five), then won at 120%. Retries get the quiet comeback help (GDD §4.8), so the
  first try is the honest number: the Ox wave looks too hard for a fair player's first go. Easing it (one more second
  between its two escort blocks, or blocks of five) is the owner's call at the playtest, or the next part's first job
  if the owner says so. Zip `release/thunder-knight-0.24.0-poki.zip` (4,804 KB).

**Next (M11 part 3):** accessibility (the colour-blind check, reduced motion, HUD size), a proper credits screen,
haptics, and the edge cases (tab hidden, resize mid-wave, rotate mid-shop); then M11's exit: no console errors in a
full playthrough.

## Status on 7 Nov 2026 (version 0.23.0, M11 part 1: a faster first load, phone perf)

The owner said "continue according to plan" again. The Region 1 checkpoint is still waiting on the owner
(`docs/playtest.md`). M11 goes in three parts: this one (loading, size, phone perf), the 11 languages, then
accessibility, credits, haptics and edge cases.

**Built (part 1):**
- **Phone perf:** `npm run perf` has a fourth run, `phone-lowest` (a 390 × 844 touch phone on the lowest tier with the
  CPU slowed 6×, 30 fps or more: M11's exit), and `--phone`, `--tier=` and `--cpu=` pick or slow the runs. On a quiet
  machine: 116 fps in the clash at the cap (106 soldiers), 76 in Battle 20's Ox wave (95% of frames over 34), 88 in
  Battle 19. With Roblox Studio busy on the machine the clash read 59 (95% over 29). The tiers stay as they are: the
  GPU can't be slowed here, so a real phone at the checkpoint is the next word on them.
- **Loading** (tech design §6): the first download is Region 1's. The field kit is two files: `kit.glb` (the 27 pieces
  Region 1 shows and every battle shares, 784 KB) and `kit-later.glb` (21 pieces only Regions 2–4 use: the castle,
  walls, mountains, reeds, the burnt orchard and so on, 515 KB), split by `src/content/kitLater.json`, which
  `tests/kitSplit.test.ts` checks against every battle's field. The riders' horse and the War Wagon's oxen come with
  it (`Game.loadLater`: `FieldKit.addLater`, `Crowd.addMount`, `WarWagonModel.addOxen`, then the new shaders are
  warmed). A returning player past Region 1 gets it as the first screen opens; a new player at the first map, so
  Battle 1's lessons don't share the machine with a download (the first try did it at boot, and the Battle 1 bot
  pressed Buy with 104 of the pistol upgrade's 110 gold: its last coins came in a moment late). Battles from Region
  2 on start through `playBattle`, which waits for it: the map's button reads "Loading…" and no second press counts
  (checked with a 1.5 s download faked in the pane). Each part falls back on its own if it fails. The barbarian can't
  wait (the Queen's militia wear it from Battle 1). Two pieces no battle placed, the grain store and the hills, are
  gone from the kit.
- **Size:** the first download is 1,905 KB on the wire (2,450 before), the total 4,877 KB. `check-size.mjs` now holds
  the first download to M11's 3.5 MB and counts `kit-later.glb`, the horse, the oxen, Ada and the audio as after it.
  Draco/meshopt and KTX2 aren't needed for the budget (the kit is already quantized, and the crowd reads its models'
  raw vertex data at load), so they're left out.
- **QA tools:** the stepper (every review script, `shots`, `record`, `qa:battles`) starts the later download and waits
  for it, since scenes call `startBattle` directly; `perf` waits for a battle link's battle. Review:
  `qa-output/m9/m11-fields.mjs` (Battles 3, 8, 12, 16 and 20 from the banner: both files' pieces in place), and
  `riders.mjs` and `wagon.mjs` again (the horses and oxen arrive).
- **QA:** `npm test` (145), lint, `qa` (after the move to the first map), `qa:poki`, `qa:hud` (map and cards),
  `qa:soak`, `perf` and `qa:build` (both zips) pass. `qa:battles` passes; Battle 20 took a second try again (two runs
  in a row now: the Ox wave, the banner falling with 6 footmen, an elite captain and the Ox in the ring), then won at
  114%. Its first-try results swing a lot (73% and two losses over three runs); worth the owner's eye at the
  playtest before any easing (one more second between the Ox's two escort blocks would be the gentlest change). Zip
  `release/thunder-knight-0.23.0-poki.zip` (4,772 KB).

**Next (M11 part 2):** the 11 languages (en fr it de es tr pt ru zh ja ko) with `qa:hud --langs=all`, Queen Ada's map
lines with them.

## Status on 7 Nov 2026 (version 0.22.0, M10 complete: the ending)

The owner said "continue according to plan" again. The Region 1 checkpoint is still waiting on the owner
(`docs/playtest.md`); the ending and the Baron's donkey are worth a look in it too (`?battle=20&wave=7` on a save
that hasn't won Battle 20).

**Built (part 2):**
- **Queen Ada** (GDD §2): KayKit's mage read as a young man in review renders, so she's the red-haired rogue in her
  cape (kept by `hero.mjs`), her greens turned royal blue, her hair left auburn (recolouring it caught a few strands),
  and a gold crown built in code on her head bone, made bigger and higher after the first render hid it in her hair.
  Her idle is `Idle`: `Unarmed_Idle`, Rosie's, is a boxer's fists-up stance, and `Interact` and `Spellcast_Raise`
  read as a punch and a fist at her chin, so she cheers instead of waving (`ada-poses.mjs` puts clips side by side).
  `ada.glb` 341 KB, fetched when Battle 20 starts, the first time it can end the story.
- **The Baron's escape** (GDD §13.5): when the Iron Ox falls (the bossDown event now names the boss), a donkey trots up
  behind it, the Baron pops up in his turret (now its own group, hidden once the Ox falls) shaking his fist, hops into
  the saddle and gallops away from the banner, looking back, cape flapping, dust at the hooves, then shrinks away. The
  donkey is the riders' horse again (already downloaded): 1.2 m, chunky, ear bones stretched 2.1×, repainted grey with
  a pale muzzle. It stops short of the hedge (on the Iron Keep's field it would have galloped into the wall), and the
  victory card waits for it. Every Ox, Last Stand too. Draw calls at its busiest: 134 (105 before it; budget 150).
- **The ending scene** (`game/ending.ts`, `ui/endingDialogue.ts`): after Battle 20's first win the HUD and controls go,
  a dip to dark, the hero at ease at the banner, Ada walking in along the hilltop, a camera looking north past the
  banner at the Iron Keep, four bottom lines (Ada, Rosie, Ada, Rosie; 3.6 s each, a press after 0.5 s, Skip or Escape
  to the card), everyone cheering. Then "Larkmoor is free!" with a "Last Stand unlocked" block, To the map and 🎬 ×2
  gold; replays get the usual card. Fixed after review: the first camera looked up the hill at the hero's back; both
  now stand three-quarter on. The hero's aim clip turned his body sideways with the gun along his facing, so from the
  front he pointed it at the Queen: `Hero.relax()` drops the aim stance in the scene. On a short landscape phone the
  card ran off the bottom (it keeps the total and the unlock there), and Skip sat under Poki's pill.
- **Tests and checks:** `tests/ending.test.ts` (the scene's steps, presses, Skip, the lines' length and turns, the
  escape's length); `qa:hud` states `ending` and `endingCard`; `qa:battles` checks Battle 20's card is the ending's.
- **QA:** `npm test` (142), lint, `qa`, `qa:poki`, `qa:soak` (30 waves, the Ox and its escape at wave 30: heap 39.3 →
  40.5 MB, at most 73 draw calls), `perf` (673 fps High, 106 fps Low at 4× CPU, 80 draw calls) and `qa:build` (both
  zips) pass. `qa:hud` (23 states) caught the first toast, "The Baron flees on a donkey!", running under Poki's pill on
  a 320 px phone: now "The Baron flees!" (Rosie's line has the donkey), clean. `qa:battles` wins Battles 1–19 first
  time and checks the ending's card; Battle 20 took a second try this run (the Ox wave: 10 footmen, 2 elite captains
  and the Ox in the ring; nothing here changes the fight before the Ox falls), won at 35%. Last run it won first time
  at 73%: it is the campaign's tightest fight and worth watching in the owner's playtest. Zip
  `release/thunder-knight-0.22.0-poki.zip` (4,768 KB).

**Next:** M11, polish and performance: quality tiers on a phone profile, deferred loading by region, size, the 11
languages, accessibility and credits. Queen Ada's map and region-end lines (GDD §2) can come with the languages.

## Status on 7 Nov 2026 (version 0.21.0, M10 part 1: Last Stand)

The owner said "continue according to plan" again. The Region 1 checkpoint is still waiting on the owner
(`docs/playtest.md`).

**Built (part 1):**
- **Last Stand** (GDD §13.4): rules in `state/lastStand.ts` (tested), tuning in `content/lastStand.ts`, run by a
  `Battle` in `lastStand` mode (its def's waves made as they come). Opens once Battle 20 is won, from a cleared
  battle's map card ("Last Stand · 17" with the field's record). Seeded waves from a growing points budget (the rank
  and file by wave, elite captains from 8, a Brute/ram/catapult now and then from 4–6, a boss every 10th in turn with
  an escort; Sir Grudge's and the Ox's half-health squads too); enemy health ×(1 + 6% a wave) on the field's region.
  The shop after every 3rd wave (a "last shop before the boss" before each 10th); a 6 s countdown after the others
  ("Wave 5 coming!"). The record saves as each wave falls; the HUD reads "Wave 12 · best 17" ("Wave 1" on a first
  run); its card: waves held, "New best!" (against the record when the run began: saving per wave first made a new
  record look like a tie), gold kept, Again, Map, 🎬 Rally. `measure('battle', 'laststand', 'start' / 'fail')`. Dev
  link `?stand=N`.
- **The soak** (`npm run qa:soak`, M10's exit check): 30 waves, each played for real for 18 s then cleared, sampling
  at waves 1, 10, 20 and 30 the heap after a forced garbage collection, the renderer's geometries and textures, the
  crowd's squads and live bodies, and a drawn frame's draw calls. First run: heap 39.0 → 40.0 MB from wave 10 to 30,
  textures steady, geometries growing only as each boss's model is made once, draw calls at most 73 — but the
  crowd's squad list grew without end (156 by wave 30): finished squads were never dropped. Enemy squads now take a
  finished squad's place once none of its soldiers is left on the field (the Queen's keep theirs: the battle refills
  them by index; a test): 9 squads at wave 30, heap 39.0 → 39.9 MB. Passes.
- **Looked at:** the map card and the Last Stand card at 19 sizes (`qa:hud` states `stand` and `mapStand`, clean), and
  a run through its real flow (`qa-output/m9/m10-stand.mjs`): wave 1, the countdown, wave 2, the shop break after 3,
  wave 4's label with the record, the banner falling and the card.
- **The Iron Ox's escort was a wall:** the bot lost Battle 20 twice in two full runs, both in the Ox's wave. At 60%
  two blocks of ten elite-led footmen arrived together while the hero fought the Ox, and 21 soldiers in the ring took
  the banner in about 5 s. (Not the squad reuse: bodies added outside a squad already clear their squad index.) Now two
  blocks of six, the second 6 s behind: the bot wins Battle 20 at 73%, still the campaign's tightest finish.
- **QA:** the bot wins Battles 1–20 first time (17 at 75%, 20 at 73%). `npm test` (137), lint, `qa`, `qa:poki`,
  `qa:hud` (21 states now, clean), `qa:soak` (30 waves), `perf` (765 fps High, 90 fps Low at 4× CPU, 80 draw calls)
  and `qa:build` (both zips) pass. Zip `release/thunder-knight-0.21.0-poki.zip` (4,616 KB).

**Next (M10 part 2):** the Iron Baron's comedy escape on a donkey when the Ox falls, and a short ending with Queen Ada
(she isn't in the game yet: KayKit's mage, recoloured, with a crown), which unlocks Last Stand in the story. Done in
0.22.0.

## Status on 7 Nov 2026 (version 0.20.0, M9 complete: the guns' star looks)

The owner said "continue according to plan" again. The Region 1 checkpoint is still waiting on the owner
(`docs/playtest.md`).

**Built:** the guns' visible changes (GDD §8.1), M9's last open item. At ★3 a red-dot sight on top (the shotgun and
the hunting rifle get a drum under it); at ★5 two gold bands round the gun and a gold plate down each side
(`HERO_LOOK.stars`, `dressStars`, `setGun(id, level)`). Every part is sized in metres as held and fitted to the gun's
own shape where it sits. Two first tries failed by eye: sizes as shares of a gun's length made the pistol's sight
invisible and the hunting rifle's drum huge; measuring the gun's thickness from vertices sank the pistol's sight into
its slide and shrank the rocket launcher's bands (long low-poly parts have no vertices mid-length), so it measures the
triangles crossing a thin slice. All nine guns checked in the hand at ★1, ★3 and ★5 (`qa-output/m9/stars.mjs`).

**QA:** `npm test` (130), lint, `qa`, `perf` and `qa:build` (both zips) pass. `perf` measured 233–236 fps High and
35–49 fps Low at 4× CPU, against 30 needed, while another project's long soak test (`levelup-soak.mjs`, a headless
Chrome started 14:39) and Roblox Studio were busy on the machine. Neither is this project's, and the star looks add
nothing per frame (hidden groups). Zip `release/thunder-knight-0.20.0-poki.zip` (4,614 KB).

**M9 is complete:** all 20 battles are won by the saving simulator with no replays and no ads; every new asset was
checked in the running game; the budgets hold in a Region 4 wave (part 9); the scope is built (Regions 2–4, their
enemies, three bosses, six guns with star looks, Rift Strike and Sentry Gun, swap, men-at-arms and knights, three field
kits, lessons for B6–B14, the simulator through B20).

**Next:** M10, the ending and Last Stand: the Iron Baron's comedy escape on a donkey, a short ending with Queen Ada,
and Last Stand (endless scaling waves, a shop every 3 waves, best-wave records, a heap check in `perf`).

## Status on 7 Nov 2026 (version 0.19.0, M9 part 9: the Iron Baron, Battle 20; the whole campaign playable)

The owner said "continue according to plan" again. The Region 1 checkpoint is still waiting on the owner
(`docs/playtest.md`).

**Built (part 9):**
- **The Iron Ox** (GDD §9.3; `ironOx`, `OxDef`, `FireDef`): a hidden boss body, 5,000 health (×3), 500 gold, rolling
  at 0.7 m/s to 10 m from the banner.
  - **Fire:** every 7 s it stands, turns, and its cone (13 m, ±29°) shows on the ground for 1.6 s (`fireCone`; orange
    patches following the ground, `Markers.setCones`), aimed at the hero within 18 m, else the banner. Then fire: 60
    to each blue in it, 30 to the hero, 4% of the banner if it stands in it (`Battle.fireAt`).
  - **Phases:** its armour halves everything but explosions; at 60% two elite captains' blocks join (`bossHalf`,
    "Elite captains join!"); at 30% its plates fall and its core glows (`onOxCore`, "The core! Rockets!"): explosions
    do ×1.5 (rockets ×2 on bosses on top). Its fall routs the army. The Baron's donkey escape is M10's.
- **Its look** (`world/ironOxModel.ts`): an iron bull on wheels with pale horns that glow through a wind-up, red eyes,
  a gold nose ring, armour plates over a glowing core, and the Baron in a tiny turret. The first version was near-black
  with small horns and read as a block; rivets on its moving plates cost 20 draw calls and were dropped.
- **Battle 20, The Iron Keep:** six waves of everything under elite captains, the last shop, then the Ox with twelve
  footmen and six archers. Landmark: the Keep's own wall and gate just beyond the north hedge, red towers either side.
- **Balance:** every target met through Battle 20; the final battle may offer only "X more" in a break (by then the
  cheap cards are bought; GDD §11.2's ~75% of the catalogue), so the "something affordable" rule skips it.
- **Bot:** steps out of a fire cone as it does a lane.
- **Perf in a Region 4 wave** (M9's exit; `npm run perf -- --battle=20 --wave=7`, a new option): the Iron Ox's wave
  ~1,000 fps High, 100 fps Low at 4× CPU, 105 on a Low phone, 102–106 draw calls; Inner Bailey's last wave 94 fps
  Low at 4× CPU and 53 on a Low phone. Measured early in each wave with a fresh save's allies; the crowd at its cap is
  still the sandbox run (702 fps High, 108 fps Low at 4× CPU). `drawcalls.mjs 20 3,7`: 109–131.
- **QA:** the bot wins all 20 battles (20 at 93%; The Gatehouse took a second try this run, its shield wall reaching
  the ring beside a ram and a catapult, after 140% last run). `npm test` (130), lint, `qa`, `qa:poki`, `qa:hud` (19
  sizes, clean), `qa:feet`, `perf` and `qa:build` (both zips) pass. Initial download 2,291 KB of 5,120; zip
  `release/thunder-knight-0.19.0-poki.zip` (4,613 KB).

**M9 exit check:** all 20 battles are won by the saving simulator with no replays and no ads (`npm run balance`), every
new asset was checked in the running game, and the budgets hold in a Region 4 wave. One scope item is still open: the
guns' visible changes at ★3 (a scope or drum) and ★5 (gold trim) (GDD §8.1).

**Next:** the guns' ★3/★5 looks to close M9; then M10 (the Baron's comedy exit, the ending, Last Stand).

## Status on 7 Nov 2026 (version 0.18.0, M9 part 8: elite captains, the rocket launcher, Battles 18–19)

The owner said "continue according to plan" again. The Region 1 checkpoint is still waiting on the owner
(`docs/playtest.md`).

**Perf first:** last part's drop on Low at 4× CPU (about 100 fps against 190–218 before) held on a fresh run, after
restarting the dev server (it had used 1.2 cores at idle) and with the Browser pane closed: 82–102 fps. High is
490–560. Nothing between the parts runs in the perf scene, and two heavy apps (Roblox Studio and Player) are running
on the machine. Every budget passes with room, so it's recorded, not chased; it gets profiled in M11 if it holds.

**Built (part 8):**
- **Elite captains** (GDD §4.4; `eliteCaptain`, `elite: true` on a squad, `routRadius`): gilded armour, a cape and a
  great sword, 1.15× a captain, twice his health (300), 60 gold. His fall routs his squad within 25 m, not 15
  (a test). The reveal and the economy simulator know a squad's captain type (`captainOf`). Nameplate: "Elite
  captain: big rout!".
- **The rocket launcher** (GDD §8.1; `rocket`, `siegeBonus`): rounds fly straight at 55 m/s with a smoke trail and
  burst where the shot strikes (300 in 6 m), doubled on siege engines (hulls, wheels, beams) and bosses (a test), with
  a 40 ms hit-stop and the full boom. Its model is the long pump shotgun inside a fat olive tube with a red warhead and
  a sight, added in code; its shop picture reads as a bazooka. In the first renders the rocket and its smoke were
  lost against the soldiers and the sky, so the rocket is bigger and warmer and the trail fuller. Saving goal at
  18–19; bought at Battle 19's third break (a new balance check: by the end of 19, ready for the Iron Ox).
- **Battles 18 (The Gatehouse) and 19 (Inner Bailey)**, eight waves each: elite captains lead most blocks; 18 mixes
  them with rams, catapult pairs and Brutes; 19 is everything but the Baron (no Siege Tower, so no "last shop before
  the boss" before Battle 20). Landmarks: the outer wall's gatehouse with a red tower either side; the Baron's yard
  (a well, tents, weapon racks, a burnt-out house).
- **Draw calls:** Battle 19's two rams and a catapult 125–137, its last wave 94–102, Battle 18's catapult pair 114–115.
- **Checks:** tests for the elite rout radius and health, the rocket's siege bonus, and Battles 18–19's content and
  goals. Looked at in the running game (`qa-output/m9/part8.mjs`, `mg.mjs minigun,rocketLauncher`).
- **Inner Bailey's second wave was a wall:** the bot lost Battle 19 twice there. Eight riders (270 health each here)
  charged into the ring together, each draining like a footman, and took the banner from 140% to nothing in about 40
  s. It's now five riders arriving a few seconds behind the block (ten men-at-arms, four firebrands); the replay won
  at 107%, the wave still its tensest moment (down to 95%).
- **QA:** the bot wins Battles 1–19 first time (18 at 140%, 19 at 114%, Moat Road 76%). `npm test` (127), lint, `qa`,
  `qa:poki`, `qa:hud` (19 sizes, clean), `qa:feet`, `perf` (passes: 80 draw calls, 521 fps High, 91 fps Low at 4×
  CPU) and `qa:build` (both zips) pass. Initial download 2,288 KB of 5,120; zip
  `release/thunder-knight-0.18.0-poki.zip` (4,611 KB).

**Next (M9):** Battle 20, the Iron Keep, and the Iron Baron in the Iron Ox (fire-breathing horns with telegraphed
cones; elite captains summoned; armour plates drop and the core glows: rocket time). His comedy exit, the ending and
Last Stand are M10.

## Status on 7 Nov 2026 (version 0.17.0, M9 part 7: the Iron Keep opens, Battles 16–17, the minigun)

The owner said "continue according to plan" again. The Region 1 checkpoint is still waiting on the owner
(`docs/playtest.md`).

**Built (part 7):**
- **The Iron Keep's look** (`TREE_LINES[4]`, `GROUND_TINT`, new kit pieces in `field.mjs`):
  - the Baron's red castle on the northern skyline in the mist, with walls, corners and towers either side;
  - a burnt orchard beyond the hedge: KayKit's pines with their leaves turned charcoal brown at load. Darkening alone
    gave dark green trees; pure charcoal read nearly black;
  - drier, trampled ground (a multiply over the meadow's colours; the first tint was too faint to see).
  - The kit grows by 267 KB (kit.glb 1,310 KB): the castle is the one heavy piece. Its barracks, forge and second
    tower were left out (+480 KB for little).
- **The minigun** (GDD §8.1; `spinUp`, `firingWalk` in `GunDef`): nothing fires until the trigger has been held 0.6 s,
  then 25 rounds a second; it spins down at half that pace. The hero walks at 80% while it fires, and every other round
  sounds. Its model is the second SMG's body with six barrels round a hub that spins in his hand, and an ammo box,
  added in code; its shop picture reads as a minigun. It's the saving goal at 16–17 and is bought at Battle 17's third
  break (a new balance check).
- **Region 4's health ×3.6 → ×3**, matching its gold. ×3.6 would repeat the 64% step that made Region 3 a coin toss.
- **Battles 16 (Burnt Orchard) and 17 (Moat Road)**, seven waves each: 16 has no new enemy (Brutes in pairs at the
  end); 17 brings rams and catapults together (a ram with a catapult, two rams, two catapults, then a ram, two
  catapults and a Brute). Landmarks: rows of charred trees and a burnt-out farmhouse; a 7 m moat along the west with
  the bridge to a gate in a stone wall.
- **Draw calls again:** Battle 17's last wave (a ram, two catapults, a Brute) came to 152–166. Each slow engine's
  wheels were eight meshes; the ram's, catapults' and tower's wheels are now one still set each (they crawl). Battle
  17's last wave is 126–136 and the tower's 117–120 (`qa-output/m9/drawcalls.mjs 17 7`). The War Wagon's wheels stay
  apart because they break one by one.
- **Checks:** `tests/region4.test.ts` (the battles, the look, ×3 health and the minigun's goal) and a minigun test in
  `region3.test.ts` (nothing for 0.6 s, then 25 a second, spinning down). Looked at in the running game
  (`qa-output/m9/part7.mjs`, `mg.mjs machineGun,minigun`): the skyline, the orchard before and after the charcoal fix,
  the ground, Moat Road, the minigun in hand and in the shop.
- **QA:** the bot wins Battles 1–17 first time (16 at 128%, Moat Road at 89%: the rams-and-catapults battle bites).
  `npm test` (122), lint, `qa`, `qa:poki`, `qa:hud` (19 sizes, clean), `qa:feet` and `qa:build` (both zips) pass.
  `perf` passes its budgets (80 draw calls; 502–517 fps High, 94–107 fps Low at 4× CPU against 30 needed), but Low at
  4× CPU measured about half of part 6's 190–218 on three runs. Nothing this part added runs in the perf scene (Region
  1's sandbox), and perf has swung this much with machine load before; if it holds, profile it in M11. Initial download
  2,273 KB of 5,120; zip `release/thunder-knight-0.17.0-poki.zip` (4,596 KB).

**Next (M9):** Battles 18–19 (elite captains: a 25 m rout radius and twice the health; the rocket launcher, ×2 on siege
engines and bosses), then Battle 20 and the Iron Baron's Iron Ox.

## Status on 7 Nov 2026 (version 0.16.0, M9 part 6: the Siege Tower, Battle 15; Region 3 complete)

The owner said "continue according to plan" again. The Region 1 checkpoint is still waiting on the owner
(`docs/playtest.md`); Battles 11–15 are worth including in that playtest.

**Built (part 6):**
- **The Siege Tower** (GDD §9.3; `siegeTower`, `towerBeam`, `towerPusher`): the War Wagon's machinery stretched.
  - **Beams as weak points:** a wagon's weak points can now ride up its side (`[x, z, lift]`): three beams on the
    tower's front at 0.7, 3.2 and 0.7 m, 350 health each; their sum is the boss bar. All three broken: it topples, the
    pushers fall, the army routs.
  - **Pushers:** ten, eight walking at its sides and two behind, carried like the ram's crew. With all of them down it
    stalls (`abandon: false`) and stays a boss: "Tower stuck! Hit the beams!" (`wagonStall` now says which).
  - **Doors** (`doors`): from 10 s, every 16 s, six footmen step out of alternate sides, moving or stalled (`onDoors`
    swings the model's door, with a heavy thud).
  - Beams sit flush in front of the hull (1.8 m) and the side pushers outside it; a test keeps both reachable by
    bullets, after the ram and the catapult both taught that a hidden hull must not shield its parts.
- **Its look** (`world/siegeTowerModel.ts`): a 7.6 m timber tower built in code, with pulsing orange beams, a folded
  drawbridge, the Baron's banner, side doors, and a forward topple. The first version read as a brown slab from the
  side; corner posts and crossbeam bands fixed that.
- **Battle 15, Pass of Echoes:** six waves mixing everything Region 3 has shown (catapults, rams, Brutes, shield walls,
  men-at-arms), the last shop, then the tower with ten footmen and six archers. Landmark: the pass's cliffs on both
  sides, boulders, and the Baron's camp beyond the north hedge. The balance check now wants the grenade launcher bought
  by the end of Battle 15 (the simulator buys it at Battle 15's third break).
- **Checks:** `tests/crowd.test.ts` covers the tower (beams at their heights, pushers walking, the stall without a
  rout, the doors' squads, the topple and rout); `tests/region3.test.ts` the battle, its strings, and the beams' and
  pushers' reach. Looked at in the running game (`qa-output/m9/part6.mjs`): rolling in from the front, the side and
  the hill, stalled, a beam gone, toppling, and the field.
- **Draw calls in a real battle:** `perf` measures the crowd at the cap in a sandbox (80 calls), not the models built
  in code. Measured in Battle 15 (`qa-output/m9/drawcalls.mjs`), the tower's wave and wave 6 (a ram and a catapult)
  came to 167–176, over the 150 budget: every box of the tower, rams, catapults, War Wagon and Sentry Gun was its own
  draw call, twice with shadows. `render/mergeStatic.ts` now merges each model's fixed parts into one mesh per colour,
  leaving the moving parts apart (wheels, doors, the arm, the log, beams, the turret's head): 131–137, within budget,
  and the models look the same (re-rendered: the tower, the topple, catapult, ram, turret, War Wagon).
- **QA:** the bot wins Battles 1–15 first time (Battle 11 at 93%, 12–15 at 130–140%: the tower toppled without
  touching the banner, so it may be on the easy side for a boss; the owner's playtest will say). `npm test` (118),
  lint, `qa`, `qa:poki`, `qa:hud` (19 sizes, clean), `qa:feet`, `perf` (80 draw calls; 620 fps High, 190 fps Low at
  4× CPU) and `qa:build` (both zips) pass. Zip `release/thunder-knight-0.16.0-poki.zip` (4,484 KB).

**Next (M9):** Region 4, the Iron Keep (Battles 16–20): the minigun, rams and catapults together, elite captains and
rockets, then the Iron Baron in the Iron Ox, with the region's own field kit.

## Status on 7 Nov 2026 (version 0.15.0, M9 part 5: knights, the Sentry Gun, catapults, Battles 13–14)

The owner said "continue according to plan" again. The Region 1 checkpoint is still waiting on the owner
(`docs/playtest.md`), and Battles 11–12 are flagged for the next playtest.

**Built (part 5):**
- **A fix first:** 0.14.0's ram health change (1,200 → 500) had landed on the War Wagon's entry (whose health is its
  wheels', so it changed nothing) and the ram kept 1,200; a test now pins the ram at 500.
- **The Queen's knights** (`allyKnight`, Army tab from Battle 13, GDD §10): blue riders on the crowd's horse, armoured,
  220 health. They wait in a line 5 m in front of the banner and charge the Baron's nearest man within 24 m (8 m/s
  for 2.6 s, every 7 s), bowling over the other side's soldiers in the way, never the hero; then they fight. Allies'
  charges aim at a foe (`nearestFoe`, hulls skipped) where the Baron's aim at the hero or the banner; a charge now
  hurts whichever side isn't the charger's. Their first charge is ready at once (a 7 s wait stopped them short); a
  charge from 35 m ran out 6 m short, so they look 24 m out. The hired squads now come from one table (`HIRED` in
  `battle.ts`: archers, men-at-arms, knights).
- **The Sentry Gun** (`content/support.ts` `SENTRY`, `game/sentry.ts`): a second call-in, 6,000 then 3,000 and 4,500.
  It falls out of the rift to the hero's right (the landing thump and dust), then for 25 s turns to the nearest of the
  Baron's men it can see within 32 m and fires 5 shots a second (24 damage, through two soldiers, tracers, the SMG's
  sound pitched up and fading with distance); then it sinks away. Hulls (wagon, ram, catapult) aren't targets; at most
  three stand. Its look is built in code (a blue body with a gold band and a gunmetal barrel on a tripod).
  - **Equip:** owning both call-ins, the one not in use shows Equip in the Hero tab (free); a newly bought one goes
    straight on; only the equipped one levels. The support button's icon follows the call-in E calls.
  - **Rosie lends hers** in Battle 13 from wave 2 ("Borrow my Sentry Gun!"; `giftSupport('sentryGun')` replaces the
    player's own for the battle, one a wave), with the E prompt until one is called (the `sentry` lesson).
- **Catapults** (`catapult`, `catapultCrew`; `world/catapult.ts`): a hidden crowd body like the ram with three crew
  who walk it to about 40 m from the banner. There it turns to the banner and every 6 s lobs a boulder (`Boulder` in
  the crowd sim, 2.4 s in the air): at the thickest group of the Queen's soldiers in its reach, every other one at the
  banner. A boulder hurts blues and the hero within 3 m (40) and takes 3% of the banner if it lands in the ring. In
  the last 1.5 s a dark shadow grows inside a faint ring where it will land. Only explosions hurt the engine (800,
  ×2.5 here); with its crew down it's abandoned (beaten). The arm snaps over on each throw; creak, whoosh, thud.
- **The grenade launcher** on sale from Battle 14 (tuned in `guns.ts`; the saving goal at 14–15): guns with `splash`
  fire a round (`Combat.onLaunch`) to where the shot would land (the first soldier, a prop, the ground or its 40 m), a
  short flat lob that bursts there (90 in 4 m, through the grenades' code without the ground ring; a smaller boom and
  only a nudge of the view unless close). Its model is the short shotgun with a fat olive tube and a revolving drum
  added in code, so it reads as a launcher in the hand and in the shop; its sound is the shotgun's pitched well down.
- **Battles 13 (Shepherd's Rest, 6 waves) and 14 (Cliffside, 7 waves):** 13 brings no new enemy (Brutes and rams
  together); 14 brings the catapult alone first, then beside shield walls, a pair, and with a Brute last. Landmarks: a
  shepherd's cottage, fold and well; a cliff of KayKit mountains on the west with fallen boulders.
- **Checks:** `tests/crowd.test.ts` covers the knights' charge (they hurt the Baron's men, never the hero) and the
  catapult (it stops at about 40 m, throws, the boulder lands after its flight, blues are hurt, no throws with its
  crew down); `tests/region3.test.ts` the battles, the launcher's goal, the knights' card and the Sentry's equip
  rules. `npm run balance` meets every target through Battle 14 (the simulator saves for the launcher into Battle 15).
  Looked at in the running game (`qa-output/m9/part5.mjs`): the knights waiting and riding into a block, the turret
  landing and firing (its tripod first stood upside down: legs met at the ground), the catapult rolling in and throwing,
  the shadow on the hill, the launcher in hand and its bursts, both landmarks. The bot (`qa:battles`) now calls its
  support when the Baron's men are within 25 m.
- **Found on the way (the bot's Region 3 runs):**
  - **A freed wagon slot kept its parts.** When a War Wagon, ram or catapult's body was freed, its parts list stayed
    in the crowd's table; the next soldier in that slot inherited it. The bot skipped him as a hull (a lone archer
    nobody would shoot: the battle never ended), and his knockout knocked out whoever stood in the old crew's slots,
    the Queen's soldiers included. Fixed in `release`, with a test. Dates from 0.13.0; it bit once rams and catapults
    made freed slots common, and may explain some of 0.14.0's unexplained Region 3 losses.
  - **A catapult shielded its rear crewman:** the hidden engine stopped every shot from the banner at the man behind
    it. It's an open frame, so bullets now pass through it (`open`: shots and aim assist skip it; explosions don't).
  - **Region 3's health ×2.5 → ×2.2** (GDD §9.1, matching its gold): Battle 11, the region's first, was the hardest
    battle in every run, and each Highland Pass battle came out a coin toss for the bot. Some of that was the slot bug
    and the bot itself (below), so the owner's playtest may move it back up. Battle 11 also lost a few extras (two
    shield-wall men, two archers, two footmen in wave 5, two more and two firebrands in the last wave).
  - **The bot played like a weak player:** it fought Region 3 with the hunting rifle and pistol (buying only fills an
    empty hand), never stepped out of a glowing lane, and stayed on the hill while a catapult crew or archers stood
    beyond its 45 m look-out. Now, as a player would, it carries its two guns with the most damage a second after each
    purchase, steps out of lanes, goes for far archers when nothing presses the banner, rushes the nearest enemy after
    8 s with none in reach, walks up to a target it hasn't hurt in 8 s, and calls its support. A defeat or a timeout
    prints a report (the wave, hand, purse, who's in the ring or still standing).
- **QA:** the bot wins Battles 1–14 first time (Battle 11 at 104%, 12–14 at 118–135%). `npm test` (112), lint, `qa`,
  `qa:poki`, `qa:hud` (19 sizes, clean), `qa:feet`, `perf` (80 draw calls; 677 fps High, 190 fps Low at 4× CPU, 169
  on the Low phone) and `qa:build` (both zips) pass. Zip `release/thunder-knight-0.15.0-poki.zip` (4,482 KB).

**Next (M9):** Battle 15, Pass of Echoes, with the Siege Tower (pushers, doors that spill squads, three glowing support
beams), which ends the Highland Pass; then Region 4.

## Status on 6 Nov 2026 (version 0.14.0, M9 part 4: the Highland Pass opens, Battles 11–12)

The owner said "continue according to plan" again. The Region 1 checkpoint is still waiting on the owner
(`docs/playtest.md`).

**Built (part 4):**
- **Each region's own field** (`content/fields.ts` `TREE_LINES`, `riverDressing`; `Field.setRegion`): the woods
  beyond the hedge swap when a battle starts. The Riverlands: Quaternius' round leafy tree (CC0, downloaded to
  `C:\PROJECTS\ASSETS\3D\quaternius-trees`) in clumps three deep, and reeds along both banks of every stream with lilies
  on wide ones. The Highland Pass: the tiered pines two deep, and KayKit's grassy mountains far out in the fog (first
  placed too big and close, they read as grey cliff walls; now about 30 m tall at 130–150 m, low ridges). Landmarks:
  Pine Gate (KayKit's stone wall and gate between pines; the first layout hid the gate behind its own pines), Old
  Watchtower (the tower, rocks, the Queen's crates).
- **The Brute** (GDD §9.1; `brute`): KayKit's barbarian at twice size with the great axe, bear hat and red cape
  (`2H_Axe`, `Barbarian_Cape` added to `assets:soldiers`). He walks (giants never jog outside a charge) at 1.2 m/s, 1.5 closing in, and every 6 s stops, glows and charges
  (9 m/s for 1.4 s) down a glowing lane at the hero within 30 m, else the banner, bowling over the Queen's soldiers.
  Armoured, 1,000 health (2,500 here). Not a boss: his fall doesn't rout the army.
  - **A health bar over his head** (`healthBar`; `Hud.setChampions`): small, see-through, the enemies' red, placed
    where the crowd is drawn between ticks, hidden off screen. Up to three at once.
  - **Several lanes at once** (`Markers.setLanes`): two Brutes winding up together each get their lane.
- **The battering ram** (`ram`, `ramCrew`; `world/ramModel.ts`): a hidden crowd body like the War Wagon with six crew
  carried beside it (`needsCrew`), who walk at its pace. Only explosions hurt it (`explosiveOnly`: grenades, the Rift
  Strike, the Rally's blast; 500 health, 1,250 here, so a strike and a few grenades break it). Each fallen pusher
  drops off where he fell and slows it (35% pace with one left); with none left it's abandoned (knocked: beaten, no
  more drain). In the ring it drains 4%/s, and its log thuds into the banner every 1.3 s. Its look is built in code
  (timber frame, hide roof, a log with an iron head that swings as it rolls). It carries the health bar too.
- **The machine gun** on sale from Battle 12 (already tuned in `content/guns.ts`): Quaternius' carry-handle rifle
  (`assault-a`) with a big drum magazine added in code (`dressMachineGun`), so it reads heavier than the assault rifle
  in the hand and in the shop picture. It's the saving goal at 12–13 and is bought at the break after Battle 12.
- **Battles 11 (Pine Gate) and 12 (Old Watchtower)**, six waves each: the Brute alone first, with a shield wall later,
  two at once in the last wave; the ram alone with footmen first, then beside shield walls, and with a Brute last.
  Nameplates "Brute: dodge the charge!" and "Ram: down its crew!" (onboarding §5).
- **Checks:** `tests/crowd.test.ts` covers the ram (crew walk beside it, bullets don't hurt it but explosions do, it
  slows and is abandoned, broken it throws its crew) and the Brute's wind-ups; `tests/region3.test.ts` the battles,
  nameplates and the machine gun. `npm run balance` meets every target through Battle 12 (the machine gun bought by
  the end of 13). The Brute, the ram and both fields were looked at in the running game (`qa-output/m9/part4.mjs`,
  `mg.mjs`, `mg-icon.mjs`). The bot's first run won Battle 11 with the banner at 13% and lost Battle 12 twice: a Brute
  reaching the banner flattened the militia while his 3,750 health took ~30 s of the hunting rifle. His health went
  to 1,000 and Battle 12's third and last waves lost a rider, a firebrand and two men-at-arms.
  The second run timed out in Battle 12: the ram's hit circle (1.3 m) was wider than its frame, so from the front it
  stopped every bullet meant for the crew walking beside it, and it couldn't be stopped. It's now 0.7 m (a test keeps
  it inside the crew's line), and the bot wins Battles 1–12. Region 3 is noisy for it: one run won 11 and 12 first
  time (banner 63% and 137%), the last took a second try at each (then 83% and 140%), and one run lost Battle 4 once
  (the bot gets no retry before Battle 5; the next run won it at 100%). The bot never steps aside from a charge, the
  Brute's whole answer, so watch Battles 11–12 in the next owner playtest. `qa:feet` now checks the Brute closing in (0.34 m/s, within 0.35): at his first pace he was 2.0 m/s and either
  jogged in slow motion or overdrove the walk, so giants never jog outside a charge and he walks at 1.2 (1.5 closing
  in). `npm test` (103), lint, `qa`, `qa:poki`, `qa:hud` (19 sizes, clean), `perf` (80 draw calls; 880 fps High,
  216 fps Low at 4× CPU) and `qa:build` pass.

**Next (M9):** the rest of the Highland Pass: knights (enemy and ally), the Sentry Gun, catapults and the grenade
launcher (Battles 13–14), then the Siege Tower (Battle 15).

## Status on 6 Nov 2026 (version 0.13.0, M9 part 3: Battle 10 and the War Wagon)

The owner said "continue according to plan" again. Region 2 is now complete; the Region 1 checkpoint is still
waiting on the owner (`docs/playtest.md`).

**Built (part 3):**
- **The War Wagon** (GDD §9.3; `content/soldiers.ts` `warWagon`, `wagonWheel`, `wagonCrossbow`): a crowd body that
  rolls straight at the banner at 1.2 m/s and parks 4.5 m from it (inside the ring: it drains the banner like a boss,
  2%/s). Its hull can't be hurt by bullets, blows or blasts (a blocked hit shows the shield mark); its four wheels are
  bodies of their own that ride with it (300 health each, ×1.6 in Region 2; the aim assist favours them like
  captains), and three crossbowmen stand on its deck (30 m, reload 2.6 s). Its health on the boss bar is its wheels'.
  - Two wheels broken: it stops, its crossbows reload 40% faster, and two squads of six footmen spill out of the back
    ("The wagon's stuck! Footmen!", a beat's freeze).
  - All four: it collapses, its crew tumble off, and its whole army runs (the wave is won, as with Sir Grudge).
  - Riding works for any body (`carrier`, `lift`): carried bodies are moved onto their carrier after every tick's
    updates, ignore their carrier in separation, and the crowd draws them lifted (the crew on the deck).
- **Its look** (`world/warWagonModel.ts`): built in code from boxes (no CC0 wagon exists; Poly Pizza's are CC-BY), with
  Quaternius' CC0 cow as two brown oxen (`ox.glb`). Wheels turn as it rolls and vanish when broken; it leans toward
  broken wheels and settles crooked when it collapses.
- **Battle 10, The Long Road:** five waves on a dirt road with fences and milestones, the last shop, then the wagon with
  ten footmen and four archers. The hunting rifle opens here and is the saving goal (bought at the break after Battle
  10). The economy simulator counts a wagon's wheels, crew and spill (`squadGold`).
- **Checks:** `tests/crowd.test.ts` covers the wagon (parts ride with it, the hull can't be hurt, the stall and spill at
  two wheels, the collapse and rout at four); `npm run balance` meets every target through Battle 10; the wagon looked
  at in the running game from the front and the side, rolling, a wheel gone, stalled with footmen, collapsed
  (`qa-output/m9/wagon.mjs`). The bot (`qa:battles`) wins Battles 1–10; it first timed out at the wagon (once the
  front wheels broke it kept shooting the hull from the hill), so it now steps out past a wheel's corner, as a player
  would, and wins first time. `npm test` (94), lint, `qa`, `qa:poki`, `qa:feet`, `perf` (80 draw calls; 788 fps
  High, 358 fps Low at 4× CPU) and `qa:build` pass. `qa:hud` caught the new "The wagon's stuck! Footmen!" toast under
  Poki's pill on a 320 px phone; it's now "Wagon stuck! Footmen!", and the men-at-arms nameplate "Men-at-arms: use
  rifles!" (it wrapped).

**Next (M9):** Region 2's own field kit (river banks, willows and reeds as the region's base, replacing the pine
rows), then Region 3 (Highland Pass: the Brute, battering ram, catapult, machine gun, knights, Sentry Gun, the Siege
Tower).

## Status on 5 Nov 2026 (version 0.12.0, M9 part 2: Battles 8–9)

The owner said "continue according to plan" during part 1's checks; part 1 was finished and packaged (0.11.0), then
part 2 built. The Region 1 checkpoint is still waiting on the owner (`docs/playtest.md`).

**Built (part 2):**
- **Rift Strike** (GDD §8.3; `content/support.ts`, `world/riftStrike.ts`): E, F or the support button. The strike
  lands at the aim point (within 45 m), snapped to the densest enemy group within 6 m; a red ring (10 m) warns for 1 s,
  then six shells fall over 2 s as bright streaks out of the sky, each 130 damage within 3.5 m, breaking shields like
  a grenade. Only the Baron's men are hurt. Charges a wave: 1, +1 a level (2,500 to buy, then 1,500 and 2,500), in the
  Hero tab (`support:` cards; the first one bought is equipped). The support button shows its charges.
- **Battle 8's lesson** (onboarding §5): Rosie's "Try this, on the house!" gives one free charge a wave for that
  battle, and the prompt (E key cap, or a hand on the button) shows when a block of six is within 30 m; done on the
  first call.
- **Men-at-arms** (Battle 9): the Baron's knights in full plate (bright steel), a two-handed sword and a cape
  (`assets:soldiers` now keeps KayKit's `2H_Sword` and `Knight_Cape`). Armoured: light guns do half, with sparks and a
  clink; Rosie's "Armour! Bigger gun!" the first time (Battle 9's tip). 160 health, 12 a blow, 15 gold. The Queen's
  own (`allyManAtArms`, renamed from `manAtArms`) hold a line 15 m in front of the banner once hired (Army tab, from
  Battle 9).
- **Guns:** the assault rifle (Quaternius AK with a wooden stock: it reads apart from the black SMG) and the hunting
  rifle (the green scoped bolt-action), with grips, muzzles and ports placed from their measured bounds, pictures in
  the shop, and sounds (Ovani assault rifle; Echoes sniper rifle). The machine gun borrows the assault rifle's model
  and sound (a lower pitch) until its own; the rocket launcher the hunting rifle's model.
- **Battles 8 and 9:** five and six waves; The Ferry has big blocks for the strike, Willow Palisade brings the
  men-at-arms. The assault rifle is the saving goal in both (the saving player buys it at the end of Battle 8: one
  wave earlier it was 9 gold short). Landmarks: a ferry landing with a log raft, posts and the ferryman's hut; a stake
  wall round the willows.
- **Checks:** by eye (`qa-output/m9/part2.mjs`, `part2b.mjs`: the rifles in hand, men-at-arms beside footmen, a strike's
  ring, streaks and bursts, the Hero tab's Rift Strike card). `npm test` (91), lint, typecheck; `npm run balance` meets
  every target through Battle 9. The bot wins Battles 1–9 first time; `qa`, `qa:poki` (72), `qa:hud`, `qa:feet`
  and `qa:build` (both zips) pass. `perf` first failed the throttled Low runs (14 and 16 fps) while three other
  projects' tests were running on the machine; alone it passes (80 draw calls; 632 fps High, 100 fps Low at 4× CPU,
  101 fps a Low phone; part 2 added 20k triangles, 1.6%).

**Next (M9 part 3):** Battle 10 with the War Wagon (wheels as weak points, crossbowmen, footmen spilling out) and the
hunting rifle's battle; Region 2's own field kit; then Regions 3–4.

## Status on 5 Nov 2026 (version 0.11.0, M9 part 1: Battles 6–7)

The owner said "continue according to plan" again without notes. The plan's next step is the owner's own checkpoint
(playing B1–B5), which only the owner can do, so its kit is ready (`docs/playtest.md`: how to play on desktop and a
phone, what to look for) and M9 began alongside, in playable slices like M6. The checkpoint's notes still get folded
in before Regions 3–4 are built.

**Built (part 1):**
- **Riders** (Battle 6, `content/soldiers.ts` `rider`): knights on horses. They trot in lines, then charge the hero (or
  the banner) at 7 m/s after a 0.6 s wind-up, bowling over the Queen's soldiers in the way and hitting the hero for 15.
  No glowing lane (a line of them would light up the field): the cue is the lowered sword and the hoofbeats. A shotgun
  hit knocks a rider off his horse (a knockout, with his gold); the horse turns and bolts away from the shot, then
  sinks out of sight. 90 health (×1.6 in Region 2), 12 gold.
- **The horse** (Quaternius, CC0, Poly Pizza, `npm run assets:soldiers` → `horse.glb`, 382 KB): one of four candidates
  rendered beside a KayKit knight; the detailed brown one, drawn chunkier (1.25× wide, 0.92× tall). The crowd draws it
  under each rider in one more instanced draw: its own rig, with its clips sampled into the soldiers' clip rows
  (`SoldierKit.buildMount`), its walk and gallop re-timed so the legs keep pace. The rider sits in the saddle (his
  short legs hide in the horse), sword forward in a charge, and falls from it when knocked out.
- **Firebrands** (Battle 7, `firebrand`): a rogue with a lit fire-pot over his head (a pot and an unlit-orange flame,
  drawn by the crowd). He marches with his squad, then sprints (4.5 m/s) at the hero within 32 m, at a blue within
  6 m, or into the banner's ring, and bursts: 40 to everyone within 4 m, both armies and the hero, and 4% of the banner
  inside the ring. Shot down, he bursts where he falls, so shooting early hurts his own side; bursts chain. His
  "aaah!" and sizzle when the sprint starts are the cue (GDD §9.1).
- **Two guns** (GDD §8.1): from Battle 6 the second hand fills itself with the best other owned gun
  (`state/shop.ts fillSecondHand`), and the swap lesson (onboarding §5) runs in the first wave: "Swap guns" with the
  key cap X or a tapping hand on the gun button, Rosie's "Two guns now. Swap them!", done on the first swap. The
  loaner SMG for a player owning one gun is left out: by Battle 6 the balance has everyone owning the shotgun.
- **Battles 6 and 7** (`content/battles.ts`): five waves each, one new enemy per battle (riders, then firebrands),
  Region 2's ×1.6 health and ×1.5 gold. The SMG is the "Save for this" goal in both (bought at Battle 6's first break by
  the saving player).
- **Their fields** (`content/fields.ts`; Region 2's own field kit comes later in M9): Ford of Reeds, a wide river down
  the west with stepping stones and reeds; Marsh Village, two cottages, a well on mud, a marsh channel and reeds.
- **Sounds** (`npm run audio`): the riders' hoofbeats, built from Kenney's grass footsteps pitched down into a canter
  (the library has no horses: Ovani, Sonniss, CC0 and Echoes were searched); the firebrand's "aaah!" (Ovani Casual),
  sizzle (Ovani Fire) and burst (Echoes).
- **Checks so far:** riders and firebrands looked at in the running game (`qa-output/m9/riders.mjs`,
  `firebrands.mjs`, `landmarks.mjs`); a shotgunned rider measured falling off; a chain of bursts. `npm test` (89, with
  `tests/region2.test.ts`), lint, typecheck; `npm run balance` meets every target through Battle 7 (the Region 1
  targets are now read at the end of Battle 5). The bot (`qa:battles`) wins Battles 1–7 first time, three crowns each;
  `qa` (Battle 1, desktop and touch), `qa:poki` (72), `qa:hud`, `qa:feet`, `perf` (80 draw calls; 688 fps High, 161
  fps Low at 4× CPU, 180 fps a Low phone) and `qa:build` for both zips pass.

**Next (M9 part 2):** Battles 8–10: Rift Strike, the assault and hunting rifles (models), men-at-arms (enemy and ally),
the War Wagon boss; then Region 2's field kit and Regions 3–4.

## Status on 5 Nov 2026 (version 0.10.0, M8: audio and juice)

The owner said "continue according to plan" after 0.9.0 without answering the look question, so M7's look approval
stays open (below) and M8 was built on top of it.

**Built:**
- **The sound set** (`npm run audio`, `tools/audio/build_audio.py`, `docs/asset-pipeline.md`): 34 effects, an ambience
  bed and three music loops cut from the owner's library: Ovani Sound packs, Pizza Doggy's Echoes kit and Kenney
  (CC0); licences in `docs/credits.md`. 2.35 MB, loaded after the first input. The CC0 "fantasy ambient" pack was left
  out: it holds files named like Epidemic Sound's.
- **The mix** (`src/content/audio.ts`): each sound's volume and a per-second cap for frequent ones (hits 12, coins 14,
  bolts 4, yelps 4, as GDD §17 asks). Buses for effects, music and ambience; a gunshot ducks the ambience for 80 ms.
  Sounds out in the field fade with distance from the hero (full within 8 m, 12% at 60 m).
- **What plays when** (`game.ts`, `combat.ts`):
  - Guns: a shot per gun (pistol, short shotgun, SMG; later guns borrow them at other pitches until M9), the reload.
    A tick on cloth, a clink on armour, a clonk on a tower shield.
  - Knockouts: the body flops onto grass as it lands, and a light gasp or "ahh" (five voices, pitched) as he falls.
  - Battle beats: the Baron's horn as each wave starts, war drums under the army reveal (Sir Grudge's menace sting
    instead on the boss wave), Larkmoor's horn when a captain's men run and for a Rally, a sting for each wave cleared
    (not the last: the fanfare plays), a warning drum when they reach the banner, the victory and defeat stings.
  - Shields crack and splinter; Sir Grudge roars at each charge's wind-up and lands hard when he falls. Archers'
    bows "thwip".
  - Gold ticks climb in pitch within a combo (12 steps, 0.7 s window). Menu, card and shop buttons click; the
    battle's own buttons don't.
- **Music** follows the screen and the phase: "The Fair" on the map and before and between waves, "March!" in waves,
  "Retribution" on Sir Grudge's wave, silence under the win and loss stings. The countryside bed plays under every
  battle. Settings' Music and Sound volumes drive them (both existed since M4).
- **Music candidates for the owner's ear:** `python tools/audio/build_audio.py --candidates` built 45-second
  previews (three for map and breaks, three for waves, two for the boss) and a page to compare them:
  `http://localhost:5180/qa-output/music/index.html` with the dev server running.
- **Juice:**
  - The tumble: a knocked-out soldier slides back about 0.35 m along the blow as he falls (`CROWD.tumble`; bosses
    don't). Checked: 0.37 m, straight back from the shot.
  - Hit-stop (`HIT_STOP`): game time nearly freezes for 70 ms when a captain's men rout, 120 ms when Sir Grudge
    drops his shield, 220 ms when he falls (with a camera kick).
  - The rout moment: the horn, two yelps from the runners, the freeze, the "ROUT!" toast (from M3).
  - Purchases arrive (GDD §2): a small crate drops out of a spark beside Rosie, lands with a thud and dust, and sinks
    away (`world/deliveryCrate.ts`).
  - The victory fanfare is the real sting, with the hero and Rosie cheering (M7).
- **Sound in recorded clips:** `npm run record` now logs every sound the game plays and mixes it under the video
  (`tools/qa/soundtrack.mjs`), with the game's volumes, caps and buses. New clip `wave`: a whole Battle 2 wave.
- **Checks:** every clip loads in the running game with no failed requests, and the music follows map, ready, wave,
  boss wave and map again (`qa-output/m8/audio-check.mjs`); each effect's waveform checked for late starts, double
  shots and faint clips (`qa-output/audio-waves/sheet.png`: the SMG, the bullet tick, the bow and the purchase were
  re-cut). Passing: `npm test` (85, with `tests/audio.test.ts`: every named sound has its file, frequent sounds stay
  quiet and capped, every gun has a shot), lint, typecheck, `qa` (the Move prompt check now waits up to 5 s for the
  first frames on a cold dev server), `qa:poki` (72), `qa:battles`, `qa:hud`, `qa:feet`, `perf` (80 draw calls; High
  275 fps, Low at 4× CPU 88 fps, a Low phone 40 fps: inside the budgets, but measured while another project's
  Playwright run was busy on the machine, so not comparable with 0.9.0's), `qa:build` for both zips.
- **Size:** the zip is 4,049 KB (from 1,735 KB); the sounds and music are 2.35 MB of it and load after the first
  input, so the first download is unchanged (1,777 KB of the 5,120 KB budget; 4,132 KB of 8,192 KB in all).

**Not done (by choice, noted for later):**
- The crowd footsteps loop (GDD §17): Kenney's and Ovani's steps are single feet; a marching bed needs a better
  source. Ask the owner.
- The rout's "blue cheer": no crowd cheer with a clear licence in the library; Larkmoor's horn stands in.
- Role sounds for Region 2–4 enemies (firebrand, rider, catapult, brute) come with them in M9.

**Exit (M8):**
- ⬜ **The owner listens** (the build, the `wave` clip and the music page) and gives notes; they're applied.
- ✅ `record` clip of a full wave (with sound): `qa-output/clips/wave.mp4`.

**Still open from before:** the look approval (M7), the cold Battle 1 playtest (M4), the Poki Inspector run (M5).

## Status on 5 Nov 2026 (version 0.9.0, M7 part 2: the hero, Rosie and the look)

The owner picked **KayKit humans** as the soldier base (vision §6). Everything below builds on it
(`docs/asset-pipeline.md`, `npm run assets:hero`).

**Built:**
- **The hero** (`src/game/heroModel.ts`, `content/heroLook.ts`): KayKit's hooded rogue, 1.8 m, his green turned an
  orange hoodie.
  - Legs blend idle, run, walk back and both strafes by where he moves against where he faces; the body holds the aim
    pose, bent at the spine and chest toward the crosshair's pitch, turned a little toward its side.
  - The strafe clips turn the hips, so the spine turns back: the chest and gun stay on the crosshair while strafing.
  - Reload (stretched to the gun's reload time), grenade throw, knocked down (falls) and up again, and a victory cheer.
  - Every gun is held one-handed, arm out to the right. The two-handed pose was tried: it holds the gun in front of
    the face, where the big hood hides it from the camera (GDD §5.1's camera stays as it is).
  - The capsule stands in if the model fails to load.
- **Guns** (Quaternius, Poly Pizza, CC0): pistol, short pump shotgun, SMG, a little oversized so they read past the
  hood, near-black parts lifted to dark grey. Muzzle flash, tracers and casings come from each gun's own muzzle and
  port. Guns 4–9 borrow the SMG until M9.
- **Gun pictures** rendered from the models at load (`render/gunIcons.ts`): white side-view silhouettes in the shop's
  gun cards and on the gun button (which now shows the held gun).
- **Rosie** (`world/rosieFigure.ts`, `content/rosieLook.ts`): KayKit's red-haired rogue in the truck's teal, behind the
  tailgate in her ring. She turns to watch the hero, waves him over every 7 s in a break until he walks in, reaches out
  when the shop opens or he buys, and cheers a win. The hero walks round her.
- **Tower shields** for the shield walls and Sir Grudge (phase 1): the rectangle shield turned to face forward, 0.9 m
  tall, on the chest bone, so it stays in front through the march (`TOWER_SHIELD`). Their bullets-blocked rule is
  unchanged; now it can be seen.
- **Queen Ada's banner** (`world/bannerModel.ts`, `BANNER_LOOK`): pole, gold knob, crossbar, a swallow-tailed blue flag
  with a still ripple (no motion) and a gold crown on both faces.
- **The ground** (`GROUND_LOOK`): soft large patches (±4.5% lightness) and a faint worn track from the north edge to
  the banner hill and from the banner to the camp.
- **Checks:**
  - Calm: `noise.py` on the hill and start views before and after the ground: grain 26.1 → 26.1, busy 49.3 → 49.2.
  - Colour-blind (`colour_blind.py` on the clash, the front and the start view): the Baron's men stay dark (red goes
    olive, helmets charcoal) and Larkmoor's stay blue with light faces in protanopia, deuteranopia and tritanopia; the
    orange hero matches neither side.
  - The hero and Rosie checked by eye from the game camera at d1280 and p390, in motion (`qa-output/m7/*.mjs`).
- **Loading:** the field kit, the hero and Rosie download together. The Poki zip is 1,735 KB (1,775 KB on the wire of
  the 5,120 KB budget, up from 1,276 KB: the hero 0.6 MB, Rosie 0.3 MB, the guns 0.2 MB); `qa:build` loads it in 1.2 s.
- **Also passing:** `npm test` (82), lint, typecheck, `qa` (Battle 1 on desktop and touch; the bot now waits for the
  loading screen, as a player does, and reports gold and the card when Buy fails), `qa:poki`, `qa:battles` (B1–B5),
  `qa:hud` (19 sizes), `qa:feet`, `perf` (80 draw calls at the crowd cap, up from 58, budget 150; 736 fps High, 278
  fps Low at 4× CPU), `qa:build` for both zips.
- **To watch:** two full `qa` runs right after source edits failed once each (desktop's Buy click, touch's wave 2);
  the next five runs passed. Likely the dev server compiling on demand; the Buy check now says why if it recurs.

**Known trade-off:** the archers share the hooded body (GDD §2 now says so). The hero differs by colour, size, gun
and place on screen; a cap or other kitbash can follow if the owner wants a silhouette of his own.

**Exit (M7):**
- ✅ The owner picked the soldier base.
- ✅ Hero, guns, Rosie, tower shields, banner, gun pictures from the models, ground, colour-blind check.
- ⬜ **The owner approves the look** (or lists what to change).

**Next:** the owner's look approval, then M8 (audio and juice). Still open from before: the cold Battle 1 playtest
(M4) and the Poki Inspector run (M5).

## Status on 5 Nov 2026 (version 0.8.0, M7 part 1: the field)

**Built:**
- **The look test's candidates, downloaded and rendered** (`qa-output/m7/look-test-candidates.png`, from the game's
  camera pitch, all at one height):
  - KayKit Adventurers (in use since M2): chunky, big heads, helmets and shields that read at crowd distance; one
    41-bone rig; 6–7k triangles.
  - KayKit Skeletons (CC0, downloaded): the same rig, so they drop into the crowd as they are; they'd make the
    Baron's army undead.
  - Quaternius medieval humans (CC0, Poly Pizza): realistic proportions with small heads, 62-bone rigs with fingers,
    7–11k triangles, and no helmeted soldiers; a different rig, so they'd need their own crowd path.
  - Kenney's characters couldn't be downloaded (kenney.nl refuses scripted downloads; the zips in the library are
    saved 403 pages).
  - **Waiting on the owner's pick.** The recommendation is KayKit Adventurers, restyled.
- **Region 1's field kit** (`npm run assets:field`, `docs/asset-pipeline.md`): 32 pieces from KayKit Medieval Hexagon
  (CC0, same author as the soldiers, so one style) and the Poly Pizza farm set, 0.9 MB (0.3 MB gzipped), drawn
  instanced with Lambert materials.
- **The field dressed** (`src/content/fields.ts`, `src/world/fieldKit.ts`):
  - Rounded cone trees beyond the hedge on three sides and a sparse row far to the north behind the Baron's
    reserves; rocks and single trees near the edges (they block, and soldiers path round them).
  - The Queen's camp: Rosie's truck is now the pickup, recoloured teal, with crates, a barrel and sacks.
  - Each battle's landmark, where enemies never walk: The Mill's windmill (sails to the field), Turnip Field's turnip
    and wheat rows on tilled soil, Old Stone Bridge's bridge over a stream with a watermill, Hollow Farm's houses
    and well, and the Baron's red tower and tents beyond the north hedge for Grudge's Hill.
  - The greybox posts are gone; the smooth hedge stays (a stone wall measured busier).
  - Fog starts a little nearer (58 m to 175 m) so the far trees soften.
- **Calm check** (`noise.py`, greybox vs dressed, four battle scenes): grain 23.5 → 28.5, busy 43.8 → 54.5. The rise
  is the tree line and the landmarks; the tiered pines and a stone wall were tried and measured busier, so they went.
- **Performance:** 58 draw calls at the crowd cap (64 before: the posts went and repeated pieces are instanced).
- Dev: `?nokit` shows the greybox field for before-and-after comparisons.

**Exit (M7, so far):**
- ⬜ The owner picks the soldier base (the look test).
- ⬜ Hero, guns (pistol, shotgun, SMG), Rosie, restyled soldiers (all depend on the pick), banner; shop icons
  rendered from the gun models; terrain material and grade; colour-blind check.
- ✅ Field kit pieces checked in the running game: desktop, a phone in portrait and landscape, near (the shop) and
  far (the tree line), every Region 1 landmark.
- 🟨 Noise metric: recorded above as the new baseline; the owner judges the look.
- Also passing: `npm test` (82), lint, typecheck, `perf`, and the bots (`qa`, `qa:battles`) with the new obstacles.

**Next:** the owner's pick, then the hero, guns, Rosie and the soldiers' restyle (M7 part 2).

## Status on 5 Nov 2026 (version 0.7.0, M6)

**Built:**
- **Region 1 is playable end to end:** Battles 4 (Hollow Farm) and 5 (Grudge's Hill) in `content/battles.ts`; Battle
  6 onward stays "Coming soon".
- **The Shield Wall** (`content/soldiers.ts`, `crowd/crowdSim.ts`): a tall shield held in front stops the hero's
  bullets within 70° of head-on, and the bullet stops there.
  - The shield has 150 health: it cracks at 66% and 33% (sparks and a clonk), and a small shield mark by the
    crosshair says "blocked".
  - Grenades break it at once (`CrowdSim.explode`); without it he's a plain soldier.
  - Shield walls drain the banner like peasants (they block rather than rush).
- **Sir Grudge, the Black Champion** (Battle 5's last wave), on the same crowd system at twice the size:
  - Phase 1: he marches on the banner behind a shield that never breaks, and never turns on the hero (only on the
    militia in his way), so his side can always be reached.
  - Phase 2, below half health: he throws the shield down and charges three times. Each charge has a 1.5 s glowing
    wind-up with its lane glowing red on the ground, then a 9 m/s run that hits the hero and bowls into the militia.
    Two captains with six footmen each join.
  - His fall routs his whole army and calls off the rest: the battle is won.
  - The boss bar (his name over his health, in place of the enemies bar), a 3 s name card every time ("Sir Grudge:
    hit his sides!"), "Last shop before the boss!" at the break before him, and a "Step aside!" lesson at his first
    wind-up.
  - Numbers: 2,400 health, 300 gold, 22 a blow, 2 %/s on the banner, 1.1 m/s (1.3 without the shield). His clips play
    slower by his size, so his feet stay planted.
- **The shotgun's knockback** (0.15 m a pellet; bosses don't budge), and its levels priced from 350 (★2 175, ★3 315).
- **The shop's saving goal:** in Battles 4–5 the shotgun holds the ribbon until it's bought; while it's out of reach
  the ribbon reads "Save for this".
- **The comeback help** now says so: Rosie's "I tuned up your blues." when it's on.
- **The map's Region 1 placeholder:** small landmarks beside Battles 1–5 (a mill, turnip rows, a bridge, a barn,
  Grudge's hill with a black flag) until M7's painted map.
- **Already in place from M3, checked again:** the Hero tab and Banner upgrade; ally archers open after Battle 5
  (Army tab, "Battle 6").
- **Tools:**
  - `npm run qa:battles` plays Battles 1–5. The bot now defends like a player: the enemy nearest the banner first,
    round a shield to its side, out to archers its gun can't reach, round stones it walks into. The boss battle may
    take a second try.
  - `npm run balance` covers Region 1 with the GDD's targets (about 4,000–5,000 earned; the shotgun bought; militia
    L2–3; pistol ★3–4).
  - `qa:feet` checks the giant's walk; `qa:hud` adds the boss wave and the shop's saving goal; `shots` adds
    shieldWall, boss and bossCharge.
  - Dev link `?battle=5&wave=5&boss=2` starts Sir Grudge's second phase.
- **Tests:** 82 (shields from the front and the side, cracks and breaks, grenades, the boss's phases, charges and his
  army's rout, the Region 1 data).

**Balance changes from the GDD's first guesses (now in the GDD):**
- **Sir Grudge** is gentler than the first sketch: 2,400 health and 2 %/s on the banner (a ram's 4 %/s let him take
  the banner before a decent player could answer). His opening escort is peasants, and his reinforcements are two
  small captain squads.
- **His first phase never turns on the hero:** facing whoever he fought made "hit his sides" impossible up close.
- **Shield walls drain like peasants.**
- **"Something affordable at every break"** now means: after a break where the player bought nothing. In Region 1's
  last battles a wave pays about 150–250 and the next upgrades cost 270–450, so right after a purchase the purse can
  be light.
- **The economy through Battle 5:** B1 415, B2 607, B3 965, B4 1,116, B5 about 1,700; 4,900 in all with the starting
  gold. A saving player ends Region 1 with the shotgun, militia L3, pistol ★3.

**Exit:**
- ✅ B1–B5 are playable to the end (`qa:battles`; the bot won Battle 5 at the first try in 5 of its last 6 runs).
- ✅ Region 1's balance targets pass (`npm run balance`).
- ✅ Boss phases are tested with dev jump links (`?battle=5&wave=5`, `&boss=2`) and in `tests/crowd.test.ts`.
- Also passing: `npm test` (82), lint, typecheck, `qa`, `qa:poki`, `qa:hud` (19 sizes), `qa:feet`, `perf`.

**For the owner:**
- **Battle 5 on desktop:** walk round Sir Grudge to his side in phase 1, step out of his lane in phase 2. Does the
  glowing lane read early enough? Is 2,400 health the right length (about a minute with Region 1 gear)?
- **The shield walls** are greybox: the KayKit Rectangle_Shield on the arm doesn't look like a tower shield held in
  front. M7's art pass should give them a big shield held forward.

**Not done yet (later milestones):** the painted map and real fields, the shield wall's and Sir Grudge's own models
(M7); sounds for cracks, wind-ups and the boss (M8); the rift crate is now live from Battle 4.

**Next:** M7, Art for Region 1 (CC0 packs, asset pipeline, hero, guns, soldiers, truck, field kit, look).

## Status on 5 Nov 2026 (version 0.6.0, M5)

**Built:**
- **When the game asks for ads** (`state/ads.ts`, switches in `content/ads.ts`, tests in `tests/ads.test.ts`):
  - Interstitials at natural stops from Battle 2: Next wave in a break, and Continue or Retry on a result card.
  - Never in Battle 1, never mid-wave, never on a timer; skipped straight after a rewarded ad at the same stop.
  - `PlatformSession` also refuses any interstitial before the first `gameplayStart`.
- **Rewarded offers**, each only when the player picks it and granted only on success:
  - **×2 gold** on the victory card (not while Battle 1 is still teaching): the knockout gold and wave bonuses again,
    with a second count-up and a "Doubled!" stamp.
  - **Rally** on the defeat card, once per battle: the banner flares back to half, the enemies at it are knocked out,
    the hero is up, and the same wave carries on (the director holds the wave's remaining squads at a defeat).
  - **The rift crate** (`world/riftCrate.ts`): from Battle 4, about every other battle, in the first break. It drops
    beside the truck (far side from Rosie's ring) with "Something fell through!" and a violet edge arrow. Walking up
    asks "Borrow the Assault rifle?" with **No thanks** first. Open lends the best gun not owned that opens within six
    battles, at ★3, until the next wave ends; then Rosie asks "Saving up for that?".
  - A failed, skipped or blocked ad quietly withdraws the offer: no reward, no message.
- **`ui/rewardButton.ts`:** the only way to make a rewarded button: the video mark, the violet reward colour (never
  green), after a standard choice in the same card, and no taller than `.btn-second`, so every standard choice is at
  least as large. Cards: Continue then 🎬 Double gold; Retry, Map, then 🎬 Rally; No thanks then 🎬 Open
  (`ui/offerCard.ts`).
- **During an ad:** the game is `busy`, the mouse is freed, input is off and held keys are dropped, sound is muted;
  all restored after (and input stays off under a card).
- **Measures:** `rewarded` `double`/`rally`/`crate` with `visible` when offered and `interact` when pressed. Measures
  sent while loading (Battle 1 starts then) wait until `gameLoadingFinished`, so Poki's log starts init, loading done.
- **Dev:** `?crate` forces a crate in any battle; `?noads` plays as the ad-free build; `window.__adMode = 'fail'` or
  `'blocked'` makes rewarded ads fail.
- **Fixed on the way:** every session asked for a sound file that was never added (`assets/audio/click.mp3`, from
  M0), a failed request on Poki. `qa:build` caught it.
- **Tools:**
  - `npm run qa:poki` adds the ads: no interstitial after Battle 1; Next wave's interstitial in Battle 2 with the
    mouse free and input off during it; ×2 gold success, then Continue without an interstitial; failed and blocked
    rewarded ads; the defeat card's order and Rally; the crate's offer, loan and the skipped interstitial; and no 🎬
    or ad requests without ads. Every card is checked against Poki's button rules.
  - `npm run qa:build` (from Primal Valley's): the zip unpacked onto a plain server inside an iframe on a scrolling
    page, with a stand-in SDK. Checks the event order, no requests outside the game's folder except the SDK, keys
    and the wheel not scrolling the page, loading with the SDK blocked and with storage blocked, a phone in portrait,
    no dev tools in the build. `--real-sdk` loads Poki's real SDK; `--target=itch` tests the ad-free zip.
  - `npm run qa:battles` now checks no ad in Battle 1 and the interstitials from Battle 2 (7 over Battles 2–3).
  - `qa:hud` covers the cards with their offers and the crate's card, on 19 sizes at HUD size 1 and 1.5.
- **`docs/release-checklist.md`:** Poki's requirements and the check behind each. The SDK, ads and technical sections
  are ticked; localisation, store page and the Inspector wait for later milestones and the owner.
- **Tests:** 76 (adds the ad rules, and the session holding early measures, refusing a preroll and running the ad hooks).

**Exit:**
- ✅ `qa:poki` and `qa:build` pass (also `--real-sdk` and `--target=itch`).
- ✅ The release checklist's Poki section (SDK and events, Ads, Technical) is ticked.
- ⬜ The owner runs the build through the Poki Inspector: upload `release/thunder-knight-0.6.0-poki.zip` in Poki for
  Developers and run its QA modules.
- Also passing: `npm test` (76), lint, typecheck, `qa`, `qa:battles`, `qa:hud`.

**For the owner:**
- **The Inspector:** the zip is ready to upload as a private test build.
- **Interstitial points:** Next wave and leaving a card, from Battle 2. Poki throttles how often an ad actually plays,
  so most of these asks show nothing; they're switches in `content/ads.ts` if they feel like too many.
- **Rally knocks out the enemies at the banner** as well as restoring it. Without that, the banner at half with
  enemies still on it fell again in seconds. Generous enough? Too generous?

**Not done yet:** the crate can't appear in a real battle until Battle 4 exists (M6); it's tested with `?crate` in
Battle 3. Ad sounds and juice for the rewards (M8).

**Next:** M6, Region 1 complete (greybox).

## Status on 5 Nov 2026 (version 0.5.0, M4)

**Built:**
- **Battle 1's script** (`game/onboarding.ts`, onboarding.md §4), one thing at a time:
  - Move to the gold ring; Aim at a scout who steps out to the side, with a diamond over him; Shoot (desktop only).
  - His coins fly in and the gold counter appears. The mob comes over the hill: the banner and wave bars appear with
    "Protect the banner".
  - Go to the truck; Buy (the shop shows only the pistol); Next wave; the captain's wave; Victory; Fight! on the map.
  - Scripted squads wait for their step (director cues). Stuck helpers per step: the prompt pulses, Rosie rephrases
    once, then the world helps (glowing footprints to the goal).
  - A computer player who shoots before the Shoot prompt passes both steps at once.
- **The HUD grows as it's needed** (onboarding §3): Battle 1 starts with Pause only; gold, the bars, health, the gun
  button and Next wave appear at their steps. Every other battle shows everything.
- **Lessons after Battle 1** (onboarding §5–6): grenades when the first dense block is within 25 m (Battle 2), the
  Army tab at Battle 2's first break, the Hero tab at Battle 3's; Move and Aim once more when a player changes device.
- **Prompts** (`ui/prompt.ts`): key caps and mouse pictures on desktop, an animated hand on touch, four words at most.
  - Bottom centre on desktop, under the bars on a landscape phone, above the button stack in portrait.
  - A prompt about a button sits beside its card or panel, never on it.
  - When the button already says the words (Next wave, Continue, Fight!): only the key pictures on desktop, only the
    tapping hand on touch. With no free spot (a small phone's full shop), the hand alone.
- **Rosie's bubbles** (`ui/rosie.ts`): under the gold in landscape (left of the bars), under the bars in portrait,
  clear of Poki's pill.
- **Markers:** the gold goal ring and the footprint trail (`world/markers.ts`), the target diamond, and off-screen
  arrows for the banner under attack, arriving squads and the truck in a break (`ui/edgeArrows.ts`).
- **Army reveals** (`game/reveal.ts`): at each wave's start a 2 s high shot from behind the banner, 2.5 s with a
  nameplate for a new enemy type ("Captain: they'll run!"). Any press skips it; prompts step aside meanwhile. The
  Wave intros setting: Full, Short (new enemies only), Off.
- **Pause and settings** (`ui/pauseMenu.ts`): Resume, Settings, Back to map (asks first; gold is kept). Sound, music,
  look speed, invert look, auto-fire, aim help (touch), wave intros, screen shake, graphics, HUD size, left-handed
  and vibration (touch), language (once there's more than one), credits. Arrow keys move through it; a finger gets no
  focus ring.
- **The HUD fits every screen** (`qa:hud`):
  - Toasts stack under the bars and the objective.
  - On a tight screen (narrow, a big HUD, a lot of gold) the bars move to the top right (`BattleHud.fit`).
  - With the shop open the field's HUD steps back (gold, bars, health, buttons). The docked shop narrows on small
    phones so Next wave fits beside it, and the field re-centres in what's left.
  - Landscape phones: the shop and the map keep clear of Poki's pill. Portrait: the shop sheet starts below it.
  - The map: in portrait a column (head, road, card), so the card never hides its buttons. On small screens it zooms
    to the selected battle's area so every node is a 48 px target.
  - Result cards clear the field's toast and nameplate.
- **Measures** (Poki): tutorial steps (start, complete), battles (`b01` start, complete, fail), waves (`b01w1`), shop
  interactions.
- **Tools:**
  - `npm run qa`: Battle 1 with real input on desktop (1280×720) and a touch phone (390×844). Every step and measure
    in order, Poki's events, no ads, no errors. `--shots` saves a picture per step in `qa-output/qa/`. Dev link
    `?speed=3` runs game time faster.
  - `npm run qa:hud`: 19 sizes × 11 states (a wave, a break, knocked down, the shop and its Army tab, victory,
    defeat, the map, pause, the leave question, settings), each with its longest text. Checks overlaps, off screen,
    clipping, 44 px targets and Poki's pill. `--hud=1.5`, `--screens=`, `--states=`, `--langs=`.
  - Dev scenes are a clean sandbox with no onboarding; the `shots` battle scenes play as a returning player.
- **Tests:** 67 (adds the reveal planner and the nameplate tips).

**Exit:**
- ✅ `npm run qa` completes Battle 1 on desktop and touch with every tutorial measure in order (desktop: move, aim,
  shoot, gold, mob, truck, buy, nextwave, captain, map; touch the same without shoot).
- ✅ `qa:hud` is clean at all 19 sizes, at HUD size 1 and 1.5.
- ⬜ The owner plays Battle 1 cold on desktop and on a phone, and confirms it is clear. Their notes go here.
- Also passing: `npm test` (67), lint, typecheck, `qa:poki`, `qa:battles`, `perf` (64 draw calls at the cap). `qa:feet`
  wasn't re-run: no animation or crowd changes.

**For the owner's cold playtest** (a fresh save: a private window, or clear the site's data):
- Is every step clear without reading anything? Where did you hesitate?
- Desktop: the first prompt is a mouse click picture plus WASD, "Move". Clear?
- Rosie's bubble: top left in landscape, under the bars in portrait. Noticed? In the way?
- The army reveal: is 2 s the right length? (Settings → Wave intros has Short and Off.)

**Not done yet (later milestones):**
- Battle 4's lessons (shield wall, the rift crate) and later ones arrive with their battles (M5, M6, M9).
- Rewarded offers on the cards (M5). The painted map (M7). Prompt tick sound and juice (M8). Eleven languages (M11).

**Next:** M5, Poki ads.

## Status on 4 Nov 2026 (version 0.4.0, M3)

**Built:**
- **Battles 1–3** (`content/battles.ts`), on the greybox field:
  - The Mill: a scout, two peasant mobs, a captain's band.
  - Turnip Field: footman blocks join.
  - Old Stone Bridge: archers, and two captains at once in wave 4.
  - Battles 4–20 are on the map, locked as "Coming soon".
- **The battle (`game/battle.ts`, `game/director.ts`):**
  - A 2.5 s countdown, then waves and player-paced breaks.
  - The director spawns squads at their edges and times under the device's soldier cap.
  - The banner and its 6 m ring: enemies inside drain it (halved from the GDD's guess, see below); it heals 20% per
    break; Battle 1 can't drop below 30%.
  - Hero health: regeneration, a short safety after each hit, and a knockout. The view greys, "Back up in 5" shows,
    and the hero gets up at the banner with full health; Battle 1 can't knock him out.
  - Grenades from Battle 2: two a wave, landing on the densest enemy group near the aim.
  - Allies: the militia crescent, plus archers once bought; both refill at each wave.
  - The comeback help after two defeats in a row.
- **Gold (`game/coins.ts`):**
  - Every enemy knockout and rout drops coins, whoever made it. Inside the 5 m magnet they fly to the hero, and at a
    wave's end every coin does.
  - Wave bonuses and the first-win bonus are paid by the battle.
  - Collected gold is saved at once.
- **Rosie's shop (`state/shop.ts`, `ui/shopPanel.ts`):**
  - In a break, a gold ring by the truck and a marker over it; walking in opens a docked panel, and the view shifts
    so the hero stays visible.
  - Guns, Army and Hero tabs open in Battles 1, 2 and 3.
  - Data-driven cards: buy, "X more", equip, max, locked with the battle that opens it.
  - The Recommended "Best buy" ribbon, scripted for Battles 1–3, and the panel opens on its tab.
  - New guns go to the hand; two hand slots from Battle 6. Pistol, shotgun and SMG fire with their own numbers.
- **Cards and the map:**
  - Victory: crowns and gold rows, then Continue to the map.
  - Defeat: "The banner fell!", the gold kept, Retry or Map.
  - Pause: Back to map.
  - The map (`ui/mapScreen.ts`) is a placeholder parchment of 20 nodes in four regions: won nodes show their crowns
    and the next one pulses. Its card has the waves, what's new and the first-win bonus, with Fight! and Truck.
- **Flow (`game/game.ts`):**
  - A new player boots straight into Battle 1; a returning player lands on the map with the next battle selected.
  - One rule drives Poki's gameplay events (on in waves, off in breaks, cards, the map, pause and ads).
  - Dev links: `?battle=N&wave=W&gold=G`.
- **The battle HUD (`ui/battleHud.ts`, `ui/battle.css`):**
  - Gold beside Pause; the wave with the banner (blue) and enemies-left (red) bars.
  - Health at the bottom left; toasts ("Wave cleared! +30", "ROUT!", "They're at the banner!").
  - Next wave (Enter); the grenade count; the knocked-out countdown.
  - M4 finishes the HUD on every size.
- **Rules as plain functions with tests:**
  - `state/economy.ts`: bonuses, crowns, hero, army and banner stats, the comeback help.
  - `state/progress.ts` and `state/shop.ts`.
  - `state/balance.ts`: the simulator.
- **Tools:**
  - `npm run balance` (the report and the GDD §11.2 targets).
  - `npm run qa:battles`: a scripted player wins Battles 1–3 from a new save through the map, buys the
    Recommended items, loses one on purpose, retries, and reloads.
  - `npm run shots` scenes: battleWave, shop, victory, defeat, map. `npm run record -- battle`.
- **Tests:** 60 (adds the economy, progress, shop, battle data and the balance targets).

**Exit:**
- ✅ Battles 1–3 played from the map to victory and to defeat (`qa:battles`: two runs in a row pass).
- ✅ Gold and purchases survive a reload, and a returning player lands on the map.
- ✅ `npm run balance` meets the B1–B3 targets:
  - Battle 1's first break holds 110 (pistol ★2 is 100).
  - Battle 1 earns 415.
  - Something is affordable at every break except Battle 1's second, which the onboarding plans as "X more".
- ✅ `npm test` passes (60), and `qa:poki`, `qa:feet` and `perf` still pass.

**Balance changes from the GDD's first guesses (now in the GDD):**
- **Banner drain halved:** 0.75 %/s light, 1.5 %/s heavy. At 3 %/s a block of twelve emptied the banner in three
  seconds, too fast for a casual player to answer.
- **Militia prices:** 150/250/400/650/1,000 instead of 150/300/500/800/1,200, so Battle 2's breaks always offer
  something.
- **Hero tab prices** were set here (the GDD had none).
- **Every knockout pays, whoever made it.** This is what makes the GDD's own targets work (about 110 at the first
  break, about 400 for Battle 1).

**For the owner's playtest:**
- **Difficulty:** the scripted player wins all three battles with the banner at 100%. Too easy for skilled players?
  Real tuning is M6's balance pass.
- **Gold during a wave:** coins only fly in within 5 m, and fights happen 15–30 m out, so gold mostly arrives at a
  wave's end. That's per the GDD (the magnet upgrade widens it), but it may weaken "every second pays".

**Not done yet (later milestones):**
- Onboarding steps and prompts, army reveals, nameplates, settings, the final HUD on every size (M4).
- Ads (M5). Shield walls, Battles 4–5, Sir Grudge (M6). Art, real fields and the painted map (M7). Sounds beyond
  placeholders, juice (M8).

**Next:** M4, HUD, UX and onboarding.

## Status on 4 Nov 2026 (version 0.3.0, M2)

**Built:**
- **Soldiers from the CC0 KayKit Adventurers pack** (Kay Lousberg; `docs/credits.md`), downloaded to
  `C:\PROJECTS\ASSETS\3D\kaykit-adventurers`.
  - `npm run assets:soldiers` trims the four characters to 11 clips and the parts we use: 640 KB gzipped in all.
  - Every model shares one rig, so one set of clips animates everyone.
  - The looks are placeholders until M7:
    - footmen: helmeted knights
    - captains: knights with a badge shield and the tall banner
    - archers: hooded rogues with crossbows
    - peasants: rogues
    - militia: barbarians
    - men-at-arms: knights with tower shields
- **Rendering, a change from the plan's vertex textures (tech design §5.6):**
  - At load the clips are sampled into a small **bone texture** (41 bones × 349 frames), and each soldier is skinned
    on the GPU from it, blending between frames and, for 0.15 s, between clips.
  - It's lighter to download, and helmets, shields, swords and the captain's banner ride their bones.
  - One instanced mesh per model draws both armies.
  - A shader repaints each model's cloth per soldier and tints the steel: the Baron's charcoal and red against
    Larkmoor's bright steel and blue.
- **Simulation (`src/crowd/`):**
  - Every soldier lives in plain arrays, ticked at 30 Hz.
  - Squads march their anchor down a flow field to the banner ring, round props, or hold a spot.
  - Soldiers keep formation slots (block, line, mob, crescent; the captain mid-second-rank) until an opponent comes
    near. Enemies engage within 6 m; allies within 8 m of their slot.
  - Melee blows land on the attack clip's hit frame, with a stagger on a hit.
  - Knockouts fall away from the blow, puff dust, lie, then sink.
  - A captain's knockout routs his squad within 15 m: they run off at 1.4× speed and can't be shot.
  - Archers stop at range and loose bolts that land 1.1 s later. Enemy bolts show red rings where they'll land.
  - Enemies attack the hero within 6 m; hits show the damage arc (health comes in M3).
  - Far soldiers (over 50 m) think at half rate but still move every tick.
- **The hero's shots hit the crowd** through the same `Targets` interface as M1's dummies. The range is gone.
- **The backdrop army** marches on the far hills, with no simulation.
- **Tiers:** real soldier shadows on High only. Low and Lowest get soft blob shadows and fewer or no backdrop soldiers.
- **Test scenarios** (`content/scenarios.ts`) until M3's battles:
  - `clash`: 150 against 150 with reinforcements, the default start
  - `march`: the high-ground test with real soldiers
  - `?scene=start|hill|clash|front|empty`
- **Tools:**
  - `npm run perf` (High, Low at 4× CPU, a Low phone)
  - `npm run qa:feet` (planted feet don't slide)
  - `npm run shots` (clash and front scenes)
  - `npm run record` (clips of the clash on mouse and touch, the front line, the march and rout, feet from the
    side)
- **Tests:** 47 (adds the flow field, formations and the crowd's rules: marching, melee, routs, knockouts, archers,
  the hero as a target, capacity).

**Exit:**
- ✅ 300 soldiers (150 against 150) clash on High:
  - 969 fps on this desktop with vsync off (budget 60)
  - 64 draw calls (budget 150)
  - 3.6M triangles a frame, half of them in the shadow pass
- ✅ 160 on Low at 4× CPU: 464 fps, 61 draw calls, 1.1M triangles. A Low phone size: 309 fps, 56 calls.
- ✅ Clips of the clash: `qa-output/clips/mouse.mp4`, `touch.mp4`, `touchLandscape.mp4`, plus `front.mp4`,
  `march.mp4` and `feet.mp4`.
- ✅ No visible artifacts:
  - `qa:feet` measures a planted foot drifting 0.13 m/s under a soldier jogging at 2.3 m/s (tolerance 0.35)
  - clips blend, so nothing pops
  - frames are interpolated, so slowed clips don't freeze
- ⬜ The GPU on a real mid phone. Headless Chrome can only slow the CPU, so this waits for the checkpoint.

**Found and fixed on the way:**
- **Feet slid:**
  - In a run the swinging foot also passes near the ground, so the clip-speed measurement counted it. It now counts
    only feet that are low *and* moving back.
  - Slowed clips stepped from frame to frame, dragging planted feet. The shader now blends neighbouring frames.
  - Far soldiers moved only every other tick. They now coast between thoughts.
- **Allied and enemy knights looked alike** (mostly grey steel). Steel is now tinted per army, and the cloth
  repaint compares saturation relative to brightness, so the dark end of each palette gradient is repainted too.
- **Allied archers on the hilltop** filled the camera. They now stand on the hill's shoulders.

**Not done yet (later milestones):**
- LOD meshes for far soldiers (M11, if a real phone needs them).
- Per-type geometry to skip hidden parts' vertices (M11).
- Shield walls blocking shots (M6).
- Gold, the banner drain and waves (M3).

**Next:** M3, the core battle loop (banner, waves, gold, the walk-up shop, Battles 1–3 in greybox). M1 still waits on
the owner's own playtest.

## Status on 4 Nov 2026 (version 0.2.0, M1)

**Built:**
- **Camera:** the rig pulled up and back so the hero fills about 30% of the screen height in landscape (it was 40%) and
  stands in the lower middle in portrait, under the crosshair at 45%.
  - It pulls in at once against props and the ground, and eases back out when clear.
  - The hero fades to 40% when the camera is close and to 12% when it's backed against a wall.
  - Shots kick the picture and widen it slightly, then settle back; the aim never moves. The Camera shake setting
    scales this.
- **Pistol** (`game/combat.ts`, `game/gun.ts`):
  - 4 shots a second while held, 12 rounds and a 1 s reload.
  - It reloads by itself when empty and after 2.5 s idle. R or tapping the gun button reloads early.
  - Each shot is traced along the crosshair's ray through a 2 m spatial hash, with pierce.
  - The gun arm points at what the crosshair is on. The tracer leaves the muzzle, with a small warm flash and a
    casing.
- **Hits:**
  - The soldier flashes white, with a dust puff and a small damage number.
  - The crosshair turns red on a target and shows a gold diamond over a captain.
  - Hit markers are soft on a hit and gold on a knockout. Knocked-out soldiers tumble away from the shot, puff dust
    and sink into the grass.
  - Damage arcs (dev hook `hurtFrom`; enemies hit back from M3).
- **Aim assist:** ported from Scrap Express.
  - The body under the crosshair always wins. Inside the cone it picks a captain, then an archer, then the nearest.
  - The target is sticky for 2°.
  - Friction slows the look near targets (touch 0.55, mouse 0.8). The magnet works on touch only and never fights the
    player.
  - Shots bend toward the target inside the cone (all the way on touch, 60% with a mouse).
  - Touch auto-fire starts after 0.1 s on target, shown by the pip under the crosshair.
- **Test range** (`content/range.ts`, `game/range.ts`):
  - 4 static footmen at 8–38 m.
  - A patrol of 6 peasants walking back and forth.
  - A block of 60 footmen with a captain marching up the far side of the banner hill and halting at the ring.
  - Greybox soldiers read by role: peasants are brown with hats and pitchforks; footmen are red with helmets, shields
    and swords; the captain has gold trim, a plume and a tall red banner.
- **The hill** is now 3 m high over 15 m (1.6 m gave no view down). The capture ring follows its curve.
- **Placeholder sounds** made in code (shot, hit, knockout, armour clink, reload) until M8.
- **Tools:**
  - `npm run shots`: 9 scenes, any screens.
  - `npm run record`: 5 clips with scripted mouse and touch play, and contact sheets.
  - `qa:poki` now also checks shooting:
    - the capturing click doesn't fire
    - holding the button fires at the pistol's rate
    - R and the gun button reload
    - touch auto-fire shoots
- **Tests:** 37 (adds the hash, capsule hits, pierce, the gun's rate and reloads, ★ levels and prices, aim-assist
  priority, stickiness, sight and bending).

**Exit:**
- ✅ Shots at p390, l844 and d1280 (and d800, the Browser pane's size) show the crosshair, the hero and the incoming
  block without overlap (`qa-output/shots/hill-*`, `firing-*`).
- ✅ Clips: `qa-output/clips/mouse.mp4`, `touch.mp4` and `touchLandscape.mp4`, plus `patrol.mp4` and `wall.mp4`.
- ✅ Feel review notes, below.
- ⬜ The owner plays at 5180 with the mouse and with touch emulation, in landscape and portrait.

**Feel review (from the clips and shots):**
- **Hero size:**
  - At M0 the hero filled 40% of a landscape screen and hid the field.
  - At 5.2 m, 2.1 m up and −14° it's about 30%, with the head just under the crosshair and a little left of centre.
  - Portrait uses 6.0 m and −17°.
  - This is the main thing to judge in the owner's playtest.
- **High ground:**
  - From the hilltop the block of 60 reads as ranks, and the captain's flag stands above them.
  - The flag was edge-on to the player at first; it now faces front.
  - Real silhouettes come with the M7 art.
- **Shots had to be readable at 20 m:**
  - Additive tracers and an additive flash vanished or turned white against the bright sky. Tracers are now opaque,
    5 cm wide and thinning; the flash is a small warm star.
  - A red-on-red hit flash didn't read, so hit soldiers flash white.
  - Dust puffs were doubled in size.
- **Touch:**
  - Auto-fire after 0.1 s inside the 7° cone works with drag-look.
  - Sweeping steadily across a block fires only a few shots; resting on a target fires steadily. That's intended.
  - To check in the playtest: whether 0.1 s feels slow, and whether the red crosshair inside the cone (not only over
    a body) reads as "you'll hit".
- **Camera collision:**
  - Backing into the truck pulls the camera in at once and eases it out after.
  - A 40% hero up close showed its insides, so depth stays on and the hero ghosts to 12% within 0.9 m.
- **Not judged yet:** the sound (placeholders), and a human hand on a real phone.

**Next:** the owner's playtest of M1, then M2 (crowds).

## Status on 4 Nov 2026 (version 0.1.0, M0)

**Built:**
- **Skeleton:** Vite + TypeScript + Three.js (0.187) with Primal Valley's proven modules:
  - `platform/` with the Poki, web and dev adapters, and `PlatformSession` enforcing Poki's rules
  - `save/` (SaveV1 shape from tech design §5.12, migrations, settings key)
  - `content/strings` (English), `render/stage.ts` (tiers with soldier caps), `input/input.ts` (this game's verbs:
    fire, grenade, support, swap, reload, next wave)
  - DOM UI scaled by `--s`
- **Greybox field:** the banner on its hill with the capture ring, Rosie's truck as a teal box, hedges, distance posts.
- **Hero and camera:** a capsule hero in an orange hoodie, and a first over-the-shoulder rig with landscape and portrait
  shapes and the portrait crosshair at 45%.
- **Pause:** Esc, P, the button, or losing the mouse; Resume.
- **Poki events:** `gameplayStart` on first input, `gameplayStop` on pause. The SDK is injected only in Poki builds.
- **Tests:** 19 (platform session, saves including a fixture history, strings, tiers).
- **Tools:**
  - `npm run qa:poki` (M0 version: event order on desktop and a portrait phone, pause card, 44 px targets, no ads,
    no errors)
  - `npm run package` / `package:itch` (226 KB each)
  - CI workflow
  - launch config `knight`

**Exit met:**
- Dev on 5180; the hero walks with WASD and with the touch stick.
- `npm test`, `lint` and `typecheck` are clean.
- The Poki build is 226 KB of 5 MB.
- `release/thunder-knight-0.1.0-poki.zip` is made.
- `qa:poki` passes.

**Seen in the Browser pane:**
- Landscape 800×600 and portrait 375×812.
- After the first look, the rig moved back (4.3 m) and the start moved so the camera clears the truck.
- The hero still takes a large share of a 4:3 view. Tuning that is M1's first job.

**Next:** M1, hero, camera and gun feel.

## Status on 4 Nov 2026 (plan)

**Built:**
- `docs/research/`:
  - Kingmakers teardown
  - reference games
  - Poki and UX guidelines
  - what to reuse from our games
- `docs/vision.md`, with the owner's decisions:
  - over-the-shoulder camera
  - gold kept across a campaign
  - an allied army and a banner
  - CC0 low-poly packs
  - project folder `Knight Makers`
- `docs/gdd.md`, `docs/onboarding.md`, `docs/tech-design.md`, this plan, `CLAUDE.md`, `CHANGELOG.md`.

**Next:** M0.

---

## M0: Foundations

**Goal:** a maintainable skeleton with Poki wired from day one.

**Scope:**
- Vite, TypeScript and Three.js project. Folders as in tech design §3.
- `package.json` scripts, ESLint, Prettier, vitest, CI workflow.
- Port from Primal Valley:
  - `platform/` (Poki, web and dev adapters, `PlatformSession`, tests)
  - `save/` (with `SaveV1` and tests)
  - `content/strings/` (English) and `t()`
  - `audio/` (base)
  - `input/` (base)
  - `render/stage.ts` (sizing, `--s`, tiers)
  - `ui/dom.ts`
  - `tools/qa/fake-lock.mjs`
  - `check-size.mjs`, `package.py`
- `index.html` with a loader and progress bar. Poki SDK injected only in `--mode poki`.
- `main.ts` boot order: save → session → language → load → `loadingFinished` → start.
  - `gameplayStart` on first input.
  - Pause on Esc/P with `gameplayStop`.
- A greybox field (plane plus a few boxes), the banner pole and a truck box. A capsule hero walks with WASD or the
  stick, behind a temporary chase camera.
- Dev: `window.__game`, `?dev` panel, `?noads`, `?lang=`.
- Browser pane launch config `knight` (port 5180).

**Exit:**
- `npm run dev` serves on 5180, and the capsule walks on desktop and in touch emulation.
- `npm test` passes: platform session, saves, strings.
- `npm run build` makes a Poki build under budget.
- `npm run package` writes `release/thunder-knight-0.1.0-poki.zip`.
- `npm run qa:poki` (first version) confirms the event order with the dev adapter: `loadingFinished` once, then
  `gameplayStart` on first input, `gameplayStop` on pause.

## M1: Hero, camera and gun feel (greybox)

**Goal:** the over-the-shoulder camera and shooting feel right on mouse and touch, in landscape and portrait, before
any content.

**Scope:**
- `cameraRig.ts`:
  - landscape and portrait parameter sets (GDD §5.1)
  - portrait view offset with the crosshair at 45%
  - collision and hero fade
- Desktop pointer lock with drag-look fallback; touch floating stick and drag-look zones; device switching.
- Pistol: hitscan with pierce through a spatial hash, magazine and auto-reload, `WeaponFeel` (kick, flash, tracer,
  shells), hit markers, damage arcs.
- Aim assist ported from SE (priority, sticky target), touch auto-fire, and the auto-fire pip.
- Target dummies (capsules): static, walking in lines, and a "captain" with a tall pole to test readability over
  crowds.
- High-ground test: a banner hill with 60 dummies marching up it, viewed in both orientations.
- `npm run shots` and `npm run record` (from PV/SE).

**Exit:**
- The owner can play at 5180 and shoot walking dummies with the mouse and with touch emulation, in landscape and
  portrait.
- A recorded clip of each.
- Shots at p390, l844 and d1280 show the crosshair, hero and incoming lines without overlap.
- The feel review notes are recorded here.

## M2: Crowds

**Goal:** hundreds of animated soldiers at budget. This is the biggest technical risk, so it comes early.

**Scope:**
- Download (approved) one CC0 rigged character base and an animation set for the bake test.
- `tools/vat/`: bake clips (idle, walk, run, attack, knocked, flee, cheer) to RGBA16F textures plus a clip table.
- `vatMaterial.ts` and `crowdRender.ts`: one `InstancedMesh` per archetype per LOD, team tint, variants by mask, fade.
- `crowdSim.ts`:
  - structure-of-arrays data at 30 Hz
  - spatial hash, flow field to the banner, formations
  - melee pairs with hit frames
  - knockout tumble with direction
  - routs
  - LOD simulation
- Archers: shooting state, pooled arrows, landing marks.
- Backdrop armies.
- `npm run perf` with a 300-soldier clash scene.

**Exit:**
- 300 soldiers (150 against 150) clash on the High tier at 60 fps on desktop.
- 160 on Low at 30 fps or more under 4× CPU throttle.
- 150 draw calls or fewer.
- A clip of the clash.
- No visible artifacts: popping, sliding feet beyond tolerance, frozen frames.

## M3: Core battle loop

**Goal:** the whole loop, playable end to end, in greybox.

**Scope:**
- The banner and capture ring with drain and heal. The director playing `BattleDef` waves (alive cap, squads,
  captains).
- Gold:
  - coin drops (pooled) and the magnet
  - collection of leftovers at wave end
  - the wave bonus and first-clear bonus
- Wave break: "Wave cleared!", the truck ring, the shop panel (3 tabs, data-driven catalogue, card states, recommend),
  Next wave.
- Victory and defeat cards (placeholder style), crowns, and a basic map screen with nodes and Fight.
- The hero knocked out and getting up at the banner.
- Enemies: peasant, footman, captain (rout), archer. Allies: militia, archers. Guns: pistol, shotgun, SMG.
  Grenades.
- Saves for everything (SaveV1). Dev jump links.
- `state/` rules with tests, and balance simulator v1 for B1–B3.

**Exit:**
- Battles 1–3 can be played from the map to victory and to defeat.
- Gold and purchases survive a reload.
- `npm run balance` passes the B1–B3 targets.
- `npm test` passes.

## M4: HUD, UX and onboarding

**Goal:** a new player understands everything without reading.

**Scope:**
- The final HUD (GDD §15.3–15.4): progressive reveal, off-screen arrows, damage arcs, toasts.
- The prompts system (key caps, mouse pictures, animated hands; placement rules).
- Rosie bubbles.
- The Battle 1 script (onboarding.md §4) with stuck helpers and safety rails. Lessons for B2–B4 (§5).
- Army-reveal shots with nameplates.
- Pause, settings and keyboard menus.
- `qa:hud` at all 19 sizes. `npm run qa`: the Battle 1 autopilot on desktop and touch.

**Exit:**
- `npm run qa` completes Battle 1 on desktop and touch with every tutorial measure in order.
- `qa:hud` is clean at all sizes.
- The owner plays Battle 1 cold on desktop and on a phone, and confirms it is clear. Their notes are recorded here.

## M5: Poki ads

**Goal:** monetisation per GDD §16, following Poki's rules.

**Scope:**
- Interstitial points:
  - Next wave from B2
  - result cards from B2
  - never in B1, never mid-wave, skipped after a rewarded ad in the same break
- Rewarded:
  - Rally (defeat card)
  - ×2 gold (victory card)
  - the rift crate in the world (from B4), with No thanks first
- The `rewardedButton` component enforces order, size, colour and 🎬.
- Pointer lock is released in ads; audio is muted; input is reset.
- `measure` exposure events.
- `qa:poki`:
  - order and size on every card
  - success, fail and blocked
  - no interstitial in B1
- `qa:build`:
  - the zip in an iframe on a scrolling page
  - no outside requests
  - keys don't scroll the page
  - plays with the SDK blocked and with storage blocked
  - `--real-sdk`
- `package:itch` (no ads).

**Exit:**
- `qa:poki` and `qa:build` pass.
- The release checklist's Poki section is ticked.
- The owner can run the build through the Poki Inspector.

## M6: Region 1 complete (greybox)

**Scope:**
- Shield Wall: frontal block, cracks, grenade break.
- Sir Grudge's two phases and the boss bar.
- B4–B5 data.
- The Hero tab and Banner upgrade.
- Ally archers unlocking after B5.
- The region 1 map art placeholder.
- The balance simulator through B5.
- "Last shop before the boss" warning.
- The comeback help after two defeats.

**Exit:**
- B1–B5 are playable to the end.
- Balance targets for Region 1 pass.
- Boss phases are tested with dev jump links.

## M7: Art, Region 1

**Scope:**
- **Look test:** download and evaluate the CC0 candidates (GDD §18.2). Render three soldier bases in an in-game crowd at
  the over-the-shoulder distance, in landscape and portrait. The owner picks one.
- `docs/asset-pipeline.md` and `npm run assets` (Blender by script: restyle to one palette, merge, decimate, VAT bake,
  compress).
- Models:
  - the hero (modern outfit), animated with aim poses
  - pistol, shotgun and SMG
  - peasant, footman, captain, archer, Shield Wall and Sir Grudge
  - militia and ally archer
  - Rosie and her truck
  - the banner
  - mill, farm, bridge, hedges and nature
- Terrain material, sky, fog and grade; shop icons rendered from models.
- Calm check with `noise.py`; colour-blind check.

**Exit:**
- Every Region 1 asset is checked in the running game: near and far, in a crowd, at rest and in motion, in landscape
  and portrait.
- No artifacts.
- The noise metric is within the calm baseline.
- The owner approves the look.

## M8: Audio and juice

**Scope:**
- A sound set from the owner's library: guns, crowd, role cues, coins, UI, horns.
- Two or three music candidates for the owner to choose by ear.
- Hit-stop, knockout tumbles, the rout moment, the army-reveal polish, the victory fanfare, purchase crate drops.
- Shake and reduce-motion settings.

**Exit:**
- The owner's listening notes are recorded and applied.
- `record` clips of a full wave.

## ✋ Checkpoint: Region 1 vertical slice

**Who:** the owner, playing B1–B5 on desktop and a real phone in both orientations.

**Output:** a list of changes, folded into M9–M11 before any new region is built.

## M9: Regions 2–4

**Scope:**
- **Enemies:** Rider, Firebrand, Man-at-Arms, Brute, Battering Ram, Catapult, elite captains.
- **Bosses:** the War Wagon, the Siege Tower, the Iron Baron's Iron Ox (phases 1–3).
- **Guns:** assault rifle, hunting rifle, machine gun, grenade launcher, minigun, rocket launcher, at ★1–★5 with visible
  changes.
- **Support:** Rift Strike and Sentry Gun.
- **Other:** the second gun slot and swap; allies men-at-arms and knights.
- **Battles:** B6–B20 data with three new field kits (Riverlands, Highland Pass, Iron Keep), and art for each.
- Lessons for B6–B14 (onboarding.md §5).
- The balance simulator through B20.

**Exit:**
- All 20 battles can be won by the saving simulator player with no replays and no ads.
- Every new asset is checked in the running game.
- Perf budgets hold in a Region 4 wave.

## M10: Ending and Last Stand

**Scope:**
- The final boss's comedy exit, a short ending sequence with Queen Ada, and the Last Stand unlock.
- Last Stand:
  - endless scaling waves
  - a shop every 3 waves
  - best-wave records per field
  - `measure('battle','laststand',…)`

**Exit:** Last Stand runs 30+ waves at budget with no leaks (a heap check in `perf`).

## M11: Polish and performance

**Scope:**
- Quality tiers tuned on a phone profile, and phone perf (`perf -- --phone --cpu=6 --tier=lowest`).
- Deferred loading:
  - Region 1 is initial
  - other regions are fetched in the background
- Size: Draco or meshopt, KTX2/WebP, audio compression.
- **Languages:** 11 (en fr it de es tr pt ru zh ja ko), with `qa:hud --langs=all`.
- **Accessibility:** colour-blind check, reduce motion, HUD size.
- Credits, haptics, and edge cases (tab hidden, resize mid-wave, rotate mid-shop).

**Exit:**
- Initial download ≤3.5 MB gzip, total ≤8 MB.
- 30 fps or more at the lowest tier under 6× CPU.
- Every language passes `qa:hud`.
- No console errors in a full playthrough.

## M12: Poki release

**Scope:**
- Thumbnails (`npm run thumbs`), store title and description, screenshots, `docs/release-checklist.md`.
- The final `qa`, `qa:poki`, `qa:build --real-sdk`, then `release/thunder-knight-1.0.0-poki.zip`.

**Exit:** the zip and store package are ready. The owner uploads, runs the Inspector, a playtest and Web Fit.

## M13+: Live operations

Per GDD §20:
- Last Stand records and a daily battle.
- Cosmetics.
- Region 5.
- The convoy battle.
- Seasonal events.

**Every update:**
- version bump and changelog
- a save fixture
- the full QA set
- a fresh zip

## Risks

| Risk | Where it's tackled |
|---|---|
| Over-the-shoulder crowd readability, cramped portrait | M1 high-ground test and portrait rig, before content |
| Crowd performance on phones | M2 perf budget with exit numbers; tiers in M11 |
| A character pack with no usable shared rig or animations | M2 bake test with one pack first; M7 look test with three |
| Download size | `check-size.mjs` in every build from M0; deferred regions in M11 |
| Onboarding not clear | M4 autopilot plus the owner's cold playtest; funnel measures after launch |
| Scope | The Region 1 checkpoint before M9 |
