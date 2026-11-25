# Thunder Knight: game design document

This is the source of truth for how the game behaves. The numbers here are **starting values**. The live numbers sit
in `src/content/*.ts`, and `npm run balance` checks them against the pacing targets in §11. When behaviour changes,
change this document in the same task and add a line to `CHANGELOG.md`.

Related documents:
- [vision.md](vision.md): why, pillars, the owner's decisions
- [onboarding.md](onboarding.md): the teaching plan, step by step
- [tech-design.md](tech-design.md): how it is built
- [milestones.md](milestones.md): plan and status
- [research/](research/)

## Contents

1. Overview
2. World and characters
3. Core loops
4. The battle
5. Camera
6. Controls
7. The hero
8. Weapons, grenades and support
9. Enemies
10. Allies
11. Economy and pacing
12. The shop (Rosie's truck)
13. Campaign
14. Onboarding (summary)
15. UI and UX
16. Ads and monetisation
17. Audio
18. Art direction and assets
19. Performance and technical targets
20. Live operations
21. Metrics
22. Glossary

---

## 1. Overview

| | |
|---|---|
| Genre | Third-person wave shooter with a light army layer. One hero with modern guns against a medieval army |
| Platform | Poki (web). Desktop (mouse and keyboard) and touch (phones and tablets), landscape and portrait |
| Session | A battle lasts 3–8 minutes. A first session runs about 20–25 minutes (Region 1) |
| Content at launch | 4 regions × 5 battles = 20 battles, 9 guns, 2 support call-ins, 4 ally types, 11 enemy types, 4 bosses, Last Stand |
| Core loop | Fight a wave → knock out soldiers, collect gold → walk to the truck, buy → start the next wave → win the battle → next battle on the map |
| Fail state | Only the banner can fall. Gold earned is always kept |

## 2. World and characters

- **Larkmoor:** a small, sunny, storybook kingdom of meadows, rivers, pine hills and one grim castle. The Iron
  Baron wants Queen Ada's crown and marches his red army across the land, one village at a time.
- **The stranger, called the Thunder Knight:**
  - The player. A modern-day stranger in an orange hoodie with the hood up (M7: KayKit's hooded rogue). The archers
    share the hooded body, so the hero is told apart by colour (orange, a colour no soldier wears), size (1.8 m to
    their 1.6 m), the gun, and his place on screen. A cap or other kitbash can come later if the owner wants a
    silhouette of his own.
  - Arrived when a storm rift dropped their truck into a Larkmoor field.
  - Has no lines; the locals talk about them.
- **Rosie:**
  - A mechanic who fell through with the truck. Upbeat, sarcastic, practical.
  - Runs the shop from the truck's back doors. She trades medieval gold for parts through the flickering rift, so
    purchases arrive as crates that drop out of a spark in the sky.
  - The onboarding voice, in one-line bubbles that never block the game.
- **Queen Ada:** young, determined. She appears on the map screen and at region ends (one line each). Built M10 for
  the ending (§13.5): KayKit's rogue in her cape (the mage read as a young man), her greens turned Larkmoor's royal
  blue, auburn hair, a gold crown made in code (`content/adaLook.ts`, `world/adaFigure.ts`). On the map (M11), the
  battle card carries her face and one line under its facts: a line for the battle's region ("Guard the meadows,
  stranger!", "His riders are crossing the river!", "His siege engines climb the pass!", "Now we march on his
  keep!"); on the first battle of the next region once a region is won, a line for the region just freed ("The
  meadows are free! On to the river!" and so on); once Battle 20 is won, her thanks on every card (`adaLine` in
  `ui/mapScreen.ts`).
- **The Iron Baron:**
  - Pompous and armoured head to toe. Appears in boss intros and on the map.
  - His captains are bullies with plumed helmets and tall banners.
  - His peasants mostly want to go home, which is why they run when their captain falls.

**Tone rules:**
- **Bloodless.** Knocked-out soldiers tumble, flop and fade with a dust puff. Shields crack, helmets ping off, coins
  burst. No blood, wounds or body parts.
- **Funny, not mean.** Routing soldiers yelp and run. Nobody is executed, captured or tortured.
- **Rosie's lines:** one line, at most about 8 words, never a wall of text. They are always skippable, and none of
  them is required reading.

## 3. Core loops

```
 moment (seconds)    move → aim → shoot → soldiers fall, coins fly to you → reload → grenade the clump
 wave (40–120 s)     army reveal → enemy squads march on the banner → you and your blues hold them → wave cleared
 break (player-paced) gold bonus → walk to the truck → buy → (optional rift crate) → "Next wave"
 battle (3–8 min)    3–8 waves (+ boss) → victory: crowns + gold → map
 campaign (hours)    20 battles over 4 regions; new guns, enemies and allies, one at a time → final boss → Last Stand
```

**Why it works for casual players:**
- Every second pays: coins fly toward you during the wave.
- Every break offers something you can afford.
- Nothing is lost on a defeat.
- Each battle adds one new thing to learn.

## 4. The battle

### 4.1 The battlefield

- **Size:** a compact playable field of about 120 × 120 m, bounded by natural edges (hedges, river banks, cliffs,
  palisades). Beyond it is a wide vista with distant hills, castles and **backdrop armies**: cheap animated crowds that
  sell the scale without being simulated.
- **The banner:**
  - Queen Ada's blue-and-gold banner on a pole, usually on **raised ground** (a hillock, a cart barricade, a mill
    terrace). Standing near it, the over-the-shoulder camera looks *down* on the approaching ranks. M1's test showed
    the ground needs to rise about **3 m** over a 15 m radius for that; 1.6 m wasn't enough.
  - Around it, a **capture ring** (radius 6 m, drawn as a soft blue ground circle).
- **Rosie's truck:** 10–20 m behind the banner, safe from enemies (they never path behind the banner line). Its walk-up
  ring (radius 3 m) opens the shop.
- **Spawn edges:** 1–3 per battlefield, marked on the minimal HUD only by the off-screen arrows of arriving squads.
- **Lanes:** enemies march along a coarse flow field toward the banner. Layouts use bridges, fords and gaps to make
  2–3 readable lanes.
- **Data:** each battlefield is a data entry in `content/fields.ts`. Terrain is built from a heightmap recipe plus
  placed kit pieces, with the banner, truck, spawn and lane points.

### 4.2 Waves

- **Composition:** a wave is a list of **squads** with spawn times and edges (`content/battles.ts`). A squad is a
  formation of one unit type, optionally led by a **captain**.
- **Spawning:** soldiers enter at the edge in formation and march at the banner. They engage any blue soldier or the
  hero within 6 m of their path.
- **Alive cap:** the director keeps the number alive under the device tier's cap (§19). Late squads wait off-field
  until there is room.
- **Wave end:** when every soldier of the wave is defeated (knocked out or routed).
- **Final wave:** may contain a boss (§9.3).

### 4.3 Army reveal (wave start)

- **The shot:** for 2.0 s the camera lifts to a high, wide view from behind the banner while horns blow, showing the
  wave's army entering. Then it eases back to over the shoulder.
- **New enemy type:** the reveal frames it instead and shows a **nameplate**: name plus a counter tip of at most 5
  words, such as *"Shield Wall: go around!"* This takes 2.5 s.
- **Skipping:** any input skips. The setting "Wave intros: Full / Short / Off" (Short = new enemies only).
- **During the reveal:** enemies march (they spawn far away), and the hero is invulnerable and still.

### 4.4 Captains and the rout

- **Look:** captains wear a plumed helm and carry a **tall red banner (3.5 m)** on their back that shows above any
  crowd. A small diamond marker floats over a captain on screen.
