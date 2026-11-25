// The busiest HUD and every card on 19 screen sizes: overlaps, elements off screen, clipped text, touch targets under
// 44 px, and Poki's mobile pill (it sits in a top corner, which one isn't documented, so both stay clear on touch).
// Every place gets the longest line it can show. Needs `npm run dev` (port 5180). Writes qa-output/hud/ screenshots.
// Usage: node tools/qa/run-hud.mjs [--screens=p320,d1280] [--states=wave,shop] [--langs=all|fr,de] [--hud=1.5]
// `--langs` checks each language on the tightest screens unless `--screens` is given. `--hud` sets the HUD size
// setting (1 to 1.5, GDD §15.4).
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from './stepper.mjs';
import { fakePointerLock } from './fake-lock.mjs';

const GAME = process.env.GAME_URL ?? 'http://localhost:5180/?nodev';
const OUT = fileURLToPath(new URL('../../qa-output/hud/', import.meta.url));

const SCREENS = [
  { name: 'p320', width: 320, height: 568, touch: true },
  { name: 'p360', width: 360, height: 640, touch: true },
  { name: 'p375', width: 375, height: 667, touch: true },
  { name: 'p390', width: 390, height: 844, touch: true },
  { name: 'p412', width: 412, height: 915, touch: true },
  { name: 'p768', width: 768, height: 1024, touch: true },
  { name: 'l568', width: 568, height: 320, touch: true },
  { name: 'l667', width: 667, height: 375, touch: true },
  { name: 'l844', width: 844, height: 390, touch: true },
  { name: 'l932', width: 932, height: 430, touch: true },
  { name: 'l1024', width: 1024, height: 768, touch: true },
  { name: 'd640', width: 640, height: 360, touch: false },
  { name: 'd800', width: 800, height: 560, touch: false },
  { name: 'd1031', width: 1031, height: 580, touch: false },
  { name: 'd1280', width: 1280, height: 720, touch: false },
  { name: 'd1366', width: 1366, height: 768, touch: false },
  { name: 'd1920', width: 1920, height: 1080, touch: false },
  { name: 'w2560', width: 2560, height: 1080, touch: false },
  { name: 'k3840', width: 3840, height: 2160, touch: false },
];

/** Everything a player reads or presses during a battle. */
const HUD_BOXES = [
  '.btn-pause',
  '.hud-gold',
  '.hud-wave',
  '.hud-bars',
  '.hud-objective',
  '.hud-toast',
  '.hud-health',
  '.hud-knocked',
  '.btn-next',
  '.nameplate',
  '.prompt',
  '.rosie',
  '.action-pad .btn',
  '.crosshair-ring',
  '.edge-arrow',
];
/** Pairs meant to share space. */
const HUD_ALLOWED = [
  // Arrows ride the screen edge toward something off screen; they're small and see-through.
  ['.edge-arrow', '*'],
  // The prompt steps aside while the army reveal's nameplate shows (is-revealing).
  ['.nameplate', '.prompt'],
];
const SHOP_BOXES = ['.shop', '.shop-head', '.shop-title', '.shop-tab', '.shop-card-name', '.shop-card-note', '.shop-buy', '.shop-close', '.shop-gold'];
const CARD_BOXES = ['.card', '.card-title', '.card-text', '.btn-main', '.btn-second', '.btn-reward', '.result-row', '.result-total', '.setting'];
const MAP_BOXES = ['.map-head', '.map-title', '.map-gold', '.map-card', '.map-card-title', '.map-card-facts > span', '.map-ada', '.btn-main', '.btn-second', '.map-node'];
const TOUCH_TARGETS = [
  '.action-pad .btn',
  '.btn-pause',
  '.btn-next',
  '.btn-main',
  '.btn-second',
  '.btn-reward',
  '.setting',
  '.shop-buy',
  '.shop-tab',
  '.shop-close',
  '.map-node',
  '.ending-skip',
];

