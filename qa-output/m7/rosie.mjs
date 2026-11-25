// Rosie by her truck: from the hero's view walking up in a break, close, and in the shop's framing.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
for (const screen of ['d1280', 'p390']) {
  const { page, context } = await openStepped(browser, screen, 'rosie');
  const views = [
    // From the banner hill, looking at the camp (as after a wave).
    ['far', `g.devScene('empty'); const a = Math.atan2(-(8.6 - 2), -(4.1 + 3)); g.hero.place(2, -3, a); g.rig.snap(g.hero.position, a, g.stage.portrait); __frames(40);`],
    // Walking up to her ring.
    ['near', `g.devScene('empty'); const a = Math.atan2(-(8.6 - 4.5), -(4.1 + 2)); g.hero.place(4.5, -2, a); g.rig.snap(g.hero.position, a, g.stage.portrait); __frames(40);`],
  ];
  for (const [name, js] of views) {
    await page.evaluate(`(() => { const g = window.__game; ${js} })()`);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `qa-output/m7/rosie-${name}-${screen}.png` });
  }
  await context.close();
}
await browser.close();
console.log('ok');
