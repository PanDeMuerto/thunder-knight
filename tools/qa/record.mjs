// Records short clips, frame-exact, to judge how the camera and the gun feel in motion. Needs `npm run dev` (port
// 5180). Never takes the owner's mouse (pointer lock is faked); look and fire are set by script, like a player would.
//   npm run record -- [clip ...]
// Writes qa-output/clips/<clip>.mp4 (with the HUD and the game's sound, mixed from a log of what it played:
// soundtrack.mjs) and <clip>-sheet.png, a contact sheet of every tenth frame.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mixdown, SOUND_LOG } from './soundtrack.mjs';
import { launch, openStepped } from './stepper.mjs';

const FFMPEG = process.env.FFMPEG ?? 'C:/SOFT/Shotcut/ffmpeg.exe';
const OUT = fileURLToPath(new URL('../../qa-output/clips/', import.meta.url));
const FPS = 50;
const AUDIO = fileURLToPath(new URL('../../public/assets/audio/', import.meta.url));

/** Page helpers: turn the view toward a body at a human speed, and pick the nearest enemy to shoot. */
const HELPERS = `
  window.__aimAt = (g, i, maxDeg) => {
    const b = g.crowd.bodies; const e = g.stage.camera.position;
    const dx = b.x[i] - e.x, dz = b.z[i] - e.z, dy = b.aimHeight(i) - e.y;
    const yaw = Math.atan2(-dx, -dz); const pitch = Math.atan2(dy, Math.hypot(dx, dz));
    let dYaw = Math.atan2(Math.sin(yaw - g.rig.yaw), Math.cos(yaw - g.rig.yaw)) * 180 / Math.PI;
    let dPitch = (pitch - g.rig.pitch) * 180 / Math.PI;
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
  window.__shootNearest = (g, rate) => {
    if (window.__target < 0 || !g.crowd.bodies.alive[window.__target]) window.__target = __pick(g, 38);
    const left = window.__target >= 0 ? __aimAt(g, window.__target, rate) : 99;
    g.input.fireHeld = left < 1.5;
  };
`;

/**
 * Each clip: a screen, `setup` (page code with `g`), and `input(t)`: page code run before each frame, with `t` in
 * seconds. `g.devAdvance(s)` runs the armies forward without drawing. `until` (page code): the clip ends `tail`
 * frames after it is first true, or at `frames`.
 */
const CLIPS = {
  // A whole wave of Battle 2 with its sound (M8): the countdown, the army reveal with the horn and drums, the march,
  // the fight, the wave-cleared sting and the break's music. For listening to the mix.
  wave: {
    screen: 'd1280',
    frames: 5000,
    setup: `g.state.seenLessons.push('b1', 'move:desktop', 'aim:desktop'); g.startBattle(2); g.hero.place(0.5, -8, 0);
      g.rig.snap(g.hero.position, 0, false); window.__target = -1;`,
    input: () => `__shootNearest(g, 2.4);`,
    until: `g.battle && g.battle.phase === 'break'`,
    tail: 200,
  },
  // The clash from the hilltop, the mouse picking off the nearest enemies.
  mouse: {
    screen: 'd1280',
    frames: 300,
    setup: `g.devScene('clash'); g.devAdvance(12); window.__target = -1;`,
    input: () => `__shootNearest(g, 2.2);`,
  },
  // Battle 2 mid-wave (M3): the HUD, coins flying in, the banner and enemies bars.
  battle: {
    screen: 'd1280',
    frames: 300,
    setup: `g.startBattle(2); g.hero.place(0.5, -8, 0); g.rig.snap(g.hero.position, 0, false); g.devAdvance(13); window.__target = -1;`,
    input: () => `__shootNearest(g, 2.4);`,
  },
  // Touch, portrait: drag the view slowly across the clash; auto-fire does the shooting.
  touch: {
    screen: 'p390',
    frames: 300,
    setup: `g.devScene('clash'); g.devAdvance(12); g.rig.yaw += 0.25;`,
    input: (t) => `g.input.lookX += ${t < 3 ? -0.16 : 0.16}; g.input.sinceLook = 0;`,
  },
  // Touch, landscape: the same on a phone held sideways.
  touchLandscape: {
    screen: 'l844',
    frames: 250,
    setup: `g.devScene('clash'); g.devAdvance(12); g.rig.yaw += 0.3;`,
    input: (t) => `g.input.lookX += ${t < 2.5 ? -0.22 : 0.22}; g.input.sinceLook = 0;`,
  },
  // In the front line: melee up close, feet, blows, falls (the artifact check).
  front: {
    screen: 'd1280',
    frames: 300,
    setup: `g.devScene('front'); g.devAdvance(13);`,
    input: () => ``,
  },
  // The block marching up the hill: walking feet and the captain's banner, then shooting the captain (the rout).
  march: {
    screen: 'd1280',
    frames: 300,
    setup: `g.devScene('hill'); g.devAdvance(12); window.__target = -1;`,
    input: (t) => (t < 2.5 ? '' : `
      const b = g.crowd.bodies; let c = -1; for (let i = 0; i < b.count; i++) if (b.alive[i] && b.role[i] === 2) c = i;
      if (c >= 0) { g.input.fireHeld = __aimAt(g, c, 2) < 1.2; } else { g.input.fireHeld = false; }
    `),
  },
  // From the side, close, as the block jogs past: feet against the grass (the sliding check).
  feet: {
    screen: 'd1280',
    frames: 200,
    setup: `g.devScene('hill'); g.hero.place(5, -47, Math.PI / 2); g.rig.snap(g.hero.position, Math.PI / 2, false); g.rig.pitch = -0.12; g.devAdvance(1.5);`,
    input: () => ``,
  },
  // Backing into the truck: the camera pulls in, the hero turns see-through, then it eases back out.
  wall: {
    screen: 'd1280',
    frames: 220,
    setup: `g.devScene('empty'); g.hero.place(10.6, -3, 0); g.rig.snap(g.hero.position, 0, g.stage.portrait);`,
    input: (t) => `g.input.keys.clear(); g.input.keys.add(${t < 2.2 ? "'KeyS'" : "'KeyW'"});`,
  },
};

