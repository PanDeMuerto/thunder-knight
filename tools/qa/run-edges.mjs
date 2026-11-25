// Edge cases (M11), in real time with pointer lock faked (it never takes the owner's mouse):
// - the tab hidden mid-wave: the game pauses (gameplayStop) and goes quiet; back, the pause card waits and stays quiet
//   until Resume
// - the tab hidden in a shop break and on the map: quiet while hidden, the sound back with the tab, no pause card
// - a desktop window resized mid-wave to a phone's shape and back: the canvas follows, the HUD stays on screen, the
//   wave goes on
// - a phone turned mid-shop, landscape to portrait and back: the shop stays open and on screen, Next wave clear of it
// - vibration: a buzz when hurt on a phone, none with Vibration off, none on a computer
// - Reduce motion: the UI's animations stop
// - no page errors
// Usage: npm run qa:edges (needs the dev server)
import { fakePointerLock } from './fake-lock.mjs';
import { launch } from './stepper.mjs';

const GAME = process.env.GAME_URL ?? 'http://localhost:5180/';
let failed = 0;
const check = (ok, label) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failed++;
};
const LESSONS = ['b1', 'move:desktop', 'aim:desktop', 'move:touch', 'aim:touch', 'grenade:desktop', 'grenade:touch', 'army', 'hero', 'swap:desktop', 'swap:touch', 'intro:peasant', 'intro:footman', 'intro:captain', 'intro:archer'];

const browser = await launch();

async function open(label, viewport, touch) {
  const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.addInitScript(fakePointerLock);
  // A hidden tab on demand: document.hidden and visibilityState follow window.__hidden.
  await page.addInitScript(() => {
    window.__hidden = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__hidden });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (window.__hidden ? 'hidden' : 'visible') });
    window.__setHidden = (hidden) => {
      window.__hidden = hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    };
    // Vibrations are recorded, not felt.
    window.__buzz = [];
    navigator.vibrate = (pattern) => {
      window.__buzz.push(pattern);
      return true;
    };
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(`${GAME}?battle=3`);
  await page.waitForFunction(() => window.__game?.battle && window.__game.crowd, null, { timeout: 60000 });
  await page.evaluate((lessons) => {
    const g = window.__game;
    g.state.seenLessons.push(...lessons);
    g.onFirstInput();
  }, LESSONS);
  return { context, page, errors, label };
}

const state = (page) =>
  page.evaluate(() => {
    const g = window.__game;
    const flow = (window.__platformEvents ?? []).map((e) => e.name).filter((n) => n === 'gameplayStart' || n === 'gameplayStop');
    return {
      mode: g.mode,
      phase: g.battle?.phase ?? null,
      wave: g.battle?.wave ?? null,
      paused: g.pause.open,
      quiet: g.audio.silenced,
      lastFlow: flow.at(-1) ?? null,
      portrait: document.getElementById('game').classList.contains('is-portrait'),
      shop: g.shop.isOpen,
      screen: g.screen,
    };
  });

/** The canvas matches the window, and every shown HUD piece (and the shop) lies on screen. */
const onScreen = (page) =>
  page.evaluate(() => {
    const W = innerWidth;
    const H = innerHeight;
    const canvas = document.querySelector('#view');
    const c = canvas.getBoundingClientRect();
    const out = [];
    for (const sel of ['.hud-gold', '.hud-top', '.hud-health', '.btn-pause', '.btn-next', '.shop', '.action-pad .btn']) {
      for (const node of document.querySelectorAll(sel)) {
        const r = node.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || getComputedStyle(node).visibility === 'hidden') continue;
        if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) out.push(`${sel} off screen`);
      }
    }
    const shop = document.querySelector('.shop');
    const next = document.querySelector('.btn-next:not(.is-hidden)');
    if (shop && next && window.__game.shop.isOpen) {
      const a = shop.getBoundingClientRect();
      const b = next.getBoundingClientRect();
      if (b.width > 0 && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) out.push('Next wave under the shop');
    }
    return { canvas: [Math.round(c.width), Math.round(c.height)], window: [W, H], problems: out };
  });

