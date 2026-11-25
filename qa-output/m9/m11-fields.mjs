// M11 by eye: a field from each kit file after the split (kit.glb: Region 1's Battle 3 with its mill and bridge;
// kit-later.glb: Battle 8's river, Battle 12's mountains, Battle 16's burnt orchard, Battle 20's keep), each from the
// banner looking out, and the time the later download took.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
for (const [id, x, z, tx, tz] of [[3, -12, 6, -40, 28], [8, -12, 6, -38, 28], [12, 0, -4, 0, -60], [16, -12, 6, -38, 28], [20, 0, -4, 0, -70]]) {
  const { page, context } = await openStepped(browser, 'd1280', `field ${id}`);
  await page.evaluate(`(() => { const g = window.__game; g.state.seenLessons.push('b1', 'swap:desktop');
    g.startBattle(${id}); g.devAdvance(0.5);
    const yaw = Math.atan2(-(${tx} - ${x}), -(${tz} - ${z}));
    g.hero.place(${x}, ${z}, yaw); g.rig.snap(g.hero.position, yaw, false); g.rig.pitch = -0.08; __frames(20);
    document.querySelector('#ui').style.display = 'none'; })()`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `qa-output/m9/m11-field-b${id}.png` });
  await context.close();
}
await browser.close();
console.log('ok');
