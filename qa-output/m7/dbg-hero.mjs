import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, 'd1280', 'dbg');
const r = await page.evaluate(`(() => { const g = window.__game; g.devScene('hill'); g.devAdvance(12); g.hero.setGun('shotgun'); __frames(40);
  const m = g.hero.model; const h = g.hero;
  return { aimPitch: h.aimPitch, aimYaw: h.aimYaw, mPitch: m.pitch, yawOff: m.yawOffset, down: m.downState, reload: m.reloadLeft, thr: m.throwLeft, heroY: h.position.y, aimPoint: g.combat.aimPoint && [g.combat.aimPoint.x, g.combat.aimPoint.y, g.combat.aimPoint.z].map(v=>v.toFixed(1)), hero: [h.position.x, h.position.z].map(v=>v.toFixed(1)), yaw: h.yaw.toFixed(2), rigYaw: g.rig.yaw.toFixed(2), rigPitch: g.rig.pitch.toFixed(2) };
})()`);
console.log(JSON.stringify(r));
await context.close(); await browser.close();