const only = process.argv.slice(2);
const run = only.length ? only : Object.keys(CLIPS);
for (const name of run) if (!CLIPS[name]) throw new Error(`Unknown clip ${name}. Known: ${Object.keys(CLIPS).join(', ')}`);
mkdirSync(OUT, { recursive: true });
const browser = await launch();
for (const name of run) {
  const clip = CLIPS[name];
  const frames = fileURLToPath(new URL(`../../qa-output/clips/${name}-frames/`, import.meta.url));
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  const { context, page } = await openStepped(browser, clip.screen, name);
  await page.evaluate(HELPERS);
  await page.evaluate(SOUND_LOG);
  await page.evaluate(`window.__installSoundLog(window.__game)`);
  await page.evaluate(`(() => { const g = window.__game; ${clip.setup} __frames(2, ${1 / FPS}); __startSoundLog(); })()`);
  let count = clip.frames;
  for (let i = 0; i < count; i++) {
    await page.evaluate(`(() => { const g = window.__game; const t = ${i / FPS}; window.__recFrame = ${i}; ${clip.input(i / FPS)} __step(${1 / FPS}); })()`);
    await page.screenshot({ path: `${frames}${String(i).padStart(4, '0')}.png` });
    if (clip.until && count === clip.frames && (await page.evaluate(`(() => { const g = window.__game; return !!(${clip.until}); })()`))) {
      count = Math.min(clip.frames, i + 1 + (clip.tail ?? 0));
    }
  }
  const stats = await page.evaluate(() => ({ shots: window.__game.combat.shots, knockouts: window.__game.combat.knockouts }));
  const log = await page.evaluate(() => ({ sounds: window.__sounds, beds: window.__beds, mix: window.__mix }));
  const silent = `${frames}video.mp4`;
  execFileSync(FFMPEG, [
    '-y',
    '-loglevel',
    'error',
    '-framerate',
    String(FPS),
    '-i',
    `${frames}%04d.png`,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '20',
    silent,
  ]);
  // The sound: mixed from the log, then put under the picture.
  const wav = `${frames}sound.wav`;
  const sound = mixdown({ ffmpeg: FFMPEG, log, fps: FPS, seconds: count / FPS, audioDir: AUDIO, wav });
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', silent, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', `${OUT}${name}.mp4`]);
  const portrait = clip.screen.startsWith('p');
  execFileSync(FFMPEG, [
    '-y',
    '-loglevel',
    'error',
    '-i',
    `${frames}%04d.png`,
    '-vf',
    `select='not(mod(n\\,10))',scale=${portrait ? 160 : 320}:-1,tile=${portrait ? 10 : 6}x${Math.ceil(count / (portrait ? 100 : 60))}`,
    '-frames:v',
    '1',
    `${OUT}${name}-sheet.png`,
  ]);
  rmSync(frames, { recursive: true, force: true });
  console.log(`${name}.mp4 (${(count / FPS).toFixed(1)} s): ${stats.shots} shots, ${stats.knockouts} knockouts, ${sound.played} of ${sound.logged} sounds (the rest over their per-second caps)`);
  await context.close();
}
await browser.close();
