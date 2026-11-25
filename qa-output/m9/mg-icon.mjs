// The machine gun's shop picture next to the assault rifle's (rendered at load from the same models).
import { writeFileSync } from 'node:fs';
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, 'd1280', 'mgicon');
const urls = await page.evaluate(`(() => { const a = window.__game.gunArt; return { ar: a.assaultRifle, mg: a.machineGun }; })()`);
await page.setContent(`<body style="background:#2b2b2b;margin:0;display:flex;gap:30px;padding:30px"><img src="${urls.ar}" style="width:300px;height:auto;align-self:flex-start;background:#555"><img src="${urls.mg}" style="width:300px;height:auto;align-self:flex-start;background:#555"></body>`);
await page.waitForTimeout(200);
await page.screenshot({ path: 'qa-output/m9/mg-icons.png', clip: { x: 0, y: 0, width: 700, height: 420 } });
writeFileSync('qa-output/m9/mg-icons.txt', JSON.stringify({ ar: urls.ar?.length, mg: urls.mg?.length }));
await context.close();
await browser.close();
console.log('ok', urls.ar?.slice(0, 30), urls.mg?.slice(0, 30));
