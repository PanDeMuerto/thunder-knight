// Plays the campaign end to end with a scripted player (milestones M3 exit):
// - a new player starts straight in Battle 1; the bot walks up to the banner, shoots the nearest enemies, throws
//   grenades at clumps, walks to Rosie's truck in each break, buys the Recommended item and starts the next wave
// - victory → the card → Continue → the map → Fight! → Battles 2 to 12 (shield walls, Sir Grudge, riders, firebrands,
//   men-at-arms, the War Wagon, Brutes, battering rams, catapults, the Siege Tower; the bot calls its support when foes
//   are near)
// - a deliberate defeat (the bot stands still), the defeat card, Retry
// - a reload keeps gold and purchases and lands on the map
// - Poki: gameplay only during waves, starts and stops alternate, no ad in Battle 1, interstitials from Battle 2
//   (Next wave, Continue), no rewarded ad unless chosen, no console errors
// The page's loop is stepped (no drawing during play, for speed). Never takes the owner's mouse.
// Needs `npm run dev` (port 5180). Usage: node tools/qa/run-battles.mjs
import { launch, openStepped } from './stepper.mjs';

const failures = [];
const check = (ok, message) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`);
  if (!ok) failures.push(message);
};

const BOT = `
window.__botKeys = (g, dx, dz) => {
  g.input.keys.clear();
  const l = Math.hypot(dx, dz); if (l < 0.6) return false;
  // Pushing into a stone or a hedge: sidestep for a moment, as a player would steer round it.
  const p = g.hero.position; const last = window.__lastPos ?? { x: p.x, z: p.z };
  window.__stuck = Math.hypot(p.x - last.x, p.z - last.z) < 0.01 ? (window.__stuck ?? 0) + 1 : 0;
  window.__lastPos = { x: p.x, z: p.z };
  if (window.__stuck > 20) window.__sidestep = 30;
  if (window.__sidestep > 0) { window.__sidestep--; g.input.keys.add('KeyA'); g.input.keys.add('KeyS'); return true; }
  const yaw = g.rig.yaw; const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const f = (dx * fx + dz * fz) / l, r = (dx * rx + dz * rz) / l;
  if (f > 0.35) g.input.keys.add('KeyW'); if (f < -0.35) g.input.keys.add('KeyS');
  if (r > 0.35) g.input.keys.add('KeyD'); if (r < -0.35) g.input.keys.add('KeyA');
  return true;
};
window.__bot = (g, idle) => {
  const b = g.battle; if (!b) return 'none';
  const h = g.hero.position;
  if (idle) {
    // Losing on purpose: the hero stands still and the allies are taken out, so nothing stops the march.
    g.input.keys.clear(); g.input.fireHeld = false;
    const sim = g.crowd.sim;
    for (let i = 0; i < sim.capacity; i++) if (sim.live[i] && sim.team[i] === 1 && sim.state[i] !== 5) sim.damage(i, 9999, 0, 1);
    return b.phase;
  }
  if (b.phase === 'break') {
    g.input.fireHeld = false;
    const spot = { x: 7, z: 2.2 };
    if (!g.shop.isOpen && !window.__bought) __botKeys(g, spot.x - h.x, spot.z - h.z);
    else g.input.keys.clear();
    if (g.shop.isOpen && !window.__bought) {
      const best = document.querySelector('.shop-card.is-best .shop-buy:not(:disabled)');
      if (best) { best.click(); window.__buys = (window.__buys || 0) + 1; }
      window.__bought = true;
      // Then carry the best guns, as a player picks them in the shop: the owned ones with the most damage a second
      // (at their stars), best in the first hand.
      if (window.__gunDps) {
        const owned = Object.keys(g.state.guns).filter((k) => g.state.guns[k] > 0).sort((p, q) => window.__gunDps(q, g.state.guns[q]) - window.__gunDps(p, g.state.guns[p]));
        const two = g.battle.reached >= 6;
        g.state.hand = [owned[0], two ? (owned[1] ?? null) : null];
        g.battle.equipHand();
      }
    }
    if (window.__bought) { window.__breakWait = (window.__breakWait || 0) + 1; if (window.__breakWait > 20) { g.input.pressed.add('next'); window.__breakWait = 0; } }
    return b.phase;
  }
  window.__bought = false;
  if (b.phase !== 'wave' && b.phase !== 'ready') { g.input.keys.clear(); g.input.fireHeld = false; return b.phase; }
  // A defender: the enemy nearest the banner first (the boss and captains when close), from the hill in front of it.
  const sim = g.crowd.sim; const bodies = g.crowd.bodies; let t = -1, bestScore = Infinity;
  for (let i = 0; i < bodies.count; i++) { if (!bodies.alive[i]) continue;
    // The War Wagon's hull stops bullets: shoot its wheels (they score as captains).
    if (sim.wagonParts(i)) continue;
    const toBanner = Math.hypot(bodies.x[i], bodies.z[i] + 12);
    const score = toBanner - (bodies.role[i] === 2 && toBanner < 25 ? 8 : 0);
    if (score < bestScore && Math.hypot(bodies.x[i] - h.x, bodies.z[i] - h.z) < 45) { bestScore = score; t = i; } }
  // Nothing within 45 m for a while, but the wave isn't over (a catapult's crew at the far edge): go for the nearest,
  // as a player would rush them. Not sooner: squads just entering at the edge come to the bot.
  window.__idle = t < 0 ? (window.__idle || 0) + 0.05 : 0;
  if (t < 0 && window.__idle > 8) {
    let best = Infinity;
    for (let i = 0; i < bodies.count; i++) {
      if (!bodies.alive[i] || sim.wagonParts(i)) continue;
      const d = Math.hypot(bodies.x[i] - h.x, bodies.z[i] - h.z);
      if (d < best) { best = d; t = i; }
    }
  }
  const bestD = t >= 0 ? Math.hypot(bodies.x[t] - h.x, bodies.z[t] - h.z) : Infinity;
  // Leave the hill only to get round a shield to its side (GDD §9.1), or to reach archers (and anything else) out of
  // the gun's reach while nothing presses the banner.
  let goalX = 0.5, goalZ = -9;
  if (t >= 0) {
    const range = b.gunDef.range;
    const tx = bodies.x[t], tz = bodies.z[t]; const hd = sim.heading[t];
    const fx = -Math.sin(hd), fz = -Math.cos(hd);
    const vx = h.x - tx, vz = h.z - tz; const vl = Math.hypot(vx, vz) || 1;
    const pressed = sim.pressure(0, -12, 9, () => 1) > 0;
    // A war wagon's wheel: the hull stops bullets, so stand off its corner, out past the wheel.
    let wagon = -1;
    for (let i = 0; i < bodies.count; i++) if (sim.live[i] && sim.wagonParts(i)?.wheels.includes(t)) wagon = i;
    if (wagon >= 0) {
      const ox = tx - bodies.x[wagon], oz = tz - bodies.z[wagon]; const ol = Math.hypot(ox, oz) || 1;
      goalX = tx + (ox / ol) * 7; goalZ = tz + (oz / ol) * 7;
    } else if (sim.shield[t] > 0 && (vx * fx + vz * fz) / vl > 0.2 && bestD < 18) {
      const side = (vx * Math.cos(hd) - vz * Math.sin(hd)) >= 0 ? 1 : -1;
      goalX = tx + Math.cos(hd) * 6 * side; goalZ = tz - Math.sin(hd) * 6 * side;
    } else if (bestD > range * 0.85 && !pressed) {
      goalX = tx + (vx / vl) * range * 0.6; goalZ = tz + (vz / vl) * range * 0.6;
    } else if (bodies.role[t] === 1 && bestD > 24 && !pressed) {
      // Archers far out (the nameplate says it: go get them): close to about 14 m.
      goalX = tx + (vx / vl) * 14; goalZ = tz + (vz / vl) * 14;
    }
  }
  // Shooting the same soldier for 8 s without hurting him (a rock or tree in the way): walk up to him, as a player would.
  if (t >= 0 && t === window.__stuckT && bodies.hp[t] >= window.__stuckHp) window.__stuckFor = (window.__stuckFor || 0) + 0.05;
  else { window.__stuckT = t; window.__stuckHp = t >= 0 ? bodies.hp[t] : 0; window.__stuckFor = 0; }
  if (t >= 0 && window.__stuckFor > 8) { goalX = bodies.x[t] + (h.x - bodies.x[t]) * 0.25; goalZ = bodies.z[t] + (h.z - bodies.z[t]) * 0.25; }
  // A glowing lane (a Brute's or a boss's wind-up) through where the bot stands: step out of it sideways, as the
  // lesson teaches, and keep shooting.
  for (let w = sim.windingUp(); w >= 0; w = sim.windingUp(w + 1)) {
    const lx = h.x - bodies.x[w], lz = h.z - bodies.z[w];
    const along = lx * sim.chargeX[w] + lz * sim.chargeZ[w];
    const side = lx * sim.chargeZ[w] - lz * sim.chargeX[w];
    if (along > -1 && along < 16 && Math.abs(side) < bodies.radius[w] + 2.2) {
      const s = side >= 0 ? 1 : -1;
      goalX = h.x + sim.chargeZ[w] * s * 5; goalZ = h.z - sim.chargeX[w] * s * 5;
    }
  }
  // The Iron Ox's fire cone over where the bot stands: step out of it sideways too.
  const cone = sim.bossUp >= 0 && sim.fireCone ? sim.fireCone(sim.bossUp) : null;
  if (cone) {
    const lx = h.x - cone.x, lz = h.z - cone.z; const d = Math.hypot(lx, lz) || 1;
    if (d < cone.length + 1.5 && (lx * cone.dirX + lz * cone.dirZ) / d > Math.cos(cone.half + 0.15)) {
      const side = lx * cone.dirZ - lz * cone.dirX >= 0 ? 1 : -1;
      goalX = h.x + cone.dirZ * side * 7; goalZ = h.z - cone.dirX * side * 7;
    }
  }
  __botKeys(g, goalX - h.x, goalZ - h.z);
  if (t < 0) { g.input.fireHeld = false; return b.phase; }
  const e = g.stage.camera.position;
  const dx = bodies.x[t] - e.x, dz = bodies.z[t] - e.z, dy = bodies.aimHeight(t) - e.y;
  const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, Math.hypot(dx, dz));
  const dYaw = Math.atan2(Math.sin(yaw - g.rig.yaw), Math.cos(yaw - g.rig.yaw)) * 180 / Math.PI;
  const dPitch = (pitch - g.rig.pitch) * 180 / Math.PI;
  const left = Math.hypot(dYaw, dPitch); const k = left > 4 ? 4 / left : 1;
  g.input.lookX += -dYaw * k; g.input.lookY += -dPitch * k; g.input.sinceLook = 0;
  g.input.fireHeld = left < 1.5;
  // The support call-in (a Rift Strike or a Sentry Gun) once the Baron's men are within 25 m.
  if (b.support > 0 && bestD < 25) g.input.pressed.add('support');
  // A grenade at a clump of four or more within 20 m.
  if (b.grenades > 0 && bestD < 20) {
    let n = 0; for (let i = 0; i < bodies.count; i++) if (bodies.alive[i] && Math.hypot(bodies.x[i] - bodies.x[t], bodies.z[i] - bodies.z[t]) < 2.5) n++;
    if (n >= 4) g.input.pressed.add('grenade');
  }
  return b.phase;
};
`;

const browser = await launch();
const { page, context, errors } = await openStepped(browser, 'd1280', 'battles');
await page.evaluate(() => localStorage.removeItem('thunder-knight.save'));
await page.reload();
await page.waitForFunction(() => window.__game?.crowd !== undefined, null, { timeout: 60000 });
await page.evaluate(`(() => {
  const g = window.__game; const proto = Object.getPrototypeOf(g);
  g.update = () => {};
  window.__step = (dt) => proto.update.call(g, dt);
  g.stage.render = () => {};
  g.onFirstInput();
})()`);
await page.evaluate(BOT);
// The bot picks its guns by damage a second at their stars (each pellet, light guns at full: the crowd is mostly cloth).
await page.evaluate(`(async () => {
  const { GUNS } = await import('/src/content/guns.ts');
  const { gunStats } = await import('/src/state/guns.ts');
  window.__gunDps = (id, level) => { const d = GUNS[id]; const st = gunStats(d, level); return st.damage * d.pellets * d.rate * (d.splash > 0 ? 3 : 1) * Math.min(d.pierce, 2); };
})()`);

const events = () => page.evaluate(() => (window.__platformEvents ?? []).map((e) => e.name));

/** Presses the result card's primary button, as a player's click would. */
async function pressPrimary() {
  const label = await page.evaluate(() => {
    const b = document.querySelector('.card-result .btn-main');
    const layer = b?.closest('.card-layer');
    const shown = layer && !layer.classList.contains('is-hidden');
    if (b && shown) b.click();
    return shown ? b.textContent : `not shown (${document.querySelector('.card-result .card-title')?.textContent})`;
  });
  if (label?.startsWith('not shown')) check(false, `the result card is up to press: ${label}`);
  // From Battle 2 the card's button asks for an interstitial first (the dev stand-in plays for 0.7 s).
  await page.waitForFunction(() => !window.__game.result.open, null, { timeout: 8000 }).catch(() => null);
}

/** Where a defeat came from: the wave, the hand and call-in, the purse, and who stood in the banner's ring. */
async function defeatReport() {
  return page.evaluate(`(async () => {
    const g = window.__game; const sim = g.crowd.sim; const b = sim.bodies;
    const { TYPES, ENEMY } = await import('/src/crowd/crowdSim.ts');
    const ring = {};
    for (let i = 0; i < sim.capacity; i++) if (sim.live[i] && sim.team[i] === ENEMY && sim.isUp(i) && Math.hypot(b.x[i], b.z[i] + 12) < 10) { const t = TYPES[sim.type[i]]; ring[t] = (ring[t] || 0) + 1; }
    const s = g.state;
    return { wave: (g.battle?.wave ?? -1) + 1, hand: s.hand, guns: s.guns, support: s.support, army: s.army, hero: s.hero, ring };
  })()`);
}

/** Plays until the battle shows its card (or a time limit). Returns the battle's phase and a few numbers. */
async function play(idle = false, limit = 600) {
  let firstBreakGold = null;
  for (let s = 0; s < limit; s++) {
    const r = await page.evaluate(`(() => { const g = window.__game; let phase;
      for (let k = 0; k < 20; k++) { phase = __bot(g, ${idle}); __step(0.05); }
      return { phase, gold: g.state.gold + g.coins.pendingGold, wave: g.battle?.wave, card: g.result.open, screen: g.screen,
        banner: g.battle?.banner, buys: window.__buys || 0, ad: g.mode === 'busy' || g.adPending };
    })()`);
    // An ad is running (the dev stand-in ends on a timer): let the page's clock run, as stepping back to back starves it.
    if (r.ad) await page.waitForTimeout(150);
    // Gold at the first break, once the leftover coins have flown in (just before the first purchase).
    if (r.phase === 'break' && r.wave === 0 && r.buys === 0) firstBreakGold = r.gold;
    if (r.card) return { ...r, firstBreakGold, seconds: s };
  }
  // What kept the battle going: the wave, the director's queue, who's standing and where, and the hero.
  const left = await page.evaluate(`(async () => {
    const g = window.__game; const sim = g.crowd.sim; const b = sim.bodies;
    const { TYPES, ENEMY } = await import('/src/crowd/crowdSim.ts');
    const standing = [];
    for (let i = 0; i < sim.capacity; i++) if (sim.live[i] && sim.team[i] === ENEMY && sim.isUp(i)) standing.push(TYPES[sim.type[i]] + '@' + b.x[i].toFixed(0) + ',' + b.z[i].toFixed(0) + (b.alive[i] ? '' : ' (not shootable)'));
    return { wave: g.battle?.wave, phase: g.battle?.phase, left: g.battle?.enemiesLeft, hero: g.hero.position.x.toFixed(0) + ',' + g.hero.position.z.toFixed(0), heroUp: g.battle?.heroUp, standing,
      bot: { target: window.__stuckT, stuckFor: window.__stuckFor, idle: window.__idle, fire: g.input.fireHeld, gun: g.battle?.gun, ammo: g.combat?.gun?.ammo, targetHp: window.__stuckT >= 0 ? b.hp[window.__stuckT] : null, shots: g.combat?.shots } };
  })()`);
  console.log(`     timeout: ${JSON.stringify(left)}`);
  return { phase: 'timeout', firstBreakGold };
}

// 1. A new player starts in Battle 1.
let info = await page.evaluate(() => ({ screen: window.__game.screen, battle: window.__game.battle?.id, gold: window.__game.state.gold }));
check(info.screen === 'battle' && info.battle === 1, `a new player starts in Battle 1 (${info.screen} ${info.battle})`);
check(info.gold === 50, `starting gold is 50 (${info.gold})`);

// 2. Battles 1–15 (Region 1 with Sir Grudge, Region 2's riders, firebrands, men-at-arms and the War Wagon, then the
// Highland Pass's Brutes, battering rams and catapults, with the Sentry Gun and knights, and the Siege Tower).
let names;
let afterBattle1 = 0;
for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]) {
  if (id > 1) {
    const sel = await page.evaluate(() => ({ screen: window.__game.screen, selected: document.querySelector('.map-card-title')?.textContent }));
    check(sel.screen === 'map', `after Battle ${id - 1}: the map shows (${sel.screen}), "${sel.selected}"`);
    await page.click('.map-card .btn-main');
    await page.evaluate(() => window.__game.onFirstInput());
  }
  let r = await play();
  // A boss (or a new region's first battles) may beat a decent player once (Rally and Retry are there for it).
  if (r.phase === 'defeat') console.log(`     defeat: ${JSON.stringify(await defeatReport())}`);
  if (id >= 5 && r.phase === 'defeat') {
    console.log(`     Battle ${id}: lost the first try (banner fell); retrying`);
    await pressPrimary();
    await page.evaluate(() => window.__game.onFirstInput());
    r = await play();
  }
  check(r.phase === 'victory', `Battle ${id}: victory (${r.phase}, banner ${(r.banner * 100).toFixed(0)}%, ${r.buys} buys so far)`);
  if (id === 1) check(r.firstBreakGold >= 100 && r.firstBreakGold <= 140, `Battle 1: about 110–130 gold at the first break (${r.firstBreakGold})`);
  const card = await page.evaluate(() => ({
    crowns: document.querySelectorAll('.card-result .result-crown.is-on').length,
    total: document.querySelector('.card-result .result-total')?.textContent,
    title: document.querySelector('.card-result .card-title')?.textContent,
    unlock: document.querySelector('.card-result .result-unlock-title')?.textContent ?? null,
  }));
  check(card.crowns >= 1, `Battle ${id}: the victory card shows ${card.crowns} crowns, ${card.total}`);
  // M10: the Iron Ox's fall sends the Baron off on his donkey; the first win plays the ending, then its own card.
  if (id === 20) check(card.title === 'Larkmoor is free!' && card.unlock === 'Last Stand unlocked', `Battle 20: the ending's card ("${card.title}", "${card.unlock}")`);
  await pressPrimary();
  if (id === 1) afterBattle1 = (await events()).length;
}
names = await events();
const playFlow = names.filter((n) => n === 'gameplayStart' || n === 'gameplayStop');
check(!playFlow.some((n, i) => i > 0 && n === playFlow[i - 1]), `Poki: starts and stops alternate (${playFlow.length} events)`);
const isAd = (n) => n === 'commercialBreak' || n === 'rewardedBreak';
check(names.slice(0, afterBattle1).filter(isAd).length === 0, 'Poki: no ad in Battle 1');
const later = names.slice(afterBattle1).filter((n) => n === 'commercialBreak').length;
// Battle 2 and 3: two breaks each with Next wave, and their victory cards' Continue.
check(later >= 4, `Poki: interstitials asked for from Battle 2, at Next wave and Continue (${later})`);
check(!names.includes('rewardedBreak'), 'Poki: no rewarded ad unless the player chooses one');

