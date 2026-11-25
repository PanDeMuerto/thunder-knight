// Shared setup for the review tools (shots, record): opens the game at a screen size with pointer lock faked (it never
// takes the owner's mouse), stops the game's own loop, and exposes `window.__step(dt)` so every picture comes from a
// known number of exact frames. Scenes run inside the page with the game as `g`.
import { chromium } from 'playwright';
import { fakePointerLock } from './fake-lock.mjs';

export const GAME = process.env.GAME_URL ?? 'http://localhost:5180/?nodev';

/** Screens named by kind and width: d = desktop, l = touch landscape, p = touch portrait, t = tablet. */
export const SCREENS = {
  d1280: { width: 1280, height: 720, touch: false },
  d800: { width: 800, height: 560, touch: false },
  d1920: { width: 1920, height: 1080, touch: false },
  /** Square, for Poki's thumbnails and hover video (M12). */
  sq1080: { width: 1080, height: 1080, touch: false },
  d1024: { width: 1024, height: 768, touch: false },
  l844: { width: 844, height: 390, touch: true },
  l667: { width: 667, height: 375, touch: true },
  p390: { width: 390, height: 844, touch: true },
  p360: { width: 360, height: 640, touch: true },
  t768: { width: 768, height: 1024, touch: true },
};

export async function launch() {
  return chromium.launch({
    channel: process.env.QA_BROWSER ?? 'chrome',
    headless: true,
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'],
  });
}

/**
 * A page at a screen, with the loop frozen. `__step(dt)` advances one frame; `__frames(n, dt)` many. The first input
 * has been given (crosshair shown, gameplay started), so scenes start in play.
 */
export async function openStepped(browser, screenName, label = screenName) {
  const screen = SCREENS[screenName];
  if (!screen) throw new Error(`Unknown screen ${screenName}. Known: ${Object.keys(SCREENS).join(', ')}`);
  const context = await browser.newContext({
    viewport: { width: screen.width, height: screen.height },
    hasTouch: screen.touch,
    isMobile: screen.touch,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.addInitScript(fakePointerLock);
  const errors = [];
  page.on('pageerror', (e) => {
    errors.push(e.message);
    console.error(`[${label}] page error: ${e.message}`);
  });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    errors.push(m.text());
    console.error(`[${label}] ${m.text()}`);
  });
  await page.goto(GAME);
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 60000 });
  // The later regions' pieces and models (M11) come after Battle 1: scenes may start any battle directly, so fetch
  // them now and wait.
  await page.evaluate(() => window.__game.startLater());
  await page.addStyleTag({ content: '#loading { display: none !important; }' });
  await page.evaluate(`(() => {
    const g = window.__game;
    const proto = Object.getPrototypeOf(g);
    g.update = () => {};
    window.__step = (dt) => proto.update.call(g, dt);
    window.__frames = (n, dt = 1 / 60) => { for (let i = 0; i < n; i++) proto.update.call(g, dt); };
    g.onFirstInput();
  })()`);
  return { context, page, errors, screen };
}