- **Aim assist** prefers captains (§6.4).
- **Squad buff:** a living captain gives his squad +15% speed.
- **The rout:** when a captain is knocked out, every soldier of his squad within 15 m **routs**:
  - they drop their weapons with a yelp
  - each bursts its gold at once (a coin shower)
  - they run back to their spawn edge at 1.4× speed
  - routed soldiers count as defeated and cannot hurt anyone
- **On screen:** a short world-space stamp "ROUT!" appears where the captain fell (small, fades in 1 s), with a horn and
  a blue cheer.
- **Elite captains** (Region 4) have a 25 m rout radius and 2× HP. Built M9 (`eliteCaptain`, `elite: true` on a
  squad): gilded armour, a cape and a great sword, a little bigger than a captain (1.15×), 60 gold.

### 4.5 The banner and the capture ring

| Rule | Value |
|---|---|
| Banner HP | 100% (+20% per Banner level in the Army tab) |
| Drain per enemy inside the ring | 0.75%/s light (peasants, archers, shield walls), 1.5%/s heavy (footmen, captains), 2%/s a boss, 4%/s battering ram. Several enemies stack. (M3 halved the first guess of 1.5/3: a block of twelve emptied the banner in three seconds. M6: shield walls block rather than rush, and Sir Grudge at a ram's rate took the banner before a casual player could answer) |
| Heal between waves | +20% at each wave break, up to the maximum |
| Allies and the ring | Allies don't block the drain. Only knocking enemies out stops it |
| Battle 1 | The banner can't go below 30% (scripted safety) |

- **HUD:** the banner bar is at top centre. When the banner takes damage, the bar pulses and an off-screen arrow points
  to the banner. Rosie warns once per wave: *"They're at the banner!"*

### 4.6 The hero knocked out

- **When:** the hero's HP reaches 0.
- **What happens:**
  - The hero tumbles.
  - The screen gently desaturates (no red flash).
  - A small ring counts down **5 s** at the bottom.
  - Blue soldiers carry the hero back, and they get up **at the banner** with full HP and 2 s of invulnerability.
- **Never a fail, never an ad.**
- **Battle 1:** the hero can't drop below 1 HP.

### 4.7 Wave break

When a wave ends:
1. "Wave cleared!" toast with the **wave bonus** (gold counts up).
2. Every coin left on the ground flies to the hero.
3. The banner heals +20%.
4. `gameplayStop` is sent to Poki.
5. Rosie waves from the truck; a ground arrow and an off-screen arrow lead there.
6. **No timer.** The hero can walk around freely. Enemies don't spawn.
7. The **⚔ Next wave** button shows (bottom centre in landscape, above the thumb area in portrait).
   - On desktop, Enter or Space also starts the next wave.
   - Pressing it triggers the interstitial opportunity (§16), then the next army reveal.
8. Allies refill to their squad size at the next wave's start; reinforcements jog in from behind the truck.

### 4.8 Victory and defeat

- **Victory:** after the final wave a fanfare plays, the blues cheer, and confetti-style flags fly. Then the **victory
  card**:
  - crowns (1–3, §13.3)
  - gold earned: kills, wave bonuses, first-clear bonus (count-up)
  - **Continue** (primary) and **🎬 ×2 gold** (secondary, §16)
  - Continue → the map, where the truck token rolls to the next node.
- **Defeat:** the banner reaches 0%. A 1 s slow motion, the banner tips over, then the **defeat card**:
  - "The banner fell!"
  - "You keep +312 gold"
  - **Retry**, **Map** and **🎬 Rally** (once per battle: the banner goes back to 50%, the enemies at it are knocked
    out, the hero is up, and the current wave continues)
- **Comeback help:** after two defeats in a row on the same battle, the next attempt quietly gives allies +15% strength
  and HP. Rosie says *"I tuned up your blues."* The help ends after a win.

## 5. Camera

The owner chose **over-the-shoulder third person** (vision §6). These rules keep crowds readable and portrait
comfortable.

### 5.1 The rig

| Parameter | Landscape | Portrait |
|---|---|---|
| Shoulder offset (right) | 0.85 m | 0.45 m |
| Pivot height above ground | 2.1 m | 2.3 m |
| Distance behind the pivot | 5.2 m | 6.0 m |
| Default pitch | −14° (looking down) | −17° |
| Pitch range | −55° to +25° | −55° to +20° |
| Field of view | vertical 55° (horizontal about 85° at 16:9) | vertical 72°, horizontal floored at 55° |
| Crosshair | screen centre | 45% of the height from the top (view offset) |

- **Hero in portrait:** stands in the lower middle third, and the crosshair sits above the hero's head line.
- **Hero size (tuned in M1):** the hero fills about 30% of the screen height in landscape (head just under the
  crosshair, a little left of centre) and about 15% in portrait.
- **Collision:** the camera pulls in at once when blocked by terrain or props, and eases back out when clear. The hero
  fades to 40% opacity when the camera is closer than 1.8 m, and to 12% under 0.9 m (backed against a wall).
- **Smoothing:** position is critically damped (about 0.08 s). Rotation follows input 1:1 with no smoothing, because
  aim must feel direct.
- **Hit feedback:** small kick on firing (by gun), gentle shake on explosions. Both scale with the "Camera shake"
  setting (Off/Low/Full).
- **Army-reveal shot (§4.3):** height 18 m, 30 m behind the banner, pitch −28°. It eases in and out over 0.4 s.

### 5.2 Readability measures for an over-the-shoulder camera

1. **High ground.** Banners sit on raised ground, so the default view looks down onto incoming ranks.
2. **Tall captain banners** show above the crowd.
3. **The army-reveal shot** at every wave start gives the strategic overview Kingmakers gets from its top view.
4. **Bullets pierce ranks** (§8), so the front rank never makes shooting pointless.
5. **Soldier scale.** Units are about 1.6 m, slightly smaller than the hero (1.8 m), so the hero reads as the
   protagonist.
6. **Off-screen arrows** for the banner under attack and for arriving squads, at the screen edge.
7. **Gentle fog** beyond 60 m, and backdrop armies, so depth reads without clutter.

## 6. Controls

**One rule:** the same few verbs everywhere. The control set **expands**: each verb arrives when the game first needs
it (§14).

| Verb | Desktop | Touch | Taught |
|---|---|---|---|
| Move | WASD / arrows | Floating stick, left side | Battle 1, first seconds |
| Look and aim | Mouse (pointer lock) | Drag on the right side | Battle 1 |
| Fire | Hold left mouse (auto-fire optional) | **Automatic** while the crosshair is on an enemy | Battle 1 |
| Reload | Automatic; R for early reload | Automatic; tap the ammo ring for early reload | Not taught (seen) |
| Grenade | G (or Q) | Grenade button | Battle 2 |
| Swap gun | Mouse wheel / 1, 2 / X | Tap the gun icon | Battle 6 |
| Support call-in | E (or F) | Support button | Battle 8 |
| Next wave (in a break) | Enter / Space / click the button | Tap the button | Battle 1 |
| Pause | Esc / P (losing pointer lock pauses) | Pause button | Seen |

There is no jump, crouch, sprint or dodge. Movement speed comes from upgrades. Fewer verbs means faster onboarding.

### 6.1 Desktop

- **Pointer lock:**
  - The first click on the game canvas requests pointer lock. That click doesn't fire.
  - If the lock is refused or unanswered for 400 ms, **drag-look** takes over: hold the right button, or the left
    button, and drag.
  - Losing the lock (Esc) pauses the game and sends `gameplayStop`. Resume re-locks.
- **Mouse sensitivity:** a setting (0.5×–2×). Invert Y is a setting.
- **Fire:** hold the left button. The setting "Auto-fire (mouse)" is off by default on desktop and on by default on
  touch.
- **Menus:** keyboard-only works everywhere. Arrows/Tab move focus, Enter/Space activate, Esc goes back.
- **Page safety:** wheel, Space and arrows get `preventDefault`, and so does `contextmenu` on the canvas.

### 6.2 Touch, landscape

- **Move:**
  - A floating stick anywhere on the **left half**, below the top 30%. It appears under the thumb and fades on release.
  - Radius 58 × UI scale, dead zone 0.12, and it follows the thumb past 1.4× its radius.
- **Look:**
  - Drag anywhere on the **right half** (outside the buttons).
  - Sensitivity is scaled by the short edge (about 160° per short edge), with a setting.
- **Fire:** automatic while the crosshair is on an enemy (§6.4). A small "auto" pip in the crosshair shows it.
- **Buttons (right, above the resting thumb):**
  - Grenade, 72 px.
  - Support, 64 px.
  - Gun icon / ammo ring, 64 px (tap to swap or reload).
  - Each button is at least 64 CSS px with 12 px gaps.
- **Left-handed setting:** mirrors the layout.

### 6.3 Touch, portrait

- **Move:** the floating stick lives in the **lower-left 45% × lower 45%** area.
- **Look:** drag in the **lower-right** area outside the buttons, or anywhere in the upper 55% of the screen.
- **Buttons:** stacked on the right edge above the thumb rest: Grenade (bottom), Support, Gun.
- **Crosshair:** at 45% of the height (§5.1).

### 6.4 Aim assist and auto-fire

Adapted from Scrap Express `aimAssist.ts`.

| | Touch | Mouse |
|---|---|---|
| Target pick | Nearest to the crosshair inside the cone, with line of sight | Same |
| Cone | 7° | 3° |
| Friction (look slows over a target) | 0.55 | 0.8 (light) |
| Magnet (gentle pull toward the target) | 12° at 25°/s, dropped if it fights the input | none |
| Bullet bend toward the target inside the cone | yes | yes (smaller) |
| Auto-fire | on target for 0.10 s → fire | off unless the setting is on |
| Target priority | captain > ranged (archer, catapult crew) > nearest by distance | same |

- **Sticky target:** the chosen target is kept until it leaves the cone by 2°, so aim doesn't flicker.
- **Range:** each gun's effective range (§8). There's no auto-fire beyond it.

## 7. The hero

Hero tab prices (set in M3, checked by `npm run balance`): Health 150, 280, 450, 700, 1,000 · Boots (speed) 200, 380,
650, 1,000 · Grenade belt 250, 500, 900 · Gold magnet 120, 240, 420, 700.

| Stat | Start | Upgrades (Hero tab) |
|---|---|---|
| Health | 100 | +20 per level, 5 levels (to 200) |
| Regeneration | 15 HP/s after 3 s without damage | — |
| Move speed | 5.0 m/s | +0.4 per level, 4 levels (to 6.6) |
| Grenades | 0 until Battle 2, then 2 per wave | +1 per level, 3 levels (to 5) |
| Gold magnet | coins fly to you within 5 m | +1.5 m per level, 4 levels (to 11 m) |

- **Contact:** soldiers next to the hero swing at them (damage per enemy type, §9). After each hit the hero gets
  0.3 s of invulnerability so mobs don't shred instantly.
- **Hit feedback:** a directional damage arc around the crosshair, plus a sound from the side of the hit.
- **No melee.** Close range is the shotgun's job. A future idea is an automatic shove when surrounded.

## 8. Weapons, grenades and support

### 8.1 Guns

**Ownership:**
- You own guns forever. You carry **one** gun until Battle 6, then **two**.
- Ammo is unlimited (only the magazine and reload); there is no ammo to buy.
- A part-used magazine tops itself up after 2.5 s without firing, so casual players rarely reload mid-fight.

**Pierce** is how many soldiers one bullet can hit (pierce 1 stops at the first). Shields stop pierce from the
front.

**Light guns** (pistol, SMG) do 50% damage to **armoured** enemies: sparks, grey numbers, a "clink" sound.

| Gun | Unlock | Price | Damage | Rate /s | Magazine | Reload (s) | Pierce | Range (m) | Role and feel |
|---|---|---|---|---|---|---|---|---|---|
| Pistol | start | owned | 20 | 4 (hold repeats) | 12 | 1.0 | 1 | 40 | Light. Reliable starter |
| Shotgun | Battle 4 | 600 | 9 × 8 pellets | 1.2 | 6 | 1.6 | 1 | 14 | Knocks back (0.15 m a pellet: a full load shoves a soldier about a metre), knocks riders off horses. Its levels are priced from a value of 350 (★2 175, ★3 315), so Region 1's last breaks always offer one |
| SMG | Battle 6 | 1,200 | 12 | 12 | 40 | 1.4 | 1 | 25 | Light. Sprays mobs |
| Assault rifle | Battle 8 | 2,200 | 26 | 8 | 30 | 1.5 | 2 | 45 | The all-rounder |
| Hunting rifle | Battle 10 | 3,500 | 120 | 1.1 | 5 | 1.8 | 6 | 70 | Line them up; a satisfying multi-knockout |
| Machine gun | Battle 12 | 5,500 | 24 | 11 | 100 | 3.0 | 2 | 45 | Holds a lane |
| Grenade launcher | Battle 14 | 8,000 | 90 (4 m splash) | 1.5 | 6 | 2.2 | — | 40 (arc) | Clumps, shield walls |
| Minigun | Battle 16 | 12,000 | 18 | 25 after a 0.6 s spin-up (it spins down at half that pace) | 200 | 3.5 | 2 | 40 | −20% walk speed while firing; every other round sounds. Built M9: the second SMG's body with six spinning barrels and an ammo box added in code |
| Rocket launcher | Battle 18 | 16,000 | 300 (6 m splash) | 0.7 | 3 | 2.5 | — | 60 | ×2 against siege engines (hulls, wheels, beams) and bosses. Built M9: rockets fly straight at 55 m/s with a smoke trail and burst where the shot strikes, with a 40 ms hit-stop; the model is the long pump shotgun in a fat olive tube with a red warhead and a sight, added in code |

**Gun levels ★1–★5** (bought in the Guns tab):
- Each level: +20% damage, +15% magazine, −5% reload.
- The model changes visibly at ★3 (scope or drum) and ★5 (gold trim). Built M9 (`HERO_LOOK.stars`, `dressStars`):
  ★3 a red-dot sight on top (the shotgun and the hunting rifle: a drum under it); ★5 two gold bands round it and a gold
  plate down each side. Sized in metres as held and fitted to each gun's own shape where they sit; the shop's pictures
  stay the plain gun.
- Price of ★2/★3/★4/★5 = 0.5/0.9/1.5/2.5 × the gun's value. The pistol's value is 200, so 100/180/300/500.

**Feel**, each value in `WeaponFeel` (from Scrap Express):
- muzzle flash, kick and climb, shell ejection
- tracer every Nth round
- hit sparks on armour, dust puffs on soldiers
- a soft hit marker on the crosshair, and a heavier one on a knockout
- a short **hit-stop** (40 ms) on captain knockouts and rocket hits

### 8.2 Grenades

- **Given:** Rosie gives grenades at the start of Battle 2 (*"Catch!"*). The grenade button appears, and they refill at
  every wave break.
- **Throw:** desktop G or Q throws at the crosshair point (max 25 m). On touch, tap throws the same way. The landing
  point snaps to the **densest enemy group within 6 m** of the aim point. A landing ring shows during the 0.15 s
  throw.
- **Effect:** 1.2 s fuse, 150 damage in a 5 m radius. Knocks soldiers over and **breaks shields** (§9).

### 8.3 Support call-ins (one equipped)

| Support | Unlock | Price | Effect | Charges per wave |
|---|---|---|---|---|
| Rift Strike | Battle 8 | 2,500 | Rosie drops 6 shells over 2 s into a 10 m circle at the aim point (snaps to the densest group). A red ground circle warns first | 1 (+1 per level, 2 levels) |
| Sentry Gun | Battle 13 | 6,000 (levels 3,000, 4,500) | A turret drops beside the hero (to his right, a little ahead) for 25 s and fires 5 shots a second at the nearest enemy it can see within 32 m (24 damage, pierce 2; hulls skipped), then sinks away. At most 3 stand at once. Rosie lends hers for Battle 13 | 1 (+1 per level, 2 levels) |

## 9. Enemies

### 9.1 Roster

Every role has a **unique silhouette** and a **unique sound**, and comes in **one at a time** (Kingdom Rush). Enemy HP
assumes the pistol's 20 damage at ★1.

| Enemy | Role | How to read it | Behaviour | Counter | HP | Speed (m/s) | Hit | Gold | First seen |
|---|---|---|---|---|---|---|---|---|---|
| Peasant | Fodder | Brown tunic, pitchfork, no helmet, hunched | Loose mobs that shamble at the banner | Anything | 30 | 2.2 | 4 | 3 | B1 |
| Captain | Leader | Plumed helm, **tall red banner** on the back, gold trim | Walks inside his squad, +15% squad speed | Knock out first → rout | 150 | 2.0 | 10 | 25 | B1 (wave 3) |
| Footman | Standard | Red tabard, kettle helm, round shield, sword | Marches in blocks | Anything; grenades on blocks | 60 | 2.0 | 7 | 5 | B2 |
| Archer | Ranged | Hood, longbow, stays at the back | Stops 25–30 m out and volleys at blues and the hero. **Red landing marks show 1 s before arrows land** | Go to them; shotgun or grenade | 40 | 2.0 | 6 per arrow | 6 | B3 |
| Shield Wall | Blocker | Huge tower shield, walks in a line | **Blocks bullets from the front** (within 70° of head-on) until the shield breaks (150 HP; cracks at 66% and 33%: sparks and a clonk, and a small shield mark by the crosshair). A blocked bullet stops there (no pierce). Grenades and explosives break shields at once. Without it he's a plain soldier | Go around, or grenade; the militia's blows go round it | 70 (+150 shield) | 1.6 | 8 | 10 | B4 |
| Rider | Fast | Horse, lance, pennant; hoofbeats | Charges in lines along lanes, knocking blues and the hero down | Shotgun knocks them off; step aside | 90 | 7.0 charge | 15 | 12 | B6 |
| Firebrand | Exploder | Lit fire-pot over the head, **sizzle plus a constant "aaah!"** | Sprints at the hero or the banner and bursts (4 m), hurting everyone | Shoot early: the pot bursts on his own side | 25 | 4.5 | 40 burst | 6 | B7 |
| Man-at-Arms | Armoured | Full plate, halberd, slow, metallic clank | Tough line infantry. **Armoured**: light guns do 50% | Rifles, shotgun, explosives | 160 | 1.8 | 12 | 15 | B9 |
| Brute | Champion (mini-boss) | Twice the size, great axe (KayKit's barbarian has no hammer), bear hat and red cape, **health bar above him** | **Charges after a 1.5 s glowing wind-up** (every 6 s, its lane glows); knocks back. Armoured | Step aside from the charge; explosives | 1,000 (built M9: 1,500 at Region 3's then ×2.5 took 30 s of the hunting rifle) | 1.2, 1.5 closing in (charge 9; built M9: 2.4 had a 3 m giant jogging, and his walk clip can't keep up past 1.5) | 30 | 80 | B11 |
| Battering Ram | Siege | Covered ram, 6 crew walking beside it, a health bar; its log thuds into the banner | Rolls straight at the banner, slower as its crew fall. Drains it **4%/s** in the ring | Explosives on the ram (only they hurt it), or knock out the crew (with none left it's abandoned and counts as beaten) | 500 (built M9: 1,200 took 20 grenades at Region 3's then ×2.5) | 1.2 | — | 60 | B12 |
| Catapult | Siege | Rolled in by 3 crew, a throwing arm, creak plus whoosh, a health bar | Stops about 40 m from the banner and every 6 s lobs a boulder (2.4 s in the air) at the thickest group of blues, every other one at the banner (3% if it lands in the ring). **A shadow circle grows for 1.5 s before impact**, inside a faint ring at the blast's size | Rush its crew (with none left it's abandoned, beaten), or explosives on the engine (only they hurt it) | 800 | 1.1 to its spot | 40 (3 m) | 50 | B14 |

**Region scaling:**
- Enemy HP ×1 / ×1.6 / ×2.2 / ×3 for regions 1–4 (built M9: Region 3's first guess of ×2.5, a 56% step on Region 2 with no new gun until the end of Battle 12, made every Highland Pass battle a coin toss for the scripted player; ×2.2 matches its gold. Region 4's ×3.6 would be the same steep step; ×3 matches its gold).
- Gold ×1 / ×1.5 / ×2.2 / ×3, so upgrades keep pace.

**Knockout presentation:**
- The soldier tumbles back (a pre-baked fall, with direction from the hit), then a dust puff, then a 1 s fade.
- Gold coins pop out (count by value), bounce, and fly to the hero inside the magnet radius.
- Weapons drop and stay as small props for 3 s. Helmets may ping off on headshots.

### 9.2 Enemy behaviour

- **Formations:** squads march in formation (block, line or mob) along the flow field to the banner.
- **Engaging:** they break formation to fight blues or the hero within 6 m. Melee is pairwise, resolved by timers, not
  physics.
- **Targets:** enemies choose blues, the hero or the banner by nearest-reachable, with a bias toward the banner (they
  want the ring).
- **Spacing:** separation from a spatial hash keeps crowds from overlapping. There are no physics bodies on soldiers.

### 9.3 Bosses (the final wave of each region)

| Boss | Battle | Look | Phases and mechanics |
|---|---|---|---|
| **Sir Grudge, the Black Champion** | B5 | A giant black-armoured knight (twice the size) with a tower shield and morningstar | 2,400 HP, 300 gold, hits for 22. 1) Walks at the banner (1.1 m/s) behind a shield that never breaks; he never turns on the hero, only on the militia in his way, so his side can always be reached. 2) Below 50%: throws the shield down ("He threw down his shield!") and charges three times (a 1.5 s glowing wind-up with its lane glowing on the ground, then 9 m/s for 1.5 s: 30 to the hero, a heavy blow to each blue in the lane). Two captains with six footmen each join. **His fall routs his whole army** |
| **The War Wagon** | B10 | An armoured wagon pulled by oxen, crossbowmen on top | Wheels are weak points (4 × 300). It stops when 2 wheels break, then crossbows fire. Footmen spill out |
| **The Siege Tower** | B15 | A huge wooden tower (7.6 m, built in code) on four wheels, pushed by 10 men; three softly glowing beams on its front | 300 gold. Rolls at the banner at 0.9 m/s (slower as its pushers fall) and parks 5.5 m from it, draining it like a boss. Knock out the pushers so it stalls where it stands ("Tower stuck! Hit the beams!"; eight walk at its sides, two behind it). From 10 s, every 16 s its doors open on alternate sides and six footmen march out, moving or stalled. Bullets can't hurt the tower; its three beams (350 each, ×2.2 here) are its health on the boss bar: break all three and it topples forward and the army runs |
| **The Iron Baron in the Iron Ox** | B20 | A bull-shaped iron siege engine with the Baron in a tiny turret (built in code: pale horns, glowing red eyes, a gold nose ring, riveted iron, lighter armour plates) | 5,000 HP (×3 here), 500 gold; rolls at 0.7 m/s and parks 10 m from the banner. 1) Every 7 s its horns glow and a cone (13 m, ±29°) lights the ground for 1.6 s, aimed at the hero within 18 m, else the banner; then fire: 30 to the hero, 60 to each blue in it, 4% of the banner if it's in it. Its armour halves everything but explosions. 2) At 60%: two elite captains' blocks of six join, the second 6 s behind ("Elite captains join!"; built M9 with two of ten arriving together, which overran the banner while the hero fought the Ox). 3) At 30%: its plates fall away and its core glows ("The core! Rockets!"): explosions do ×1.5 (rockets ×2 on bosses on top). Its fall routs the army, and the Baron flees on a donkey (§13.5) |

