// Checks that soldiers' feet don't slide (milestones M2 exit; M6 adds the twice-size boss). Follows a jogging and a
// walking soldier through the
// simulation and works out, from the same bone texture the GPU uses, how fast his planted foot moves over the ground.
// A planted foot should stay still while the body moves over it. Needs `npm run dev` (port 5180).
//   npm run qa:feet
import { launch, openStepped } from './stepper.mjs';

/** Metres a second a planted foot may drift before it reads as sliding. */
const TOLERANCE = 0.35;

const browser = await launch();
const { page, context } = await openStepped(browser, 'd800', 'feet');
const results = await page.evaluate(`(() => {
  const g = window.__game; const sim = g.crowd.sim; const kit = g.crowd.kit;
  const clipNames = ${JSON.stringify(['idle', 'walk', 'run', 'attackA', 'attackB', 'hit', 'knocked', 'cheer', 'shoot', 'reload', 'block'])};
  const arch = kit.archetypes.knight;
  const geo = arch.geometry; const si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, pos = geo.attributes.position;
  // The two bones owning the lowest fully-weighted vertices are the toes; track that lowest vertex of each.
  const lowest = {};
  for (let v = 0; v < pos.count; v++) {
    if (sw.getX(v) < 0.99) continue;
    const b = si.getX(v); const y = pos.getY(v);
    if (!lowest[b] || y < lowest[b].y) lowest[b] = { y, x: pos.getX(v), z: pos.getZ(v) };
  }
  const toes = Object.entries(lowest).sort((a, b) => a[1].y - b[1].y).slice(0, 2);
  const data = arch.bones.image.data; const width = arch.boneCount * 3;
  const local = (frame, b, p) => {
    const at = (frame * width + Number(b) * 3) * 4;
    const r = (k) => data[at + k];
    return { x: r(0)*p.x + r(1)*p.y + r(2)*p.z + r(3), y: r(4)*p.x + r(5)*p.y + r(6)*p.z + r(7), z: r(8)*p.x + r(9)*p.y + r(10)*p.z + r(11) };
  };
  // The clip's pose between its two nearest frames, as the shader does.
  const pose = (clip, f, b, p) => {
    const base = Math.floor(f);
    const next = clip.loop ? (base + 1) % clip.frames : Math.min(base + 1, clip.frames - 1);
    const k = f - base;
    const a = local(clip.start + base, b, p);
    const c = local(clip.start + next, b, p);
    return { x: a.x + (c.x - a.x) * k, y: a.y + (c.y - a.y) * k, z: a.z + (c.z - a.z) * k };
  };
  const clipFrame = (clip, t) => (clip.loop ? ((t % clip.frames) + clip.frames) % clip.frames : Math.min(t, clip.frames - 1));
  /** Planted-foot speeds over the ground, from samples of [{y, lz, wx, wz}] per toe. */
  const slides = (samples) => {
    const out = [];
    for (let k = 0; k < 2; k++) {
      const ys = samples.filter(Boolean).map((s) => s[k].y);
      const lo = Math.min(...ys), hi = Math.max(...ys);
      for (let n = 1; n < samples.length; n++) {
        const a = samples[n - 1], b = samples[n];
        if (!a || !b) continue;
        // Planted: low, and moving back along the body (the model faces +Z).
        if (a[k].y > lo + (hi - lo) * 0.25 || b[k].y > lo + (hi - lo) * 0.25 || b[k].lz >= a[k].lz) continue;
        out.push(Math.hypot(b[k].wx - a[k].wx, b[k].wz - a[k].wz) * 60);
      }
    }
    out.sort((a, b) => a - b);
    return { median: out[Math.floor(out.length / 2)] ?? NaN, samples: out.length };
  };
  /** A body moving straight ahead at v, its clip at the rate the crowd would play it, sampled at 60 fps. */
  const synthetic = (clipName, v, size = 1) => {
    const clip = kit.clips[clipName];
    // As the crowd plays it: a bigger soldier's clip runs slower by his size.
    const rate = Math.max(0.5, Math.min(1.8, v / (clip.speed * size)));
    const s = arch.scale * size; const samples = [];
    for (let n = 0; n < 240; n++) {
      const t = n / 60; const f = clipFrame(clip, t * rate * 30);
      samples.push(toes.map(([b, p]) => { const a = pose(clip, f, b, p); return { y: a.y * s, lz: a.z, wx: a.x * s, wz: v * t + a.z * s }; }));
    }
    return { ...slides(samples), speed: v, rate };
  };
  /** A soldier in the live simulation, drawn at 60 fps between ticks as the renderer does. */
  const follow = (i, clipName) => {
    const s = arch.scale; const samples = [];
    for (let n = 0; n < 240 && sim.live[i]; n++) {
      const alpha = sim.step(1 / 60);
      if (clipNames[sim.clip[i]] !== clipName) { samples.push(null); continue; }
      const clip = kit.clips[clipName];
      const now = sim.time - (1 - alpha) / 30;
      const f = clipFrame(clip, (now - sim.clipStart[i]) * sim.clipRate[i] * 30);
      const yaw = sim.prevHeading[i] + (sim.heading[i] - sim.prevHeading[i]) * alpha + Math.PI;
      const x = sim.prevX[i] + (sim.bodies.x[i] - sim.prevX[i]) * alpha;
      const z = sim.prevZ[i] + (sim.bodies.z[i] - sim.prevZ[i]) * alpha;
      samples.push(toes.map(([b, p]) => {
        const a = pose(clip, f, b, p);
        return { y: a.y * s, lz: a.z, wx: x + (Math.cos(yaw) * a.x + Math.sin(yaw) * a.z) * s, wz: z + (-Math.sin(yaw) * a.x + Math.cos(yaw) * a.z) * s };
      }));
    }
    return { ...slides(samples), speed: Math.hypot(sim.vx[i], sim.vz[i]), rate: sim.clipRate[i] };
  };
  // A jogging footman in the march, live.
  g.devScene('hill'); g.devAdvance(2);
  let runner = -1;
  for (let k = 0; k < sim.capacity; k++) if (sim.live[k] && sim.type[k] === 1 && clipNames[sim.clip[k]] === 'run') { runner = k; break; }
  const live = runner >= 0 ? follow(runner, 'run') : null;
  const run = synthetic('run', 2.3);
  const walk = synthetic('walk', 0.6);
  // Sir Grudge (twice the size) walking at his march speed, and his second phase a little faster.
  const giant = synthetic('walk', 1.1, 2);
  const giantRun = synthetic('walk', 1.3, 2);
  // The Brute (2×) closing in on a target (his 1.2 m/s × the crowd's 1.25).
  const brute = synthetic('walk', 1.5, 2);
  return { live, run, walk, giant, giantRun, brute, walkClip: kit.clips.walk.speed, runClip: kit.clips.run.speed };
})()`);
await context.close();
await browser.close();
let failed = false;
for (const [name, r] of Object.entries({
  'jogging soldier': results.live,
  'run at 2.3 m/s': results.run,
  'walk at 0.6 m/s': results.walk,
  'Sir Grudge (2×) walking at 1.1 m/s': results.giant,
  'Sir Grudge (2×), shield down, at 1.3 m/s': results.giantRun,
  'the Brute (2×) closing in at 1.5 m/s': results.brute,
})) {
  const ok = r && r.samples > 2 && r.median <= TOLERANCE;
  if (!ok) failed = true;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${name}: planted foot moves ${r ? r.median.toFixed(2) : '?'} m/s over the ground ` +
      `(body ${r ? r.speed.toFixed(2) : '?'} m/s, clip rate ${r ? r.rate.toFixed(2) : '?'}, ${r?.samples ?? 0} samples; tolerance ${TOLERANCE})`,
  );
}
console.log(`clip speeds: walk ${results.walkClip.toFixed(2)} m/s, run ${results.runClip.toFixed(2)} m/s`);
process.exit(failed ? 1 : 0);
