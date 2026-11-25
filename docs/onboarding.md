# Thunder Knight: onboarding

Onboarding is a first-class feature. It is built in M4 and checked at every milestone after. This plan follows Poki's
easy-access guide, Celia Hodent's onboarding principles, Roblox's just-in-time hints, and the owner's notes on earlier
games. Sources are in [research/poki-and-ux-guidelines.md](research/poki-and-ux-guidelines.md) §C.

## 1. Principles

| Principle | What it means here |
|---|---|
| Play within seconds | No title screen, no menu, no intro film. The first frame after loading is the battlefield, and the first input is gameplay |
| Teach by doing | Every step ends when the player *does* the thing. Never with an OK button |
| One thing at a time | One new control or enemy per moment. At most 3 new things in all of Battle 1's first minute (move, aim, shoot) |
| Just in time, in place | A control is taught when the game first needs it, where it works. Grenades arrive with the first dense block, not before |
| Show, don't tell | A key picture or a hand gesture, plus at most **4 words**. Rosie's bubbles add flavour, never instructions you must read |
| Device-specific | Key caps and a mouse on desktop, hands on touch. Switching device swaps the hints live |
| Safe to fail | Battle 1 can't be lost: the banner stays at 30% or above and the hero stays at 1 HP or above. Later, losing keeps your gold |
| Help only when stuck | After 6 s with no progress the prompt animates. After 12 s Rosie rephrases. After 20 s the world helps (a footprint trail, an enemy walking into view) |
| Never repeat | Each lesson is saved as seen (per device class for controls) and never shown again |
| Teach the why | Counter tips say *why*: "Shield Wall: go around!", "Captain: they'll run!" |
| Show the locks | Locked shop items and tabs show where they open ("Battle 6"), so the road ahead is visible |

## 2. Prompt language

- **Desktop:**
  - Key caps: WASD with the needed keys lit, G, E, Enter.
  - A mouse picture: arrows for aim, left button lit for shoot or click.
  - Never "press Space" as text: Poki found players skip key names in text.
- **Touch:**
  - An animated hand: drag on the left (move), drag on the right (aim), tap on a button (with a ring on the button).