// 1. A desktop window: hidden mid-wave, then resized mid-wave.
{
  const { context, page, errors } = await open('desktop', { width: 1280, height: 720 }, false);
  await page.evaluate(() => {
    const g = window.__game;
    g.battle.nextWave();
    g.reveal.skip();
  });
  await page.waitForTimeout(1200);
  let s = await state(page);
  check(s.phase === 'wave' && s.mode === 'play' && s.lastFlow === 'gameplayStart', `desktop: a wave is on (${JSON.stringify(s)})`);
  await page.evaluate(() => window.__setHidden(true));
  await page.waitForTimeout(300);
  s = await state(page);
  check(s.mode === 'paused' && s.paused && s.quiet > 0 && s.lastFlow === 'gameplayStop', `desktop: hidden mid-wave pauses, stops gameplay and goes quiet (${s.mode}, quiet ${s.quiet}, ${s.lastFlow})`);
  await page.evaluate(() => window.__setHidden(false));
  await page.waitForTimeout(300);
  s = await state(page);
  check(s.mode === 'paused' && s.paused && s.quiet > 0, `desktop: back, the pause card waits, still quiet (${s.mode}, quiet ${s.quiet})`);
  await page.evaluate(() => window.__game.resume());
  await page.waitForTimeout(300);
  s = await state(page);
  check(s.mode === 'play' && s.quiet === 0 && s.lastFlow === 'gameplayStart', `desktop: Resume plays on with sound (${s.mode}, quiet ${s.quiet}, ${s.lastFlow})`);
  const before = s.wave;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  s = await state(page);
  let screen = await onScreen(page);
  check(s.portrait && s.phase === 'wave' && s.wave === before, `desktop: resized to a phone's shape mid-wave, portrait, the wave goes on (${JSON.stringify(s)})`);
  check(screen.canvas[0] === 390 && screen.canvas[1] === 844 && screen.problems.length === 0, `desktop: the canvas follows and the HUD stays on screen (${JSON.stringify(screen)})`);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(900);
  s = await state(page);
  screen = await onScreen(page);
  check(!s.portrait && screen.canvas[0] === 1280 && screen.problems.length === 0, `desktop: and back to 1280 × 720 (${JSON.stringify(screen)})`);
  const buzz = await page.evaluate(async () => {
    const g = window.__game;
    g.battle.hurtHero(5, g.hero.position.x + 3, g.hero.position.z);
    await new Promise((r) => setTimeout(r, 100));
    return window.__buzz.length;
  });
  check(buzz === 0, `desktop: no vibration on a computer (${buzz})`);
  const motion = await page.evaluate(async () => {
    const g = window.__game;
    g.setSettings({ ...g.settings, reducedMotion: true });
    await new Promise((r) => setTimeout(r, 50));
    const next = document.querySelector('.btn-next');
    const on = { cls: document.getElementById('game').classList.contains('is-reduced-motion'), duration: getComputedStyle(next).animationDuration };
    g.setSettings({ ...g.settings, reducedMotion: false });
    return on;
  });
  check(motion.cls && parseFloat(motion.duration) < 0.001, `desktop: Reduce motion stops the UI's animations (${JSON.stringify(motion)})`);
  check(errors.length === 0, `desktop: no page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
  await context.close();
}

// 2. A phone: hidden in a shop break, turned mid-shop, hidden on the map.
{
  const { context, page, errors } = await open('phone', { width: 844, height: 390 }, true);
  await page.evaluate(() => {
    const g = window.__game;
    g.battle.nextWave();
    g.reveal.skip();
  });
  await page.waitForTimeout(800);
  // Hurt in the wave: a buzz; then, past the moment's safety, hurt again with Vibration off: none.
  const buzz = await page.evaluate(async () => {
    const g = window.__game;
    const hit = () => g.battle.hurtHero(5, g.hero.position.x + 3, g.hero.position.z);
    hit();
    const on = window.__buzz.length;
    g.setSettings({ ...g.settings, vibration: false });
    await new Promise((r) => setTimeout(r, 2500));
    g.battle.invulnerable = 0;
    hit();
    const off = window.__buzz.length - on;
    g.setSettings({ ...g.settings, vibration: true });
    return { on, off, pattern: window.__buzz[0] };
  });
  check(buzz.on === 1 && buzz.off === 0, `phone: a short buzz when hurt, none with Vibration off (${JSON.stringify(buzz)})`);
  await page.evaluate(() => {
    const g = window.__game;
    g.battle.phase = 'break';
    g.onPhase('break');
    g.openShop();
  });
  await page.waitForTimeout(800);
  let s = await state(page);
  check(s.shop && s.phase === 'break', `phone: the shop is open in a break (${JSON.stringify(s)})`);
  await page.evaluate(() => window.__setHidden(true));
  await page.waitForTimeout(300);
  s = await state(page);
  check(s.mode === 'play' && !s.paused && s.shop && s.quiet > 0, `phone: hidden in the shop goes quiet, no pause card, the shop stays (${s.mode}, quiet ${s.quiet})`);
  await page.evaluate(() => window.__setHidden(false));
  await page.waitForTimeout(300);
  s = await state(page);
  check(s.quiet === 0, `phone: back, the sound returns (quiet ${s.quiet})`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  s = await state(page);
  let screen = await onScreen(page);
  check(s.portrait && s.shop, `phone: turned to portrait mid-shop, the shop stays open (${JSON.stringify(s)})`);
  check(screen.problems.length === 0 && screen.canvas[0] === 390, `phone: the shop and HUD on screen, Next wave clear of the shop (${JSON.stringify(screen)})`);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(900);
  s = await state(page);
  screen = await onScreen(page);
  check(!s.portrait && s.shop && screen.problems.length === 0, `phone: and back to landscape (${JSON.stringify(screen)})`);
  await page.evaluate(() => {
    const g = window.__game;
    g.closeShop(false);
    g.showMap(3);
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__setHidden(true));
  await page.waitForTimeout(300);
  s = await state(page);
  check(s.screen === 'map' && s.quiet > 0 && !s.paused, `phone: hidden on the map goes quiet (${s.screen}, quiet ${s.quiet})`);
  await page.evaluate(() => window.__setHidden(false));
  await page.waitForTimeout(300);
  s = await state(page);
  check(s.quiet === 0, `phone: back on the map, the sound returns (quiet ${s.quiet})`);
  check(errors.length === 0, `phone: no page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
  await context.close();
}

await browser.close();
console.log(failed ? `\n${failed} edge checks failed` : '\nAll edge checks passed');
process.exit(failed ? 1 : 0);
