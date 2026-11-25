// Last Stand soak (milestone M10's exit): runs a Last Stand for 30+ waves and checks nothing piles up.
// - Each wave plays for real for a while (the crowd, the shots, the coins, the effects), then whatever's left is
//   knocked out so the soak doesn't take hours; shop breaks press Next wave, short breaks count down on their own.
// - At waves 1, 10, 20 and the last: the JS heap after a forced garbage collection, the renderer's geometries and
//   textures, the crowd's squads and live bodies, and the draw calls of a drawn frame.
// - Fails if the heap grows more than 25% from wave 10 to the last, if GPU objects keep growing, or if a frame goes
//   over 150 draw calls.
// Needs `npm run dev` (port 5180). Never takes the owner's mouse (pointer lock is faked).
//   npm run qa:soak -- [--waves=30] [--field=12] [--play=18]
import { chromium } from 'playwright';
import { fakePointerLock } from './fake-lock.mjs';

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const WAVES = Number(arg('waves', 30));
const FIELD = Number(arg('field', 12));
const PLAY = Number(arg('play', 18));
const GAME = process.env.GAME_URL ?? 'http://localhost:5180/';

const browser = await chromium.launch({
  channel: process.env.QA_BROWSER ?? 'chrome',
  headless: true,
  args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--js-flags=--expose-gc'],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
await page.addInitScript(fakePointerLock);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${GAME}?nodev&stand=${FIELD}`);
await page.waitForFunction(() => window.__game?.crowd !== undefined && window.__game.battle, null, { timeout: 60000 });
await page.evaluate(() => {
  const g = window.__game;
  const proto = Object.getPrototypeOf(g);
  g.update = () => {};
  window.__step = (dt) => proto.update.call(g, dt);
  g.state.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'grenade:desktop', 'swap:desktop', 'support:desktop', 'sentry');
  g.onFirstInput();
});

/** What's alive and how much memory, after a garbage collection; and one drawn frame's draw calls. */
const sample = () =>
  page.evaluate(() => {
    const g = window.__game;
    window.gc?.();
    const info = g.stage.renderer.info;
    info.autoReset = false;
    info.reset();
    g.stage.render();
    const calls = info.render.calls;
    info.autoReset = true;
    const sim = g.crowd.sim;
    let live = 0;
    for (let i = 0; i < sim.capacity; i++) if (sim.live[i]) live++;
    return {
      wave: (g.battle?.wave ?? -1) + 1,
      heap: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1024),
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      squads: sim.squads.length,
      live,
      calls,
    };
  });

const samples = [];
const at = new Set([1, 10, 20, WAVES]);
for (let n = 1; n <= WAVES; n++) {
  // Into wave n: from a shop break press Next wave; from a short break (or the start) let the countdown run.
  for (let k = 0; k < 400; k++) {
    const phase = await page.evaluate(() => {
      const g = window.__game;
      const b = g.battle;
      if (b.phase === 'break') b.nextWave();
      for (let f = 0; f < 10; f++) window.__step(1 / 30);
      return b.phase;
    });
    if (phase === 'wave') break;
    if (phase === 'defeat') break;
  }
  // Play it for real for a while (the armies meet, coins drop, effects fly), keeping the banner up, then clear it.
  await page.evaluate((seconds) => {
    const g = window.__game;
    for (let f = 0; f < seconds * 30; f++) {
      window.__step(1 / 30);
      g.battle.banner = g.battle.bannerMax;
    }
  }, PLAY);
  if (at.has(n)) samples.push(await sample());
  const ended = await page.evaluate(() => {
    const g = window.__game;
    const sim = g.crowd.sim;
    for (let r = 0; r < 120 && g.battle.phase === 'wave'; r++) {
      for (let i = 0; i < sim.capacity; i++) if (sim.live[i] && sim.team[i] === 0 && sim.bodies.alive[i]) sim.explode(i, 1e7, 0, 1);
      g.battle.banner = g.battle.bannerMax;
      for (let f = 0; f < 15; f++) window.__step(1 / 30);
    }
    return g.battle.phase;
  });
  if (ended === 'defeat' || ended === 'wave') {
    console.log(`FAIL wave ${n} didn't end (${ended})`);
    break;
  }
}

let failed = 0;
for (const s of samples) console.log(`     wave ${String(s.wave).padStart(2)}: heap ${(s.heap / 1024).toFixed(1)} MB, ${s.geometries} geometries, ${s.textures} textures, ${s.squads} squads, ${s.live} live bodies, ${s.calls} draw calls`);
const first = samples.find((s) => s.wave >= 10) ?? samples[0];
const last = samples[samples.length - 1];
const check = (ok, text) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`);
  if (!ok) failed++;
};
check(last.wave >= WAVES, `reached wave ${last.wave} of ${WAVES}`);
check(last.heap <= first.heap * 1.25, `heap from wave ${first.wave} to ${last.wave}: ${(first.heap / 1024).toFixed(1)} → ${(last.heap / 1024).toFixed(1)} MB (25% allowed)`);
check(last.geometries <= first.geometries + 40 && last.textures <= first.textures + 4, `GPU objects steady: geometries ${first.geometries} → ${last.geometries}, textures ${first.textures} → ${last.textures}`);
check(samples.every((s) => s.calls <= 150), `draw calls at most ${Math.max(...samples.map((s) => s.calls))} (150 allowed)`);
check(errors.length === 0, `no page errors ${errors.slice(0, 3).join(' | ')}`);
await context.close();
await browser.close();
console.log(failed ? `\n${failed} soak check(s) failed` : '\nLast Stand soak passed');
process.exit(failed ? 1 : 0);
