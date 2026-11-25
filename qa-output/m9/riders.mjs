// Riders (Battle 6) and firebrands (Battle 7) from the hero's place: trotting, charging, knocked off; pots lit.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, process.argv[2] ?? 'd1280', 'riders');
await page.evaluate(`window.__game.state.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'move:touch', 'aim:touch', 'swap:desktop', 'intro:rider', 'intro:firebrand');`);
const find = (type) => `const { TYPES } = await import('/src/crowd/crowdSim.ts'); const s = g.crowd.sim; const b = s.bodies; let i = -1;
  for (let k = 0; k < b.count; k++) if (s.live[k] && b.alive[k] && TYPES[s.type[k]] === '${type}') { i = k; break; }`;
const frame = (dist, side) => `if (i >= 0) { const hx = b.x[i] + ${side}, hz = b.z[i] + ${dist}; const yaw = Math.atan2(-(b.x[i] - hx), -(b.z[i] - hz));
  g.hero.place(hx, hz, yaw); g.rig.snap(g.hero.position, yaw, g.stage.portrait); }`;
const shots = [
  ['trot', `g.startBattle(6); g.devAdvance(3); g.devAdvance(12); __frames(2); ${find('rider')} ${frame(12, 4)} __frames(20);`],
  ['side', `${find('rider')} if (i >= 0) { const hx = b.x[i] + 9, hz = b.z[i]; const yaw = Math.atan2(-(b.x[i] - hx), -(b.z[i] - hz)); g.hero.place(hx, hz, yaw); g.rig.snap(g.hero.position, yaw, g.stage.portrait); } __frames(12);`],
  ['charge', `${find('rider')} g.devAdvance(4); __frames(2); { ${find('rider')} ${frame(14, 2)} } __frames(25);`],
  ['knocked', `${find('rider')} if (i >= 0) { const dx = b.x[i] - g.hero.position.x, dz = b.z[i] - g.hero.position.z; s.push(i, 0.2, dx, dz); } __frames(22);`],
  ['bolting', `__frames(30);`],
  ['firebrands', `g.startBattle(7); g.devAdvance(3); g.devAdvance(9); __frames(2); ${find('firebrand')} ${frame(24, 3)} __frames(20);`],
];
for (const [name, js] of shots) {
  await page.evaluate(`(async () => { const g = window.__game; ${js} document.querySelector('#ui').style.display = 'none'; })()`);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `qa-output/m9/${name}.png` });
}
await context.close();
await browser.close();
console.log('ok');
