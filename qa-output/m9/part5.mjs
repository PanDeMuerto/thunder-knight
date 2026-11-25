// M9 part 5 by eye: the Queen's knights charging, the Sentry Gun landing and firing, catapults rolling in and throwing
// (the arm, a boulder in the air, its shadow growing), the grenade launcher's rounds, and Battles 13–14's fields.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const screen = process.argv[2] ?? 'd1280';
const only = process.argv[3];
const { page, context } = await openStepped(browser, screen, 'part5');
await page.evaluate(`(async () => { const cs = await import('/src/crowd/crowdSim.ts'); window.__types = cs.TYPES; })()`);
await page.evaluate(`(() => { const s = window.__game.state; s.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'swap:desktop', 'support:desktop', 'sentry', 'grenade:desktop', 'intro:manAtArms', 'intro:rider', 'intro:firebrand', 'intro:warWagon', 'intro:brute', 'intro:ram', 'intro:catapult', 'intro:footman', 'intro:archer', 'intro:peasant', 'intro:captain', 'intro:shieldWall');
  s.army.knights = 3; s.army.militia = 4; s.guns.grenadeLauncher = 1; s.guns.machineGun = 1; s.support.owned.sentryGun = 2; s.support.equipped = 'sentryGun'; })()`);
const findType = (t) => `var s = g.crowd.sim; var b = s.bodies; var w = -1; for (let k = 0; k < s.capacity; k++) if (s.live[k] && s.isUp(k) && window.__types[s.type[k]] === '${t}') { w = k; break; }`;
const view = (dx, dz) => `if (w >= 0) { const hx = b.x[w] + ${dx}, hz = b.z[w] + ${dz}; const yaw = Math.atan2(-(b.x[w] - hx), -(b.z[w] - hz)); g.hero.place(hx, hz, yaw); g.rig.snap(g.hero.position, yaw, false); }`;
const shots = [
  ['knights-wait', `g.startBattle(13, 1); __frames(2); ${findType('allyKnight')} ${view(5, 6)} __frames(20);`],
  ['knights-charge', `g.devAdvance(3); for (let n = 0; n < 1200; n++) { __frames(1); ${findType('allyKnight')} if (w >= 0 && (s.state[w] === 10)) break; } __frames(10); ${findType('allyKnight')} ${view(7, 8)} __frames(1);`],
  ['knights-fight', `__frames(90); ${findType('allyKnight')} ${view(6, 8)} __frames(1);`],
  ['sentry-land', `g.startBattle(13, 2); g.devAdvance(3); g.devAdvance(9); __frames(2); g.hero.place(0, -14, 0); g.rig.snap(g.hero.position, 0, false); g.battle.support = 1; g.callSupport(); __frames(40);`],
  ['sentry-fire', `__frames(50);`],
  ['catapult-roll', `g.startBattle(14, 2); g.devAdvance(3); g.devAdvance(6); __frames(2); ${findType('catapult')} ${view(6, 10)} __frames(20);`],
  ['catapult-throw', `g.devAdvance(12); __frames(2); ${findType('catapult')} ${view(7, 9)} for (let n = 0; n < 600 && !g.crowd.sim.boulders.some((x) => x.live && x.age > 0.15); n++) __frames(1); __frames(4);`],
  ['boulder-shadow', `g.hero.place(3, -4, 0); g.rig.snap(g.hero.position, 0, false); for (let n = 0; n < 600 && !g.crowd.sim.boulders.some((x) => x.live && x.lob.flight - x.age < 0.6); n++) __frames(1); g.rig.snap(g.hero.position, Math.atan2(-(g.crowd.sim.boulders.find((x) => x.live).toX - 3), -(g.crowd.sim.boulders.find((x) => x.live).toZ + 4)), false); __frames(2);`],
  ['launcher', `g.startBattle(14, 1); g.devAdvance(3); g.devAdvance(10); __frames(2); g.battle.state = g.battle.state; g.state.hand = ['grenadeLauncher', 'machineGun']; g.battle.equipHand(); g.hero.setGun('grenadeLauncher'); g.hero.place(0, -10, 0); g.rig.snap(g.hero.position, 0, false); __frames(10); g.input.fireHeld = true; __frames(28); g.input.fireHeld = false; __frames(6);`],
  ['field-b13', `g.startBattle(13, 1); __frames(2); g.hero.place(-18, 6, Math.atan2(20, -20)); g.rig.snap(g.hero.position, Math.atan2(20, -20), false); __frames(20);`],
  ['field-b14', `g.startBattle(14, 1); __frames(2); g.hero.place(-14, 4, Math.atan2(20, -18)); g.rig.snap(g.hero.position, Math.atan2(20, -18), false); __frames(20);`],
  ['field-b14-west', `g.hero.place(10, 0, Math.PI / 2 - 0.1); g.rig.snap(g.hero.position, Math.PI / 2 - 0.1, false); __frames(20);`],
];
for (const [name, js] of shots) {
  if (only && !name.startsWith(only)) continue;
  await page.evaluate(`(async () => { const g = window.__game; ${js} })()`);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `qa-output/m9/p5-${name}-${screen}.png` });
}
console.log(await page.evaluate(`(() => { const g = window.__game; return { phase: g.battle?.phase, gun: g.battle?.gun, sentries: g.sentries.standing }; })()`));
await context.close();
await browser.close();