- **Boss intro:** a 3 s name card in the army reveal. The boss bar replaces the enemies bar at top centre.
- **Boss waves** come after the battle's last shop, with a warning: *"Last shop before the boss!"*
- **A boss is the wave's objective:** knocking him out routs everyone still on the field (as a captain routs his squad)
  and calls off anyone who hadn't come yet.
- **Bosses don't stagger** from hits and don't budge from the shotgun's knockback. The boss name card shows every time
  (others only the first time they're met).

## 10. Allies

- **No orders.** Hired soldiers fight on their own (vision §6).
- **Spawning:** at each wave start, blues refill to their squad size and jog from behind the truck to **formation slots
  in front of the banner**: a crescent 8–14 m out, facing the main spawn edge.
- **Fighting:** they engage enemies within 8 m of their slot, then return.
- **Battle 1:** starts with 6 militia already at the mill.

| Ally | Available | Squad size by level (L0→L5) | Hire/upgrade price (L1→L5) | Role |
|---|---|---|---|---|
| Militia | B1 (6 present; Army tab from B2) | 6 → 8, 10, 12, 14, 16 | 150, 250, 400, 650, 1,000 (gentler than the first guess, so Battle 2's breaks always offer something) | Spear line, holds the ring |
| Archers | after B5 | 0 → 4, 6, 8, 10, 12 | 600, 1,000, 1,600, 2,400, 3,500 | Volleys from behind the banner at enemies within 30 m |
| Men-at-Arms | B9 | 0 → 3, 4, 5, 6, 8 | 1,500, 2,500, 3,800, 5,500, 8,000 | Armoured line, slows a lane |
| Knights | B13 | 0 → 2, 3, 4, 5, 6 | 3,000, 4,500, 6,500, 9,000, 12,000 | Wait in a line 5 m in front of the banner; charge the Baron's nearest man within 24 m (a 21 m run, every 7 s, bowling over whoever's in the way), then fight on horseback (built M9: a charge from 35 m stopped short) |
| Banner | B3 | Banner HP +20% per level (3 levels) | 400, 900, 1,800 | Survives longer |

- **Level bonus:** each ally level also gives +10% HP and damage to that type.
- **Look:** blue tabards, round helms, and a small blue pennant over each squad leader.
- **Cheering:** blues cheer on routs and on wave clears, and point at the hero.

## 11. Economy and pacing

**One currency: gold.** It is never lost: defeats keep everything earned.

### 11.1 Sources

| Source | Value |
|---|---|
| Knockouts | per enemy (§9.1) × region multiplier. **Every** enemy knockout or rout drops its coins, whoever knocked it out: hiring allies pays back |
| Wave bonus | 20 + 10 × wave number × region multiplier |
| First-clear bonus | 100 + 50 × battle number (once per battle) |
| Replays | kill gold and wave bonuses as normal, no first-clear bonus |
| Starting gold | 50 |
| Rewarded ×2 | doubles the battle's kill gold and wave bonuses (not the first-clear bonus) |

### 11.2 Pacing targets (checked by `npm run balance`)

| Moment | Target |
|---|---|
| First wave break of Battle 1 | Can afford pistol ★2 (100). Simulated gold about 110–130 |
| End of Battle 1 | About 400 earned |
| Every battle, no replays | At least one meaningful upgrade affordable at each break. Right after a purchase the purse may be light (M6: in Region 1's last battles a wave pays about 150–250 and the next upgrades cost 270–450), so the check is: a break after one where the player bought nothing always offers something |
| A new gun | Affordable within 1–2 battles of unlocking, without replays |
| End of Region 1 (B5) | About 4,000–5,000 cumulative; shotgun bought, militia L2–3, pistol ★3–4 |
| Battle 20, first try | Winnable by a player who never replayed and never watched an ad |
| Full catalogue | About 75% bought by the end of the campaign; the rest is Last Stand and replay goals |

- **The simulator (`src/state/balance.ts`, built in M3):**
  - It plays each built battle's gold: every knockout pays, whoever made it, plus wave and first-win bonuses.
  - At each break it buys the Recommended item if affordable (a saving player).
  - It fails the build if a target breaks.
  - Battle 1's second break is exempt from "something affordable": the onboarding shows pistol ★3 greyed with "X
    more" there on purpose, as the next goal.
- **The play check:** `npm run qa:battles` plays Battles 1–3 with a scripted player to victory, and loses one on
  purpose.

### 11.3 Prices

All prices are in §8 and §10. The rule of thumb: each tier costs about 1.6–1.9× the previous one.

## 12. The shop (Rosie's truck)

### 12.1 Opening it

- **Walk up:** walk into the truck's ring (3 m) during a wave break, or on the map screen (Truck button). The shop
  opens as a **docked panel**, not a full-screen menu, so the hero and truck stay visible:
  - Landscape: a right-side panel, 42% of the width (min 360 px).
  - Portrait: a bottom sheet, 62% of the height.
- **Closing:** walk out of the ring, press ✕, Esc, or Next wave.
- **Poki and pointer lock:** opening the shop sends `gameplayStop` and releases pointer lock. Closing it sends
  `gameplayStart`, and the next click re-locks.

### 12.2 Layout

- **Header:** big gold balance (coin plus number) and Rosie's one-liner.
- **Tabs:** icon plus label: **Guns**, **Hero**, **Army**.
  - Tabs appear when first unlocked: Guns in B1, Army in B2, Hero in B3.
  - A dot badge means a new affordable item.
- **Item cards** (scrolling list, 1 column in portrait, 2 in wide landscape), each with:
  - an icon (pre-rendered thumbnail)
  - name and level pips ★
  - a one-line effect in plain words, e.g. *"Shoots through 2 soldiers"*
  - at most two comparison bars (Damage, Speed) showing current vs next
  - **one action button**

**Card states:**

| State | Button | Look |
|---|---|---|
| Affordable | gold price button | bright, slight pulse if Recommended |
| Too expensive | "120 more" with coin icon | dimmed card and button |
| Owned gun, not equipped | Equip | |
| Equipped | ✓ Equipped | |
| Max level | ★★★★★ MAX | |
| Locked | 🔒 "Battle 6" | grey silhouette ("show the locks before the keys") |

- **Recommended:** a ribbon on one item, the cheapest affordable item with the best value per gold. Scripted in Battles
  1–3.
- **Saving goals:** in Battles 4–5 the shotgun holds the ribbon until it's bought, affordable or not; while it's out
  of reach the ribbon reads *"Save for this"* with "X more", so players save for the new gun rather than spending on
  small upgrades.
- **Opening:** the panel opens on the tab holding the Recommended item.
- **Buying:**
  - A coin burst, and a crate drops from a rift spark onto the truck.
  - The gun model swaps in the hero's hands; an ally purchase sends a blue soldier jogging out.
  - Rosie quips.
- **Keyboard:** arrows/Tab move focus, Enter buys, 1/2/3 switch tabs, Esc closes.

### 12.3 Rift crate (rewarded, in the world)

- **When:** from Battle 4, at most once per battle (50% chance per battle), in the first wave break. A glowing crate
  falls on the far side of the truck from Rosie's ring, a violet arrow points to it, and Rosie says *"Something fell
  through!"*
- **Interaction:** walk up to it and a small card asks: *"Borrow the Minigun for one wave?"*
  - **No thanks** comes first and is equal or larger.
  - **🎬 Open** comes second.
- **Reward:** the best gun you don't own yet, at ★3, for the next wave. It disappears afterwards, and Rosie adds
  *"Saving up for that?"* A try-before-you-buy.

## 13. Campaign

### 13.1 Map screen

- **The map:** a painted parchment of Larkmoor with 20 battle nodes on a road, the truck token on the current node,
  and region art.
- **Tap a node:** a battle card shows:
  - name, waves, a **new enemy icon**, crowns and the first-clear bonus
  - **Fight!** (primary)
  - **Truck** (the shop panel)
  - **Settings** (gear)
- **Returning players:** they land on the map with the next battle selected, so one tap starts it.
  First-time players never see the map before Battle 1 is won.
- **Small screens:** the map shows the selected battle's area at a size where every node is a 48 px target; picking a
  node near the edge moves the view. In portrait the card sits under the road and is as tall as its buttons need.

### 13.2 Battles

| # | Region | Battle | Waves | New this battle |
|---|---|---|---|---|
| 1 | Larkmoor Meadows | The Mill | 3 | Move, aim, shoot, gold, shop, Next wave, captain and rout. Peasants. Can't lose |
| 2 | | Turnip Field | 3 | Footmen, grenades, Army tab (militia) |
| 3 | | Old Stone Bridge | 4 | Archers, Hero tab, Banner upgrade |
| 4 | | Hollow Farm | 4 | Shield Wall, shotgun, rift crate |
| 5 | | Grudge's Hill | 4 + boss | **Sir Grudge**; ally archers afterwards |
| 6 | The Riverlands | Ford of Reeds | 5 | Riders, SMG, second gun slot |
| 7 | | Marsh Village | 5 | Firebrands |
| 8 | | The Ferry | 5 | Rift Strike, assault rifle |
| 9 | | Willow Palisade | 6 | Men-at-Arms (armour), ally men-at-arms |
| 10 | | The Long Road | 5 + boss | **The War Wagon**; hunting rifle |
| 11 | Highland Pass | Pine Gate | 6 | Brute (champion) |
| 12 | | Old Watchtower | 6 | Battering ram, machine gun |
| 13 | | Shepherd's Rest | 6 | Ally knights, Sentry Gun |
| 14 | | Cliffside | 7 | Catapult, grenade launcher |
| 15 | | Pass of Echoes | 6 + boss | **The Siege Tower** |
| 16 | The Iron Keep | Burnt Orchard | 7 | Minigun |
| 17 | | Moat Road | 7 | Rams and catapults together |
| 18 | | The Gatehouse | 8 | Elite captains, rocket launcher |
| 19 | | Inner Bailey | 8 | Everything |
| 20 | | The Iron Keep | 6 + final boss | **The Iron Baron**, then the ending and Last Stand unlocked |

- **Battle length:** 3 minutes (B1) growing to about 8 (B19).
- **Soldiers on screen:** Region 1 peaks at about 60 (both sides), Region 4 at about 300 on the high tier (§19).

### 13.3 Crowns

- 1 crown for winning, 2 for ending with the banner at 50% or more, 3 for 80% or more.
- Crowns show on the map. Their total is the long-term goal for cosmetics (§20).
- Battle 1 is always 3 crowns.

### 13.4 Last Stand (after Battle 20)

- Endless waves on any cleared battlefield, getting harder, with a shop every 3 waves.
- Gold pays normally; there is a best-wave record per field.
- The main long-term gold sink and the first live-ops mode.
- Built M10 (`content/lastStand.ts`, `state/lastStand.ts`): opens once Battle 20 is won, from a cleared battle's map
  card ("Last Stand", or "Last Stand · 17" with the record). Each wave is made from a seeded points budget (18 + 7 a
  wave) spent on squads of the Baron's rank and file (more types as the waves go on, captains on blocks, elite
  captains from wave 8), with a Brute, ram or catapult now and then from waves 4–6; every 10th wave a boss in turn
  (War Wagon, Siege Tower, Iron Ox, Sir Grudge) with an escort. Enemy health is the field's region ×(1 + 6% a wave).
  After every 3rd wave the shop break; after the others a 6 s countdown ("Wave 5 coming!"). The record saves as each
  wave falls; the card shows waves held, "New best!" against the record when the run began, gold kept, Again, Map and
  🎬 Rally (once, as in a battle).

### 13.5 The ending (built M10)

- **The Baron's escape** (`content/ending.ts` `ESCAPE`, `world/donkeyEscape.ts`), every time the Iron Ox falls
  (Battle 20 and a Last Stand's Ox waves): a small grey donkey (the riders' Quaternius horse at 1.2 m, chunky, its ear
  bones stretched, repainted grey with a pale muzzle) trots up behind the fallen Ox; the Baron pops up in his turret
  shaking his fist, hops into the saddle and gallops off away from the banner (5.6 m/s for up to 5.2 s, stopping
  short of the hedge), looking back over his shoulder, his cape flapping, a little dust at the hooves, then shrinks
  away in a last puff. Toast "The Baron flees!" (the longer "...on a donkey!" ran under Poki's pill on a 320 px phone), Rosie
  "Was that... a donkey?". The victory card waits
  for him (about 7 s at most).
- **The scene** (`ENDING`, `game/ending.ts`), after Battle 20's first win only (replays get the usual card): the HUD
  and controls go, a 0.45 s dip to dark, then the hero at ease in front of the banner, Queen Ada walking in along the
  hilltop to him, both turned three-quarter to a camera that looks north past the banner at the Iron Keep. Four lines
  at the bottom of the screen (a face, a name, the line), each 3.6 s or a press after 0.5 s: Ada "You did it!
  Larkmoor is free!" (she cheers), Rosie "And the Baron left on a donkey.", Ada "He'll be back. Will you guard our
  fields?", Rosie "Endless waves? I'll keep the truck running!" (everyone cheers). Skip (top right; Escape too) goes
  straight to the card.
- **The card:** "Larkmoor is free!", the crowns and gold as a victory card, a gold "Last Stand unlocked" block
  ("Endless waves on any field you have won"), To the map, and the 🎬 ×2 gold offer. The scene stays behind it until
  the player leaves. A short landscape screen keeps the total and the unlock, not the breakdown.

## 14. Onboarding (summary)

The full plan is in [onboarding.md](onboarding.md). In short:
- **Into the game at once:** no title screen, no menus; the first input is gameplay.
- **Battle 1 teaches**, each at the moment it is needed:
  - move, aim and shoot
  - gold
  - the shop, by walking to the truck and buying one highlighted item
  - Next wave
  - captains and the rout
  - Battle 1 can't be lost.
- **Later battles:**
  - Each one adds **one** new thing: a control (grenade, swap, support) or an enemy, with a counter tip in the army
    reveal.
  - Prompts are key pictures or gestures plus at most 4 words, placed low on screen. They stay until the action is done
    and never come back once learned.
  - Help appears only when stuck: after 6 s of no progress the prompt animates, and after 12 s Rosie gives a hint.

## 15. UI and UX

### 15.1 Principles

- **The centre belongs to the action.** The HUD hugs the edges, small and see-through. Temporary prompts sit low:
  - desktop: bottom centre, above the HP bar
  - touch landscape: under the top-centre objective
  - portrait: just above the button stack
  Nothing mid-screen except the crosshair and brief world-space stamps.
- **One primary action per screen.** It is bigger, brighter and first in reading order.
- **Never colour alone.** Every state has an icon or text as well as colour.
- **Device-specific hints.** Key caps and mouse pictures on desktop, hands and gestures on touch. Switching device swaps
  them live.
- **Calm.** No pulsing anything for more than 2 s unless it's the one thing to do now.

### 15.2 Screen flow

```
Boot ─▶ (first time) Battle 1 in the world ──▶ Victory ─▶ Map
     └▶ (returning) Map ─▶ Battle ─▶ Victory / Defeat ─▶ Map
In battle: Pause (Esc/P/button) ─▶ Resume · Settings · Retreat to map (confirm)
Map: battle card · Truck (shop) · Settings
```

### 15.3 HUD, landscape

```
┌───────────────────────────────────────────────────────────────┐
│ [≡] 🪙 1,240           Wave 2/4                         (pill)│
│                  ⚑ ███████░░  ⚔ ██████░░░                     │
│                                                               │
│                            ·◦·          ← crosshair + arcs    │
│                                                               │
│                     [prompt: WASD Move]                       │
│ ♥ ████████░░                              (🔫 12)  (✹ 2) (☄1) │
└───────────────────────────────────────────────────────────────┘
```

- **Top-left:** pause button and gold, kept outside Poki's 46×62 pill area. Top-right stays clear for the pill.
- **Top centre:** wave counter, then the **banner bar** (blue, flag icon) and the **enemies-left bar** (red, swords
  icon). In boss waves the enemies bar becomes the boss bar with the boss's name.
- **Bottom-left:** the hero's health (thin bar with a heart icon). On touch this is also where the move stick appears.
- **Bottom-right:** the gun (icon, ammo count and reload ring; 2 icons once there are 2 slots), grenade (count), support
  (charges). Desktop shows key caps on them (G, E).
- **Centre:**
  - The crosshair: a dot plus ring. It turns red over an enemy, with a diamond over captains, and shows hit markers.
  - Directional damage arcs around the crosshair.
- **Screen edges:** off-screen arrows for the banner under attack, arriving squads (small red chevrons) and, in a break,
  the truck.
- **Toasts** under the top-centre bars: "Wave cleared! +120" and "ROUT!" (also as a world stamp). They stack under
  the objective line.
- **Tight screens** (a small phone sideways, the biggest HUD size, a long gold number): the wave and bars move to the
  top right, clear of the gold and the pill.
- **Rosie's bubble:** under the gold, left of the bars. In portrait, under the bars, clear of the pill on both edges.
- **With the shop open** the field's HUD steps back (gold, bars, health, buttons); Next wave stays, beside the panel.

### 15.4 HUD, portrait

```
┌───────────────────────┐
│[≡] 🪙1,240      (pill)│
│ Wave 2/4              │
│ ⚑ ████░  ⚔ ███░░      │
│                       │
│          ·◦·          │ ← crosshair at 45%
│                       │
│         (hero)        │
│ [prompt above buttons]│
│                 (☄ 1) │
│                 (✹ 2) │
│ ♥ ███░          (🔫12)│
│  move here  look here │
└───────────────────────┘
```

### 15.5 Cards (victory, defeat, rewarded offers, pause)

- **Placement:** centred, at most 80% width and 70% height, over a soft dim (40%).
- **Buttons:** the primary at least 56 px tall, secondary ones 48 px. The standard choice comes first (top or left),
  and is at least as large as any rewarded button.
- **Rewarded buttons:** 🎬 icon, **never green** (Poki rule), a different colour family from the primary (we use a
  purple-blue). As tall as a secondary button, so every standard choice is at least as large; always after one
  (`ui/rewardButton.ts`).
- **Text:** one title of 4 words at most, one line of detail, numbers with icons.

### 15.6 Sizes and scaling

- **Scaling:** every UI size is `N × var(--s)`. `--s` comes from the short edge (min 0.92, phones up to 1.25, large
  screens up to 1.9), times the HUD size setting (1–1.5, capped by room).
- **Touch targets:** at least 48 px for menus, 64 px for in-game buttons, 12 px gaps.
- **Text:** at least 14 px × `--s` on HUD, 16 px on cards. Outlined or on a translucent plate over the 3D scene.
  Contrast 4.5:1 or better.
- **Safe areas:** `max(env(safe-area-inset-*), 12px)` margins and `viewport-fit=cover`.
- **Checked sizes:** `npm run qa:hud` covers 19 sizes from 320×568 portrait to 3840×2160, every card filled with its
  longest string in every language, and checks overlaps, clipping, the pill area and target sizes.

### 15.7 Pause and settings

- **Pause:** Resume (primary), Settings, Retreat to map (asks to confirm; gold earned so far is kept).
- **Settings:**
  - Sound and music volume.
  - Look sensitivity, invert Y.
  - Auto-fire (mouse); auto-fire (touch, on by default).
  - Aim assist (Off / Normal / Strong; touch only).
  - Wave intros (Full / Short / Off), camera shake (Off / Low / Full).
  - Graphics (Auto / High / Low / Lowest), HUD size.
  - Reduce motion (on when the device asks for it).
  - Left-handed (touch), vibration (touch), language.
  - Credits: a heading per group (3D models; sound and music) and the makers' names, then "everything else was made
    for this game" (built M11, `content/credits.ts`).

### 15.8 Accessibility checklist

- Colour-blind safe team colours: blue and orange-red, checked with `colour_blind.py`, plus shape differences.
- Separate music and effects volumes. Subtitles aren't needed (no voice).
- Aim assist and auto-fire options; no button mashing or held-button requirements on touch.
- Reduced motion: reveal shots shortened, shake off, no flashing. Built M11: a Settings toggle (it starts from the
  device's own preference); on, the camera's shake and kick drop to a trace, the army reveal is short, and the UI's
  animations and fades end at once (`#game.is-reduced-motion`).
- Telegraphs read by brightness as well as hue (M11's colour-blind pass): the Iron Ox's fire cone is light amber and a
  charge's lane light coral, at more opacity, and the hero's health bar is coral, not deep red (red-weak eyes saw
  them sink into the grass or the track).
- Vibration (touch, on by default, built M11): a short buzz when the hero is hit (22 ms) or knocked down, when a boss
  changes or falls, for a blast close by and a purchase; never on a computer; a volley of hits is one buzz
  (`content/haptics.ts`).
- Settings are remembered.

## 16. Ads and monetisation

All placements are switches in `src/content/ads.ts`, and every ad goes through `PlatformSession` (§19, tech design).

| Placement | Type | When | Standard option alongside | Notes |
|---|---|---|---|---|
| Next wave | Interstitial (`commercialBreak`) | Pressing Next wave in a break, **from Battle 2 on** | — | Skipped if a rewarded ad played in this break. Poki throttles frequency |
| Result card | Interstitial | Continue or Retry on a victory or defeat card, from Battle 2 on | — | Never after Battle 1 |
| Rally | Rewarded | Defeat card, once per battle | **Retry** (first, equal or larger), Map | The banner goes to 50% and the enemies at it are knocked out, the current wave continues, the hero is up |
| Double gold | Rewarded | Victory card (not in Battle 1's first, scripted run) | **Continue** (first, equal or larger) | Doubles kill gold and wave bonuses. Celebrated with a second count-up |
| Rift crate | Rewarded, in the world | The first break, from B4, on about half the battles | **No thanks** (first) | Borrow the best gun you don't own that opens within six battles, at ★3, until the next wave ends |

**Rules (Poki):**
- No interstitial before the first `gameplayStart`, in Battle 1, mid-wave, or on our own timers.
- Mute audio, disable input and release pointer lock in `onStart`; restore everything after.
- Grant rewards only on `success === true`. Ad blocked or failed: no reward, no message; the offer quietly goes and the
  game continues.
- No interstitial straight after a rewarded ad at the same stop (Next wave in that break, or leaving that card).
- One video per reward (default size). Rewarded buttons are never green and always show 🎬.

**Benchmark:** at least 1 ad per daily active user. Expected mix per 20-minute session: about 3–5 interstitial
opportunities and 1–2 rewarded views.

## 17. Audio

- **Guns:** punchy, short, with a distinct sound per gun. They duck ambience for 80 ms. Distant guns (sentry) are
  quieter.
- **Crowd:**
  - Soldiers yelp lightly and a little comically when knocked out, with a variation limit of 4 per second.
  - Footsteps blend into a crowd loop sized by the number nearby.
  - Routs: a horn plus a blue cheer.
- **Role sounds (readability):**
  - firebrand's "aaah!" and sizzle
  - rider hoofbeats
  - catapult creak plus whoosh
  - brute wind-up roar
  - archer volley "thwip" and a whistle before landing
- **Gold:** a soft coin tick whose pitch climbs within a combo. Kept quiet, because it's frequent (the owner's taste
  from earlier games).
- **UI:** soft clicks and a purchase "ka-ching" with a crate thud.
- **Music:** light folk-orchestral on the map and in breaks, drums and brass in waves, a boss theme, a short victory
  fanfare. Sources: the owner's library (`C:\PROJECTS\ASSETS\MUSIC`, the Orchestral/Classical/Fantasy packs in
  `SFX/`). The owner decides by ear at M8.
  - **In the game since M8 (to be confirmed by ear):** Ovani's "The Fair" (map and breaks), "March!" (waves) and
    "Retribution" (the boss), each a 60-second loop; "Orchestral Victory A" as the fanfare. Candidates side by side:
    `qa-output/music/index.html` (`docs/asset-pipeline.md`). `C:\PROJECTS\ASSETS\MUSIC` holds electronic and dark
    ambient music from other games, so it wasn't used.
  - The rout's "blue cheer" is Larkmoor's horn for now: the library has no crowd cheer with a clear licence.
- **Mix:** master, music, effects and ambience gains (the ambience rides with the effects volume). Silenced during
  ads and pause; unlocked on first input. The whole sound set and its mix: `src/content/audio.ts`.

## 18. Art direction and assets

### 18.1 Style

- **Models:** low-poly, flat-shaded with one gradient atlas (KayKit/Quaternius style). Chunky proportions with slightly
  big hands and heads.
- **Palette:**
  - Meadows: warm green.
  - Stone: soft grey.
  - Larkmoor: blue and gold.
  - The Baron: red and charcoal.
  - The hero: orange hoodie.
  - Rosie: red hair, teal tunic (her truck's colour).
  - Rosie's truck: teal with rust patches.
- **Lighting:** one warm sun with soft shadows (high tier), hemisphere fill, gentle fog beyond 60 m, a light colour
  grade. No grain, dither, outlines or chromatic aberration.
- **Readability rules:**
  - Every enemy role passes the **silhouette test**: a black fill at 40 px tall still tells the roles apart.
  - Blues and reds must be told apart in colour-blind simulation.
- **Effects:** small and soft. Muzzle flashes, dust puffs, coin glints, rift sparks. Bursts never fill more than about
  15% of the screen.

### 18.2 Asset plan (CC0, downloads approved by the owner)

| Need | Candidates to evaluate (look test in M6) |
|---|---|
| Soldiers (one shared rig, GPU-skinned from a bone texture) | **Picked by the owner in M7:** KayKit Adventurers (Knight, Rogue, Rogue Hooded, Barbarian and their clips; `docs/credits.md`), in the palette's colours; the shield walls' and Sir Grudge's tower shield built from the rectangle shield |
| Hero (full skeletal, aim poses) | **M7:** KayKit's hooded rogue, its green turned an orange hoodie; one-handed aim for every gun (`docs/asset-pipeline.md`) |
| Rosie | **M7:** KayKit's rogue, its green turned teal |
| Guns | **M7:** Quaternius pistol, short pump shotgun and SMG (Poly Pizza). Region 2–4 guns in M9 |
| Truck | **M7:** the Poly Pizza pickup, restyled teal |
| Medieval set (mill, farm, palisade, bridge, castle) | Quaternius Medieval Village MegaKit, Kenney Castle Kit, KayKit medieval sets, KayKit Dungeon (already in the library) |
| Nature | Quaternius Stylized Nature MegaKit, Kenney Nature Kit |
| UI icons | Built in-house as SVG; gun icons rendered from the models |
| Sound | The owner's library in `C:\PROJECTS\ASSETS\SFX` (guns, foley, impacts, crowds, horns, UI); CC0 extras if needed |

**Pipeline:**
- Downloads go to `C:\PROJECTS\ASSETS\3D\<pack>`, with licences kept.
- `npm run assets` (Blender, by script) restyles, merges, decimates and bakes VAT textures, then exports compressed
  GLB/KTX2 into `public/assets/`.
- Vendor packs are never committed.

**Checks for every asset:**
- Review from several angles in Blender renders.
- Then check **in the running game**, at rest and in motion, in landscape and portrait, near and far, in a crowd.
- No artifacts: one-sided faces, z-fighting, stretched UVs, popping LODs, missing animation frames.

## 19. Performance and technical targets

| Target | Value |
|---|---|
| Frame rate | 60 fps on desktop; 30+ fps on a mid phone (4× CPU throttle in `npm run perf`) |
| Draw calls | 150 or fewer across the whole frame |
| Soldiers alive (both sides), by tier | High 300 · Low 160 · Lowest 100. Backdrop armies are extra and cheap |
| Initial download (gzip) | Aim 3 MB, hard cap 5 MB; total 8 MB or less |
| Loading | Playable in 5 s or less on desktop broadband; first battle assets first, the rest deferred |
| Renderer | WebGL2. Pixel ratio capped by tier (1.0 / 1.5 / 2.0) |

How it's built (vertex-animation-texture crowds, flow fields, spatial hash, a fixed 30 Hz soldier simulation) is in
[tech-design.md](tech-design.md).

## 20. Live operations (after launch)

Content is data, and the game is built to be updated every 1–2 weeks without breaking saves.

| Update | Content |
|---|---|
| 1 | **Last Stand leaderboard of your own** (best waves per field) and a **daily battle** (a seeded modifier: "Archers only", "Double captains", "Giant peasants") |
| 2 | **Cosmetics:** hero outfits, caps, gun paints, truck paints; bought with gold or crowns, a few as rewarded unlocks |
| 3 | **Region 5, the Frost Marches:** snow, sled riders, an ice catapult; a flamethrower-style "Leaf Blower" gun |
| 4 | **The convoy battle:** Rosie's truck drives a road and you defend it on the move |
| Seasonal | A Halloween skeleton army skin and a winter snow battle |

Process: version bump, release notes, a save fixture per version, `qa` and `qa:poki` passing, a fresh Poki zip.

## 21. Metrics (`PokiSDK.measure`)

| Category | What | Actions |
|---|---|---|
| `tutorial` | step id (`move`, `aim`, `shoot`, `gold`, `shop`, `buy`, `nextwave`, `captain`, `grenade`, …) | `start` / `complete` |
| `battle` | `b01`…`b20`, `laststand` | `start` / `complete` / `fail` |
| `wave` | `b01w1`… | `complete` |
| `shop` | item id | `interact` (purchase) |
| `button` | `shop` | `visible` / `interact` |
| `rewarded` | `rally`, `double`, `crate` | `visible` / `interact` |

These answer: where new players drop in Battle 1, which battle stops people, what they buy first, and whether
rewarded offers are seen and taken.

## 22. Glossary

| Term | Meaning |
|---|---|
| Banner | What you defend. If it falls, the battle is lost |
| Blues | Allied Larkmoor soldiers |
| Reds | The Iron Baron's soldiers |
| Captain | Enemy squad leader with a tall banner. Knocking one out routs his squad |
| Rout | Soldiers drop weapons, burst their gold and flee. They count as defeated |
| Wave break | The calm between waves, when the shop is open |
| Army reveal | The 2-second high shot at the start of each wave |
| Rift crate | An in-world rewarded offer that lends a gun for one wave |
| Pierce | How many soldiers one bullet can hit |
| Armoured | Takes 50% from light guns (pistol, SMG) |
| VAT | Vertex animation texture: animation baked into a texture so hundreds of soldiers draw in one call |
