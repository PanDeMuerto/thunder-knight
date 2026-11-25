# Kingmakers: design teardown

Researched 2026-11-04 for Thunder Knight. Kingmakers is Steam app 2109770, made by Redemption Road Games and
published by tinyBuild: https://store.steampowered.com/app/2109770/Kingmakers/

**Labels:**
- **[C]** confirmed by the developer or publisher (Steam page, Steam news, dev posts) or by a hands-on.
- **[S]** a single secondary source.
- **[I]** inference.

## 0. Release state: the game is not out

- **Unreleased.** Steam shows "Coming soon" with no price and no user reviews. A separate "Kingmakers Playtest" app
  (5243090) has no date [C] (https://store.steampowered.com/api/appdetails?appids=2109770).
- **Delays:**
  - Announced on 2024-02-20 for Early Access "this year".
  - Moved to Q1 2025, then Q2 2025, then 2025-10-08.
  - Pulled indefinitely five days before launch, "a bit more time on content polish"
    (https://www.pcgamesn.com/kingmakers/delayed).
- **2026:**
  - NDA playtests since April.
  - An internal endless horde mode was built "to improve game feel" [S] (https://www.pcgamesn.com/kingmakers/dev-update).
  - First public demo at BiliBili World, 10–12 July 2026.
  - A 10–12 minute gameplay deep dive at tinyBuild Connect on 2026-09-14, with a Steam playtest sign-up [C].
- **Changes from marketing to current build** (Dev Blog #2,
  https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1808061939510842):
  - Helicopters moved to after Early Access, and the pickup truck was cut.
  - The sword and shield became a sledgehammer and buckler.
  - The setting moved from 1461 to the Glyndŵr revolt of 1400–1403.
  - A giant mech was cut for breaking immersion [S].

Everything below is the playtest and demo build as the developers describe it, not a shipped product.

## 1. Premise, tone, art, camera, scale

- **Premise [C]:** the "last hope in a dying world" is sent 500 years back to medieval Britain to change a war. In the
  current lore, an American mercenary makes Owain Glyndŵr's Welsh revolt succeed (Dev Blog #3).
- **Tone:** an absurd premise played straight, "historically accurate absurdity"
  (https://gameinformer.com/preview/2024/05/27/historically-accurate-absurdity).
- **Art:** realistic (Steam tag "Realistic"). The concept is meant to read "from a single screenshot", and the reveal
  trailer's key shot is at about 23 s. One tweet passed 18M views
  (https://gamesbeat.com/3m-wishlists-10m-views-and-1000-hour-games-alex-nichiporchik-interview/).
- **Camera [C]:**
  - Third-person over the shoulder for combat.
  - A top-down RTS camera with deep zoom, switchable at any moment without pausing (Dev Blog #1).
  - No first-person view.
- **How scale is shown:**
  - Wide shots of thousands of soldiers.
  - Bodies sent flying.
  - Fully destructible buildings: cars through cottages, roofs dropped on infantry
    (https://www.gamepressure.com/newsroom/kingmakers-deep-dive-trailer-showcases-destruction-mechanics/z77b9e).
  - Soldiers who see an ally explode panic.

## 2. Core loop

- **Moment to moment [C]:**
  - Shoot dense medieval blocks of troops. The handgun is "surprisingly effective" because enemies move in groups.
  - The shotgun knocks cavalry off horses.
  - Melee with a sledgehammer, drive through crowds, and call in grenades, turrets and airstrikes.
  - Flip to the top view to give orders.
  - Ammo is not a constraint: supply pods drop from the sky (4Gamer hands-on,
    https://www.4gamer.net/games/776/G077663/20260712006/).
- **Per battle:**
  - Join an ongoing battle and capture villages and strongholds.
  - Loot copper, silver, gold and treasure, which is "uploaded" to the future.
  - Buy gear mid-mission (a bolt-action rifle in the demo).
  - Kill officers to break morale, and defend against counter-attack waves.
- **Campaign/meta:**
  - Captured land becomes settlements with farms, mills, mines, barracks, a blacksmith, walls and towers.
  - Barons counter-attack.
  - Troop tiers, weapons, vehicles and "Temporal Comms" levels unlock.
  - A relic skill tree, story choices and multiple endings.
  - A 30–40 hour campaign is reported [S].

## 3. Player character

- **Controls:** a third-person shooter plus RTS selection and orders.
- **Vehicles at Early Access:**
  - Motorcycle (indestructible for now).
  - Convertible (360° shooting from the open top).
  - Tank "hoped".
- **Death:** the player can die, so keeping troops close matters. Respawn rules are not published.
- **Co-op:** up to 4 players online, drop-in. Each player commands their own army. No PvP at Early Access.

## 4. Weapons (Dev Blog #2)

- **Handguns:** 9 mm, .50 Desert Eagle, .500 Magnum.
- **Rifles:** AR-15, AK-47, LMGs, an anti-materiel bolt rifle.
- **Other guns:** SMGs, shotguns, a minigun, a grenade launcher, a stun gun (captures officers) and a late plasma gun.
- **Thrown and called in:** grenades and tactical grenades (heal, gatling turret, morale), land mines, an airstrike and
  a rocket turret.
- **Starting kit:** a bow or crossbow, a basic handgun and a couple of grenades.
- **How you get them:** bought from the "Temporal Shop" with looted metals.
- **Upgrades:** magazine, armour penetration and accuracy.
- **Penetration ratings:**
  - Against materials: plaster, wood, stone.
  - Against armour tiers: steel, hardened steel, "gold titanium alloy".
  - Light calibres fail on armour; explosives ignore it.

## 5. Economy

- **Currencies:**
  - Copper, silver, gold and treasures, spent in the Temporal Shop. Toasts read "Copper Uploaded (1)".
  - Holy relics, which fund the army skill tree.
  - Settlement resources: food, wood, silver, iron and peasants.
- **Earned from:** kills (demo), chests, castle interiors, bodies (officers and keeps pay most), mines, and officer
  ransom.
- **Buys:** guns, vehicles, turrets, airstrikes, weapon upgrades and comms level, which gates the shop tier.
- **When:** mid-mission, as a remote call-in shop with drop pods. No prices are published.

## 6. Enemies and allies

- **Allied troops:**
  - Swordsmen, who get a defence bonus near others.
  - Spearmen, who unseat cavalry.
  - Cavalry, who flank.
  - Archers, who are strong against light armour.
  - Berserkers, with a rage mode.
  - Men-at-arms, who are tanks.
  - Each upgrades over 2–3 tiers.
- **Siege and defences:** trebuchets, ballistas, archer towers, walls and gates. A hospital revives part-surviving squads.
- **Enemies:**
  - Line infantry and cavalry.
  - Named officers with red nameplates and health bars.
  - Elite officers as "cinematic mini-bosses" who charge through their own men and break walls.
  - Shielded pikemen who throw spears, warhammer brutes and suicide bombers.
  - Civilians.
- **Morale:** killing an officer crashes his troop's morale and can cause a rout. Gory deaths cause fear.
- **Captured officers:** ransomed, tortured or executed.
- **Scale:** "thousands" (Steam), "tens of thousands" per mission (developer statements).
- **Orders:** move, attack and defend, given directly or delegated to petty officers. Blue and red ground markers show
  friend and foe.

## 7. Missions

- **Types:**
  - Capture villages and strongholds.
  - Breach castles.
  - Defend strongholds against waves.
  - Besiege fortresses.
  - Hunt spies, escort nobles and raid convoys.
- **Tutorial:** the first mission doubles as the tutorial.
- **Maps:** procedural with hand-crafted parts.
- **Not published:** mission length and difficulty settings.

## 8. Campaign

- **Map:** open-world England and Scotland, where you capture land and grow settlements while barons counter-attack.
- **Kingmaking:** choosing which side to back, with multiple endings.
- **Progression:** territory, buildings, troop tiers, relic tree, comms level and weapon unlocks.

## 9. Reception (pre-release only)

- **Interest:** in May 2025 it was the #1 most-wishlisted Strategy-tagged game and #15 overall on Steam
  (https://www.pcgamesn.com/kingmakers/launch-date).
- **Praised:**
  - The one-glance concept.
  - Destruction and crowd tech.
  - A hands-on called it "easy to understand", with strong gun feel.
- **Complaints:**
  - Repeated and last-minute delays; the complaints thread has 846 replies.
  - Vaporware fears.
  - Possible gen-AI faces in a cutscene.
  - "The plot is dumb".
  - No first-person view.
- **[I] Too complex for a casual audience:**
  - Two control modes switched in real time.
  - Settlement building and its placement rules.
  - 8+ resource types.
  - Six troop types with counters and tiers.
  - The armour-penetration matrix.
  - Officer capture and torture (also a tone problem for Poki).
  - Morale and loyalty, territory counter-attacks, faction choice.
- **[I] Simple enough to keep:**
  - Third-person gunplay against dense blocks of troops.
  - Kills and loot turning into cash.
  - A shop with supply drops.
  - Killing the officer to rout his squad.
  - Bodies flying.

## 10. Tech

- **Engine:** heavily customised Unreal Engine 4.
- **Crowds:** soldier animation runs in the GPU vertex shader (vertex-animation-style crowds), with hand-made
  low-vertex models, "like we're back in the PS2 times" (Digital Foundry interview, mirror
  https://gamernet.pages.dev/posts/inside-kingmakers-the-big-digital-foundry-tech-interview).
- **Simulation:** custom multi-threaded AI per soldier.
- **Target:** 60 fps on midrange PCs.
- **Team:** about 20 people.

## What Thunder Knight takes, and what it cuts

| Kingmakers | Thunder Knight |
|---|---|
| Third-person shooter against huge blocks of troops | **Kept.** Over-the-shoulder camera (the owner's choice), dense ranks, bullets that pierce ranks |
| Officers whose death routs the troop | **Kept, made obvious.** Tall banner, glow, aim-assist priority, a big "ROUT!" moment |
| Loot → shop with drop pods | **Kept, made simpler.** One currency (gold) from kills, spent at Rosie's truck between waves; buys arrive as crates |
| Allied army you command | **Simplified.** You hire soldiers in the shop and they fight on their own. No orders, no second camera |
| Settlements, 8+ resources, relic tree | **Cut.** One currency; permanent upgrades are the meta |
| Armour-penetration matrix | **Simplified** to one rule: armoured enemies shrug off small guns (sparks, grey numbers) |
| Officer capture and torture | **Cut** (tone). Officers rout their men instead |
| Vehicles, co-op, open world | **Cut for launch.** Ideas for live operations |
| Realistic, gory | **Changed.** Bright low-poly toy-soldier look, bloodless knock-outs with coin bursts |
| Historical Wales, a dying future | **Changed.** An original light-hearted kingdom (Larkmoor), an original hero, mechanic and villain |