/** A battle past onboarding, at Battle 3, with a lot of gold; the onboarding's own prompts are held off. */
const BATTLE = `
  g.result.hide(); g.pause.show(false); g.mode = 'play';
  g.state.seenLessons = ['b1', 'move:desktop', 'aim:desktop', 'move:touch', 'aim:touch', 'grenade:desktop', 'grenade:touch', 'army', 'hero', 'intro:peasant', 'intro:footman', 'intro:captain', 'intro:archer'];
  g.state.gold = 999999;
  g.startBattle(3);
  g.onboarding.update = () => g.prompt.place();
  g.touch.reveal('gun', true);
`;
const LONG = `
  const longest = (keys) => keys.map((k) => t(k)).sort((a, b) => b.length - a.length)[0];
  const prompt = longest(['move', 'aim', 'shoot', 'grenade', 'nextWave', 'goTruck', 'buy', 'downCaptain']);
  const rosie = longest(window.__keys('rosie.').concat(['battle.atBanner']));
  // Toasts: the battle lines (not the battles' names and news, which only the map shows) and a battle's title with
  // this language's longest name.
  const names = Array.from({ length: 20 }, (_, i) => t('battle.name.' + (i + 1))).sort((a, b) => b.length - a.length);
  const titleToast = t('battle.title', { n: 20, name: names[0] });
  const lineToast = longest(window.__keys('battle.').filter((k) => !k.startsWith('battle.name.') && !k.startsWith('battle.new.') && !t(k).includes('{')));
  const toast = titleToast.length > lineToast.length ? titleToast : lineToast;
  const cleared = t('battle.cleared', { gold: 9999 });
  const toastText = cleared.length > toast.length ? cleared : toast;
`;

