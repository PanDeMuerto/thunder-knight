# Poki SDK, UI/UX, onboarding and controls: guidelines checklist

Researched 2026-11-04 for Thunder Knight.

**Labels:**
- **[src]** read in the cited source.
- **[code]** read in the live Poki SDK script.
- **[infer]** our recommendation built on sourced facts.
- **[unverified]** not confirmed.

## A. Poki SDK and requirements

### SDK calls

- Load `https://game-cdn.poki.com/scripts/v2/poki-sdk.js` in `<head>`, then call `PokiSDK.init().then(start).catch(start)`,
  so the game loads even if init fails [src] https://developers.poki.com/guide/sdk-html5
- `gameLoadingFinished()` when loading ends. It feeds conversion to play (C2P).
- `gameplayStart()` on the **first input**, not on load. `gameplayStop()` on pause, menus, death, wave end and
  cutscenes. Never send the same event twice in a row, and send none during ads
  [src] https://developers.poki.com/guide/requirements-quality
- **The wave loop:**
  1. Wave cleared → `gameplayStop()`.
  2. Shop.
  3. Next wave → `commercialBreak()` → `gameplayStart()`.
  4. Death → revive uses `rewardedBreak()` instead [src] https://developers.poki.com/guide/sdk-overview
- `commercialBreak(onStart)`: mute and disable input in `onStart`, restore in `.then()`. Poki decides whether an ad
  plays, so signal every natural break.
- The SDK cancels a `commercialBreak()` made before the first `gameplayStart()` (no preroll), and throttles calls
  [code].
- `rewardedBreak(onStart)` resolves `success`. Grant the reward **only on `success === true`**. A rewarded break resets
  the interstitial timer.
- `rewardedBreak({ size })` exists but is undocumented. Keep the default: one video per reward [code].
- `isAdBlocked()` always returns false in the current build, so don't use it [code].
- `measure(category, what, action)` records funnels:
  - Progress actions: `start`, `complete`, `fail`. Exposure actions: `visible`, `interact`.
  - No `/` or `^` in names.
  - Ad events are tracked automatically [src] https://developers.poki.com/guide/game-events
- `getLanguage()` returns a base code like `en` [src] https://developers.poki.com/guide/localization
- `movePill(topPercent, topPx)` defaults to `(0, 24)`. The pill is 46×62 px below 1211 px wide, 92×64 above, and never
  below 50% of the height.
- Any outbound link goes through `openExternalLink(url)`.
- `shareableURL` / `getURLParam` add a `gd` prefix on poki.com.

### Ad UX rules [src] requirements

- Mute game audio during ads. No ad timers or cooldowns of our own.
- **Rewarded buttons:**
  - A standard "Continue" button always shows **at the same time**, **equal or larger**, **beside or above** the
    rewarded button.
  - The rewarded button is **never green** and shows a 🎬 icon.
- Rewarded ads stay optional and never gate core progress. No pushy popups. Celebrate the reward, and never grant it
  twice.
- With an ad blocker the game stays playable but grants no reward. Don't show our own "ad blocked" message.
- Release pointer lock before any ad. The Inspector flags `pointer-lock-during-ad` [code].
- **Soft-release benchmark:** at least 1 ad per daily active user, mixing midrolls and rewarded
  [src] https://developers.poki.com/guide/release-process
- One currency only.

### Technical

- **Size:** ≤5 MB initial, ≤8 MB total. Three.js is about 122 KB with Brotli [src] https://developers.poki.com/guide/web-engine
  - Every extra MB loses a couple of percent of players.
  - Stickman Hook: 40 MB loaded in 29.5 s with 50% C2P; 6 MB loaded in 3.7 s with 72%.
  - Cannon Clash: 2.4 MB, 81% C2P; Draco shrank a GLB from 3.88 MB to 387 KB
    [src] https://poki.com/blog/how-we-made-cannon-clash-load-fast-and-boosted-conversion
