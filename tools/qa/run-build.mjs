// Tests a packaged zip as its portal will serve it (docs/milestones.md M5): unpacked onto a plain web server, inside
// an iframe on a page that scrolls. Run `npm run package` (or `package:itch`) first.
// Usage: node tools/qa/run-build.mjs [--real-sdk] [--target=itch]
//
// - A stand-in SDK records every call, so the event order can be checked offline.
// - Every request is logged: nothing may leave the game's own folder except Poki's SDK script.
// - Arrows, space, page keys and the wheel must not scroll the page around the game.
// - The game must load and play with the SDK blocked (an ad blocker) and with storage blocked (incognito).
// - A phone in portrait gets the touch controls.
// - `--real-sdk` also loads Poki's real SDK from its CDN.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { fakePointerLock } from './fake-lock.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
const TARGET = process.argv.find((a) => a.startsWith('--target='))?.slice(9) ?? 'poki';
const ITCH = TARGET === 'itch';
const zip = join(ROOT, 'release', `thunder-knight-${version}-${TARGET}.zip`);
if (!existsSync(zip)) {
  console.log(`${zip} is missing. Run \`npm run package\` first.`);
  process.exit(1);
}
const SITE = join(ROOT, 'qa-output', 'build-test');
rmSync(SITE, { recursive: true, force: true });
mkdirSync(join(SITE, 'game'), { recursive: true });
execFileSync('python', ['-I', '-c', 'import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', zip, join(SITE, 'game')]);

const SDK_URL = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js';
// A stand-in for Poki's SDK: records calls in the game's window; ads resolve straight away.
const MOCK_SDK = `
  window.__poki = [];
  const log = (name, args) => window.__poki.push({ name, args: [...args], t: performance.now() });
  window.PokiSDK = {
    init() { log('init', arguments); return Promise.resolve(); },
    gameLoadingFinished() { log('gameLoadingFinished', arguments); },
    gameplayStart() { log('gameplayStart', arguments); },
    gameplayStop() { log('gameplayStop', arguments); },
    commercialBreak(onStart) { log('commercialBreak', arguments); onStart && onStart(); return Promise.resolve(); },
    rewardedBreak(onStart) { log('rewardedBreak', arguments); return Promise.resolve(false); },
    getLanguage() { return 'en'; },
    measure() { log('measure', arguments); },
    movePill() { log('movePill', arguments); },
  };`;