// 3. A deliberate defeat: replay Battle 2, stand still, without allies.
const saved = await page.evaluate(() => ({ gold: window.__game.state.gold, pistol: window.__game.state.guns.pistol, militia: window.__game.state.army.militia }));
await page.evaluate(() => window.__game.startBattle(2));
const lost = await play(true, 900);
check(lost.phase === 'defeat', `standing still in Battle 2: the banner falls (${lost.phase})`);
const defeat = await page.evaluate(() => ({
  title: document.querySelector('.card-result .card-title')?.textContent,
  inRow: window.__game.state.battles['2']?.defeatsInRow,
  won: window.__game.state.battles['2']?.won,
}));
check(defeat.title === 'The banner fell!' && defeat.inRow === 1 && defeat.won, `the defeat card shows; Battle 2 stays won, 1 defeat in a row (${JSON.stringify(defeat)})`);
await pressPrimary();
const retried = await page.evaluate(() => ({ screen: window.__game.screen, battle: window.__game.battle?.id, phase: window.__game.battle?.phase }));
check(retried.screen === 'battle' && retried.battle === 2 && retried.phase === 'ready', `Retry restarts Battle 2 (${JSON.stringify(retried)})`);

// 4. Reload: gold and purchases survive, and a returning player lands on the map.
await page.evaluate(() => window.__game.save());
await page.reload();
await page.waitForFunction(() => window.__game?.crowd !== undefined, null, { timeout: 60000 });
const after = await page.evaluate(() => ({
  screen: window.__game.screen,
  gold: window.__game.state.gold,
  pistol: window.__game.state.guns.pistol,
  militia: window.__game.state.army.militia,
  won: Object.keys(window.__game.state.battles).filter((k) => window.__game.state.battles[k].won),
}));
check(after.screen === 'map', `after a reload a returning player is on the map (${after.screen})`);
check(after.gold === saved.gold && after.pistol === saved.pistol && after.militia === saved.militia, `gold and purchases survive the reload (${JSON.stringify(saved)} → ${JSON.stringify(after)})`);
check(after.won.join(',') === '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20', `Battles 1–20 are won in the save (${after.won})`);
console.log(`spent: pistol ★${after.pistol}, militia L${after.militia}; gold ${after.gold}`);
check(errors.length === 0, `no console errors ${errors.join(' | ')}`);

await context.close();
await browser.close();
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nAll battle checks passed');
process.exit(failures.length ? 1 : 0);