/** Each state sets the screen up with `g` (the game) and `t` (the strings). */
const STATES = {
  // A wave in full swing: every HUD part, the longest lines, the reveal's nameplate.
  wave: {
    boxes: HUD_BOXES,
    allowed: HUD_ALLOWED,
    setup: `${BATTLE} ${LONG}
      g.battle.nextWave(); g.reveal.skip();
      g.battleHud.setObjective(t('objective.banner'));
      g.battleHud.toast(toastText, 60);
      g.battleHud.nameplate(longest(window.__keys('intro.')), 60);
      g.rosie.say(rosie, 60);
      g.prompt.show({ keys: ['mouse-move', 'mouse-left', 'W', 'A', 'S', 'D'], hand: 'drag-right', text: prompt }, g.input.isTouch);
    `,
    cleanup: `g.prompt.show(null, false); g.rosie.hush();`,
  },
  // A break: Next wave, the truck arrow, a prompt beside the button.
  break: {
    boxes: HUD_BOXES,
    allowed: HUD_ALLOWED,
    setup: `${BATTLE} ${LONG}
      g.battle.nextWave(); g.reveal.skip();
      // Away from Rosie's ring, so the shop stays shut.
      g.hero.place(-4, -6, g.rig.yaw);
      g.battle.phase = 'break'; g.onPhase('break');
      g.battleHud.toast(toastText, 60);
      g.rosie.say(rosie, 60);
      g.prompt.show({ keys: ['mouse-left', 'Enter'], hand: 'tap', target: document.querySelector('.btn-next'), text: t('nextWave') }, g.input.isTouch);
    `,
    cleanup: `g.prompt.show(null, false); g.rosie.hush();`,
  },
  // Sir Grudge's wave: the boss bar with his name, his charge prompt, the phase toast.
  boss: {
    boxes: [...HUD_BOXES, '.hud-boss-name'],
    allowed: HUD_ALLOWED,
    setup: `${BATTLE}
      g.startBattle(5, 5); g.onboarding.update = () => g.prompt.place();
      g.devAdvance(3); g.reveal.skip(); g.devAdvance(6);
      g.battleHud.toast(t('battle.bossHalf'), 60);
      g.rosie.say(t('rosie.lastShop'), 60);
      g.prompt.show({ keys: ['W', 'A', 'S', 'D'], hand: 'drag-left', text: t('stepAside') }, g.input.isTouch);
    `,
    cleanup: `g.prompt.show(null, false); g.rosie.hush();`,
  },
  // Battle 4's shop with little gold: the shotgun's "Save for this" ribbon.
  shopGoal: {
    boxes: [...HUD_BOXES, ...SHOP_BOXES, '.shop-ribbon'],
    allowed: [...HUD_ALLOWED, ['.shop', '.edge-arrow']],
    setup: `${BATTLE}
      g.state.gold = 120;
      g.battle.nextWave(); g.reveal.skip();
      g.battle.phase = 'break'; g.onPhase('break');
      g.openShop(); g.shop.open(g.state, 4);
    `,
    cleanup: `g.closeShop(false);`,
  },
  // Knocked down: the get-up countdown.
  down: {
    boxes: HUD_BOXES,
    allowed: HUD_ALLOWED,
    setup: `${BATTLE}
      g.battle.nextWave(); g.reveal.skip();
      g.battle.hurtHero(99999, g.hero.position.x + 3, g.hero.position.z);
    `,
    cleanup: ``,
  },
  // Rosie's truck in a break with every tab (as at Battle 20) and the longest lines.
  shop: {
    boxes: [...HUD_BOXES, ...SHOP_BOXES],
    allowed: [...HUD_ALLOWED, ['.shop', '.edge-arrow']],
    setup: `${BATTLE}
      g.battle.nextWave(); g.reveal.skip();
      g.battle.phase = 'break'; g.onPhase('break');
      g.openShop(); g.shop.open(g.state, 20);
      g.prompt.show({ keys: ['mouse-left'], hand: 'tap', target: document.querySelector('.shop-buy'), text: t('buy') }, g.input.isTouch);
    `,
    cleanup: `g.prompt.show(null, false); g.closeShop(false);`,
  },
  shopArmy: {
    boxes: [...HUD_BOXES, ...SHOP_BOXES],
    allowed: [...HUD_ALLOWED, ['.shop', '.edge-arrow']],
    setup: `${BATTLE}
      g.battle.nextWave(); g.reveal.skip();
      g.battle.phase = 'break'; g.onPhase('break');
      g.openShop(); g.shop.open(g.state, 20);
      [...document.querySelectorAll('.shop-tab')].at(-1)?.click();
    `,
    cleanup: `g.closeShop(false);`,
  },
  victory: {
    boxes: CARD_BOXES,
    allowed: [],
    setup: `${BATTLE}
      g.result.showVictory({ crowns: 3, kills: 99999, waves: 9999, firstClear: 9999 }, () => {}, { label: t('offer.double'), onPress: () => {} });
      g.prompt.show({ keys: ['mouse-left'], hand: 'tap', target: g.result.primary, text: t('continue') }, g.input.isTouch);
    `,
    cleanup: `g.prompt.show(null, false); g.result.hide();`,
  },
  defeat: {
    boxes: CARD_BOXES,
    allowed: [],
    setup: `${BATTLE} g.result.showDefeat(99999, () => {}, () => {}, { label: t('offer.rally'), onPress: () => {} });`,
    cleanup: `g.result.hide();`,
  },
  // A Last Stand's end (M10): waves held with the new-best stamp, gold kept, Again, Map and the Rally offer.
  stand: {
    boxes: CARD_BOXES,
    allowed: [],
    setup: `${BATTLE} g.result.showLastStand({ held: 999, best: 999, newBest: true, gold: 999999 }, () => {}, () => {}, { label: t('offer.rally'), onPress: () => {} });`,
    cleanup: `g.result.hide();`,
  },
  // Battle 20's ending (M10): the longest line at the bottom, Skip in the corner, the HUD gone.
  ending: {
    boxes: ['.ending-line', '.ending-name', '.ending-text', '.ending-skip'],
    allowed: [],
    setup: `${BATTLE}
      const line = window.__keys('ending.line').map((k) => t(k)).sort((a, b) => b.length - a.length)[0];
      g.battleHud.show(false);
      document.getElementById('game').classList.add('is-ending');
      g.endingUi.show(t('ending.skip'));
      g.endingUi.say('ada', t('ending.ada'), line);
    `,
    cleanup: `g.endingUi.hide(); g.battleHud.show(true); document.getElementById('game').classList.remove('is-ending');`,
  },
  // Its card: "Larkmoor is free!", the Last Stand unlock, To the map and the ×2 offer.
  endingCard: {
    boxes: [...CARD_BOXES, '.result-unlock'],
    allowed: [],
    setup: `${BATTLE}
      g.battleHud.show(false);
      document.getElementById('game').classList.add('is-ending');
      g.result.showVictory({ crowns: 3, kills: 99999, waves: 9999, firstClear: 9999 }, () => {}, { label: t('offer.double'), onPress: () => {} }, true);
    `,
    cleanup: `g.result.hide(); g.battleHud.show(true); document.getElementById('game').classList.remove('is-ending');`,
  },
  // The map once the campaign is won: the card carries the Last Stand button with a long record.
  mapStand: {
    boxes: MAP_BOXES,
    allowed: [],
    setup: `
      g.state.gold = 999999;
      for (let i = 1; i <= 20; i++) g.state.battles[String(i)] = { won: true, crowns: 3, defeatsInRow: 0 };
      g.state.lastStand['18'] = 999;
      g.showMap(18);
    `,
    cleanup: ``,
  },
  // The map card with this language's longest battle name and "New:" line, and Queen Ada's line under them (M11).
  mapLong: {
    boxes: MAP_BOXES,
    allowed: [],
    setup: `
      g.state.gold = 999999;
      const text = (id) => t('battle.name.' + id) + t('battle.new.' + id);
      const long = Array.from({ length: 20 }, (_, i) => i + 1).sort((a, b) => text(b).length - text(a).length)[0];
      for (let i = 1; i < long; i++) g.state.battles[String(i)] = { won: true, crowns: 3, defeatsInRow: 0 };
      g.showMap(long);
    `,
    cleanup: ``,
  },
  // The rift crate's offer with the longest gun name.
  crate: {
    boxes: CARD_BOXES,
    allowed: [],
    setup: `${BATTLE}
      const gun = window.__keys('gun.').filter((k) => !k.endsWith('.note')).map((k) => t(k)).sort((a, b) => b.length - a.length)[0];
      g.offer.show(t('offer.crate', { gun }), t('offer.crateText'), () => {}, { label: t('offer.open'), onPress: () => {} });
    `,
    cleanup: `g.offer.hide();`,
  },
  map: {
    boxes: MAP_BOXES,
    allowed: [],
    setup: `
      g.state.gold = 999999;
      for (let i = 1; i <= 2; i++) g.state.battles[String(i)] = { won: true, crowns: 3, defeatsInRow: 0 };
      g.showMap(3);
      g.prompt.show({ keys: ['mouse-left'], hand: 'tap', target: g.map.fightButton, text: t('map.fight') }, g.input.isTouch);
    `,
    cleanup: `g.prompt.show(null, false);`,
  },
  pause: {
    boxes: CARD_BOXES,
    allowed: [],
    setup: `${BATTLE} g.openPause();`,
    cleanup: `g.resume();`,
  },
  leave: {
    boxes: CARD_BOXES,
    allowed: [],
    setup: `${BATTLE} g.openPause(); g.pause.render('confirm');`,
    cleanup: `g.resume();`,
  },
  settings: {
    boxes: CARD_BOXES,
    allowed: [],
    setup: `${BATTLE} g.openPause(); g.pause.render('settings');`,
    cleanup: `g.resume();`,
  },
  // The credits (M11): two headings and their names.
  credits: {
    boxes: [...CARD_BOXES, '.credits-heading', '.credits-name'],
    allowed: [],
    setup: `${BATTLE} g.openPause(); g.pause.render('credits');`,
    cleanup: `g.resume();`,
  },
};

