// Poki's thumbnails, rendered from the game (M12, docs/store-listing.md): square stills, full-bleed, no text and no
// HUD, the hero in a dynamic pose, 1080 px and 628 px; and a short square hover video, muted.
// Every frame is stepped exactly (tools/qa/stepper.mjs), so the pictures are the same on any machine; the camera of
// each shot is placed by hand round the hero. Never takes the owner's mouse (headless, pointer lock faked).
// Needs `npm run dev` (port 5180) and ffmpeg (FFMPEG, default C:/SOFT/Shotcut/ffmpeg.exe).
// Usage: npm run thumbs [-- name ...]  ->  release/poki-submission/thumbnail-<name>-1080.png, -628.png, thumbnail-hover.mp4
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, openStepped } from './stepper.mjs';

const FFMPEG = process.env.FFMPEG ?? 'C:/SOFT/Shotcut/ffmpeg.exe';
const OUT = fileURLToPath(new URL('../../release/poki-submission/', import.meta.url));
const FPS = 30;

/** In the page: put the camera at `pos` looking at `look` (both relative to `from`) and draw the frame again. */
const HELPERS = `
  window.__shoot = (g, from, pos, look, fov) => {
    const c = g.stage.camera;
    if (fov) { c.fov = fov; c.updateProjectionMatrix(); }
    c.position.set(from.x + pos[0], from.y + pos[1], from.z + pos[2]);
    c.lookAt(from.x + look[0], from.y + look[1], from.z + look[2]);
    c.updateMatrixWorld();
    g.stage.render();
  };
  window.__lessons = (g) => g.state.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'swap:desktop', 'grenade:desktop', 'support:desktop', 'sentry', 'army', 'hero',
    'intro:peasant', 'intro:footman', 'intro:captain', 'intro:archer', 'intro:eliteCaptain', 'intro:ironOx', 'intro:rider', 'intro:manAtArms');
  window.__ox = (g) => { const s = g.crowd.sim; for (let k = 0; k < s.capacity; k++) if (s.live[k] && window.__types[s.type[k]] === 'ironOx') return k; return -1; };
`;

/**
 * Each shot: `setup` once (as `g`), then `frame` before every step for `warm` seconds (`t` seconds in, `f` frames),
 * and the camera `cam` (in the page, may use `t`) for the picture. A video records `seconds` more after the warm-up.
 */
const SHOTS = {
  // The hero on the hilltop, the gold ★5 minigun roaring into the Baron's army as it storms the hill; the Queen's blue
  // line below, the banner over his shoulder.
  minigun: {
    warm: 2.2,
    setup: `g.devScene('hill'); __lessons(g); g.crowd.render.marks.visible = false; g.equip('minigun', 5); g.devAdvance(14);
      g.hero.place(4.2, -11.5, 0.12); g.rig.snap(g.hero.position, 0.12, false); g.rig.pitch = -0.16;`,
    frame: `g.input.fireHeld = true; g.rig.yaw = 0.12; g.rig.pitch = -0.16;`,
    cam: `__shoot(g, g.hero.position, [2.3, 1.4, 2.9], [-1.6, 0.5, -9], 52);`,
  },
  // The Iron Ox rolling up under the Iron Keep, horns aglow and its fire laid out on the grass, the hero squaring up
  // with the rocket launcher.
  ox: {
    warm: 0.35,
    setup: `g.startBattle(20, 7); __lessons(g); g.equip('rocketLauncher', 3); g.devAdvance(3); g.devAdvance(4);
      const w = __ox(g); const b = g.crowd.sim.bodies;
      window.__oxAt = { x: b.x[w], z: b.z[w] };
      const hx = b.x[w] + 3.2, hz = b.z[w] + 8.5; const yaw = Math.atan2(-(b.x[w] - hx), -(b.z[w] - hz));
      g.hero.place(hx, hz, yaw); g.rig.snap(g.hero.position, yaw, false); g.rig.pitch = 0.02;
      for (let n = 0; n < 900; n++) { __frames(1, 1 / 30); const c = g.crowd.sim.fireCone(w); if (c && c.left < 0.9) break; }`,
    frame: `g.input.fireHeld = false;`,
    cam: `{ const h = g.hero.position; const ox = __oxAt.x - h.x, oz = __oxAt.z - h.z;
      __shoot(g, h, [2.6, 1.0, 2.6], [ox * 0.5, 1.4, oz * 0.5], 56); }`,
  },
  // The hover video: the minigun shot in motion, the block charging up the hill and tumbling under it, while the camera
  // pushes gently in over his shoulder and he sweeps the line.
  hover: {
    video: true,
    warm: 0.5,
    seconds: 6,
    setup: `g.devScene('hill'); __lessons(g); g.crowd.render.marks.visible = false; g.equip('minigun', 5); g.devAdvance(10);
      g.hero.place(4.2, -11.5, 0.12); g.rig.snap(g.hero.position, 0.12, false); g.rig.pitch = -0.16;`,
    frame: `g.input.fireHeld = true; g.rig.yaw = 0.12 + Math.sin(t * 0.9) * 0.22; g.rig.pitch = -0.16;`,
    cam: `{ const k = Math.min(1, t / 6); const e = k * k * (3 - 2 * k);
      const mix = (a, b) => a.map((v, i) => v + (b[i] - v) * e);
      __shoot(g, g.hero.position, mix([2.5, 1.5, 3.3], [1.9, 1.2, 2.2]), mix([-1.8, 0.4, -9], [-1.1, 0.6, -9]), 52); }`,
  },
};

