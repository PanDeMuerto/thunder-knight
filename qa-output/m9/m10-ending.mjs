// M10 part 2 by eye: the Iron Baron's escape when the Iron Ox falls (popping up in his turret, the donkey trotting
// up, the hop, the gallop off with his fist up and a look back, close on the donkey), then Battle 20's ending: the dip
// to dark, Queen Ada walking up the hill, her lines and Rosie's, the cheer, and the ending card.
// `node qa-output/m9/m10-ending.mjs [screen] [only]`
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const screen = process.argv[2] ?? 'd1280';
const only = process.argv[3];
const { page, context, errors } = await openStepped(browser, screen, 'ending');
await page.evaluate(`(async () => { const cs = await import('/src/crowd/crowdSim.ts'); window.__types = cs.TYPES; })()`);
await page.evaluate(`(() => { const s = window.__game.state; s.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'swap:desktop', 'support:desktop', 'sentry', 'grenade:desktop', 'intro:eliteCaptain', 'intro:archer', 'intro:footman', 'intro:ironOx'); })()`);
await page.evaluate(`(() => { const g = window.__game; g.startBattle(20, 7); g.devAdvance(3); g.devAdvance(2.5); __frames(2); })()`);
await page.waitForFunction(() => window.__game.escape && window.__game.ending, null, { timeout: 30000 });
const find = `var s = g.crowd.sim; var b = s.bodies; var w = -1; for (let k = 0; k < s.capacity; k++) if (s.live[k] && window.__types[s.type[k]] === 'ironOx') { w = k; break; }`;
const view = (dx, dz) => `if (w >= 0) { const hx = b.x[w] + ${dx}, hz = b.z[w] + ${dz}; const yaw = Math.atan2(-(b.x[w] - hx), -(b.z[w] - hz)); g.hero.place(hx, hz, yaw); g.rig.snap(g.hero.position, yaw, g.stage.portrait); }`;
// Close on the donkey: the camera set by hand 3.5 m to its side and drawn once more.
const near = (sx, sz) => `{ const d = g.escape.donkey.position; const c = g.stage.camera; c.position.set(d.x + ${sx}, d.y + 1.3, d.z + ${sz}); c.lookAt(d.x, d.y + 0.8, d.z); c.updateMatrixWorld(); g.stage.render(); }`;
const ending = `g.ending.step`;
const until = (cond, max = 2000) => `for (let n = 0; n < ${max} && !(${cond}); n++) __frames(1, 1/30);`;
const shots = [
  ['turret', `${find} ${view(4, 14)} __frames(8); s.explode(w, 999999, 0, 1); __frames(18);`],
  ['trot', `__frames(42);`],
  ['hop', `__frames(18);`],
  ['hopNear', `__frames(14); ${near(3.4, 1.8)}`],
  ['off', `__frames(16);`],
  ['near', `__frames(24); ${near(3.2, -1.2)}`],
  ['nearBack', `__frames(10); ${near(-1.5, -3.5)}`],
  ['gone', `${find} ${view(4, 14)} __frames(60);`],
  ['far', `__frames(150);`],
  ['walk', `${until(`${ending} === 'walk'`)} __frames(40);`],
  ['line1', `${until(`${ending} === 'lines'`)} __frames(30);`],
  ['line2', `__frames(40); g.ending.press(); __frames(20);`],
  ['line3', `__frames(40); g.ending.press(); __frames(20);`],
  ['line4', `__frames(40); g.ending.press(); __frames(50);`],
  ['card', `__frames(40); g.ending.press(); __frames(50);`],
];
for (const [name, js] of shots) {
  await page.evaluate(`(async () => { const g = window.__game; ${js} })()`);
  if (only && !name.startsWith(only)) continue;
  await page.waitForTimeout(250);
  const info = await page.evaluate(`(() => { const g = window.__game; return { phase: g.battle?.phase, left: g.battle?.enemiesLeft, escape: g.escape?.active, t: g.escape?.t, ending: g.ending?.step, line: document.querySelector('.ending-line:not(.is-hidden) .ending-text')?.textContent ?? null, card: document.querySelector('.card-layer:not(.is-hidden) .card-title')?.textContent ?? null }; })()`);
  console.log(name, JSON.stringify(info));
  await page.screenshot({ path: `qa-output/m9/m10-end-${name}-${screen}.png` });
}
if (errors.length) console.log('errors', errors);
await context.close();
await browser.close();