const measure = ({ boxes, allowed, touchTargets, pill }) => {
  const visible = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  // What shows of an element: its box cut to any scrolling or clipping parent. Null when nothing shows.
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    let { left, top, right, bottom } = r;
    for (let n = el.parentElement; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.overflowY === 'visible' && s.overflowX === 'visible') continue;
      const c = n.getBoundingClientRect();
      left = Math.max(left, c.left);
      top = Math.max(top, c.top);
      right = Math.min(right, c.right);
      bottom = Math.min(bottom, c.bottom);
    }
    return right - left > 1 && bottom - top > 1 ? { left, top, right, bottom } : null;
  };
  const found = [];
  for (const sel of boxes) {
    for (const el of document.querySelectorAll(sel)) {
      if (!visible(el)) continue;
      const r = shown(el);
      if (r) found.push({ sel, el, r });
    }
  }
  const problems = [];
  const W = innerWidth;
  const H = innerHeight;
  const onScreen = (r) => r.left >= -1 && r.top >= -1 && r.right <= W + 1 && r.bottom <= H + 1;
  const scrolledInto = (el) => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 1) return onScreen(n.getBoundingClientRect());
    }
    return false;
  };
  for (const f of found) {
    if (!onScreen(f.r) && !scrolledInto(f.el)) problems.push(`${f.sel} off screen`);
    if (f.el.scrollWidth > f.el.clientWidth + 2 && getComputedStyle(f.el).overflow !== 'visible') problems.push(`${f.sel} text clipped`);
  }
  const ok = (a, b) =>
    a === b ||
    allowed.some(([x, y]) => ((x === a || x === '*') && (y === b || y === '*')) || ((x === b || x === '*') && (y === a || y === '*')));
  const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  for (let i = 0; i < found.length; i++) {
    for (let j = i + 1; j < found.length; j++) {
      const a = found[i];
      const b = found[j];
      if (ok(a.sel, b.sel) || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      if (hit(a.r, b.r)) problems.push(`${a.sel} overlaps ${b.sel}`);
    }
  }
  if (pill) {
    // Poki's mobile pill, 46 × 62 px: 30% down an edge in portrait, at the top (24 px) in landscape. Which edge isn't
    // documented, so both stay clear.
    const top = H > W ? H * 0.3 : 24;
    const corners = [
      { left: 0, right: 46, top, bottom: top + 62 },
      { left: W - 46, right: W, top, bottom: top + 62 },
    ];
    // Panels may pass under it; what's on them (text, buttons) may not.
    const panels = ['.edge-arrow', '.card', '.shop', '.shop-head', '.map-card', '.map-head'];
    for (const f of found) if (!panels.includes(f.sel) && corners.some((c) => hit(f.r, c))) problems.push(`${f.sel} under Poki's pill`);
    for (const sel of touchTargets) {
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (visible(el) && shown(el) && (r.width < 44 || r.height < 44)) problems.push(`${sel} smaller than 44 px (${Math.round(r.width)}×${Math.round(r.height)})`);
      }
    }
  }
  return [...new Set(problems)];
};

