# Reference games: design lessons

Researched 2026-11-04 for Thunder Knight. Most numbers come from fan wikis and community guides; treat them as
approximate. The KF2 wiki blocks fetchers, so its figures come from search snippets of those pages.

## 1. Killing Floor 1 and 2: the wave → trader rhythm

**Waves**
- Games run 4, 7 or 10 waves, and every length ends in a boss wave
  (https://giantbomb.com/wiki/Games/Killing_Floor).
- KF2 base zeds per wave in a 7-wave game: 25/28/32/32/35/40/42, multiplied by player and difficulty modifiers.
- Alive-at-once caps on Normal: 10 solo, 14 for two players, 32 for three or more
  (https://steamcommunity.com/sharedfiles/filedetails/?id=444647945).
- **Lesson:** solo, you never fight more than about 10–12 at once. "Horde" is mostly presentation.

**Trader**
- Normal: 75 s of trader time and 300 starting dosh. Hard: 60 s and 250.
- The trader opens only between waves, at set map spots (https://wiki.killingfloor2.com/index.php?title=Survival_Mode).

**Dosh per kill**

| Zed | Clot | Crawler | Gorefast | Stalker | Bloat/Husk | Siren | Scrake | Fleshpound | Boss |
|---|---|---|---|---|---|---|---|---|---|
| Dosh | 7 | 10 | 12 | 15 | 17 | 25 | 75 | 200 | 500 |

- Difficulty multipliers: ×1.2 on Normal, ×0.9 on Hell on Earth.
- Length multipliers: short games ×1.75, long games ×0.8.
- Each wave you survive also pays a bonus (https://wiki.killingfloor2.com/index.php?title=Mechanics_(Killing_Floor_2)).

**Prices**
- Weapon tier bands: T1 200–300, T2 650–850, T3 1100–1300, T4 1500–1600, T5 2000–2500.
- In-place tier upgrades cost 500/600/700/1500.
- Armour costs about 3 per point (https://steamcommunity.com/sharedfiles/filedetails/?id=1665112317).

**Zed roles**
- Fodder: Clot. Glass cannon: Gorefast. Pests: Crawler, Stalker. Tank: Bloat. Ranged: Husk.
- Big: Scrake (wave 5+) and Fleshpound (wave 7+). The Fleshpound enrages after taking 320 damage in 3–5 s.
- Boss: Patriarch. Heals 3 times and summons.
- **Why it works:** slow-mo "Zed Time", dismemberment, money ticking up, a short shopping burst, and big zeds held back
  for late waves.
- **New players struggle with:** perk choice, hidden enrage thresholds, forgetting to restock before the boss, and
  assuming the higher tier is always better.

**Borrow:**
- Tier price bands.
- Cash per kill scaled by threat, plus a wave bonus.
- Big enemies arriving late, and a boss on the final wave.
- A satisfying payoff moment.

**Avoid:**
- A timed shop.
- Buying ammo, and weight.
- Perk choice before the first run.
- Hidden rage thresholds.

## 2. Horde games with shops or level-ups

**Brotato** (https://brotato.wiki.spellsandguns.com/Waves, /Shop)
- 20 waves. They start at 20 s and grow to 60 s by wave 9; the final wave is 90 s with bosses.
- Uncollected loot is bagged at wave end.
- The shop has 4 slots, with rarity tiers unlocking by wave. Rerolls get pricier, locking is free, selling returns 25%.
- **Borrow:** short waves that grow, rarity colours, auto-collect.
- **Avoid:** random shops and long stat text.

**Call of Duty Zombies** (https://www.hxchector.com/call-of-duty-black-ops-walkthrough/zombies)
- Points: start at 500, +10 per hit, 60 per kill, 100 per headshot.
- Prices: wall guns 200–2500, Mystery Box 950, perks 2000–3000, Pack-a-Punch 5000.
- Power-ups last 30 s (Double Points, Insta-Kill).
- **Borrow:** points for hits, so every shot pays; short power-up drops.
- **Avoid:** an exponential HP wall and exploitable farming.

**Vampire Survivors, Survivor.io, Halls of Torment** (https://naavik.co/deep-dives/survivorio-archeros-footsteps/)
- Level-ups offer pick-1-of-3 or pick-1-of-4.
- Survivor.io runs 15-minute stages with a boss every 5 minutes, and plays with one finger and auto-aim.
- Habby's games keep to one-button controls and unlock features over days
  (https://mobilegamer.biz/the-design-secrets-powering-habbys-hit-machine/).
- **Avoid:** a second progression system (XP cards) beside the money shop. It doubles the decisions.

**Risk of Rain 2**
- White/green/red rarity reads instantly.
- **Avoid:** opaque item effects.

**Serious Sam**
- The engine target was about 100 enemies on screen.
- The Kamikaze's endless scream lets you find one small threat inside a crowd (https://dreadxp.com/?p=31834).
- **Borrow:** a unique sound for every dangerous role.

## 3. One against thousands

**Dynasty Warriors: Origins**
- Thousands of soldiers on screen.
- An enemy "Large Force" shares one health bar, and killing officers drains it fastest
  (https://clawsomegamer.com/how-to-disband-a-large-force-in-dynasty-warriors-origins).
- **Borrow:** one army bar per wave, and officers as glowing priority targets.

**Ultimate Epic Battle Simulator 2**
- Scale sells the screenshot, but needs a loop under it.

**Totally Accurate Battle Simulator** (https://landfall.se/tabs-press-kit)
- **Borrow:** chunky silhouettes, red against blue, comic ragdolls.

**Mount & Blade II: Bannerlord**
- Orders take nested keys.
- **Avoid:** any order menu. If needed, offer one Hold/Charge toggle at most.

**Days Gone and World War Z**
- Hordes of up to 500, moving as one flow, with traps and explosives as crowd tools.

## 4. Mobile casual action

**Archero**
- You fire only while standing still. That pins you down against hundreds of enemies, so don't copy it.
- One revive per level, for gems or an ad.

**Brawl Stars**
- Tap the attack stick to auto-aim, drag to aim by hand (https://www.pockettactics.com/brawl-stars/download).
- **Borrow:** this for grenades.

**CoD Mobile Simple mode**
- Fires automatically while the crosshair is on an enemy.
- **Borrow:** this for over-the-shoulder touch play.

**Mob Control and Count Masters**
- **Borrow:** big crowd numbers on screen as spectacle.

**Grow Castle**
- About 43M installs. Defend the wall, upgrade between waves.

**Kingdom Rush** (https://www.gamedeveloper.com/design/kingdom-rush---the-wonderful-campaign-level-design)
- **Borrow:**
  - Call the next wave early for a bonus.
  - New enemy types arrive one at a time, each with a clear counter.

## 5. Poki: what's popular in this space (category pages, 2026-11-04)

- **Shooting:** Funny Shooter 2, Combat Online 2, Getaway Shootout, Rooftop Snipers, Cryzen.io.
- **Zombie:** Deadrise.io, Zombie Rush, Zombroad.
- **War:** War Masters, Tank Stars.
- **Tower defense:** War of Sticks, Castle Defender Saga.
- **New in medieval:** Siege The Castle (4.6, Oct 2026) and Funny Battle Simulator 3.

| Game | Rating / votes | Controls | Loop |
|---|---|---|---|
| War of Sticks | 4.6 / 955k | Tap buy buttons | Gold → units and towers |
| Stick Defenders | 4.5 / 673k | Drag to merge | Waves; merge gunmen, upgrade the wall |
| Zombie Rush | 4.4 / 348k | WASD, auto-fire; phones too | Roguelike heroes, gems → abilities |
| Funny Shooter 2 | 4.5 / 213k | First person, WASD + mouse, **desktop only** | Coins → health, magnet, grenades; 18 weapons |
| Base Defense | 4.5 / 192k | Mouse | Waves; coins → turrets |
| Count War | 4.4 / 137k | A/D or joystick | Gates multiply your army against crowds |
| TDS – Tower Destiny Survive | 4.6 / 60k | Tap | Auto-fire at nearest; coins → upgrades |

**What this means:**
- Defense and army games with tap-to-buy upgrades draw the biggest votes.
- The top 3D shooter skips mobile.
- No 3D third-person "one hero vs an army with a trader" appears in these lists. That's our gap.

**Poki monetisation guidance** (https://developers.poki.com/guide/monetization):
- Rewarded slots: helping hands (revive, boosts), "coins or a video for the same reward", cosmetics.
- The free option is primary; use the standard video icon; celebrate the reward.

**Poki player behaviour:**
- Engaged sessions run 11–20 minutes, and a game should be playable in about 3 s
  (https://www.pocketgamer.biz/inside-pokis-vision-for-the-future-of-browser-gaming/).

## 6. Recommendations taken into the design

- **Camera:** the research recommended a high chase camera. The owner chose over-the-shoulder. GDD §5 lists the
  mitigations:
  - high ground at the banner
  - tall officer banners
  - an army-reveal shot at wave start
  - piercing bullets
  - a pulled-back portrait rig
- **Aiming:** touch auto-fires while the crosshair is on a target, with aim-assist friction and magnet (Scrap Express
  `aimAssist.ts`). Mouse aims, hold to fire, with auto-fire as an option. Target priority is officer, then ranged, then
  nearest.
- **Pacing to start from:**
  - Early battles of 3 waves, growing to 6–8 plus a boss.
  - Wave 1 about 40 s; waves grow 5–10 s each.
  - Alive at once: 100–120 on phones, 250–300 on desktop.
- **Shop:**
  - Three tabs: Guns, Hero, Army.
  - About 12–16 items, a fixed catalogue with no randomness.
  - One "Recommended" badge, white/green/blue/gold tier colours.
  - "Last shop before the boss" warning.
- **Enemy roles:** fodder, standard, ranged (telegraphed), shield, fast, exploder (unique scream), officer (banner),
  champion (charge telegraph), boss. One new role at a time.
- **Rewarded ads:**
  - Rally (revive the banner), once per battle.
  - ×2 battle gold on the victory screen.
  - An in-world "rift crate" that lends a top gun for one wave.
  - Interstitials only on Next wave, after a battle, and on retry. Never mid-wave, never in the first battle.
