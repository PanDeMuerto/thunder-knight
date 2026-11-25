// Queen Ada by eye (M10): front, three-quarter and side, close; and beside the hero at the banner, as in the ending.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, 'd1280', 'ada');
await page.evaluate(`(async () => {
  const g = window.__game; g.devScene('empty');
  const { loadAda, AdaFigure } = await import('/src/world/adaFigure.ts');
  const ada = new AdaFigure(await loadAda());
  g.stage.scene.add(ada.root);
  window.__ada = ada;
  ada.place(0, g.field.heightAt(0, 0), 0, Math.PI);
  g.hero.place(3, 3, 0);
  __frames(10);
})()`);
for (const [name, ax, ay, az, ly] of [['front', 0, 1.3, 2.6, 1.1], ['three', 1.9, 1.4, 1.9, 1.1], ['side', 2.6, 1.3, 0, 1.1], ['face', 0, 1.55, 1.2, 1.5]]) {
  await page.evaluate(`(() => { const g = window.__game; g.rig.update = () => {}; const c = g.stage.camera; c.position.set(${ax}, ${ay}, ${az}); c.lookAt(0, ${ly}, 0); c.updateMatrixWorld(); window.__ada.update(1/60); __step(1/60); document.querySelector('#ui').style.display = 'none'; })()`);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `qa-output/m9/ada-${name}.png`, clip: { x: 340, y: 60, width: 600, height: 600 } });
}
await context.close();
await browser.close();
console.log('ok');
