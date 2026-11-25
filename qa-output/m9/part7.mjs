// M9 part 7 by eye: the Iron Keep's look (the skyline castle, the burnt orchard tree line, the drier ground), Burnt
// Orchard's and Moat Road's landmarks, and the minigun in the hand (still and spinning) and in the shop.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const screen = process.argv[2] ?? 'd1280';
const only = process.argv[3];
const { page, context } = await openStepped(browser, screen, 'part7');
await page.evaluate(`(() => { const s = window.__game.state; s.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'swap:desktop', 'support:desktop', 'sentry', 'grenade:desktop'); s.guns.minigun = 1; })()`);
const look = (x, z, yaw) => `g.hero.place(${x}, ${z}, ${yaw}); g.rig.snap(g.hero.position, ${yaw}, false); __frames(20);`;
const shots = [
  ['b16-north', `g.startBattle(16, 1); __frames(2); ${look(0, 6, 0)}`],
  ['b16-orchard', `${look(-16, 6, Math.atan2(24, -20))}`],
  ['b16-east', `${look(-10, 0, -Math.PI / 2 + 0.2)}`],
  ['b17-moat', `g.startBattle(17, 1); __frames(2); ${look(-18, 10, Math.atan2(22, -14))}`],
  ['b17-west', `${look(10, 0, Math.PI / 2 - 0.15)}`],
  ['minigun', `g.startBattle(16, 1); g.devAdvance(3); g.devAdvance(10); __frames(2); g.state.hand = ['minigun', 'machineGun']; g.battle.equipHand(); ${look(0, -10, 0)} g.input.fireHeld = true; __frames(50); g.input.fireHeld = false; __frames(2);`],
];
for (const [name, js] of shots) {
  if (only && !name.startsWith(only)) continue;
  await page.evaluate(`(async () => { const g = window.__game; ${js} })()`);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `qa-output/m9/p7-${name}-${screen}.png` });
}
const urls = await page.evaluate(`(() => { const a = window.__game.gunArt; return { mg: a.machineGun, mini: a.minigun }; })()`);
await page.setContent(`<body style="background:#2b2b2b;margin:0;display:flex;gap:30px;padding:30px"><img src="${urls.mg}" style="width:300px;background:#555;align-self:flex-start"><img src="${urls.mini}" style="width:300px;background:#555;align-self:flex-start"></body>`);
await page.waitForTimeout(200);
await page.screenshot({ path: 'qa-output/m9/p7-icons.png', clip: { x: 0, y: 0, width: 700, height: 220 } });
await context.close();
await browser.close();
console.log('ok');