// The page around the game: tall enough to scroll, with the game in an iframe the size Poki uses on desktop.
const FRAME_PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>frame</title>
  <style>body { margin: 0; height: 3000px; background: #223; } iframe { display: block; margin: 40px; border: 0; }</style></head>
  <body><iframe id="g" src="/game/index.html" width="836" height="470" allow="autoplay; fullscreen; pointer-lock; gamepad"></iframe></body></html>`;

const missing = [];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  // The test page's own icon (the ad code Poki's SDK loads asks for it); on Poki that's poki.com's.
  if (url.pathname === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(FRAME_PAGE);
    return;
  }
  const file = normalize(join(SITE, decodeURIComponent(url.pathname)));
  if (!file.startsWith(SITE) || !existsSync(file) || statSync(file).isDirectory()) {
    missing.push(url.pathname);
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const ORIGIN = `http://localhost:${server.address().port}`;

const failures = [];
const check = (ok, message) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`);
  if (!ok) failures.push(message);
};
const browser = await chromium.launch({ channel: process.env.QA_BROWSER ?? 'chrome', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });

/** Opens the game. `sdk`: 'mock', 'blocked' or 'real'. Returns the page, its game frame and what it logged. */
async function open({ sdk = 'mock', framed = true, viewport = { width: 1000, height: 600 }, mobile = false, noStorage = false } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile });
  const page = await context.newPage();
  await page.addInitScript(fakePointerLock);
  if (noStorage) {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('Blocked', 'SecurityError');
        },
      });
    });
  }
  const requests = [];
  const errors = [];
  page.on('request', (r) => requests.push(r.url()));
  // The ad code Poki's SDK loads logs its own errors off Poki's domain; only the game's own count.
  page.on('response', (r) => r.status() >= 400 && r.url().startsWith(ORIGIN) && errors.push(`HTTP ${r.status()} ${r.url()}`));
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    const from = m.location().url ?? '';
    if (m.type() === 'error' && (!from || from.startsWith(ORIGIN))) errors.push(m.text().slice(0, 200));
  });
  if (sdk === 'mock' && !ITCH) await page.route(SDK_URL, (route) => route.fulfill({ contentType: 'text/javascript', body: MOCK_SDK }));
  if (sdk === 'blocked') await page.route(SDK_URL, (route) => route.abort('blockedbyclient'));
  const started = Date.now();
  await page.goto(framed ? `${ORIGIN}/` : `${ORIGIN}/game/index.html`);
  const frame = framed ? await (await page.$('#g')).contentFrame() : page.mainFrame();
  await frame.waitForSelector('#loading', { state: 'detached', timeout: 60000 }).catch(() => null);
  const loadSeconds = (Date.now() - started) / 1000;
  return { page, frame, requests, errors, loadSeconds, context };
}
const calls = (frame) => frame.evaluate(() => (window.__poki ?? []).map((c) => c.name));
const blank = async (page) => {
  const png = await page.screenshot();
  // A quick look at how varied the picture is: a blank or failed canvas is one flat colour.
  let min = 255;
  let max = 0;
  for (let i = 1000; i < png.length; i += 997) {
    min = Math.min(min, png[i]);
    max = Math.max(max, png[i]);
  }
  return max - min < 40;
};

// 1. In Poki's iframe with the stand-in SDK: loading, the event order, measures, requests, scrolling.
{
  const { page, frame, requests, errors, loadSeconds, context } = await open();
  check(loadSeconds < 10, `loads in ${loadSeconds.toFixed(1)} s (players leave after 10)`);
  let c = await calls(frame);
  if (ITCH) {
    const sdk = await frame.evaluate(() => typeof window.PokiSDK);
    check(sdk === 'undefined' && !requests.some((u) => /poki/i.test(u)), 'the itch build has no Poki SDK and asks nothing of Poki');
  } else {
    check(c[0] === 'init' && c.includes('gameLoadingFinished'), `init, then gameLoadingFinished (${c.filter((n) => n !== 'measure' && n !== 'movePill').join(' ')})`);
    check(!c.includes('gameplayStart') && !c.includes('commercialBreak'), 'no gameplayStart and no ad before the first input');
  }
  await page.waitForTimeout(1500);
  await page.mouse.click(40 + 418, 40 + 300);
  await page.waitForTimeout(400);
  c = await calls(frame);
  if (!ITCH) check(c.filter((n) => n === 'gameplayStart').length === 1, 'the first input starts gameplay, once');
  // Scrolling must stay inside the game.
  for (const key of ['ArrowDown', 'Space', 'PageDown', 'ArrowUp', 'End']) await page.keyboard.press(key);
  await page.mouse.move(40 + 418, 40 + 235);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(300);
  const scrolled = await page.evaluate(() => window.scrollY);
  check(scrolled === 0, `arrows, space, page keys and the wheel don't scroll the page around the game (scrollY ${scrolled})`);
  // Pause and resume.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const paused = await frame.isVisible('.card-pause');
  c = await calls(frame);
  check(paused && (ITCH || c.at(-1) === 'gameplayStop'), ITCH ? 'Escape pauses' : `Escape pauses and stops gameplay (${c.filter((n) => n !== 'measure').slice(-2).join(' ')})`);
  await frame.click('.card-pause .btn-main');
  await page.waitForTimeout(300);
  const resumed = !(await frame.isVisible('.card-pause'));
  c = await calls(frame);
  check(resumed && (ITCH || c.filter((n) => n !== 'measure').at(-1) === 'gameplayStart'), 'resuming goes back into the game');
  if (!ITCH) {
    check(!c.includes('commercialBreak') && !c.includes('rewardedBreak'), 'no ad in Battle 1');
    const measures = await frame.evaluate(() => (window.__poki ?? []).filter((x) => x.name === 'measure').map((x) => x.args));
    const bad = measures.filter((a) => a.length !== 3 || a.some((s) => typeof s !== 'string' || /[/^]/.test(s)));
    check(measures.length > 0 && bad.length === 0, `every measure has three plain strings (${measures.length} sent${bad.length ? `, bad: ${JSON.stringify(bad[0])}` : ''})`);
  }
  const outside = requests.filter((u) => !u.startsWith(ORIGIN) && (ITCH || u !== SDK_URL) && !u.startsWith('data:') && !u.startsWith('blob:'));
  check(outside.length === 0, `no requests outside the game's folder${ITCH ? '' : " except Poki's SDK"} (${outside.length ? outside[0] : `${requests.length} requests`})`);
  check(!(await blank(page)), 'the game draws a picture');
  check((await frame.evaluate(() => typeof window.__game)) === 'undefined', 'no development tools in the release build');
  check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
  await context.close();
}

