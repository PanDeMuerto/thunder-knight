// Diagnoses Region 3 with the qa:battles bot: the player as the economy simulator leaves Battle 10 (or N), then one
// battle, logging each wave's banner low point and who stood in the ring while it drained.
// Usage: node qa-output/m9/bot-region3.mjs <battle> [fromAfter]
import { readFileSync } from 'node:fs';
import { launch, openStepped } from '../../tools/qa/stepper.mjs';
const id = Number(process.argv[2] ?? 12);
const after = Number(process.argv[3] ?? id - 1);
const src = readFileSync('tools/qa/run-battles.mjs', 'utf8');
const start = src.indexOf('const BOT = `') + 13;
// The bot is a template literal in its file: evaluate it as one, so its escapes come out as the page sees them.
const end = start + src.slice(start).search(/\r?\n`;\r?\n/);
const BOT = new Function('return `' + src.slice(start, end) + '\n`')();
const browser = await launch();
const { page, context } = await openStepped(browser, 'd1280', 'r3');
await page.evaluate(`(async () => {
  const g = window.__game; const proto = Object.getPrototypeOf(g);
  g.update = () => {}; window.__step = (dt) => proto.update.call(g, dt); g.stage.render = () => {};
  const cs = await import('/src/crowd/crowdSim.ts'); window.__types = cs.TYPES; window.__ENEMY = cs.ENEMY;
  const { simulate } = await import('/src/state/balance.ts');
  const r = simulate(${after});
  Object.assign(g.state, r.state);
  g.state.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'swap:desktop', 'support:desktop', 'grenade:desktop');
  g.onFirstInput();
  g.startBattle(${id});
})()`);
await page.evaluate(BOT);
const st = await page.evaluate(`(() => { const s = window.__game.state; return { gold: s.gold, guns: s.guns, hand: s.hand, hero: s.hero, army: s.army }; })()`);
console.log('state', JSON.stringify(st));
let last = null;
for (let s = 0; s < 900; s++) {
  const r = await page.evaluate(`(() => { const g = window.__game; let phase; const ring = {};
    for (let k = 0; k < 20; k++) { phase = __bot(g, false); __step(0.05);
      const sim = g.crowd.sim; const b = sim.bodies;
      if (phase === 'wave') for (let i = 0; i < sim.capacity; i++) if (sim.live[i] && sim.team[i] === window.__ENEMY && sim.isUp(i) && Math.hypot(b.x[i], b.z[i] + 12) < 9) { const t = window.__types[sim.type[i]]; ring[t] = (ring[t] || 0) + 1; }
    }
    const sim = g.crowd.sim; const standing = {};
    for (let i = 0; i < sim.capacity; i++) if (sim.live[i] && sim.team[i] === window.__ENEMY && sim.isUp(i)) { const t = window.__types[sim.type[i]]; standing[t] = (standing[t] || 0) + 1; }
    return { phase, wave: g.battle?.wave, banner: g.battle?.banner, gun: g.battle?.gun, card: g.result.open, ring, standing, ad: g.mode === 'busy' || g.adPending, hp: g.battle?.heroHp };
  })()`);
  if (r.ad) await page.waitForTimeout(150);
  const key = `${r.phase} w${r.wave}`;
  if (key !== last) { console.log(`${s.toString().padStart(4)} ${key} banner ${(r.banner * 100).toFixed(0)}% gun ${r.gun}`); last = key; }
  if (Object.keys(r.ring).length && s % 3 === 0) console.log(`      ring ${JSON.stringify(r.ring)} banner ${(r.banner * 100).toFixed(0)}%`);
  if (r.phase === 'wave' && s % 30 === 0) console.log(`      standing ${JSON.stringify(r.standing)}`);
  if (r.card) { console.log('card', r.phase, (r.banner * 100).toFixed(0)); break; }
}
await context.close();
await browser.close();
