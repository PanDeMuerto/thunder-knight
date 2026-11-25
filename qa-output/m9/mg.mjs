// The machine gun (M9 part 4) in the hero's hand: from the side and from behind (the game's view), beside the assault
// rifle for size; and its picture in the shop at Battle 12.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, 'd1280', 'mg');
const levels = (process.argv[3] ?? '1').split(',').map(Number);
for (const gun of (process.argv[2] ?? 'assaultRifle,machineGun').split(',')) for (const level of levels) {
  for (const [name, yawOff, dist] of [['side', Math.PI / 2, 3], ['back', Math.PI * 0.85, 3]]) {
    await page.evaluate(`(() => { const g = window.__game; g.devScene('empty'); g.hero.place(0, 4, 0); g.hero.setGun('${gun}', ${level});
      const ahead = g.hero.position.clone(); ahead.z -= 25; ahead.y += 1.35;
      g.hero.aimAt = ((orig) => () => orig.call(g.hero, ahead))(Object.getPrototypeOf(g.hero).aimAt);
      __frames(20);
      g.rig.update = () => {};
      const c = g.stage.camera; const a = ${yawOff}; c.position.set(Math.sin(a) * ${dist} * -1, 1.45, 4 - Math.cos(a) * ${dist});
      c.lookAt(0, 1.05, 4); c.updateMatrixWorld(); __step(1/60);
      document.querySelector('#ui').style.display = 'none'; })()`);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `qa-output/m9/mg-${gun}${levels.length > 1 ? `-s${level}` : ''}-${name}.png`, clip: { x: 340, y: 60, width: 600, height: 600 } });
  }
}
await context.close();
await browser.close();
console.log('ok');
