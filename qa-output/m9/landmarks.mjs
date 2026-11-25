import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
for (const id of [6, 8, 10]) {
  const { page, context } = await openStepped(browser, 'd1280', `landmark ${id}`);
  await page.evaluate(`(() => { const g = window.__game; g.state.seenLessons.push('b1', 'swap:desktop');
    g.startBattle(${id}); g.devAdvance(0.5);
    const yaw = Math.atan2(-(-38 - -12), -(28 - 6));
    g.hero.place(-12, 6, yaw); g.rig.snap(g.hero.position, yaw, false); g.rig.pitch = -0.12; __frames(20);
    document.querySelector('#ui').style.display = 'none'; })()`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `qa-output/m9/landmark-b${id}.png` });
  await context.close();
}
await browser.close();
console.log('ok');
