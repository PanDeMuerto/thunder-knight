// M10 by eye: a Last Stand through its real flow: wave 1, the countdown to wave 2 ("Wave 2 coming!"), the shop break
// after wave 3, wave 4's label with the best, then the banner falling and the Last Stand card.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, 'd1280', 'stand');
await page.evaluate(`(() => { const g = window.__game; g.state.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'grenade:desktop', 'swap:desktop', 'support:desktop', 'sentry'); g.state.lastStand['12'] = 2; g.startLastStand(12); })()`);
const clear = `{ const sim = g.crowd.sim; for (let r = 0; r < 60 && g.battle.phase === 'wave'; r++) { for (let i = 0; i < sim.capacity; i++) if (sim.live[i] && sim.team[i] === 0 && sim.bodies.alive[i]) sim.explode(i, 1e7, 0, 1); __frames(10, 1/30); } }`;
const shots = [
  ['wave1', `g.devAdvance(3); g.devAdvance(8); __frames(4);`],
  ['countdown', `${clear} __frames(30);`],
  ['wave2', `__frames(200, 1/30); __frames(4);`],
  ['shop', `${clear} __frames(20); g.devAdvance(12); __frames(10, 1/30); ${clear} __frames(30);`],
  ['wave4', `g.battle.nextWave(); __frames(60, 1/30);`],
  ['card', `g.battle.banner = 0; __frames(200, 1/30);`],
];
for (const [name, js] of shots) {
  await page.evaluate(`(async () => { const g = window.__game; ${js} })()`);
  await page.waitForTimeout(250);
  const info = await page.evaluate(`(() => { const g = window.__game; return { phase: g.battle?.phase, wave: g.battle?.wave, label: document.querySelector('.hud-wave')?.textContent, held: g.battle?.held, best: g.state.lastStand['12'] }; })()`);
  console.log(name, JSON.stringify(info));
  await page.screenshot({ path: `qa-output/m9/m10-${name}.png` });
}
await context.close();
await browser.close();