const args = process.argv.slice(2);
const LANGS = ['en', 'fr', 'it', 'de', 'es', 'tr', 'zh', 'ja', 'ko', 'pt', 'ru'];
const langArg = args.find((a) => a.startsWith('--langs='))?.slice(8);
const langs = !langArg ? [null] : langArg === 'all' ? LANGS : langArg.split(',');
const hudScale = Number(args.find((a) => a.startsWith('--hud='))?.slice(6) ?? 1);
/** The tightest screens, for the language runs: the smallest phones both ways, small desktops and the largest. */
const LANG_SCREENS = ['p320', 'p375', 'l568', 'l844', 'd640', 'd1280', 'k3840'];
const screenArg = args.find((a) => a.startsWith('--screens='))?.slice(10);
const screenNames = screenArg ? screenArg.split(',') : langArg ? LANG_SCREENS : null;
const screens = screenNames ? SCREENS.filter((s) => screenNames.includes(s.name)) : SCREENS;
const stateArg = args.find((a) => a.startsWith('--states='))?.slice(9);
const states = Object.entries(STATES).filter(([name]) => !stateArg || stateArg.split(',').includes(name));

const browser = await launch();
mkdirSync(OUT, { recursive: true });
let failures = 0;
for (const lang of langs) {
  for (const screen of screens) {
    const context = await browser.newContext({
      viewport: { width: screen.width, height: screen.height },
      hasTouch: screen.touch,
      isMobile: screen.touch,
    });
    const page = await context.newPage();
    await page.addInitScript(fakePointerLock);
    // The language and HUD size, as the player's own settings.
    await page.addInitScript(
      ([language, hud]) => {
        const key = 'thunder-knight.settings';
        let s;
        try {
          s = JSON.parse(localStorage.getItem(key) ?? '{}');
        } catch {
          s = {};
        }
        if (language) s.language = language;
        s.hudScale = hud;
        localStorage.setItem(key, JSON.stringify(s));
      },
      [lang, hudScale],
    );
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(GAME);
    await page.waitForFunction(() => window.__game?.onboarding && window.__game.battle, null, { timeout: 60000 });
    await page.evaluate(async () => {
      const { EN } = await import('/src/content/strings/en.ts');
      window.__keys = (prefix) => Object.keys(EN).filter((k) => k.startsWith(prefix));
    });
    for (const [state, spec] of states) {
      try {
        await page.evaluate(`(async () => { const g = window.__game; const t = window.__t; ${spec.setup} })()`);
      } catch (e) {
        console.log(`FAIL ${state}-${screen.name}: setup threw ${e.message.split('\n')[0]}`);
        failures++;
        continue;
      }
      await page.waitForTimeout(state === 'wave' || state === 'break' ? 900 : 450);
      const problems = await page.evaluate(measure, {
        boxes: spec.boxes,
        allowed: spec.allowed,
        touchTargets: TOUCH_TARGETS,
        pill: screen.touch,
      });
      const name = `${state}-${screen.name}${lang ? `-${lang}` : ''}${hudScale !== 1 ? `-hud${hudScale}` : ''}`;
      await page.screenshot({ path: `${OUT}${name}.png` });
      console.log(`${problems.length ? 'FAIL' : 'ok  '} ${name}${problems.length ? ': ' + problems.join('; ') : ''}`);
      failures += problems.length ? 1 : 0;
      await page.evaluate(`(() => { const g = window.__game; ${spec.cleanup} })()`);
      await page.waitForTimeout(80);
    }
    if (errors.length) {
      console.log(`FAIL ${screen.name}: page errors: ${errors.slice(0, 3).join(' | ')}`);
      failures++;
    }
    await context.close();
  }
}
await browser.close();
console.log(failures ? `\n${failures} screens with problems` : '\nall screens clean');
process.exit(failures ? 1 : 0);
