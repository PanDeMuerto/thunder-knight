# What to reuse from our earlier Poki games

Surveyed 2026-11-04 for Thunder Knight. The two closest projects are `C:\PROJECTS\WEB\Primal Valley` (PV, the newest
copy of every shared module) and `C:\PROJECTS\WEB\Scrap Express` (SE, the over-the-shoulder/first-person shooter with
touch auto-fire). Both use TypeScript, Three.js and Vite with the same skeleton.

## Skeleton

**`src/` folders** (start from PV's copy):
- `platform/`: the only code that touches the SDK.
- `save/`: the only code that touches storage.
- `content/`: data only. Tuning, tables, `ads.ts`, `strings/`.
- `state/`: rules as plain functions, with tests.
- `game/`: the game loop and its systems.
- `world/`
- `render/`: `stage.ts` (renderer, sizing, UI scale, quality tiers), `post.ts`, `effects.ts`.
- `audio/`, `input/`, `ui/`, `core/`

**Other files:**
- `tests/` (vitest), `tools/` (`qa/`, `blender/`, `audio/`, `check-size.mjs`, `package.py`).
- `.github/workflows/ci.yml`.
- `index.html`: `#game > canvas#view, #touch-surface, #ui, #loading`.
- `vite.config.ts`:
  - defines `__PLATFORM__` (`poki`/`web`/`dev`) and `__APP_VERSION__`
  - injects the Poki SDK script only in `--mode poki`
  - sets `base: './'`, alias `@` → `src`

**Dependencies:**
- three ^0.187, vite ^8.3, typescript ~6.0, vitest ^5, vite-node, playwright ^1.64, eslint 10, typescript-eslint,
  prettier.
- Node 22 or newer.
- `tsconfig` is strict, with `noUncheckedIndexedAccess` and `verbatimModuleSyntax`.

## Platform (Poki SDK)

- **Adapter interface:** `platform/types.ts` `PlatformAdapter` has `ads`, `init`, `loadingFinished`,
  `gameplayStart/Stop`, `commercialBreak(onStart)`, `rewardedBreak(onStart)`, `language`, `movePill` and `measure`.
- **Picking the adapter:** `createPlatform.ts` chooses by `__PLATFORM__`. The dev adapter is a dynamic import, so it
  never ships.
- **`pokiAdapter.ts`:** optional chaining everywhere, so a blocked SDK is safe.
- **`webAdapter.ts`:** the itch build, with no ads.
- **`devAdapter.ts`** (the fake ad portal):
  - logs every call to `window.__platformEvents`
  - shows a black overlay for 700/900 ms
  - `__adMode='fail'` simulates a blocked ad; `?noads` and `?lang=` work as URL flags
- **`platformSession.ts`** enforces the rules:
  - no duplicate start or stop, and no events during an ad
  - no commercial break while playing
  - a rewarded break stops gameplay first and resolves true only on `=== true`
  - ad hooks run in try/finally
- **Ad hooks:** `onAdStart` disables input (clearing held keys), silences audio and sets mode to busy. `onAdEnd`
  restores them.
- **`ads.ts`:** placements are switches, for example `commercialEveryNthResume`, `noneBeforeFirstX`, and one entry per
  rewarded offer.
- **Rules carried over:**
  - No ad timers.
  - The standard button comes first and is equal or larger.
  - Reward buttons are never green and always show 🎬.
  - One currency.

## Input

- **Origin:** `input/input.ts`, PV's version adapted from SE.
- **Touch:**
  - A floating stick on the left half, below 42% of the height, radius 58 and dead zone 0.12. It follows the thumb
    past 1.4× its radius.
  - The right half is drag-to-look, scaled by the short edge.
  - Buttons use pointer capture.
- **Desktop:**
  - WASD and arrows, mouse look.
  - The first click locks the pointer (and doesn't fire). After 400 ms with no lock, it falls back to drag-look.
  - Losing the lock means pause.
  - The first mouse move is ignored and deltas are clamped.
  - Wheel, Space and arrows get `preventDefault`. Held keys reset on blur.
- **Switching devices:** `touchMode` starts from `(pointer: coarse)`, then switches with the last device used, firing
  `onDeviceChange`.
- **SE `game/aimAssist.ts`**, modelled on Fallout 3's console assist:
  - picks the target nearest the crosshair, with a line-of-sight check
  - friction (slower look near a target)
  - magnet on touch (a gentle pull, dropped when it would fight the player)
  - shots bend toward the target inside a cone
- **SE aim tuning (`AIM`):**
  - touch: cone 6°, friction 0.55, magnet 14° at 25°/s, auto-fire after 0.12 s on target
  - mouse: cone 3°, no magnet
- **SE portrait:** the crosshair sits at 42% of the height (`CAMERA.portraitCrosshair`, applied through a view offset).
- **QA fake lock:** `tools/qa/fake-lock.mjs` fakes pointer lock in every Playwright tool, so QA never takes the owner's
  mouse.

## HUD and UI

- **Rendering:** DOM over the canvas. Every size is `calc(N * var(--s) * 1px)`.
- **`--s`** is set from the short edge: min 0.92, max 1.25 on phones, up to 1.9 on big screens.
- **Layout classes:** `is-portrait` and `is-touch`, with `--safe-*` variables for safe areas.
- **HUD size setting:** 1 to 1.5, capped by the room each screen has.
- **`qa:hud`** checks:
  - 19 sizes, from p320×568 to k3840×2160, including l568×320 and d640×360
  - every card filled with its longest string
  - overlaps, off-screen elements, clipped text, touch targets under 44 px, and Poki's 46×62 pill area in both top
    corners

## Onboarding

- **PV `docs/onboarding.md` principles:**
  - Play within seconds; no title screen.
  - Teach by doing; never end a step on an OK button.
  - One thing at a time, taught just in time and in place.
  - Show, don't tell: a key cap or hand plus at most four words.
  - Always a goal; help when stuck; safe to fail; never repeat.
- **PV `game/onboarding.ts`:**
  - The `OnboardingHost` interface and the `ORDER` of step ids.
  - `enter(step)` sets each step up; `update(dt, events)` completes it.
  - `measure` start/complete, and `seenLessons` in the save.
- **SE:** numeric saved steps (append only), `STUCK_SECONDS 6` before a hint escalates, and `hasSeen`/`markSeen` for
  one-off lessons.
- **Prompts:** `Hud.showPrompt({keys, hand, text})`. Key caps on desktop; on touch, a hand that drags left, drags right
  or taps.

## Saves, text, audio, quality

- **Saves (`save/saveStore.ts`):**
  - `SAVE_VERSION` with a `MIGRATIONS` map; null for garbage or future saves; defaults fill missing fields.
  - Settings live under a separate key.
  - A `poki_ignore` probe key checks storage without syncing.
  - SE keeps one fixture per released version in `tests/fixtures/saves/`.
- **Text:**
  - `content/strings/en.ts` is the source, typed `StringKey`.
  - Other languages are `Record<StringKey,string>`.
  - `t(key, params)` falls back to English.
  - A test checks every key and placeholder in every language.
- **Audio:** Web Audio `GameAudio`:
  - typed sound names
  - master, effects and ambience gains
  - positional `play`
  - `unlock()` on first input
  - `silence()` for ads and pause
- **Quality tiers:**
  - Three tiers: high, low and lowest.
  - `startsLowEnd()` checks for touch, 4 cores or fewer, or 3 GB memory or less.
  - A benchmark after warm-up, then a check every 3 s that steps down a tier below 40 fps.
- **`perf.mjs`:** CPU throttling and draw-call count. Budget: 150 draw calls and 30 fps at 4× CPU.

## Packaging and docs

- **Size check:** `check-size.mjs` runs on build. Gzip limits are 5 MB initial and 8 MB total; `assets/deferred/` and
  `assets/audio/` don't count as initial.
- **Zip:** `tools/package.py poki|itch` writes `release/<name>-<version>-<target>.zip` with `index.html` at the root,
  then re-reads the zip to verify it.
- **Testing the zip:** `run-build.mjs` serves it the way Poki does:
  - inside an iframe on a scrolling page, with a stand-in SDK
  - checks that no outside requests are made and keys don't scroll the page
  - checks that it plays with the SDK blocked and with storage blocked
  - `--real-sdk` loads the real SDK
- **CLAUDE.md:**
  - Commands, each with when to run it.
  - Rules:
    - SDK only in `platform/`, storage only in `save/`
    - content in `content/`, rules in `state/`
    - a migration for every save change
    - the QA fake lock
    - assets checked by eye
    - onboarding per spec
    - a calm look
    - the owner's decisions in vision §6
    - CHANGELOG in players' words
- **Docs:** `vision.md`, `gdd.md`, `tech-design.md`, `onboarding.md`, `milestones.md`, `asset-pipeline.md`,
  `release-checklist.md` and `research/`.
- **Milestones:** status ⬜/🟨/✅, dated status blocks listing Built and Exit met, and every milestone ending in an
  **Exit** list.
