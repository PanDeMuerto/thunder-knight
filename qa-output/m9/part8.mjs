// M9 part 8 by eye: an elite captain beside a captain, the rocket launcher (in the hand, a rocket and its smoke in
// flight, the burst), its shop picture, and The Gatehouse's and Inner Bailey's landmarks.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const screen = process.argv[2] ?? 'd1280';
const only = process.argv[3];
const { page, context } = await openStepped(browser, screen, 'part8');
await page.evaluate(`(() => { const s = window.__game.state; s.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'swap:desktop', 'support:desktop', 'sentry', 'grenade:desktop', 'intro:eliteCaptain', 'intro:captain', 'intro:footman', 'intro:archer', 'intro:peasant', 'intro:manAtArms'); s.guns.rocketLauncher = 1; s.guns.minigun = 1; })()`);
const look = (x, z, yaw) => `g.hero.place(${x}, ${z}, ${yaw}); g.rig.snap(g.hero.position, ${yaw}, false);`;
const shots = [
  ['captains', `g.startBattle(18, 1); __frames(2); const s = g.crowd.sim; s.clear();
    s.spawnSquad({ type: 'footman', count: 4, formation: 'line', x: -3, z: -14, facing: Math.PI, captain: true, elite: true, order: 'hold' });
    s.spawnSquad({ type: 'footman', count: 4, formation: 'line', x: 4, z: -14, facing: Math.PI, captain: true, order: 'hold' });
    ${look(0.5, -6, 0)} __frames(30);`],
  ['rocket-fly', `g.startBattle(18, 1); g.devAdvance(3); g.devAdvance(11); __frames(2); g.state.hand = ['rocketLauncher', 'minigun']; g.battle.equipHand(); ${look(0, -8, 0)} __frames(10); g.input.fireHeld = true; __frames(2); g.input.fireHeld = false; __frames(9);`],
  ['rocket-burst', `__frames(30);`],
  ['field-b18', `g.startBattle(18, 1); __frames(2); ${look(-18, 10, Math.atan2(22, -14))} __frames(20);`],
  ['field-b19', `g.startBattle(19, 1); __frames(2); ${look(-16, 8, Math.atan2(22, -18))} __frames(20);`],
];
for (const [name, js] of shots) {
  if (only && !name.startsWith(only)) continue;
  await page.evaluate(`(async () => { const g = window.__game; ${js} })()`);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `qa-output/m9/p8-${name}-${screen}.png` });
}
const urls = await page.evaluate(`(() => { const a = window.__game.gunArt; return { a: a.minigun, b: a.rocketLauncher }; })()`);
await page.setContent(`<body style="background:#2b2b2b;margin:0;display:flex;gap:30px;padding:30px"><img src="${urls.a}" style="width:300px;background:#555;align-self:flex-start"><img src="${urls.b}" style="width:300px;background:#555;align-self:flex-start"></body>`);
await page.waitForTimeout(200);
await page.screenshot({ path: 'qa-output/m9/p8-icons.png', clip: { x: 0, y: 0, width: 700, height: 220 } });
await context.close();
await browser.close();
console.log('ok');
