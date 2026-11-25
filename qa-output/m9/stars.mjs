// The guns' star looks (GDD §8.1) by eye: every gun in the hero's hand at ★1, ★3 (a sight or a drum) and ★5 (gold
// bands), seen close from his right, the camera beside the gun. Writes one picture per gun and level, and a grid.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, 'd1280', 'stars');
const guns = ['pistol', 'shotgun', 'smg', 'assaultRifle', 'huntingRifle', 'machineGun', 'grenadeLauncher', 'minigun', 'rocketLauncher'];
for (const gun of guns) {
  for (const level of [1, 3, 5]) {
    await page.evaluate(`(() => { const g = window.__game; g.devScene('empty'); g.hero.place(0, 4, 0); g.hero.setGun('${gun}', ${level});
      const ahead = g.hero.position.clone(); ahead.z -= 25; ahead.y += 1.35;
      g.hero.aimAt = ((orig) => () => orig.call(g.hero, ahead))(Object.getPrototypeOf(g.hero).aimAt);
      __frames(20);
      g.rig.update = () => {};
      const m = g.hero.position.clone(); g.hero.muzzle(m);
      const c = g.stage.camera; c.position.set(m.x + 1.5, m.y + 0.35, m.z + 0.55); c.lookAt(m.x, m.y, m.z + 0.55); c.updateMatrixWorld(); __step(1/60);
      document.querySelector('#ui').style.display = 'none'; })()`);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `qa-output/m9/stars-${gun}-${level}.png`, clip: { x: 340, y: 180, width: 600, height: 360 } });
  }
}
await context.close();
await browser.close();
console.log('ok');