- **Loading:** show a progress bar and load progressively. Players leave after about 10 s.
- **Targets:** C2P 65%+ (70% solid, 80% exceptional), average playtime 5+ minutes
  [src] https://developers.poki.com/guide/reading-results
- **External resources:** bundle everything, including fonts. No CDNs, splash screens or outgoing links. A studio logo on
  the loader is fine.
- **Saving:** wrap `localStorage` in try/catch (incognito). Poki syncs localStorage to its cloud.
- **Input capture:**
  - `preventDefault` arrows and Space on keydown, and `wheel` with `{passive:false}`.
  - The SDK sets `touch-action:none` on canvases.
  - **[infer]** Block `contextmenu` on the canvas.
- **Pause:** ESC (or Space) must pause and resume in keyboard games, with the matching SDK events.
- **Devices:**
  - Desktop, mobile and tablet; force mobile controls on tablets.
  - Proportional scale sizes 640×360, 836×470 and 1031×580.
  - **Every game must work in portrait.** Poki's QA tests it, and asking players to rotate kills conversion
    [src] https://poki.com/blog/building-web-browser-games-2026
- **Content:** all ages. No graphic violence, wounds or body fluids. Use bloodless hits: sparks, knockback, ragdolls,
  coin bursts [src] https://developers.poki.com/guide/content-player-safety
- **Localisation:** EFIGS + Turkish first, then CJK, then pt-BR and Russian. Let layouts grow.
- **QA tools:**
  - **Poki Inspector** (inspector.poki.dev): checklist, event log, size, a mobile QR code, scaling tests, warnings.
  - **Playtests:** 10 recordings. Watch for quits in the first minute.
  - **Web Fit:** about 10k players, scored on click-through rate, time on page and C2P.
- **Player devices** (Poki report, 2026-11-04):

  | | Values |
  |---|---|
  | OS | Windows 46.8%, Android 29.8%, iOS 12.1% |
  | Aspect ratio | 16:9 44.9%, 6:13 12.4%, 9:20 9.5% |
  | CPU | 4 cores 34%, 2 cores 7% |
  | Graphics | WebGL2 94.2% |
  | Audio | MP3 100%, Opus 99.1% |

  **[infer]** Use WebGL2, MP3 or Opus audio, and a pixel-ratio cap of 1.5–2. Test 9:20 portrait and 16:9.

### Poki onboarding advice [src] https://developers.poki.com/guide/easy-access

- Skip splash, title and level-select screens.
- Make onboarding safe: no deaths.
- Teach with visuals and gestures, and add buttons gradually.
- Players didn't read a "space" text label, but a keyboard image with the key lit worked.
- Cannon Clash cut its intro, told its story in non-blocking bubbles, and introduced systems wave by wave.
- **"Session 0":**
  - About 3-minute loops and about an hour of content.
  - Celebrated milestones, short- and long-term goals, gradual difficulty, no downtime.
  - WASD and arrows plus Space and Enter work in menus [src] https://developers.poki.com/guide/engagement

## B. UI guidelines

- **Touch targets:**
  - Apple: 44×44 pt for frequent controls. Android: 48×48 dp.
  - WCAG 2.5.8: at least 24×24 px.
  - Game Accessibility Guidelines: about 0.96 cm on phones.
  - **[infer]** Our sizes: UI buttons ≥48 CSS px; fire and ability buttons 64–88 px with ≥12 px gaps.
