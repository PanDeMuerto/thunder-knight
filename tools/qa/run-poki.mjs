// Checks Poki's event rules in the running game. A new player boots into Battle 1 (its onboarding is checked by
// `npm run qa`); the gun checks run in a dev scene. M5 adds the ads (section 3): no interstitial in Battle 1, one at
// Next wave and on leaving a card from Battle 2, none after a rewarded ad at the same stop; the mouse freed and input
// off during an ad; every card's rewarded button after a standard choice at least as large, with the video mark and
// not green; ×2 gold, Rally and the rift crate granted on success only, quietly withdrawn on failure or an ad blocker;
// and no 🎬 at all without ads (`?noads`).
// - init and gameLoadingFinished once, before anything else
// - no gameplayStart before the first deliberate input, then exactly one
// - pause (Esc on desktop, the pause button on touch) sends gameplayStop and shows the pause card; Resume starts again
// - never two starts or two stops in a row, and no ads requested at all in M0
// - no console errors
// - M1: the mouse-capturing click doesn't fire, holding fires at the gun's rate, R and the gun button reload, and
//   touch auto-fire shoots what's under the crosshair
// Desktop and a touch phone in portrait. Needs `npm run dev` (port 5180). Never takes the real mouse (fake lock).
// Usage: node tools/qa/run-poki.mjs
import { chromium } from 'playwright';
import { fakePointerLock } from './fake-lock.mjs';

const GAME = process.env.GAME_URL ?? 'http://localhost:5180/?nodev';
const failures = [];
const check = (ok, message) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`);
  if (!ok) failures.push(message);
};

const browser = await chromium.launch({
  channel: process.env.QA_BROWSER ?? 'chrome',
  headless: true,
  args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'],
});

async function open(contextOptions) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  await page.addInitScript(fakePointerLock);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
  await page.goto(GAME);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 60000 });
  await page.waitForTimeout(500);
  const events = () => page.evaluate(() => (window.__platformEvents ?? []).map((e) => e.name));
  return { context, page, errors, events };
}

/** Starts and stops alternate, and no ad is asked for in these flows (they reach no ad point). */
function checkSequence(label, names) {
  const flow = names.filter((n) => n === 'gameplayStart' || n === 'gameplayStop');
  const doubled = flow.some((n, i) => i > 0 && n === flow[i - 1]);
  check(!doubled, `${label}: never two starts or two stops in a row (${flow.join(' ')})`);
  check(flow[0] === 'gameplayStart', `${label}: the first gameplay event is a start`);
  const ads = names.filter((n) => n === 'commercialBreak' || n === 'rewardedBreak');
  check(ads.length === 0, `${label}: no ads asked for before an ad point (${ads.length})`);
}

// 1. Desktop.
{
  const { context, page, errors, events } = await open({ viewport: { width: 1280, height: 720 } });
  let names = await events();
  check(names[0] === 'init', 'desktop: init comes first');
  check(names.filter((n) => n === 'gameLoadingFinished').length === 1, 'desktop: gameLoadingFinished exactly once');
  check(!names.includes('gameplayStart'), 'desktop: no gameplayStart before the first input');

  await page.mouse.click(640, 400);
  await page.waitForTimeout(200);
  names = await events();
  check(names.filter((n) => n === 'gameplayStart').length === 1, 'desktop: the first click starts gameplay');
  check(await page.evaluate(() => document.pointerLockElement !== null), 'desktop: the first click captures the mouse');

  const from = await page.evaluate(() => window.__game.hero.position.toArray());
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyW');
  const moved = await page.evaluate((f) => {
    const p = window.__game.hero.position;
    return Math.hypot(p.x - f[0], p.z - f[2]);
  }, from);
  check(moved > 1.5, `desktop: W walks the hero forward (${moved.toFixed(2)} m)`);

  // M1: the click that captured the mouse didn't fire; holding the button does, at the gun's rate; R reloads early.
  const shots = () => page.evaluate(() => window.__game.combat.shots);
  check((await shots()) === 0, 'desktop: the capturing click does not fire');
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  const fired = await shots();
  check(fired >= 2 && fired <= 4, `desktop: holding the button fires at the pistol's rate (${fired} in 0.65 s)`);
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(100);
  check(await page.evaluate(() => window.__game.combat.gun.reloading > 0), 'desktop: R reloads a part-used magazine');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  names = await events();
  check(names.at(-1) === 'gameplayStop', 'desktop: Esc pauses and stops gameplay');
  check(await page.isVisible('.card-pause'), 'desktop: the pause card shows');
  check(await page.evaluate(() => document.pointerLockElement === null), 'desktop: pause frees the mouse');

  await page.click('.card-pause .btn-main');
  await page.waitForTimeout(200);
  names = await events();
  check(names.at(-1) === 'gameplayStart', 'desktop: Resume starts gameplay again');
  check(!(await page.isVisible('.card-pause')), 'desktop: the pause card closes');
  checkSequence('desktop', names);
  check(errors.length === 0, `desktop: no console errors ${errors.join(' | ')}`);
  await context.close();
}

