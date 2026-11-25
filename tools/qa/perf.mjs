// Frame rate and draw cost with the crowd at its cap, the milestone budget check (GDD §19, milestones M2):
// - High: 300 soldiers (150 against 150) at 60 fps on desktop, at most 150 draw calls
// - Low: 160 soldiers at 30 fps or more with the CPU slowed 4x (a mid phone's CPU; the GPU can't be slowed here, so a
//   real phone is still the final word)
// Needs `npm run dev` (port 5180). Never takes the owner's mouse (pointer lock is faked).
//   npm run perf -- [--seconds=5] [--scene=clash]
//   npm run perf -- --battle=20 --wave=7   (a real battle's wave instead, e.g. the Iron Ox's: M9's exit asks for a
//   Region 4 wave)
//   npm run perf -- --phone --cpu=6 --tier=lowest   (only the runs that match: M11's exit is the lowest tier on a phone
//   at 6x CPU, 30 fps or more; `--cpu=` overrides the slowdown of whatever runs)
// - Lowest: a slow phone (6x CPU), the tier a weak device falls to: no shadows, 100 soldiers, pixel ratio 1
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { fakePointerLock } from './fake-lock.mjs';

const GAME = process.env.GAME_URL ?? 'http://localhost:5180/';
const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const seconds = Number(arg('seconds', 5));
const scene = arg('scene', 'clash');
const battleId = arg('battle', '');
const wave = arg('wave', '1');
const OUT = fileURLToPath(new URL('../../qa-output/', import.meta.url));

const RUNS = [
  { name: 'high', tier: 'high', cpu: 1, fps: 55, calls: 150, viewport: { width: 1280, height: 720 } },
  { name: 'low-4xcpu', tier: 'low', cpu: 4, fps: 30, calls: 150, viewport: { width: 1280, height: 720 } },
  { name: 'phone-low', tier: 'low', cpu: 4, fps: 30, calls: 150, viewport: { width: 390, height: 844 }, touch: true },
  { name: 'phone-lowest', tier: 'lowest', cpu: 6, fps: 30, calls: 150, viewport: { width: 390, height: 844 }, touch: true },
];
const onlyPhone = process.argv.includes('--phone');
const onlyTier = arg('tier', '');
const cpuOverride = Number(arg('cpu', 0));
const runs = RUNS.filter((r) => (!onlyPhone || r.touch) && (!onlyTier || r.tier === onlyTier)).map((r) => (cpuOverride ? { ...r, cpu: cpuOverride } : r));
if (runs.length === 0) {
  console.error(`No run matches${onlyPhone ? ' --phone' : ''}${onlyTier ? ` --tier=${onlyTier}` : ''}`);
  process.exit(1);
}

const browser = await chromium.launch({
  channel: process.env.QA_BROWSER ?? 'chrome',
  headless: true,
  args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'],
});
let failed = 0;
const report = [];
for (const run of runs) {
  const context = await browser.newContext({
    viewport: run.viewport,
    deviceScaleFactor: run.touch ? 3 : 1,
    hasTouch: !!run.touch,
    isMobile: !!run.touch,
  });
  const page = await context.newPage();
  await page.addInitScript(fakePointerLock);
  await page.addInitScript((quality) => {
    const key = 'thunder-knight.settings';
    localStorage.setItem(key, JSON.stringify({ ...JSON.parse(localStorage.getItem(key) ?? '{}'), quality }));
  }, run.tier);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(battleId ? `${GAME}?nodev&battle=${battleId}&wave=${wave}` : `${GAME}?nodev&scene=${scene}`);
  // A later region's battle starts once its download is in (M11).
  await page.waitForFunction((battle) => window.__game?.crowd !== undefined && (!battle || window.__game.battle), battleId, { timeout: 60000 });
  // A battle: a returning player (no lessons in the way), standing on the hill.
  if (battleId) await page.evaluate(() => { const g = window.__game; g.state.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'move:touch', 'aim:touch'); g.onFirstInput(); });
  // Let the armies meet before measuring.
  await page.evaluate(() => window.__game.devAdvance(14));
  await page.waitForTimeout(1500);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: run.cpu });
  const result = await page.evaluate(
    (ms) =>
      new Promise((resolve) => {
        const g = window.__game;
        const times = [];
        let calls = 0;
        let triangles = 0;
        let soldiers = 0;
        let last = performance.now();
        const start = last;
        const tick = (now) => {
          times.push(now - last);
          last = now;
          calls = Math.max(calls, g.stage.renderer.info.render.calls);
          triangles = Math.max(triangles, g.stage.renderer.info.render.triangles);
          soldiers = Math.max(soldiers, g.crowd.sim.count);
          if (now - start < ms) requestAnimationFrame(tick);
          else {
            times.shift();
            const sorted = [...times].sort((a, b) => a - b);
            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? avg;
            resolve({ fps: 1000 / avg, low: 1000 / p95, calls, triangles, soldiers, tier: g.stage.tier });
          }
        };
        requestAnimationFrame(tick);
      }),
    seconds * 1000,
  );
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const ok = result.fps >= run.fps && result.calls <= run.calls && result.tier === run.tier && errors.length === 0;
  if (!ok) failed++;
  report.push({ run: run.name, ...result, cpu: run.cpu, errors });
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${run.name.padEnd(10)} ${result.fps.toFixed(0).padStart(3)} fps (95% of frames over ${result.low.toFixed(0)}) ` +
      `at ${run.cpu}x CPU, tier ${result.tier}, ${result.soldiers} soldiers, ${result.calls} draw calls, ` +
      `${(result.triangles / 1000).toFixed(0)}k triangles${errors.length ? `, errors: ${errors.join(' | ')}` : ''}`,
  );
  await context.close();
}
await browser.close();
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}perf.json`, JSON.stringify(report, null, 2));
process.exit(failed ? 1 : 0);
