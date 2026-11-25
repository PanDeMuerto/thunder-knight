// Queen Ada's clips side by side (M10): which idle, greeting and walk read as a queen. Each figure plays its clip to
// the given fraction of its length; the sheet is one picture from a three-quarter view.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, 'd1280', 'ada-poses');
const poses = process.argv[2]?.split(',') ?? ['Unarmed_Idle:0.3', 'Idle:0.3', 'Interact:0.45', 'Spellcast_Raise:0.5', 'Use_Item:0.4', 'Cheer:0.4', 'Walking_A:0.3', 'Walking_B:0.3'];
await page.evaluate(`(async () => {
  const g = window.__game; g.devScene('empty');
  const THREE = await import('/node_modules/.vite/deps/three.js');
  const { loadAda, AdaFigure } = await import('/src/world/adaFigure.ts');
  const poses = ${JSON.stringify(poses)};
  for (let k = 0; k < poses.length; k++) {
    const [clip, at] = poses[k].split(':');
    const assets = await loadAda();
    const ada = new AdaFigure(assets);
    g.stage.scene.add(ada.root);
    const x = (k - (poses.length - 1) / 2) * 1.3;
    ada.place(x, g.field.heightAt(x, 0), 0, 0.5);
    const mixer = new THREE.AnimationMixer(ada.root.children[0]);
    const c = assets.clips.find((c) => c.name === clip);
    ada.update = () => {};
    mixer.clipAction(c).play();
    mixer.update(c.duration * Number(at));
  }
  g.rig.update = () => {};
  const cam = g.stage.camera;
  cam.position.set(0.5, 1.6, -7.5);
  cam.lookAt(0, 0.9, 0);
  cam.updateMatrixWorld();
  document.querySelector('#ui').style.display = 'none';
  __step(1/60);
})()`);
await page.waitForTimeout(200);
await page.screenshot({ path: 'qa-output/m9/ada-poses.png' });
await context.close();
await browser.close();
console.log(poses.join(' '));