- **Accuracy and reach:**
  - Touch accuracy is about 7 mm in the centre and 12 mm in the corners, so corner buttons need to be bigger
    (https://www.uxmatters.com/mt/archives/2017/07/design-for-fingers-touch-and-people-part-3.php).
  - Frequent controls go near the thumbs, outside the move and look areas. Secondary controls (pause) go at the top.
- **Safe areas:**
  - `env(safe-area-inset-*)` needs `viewport-fit=cover`.
  - Inside Poki's iframe the insets are probably 0 in Chromium. Use `max(env(...), 12px)` margins.
  - Use `100dvh` or a ResizeObserver, not `100vh`.
  - Keep Poki's pill area clear in the top corners.
- **Responsive HUD:**
  - Anchor to corners and edges, and scale by the short side.
  - Build separate portrait and landscape layouts rather than stretching one.
  - Keep the centre for the action.
- **Text:**
  - Xbox guideline: at least 18 px at 1080p.
  - Outline text over busy scenes.
  - Contrast 4.5:1 for small text, 3:1 for large.
- **Action HUD:**
  - Persistent info at the edges; temporary essential prompts near the player's focus.
  - A directional damage indicator plus audio.
  - Never signal by colour alone; locked items get a lock icon and text
    (https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/103).
- **Game Accessibility Guidelines basics** (https://gameaccessibilityguidelines.com/basic/):
  - Contrast and simple language.
  - Large, well-spaced controls.
  - Separate music and effects volumes.
  - Interactive tutorials; play without menu layers.
  - Remembered settings.
  - Aim assist, and no forced button mashing.
- **Shop:**
  - One or two prominent buttons per view.
  - Unaffordable items are dimmed and show the missing amount with a coin icon.
  - "Show the locks before giving the keys" (https://celiahodent.com/gamers-brain-ux-onboarding/).
  - Celebrate purchases.
  - Measure `('button','shop','visible'|'interact')`.

## C. Onboarding

- **Apple:** players learn best by doing. Put tips near the UI, and don't repeat skipped tutorials
  (https://developer.apple.com/design/human-interface-guidelines/onboarding).
- **Hodent:**
  - At most about 3 new things at a time.
  - No punishing states in onboarding.
  - Teach the *why*.
  - Repeat in varied contexts (still targets, then moving, then hidden).
  - Reminders pinned in the HUD.
- **Andersen et al., CHI 2012** (45k players): tutorials matter most in complex games, and context-sensitive help helps.
- **World 1-1:** the first enemy is harmless and readable, and the layout makes you do the thing.
  - **[infer]** Our wave 1: a few slow peasants walking straight at you, with the first coins flying into the HUD.
- **Roblox:**
  - Visual hints stay until the step is done.
  - Teach a system when it is first met.
  - Timed hints only for players who are stuck (most act within 10 s, so the hint fires at 11 s).
- **Voodoo:** players should understand the game in a few seconds; a double-joystick shooter doesn't work one-handed.
- **[infer] The first 60 seconds:**
  1. Straight into battle 1, with `gameplayStart` on the first input.
  2. Only the move hint at first.
  3. A taste of power.
  4. No death in battle 1.
  5. A first shop visit with one obvious affordable buy.
  6. Abilities, rewarded offers and new enemies spread across later waves and battles.
  7. Device-specific key and gesture icons, and no text walls.

## D. Controls

- **Apple HIG for games:**
  - Move on the left, camera on the right.
  - The stick spawns where the thumb lands.
  - Pan the camera by direct touch, not a second stick.
  - Fade the controls when idle.
  - Show visible press states.
  - Keep clear of the home indicator (https://developer.apple.com/design/human-interface-guidelines/game-controls).
- **Floating sticks:**
  - A dynamic stick centred on the touch point and hidden on release beats a fixed one
    (https://www.gamedeveloper.com/design/a-guide-to-ios-twin-stick-shooter-usability).
  - A floating stick also needs fewer glances.
- **Auto-fire patterns:**
  - CoD Mobile Simple Mode fires while the crosshair is on a target.
  - Brawl Stars: tap to auto-aim, drag to aim.
  - War Robots uses "sticky" target scoring (aim, distance, HP, cover)
    (https://gamedeveloper.com/design/how-to-create-a-fair-auto-aiming-system-in-a-robot-shooter-).
- **Pointer lock:**
  - Poki's iframe allows it [code].
  - It needs a user gesture.
  - Chrome blocks re-locking for about 1–2 s after Esc.
  - Treat losing the lock as pause, re-lock on Resume, and exit the lock before ads.
- **Keys:** show a keyboard picture with the key lit, not a text label.
