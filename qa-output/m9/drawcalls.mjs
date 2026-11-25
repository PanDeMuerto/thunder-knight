// Draw calls in Battle 15's heaviest moments: wave 6 (a ram and a catapult) and the Siege Tower's wave, against the
// 150 budget (CLAUDE.md, perf). Drawn from the hill, looking north over the field.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, 'd1280', 'calls');
await page.evaluate(`(() => { window.__game.state.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'swap:desktop', 'support:desktop', 'sentry'); })()`);
// Usage: node qa-output/m9/drawcalls.mjs [battle] [wave,wave...]  (default: Battle 15's wave 6 and the tower's wave)
const id = Number(process.argv[2] ?? 15);
const waves = (process.argv[3] ?? '6,7').split(',').map(Number);
for (const [name, wave, secs] of waves.flatMap((w) => [[`wave${w}`, w, 14], [`wave${w}-late`, w, 40]])) {
  const r = await page.evaluate(`(() => { const g = window.__game; g.startBattle(${id}, ${wave}); g.devAdvance(3); g.devAdvance(${secs}); __frames(2);
    g.hero.place(0, -6, 0); g.rig.snap(g.hero.position, 0, false); __frames(4);
    const info = g.stage.renderer.info; info.autoReset = false; info.reset(); g.stage.render(); const calls = info.render.calls; info.autoReset = true;
    return { calls, standing: g.crowd.sim.standing(1) }; })()`);
  console.log(name, JSON.stringify(r));
}
await context.close();
await browser.close();
