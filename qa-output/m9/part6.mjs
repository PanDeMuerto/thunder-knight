// M9 part 6 by eye: the Siege Tower rolling in (front, side, far), its doors opening with a squad stepping out, stalled
// with its pushers down, a beam broken, toppling; and Pass of Echoes' field.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const screen = process.argv[2] ?? 'd1280';
const only = process.argv[3];
const { page, context } = await openStepped(browser, screen, 'part6');
await page.evaluate(`(async () => { const cs = await import('/src/crowd/crowdSim.ts'); window.__types = cs.TYPES; })()`);
await page.evaluate(`(() => { const s = window.__game.state; s.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'swap:desktop', 'support:desktop', 'sentry', 'grenade:desktop', 'intro:manAtArms', 'intro:rider', 'intro:firebrand', 'intro:warWagon', 'intro:brute', 'intro:ram', 'intro:catapult', 'intro:footman', 'intro:archer', 'intro:peasant', 'intro:captain', 'intro:shieldWall', 'intro:siegeTower'); })()`);
const find = `var s = g.crowd.sim; var b = s.bodies; var w = -1; for (let k = 0; k < s.capacity; k++) if (s.live[k] && window.__types[s.type[k]] === 'siegeTower') { w = k; break; }`;
const view = (dx, dz) => `if (w >= 0) { const hx = b.x[w] + ${dx}, hz = b.z[w] + ${dz}; const yaw = Math.atan2(-(b.x[w] - hx), -(b.z[w] - hz)); g.hero.place(hx, hz, yaw); g.rig.snap(g.hero.position, yaw, false); }`;
const shots = [
  ['front', `g.startBattle(15, 7); g.devAdvance(3); g.devAdvance(7); __frames(2); ${find} ${view(2, 15)} __frames(20);`],
  ['side', `${find} ${view(13, 3)} __frames(10);`],
  ['far', `g.hero.place(0, -9, 0); g.rig.snap(g.hero.position, 0, false); __frames(10);`],
  ['doors', `${find} ${view(-9, 10)} for (let n = 0; n < 1500; n++) { __frames(1); if (g.crowd.sim.time > 0 && g.tower && g.tower.model.doorOpen && g.tower.model.doorOpen.some((t) => t < 0.6 && t > 0.35)) break; } __frames(2);`],
  ['stalled', `${find} for (const c of s.wagonParts(w).crew) s.damage(c, 9999, 0, 1); __frames(40); ${view(3, 13)} __frames(4);`],
  ['beam', `${find} s.damage(s.wagonParts(w).wheels[1], 9999, 0, 1); __frames(30);`],
  ['topple', `${find} s.damage(s.wagonParts(w).wheels[0], 9999, 0, 1); s.damage(s.wagonParts(w).wheels[2], 9999, 0, 1); ${view(9, 14)} __frames(70);`],
  ['field', `g.startBattle(15, 1); __frames(2); g.hero.place(0, 4, 0); g.rig.snap(g.hero.position, 0, false); __frames(20);`],
  ['field-west', `g.hero.place(10, 0, Math.PI / 2 - 0.2); g.rig.snap(g.hero.position, Math.PI / 2 - 0.2, false); __frames(20);`],
];
for (const [name, js] of shots) {
  if (only && !name.startsWith(only)) continue;
  await page.evaluate(`(async () => { const g = window.__game; ${js} })()`);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `qa-output/m9/p6-${name}-${screen}.png` });
}
console.log(await page.evaluate(`(() => { const g = window.__game; return { phase: g.battle?.phase, left: g.battle?.enemiesLeft }; })()`));
await context.close();
await browser.close();
