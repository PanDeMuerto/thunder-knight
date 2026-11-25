# Thunder Knight: vision

Working title (see §8). Project folder: `C:\PROJECTS\WEB\Knight Makers`. Started 2026-11-04.

## 1. One line

You and your modern guns tip a medieval war. Hold the Queen's banner against the Iron Baron's army, knock out
his captains so their soldiers run, scoop up the gold, and spend it at your friend's truck on bigger guns and more
soldiers.

## 2. Why this game

- **A fantasy anyone gets from one screenshot.** One person with an assault rifle against a field of knights. Kingmakers
  proved the hook: about 1.25M wishlists, #15 most-wishlisted on Steam in May 2025. But it is unreleased, PC-only,
  realistic and complex (an RTS layer, settlements, 8+ resources). See [research/kingmakers-teardown.md](research/kingmakers-teardown.md).
- **An open spot on Poki.** Army and defense games with upgrades are among Poki's most-voted (War of Sticks 955k votes,
  Stick Defenders 673k). The top 3D shooter, Funny Shooter 2, is desktop-only. Nothing in those lists is a 3D
  "one hero vs an army, with a trader" game that runs on phones. See [research/reference-games.md](research/reference-games.md).
- **A proven loop.** Killing Floor's kill → cash → trader rhythm, Dynasty Warriors' "kill the officer, break the force",
  Kingdom Rush's one-new-enemy-at-a-time pacing, and Survivor.io's one-thumb auto-fire.

**For whom:** casual web players aged 10 and up, on a Windows laptop (47% of Poki traffic) or an Android or iOS phone
held either way. They have 3 minutes or 30, never read a tutorial, and leave if nothing happens in 10 seconds.

## 3. Pillars

1. **One against an army.** You are the most powerful thing on the field, and you can see it:
   - bullets go through ranks
   - captains fall and whole squads run
   - coins burst out of the crowd
   - blue soldiers cheer you on
   A screenshot always shows a field full of soldiers.
2. **Readable at a glance.**
   - Red against blue, and one thing to protect (the banner).
   - Every enemy role has its own shape and sound.
   - Calm, clean low-poly visuals with no grain or clutter.
   - If a 10-year-old can't tell what is dangerous in one second, we redesign it.
3. **Kill, collect, upgrade, feel it.** The loop is short and generous:
   - gold flies to you
   - the shop is a short walk away
   - every purchase changes the next wave in a way you can see and hear
   - nothing you buy is ever lost
4. **Play in seconds, anywhere.**
   - No title screen, no text walls.
   - The same game on mouse and touch, landscape and portrait.
   - Controls are taught one at a time, at the moment you need them.

## 4. The player's journey

- **First 10 seconds:**
  - The game opens on a field beside a smoking truck that has just fallen through a storm.
  - A banner flutters over a little mill, with a handful of blue militia around it.
  - Peasants with pitchforks come over the hill.
  - A gesture or key picture says *Move*. You walk to the banner.
- **First 3 minutes (Battle 1, "The Mill"):**
  - Aim, shoot, and watch coins fly into your pocket.
  - Clear the mob, walk to Rosie's truck, and buy your first upgrade.
  - Start the next wave yourself.
  - In wave 3, knock out a captain with a tall banner, and his men drop their pitchforks and run.
  - Victory, three crowns, the map.
- **First session (about 20–25 minutes, Region 1):**
  - Grenades, footmen, archers and shield walls, introduced one per battle.
  - Your first new gun (the shotgun) and your first hired soldiers.
  - The first boss, Sir Grudge the Black Champion.
- **First week:**
  - Four regions and 20 battles: riders, fire-pot runners, siege rams, the War Wagon, the Siege Tower.
  - Nine guns from pistol to rocket launcher.
  - The final battle at the Iron Baron's castle.
  - Then Last Stand (endless) and live updates.

## 5. Tone and look

- **Tone:** Saturday-morning adventure comedy.
  - The locals call you "the Thunder Knight" because of the noise your guns make.
  - Rosie, the mechanic who fell through with you, runs the shop out of the back of the truck and quips in
    one-line bubbles.
  - The Iron Baron is pompous; his peasants clearly don't want to be there.
- **Violence is bloodless:**
  - Soldiers tumble, bounce and flop over with little dust puffs and stars, then fade out.
  - Shields crack, helmets ping off, coins burst.
  - No blood, no wounds, no gore (Poki is all-ages).
- **Look:**
  - Low-poly toy-soldier style: chunky silhouettes and flat colours from a gradient atlas.
  - Soft sunlight, gentle distance fog, saturated meadows and stone.
  - Built from CC0 packs (Quaternius, KayKit, Kenney) and restyled to one palette.
- **Team colours:**
  - Blue and gold for Larkmoor; red and black for the Baron.
  - Never colour alone: enemies also have pointed helmets and tabards, and captains have tall banners.
- **Calm by default:** no screen grain or wobble, small sparse effects, gentle camera shake (and an option to turn it
  off).

## 6. Decisions