// 2. An ad blocker removes the SDK: the game still loads and plays.
if (!ITCH) {
  const { page, frame, errors, context } = await open({ sdk: 'blocked' });
  const loaded = (await frame.$('#loading')) === null;
  await page.mouse.click(40 + 418, 40 + 300);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(800);
  await page.keyboard.up('KeyW');
  const real = errors.filter((e) => !/poki-sdk|ERR_BLOCKED|Failed to load resource/.test(e));
  check(loaded && !(await blank(page)), 'with the SDK blocked, the game still loads and draws');
  check(real.length === 0, `with the SDK blocked, no game errors${real.length ? `: ${real[0]}` : ''}`);
  await context.close();
}

// 3. Storage blocked (incognito, embedded): the game still loads.
{
  const { page, frame, errors, context } = await open({ noStorage: true });
  const loaded = (await frame.$('#loading')) === null;
  await page.mouse.click(40 + 418, 40 + 300);
  await page.waitForTimeout(500);
  check(loaded && !(await blank(page)), 'with storage blocked, the game still loads and draws');
  check(errors.length === 0, `with storage blocked, no errors${errors.length ? `: ${errors[0]}` : ''}`);
  await context.close();
}

// 4. A phone in portrait: full screen, the touch controls.
{
  const { page, frame, errors, context } = await open({ framed: false, viewport: { width: 390, height: 844 }, mobile: true });
  const touch = await frame.evaluate(() => document.querySelector('#game')?.classList.contains('is-touch'));
  check(touch === true, 'a phone gets the touch controls');
  check(!(await blank(page)), 'a phone in portrait draws the game');
  check(errors.length === 0, `on a phone, no errors${errors.length ? `: ${errors[0]}` : ''}`);
  await page.screenshot({ path: join(SITE, 'phone.png') });
  await context.close();
}

// 5. Optional: Poki's real SDK from its CDN.
if (process.argv.includes('--real-sdk') && !ITCH) {
  const { page, frame, errors, requests, context } = await open({ sdk: 'real' });
  const sdk = requests.includes(SDK_URL);
  const loaded = (await frame.$('#loading')) === null;
  const ready = await frame.evaluate(() => typeof window.PokiSDK?.gameplayStart === 'function');
  await page.mouse.click(40 + 418, 40 + 300);
  await page.waitForTimeout(800);
  check(sdk && ready && loaded, "with Poki's real SDK the game loads and the SDK is ready");
  const real = errors.filter((e) => !/favicon/.test(e));
  check(real.length === 0, `with Poki's real SDK, no errors${real.length ? `: ${real.join(' | ')}` : ''}`);
  if (missing.length) console.log(`     paths asked for that aren't in the build: ${[...new Set(missing)].join(', ')}`);
  await page.screenshot({ path: join(SITE, 'real-sdk.png') });
  await context.close();
}

await browser.close();
server.close();
console.log(failures.length ? `\n${failures.length} failed` : `\nAll checks passed (${zip.replace(ROOT, '')})`);
process.exit(failures.length ? 1 : 0);