// 2. A touch phone, portrait.
{
  const { context, page, errors, events } = await open({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  check(await page.evaluate(() => document.getElementById('game').classList.contains('is-portrait')), 'phone: portrait layout');
  check(await page.evaluate(() => window.__game.input.isTouch), 'phone: touch mode');
  await page.touchscreen.tap(120, 700);
  await page.waitForTimeout(200);
  let names = await events();
  check(names.filter((n) => n === 'gameplayStart').length === 1, 'phone: the first tap starts gameplay');
  const pause = await page.$('.btn-pause');
  const box = await pause.boundingBox();
  check(box.width >= 44 && box.height >= 44, `phone: pause button is at least 44 px (${box.width.toFixed(0)})`);

  // M1: auto-fire. On the hilltop as the march arrives, turn the view onto the nearest enemy (as a drag would) and
  // wait: the gun fires by itself. The camera orbits the hero as it turns, so aim converges over a few frames.
  await page.evaluate(() => {
    window.__game.devScene('hill');
    window.__game.devAdvance(16);
  });
  // Battle 1 shows the gun button at the first reload (onboarding §3); a dev scene shows every control.
  const gunBox = await (await page.$('.btn-gun')).boundingBox();
  check(gunBox?.width >= 64, `phone: the gun button is at least 64 px (${gunBox?.width.toFixed(0)})`);
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => {
      const g = window.__game;
      const b = g.crowd.bodies;
      const h = g.hero.position;
      let t = -1;
      let best = Infinity;
      for (let k = 0; k < b.count; k++) {
        if (!b.alive[k]) continue;
        const d = Math.hypot(b.x[k] - h.x, b.z[k] - h.z);
        if (d < best) {
          best = d;
          t = k;
        }
      }
      const e = g.stage.camera.position;
      const dx = b.x[t] - e.x;
      const dz = b.z[t] - e.z;
      g.rig.yaw = Math.atan2(-dx, -dz);
      g.rig.pitch = Math.atan2(b.aimHeight(t) - e.y, Math.hypot(dx, dz));
    });
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(700);
  const auto = await page.evaluate(() => window.__game.combat.shots);
  check(auto >= 2, `phone: auto-fire shoots a target under the crosshair (${auto} shots)`);
  await page.evaluate(() => (window.__game.rig.yaw += 1.2));
  await page.tap('.btn-gun');
  await page.waitForTimeout(100);
  check(await page.evaluate(() => window.__game.combat.gun.reloading > 0), 'phone: tapping the gun button reloads');
  await pause.tap();
  await page.waitForTimeout(250);
  names = await events();
  check(names.at(-1) === 'gameplayStop', 'phone: the pause button stops gameplay');
  await page.tap('.card-pause .btn-main');
  await page.waitForTimeout(200);
  names = await events();
  check(names.at(-1) === 'gameplayStart', 'phone: Resume starts gameplay again');
  checkSequence('phone', names);
  check(errors.length === 0, `phone: no console errors ${errors.join(' | ')}`);
  await context.close();
}


/** A real click on an element's centre (a breathing button is never "stable" to Playwright's own click). */
async function press(page, selector) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`${selector} is not on screen`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

// 3. Ads (M5, GDD §16): where interstitials are asked for, the rewarded offers on every card, success, failure and an
// ad blocker, and the ad-free build. Battles are set up and won or lost by script; the card buttons are real clicks.
const SETUP = `
  window.__clear = (g) => {
    for (let n = 0; n < 80 && g.battle && g.battle.phase === 'wave'; n++) {
      g.devAdvance(0.5);
      const b = g.crowd.bodies;
      for (let i = 0; i < b.count; i++) if (b.alive[i]) g.crowd.sim.damage(i, 9999, 0, 1);
    }
  };
  // A returning player: Battle 1's script is done.
  window.__returning = (g) => {
    for (const k of ['b1', 'move:desktop', 'aim:desktop', 'move:touch', 'aim:touch', 'grenade:desktop', 'grenade:touch', 'army', 'hero']) {
      if (!g.state.seenLessons.includes(k)) g.state.seenLessons.push(k);
    }
  };
  window.__win = (g, id) => {
    window.__returning(g);
    g.startBattle(id, 99);
    g.devAdvance(3);
    window.__clear(g);
    g.devAdvance(3);
  };
  window.__break = (g, id) => {
    window.__returning(g);
    g.startBattle(id);
    g.devAdvance(3);
    window.__clear(g);
  };
  window.__lose = (g, id) => {
    window.__returning(g);
    g.startBattle(id);
    g.devAdvance(5);
    g.battle.banner = 0;
    g.devAdvance(2.5);
  };
  // Poki's rules for a card with a rewarded button: the standard choice comes first (above or beside), at least as
  // large; the rewarded button shows the video mark and isn't green.
  window.__cardRules = () => {
    const out = [];
    for (const card of document.querySelectorAll('.card')) {
      const reward = card.querySelector('.btn-reward');
      if (!reward || reward.offsetParent === null) continue;
      const standard = card.querySelector('.btn-main, .btn-second');
      const r = reward.getBoundingClientRect();
      const s = standard?.getBoundingClientRect();
      if (!standard || standard.compareDocumentPosition(reward) !== Node.DOCUMENT_POSITION_FOLLOWING) out.push('standard choice not first');
      else {
        if (s.height + 0.5 < r.height || s.width + 0.5 < r.width) out.push('standard smaller than rewarded (' + Math.round(s.width) + 'x' + Math.round(s.height) + ' < ' + Math.round(r.width) + 'x' + Math.round(r.height) + ')');
        if (s.top > r.top + 0.5) out.push('standard below rewarded');
      }
      if (!reward.querySelector('.btn-icon svg')) out.push('no video mark');
      const [red, green, blue] = getComputedStyle(reward).backgroundColor.match(/\\d+/g).map(Number);
      if (green > red && green > blue) out.push('green rewarded button');
    }
    return out;
  };
`;

async function openAds(query = '') {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.addInitScript(fakePointerLock);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
  await page.goto(`${GAME}${query}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__game?.battle, null, { timeout: 60000 });
  await page.waitForTimeout(400);
  // The first input, so Poki's gameplay has started (no ad is ever asked for before that).
  await page.mouse.click(640, 400);
  await page.waitForTimeout(200);
  await page.evaluate(SETUP);
  const events = () => page.evaluate(() => (window.__platformEvents ?? []).map((e) => e.name));
  const mark = async () => (await events()).length;
  const since = async (from) => (await events()).slice(from);
  const run = (code) => page.evaluate(`(() => { const g = window.__game; ${code} })()`);
  return { context, page, errors, events, mark, since, run };
}

{
  const { context, page, errors, mark, since, run } = await openAds();
  const g = (expr) => page.evaluate(`(() => { const g = window.__game; return ${expr}; })()`);

  // Battle 1 (a replay): the victory card offers ×2 gold, but Continue never shows an interstitial.
  await run('window.__win(g, 1)');
  check(await page.isVisible('.card-result.is-victory'), 'ads: Battle 1 is won (victory card)');
  check((await page.evaluate('window.__cardRules()')).length === 0, `ads: the victory card follows Poki's button rules ${await page.evaluate('window.__cardRules().join(", ")')}`);
  let from = await mark();
  await press(page, '.card-result .btn-main');
  await page.waitForTimeout(1000);
  check(!(await since(from)).includes('commercialBreak'), 'ads: no interstitial after Battle 1');

  // Battle 2's break: Next wave asks for an interstitial; during it the mouse is free, input and sound are off.
  await run('window.__break(g, 2)');
  check((await g('g.battle.phase')) === 'break', 'ads: Battle 2 reaches a break');
  from = await mark();
  await press(page, '.btn-next');
  await page.waitForTimeout(250);
  const during = await g('({ mode: g.mode, lock: document.pointerLockElement !== null, input: g.input.enabled })');
  check(during.mode === 'busy' && !during.lock && !during.input, `ads: during the ad the mouse is free and input is off (${JSON.stringify(during)})`);
  await page.waitForTimeout(900);
  let after = await since(from);
  check(after.includes('commercialBreak'), `ads: Next wave in Battle 2 asks for an interstitial (${after.filter((n) => !n.startsWith('measure')).join(' ')})`);
  check(after.indexOf('gameplayStart') > after.indexOf('commercialBreak'), 'ads: gameplay starts again after the interstitial');
  check((await g('g.battle.phase')) === 'wave' && (await g('g.mode')) === 'play', 'ads: the next wave runs after the ad');

  // Victory in Battle 2: ×2 gold granted on success, once; then Continue skips the interstitial.
  await run('window.__win(g, 2)');
  check(await page.isVisible('.card-result .btn-reward'), 'ads: the Battle 2 victory card offers 🎬 ×2 gold');
  const before = await g('({ gold: g.state.gold, extra: g.battle.earned.kills + g.battle.earned.waves })');
  from = await mark();
  await press(page, '.card-result .btn-reward');
  await page.waitForTimeout(1300);
  after = await since(from);
  const gold = await g('g.state.gold');
  check(after.includes('rewardGranted') && gold === before.gold + before.extra, `ads: ×2 gold adds the knockouts and wave bonuses again (+${gold - before.gold}, expected +${before.extra})`);
  check(after.includes('measure:rewarded:double:interact'), 'ads: ×2 gold is measured (interact)');
  check(!(await page.isVisible('.card-result .btn-reward')), 'ads: the offer is gone once granted');
  from = await mark();
  await press(page, '.card-result .btn-main');
  await page.waitForTimeout(1000);
  after = await since(from);
  check(!after.includes('commercialBreak') && (await g('g.screen')) === 'map', 'ads: after a rewarded ad, Continue goes to the map with no interstitial');

  // A failed and a blocked rewarded ad: no reward, no message, the offer goes; Continue then has its interstitial.
  for (const mode of ['fail', 'blocked']) {
    await page.evaluate((m) => (window.__adMode = m), mode);
    await run('window.__win(g, 2)');
    const goldBefore = await g('g.state.gold');
    await press(page, '.card-result .btn-reward');
    await page.waitForTimeout(1300);
    check((await g('g.state.gold')) === goldBefore, `ads: a ${mode} rewarded ad grants nothing`);
    const cardText = await page.textContent('.card-result');
    check(!(await page.isVisible('.card-result .btn-reward')) && (await page.isVisible('.card-result .btn-main')) && !/ad|block/i.test(cardText.replace(/Gold|gold/g, '')), `ads: after a ${mode} ad the offer quietly goes and Continue stays`);
    from = await mark();
    await press(page, '.card-result .btn-main');
    await page.waitForTimeout(1000);
    check((await since(from)).includes('commercialBreak'), `ads: Continue after a ${mode} rewarded ad still asks for its interstitial`);
  }
  await page.evaluate(() => (window.__adMode = 'ok'));

  // Defeat in Battle 2: Retry, Map, then 🎬 Rally. Rally puts the banner at half and the same wave back in play.
  await run('window.__lose(g, 2)');
  check(await page.isVisible('.card-result.is-defeat'), 'ads: Battle 2 is lost (defeat card)');
  const order = await page.evaluate(() => [...document.querySelectorAll('.card-result button')].map((b) => b.className));
  check(order.join(' ') === 'btn-main btn-second btn-reward', `ads: the defeat card reads Retry, Map, 🎬 Rally (${order.join(' ')})`);
  check((await page.evaluate('window.__cardRules()')).length === 0, `ads: the defeat card follows Poki's button rules ${await page.evaluate('window.__cardRules().join(", ")')}`);
  const wave = await g('g.battle.wave');
  from = await mark();
  await press(page, '.card-result .btn-reward');
  await page.waitForTimeout(1300);
  after = await since(from);
  const rallied = await g('({ phase: g.battle.phase, wave: g.battle.wave, banner: g.battle.banner / g.battle.bannerMax, card: g.result.open, mode: g.mode })');
  check(rallied.phase === 'wave' && rallied.wave === wave && Math.abs(rallied.banner - 0.5) < 0.05 && !rallied.card && rallied.mode === 'play', `ads: Rally returns to the same wave with the banner at half (${JSON.stringify(rallied)})`);
  check(after.at(-1) === 'gameplayStart' || after.filter((n) => !n.startsWith('measure')).at(-1) === 'gameplayStart', 'ads: gameplay starts again after Rally');
  await run('g.battle.banner = 0; g.devAdvance(2.5);');
  check(await page.isVisible('.card-result.is-defeat'), 'ads: losing again shows the defeat card');
  check(!(await page.isVisible('.card-result .btn-reward')), 'ads: Rally is offered once per battle');
  check(errors.length === 0, `ads: no console errors ${errors.join(' | ')}`);
  await context.close();
}

// The rift crate (forced with the dev link `?crate`): No thanks first; Open lends a gun for the next wave, and that
// break's Next wave has no interstitial.
{
  const { context, page, errors, mark, since, run } = await openAds('&crate');
  const g = (expr) => page.evaluate(`(() => { const g = window.__game; return ${expr}; })()`);
  await run('window.__break(g, 3)');
  await page.waitForTimeout(1200);
  check(await g('g.crate.landed'), 'crate: a crate lands beside the truck in the first break');
  await run('g.hero.place(GREYBOX_X, GREYBOX_Z, g.rig.yaw)'.replace('GREYBOX_X', '12.2').replace('GREYBOX_Z', '1.6'));
  await page.waitForTimeout(400);
  check(await page.isVisible('.card-offer'), 'crate: walking up to it opens its offer');
  const order = await page.evaluate(() => [...document.querySelectorAll('.card-offer button')].map((b) => b.className));
  check(order.join(' ') === 'btn-second btn-reward', `crate: No thanks comes first, then 🎬 Open (${order.join(' ')})`);
  check((await page.evaluate('window.__cardRules()')).length === 0, `crate: the offer follows Poki's button rules ${await page.evaluate('window.__cardRules().join(", ")')}`);
  let from = await mark();
  await press(page, '.card-offer .btn-reward');
  await page.waitForTimeout(1300);
  const loan = await g('({ loan: g.battle.loan, gun: g.battle.gun, card: g.offer.open, crate: g.crate.active })');
  check(!!loan.loan && loan.gun === loan.loan && !loan.card && !loan.crate, `crate: Open lends a gun (${JSON.stringify(loan)})`);
  check((await since(from)).includes('measure:rewarded:crate:interact'), 'crate: the offer is measured (interact)');
  from = await mark();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  check(!(await since(from)).includes('commercialBreak') && (await g('g.battle.phase')) === 'wave', 'crate: Next wave after a rewarded ad in the same break has no interstitial');
  await run('window.__clear(g)');
  check((await g('g.battle.loan')) === null, 'crate: the loan goes back when its wave ends');
  check(errors.length === 0, `crate: no console errors ${errors.join(' | ')}`);
  await context.close();
}

// The ad-free build (itch.io; `?noads` in dev): no 🎬 anywhere, no interstitials, no crate.
{
  const { context, page, errors, mark, since, run } = await openAds('&noads&crate');
  const g = (expr) => page.evaluate(`(() => { const g = window.__game; return ${expr}; })()`);
  await run('window.__win(g, 2)');
  check(!(await page.isVisible('.btn-reward')), 'no ads: the victory card has no 🎬 offer');
  await press(page, '.card-result .btn-main');
  await run('window.__lose(g, 2)');
  check(!(await page.isVisible('.btn-reward')), 'no ads: the defeat card has no 🎬 offer');
  const from = await mark();
  await run('window.__break(g, 3)');
  await page.waitForTimeout(1000);
  check(!(await g('g.crate.active')), 'no ads: no rift crate');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const asked = (await since(from)).filter((n) => n === 'commercialBreak' || n === 'rewardedBreak');
  check(asked.length === 0, `no ads: no ad is asked for (${asked.join(' ')})`);
  check(errors.length === 0, `no ads: no console errors ${errors.join(' | ')}`);
  await context.close();
}

await browser.close();
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nAll Poki checks passed');
process.exit(failures.length ? 1 : 0);
