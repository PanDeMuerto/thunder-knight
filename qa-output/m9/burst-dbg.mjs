import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, 'd1280', 'burst');
const r = await page.evaluate(`(async () => { const g = window.__game; g.state.seenLessons.push('b1','move:desktop','aim:desktop','swap:desktop','intro:firebrand');
  g.startBattle(7); g.devAdvance(3); g.devAdvance(8); __frames(2);
  const { TYPES } = await import('/src/crowd/crowdSim.ts'); const s = g.crowd.sim; const b = s.bodies; let i = -1;
  for (let k = 0; k < b.count; k++) if (s.live[k] && b.alive[k] && TYPES[s.type[k]] === 'firebrand') { i = k; break; }
  let bursts = 0; const orig = s.onBurst; s.onBurst = (...a) => { bursts++; orig(...a); };
  const hx = b.x[i] + 2, hz = b.z[i] + 9; const yaw = Math.atan2(-(b.x[i] - hx), -(b.z[i] - hz)); g.hero.place(hx, hz, yaw); g.rig.snap(g.hero.position, yaw, false); __frames(2);
  s.damage(i, 9999, 0, 1); __frames(3);
  document.querySelector('#ui').style.display = 'none';
  return { i, bursts, hasOnBurst: !!orig }; })()`);
console.log(r);
await page.waitForTimeout(200);
await page.screenshot({ path: 'qa-output/m9/fb-burst2.png' });
await context.close(); await browser.close();
