// Close looks at the shield wall and Sir Grudge from the hero's place, 7 m in front of one.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, 'd1280', 'shields');
for (const [name, start, type, dist] of [['wall', 'g.startBattle(4); g.devAdvance(3); g.devAdvance(24);', 'shieldWall', 6], ['grudge', 'g.startBattle(5, 5); g.devAdvance(3); g.devAdvance(14);', 'grudge', 9]]) {
  const ok = await page.evaluate(`(async () => { const g = window.__game; const { TYPES } = await import('/src/crowd/crowdSim.ts');
    ${start}
    const s = g.crowd.sim; const b = s.bodies; const t = TYPES.indexOf('${type}'); let i = -1;
    for (let k = 0; k < b.count; k++) if (b.alive[k] && s.type[k] === t) { i = k; break; }
    if (i < 0) return 'none';
    g.hero.place(b.x[i] + 1.5, b.z[i] + ${dist}, Math.atan2(1.5, ${dist})); g.rig.snap(g.hero.position, Math.atan2(1.5, ${dist}), g.stage.portrait);
    __frames(3); document.querySelector('#ui').style.display = 'none'; return 'ok'; })()`);
  console.log(name, ok);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `qa-output/m7/shield-${name}.png` });
}
await context.close();
await browser.close();