const only = process.argv.slice(2);
const run = only.length ? only : Object.keys(SHOTS);
for (const name of run) if (!SHOTS[name]) throw new Error(`Unknown shot ${name}. Known: ${Object.keys(SHOTS).join(', ')}`);
mkdirSync(OUT, { recursive: true });
const browser = await launch();
for (const name of run) {
  const shot = SHOTS[name];
  const { context, page, errors } = await openStepped(browser, 'sq1080', `thumb ${name}`);
  await page.evaluate(`(async () => { const cs = await import('/src/crowd/crowdSim.ts'); window.__types = cs.TYPES; })()`);
  await page.evaluate(HELPERS);
  await page.addStyleTag({ content: '#ui, .card-layer, .map { display: none !important; }' });
  await page.evaluate(`(() => { const g = window.__game; ${shot.setup} })()`);
  const step = (t, f) => `(() => { const g = window.__game; const t = ${t}; const f = ${f}; ${shot.frame} __step(${1 / FPS}); ${shot.cam} })()`;
  const warm = Math.round(shot.warm * FPS);
  for (let f = 0; f < warm; f++) await page.evaluate(step(f / FPS, f));
  if (!shot.video) {
    for (const size of [1080, 628]) {
      await page.setViewportSize({ width: size, height: size });
      await page.evaluate(`(() => { const g = window.__game; g.stage.resize(); const t = ${shot.warm}; ${shot.cam} })()`);
      await page.waitForTimeout(150);
      await page.evaluate(`(() => { const g = window.__game; const t = ${shot.warm}; ${shot.cam} })()`);
      await page.screenshot({ path: `${OUT}thumbnail-${name}-${size}.png` });
    }
    console.log(`thumbnail-${name}: 1080 and 628`);
  } else {
    const frames = fileURLToPath(new URL(`../../qa-output/thumbs/${name}-frames/`, import.meta.url));
    rmSync(frames, { recursive: true, force: true });
    mkdirSync(frames, { recursive: true });
    const count = Math.round(shot.seconds * FPS);
    for (let f = 0; f < count; f++) {
      await page.evaluate(step(shot.warm + f / FPS, warm + f));
      await page.screenshot({ path: `${frames}${String(f).padStart(4, '0')}.png` });
    }
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${frames}%04d.png`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-an', '-movflags', '+faststart', `${OUT}thumbnail-${name}.mp4`]);
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', `${frames}%04d.png`, '-vf', 'select=not(mod(n\\,30)),scale=360:360,tile=6x1', '-frames:v', '1', `${OUT}../../qa-output/thumbs/${name}-sheet.png`]);
    console.log(`thumbnail-${name}.mp4: ${count} frames, ${shot.seconds} s, ${FPS} fps, muted`);
  }
  if (errors.length) console.log(`  page errors: ${errors.slice(0, 3).join(' | ')}`);
  await context.close();
}
await browser.close();
