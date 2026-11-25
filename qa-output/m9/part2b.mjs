// Close looks: a man-at-arms beside a footman, and a Rift Strike falling on an enemy block.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, 'd1280', 'part2b');
await page.evaluate(`window.__game.state.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'swap:desktop', 'support:desktop', 'intro:manAtArms', 'intro:rider', 'intro:firebrand');`);
const find = (type) => `const { TYPES } = await import('/src/crowd/crowdSim.ts'); const s = g.crowd.sim; const b = s.bodies; let i = -1;
  for (let k = 0; k < b.count; k++) if (s.live[k] && b.alive[k] && TYPES[s.type[k]] === '${type}') { i = k; break; }`;
const shots = [
  ['maa', `g.startBattle(9); g.devAdvance(3); g.devAdvance(14); __frames(2); ${find('manAtArms')}
    if (i >= 0) { const hx = b.x[i] - 3, hz = b.z[i] + 6; const yaw = Math.atan2(-(b.x[i] - hx), -(b.z[i] - hz)); g.hero.place(hx, hz, yaw); g.rig.snap(g.hero.position, yaw, false); } __frames(8);`],
  ['strike1', `g.startBattle(8); g.devAdvance(3); g.devAdvance(12); __frames(2); ${find('footman')}
    if (i >= 0) { const hx = b.x[i] + 2, hz = b.z[i] + 22; const yaw = Math.atan2(-(b.x[i] - hx), -(b.z[i] - hz)); g.hero.place(hx, hz, yaw); g.rig.snap(g.hero.position, yaw, false);
      __frames(2); g.strike.start(b.x[i], b.z[i]); } __frames(40);`],
  ['strike2', `__frames(18);`],
  ['strike3', `__frames(30);`],
];
for (const [name, js] of shots) {
  await page.evaluate(`(async () => { const g = window.__game; ${js} document.querySelector('#ui').style.display = 'none'; })()`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `qa-output/m9/p2b-${name}.png` });
}
await context.close();
await browser.close();
console.log('ok');
