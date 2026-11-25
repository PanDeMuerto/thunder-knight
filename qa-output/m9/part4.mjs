// M9 part 4 by eye: the Brute (walking, winding up with his glowing lane and health bar, charging), the battering ram
// (rolling with its crew, its crew thinning, at the banner, abandoned), and the Highland Pass's field.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const screen = process.argv[2] ?? 'd1280';
const { page, context } = await openStepped(browser, screen, 'part4');
await page.evaluate(`(async () => { window.__types = (await import('/src/crowd/crowdSim.ts')).TYPES; })()`);
await page.evaluate(`window.__game.state.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'swap:desktop', 'support:desktop', 'intro:manAtArms', 'intro:rider', 'intro:firebrand', 'intro:warWagon', 'intro:brute', 'intro:ram');`);
const findType = (t) => `var s = g.crowd.sim; var b = s.bodies; var w = -1; for (let k = 0; k < s.capacity; k++) if (s.live[k] && s.isUp(k) && window.__types[s.type[k]] === '${t}') { w = k; break; }`;
const view = (dx, dz) => `if (w >= 0) { const hx = b.x[w] + ${dx}, hz = b.z[w] + ${dz}; const yaw = Math.atan2(-(b.x[w] - hx), -(b.z[w] - hz)); g.hero.place(hx, hz, yaw); g.rig.snap(g.hero.position, yaw, false); }`;
const shots = [
  ['brute-walk', `g.startBattle(11, 2); g.devAdvance(3); g.devAdvance(8); __frames(2); ${findType('brute')} ${view(4, 16)} __frames(20);`],
  ['brute-far', `${findType('brute')} ${view(6, 30)} __frames(10);`],
  ['brute-windup', `${findType('brute')} ${view(3, 18)} for (let n = 0; n < 400 && !(w >= 0 && s.state[w] === 9); n++) __frames(1); __frames(12);`],
  ['brute-charge', `__frames(28);`],
  ['ram-roll', `g.startBattle(12, 2); g.devAdvance(3); g.devAdvance(10); __frames(2); ${findType('ram')} ${view(5, 14)} __frames(20);`],
  ['ram-side', `${findType('ram')} ${view(10, 1)} __frames(20);`],
  ['ram-thinned', `${findType('ram')} const crew = s.wagonParts(w).crew; s.damage(crew[0], 9999, 1, 0); s.damage(crew[1], 9999, 1, 0); s.damage(crew[3], 9999, -1, 0); __frames(30); ${view(7, 10)} __frames(5);`],
  ['ram-banner', `${findType('ram')} g.devAdvance(24); __frames(2); ${findType('ram')} ${view(6, 12)} __frames(30);`],
  ['ram-abandoned', `${findType('ram')} for (const c of s.wagonParts(w).crew) s.damage(c, 9999, 0, 1); __frames(40);`],
  ['field-b11', `g.startBattle(11, 1); __frames(2); g.hero.place(0, 6, 0); g.rig.snap(g.hero.position, 0, false); __frames(20);`],
  ['field-b11-gate', `g.hero.place(-20, 8, Math.atan2(20, -18)); g.rig.snap(g.hero.position, Math.atan2(20, -18), false); __frames(20);`],
  ['field-b12-tower', `g.startBattle(12, 1); __frames(2); g.hero.place(-20, 8, Math.atan2(20, -20)); g.rig.snap(g.hero.position, Math.atan2(20, -20), false); __frames(20);`],
  ['field-b12-west', `g.hero.place(10, 0, Math.PI / 2 - 0.2); g.rig.snap(g.hero.position, Math.PI / 2 - 0.2, false); __frames(20);`],
];
for (const [name, js] of shots) {
  await page.evaluate(`(async () => { const g = window.__game; ${js} })()`);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `qa-output/m9/p4-${name}-${screen}.png` });
}
const info = await page.evaluate(`(() => { const g = window.__game; return { phase: g.battle?.phase, left: g.battle?.enemiesLeft, banner: g.battle?.banner }; })()`);
console.log(info);
await context.close();
await browser.close();