### The owner's decisions (2026-11-04)

| Decision | Choice | Why |
|---|---|---|
| Camera | **Over-the-shoulder third person**, chosen over the recommended high chase camera | The owner's call. Closest to the Kingmakers fantasy. GDD §5 lists how we keep crowds readable and portrait comfortable |
| Economy | **A campaign of battles; gold, guns and upgrades kept forever, even after a lost battle** | The owner's call. Simplest, and best for retention on Poki |
| Allies and objective | **An allied army you hire in the shop fights on its own; enemies push toward your banner** | The owner's call. The one-man-army battle fantasy, with no orders to give |
| Art | **Low-poly from CC0 packs (Quaternius, KayKit, Kenney), restyled.** Downloads into `C:\PROJECTS\ASSETS` approved | The owner's call. Readable crowds, calm, cheap to render |
| Project folder | `C:\PROJECTS\WEB\Knight Makers` | The owner's call |
| Soldier base (2026-11-05, M7 look test) | **KayKit Adventurers humans**, restyled (over KayKit Skeletons and Quaternius' medieval humans) | The owner's call. Big heads, helmets and shields read best in a crowd at distance; same artist as the field kit; lightest to draw |

Don't change these without asking the owner.

### Decisions taken by default (open to change)

| Decision | Choice | Why |
|---|---|---|
| Working title | **Thunder Knight** | Says "medieval + guns" and is free of clashes (checked 2026-11-04). "Knight Makers" stays the folder name only: it is too close to Kingmakers for a store title, and Poki rejects anything that looks like a clone |
| Tech | TypeScript, Three.js (WebGL2), Vite, reusing the Primal Valley skeleton. Dev server on port 5180 | Proven on five of our Poki games. See [research/reuse-from-our-games.md](research/reuse-from-our-games.md) |
| Shop | Rosie's truck: walk up to it between waves and the shop opens. No timer; you start the next wave yourself | Walk-up interactions over menus, no time pressure for casual players (the owner's taste on earlier games) |
| Hand | One gun at first. Grenades come in Battle 2, a second gun slot in Battle 6, a support call-in in Battle 8 | Start small, then expand. Each control is taught when it is needed |
| Fail state | Only the banner can be lost. A knocked-out hero gets back up at the banner after 5 s | One thing to watch. No death screen in the first battle |
| Aiming | Touch fires automatically while the crosshair is on an enemy, with aim assist. Mouse aims and you hold to fire, with auto-fire in settings | Research: CoD Mobile Simple mode, Scrap Express's aim assist |
| Ads | Rewarded: Rally (revive the banner), ×2 battle gold, the rift crate (borrow a top gun for one wave). Interstitials only at natural breaks | Poki's rules and guidance. See GDD §16 |
| Languages | English first; 11 languages at polish | Same set as our other games |

## 7. What it is not, and what makes it ours

- **Not a Kingmakers re-skin:**
  - No RTS view, settlements, resource web, armour matrix, historical setting, gore, or prisoner torture.
  - Our own world (Larkmoor), heroes (the stranger and Rosie), villain (the Iron Baron), look and name.
- **Not a survivor-like:** no XP level-up cards, no random shops. One fixed shop, one currency.
- **Not a tower defense:** you are always in the fight, in third person, with the gun.
- **Ours:**
  - The truck you walk up to.
  - Rosie's one-liners.
  - Routing captains as the big satisfying moment.
  - The army-reveal shot at each wave start.
  - Bullets that go through ranks.
  - The rift crate that lends you a gun you can't afford yet.

## 8. Business, success and risks

- **Business:** Poki's revenue share from ads. Rewarded plus interstitials, at least 1 ad per daily user.
- **Targets on Poki:**
  - C2P 70% or more (initial download 3 MB gzip, hard cap 5 MB).
  - Average playtime 8 minutes or more.
  - 60% or more of new players finish Battle 1.
  - 30% or more reach the first boss.
- **Risks and answers:**

  | Risk | Answer |
  |---|---|
  | An over-the-shoulder camera in portrait, and crowds hiding crowds | High ground at the banner, tall captain banners, the army-reveal shot, a pulled-back portrait rig, piercing bullets. Proven in the M1 camera test before content |
  | Hundreds of animated soldiers on low-end phones | Vertex-animation-texture instancing (Kingmakers does the same in UE4), quality tiers, cheap distant "backdrop armies". `npm run perf` budgets from M2 |
  | Download size with animated models | One shared rig, baked animation textures, Draco/meshopt, WebP/KTX2, deferred loading |
  | Looking like a clone | Original name, world, characters and look. The originality clause in CLAUDE.md |
  | Guns on an all-ages portal | Cartoon tone, bloodless knock-outs. Poki hosts many shooters |
  | Scope | Region 1 vertical slice and an owner checkpoint before the other regions |

- **Open questions for the owner:**
  - Final store title.
  - Music (by ear at M8).
  - One hero, or a choice of hero looks.
  - Whether Rosie's truck becomes drivable in a later update.
