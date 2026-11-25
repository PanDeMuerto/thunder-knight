// The hero in motion from the game camera: run, strafe, back, reload, throw, knocked down, getting up, cheer.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, 'd1280', 'hero motion');
await page.evaluate(`(() => { const g = window.__game; g.devScene('hill'); g.devAdvance(6); g.hero.setGun('smg');
  for (const k of ['moveX', 'moveY']) Object.defineProperty(g.input, k, { get: () => window['__' + k] ?? 0, set() {}, configurable: true });
  document.querySelector('#ui').style.display = 'none'; })()`);
const steps = [
  ['run', `__moveY = 1; __moveX = 0;`, 34],
  ['strafeR', `__moveY = 0; __moveX = 1;`, 34],
  ['strafeL', `__moveX = -1;`, 34],
  ['back', `__moveX = 0; __moveY = -1;`, 34],
  ['reload', `__moveY = 0; __game.hero.reload(1.4);`, 30],
  ['throw', `__game.hero.throwGrenade();`, 16],
  ['down', `__game.hero.setDown(true);`, 70],
  ['rising', `__game.hero.setDown(false);`, 40],
  ['cheer', `__frames(60); __game.hero.cheer();`, 28],
];
for (const [name, js, frames] of steps) {
  await page.evaluate(`(() => { ${js} __frames(${frames}); })()`);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `qa-output/m7/motion-${name}.png`, clip: { x: 300, y: 200, width: 500, height: 500 } });
}
await context.close();
await browser.close();
console.log('ok');
