// The Battle 1 autopilot (milestones M4 exit): a new player's first battle with real input, on desktop and on a touch
// phone in portrait. It plays the onboarding script step by step, then checks:
// - every tutorial measure in order (onboarding §7), start before complete, the desktop-only `shoot` step only there
// - Battle 1's start and complete measures, and the first map view's Fight! starting Battle 2
// - Poki: no gameplayStart before the first input, starts and stops alternate, no ads at all in Battle 1
// - no console errors
// Real keys, clicks, touches and drags; the camera is turned by script (as a player moving the mouse or dragging
// would). Pointer lock is faked: it never takes the owner's mouse. Game time runs 3× (`?speed=3`, dev only).
// Needs `npm run dev` (port 5180). Usage: node tools/qa/run-qa.mjs [--only=desktop|touch] [--shots]
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from './stepper.mjs';
import { fakePointerLock } from './fake-lock.mjs';

const GAME = process.env.GAME_URL ?? 'http://localhost:5180/?nodev&speed=3';
const OUT = fileURLToPath(new URL('../../qa-output/qa/', import.meta.url));
const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const shots = args.includes('--shots');
mkdirSync(OUT, { recursive: true });

const failures = [];
const check = (ok, message) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`);
  if (!ok) failures.push(message);
};

const ORDER_DESKTOP = ['move', 'aim', 'shoot', 'gold', 'mob', 'truck', 'buy', 'nextwave', 'captain', 'map'];
const ORDER_TOUCH = ORDER_DESKTOP.filter((s) => s !== 'shoot');

const browser = await launch();

async function run(device) {
  const touch = device === 'touch';
  const context = await browser.newContext(
    touch
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }
      : { viewport: { width: 1280, height: 720 } },
  );
  const page = await context.newPage();
  await page.addInitScript(fakePointerLock);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
  await page.goto(GAME);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__game?.onboarding, null, { timeout: 60000 });
  // The player sees the field once the loading screen is done (the models load first).
  await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('is-done'), null, { timeout: 60000 });
  await page.waitForTimeout(400);
  const cdp = await context.newCDPSession(page);
  const sleep = (ms) => page.waitForTimeout(ms);
  const step = () => page.evaluate(() => window.__game.onboarding.step ?? 'none');
  const events = () => page.evaluate(() => (window.__platformEvents ?? []).map((e) => e.name));
  // After the step's gap and the prompt's fade-in, so the picture shows the new step's prompt.
  const shot = async (name) => {
    if (!shots) return;
    await sleep(700);
    await page.screenshot({ path: `${OUT}${device}-${name}.png` });
  };
  const label = (s) => `${device}: ${s}`;

  async function waitStep(names, timeout = 60000, during) {
    const want = [].concat(names);
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const s = await step();
      if (want.includes(s)) return s;
      if (during) await during();
      await sleep(60);
    }
    return null;
  }

  // Touch: a finger held on the move stick (lower left), pushing forward.
  let stickDown = false;
  async function stick(on) {
    if (on === stickDown) return;
    stickDown = on;
    const x = 90;
    const y = 700;
    if (on) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 7 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 50, id: 7 }] });
    } else {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
  }
  /** A real tap or click on an element's centre (a breathing button is never "stable" to Playwright). */
  async function press(selector) {
    const box = await page.locator(selector).first().boundingBox();
    if (!box) throw new Error(`${selector} is not on screen`);
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    if (touch) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
  }
  async function move(on) {
    if (touch) await stick(on);
    else if (on) await page.keyboard.down('KeyW');
    else await page.keyboard.up('KeyW');
  }

  /** Turns to face a point and walks there with real keys (or the stick). */
  async function walkTo(x, z, within, until) {
    await move(true);
    const start = Date.now();
    let reached = false;
    while (Date.now() - start < 40000) {
      const d = await page.evaluate(
        ([tx, tz]) => {
          const g = window.__game;
          const p = g.hero.position;
          g.rig.yaw = Math.atan2(-(tx - p.x), -(tz - p.z));
          return Math.hypot(tx - p.x, tz - p.z);
        },
        [x, z],
      );
      if (d < within || (until && (await until()))) {
        reached = true;
        break;
      }
      await sleep(50);
    }
    await move(false);
    return reached;
  }

  /** Turns toward the nearest enemy (the captain first): what a player aiming would do. Returns the angle left. */
  const aimNearest = () =>
    page.evaluate(() => {
      const g = window.__game;
      const b = g.crowd.bodies;
      const h = g.hero.position;
      let t = -1;
      let best = 45;
      for (let i = 0; i < b.count; i++) {
        if (!b.alive[i]) continue;
        const d = Math.hypot(b.x[i] - h.x, b.z[i] - h.z) - (b.role[i] === 2 ? 100 : 0);
        if (d < best) {
          best = d;
          t = i;
        }
      }
      if (t < 0) return 99;
      const e = g.stage.camera.position;
      const dx = b.x[t] - e.x;
      const dz = b.z[t] - e.z;
      const yaw = Math.atan2(-dx, -dz);
      const pitch = Math.atan2(b.aimHeight(t) - e.y, Math.hypot(dx, dz));
      const dYaw = Math.atan2(Math.sin(yaw - g.rig.yaw), Math.cos(yaw - g.rig.yaw));
      g.rig.yaw += dYaw * 0.6;
      g.rig.pitch += (pitch - g.rig.pitch) * 0.6;
      return (Math.abs(dYaw) * 180) / Math.PI;
    });

  /** Fights until the battle leaves its wave: aims, and on desktop holds the mouse button while on target. */
  async function fight(until, timeout = 90000) {
    const start = Date.now();
    let down = false;
    while (Date.now() - start < timeout) {
      if (await until()) break;
      const left = await aimNearest();
      if (!touch) {
        const want = left < 2;
        if (want && !down) await page.mouse.down();
        if (!want && down) await page.mouse.up();
        down = want;
      }
      await sleep(40);
    }
    if (down) await page.mouse.up();
  }
  const phase = () => page.evaluate(() => window.__game.battle?.phase ?? 'none');

  // 0. Boot: straight into Battle 1, nothing sent to Poki before the first input.
  check((await step()) === 'move', label(`a new player starts on the move step (${await step()})`));
  check(!(await events()).includes('gameplayStart'), label('no gameplayStart before the first input'));
  // The prompt comes with the first frames, which can take a moment on a cold dev server (shaders compiling).
  const promptShown = await page
    .waitForFunction(() => document.querySelector('.prompt')?.classList.contains('is-shown'), null, { timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  check(promptShown, label('the Move prompt shows'));
  const hiddenHud = await page.evaluate(() => ['.hud-gold', '.hud-banner', '.hud-health'].every((s) => document.querySelector(s)?.classList.contains('is-veiled')));
  check(hiddenHud, label('the HUD starts nearly empty (gold, banner and health hidden)'));
  await shot('01-move');

  // 1. Move: the first input (a click on desktop, the stick on touch), then walk up to the gold ring.
  if (!touch) await page.mouse.click(640, 400);
  const ring = await walkTo(1.5, -7, 1.6, async () => (await step()) !== 'move');
  check(ring, label('walking into the gold ring passes Move'));
  check((await events()).includes('gameplayStart'), label('the first input starts gameplay'));

  // 2–4. Aim at the scout (desktop then shoots; touch auto-fires), his gold flies in.
  check((await waitStep('aim', 5000)) === 'aim', label('the Aim step starts with the scout'));
  await shot('02-aim');
  await fight(async () => !['aim', 'shoot'].includes(await step()), 30000);
  const afterScout = await waitStep(['gold', 'mob'], 15000, () => aimNearest());
  check(!!afterScout, label(`the scout goes down and his gold flies in (${afterScout})`));
  check((await waitStep('mob', 15000)) === 'mob', label('the mob comes over the hill'));
  await shot('03-mob');

  // 5. The mob: fight until the wave is cleared.
  await fight(async () => (await phase()) === 'break');
  check((await waitStep('truck', 10000)) === 'truck', label('wave 1 cleared: Go to the truck'));
  await shot('04-truck');

  // 6–7. Walk to Rosie's ring; the shop opens with only the pistol; buy it with a real click or tap.
  const { x, z } = await page.evaluate(() => ({ x: 7, z: 2.2 }));
  await walkTo(x, z, 1.2, async () => (await step()) !== 'truck');
  check((await waitStep('buy', 8000)) === 'buy', label('walking into the ring opens the shop'));
  const cards = await page.evaluate(() => [...document.querySelectorAll('.shop-card')].map((c) => c.dataset.card));
  check(cards.length === 1 && cards[0] === 'gun:pistol', label(`the first shop shows only the pistol (${cards})`));
  await shot('05-buy');
  const buy = '.shop-card[data-card="gun:pistol"] .shop-buy';
  const before = await page.evaluate(() => ({ gold: window.__game.state.gold, card: document.querySelector('.shop-card')?.className }));
  await press(buy);
  const bought = (await waitStep('nextwave', 6000)) === 'nextwave';
  const after = bought ? '' : await page.evaluate(() => `, now ${window.__game.onboarding.step}, gold ${window.__game.state.gold}, shop ${window.__game.shop.isOpen ? 'open' : 'shut'}`);
  check(bought, label(`buying pistol ★2 passes Buy${bought ? '' : ` (gold ${before.gold}, card "${before.card}"${after})`}`));
  await shot('06-next');

  // 8. Next wave: Enter on desktop, the button on touch.
  await sleep(300);
  if (touch) await press('.btn-next');
  else await page.keyboard.press('Enter');
  check((await waitStep('wave2', 6000)) === 'wave2', label('Next wave starts wave 2'));

  // 9–10. Wave 2, the optional break, Next wave again.
  await fight(async () => (await phase()) === 'break');
  check((await waitStep('break2', 10000)) === 'break2', label('wave 2 cleared'));
  await sleep(500);
  if (touch) await press('.btn-next');
  else await page.keyboard.press('Enter');
  check((await waitStep('captain', 8000)) === 'captain', label('wave 3: the captain'));
  await shot('07-captain');

  // 11. Down the captain: the rout, then the rest of the wave.
  await fight(async () => (await phase()) === 'victory');
  check((await waitStep('victory', 15000)) === 'victory', label('the captain falls and the battle is won'));
  await page.waitForFunction(() => window.__game.result.open, null, { timeout: 15000 });
  await shot('08-victory');

  // 12–13. Continue to the map; Fight! starts Battle 2.
  await press('.card-result .btn-main');
  check((await waitStep('map', 6000)) === 'map', label('Continue opens the map'));
  await shot('09-map');
  await press('.map-card .btn-main');
  check((await waitStep('done', 6000)) === 'done', label('Fight! on the map finishes Battle 1’s script'));
  const second = await page.evaluate(() => ({ screen: window.__game.screen, battle: window.__game.battle?.id }));
  check(second.screen === 'battle' && second.battle === 2, label(`Battle 2 starts (${JSON.stringify(second)})`));

  // Measures: every tutorial step in order, each started before it completed.
  const names = await events();
  const tutorial = names.filter((n) => n.startsWith('measure:tutorial:'));
  const want = touch ? ORDER_TOUCH : ORDER_DESKTOP;
  const completes = tutorial.filter((n) => n.endsWith(':complete')).map((n) => n.split(':')[2]);
  const starts = tutorial.filter((n) => n.endsWith(':start')).map((n) => n.split(':')[2]);
  check(JSON.stringify(completes) === JSON.stringify(want), label(`tutorial steps complete in order (${completes.join(' ')})`));
  check(want.every((s) => tutorial.indexOf(`measure:tutorial:${s}:start`) < tutorial.indexOf(`measure:tutorial:${s}:complete`)), label('each step starts before it completes'));
  check(JSON.stringify(starts.slice(0, want.length)) === JSON.stringify(want), label('steps start in order'));
  check(names.includes('measure:battle:b01:start') && names.includes('measure:battle:b01:complete'), label('Battle 1 start and complete are measured'));
  check(!names.some((n) => n === 'commercialBreak' || n === 'rewardedBreak'), label('no ads in Battle 1'));
  const flow = names.filter((n) => n === 'gameplayStart' || n === 'gameplayStop');
  check(!flow.some((n, i) => i > 0 && n === flow[i - 1]), label(`gameplay starts and stops alternate (${flow.length})`));
  const seen = await page.evaluate(() => window.__game.state.seenLessons);
  check(seen.includes('b1') && seen.includes(`move:${device === 'touch' ? 'touch' : 'desktop'}`), label(`lessons saved as seen (${seen.join(', ')})`));
  check(errors.length === 0, label(`no console errors ${errors.join(' | ')}`));
  await context.close();
}

for (const device of ['desktop', 'touch']) {
  if (only && only !== device) continue;
  await run(device);
}
await browser.close();
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nBattle 1 onboarding passed on every device');
process.exit(failures.length ? 1 : 0);
