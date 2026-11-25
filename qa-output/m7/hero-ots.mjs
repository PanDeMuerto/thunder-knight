import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
for (const screen of ['d1280', 'p390']) {
  const { page, context } = await openStepped(browser, screen, 'hero ots');
  for (const gun of ['pistol', 'shotgun', 'smg']) {
    await page.evaluate(`(() => { const g = window.__game; g.devScene('hill'); g.devAdvance(12); g.hero.setGun('${gun}'); g.combat.gun.equip(window.__guns?.${gun} ?? g.combat.gun.def, 1); __frames(40); })()`);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `qa-output/m7/ots-${gun}-${screen}.png` });
  }
  await context.close();
}
await browser.close();
console.log('ok');
