// M9 part 9 by eye: the Iron Ox rolling in (front, side, close on the Baron), its wind-up (glowing horns, the cone on
// the ground), the fire, phase 3 (plates down, the core), its fall; and the Iron Keep's wall at Battle 20.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const screen = process.argv[2] ?? 'd1280';
const only = process.argv[3];
const { page, context } = await openStepped(browser, screen, 'part9');
await page.evaluate(`(async () => { const cs = await import('/src/crowd/crowdSim.ts'); window.__types = cs.TYPES; })()`);
await page.evaluate(`(() => { const s = window.__game.state; s.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'swap:desktop', 'support:desktop', 'sentry', 'grenade:desktop', 'intro:eliteCaptain', 'intro:archer', 'intro:footman', 'intro:ironOx'); })()`);
const find = `var s = g.crowd.sim; var b = s.bodies; var w = -1; for (let k = 0; k < s.capacity; k++) if (s.live[k] && window.__types[s.type[k]] === 'ironOx') { w = k; break; }`;
const view = (dx, dz) => `if (w >= 0) { const hx = b.x[w] + ${dx}, hz = b.z[w] + ${dz}; const yaw = Math.atan2(-(b.x[w] - hx), -(b.z[w] - hz)); g.hero.place(hx, hz, yaw); g.rig.snap(g.hero.position, yaw, false); }`;
const shots = [
  ['front', `g.startBattle(20, 7); g.devAdvance(3); g.devAdvance(2.5); __frames(2); ${find} ${view(3, 16)} __frames(10);`],
  ['side', `${find} ${view(12, 2)} __frames(5);`],
  ['baron', `${find} ${view(3, 6)} g.rig.pitch = 0.25; __frames(3);`],
  ['windup', `${find} ${view(14, 6)} for (let n = 0; n < 900; n++) { __frames(1); const c = s.fireCone(w); if (c && c.left < 0.7) break; }`],
  ['fire', `__frames(48);`],
  ['core', `${find} s.explode(w, b.maxHp[w] * 0.75, 0, 1); __frames(70); ${view(9, 9)} __frames(4);`],
  ['fall', `${find} s.explode(w, 999999, 0, 1); __frames(60);`],
  ['field', `g.startBattle(20, 1); __frames(2); g.hero.place(0, 4, 0); g.rig.snap(g.hero.position, 0, false); __frames(20);`],
];
for (const [name, js] of shots) {
  if (only && !name.startsWith(only)) continue;
  await page.evaluate(`(async () => { const g = window.__game; ${js} })()`);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `qa-output/m9/p9-${name}-${screen}.png` });
}
console.log(await page.evaluate(`(() => { const g = window.__game; return { phase: g.battle?.phase, left: g.battle?.enemiesLeft }; })()`));
await context.close();
await browser.close();
