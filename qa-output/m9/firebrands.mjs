// Firebrands close: the lit pots while they march and sprint, then a burst.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, 'd1280', 'firebrands');
await page.evaluate(`window.__game.state.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'swap:desktop', 'intro:firebrand');`);
const find = `const { TYPES } = await import('/src/crowd/crowdSim.ts'); const s = g.crowd.sim; const b = s.bodies; let i = -1;
  for (let k = 0; k < b.count; k++) if (s.live[k] && b.alive[k] && TYPES[s.type[k]] === 'firebrand') { i = k; break; }`;
const shots = [
  // Far enough that they march (no sprint yet), then close enough that they sprint.
  ['march', `g.startBattle(7); g.devAdvance(3); g.devAdvance(8); __frames(2); ${find} if (i >= 0) { const hx = b.x[i] + 4, hz = b.z[i] + 40; g.hero.place(hx, hz, Math.atan2(-(b.x[i] - hx), -(b.z[i] - hz))); g.rig.snap(g.hero.position, Math.atan2(-(b.x[i] - hx), -(b.z[i] - hz)), false); } __frames(6);`],
  ['near', `${find} if (i >= 0) { const hx = b.x[i] + 2, hz = b.z[i] + 9; g.hero.place(hx, hz, Math.atan2(-(b.x[i] - hx), -(b.z[i] - hz))); g.rig.snap(g.hero.position, Math.atan2(-(b.x[i] - hx), -(b.z[i] - hz)), false); } __frames(4);`],
  ['sprint', `__frames(18);`],
  ['burst', `${find} if (i >= 0) s.damage(i, 9999, 0, 1); __frames(6);`],
];
for (const [name, js] of shots) {
  await page.evaluate(`(async () => { const g = window.__game; ${js} document.querySelector('#ui').style.display = 'none'; })()`);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `qa-output/m9/fb-${name}.png` });
}
await context.close();
await browser.close();
console.log('ok');
