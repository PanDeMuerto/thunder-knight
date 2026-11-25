// The tumble (a knocked-out soldier slides back along the blow) and a purchase crate dropping beside Rosie.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, 'd1280', 'juice');
await page.evaluate(`window.__game.state.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'move:touch', 'aim:touch');`);
const slide = await page.evaluate(`(async () => { const { ENEMY } = await import("/src/crowd/crowdSim.ts"); const g = window.__game; g.devScene('hill'); g.devAdvance(14); __frames(2);
  const s = g.crowd.sim; const b = s.bodies; let i = -1;
  for (let k = 0; k < b.count; k++) if (b.alive[k] && s.team[k] === ENEMY && b.role[k] !== 2) { i = k; break; }
  if (i < 0) return 'none';
  const x0 = b.x[i], z0 = b.z[i];
  const dx = x0 - g.hero.position.x, dz = z0 - g.hero.position.z;
  s.damage(i, 9999, dx, dz);
  __frames(30);
  const moved = Math.hypot(b.x[i] - x0, b.z[i] - z0);
  const along = ((b.x[i] - x0) * dx + (b.z[i] - z0) * dz) / Math.hypot(dx, dz);
  return { moved: +moved.toFixed(2), along: +along.toFixed(2) }; })()`);
console.log('tumble', slide);
await page.evaluate(`(() => { const g = window.__game; g.state.gold = 900; g.startBattle(2); g.devAdvance(3);
  for (let n = 0; n < 80 && g.battle.phase === 'wave'; n++) { g.devAdvance(0.5); const b = g.crowd.bodies; for (let i = 0; i < b.count; i++) if (b.alive[i]) g.crowd.sim.damage(i, 9999, 0, 1); }
  g.hero.place(7, 2.2, -0.6); g.rig.snap(g.hero.position, -0.6, g.stage.portrait); __frames(10);
  document.querySelector('.shop-card .shop-buy')?.click(); __frames(14); })()`);
await page.waitForTimeout(300);
await page.screenshot({ path: 'qa-output/m8/crate-falling.png' });
await page.evaluate(`__frames(30)`);
await page.waitForTimeout(300);
await page.screenshot({ path: 'qa-output/m8/crate-landed.png' });
await context.close();
await browser.close();
