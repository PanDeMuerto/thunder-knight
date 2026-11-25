# Release checklist (Poki)

Poki's requirements, from `docs/research/poki-and-ux-guidelines.md`, and how each is checked. Tick an item only when
its check has passed on the build being uploaded. Status as of 1.0.0 (16 Nov 2026, M12: the release candidate). What's
still open is the owner's: their checks on a real phone, the store title, and Poki for Developers.

## Before every upload

1. Bump the version in `package.json`, so the zip has its own name.
2. `npm test`, `npm run lint`, `npm run build`.
3. With the dev server running: `npm run qa`, `npm run qa:poki`, `npm run qa:battles`, `npm run qa:hud` (and
   `-- --hud=1.5`, `-- --langs=all`), `npm run qa:edges`, `npm run qa:soak`, `npm run perf`.
4. `npm run package`, then `npm run qa:build` (and `-- --real-sdk`). For itch.io: `npm run package:itch`, then
   `npm run qa:build -- --target=itch`.
5. Upload the zip in Poki for Developers, then run the Inspector on it (the last section).

## SDK and events

- [x] `gameLoadingFinished()` once loading is done, before any gameplay or measure (`qa:poki`, `qa:build`;
      `tests/platform.test.ts`).
- [x] `gameplayStart()` and `gameplayStop()` alternate, never twice in a row: waves, breaks, pause, cards, ads, the map
      (`qa:poki`, `qa:battles`, `qa`: "starts and stops alternate").
- [x] Nothing before the first input: a new player boots straight into Battle 1 with no title screen; gameplay starts
      on the first deliberate input (`qa`, `qa:poki`, `qa:build`).
