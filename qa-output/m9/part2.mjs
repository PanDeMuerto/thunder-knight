// Part 2 by eye: the hero with the assault and hunting rifles, men-at-arms (both sides), a Rift Strike, the shop.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, 'd1280', 'part2');
await page.evaluate(`window.__game.state.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'swap:desktop', 'support:desktop', 'intro:manAtArms', 'intro:rider', 'intro:firebrand');`);
const find = (type) => `const { TYPES } = await import('/src/crowd/crowdSim.ts'); const s = g.crowd.sim; const b = s.bodies; let i = -1;
  for (let k = 0; k < b.count; k++) if (s.live[k] && b.alive[k] && TYPES[s.type[k]] === '${type}') { i = k; break; }`;
const shots = [
  ['rifle', `g.devScene('hill'); g.devAdvance(10); g.equip('assaultRifle', 1); __frames(30);`],
  ['hunting', `g.equip('huntingRifle', 1); __frames(20);`],
  ['menAtArms', `g.state.army.menAtArms = 2; g.startBattle(9); g.devAdvance(3); g.devAdvance(10); __frames(2); ${find('manAtArms')}
    if (i >= 0) { const hx = b.x[i] + 3, hz = b.z[i] + 10; const yaw = Math.atan2(-(b.x[i] - hx), -(b.z[i] - hz)); g.hero.place(hx, hz, yaw); g.rig.snap(g.hero.position, yaw, false); } __frames(10);`],
  ['allies', `g.hero.place(0, -2, Math.PI); g.rig.snap(g.hero.position, 0, false); __frames(6); { const yaw = 0; g.hero.place(0, 4, yaw); g.rig.snap(g.hero.position, yaw, false); } __frames(10);`],
  ['strikeWarn', `g.state.support.owned.riftStrike = 1; g.state.support.equipped = 'riftStrike'; g.startBattle(8); g.devAdvance(3); g.devAdvance(12); __frames(2); ${find('footman')}
    if (i >= 0) { const hx = b.x[i] + 2, hz = b.z[i] + 24; const yaw = Math.atan2(-(b.x[i] - hx), -(b.z[i] - hz)); g.hero.place(hx, hz, yaw); g.rig.snap(g.hero.position, yaw, false);
      __frames(2); g.combat.aimPoint.set(b.x[i], 0, b.z[i]); g.callSupport(); } __frames(30);`],
  ['strikeShells', `__frames(55);`],
  ['shop', `g.state.gold = 6000; g.devAdvance(0.1); { const bt = g.battle; for (let n = 0; n < 80 && bt.phase === 'wave'; n++) { g.devAdvance(0.5); const bb = g.crowd.bodies; for (let k = 0; k < bb.count; k++) if (bb.alive[k]) g.crowd.sim.damage(k, 9999, 0, 1); } }
    g.hero.place(7, 2.2, -0.6); g.rig.snap(g.hero.position, -0.6, false); __frames(10); const tab = [...document.querySelectorAll('.shop-tabs button')].find((x) => x.textContent.includes('Hero')); tab?.click(); __frames(2);`],
];
for (const [name, js] of shots) {
  await page.evaluate(`(async () => { const g = window.__game; ${js} if ('${name}' !== 'shop') document.querySelector('#ui').style.display = 'none'; else document.querySelector('#ui').style.display = ''; })()`);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `qa-output/m9/p2-${name}.png` });
}
await context.close();
await browser.close();
console.log('ok');
