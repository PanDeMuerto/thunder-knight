// The War Wagon (Battle 10's boss) by eye: rolling in with its crew and oxen, a wheel gone, stalled with footmen
// spilling, collapsed. From the hero's place and from the side.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, process.argv[2] ?? 'd1280', 'wagon');
await page.evaluate(`window.__game.state.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'swap:desktop', 'support:desktop', 'intro:manAtArms', 'intro:rider', 'intro:firebrand', 'intro:warWagon');`);
const find = `const s = g.crowd.sim; const b = s.bodies; let w = -1; for (let k = 0; k < s.capacity; k++) if (s.live[k] && s.wagonParts(k)) w = k;`;
const view = (dx, dz) => `if (w >= 0) { const hx = b.x[w] + ${dx}, hz = b.z[w] + ${dz}; const yaw = Math.atan2(-(b.x[w] - hx), -(b.z[w] - hz)); g.hero.place(hx, hz, yaw); g.rig.snap(g.hero.position, yaw, false); }`;
const shots = [
  ['front', `g.startBattle(10, 6); g.devAdvance(3); g.devAdvance(14); __frames(2); ${find} ${view(3, 14)} __frames(20);`],
  ['side', `${find} ${view(11, 2)} __frames(20);`],
  ['wheel', `${find} s.damage(s.wagonParts(w).wheels[1], 9999, 0, 1); __frames(25);`],
  ['stall', `${find} s.damage(s.wagonParts(w).wheels[3], 9999, 0, 1); __frames(40); ${view(6, 13)} __frames(10);`],
  ['collapse', `${find} s.damage(s.wagonParts(w).wheels[0], 9999, 0, 1); s.damage(s.wagonParts(w).wheels[2], 9999, 0, 1); __frames(50);`],
];
for (const [name, js] of shots) {
  await page.evaluate(`(async () => { const g = window.__game; ${js} document.querySelector('#ui').style.display = 'none'; })()`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `qa-output/m9/wagon-${name}.png` });
}
const info = await page.evaluate(`(() => { const g = window.__game; return { phase: g.battle?.phase, left: g.battle?.enemiesLeft }; })()`);
console.log(info);
await context.close();
await browser.close();