- [x] Audio muted, input off and pointer lock released during every ad (`game.onAdStart`; `qa:poki` "during the ad the
      mouse is free and input is off").
- [x] No events during an ad: `PlatformSession` drops them (`tests/platform.test.ts`).
- [x] The language comes from `getLanguage()` (`platform/pokiAdapter.ts`, base code only), with a picker in Pause once
      there's more than one language (M11).
- [x] The mobile pill is placed with `movePill`, and `qa:hud` keeps both top corners (landscape) and both edges at 30%
      (portrait) clear on touch.
- [x] `measure()` for the tutorial steps, battles, waves, shop purchases and the rewarded placements' `visible` and
      `interact` (GDD §21); every measure is three plain strings (`qa:build`).

## Ads

- [x] No ad before the first `gameplayStart` (`PlatformSession` refuses one; `tests/platform.test.ts`, `qa:build`).
- [x] No ad in Battle 1 (`qa`, `qa:poki`, `qa:battles`, `qa:build`).
- [x] Interstitials only at natural stops, from Battle 2: Next wave in a break, and Continue or Retry on a result card.
      Never mid-wave, never on a timer of ours (`state/ads.ts`, `tests/ads.test.ts`, `qa:poki`, `qa:battles`).
- [x] No interstitial straight after a rewarded ad at the same stop (`qa:poki`: ×2 gold then Continue; the crate then
      Next wave).
- [x] A rewarded ad only on the player's own choice: ×2 gold (victory), Rally (defeat, once per battle), the rift crate
      (from Battle 4, about every other battle).
- [x] Every rewarded button shows the video mark, is never green, and comes after a standard choice that is at least as
      large and above or beside it (`ui/rewardButton.ts`; `qa:poki` checks every card; `qa:hud` on 19 sizes).
- [x] The reward is given once, only when the ad reports success; a failed, skipped or blocked ad quietly withdraws the
      offer and leaves the standard outcome (`qa:poki` "fail" and "blocked").
- [x] No "ad blocked" message, and the game plays with the SDK blocked (`qa:build`).
- [x] Without ads (itch.io, `?noads` in dev): no 🎬 offer, no crate, no ad asked for (`qa:poki`, `qa:build
      --target=itch`).

## Technical

- [x] First download at most 3.5 MB, 8 MB in all: 1,938 KB and 4,909 KB on the wire; the later regions' pieces come
      after Battle 1 (`npm run build`, `tools/check-size.mjs`).
- [x] No external requests except Poki's SDK: fonts, models and sounds are bundled (`qa:build` watches the network).
- [x] Plays in incognito: storage is wrapped (`tests/save.test.ts`, `qa:build` "storage blocked").
- [x] Desktop, phone and tablet, portrait and landscape, from 320 px wide to 4K (`qa:hud`, 19 sizes).
- [x] Arrows, Space, page keys and the wheel don't scroll the host page; Esc pauses (`qa:build`).
- [x] Keyboard and mouse on desktop, touch controls on phones and tablets (`qa`, `qa:build`).
- [x] No outgoing links, no other ad systems, no splash screen, no chat, no logins.
- [x] No development tools in the release build: `window.__game` and the dev panel exist only in dev (`qa:build`).
- [x] 30+ fps at 4× CPU on Low and 6× CPU on Lowest, under 150 draw calls (`npm run perf`; 80 at the cap, 134 at
      the busiest code-built moment, the Baron's escape).
- [x] A hidden tab pauses a wave and mutes; resizing and turning mid-wave and mid-shop keep everything on screen
      (`npm run qa:edges`).
- [ ] A real low-end Android phone holds 30 fps (the ✋ checkpoint after M8).

## Content

- [x] All ages: knockouts are bloodless tumbles; no blood, wounds or gore.
- [x] Original: no names, art, audio or text from Kingmakers or any other game. The characters are CC0 (KayKit),
      credited in `docs/credits.md`.
- [x] Calm visuals checked with `tools/qa/noise.py` (M7: grain 23.5 → 28.5 from the greybox to the dressed field, the
      busier pieces left out).
- [x] Colour isn't the only signal (icons on every bar, team colour plus steel tint); the colour-blind check (M11) found
      the fire cone, charge lanes and health bar weak for red- and green-weak eyes, now lighter.
- [x] Reduce motion (Settings, or the device's preference), vibration on phones only, credits (M11).

## Localisation (M11)

- [x] Poki's eleven languages; every key and placeholder (`tests/strings.test.ts`).
- [x] Every language fits the HUD and cards (`qa:hud -- --langs=all`: 1,463 checks clean).
- [ ] A native speaker reads each language once (the translations are ours; the owner's call how).

## Store page (M12)

- [ ] Title: "Thunder Knight", the working title, until the owner confirms it (never "Knight Makers").
- [x] Description, one line and controls in all eleven languages, and category ideas (`docs/store-listing.md`).
- [x] Screenshots: five, 1280 × 720 with the HUD (`release/poki-submission/screenshot-*.png`,
      `node tools/qa/store-shots.mjs`).
- [x] Thumbnails: two candidates, square, no text, 1080 and 628 px, and the 6 s hover video (`npm run thumbs`). The
      owner picks one (A, the minigun, is recommended).

## In Poki for Developers (the owner)

- [x] Upload the zip: 1.0.0 uploaded 16 Nov 2026 as the new game "Thunder Knight" (game id
      `70427d96-38c0-40d9-8bef-dfafd117e71a`, version `a9efaae9-a6bc-43fd-b907-8111197bd1b1`, status Ready; preview
      `https://poki.com/en/preview/70427d96-38c0-40d9-8bef-dfafd117e71a/a9efaae9-a6bc-43fd-b907-8111197bd1b1`, Inspector
      `https://inspector.poki.dev/?game=poki-a9efaae9-a6bc-43fd-b907-8111197bd1b1`). Poki's initial content check is
      pending (their team works Monday to Friday); settings and testing open after it.
- [x] Content check passed (by 23 Nov). On 23 Nov 2026, on the owner's request through their Chrome: the owner's own
      icon set as the thumbnail (Settings → General; `release/poki-submission/icon-owner-1254.png`, from their
      `images/1.webp`), categories saved (Shooting Games main; Action Games, Strategy Games), Level 2's steps ticked
      (preview, prepared for web, no external resources, categories).
- [ ] Both mobile orientations in Settings and the hover video: not done (the owner's).
- [x] Inspector, SDK Basics 6 of 6 on 1.0.0 (23 Nov): the event log showed SDK initialized, Game loading finished,
      then Gameplay start on the first key, Gameplay stop on Escape (Pause), Gameplay start on Escape again, with no
      duplicates, the same order as `qa:poki`. Technical Stability, Mobile Optimization, Privacy & Security and
      Playground Integration not run yet.
- [x] Playtest started 23 Nov: 10 recordings asked for (all devices, both orientations).
- [x] Player Fit Test started 23 Nov on 1.0.0: 500 gameplays, any device, both orientations; results within about 3
      hours. To pass: an average of 3+ minutes and at least 25% of players playing 3+ minutes.
- [ ] Watch the playtest recordings and the Player Fit Test's result, fix the worst moment, then the Web Fit test
      (Level 4).
