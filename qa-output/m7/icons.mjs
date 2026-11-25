// The shop's gun cards with the rendered gun pictures, and the gun button on a phone with each gun.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
for (const screen of ['d1280', 'p390']) {
  const { page, context } = await openStepped(browser, screen, 'icons');
  await page.evaluate(`window.__clear = (g) => {
    for (let n = 0; n < 80 && g.battle && g.battle.phase === 'wave'; n++) {
      g.devAdvance(0.5);
      const b = g.crowd.bodies;
      for (let i = 0; i < b.count; i++) if (b.alive[i]) g.crowd.sim.damage(i, 9999, 0, 1);
    }
  }; window.__game.state.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'move:touch', 'aim:touch');`);
  await page.evaluate(`(() => { const g = window.__game; g.state.gold = 900; g.state.guns = { ...g.state.guns, shotgun: 1 }; g.startBattle(4); g.devAdvance(3); __clear(g);
    g.hero.place(7, 2.2, -0.6); g.rig.snap(g.hero.position, -0.6, g.stage.portrait); __frames(20);
    const tab = [...document.querySelectorAll('.shop-tabs button')].find((b) => b.textContent.includes('Guns')); tab?.click(); __frames(2); })()`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `qa-output/m7/icons-shop-${screen}.png` });
  for (const gun of ['pistol', 'shotgun', 'smg']) {
    await page.evaluate(`(() => { const g = window.__game; g.devScene('hill'); g.devAdvance(4); g.equip('${gun}', 1); g.touch.reveal('gun', true); __frames(5); })()`);
    await page.waitForTimeout(700);
    const box = await page.evaluate(`(() => { const r = document.querySelector('.btn-gun').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })()`);
    await page.screenshot({ path: `qa-output/m7/icons-btn-${gun}-${screen}.png`, clip: { x: box[0] - 10, y: box[1] - 10, width: box[2] + 20, height: box[3] + 20 } });
  }
  await context.close();
}
await browser.close();
console.log('ok');
