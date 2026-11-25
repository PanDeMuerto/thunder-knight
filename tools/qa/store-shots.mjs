// Store screenshots for Poki's page (M12, docs/store-listing.md): landscape 1280 × 720 with the HUD, as a player
// sees the game. Two are staged here, frame-exact, never touching the owner's mouse: a Region 3 wave up close with the
// machine gun, and the Iron Ox's fight with its boss bar. Three come from the review tools and are copied over:
// Rosie's shop and the map (`npm run shots -- shop map --screens=d1280`) and the ending
// (`node qa-output/m9/m10-ending.mjs d1280`). Needs `npm run dev`.
// Usage: node tools/qa/store-shots.mjs  ->  release/poki-submission/screenshot-<n>-<name>.png
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, openStepped } from './stepper.mjs';

const OUT = fileURLToPath(new URL('../../release/poki-submission/', import.meta.url));
const QA = fileURLToPath(new URL('../../qa-output/', import.meta.url));
const FPS = 30;

/** In the page: aim at a body at a human turning speed, and keep shooting the nearest foe. */
const HELPERS = `
  window.__aimAt = (g, i, maxDeg) => {
    const b = g.crowd.bodies; const e = g.stage.camera.position;
    const dx = b.x[i] - e.x, dz = b.z[i] - e.z, dy = b.aimHeight(i) - e.y;
    const yaw = Math.atan2(-dx, -dz); const pitch = Math.atan2(dy, Math.hypot(dx, dz));
    const dYaw = Math.atan2(Math.sin(yaw - g.rig.yaw), Math.cos(yaw - g.rig.yaw)) * 180 / Math.PI;
    const dPitch = (pitch - g.rig.pitch) * 180 / Math.PI;
    const l = Math.hypot(dYaw, dPitch); const k = l > maxDeg ? maxDeg / l : 1;
    g.input.lookX += -dYaw * k; g.input.lookY += -dPitch * k; g.input.sinceLook = 0;
    return l;
  };
  window.__pick = (g, maxRange) => {
    const b = g.crowd.bodies; const h = g.hero.position; let best = -1, bestD = maxRange;
    for (let i = 0; i < b.count; i++) { if (!b.alive[i]) continue;
      const d = Math.hypot(b.x[i] - h.x, b.z[i] - h.z); if (d < bestD) { bestD = d; best = i; } }
    return best;
  };
  window.__target = -1;
  window.__shootNearest = (g, rate) => {
    if (window.__target < 0 || !g.crowd.bodies.alive[window.__target]) window.__target = __pick(g, 40);
    const left = window.__target >= 0 ? __aimAt(g, window.__target, rate) : 99;
    g.input.fireHeld = left < 2;
  };
  /** No lesson prompt, nameplate or toast over the picture (a store shot shows play, not teaching). */
  window.__quiet = (g) => { g.reveal.skip(); g.battleHud.clear(); g.onboarding.update = () => {}; g.prompt.show(null, false); g.rosie.hush(); };
  window.__lessons = (g) => g.state.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'swap:desktop', 'grenade:desktop', 'support:desktop', 'sentry', 'army', 'hero',
    'intro:peasant', 'intro:footman', 'intro:captain', 'intro:archer', 'intro:eliteCaptain', 'intro:ironOx', 'intro:rider', 'intro:manAtArms', 'intro:brute', 'intro:ram', 'intro:catapult', 'intro:firebrand');
`;

const STAGED = [
  {
    // The Ferry's last wave: a footman block and its captain up the lane, a shield wall, firebrands and riders behind,
    // the machine gun at ★3 hosing them down from the hill.
    name: 'wave',
    setup: `g.state.gold = 2480; g.startBattle(8, 5); __lessons(g); g.equip('machineGun', 3);
      g.devAdvance(13); __quiet(g); g.hero.place(1.8, -11, 0.05); g.rig.snap(g.hero.position, 0.05, false); g.rig.pitch = -0.12;`,
    frames: 50,
    frame: `__shootNearest(g, 4);`,
  },
  {
    // The Iron Ox under the Iron Keep: its boss bar, the hero lining up a rocket.
    name: 'boss',
    setup: `g.state.gold = 5400; g.startBattle(20, 7); __lessons(g); g.equip('rocketLauncher', 3);
      g.devAdvance(3); g.devAdvance(5); __quiet(g);
      const s = g.crowd.sim; const b = s.bodies; let w = -1;
      for (let k = 0; k < s.capacity; k++) if (s.live[k] && window.__types[s.type[k]] === 'ironOx') { w = k; break; }
      const hx = b.x[w] + 2.0, hz = b.z[w] + 15; const yaw = Math.atan2(-(b.x[w] - hx), -(b.z[w] - hz));
      g.hero.place(hx, hz, yaw); g.rig.snap(g.hero.position, yaw, false); g.rig.pitch = 0.04;
      window.__ox = w;`,
    frames: 40,
    frame: `__aimAt(g, window.__ox, 4); g.input.fireHeld = f === 30;`,
  },
];

/** Copied from the review tools' output (see the header). */
const COPIED = [
  ['shop', `${QA}shots/shop-d1280.png`],
  ['map', `${QA}shots/map-d1280.png`],
  ['ending', `${QA}m9/m10-end-line1-d1280.png`],
];

mkdirSync(OUT, { recursive: true });
const browser = await launch();
let n = 1;
for (const shot of STAGED) {
  const { context, page, errors } = await openStepped(browser, 'd1280', `store ${shot.name}`);
  await page.evaluate(`(async () => { const cs = await import('/src/crowd/crowdSim.ts'); window.__types = cs.TYPES; })()`);
  await page.evaluate(HELPERS);
  await page.evaluate(`(() => { const g = window.__game; ${shot.setup} })()`);
  for (let f = 0; f < shot.frames; f++) await page.evaluate(`(() => { const g = window.__game; const f = ${f}; ${shot.frame} __step(${1 / FPS}); })()`);
  await page.waitForTimeout(200);
  const file = `screenshot-${n}-${shot.name}.png`;
  await page.screenshot({ path: `${OUT}${file}` });
  console.log(file + (errors.length ? `  (page errors: ${errors.slice(0, 2).join(' | ')})` : ''));
  n++;
  await context.close();
}
await browser.close();
for (const [name, from] of COPIED) {
  if (!existsSync(from)) {
    console.log(`missing ${from}: run its tool first`);
    continue;
  }
  const file = `screenshot-${n}-${name}.png`;
  copyFileSync(from, `${OUT}${file}`);
  console.log(`${file} (from ${from.replace(QA, 'qa-output/')})`);
  n++;
}
