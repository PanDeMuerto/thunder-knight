// Close looks at the hero: from behind (the game's view), from the front-left and the side, with each gun.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, 'd1280', 'hero');
for (const gun of ['pistol', 'shotgun', 'smg']) {
  for (const [name, yawOff, dist] of [['front', Math.PI * 0.25, 3.2], ['side', Math.PI / 2, 3], ['back', Math.PI * 0.85, 3]]) {
    await page.evaluate(`(() => { const g = window.__game; g.devScene('empty'); g.hero.place(0, 4, 0); g.hero.setGun('${gun}');
      // Aim straight ahead (the review camera isn't where the crosshair is).
      const ahead = g.hero.position.clone(); ahead.z -= 25; ahead.y += 1.35;
      g.hero.aimAt = ((orig) => () => orig.call(g.hero, ahead))(Object.getPrototypeOf(g.hero).aimAt);
      __frames(20);
      g.rig.update = () => {};
      const c = g.stage.camera; const a = ${yawOff}; c.position.set(Math.sin(a) * ${dist} * -1, 1.45, 4 - Math.cos(a) * ${dist});
      c.lookAt(0, 1.05, 4); c.updateMatrixWorld(); __step(1/60);
      document.querySelector('#ui').style.display = 'none'; })()`);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `qa-output/m7/hero-${gun}-${name}.png`, clip: { x: 340, y: 60, width: 600, height: 600 } });
  }
}
await context.close();
await browser.close();
console.log('ok');