- **Text:** at most 4 words, in the player's language, outlined, 16 px × `--s` or larger.
- **Placement** (the owner's HUD rule, nothing mid-screen):
  - Desktop: bottom centre, above the health bar.
  - Touch landscape: under the top-centre bars.
  - Portrait: just above the button stack.
  - Button prompts sit beside the button they point at: beside the card or panel it's on, level with it, never on it.
  - When the button already says the words (Next wave, Continue, Fight!), desktop shows only the key pictures beside
    it and touch only the tapping hand. With no free spot (a small phone's full shop), the hand alone.
  - Prompts step aside while the army reveal's nameplate shows.
- **Life:**
  - A prompt fades in over 0.2 s and stays until the step completes.
  - It then plays a small tick, fades out over 0.3 s, and the next prompt waits at least 0.8 s.
- **Markers in the world:**
  - A soft gold ground ring for "go here".
  - A diamond over a target.
  - A dotted ground arrow toward an off-screen goal.

## 3. Progressive HUD

The HUD starts almost empty and gains parts as they become relevant. A revealed part stays revealed.

| HUD part | Appears |
|---|---|
| Crosshair | When the AIM step starts |
| Gold counter | First coin collected |
| Banner bar plus the "Protect the banner" objective | MOB step |
| Wave counter and enemies-left bar | Wave 1 proper (after the scout) |
| Health bar | First time the hero is hit (or wave 2) |
| Ammo ring | First reload |
| Pause button | Always, from the first frame (Poki requires pause; it is small, at the top-left) |
| Grenade button | Battle 2 |
| Second gun icon | Battle 6 (second slot) |
| Support button | Battle 8 |

## 4. Battle 1, "The Mill": the step-by-step script

**Setting:**
- A sunny meadow and a little mill on a hillock. Queen Ada's banner flutters on it, with 6 blue militia around.
- Rosie's teal truck sits 18 m behind, still smoking, with rift sparks fading.
- The hero stands beside the truck, facing the mill, in the normal over-the-shoulder view.

**Pacing:** scripted spawns **wait for the player**. Nothing arrives before the previous step is done, except the
gentle "world helps" nudges.

| # | Step id | World | Desktop prompt | Touch prompt | Completes when | If stuck |
|---|---|---|---|---|---|---|
| 1 | `move` | A gold ring glows at the banner (12 m ahead). Rosie: *"Peasants! Guard the banner!"* | Mouse click picture + WASD caps, "Move". The first click focuses the game and locks the pointer (it doesn't fire) | Hand dragging on the left, "Move" | Hero reaches the ring | 6 s: caps or hand pulse. 12 s: Rosie *"Up to the mill!"* 20 s: footprints glow to the ring |
| 2 | `aim` | A lone peasant scout walks out of the hedge 15 m away, about 35° to the side. A diamond marks him. Crosshair revealed | Mouse picture with arrows, "Aim" | Hand dragging on the right, "Aim" | Crosshair on the scout for 0.2 s (touch: first hit). A computer player who fires first passes Shoot at once | 6 s: pulse. 12 s: the scout walks toward the centre of view |
| 3 | `shoot` (desktop only; on touch the auto-fire does it) | — | Mouse picture, left button lit, "Shoot" | (auto-fire pip lights in the crosshair) | First hit on the scout | 6 s: pulse |
| 4 | `gold` | The scout tumbles. Coins pop, fly into the hero, the gold counter appears and pulses. Rosie: *"Ooh, real gold!"* | — | — | Coins collected (automatic) | — |
| 5 | `mob` | "Protect the banner" objective plus the banner bar. 8 peasants come over the hill in a loose mob, slowly | — | — | All 8 knocked out (wave 1 cleared) | 8 s with no shot fired: the aim prompt returns |
| 6 | `truck` | "Wave cleared! +30". Coins left on the ground fly in. Rosie waves: *"Bring that gold here!"* A ground arrow plus truck marker | "Go to the truck" | same | Hero enters the truck ring; the shop opens | 10 s: footprints to the truck. 20 s: Rosie *"Over here!"* |
| 7 | `buy` | Shop panel with only the **Guns** tab and only **Pistol ★2 (100)**, with the Recommended ribbon. The hero has about 110 gold | Pointer pulse on Buy, "Buy" | Hand tapping Buy, "Buy" | Pistol ★2 bought: coin burst, crate drop, the gun gains a sight | 8 s: pulse |
| 8 | `nextwave` | ⚔ Next wave button appears and pulses gently | Pointer on the button plus Enter cap, "Next wave" | Hand tapping the button, "Next wave" | Pressed | 10 s: pulse. 20 s: Rosie *"Ready when you are!"* |
| 9 | (wave 2) | First **army reveal** (short): 14 peasants in two mobs. Militia meet them. The health bar appears on the first hit | — | — | Wave 2 cleared | — |
| 10 | (break) | The shop is optional now. Recommended: Militia… (locked until B2, so the pistol ★3 is shown greyed with "70 more" to show the next goal). Next wave pulses | — | — | Next wave pressed | — |
| 11 | `captain` | The army reveal frames a **captain** with a tall red banner leading 16 peasants. Nameplate: *"Captain: they'll run!"* A diamond over him in play | "Down the captain!" (text only; they already know how to shoot) | same | Captain knocked out → **ROUT!**: horn, cheer, coin shower, peasants flee. Rosie: *"Ha! Look at them run!"* | 10 s with the captain on screen and not hit: the diamond pulses; aim assist already prefers him |
| 12 | (victory) | Fanfare, blues cheer. Victory card: 3 crowns, gold count-up. **Continue** | Pointer on Continue | Hand on Continue | Continue | — |
| 13 | `map` | First map view: the truck token rolls to Battle 2. Battle card open | Pointer on **Fight!** | Hand on **Fight!** | Fight pressed | — |

- **Expected length:** about 3 minutes.
- **Safety:** no rewarded offers and no interstitials anywhere in Battle 1.

## 5. After Battle 1: one new thing per battle

| Battle | Lesson | How it's taught | Completes when |
|---|---|---|---|
| 2 | `grenade` | At wave 1 Rosie lobs a bag: *"Catch! Grenades!"* and the grenade button appears. When the first footman block (6 or more close together) is within 25 m: desktop **G cap**, "Grenade"; touch hand taps the button, "Grenade". The landing ring shows where it goes | First grenade thrown |
| 2 | `army` | At the first break the Army tab appears with a dot. Rosie: *"Hire some help?"* Militia L1 gets the Recommended ribbon | Army tab opened (buying is optional) |
| 2 | (footman) | Army reveal nameplate: *"Footmen: grenade the blocks!"* | — |
| 3 | `archer` | Nameplate: *"Archers: go get them!"* Red landing marks under the first volley teach dodging by themselves | — |
| 3 | `hero` | Hero tab appears with a dot | Opened |
| 4 | `shield` | Nameplate: *"Shield Wall: go around!"* The first bullets that hit a shield make a "clonk" and show a tiny shield icon at the crosshair | — |
| 4 | `crate` | The rift crate falls beside the truck. Rosie: *"Something fell through!"* A violet arrow points to it. Walking up opens the offer card, No thanks first | Seen (when it drops) |
| 5 | `boss` | Boss name card ("Sir Grudge: hit his sides!", every time). On the first glowing wind-up (its lane glows red on the ground): WASD caps or the stick hand, "Step aside!" | The charge ends (avoided or hit) |
| 6 | `swap` | **Built (M9):** the second hand fills itself with the best other owned gun; in the first wave Rosie says "Two guns now. Swap them!" and the prompt "Swap guns" shows the X key cap on desktop (the wheel and 1/2 work too) or a hand tapping the gun button on touch. *Planned, not built:* a loaner SMG for a player who owns only one gun (by Battle 6 the balance has everyone owning the shotgun) | First swap |
| 6 | (rider) | Nameplate: *"Riders: shotgun stops them!"* | — |
| 7 | (firebrand) | Nameplate: *"Firebrand: shoot him early!"* Their scream is the sound cue | — |
| 8 | `support` | **Built (M9):** Rosie: *"Try this, on the house!"* One free Rift Strike charge (one a wave, that battle), and the support button appears. When a big block is within 30 m: desktop **E cap**, "Rift Strike"; touch hand taps the button. Afterwards it is in the shop | First call-in |
| 9 | `armour` | **Built (M9):** the first light-gun hit on armour shows sparks, grey numbers and a "clink". Rosie: *"Armour! Bigger gun!"* (once) | — |
| 11–14 | brute, ram, catapult | Nameplates: *"Brute: dodge the charge!"*, *"Ram: down its crew!"* (built, M9 part 4; the crew are the answer bullets can reach), *"Catapult: watch the shadows!"* (built, M9 part 5) | — |
| 13 | sentry | From wave 2 Rosie lends her Sentry Gun for the battle ("Borrow my Sentry Gun!") unless it's already the player's; the prompt shows E (or the support button) until one is called (built, M9 part 5) | One call |
| 15 | siege tower | The boss name card's nameplate *"Siege Tower: shoot the beams!"*; when its last pusher falls, *"Tower stuck! Hit the beams!"* (built, M9 part 6) | — |
| 18 | elite captains | Nameplate *"Elite captain: big rout!"* the first time one leads a block (built, M9 part 8) | — |
| 20 | iron ox | The boss card's nameplate *"Iron Ox: dodge the fire!"*; its cone glows on the ground before each breath; *"Elite captains join!"* at 60%, *"The core! Rockets!"* at 30% (built, M9 part 9) | — |

## 6. Returning players and device changes

- **Seen lessons:** stored in the save as `seenLessons`. Controls are keyed per device class (`move:touch`,
  `move:desktop`), so a player who learned on a laptop and later plays on a phone gets the touch Move and Aim hints
  once.
- **Returning players** land on the map (vision §4), never in a replay of Battle 1.
- **Replays:** replaying Battle 1 later shows no lessons, and normal fail rules apply.

## 7. Measuring

- **Each step:** `measure('tutorial', <step id>, 'start' | 'complete')`.
- **Target funnel:**

  | Step | Players completing |
  |---|---|
  | `move` | 95% |
  | `aim` | 90% |
  | `truck` | 80% |
  | `buy` | 78% |
  | `nextwave` | 75% |
  | `captain` | 65% |
  | Battle 1 complete | 60% |

  Any step losing more than 5% points to a step to redesign.
- **QA:** `npm run qa` drives Battle 1 with real input on desktop and touch, checks the step order, the measure events
  and that no ad was requested.

## 8. What not to do

- No text walls, no "tutorial" label, no slides, no skip button (nothing to skip).
- No prompts in the middle of the screen, and no prompts covering the target they talk about.
- No timers during teaching. No failure in Battle 1.
- No two new controls in the same moment.
- Don't teach reload, health regeneration or the magnet. They are visible and need no action.
- No rewarded offers or interstitials before Battle 2.
