// The banner close up (front and side) and from the far front line looking back.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, 'd1280', 'banner');
for (const [name, cam, look] of [['front', [3, 5.5, -2], [1, 5, -12]], ['side', [9, 4.5, -10], [0.5, 4.8, -12]], ['far', [6, 4, 22], [0, 4, -12]]]) {
  await page.evaluate(`(() => { const g = window.__game; g.devScene('empty'); __frames(5); g.rig.update = () => {};
    const c = g.stage.camera; c.position.set(${cam}); c.lookAt(${look}); c.updateMatrixWorld(); __frames(2);
    document.querySelector('#ui').style.display = 'none'; })()`);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `qa-output/m7/banner-${name}.png` });
}
await context.close();
await browser.close();
console.log('ok');
