// Screenshots of named scenes on chosen screens, for checking the camera, the HUD and the look by eye.
// Needs `npm run dev` (port 5180). Never takes the owner's mouse (pointer lock is faked).
//   npm run shots -- [scene ...] [--screens=d1280,p390,l844]
// Writes qa-output/shots/<scene>-<screen>.png. Every scene runs a fixed number of exact frames, so pictures repeat.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, openStepped } from './stepper.mjs';

const OUT = fileURLToPath(new URL('../../qa-output/shots/', import.meta.url));

/** Page code with `g` (the game). `__frames(n)` steps n frames at 60 fps. */
const SCENES = {
  // The first view after loading: the banner hill, the allies' crescent beyond it, the clash starting.
  start: `g.devScene('start'); __frames(30);`,
  // The high-ground test (GDD §5.2): on the hilltop as the block of 60 and its captain arrive at the ring.
  hill: `g.devScene('hill'); g.devAdvance(20); __frames(20);`,
  // The clash from the hilltop, 15 s in: 150 against 150 at the High tier.
  clash: `g.devScene('clash'); g.devAdvance(15); __frames(20);`,
  // In the front line among the allies.
  front: `g.devScene('front'); g.devAdvance(14); __frames(20);`,
  // The same, mid-burst: a tracer, the flash, a casing, hit markers and numbers.
  firing: `
    g.devScene('hill'); g.devAdvance(20); __frames(10);
    g.input.fireHeld = true; __frames(20); g.input.fireHeld = false; __frames(1);
  `,
  // Over the captain: the diamond and the red crosshair.
  captain: `
    g.devScene('hill'); g.devAdvance(20); __frames(2);
    const b = g.crowd.bodies; let i = -1; for (let k = 0; k < b.count; k++) if (b.alive[k] && b.role[k] === 2) i = k;
    for (let n = 0; n < 6; n++) {
      const e = g.stage.camera.position; const dx = b.x[i] - e.x, dz = b.z[i] - e.z, dy = b.aimHeight(i) - e.y;
      g.rig.yaw = Math.atan2(-dx, -dz); g.rig.pitch = Math.atan2(dy, Math.hypot(dx, dz)); __frames(2);
    }
  `,
  // Backed against the truck: the camera pulls in and the hero turns see-through (GDD §5.1).
  wall: `g.devScene('empty'); g.hero.place(10.6, 1.6, 0); g.rig.snap(g.hero.position, 0, g.stage.portrait); __frames(40);`,
  // Damage arcs from the left and from behind on the right.
  arcs: `g.devScene('hill'); g.devAdvance(20); __frames(5); g.hurtFrom(-20, -10); g.hurtFrom(10, 5); __frames(6);`,
  // M3 battle screens, as a returning player (Battle 1's script done). \`__clear(g)\` knocks out every enemy until
  // the wave ends.
  battleWave: `g.startBattle(2); g.devAdvance(16); __frames(30);`,
  shop: `
    g.state.gold = 420; g.startBattle(2); g.devAdvance(3); __clear(g);
    g.hero.place(7, 2.2, -0.6); g.rig.snap(g.hero.position, -0.6, g.stage.portrait); __frames(20);
  `,
  victory: `g.startBattle(1, 3); g.devAdvance(3); __clear(g); g.devAdvance(3); __frames(10);`,
  defeat: `g.startBattle(2); g.devAdvance(5); g.battle.banner = 0; g.devAdvance(2.5); __frames(10);`,
  map: `
    g.state.battles = { 1: { won: true, crowns: 3, defeatsInRow: 0 }, 2: { won: true, crowns: 2, defeatsInRow: 0 } };
    g.state.gold = 640; g.showMap(); __frames(5);
  `,
  // M6: Battle 4's shield walls near the banner, seen from the hill; Sir Grudge marching in; his charge's wind-up.
  shieldWall: `
    g.startBattle(4); g.devAdvance(3); g.devAdvance(26);
    g.hero.place(0, -9, 0); g.rig.snap(g.hero.position, 0, g.stage.portrait); __frames(30);
  `,
  boss: `
    g.startBattle(5, 5); g.devAdvance(3); g.devAdvance(18);
    g.hero.place(1, -9, 0); g.rig.snap(g.hero.position, 0, g.stage.portrait); __frames(40);
  `,
  bossCharge: `
    g.startBattle(5, 5); g.devAdvance(3); g.devAdvance(14);
    g.hero.place(1, -9, 0); g.rig.snap(g.hero.position, 0, g.stage.portrait);
    const sim = g.crowd.sim; const b = sim.bossUp; sim.damage(b, sim.bodies.hp[b] - sim.bodies.maxHp[b] * 0.49, 0, 1);
    for (let n = 0; n < 200 && sim.windingUp() < 0; n++) __frames(3);
    __frames(30);
  `,
  // Mid-reload: the ring fills on the gun button.
  reload: `g.devScene('hill'); g.devAdvance(18); __frames(5); g.input.fireHeld = true; __frames(40); g.input.fireHeld = false; g.input.pressed.add('reload'); __frames(30);`,
};

const args = process.argv.slice(2);
const screensArg = args.find((a) => a.startsWith('--screens='));
const screenNames = screensArg ? screensArg.slice(10).split(',') : ['d1280', 'p390', 'l844'];
const scenes = args.filter((a) => !a.startsWith('--'));
const run = scenes.length ? scenes : Object.keys(SCENES);
for (const s of run) if (!SCENES[s]) throw new Error(`Unknown scene ${s}. Known: ${Object.keys(SCENES).join(', ')}`);

mkdirSync(OUT, { recursive: true });
const browser = await launch();
let failed = false;
for (const scene of run) {
  for (const name of screenNames) {
    const { context, page, errors } = await openStepped(browser, name, `${scene}/${name}`);
    await page.evaluate(`window.__clear = (g) => {
      for (let n = 0; n < 80 && g.battle && g.battle.phase === 'wave'; n++) {
        g.devAdvance(0.5);
        const b = g.crowd.bodies;
        for (let i = 0; i < b.count; i++) if (b.alive[i]) g.crowd.sim.damage(i, 9999, 0, 1);
      }
    };`);
    await page.evaluate(`(async () => { const g = window.__game; g.state.seenLessons.push('b1', 'move:desktop', 'aim:desktop', 'move:touch', 'aim:touch'); ${SCENES[scene]} })()`);
    // CSS fades run on the clock, not the stepped frames.
    await page.waitForTimeout(400);
    const file = `${scene}-${name}.png`;
    await page.screenshot({ path: `${OUT}${file}` });
    console.log(file);
    if (errors.length) failed = true;
    await context.close();
  }
}
await browser.close();
if (failed) process.exit(1);
