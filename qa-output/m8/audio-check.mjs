// Checks the sound set in the running game: every clip loads, nothing 404s, and the music follows the screen and phase.
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const browser = await launch();
const { page, context } = await openStepped(browser, 'd1280', 'audio');
const failed = [];
page.on('response', (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));
const state = () =>
  page.evaluate(`(() => { const a = window.__game.audio; return { loaded: a.buffers.size, music: a.musicBed?.name ?? null, ambience: !!a.ambienceBed, phase: window.__game.battle?.phase ?? window.__game.screen }; })()`);
await page.evaluate(`window.__game.state.seenLessons.push('b1', 'move:desktop', 'aim:desktop'); window.__game.audio.unlock();`);
await page.waitForTimeout(6000);
console.log('after unlock', await state());
await page.evaluate(`(() => { const g = window.__game; g.startBattle(2); __frames(5); })()`);
await page.waitForTimeout(300);
console.log('battle 2 start', await state());
await page.evaluate(`(() => { const g = window.__game; g.battle.startWave?.(); g.devAdvance(4); __frames(5); })()`);
await page.waitForTimeout(300);
console.log('after advance', await state());
await page.evaluate(`(() => { const g = window.__game; g.startBattle(5, 5); g.devAdvance(4); __frames(5); })()`);
await page.waitForTimeout(300);
console.log('boss wave', await state());
await page.evaluate(`(() => { const g = window.__game; g.showMap(); __frames(5); })()`);
await page.waitForTimeout(300);
console.log('map', await state());
console.log('failed requests', failed);
await context.close();
await browser.close();
