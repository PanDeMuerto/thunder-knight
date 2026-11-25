import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GUNS } from '@/content/guns';
import { SOLDIERS } from '@/content/soldiers';
import { CROWD, type ClipName } from '@/content/soldiers';
import { Grenades } from '@/game/grenades';
import { traceShot, type ShotHit } from '@/game/hitscan';
import { ALLY, CrowdSim, ENEMY, STATE, type CrowdWorld } from '@/crowd/crowdSim';
import { FlowField } from '@/crowd/flowField';
import { captainSlot, formationSlots } from '@/crowd/formations';

const flat: CrowdWorld = {
  heightAt: () => 0,
  confine: (p) => {
    p.x = Math.max(-58, Math.min(58, p.x));
    p.z = Math.max(-58, Math.min(58, p.z));
  },
  half: 60,
};
const clips = {
  duration: (c: ClipName) => ({ attackA: 1, attackB: 1, shoot: 1, hit: 0.6, knocked: 0.8 })[c as 'hit'] ?? 1,
  speed: (c: 'walk' | 'run') => (c === 'walk' ? 1.6 : 4),
};

function field(): FlowField {
  const flow = new FlowField(-60, -60, 120, 1, () => false);
  flow.build(0, 0, 6);
  return flow;
}

function run(sim: CrowdSim, seconds: number): void {
  for (let t = 0; t < seconds; t += 1 / 30) sim.tick(1 / 30);
}

describe('flow field', () => {
  it('measures walking distance to the ring and points at it', () => {
    const flow = field();
    expect(flow.distance(0, 0)).toBe(0);
    expect(flow.distance(0, -30)).toBeGreaterThan(22);
    expect(flow.distance(0, -30)).toBeLessThan(26);
    const d = { x: 0, z: 0 };
    flow.direction(0, -30, d);
    expect(d.z).toBeGreaterThan(0.95);
  });

  it('goes round a wall', () => {
    const flow = new FlowField(-30, -30, 60, 1, (x, z) => z > -12 && z < -10 && x > -8 && x < 8);
    flow.build(0, 0, 4);
    // Straight through would be 16 m; round the wall's end it's longer.
    expect(flow.distance(0, -20)).toBeGreaterThan(19);
    const d = { x: 0, z: 0 };
    // Off-centre in front of it, the way leads to the nearer end.
    flow.direction(3, -13, d);
    expect(d.x).toBeGreaterThan(0.3);
  });
});

describe('formations', () => {
  it('gives every member a separate slot, the front rank at the front', () => {
    for (const kind of ['block', 'line', 'mob', 'crescent'] as const) {
      const slots = formationSlots(kind, 24, 1.2, 3);
      expect(slots).toHaveLength(24);
      for (let a = 0; a < slots.length; a++) {
        for (let b = a + 1; b < slots.length; b++) {
          expect(Math.hypot(slots[a]!.x - slots[b]!.x, slots[a]!.z - slots[b]!.z)).toBeGreaterThan(0.3);
        }
      }
    }
    const block = formationSlots('block', 20, 1.2);
    expect(Math.min(...block.map((s) => s.z))).toBe(0);
  });

  it('puts the captain in the middle of the second rank', () => {
    const slots = formationSlots('block', 21, 1.2);
    const c = slots[captainSlot(slots)]!;
    expect(c.z).toBeCloseTo(1.2, 5);
    expect(Math.abs(c.x)).toBeLessThan(0.7);
  });
});

describe('crowd', () => {
  it('marches an enemy squad to the banner ring and holds there', () => {
    const sim = new CrowdSim(64, flat, field(), clips);
    sim.spawnSquad({ type: 'footman', count: 12, formation: 'block', x: 0, z: -40, facing: Math.PI, order: 'attack' });
    run(sim, 30);
    const b = sim.bodies;
    let nearest = Infinity;
    for (let i = 0; i < sim.capacity; i++) if (sim.live[i]) nearest = Math.min(nearest, Math.hypot(b.x[i]!, b.z[i]!));
    expect(nearest).toBeLessThan(9);
    expect(sim.standing(ENEMY)).toBe(12);
  });

  it('fights: blows land on the hit frame and knock soldiers out', () => {
    const sim = new CrowdSim(16, flat, field(), clips);
    sim.spawnSquad({ type: 'footman', count: 1, formation: 'block', x: 0, z: -2, facing: Math.PI, order: 'hold' });
    sim.spawnSquad({ type: 'militia', count: 1, formation: 'block', x: 0, z: 0, facing: 0, order: 'hold' });
    run(sim, 30);
    // Someone lost (60 vs 70 health, 7 a blow each).
    expect(sim.standing(ENEMY) + sim.standing(ALLY)).toBeLessThan(2);
  });

  it("only lets the hero's shots hurt enemies, and a captain's fall routs his squad", () => {
    const sim = new CrowdSim(32, flat, field(), clips);
    const id = sim.spawnSquad({ type: 'footman', count: 8, formation: 'block', x: 0, z: -30, facing: Math.PI, order: 'attack', captain: true });
    const squad = sim.squads[id]!;
    sim.tick(1 / 30);
    const captain = squad.captain;
    expect(sim.bodies.alive[captain]).toBe(1);
    let routs = 0;
    sim.onRout = () => routs++;
    let r = sim.hit(captain, 100, 0, -1);
    expect(r.knocked).toBe(false);
    expect(r.captain).toBe(true);
    r = sim.hit(captain, 100, 0, -1);
    expect(r.knocked).toBe(true);
    expect(routs).toBe(1);
    expect(sim.standing(ENEMY)).toBe(0);
    let fleeing = 0;
    for (let i = 0; i < sim.capacity; i++) if (sim.state[i] === STATE.flee) fleeing++;
    expect(fleeing).toBe(8);
    // Routed soldiers can't be shot.
    for (let i = 0; i < sim.capacity; i++) if (sim.state[i] === STATE.flee) expect(sim.bodies.alive[i]).toBe(0);
  });

  it('lies knocked-out soldiers down, then clears them away', () => {
    const sim = new CrowdSim(8, flat, field(), clips);
    sim.spawnSquad({ type: 'peasant', count: 1, formation: 'block', x: 0, z: -20, facing: Math.PI, order: 'hold' });
    let landed = 0;
    sim.onLand = () => landed++;
    sim.tick(1 / 30);
    expect(sim.hit(0, 99, 1, 0).knocked).toBe(true);
    expect(sim.state[0]).toBe(STATE.knocked);
    run(sim, 0.8 + CROWD.lie + CROWD.sink + 0.2);
    expect(landed).toBe(1);
    expect(sim.count).toBe(0);
  });

  it('enemies attack the hero when he is near, and archers shoot from range', () => {
    const sim = new CrowdSim(16, flat, field(), clips);
    sim.hero.x = 0;
    sim.hero.z = -10;
    sim.hero.active = true;
    let heroHits = 0;
    sim.onHeroHit = () => heroHits++;
    sim.spawnSquad({ type: 'footman', count: 1, formation: 'block', x: 0, z: -14, facing: Math.PI, order: 'hold' });
    run(sim, 6);
    expect(heroHits).toBeGreaterThan(0);

    const archers = new CrowdSim(16, flat, field(), clips);
    archers.spawnSquad({ type: 'allyArcher', count: 2, formation: 'line', x: 0, z: 2, facing: Math.PI, order: 'hold' });
    archers.spawnSquad({ type: 'footman', count: 1, formation: 'block', x: 0, z: -20, facing: 0, order: 'hold' });
    let landed = 0;
    archers.onBoltLand = () => landed++;
    run(archers, 8);
    expect(landed).toBeGreaterThan(0);
  });

  it('never fills past its capacity', () => {
    const sim = new CrowdSim(10, flat, field(), clips);
    expect(sim.spawnSquad({ type: 'footman', count: 8, formation: 'block', x: 0, z: -30, facing: Math.PI, order: 'attack' })).toBe(0);
    expect(sim.spawnSquad({ type: 'footman', count: 8, formation: 'block', x: 0, z: -30, facing: Math.PI, order: 'attack' })).toBe(-1);
    expect(sim.count).toBe(8);
  });
});

describe('shields and bosses (GDD §9.1, §9.3)', () => {
  // A soldier facing +Z (heading π): a shot travelling −Z meets him head-on, one travelling +Z hits his back.
  function shieldWall(): CrowdSim {
    const sim = new CrowdSim(8, flat, field(), clips);
    sim.spawnSquad({ type: 'shieldWall', count: 1, formation: 'line', x: 0, z: -20, facing: Math.PI, order: 'hold' });
    sim.tick(1 / 30);
    return sim;
  }

  it('a shield stops bullets from the front, cracks at 66% and 33%, then breaks', () => {
    const sim = shieldWall();
    const cracks: number[] = [];
    let broke = 0;
    sim.onShieldCrack = (_, stage) => cracks.push(stage);
    sim.onShieldBreak = () => broke++;
    const hp = sim.bodies.hp[0]!;
    expect(sim.hit(0, 20, 0, -1).blocked).toBe(true);
    expect(sim.bodies.hp[0]).toBe(hp);
    for (let n = 0; n < 7; n++) sim.hit(0, 20, 0, -1);
    expect(cracks).toEqual([1, 2]);
    expect(broke).toBe(1);
    // Without its shield it's a plain soldier: the next shot from the front hurts.
    expect(sim.hit(0, 20, 0, -1).blocked).toBe(false);
    expect(sim.bodies.hp[0]).toBe(hp - 20);
  });

  it('shots from the side or behind go round the shield', () => {
    const sim = shieldWall();
    expect(sim.hit(0, 20, 0, 1).blocked).toBe(false);
    expect(sim.hit(0, 20, 1, 0).blocked).toBe(false);
  });

  it('a grenade breaks a shield at once', () => {
    const sim = shieldWall();
    let broke = 0;
    sim.onShieldBreak = () => broke++;
    sim.explode(0, 30, 0, -1);
    expect(broke).toBe(1);
    expect(sim.hit(0, 1, 0, -1).blocked).toBe(false);
  });

  it("Sir Grudge's shield never breaks; below half health he drops it and charges", () => {
    const sim = new CrowdSim(16, flat, field(), clips);
    sim.goal.x = 0;
    sim.goal.z = 0;
    sim.spawnSquad({ type: 'grudge', count: 1, formation: 'mob', x: 0, z: -30, facing: Math.PI, order: 'hold' });
    sim.tick(1 / 30);
    const boss = sim.bossUp;
    expect(boss).toBe(0);
    // Twice the size: a bigger body to shoot.
    expect(sim.bodies.height[boss]).toBeCloseTo(CROWD.height * 2);
    for (let n = 0; n < 50; n++) expect(sim.hit(boss, 100, 0, -1).blocked).toBe(true);
    // In his first phase he marches on the banner and never turns on the hero, so his side can always be reached.
    sim.hero.x = 0;
    sim.hero.z = -27;
    sim.hero.active = true;
    run(sim, 2);
    expect(sim.target[boss]).toBe(-1);
    // (Too close to charge at: the hero steps away, so the charges run at the banner.)
    sim.hero.active = false;
    let half = 0;
    let windups = 0;
    sim.onBossHalf = () => half++;
    sim.onWindup = () => windups++;
    const max = sim.bodies.maxHp[boss]!;
    sim.hit(boss, max * 0.55, 0, 1);
    expect(half).toBe(1);
    expect(sim.hit(boss, 10, 0, -1).blocked).toBe(false);
    // Three telegraphed charges, then no more.
    run(sim, 40);
    expect(windups).toBe(3);
  });

  it("the boss's fall routs his whole army", () => {
    const sim = new CrowdSim(40, flat, field(), clips);
    sim.spawnSquad({ type: 'grudgeBare', count: 1, formation: 'mob', x: 0, z: -20, facing: Math.PI, order: 'hold' });
    sim.spawnSquad({ type: 'footman', count: 8, formation: 'block', x: -30, z: -30, facing: Math.PI, order: 'attack' });
    sim.spawnSquad({ type: 'peasant', count: 6, formation: 'mob', x: 30, z: -40, facing: Math.PI, order: 'attack' });
    sim.tick(1 / 30);
    let down = 0;
    sim.onBossDown = () => down++;
    sim.hit(sim.bossUp, 99999, 0, 1);
    expect(down).toBe(1);
    expect(sim.standing(ENEMY)).toBe(0);
  });

  it('a charge bowls into the Queen soldiers in its lane and hits the hero once', () => {
    const sim = new CrowdSim(32, flat, field(), clips);
    sim.hero.x = 0;
    sim.hero.z = -6;
    sim.hero.active = true;
    let heroHits = 0;
    sim.onHeroHit = () => heroHits++;
    sim.spawnSquad({ type: 'grudgeBare', count: 1, formation: 'mob', x: 0, z: -20, facing: Math.PI, order: 'hold' });
    sim.spawnSquad({ type: 'militia', count: 1, formation: 'block', x: 0, z: -13, facing: 0, order: 'hold' });
    // The first charge comes after `every` (4.5 s), with its 1.5 s wind-up.
    const before = sim.bodies.hp[1]!;
    run(sim, 8);
    const allyHurt = before - sim.bodies.hp[1]!;
    expect(heroHits).toBeGreaterThanOrEqual(1);
    // The militiaman in the lane was hit hard (or knocked out).
    expect(allyHurt >= 40 || sim.state[1] === STATE.knocked).toBe(true);
  });
});

describe('the War Wagon (GDD §9.3, Battle 10)', () => {
  function wagon(): { sim: CrowdSim; wagon: number } {
    const sim = new CrowdSim(96, flat, field(), clips);
    sim.goal.x = 0;
    sim.goal.z = 0;
    sim.spawnSquad({ type: 'warWagon', count: 1, formation: 'block', x: 0, z: -40, facing: 0, order: 'attack' });
    let w = -1;
    for (let i = 0; i < sim.capacity; i++) if (sim.live[i] && sim.wagonParts(i)) w = i;
    return { sim, wagon: w };
  }

  it('brings its wheels and crew, riding with it as it rolls toward the banner', () => {
    const { sim, wagon: w } = wagon();
    const parts = sim.wagonParts(w)!;
    expect(parts.wheels).toHaveLength(4);
    expect(parts.crew).toHaveLength(3);
    const z0 = sim.bodies.z[w]!;
    run(sim, 3);
    expect(sim.bodies.z[w]!).toBeGreaterThan(z0 + 2);
    // A wheel stays at its corner, and the crew stand on the deck.
    const wheel = parts.wheels[0]!;
    expect(Math.hypot(sim.bodies.x[wheel]! - sim.bodies.x[w]!, sim.bodies.z[wheel]! - sim.bodies.z[w]!)).toBeCloseTo(Math.hypot(1.25, 1.35), 1);
    expect(sim.lift[parts.crew[0]!]).toBeGreaterThan(1);
  });

  it("can't be hurt through its hull; its health is its wheels'", () => {
    const { sim, wagon: w } = wagon();
    const before = sim.bodies.hp[w]!;
    expect(sim.hit(w, 500, 0, 1).blocked).toBe(true);
    expect(sim.bodies.hp[w]).toBe(before);
    sim.hit(sim.wagonParts(w)!.wheels[0]!, 100, 0, 1);
    expect(sim.bodies.hp[w]).toBe(before - 100);
  });

  it('stalls at two broken wheels with footmen spilling out, and collapses at four, routing its army', () => {
    const { sim, wagon: w } = wagon();
    let stalls = 0;
    let downs = 0;
    sim.onWagonStall = () => stalls++;
    sim.onBossDown = () => downs++;
    const wheels = sim.wagonParts(w)!.wheels;
    const before = sim.standing(ENEMY);
    sim.damage(wheels[0]!, 9999, 0, 1);
    sim.damage(wheels[1]!, 9999, 0, 1);
    expect(stalls).toBe(1);
    // Two squads of six spilled out; two wheels gone.
    expect(sim.standing(ENEMY)).toBe(before - 2 + 12);
    const z = sim.bodies.z[w]!;
    run(sim, 2);
    expect(sim.bodies.z[w]!).toBeCloseTo(z, 1);
    sim.damage(wheels[2]!, 9999, 0, 1);
    sim.damage(wheels[3]!, 9999, 0, 1);
    expect(downs).toBe(1);
    expect(sim.knockedTime(w)).toBeGreaterThanOrEqual(0);
  });
});

describe('the battering ram (GDD §9.1, Battle 12)', () => {
  function ram(): { sim: CrowdSim; ram: number } {
    const sim = new CrowdSim(96, flat, field(), clips);
    sim.goal.x = 0;
    sim.goal.z = 0;
    sim.spawnSquad({ type: 'ram', count: 1, formation: 'block', x: 0, z: -40, facing: 0, order: 'attack' });
    let r = -1;
    for (let i = 0; i < sim.capacity; i++) if (sim.live[i] && sim.wagonParts(i)) r = i;
    return { sim, ram: r };
  }

  it('is pushed by six crew who walk beside it, on the ground', () => {
    const { sim, ram: r } = ram();
    const parts = sim.wagonParts(r)!;
    expect(parts.wheels).toHaveLength(0);
    expect(parts.crew).toHaveLength(6);
    const z0 = sim.bodies.z[r]!;
    run(sim, 3);
    expect(sim.bodies.z[r]!).toBeGreaterThan(z0 + 2);
    const c = parts.crew[0]!;
    expect(sim.lift[c]).toBe(0);
    expect(sim.state[c]).toBe(STATE.move);
    expect(Math.hypot(sim.bodies.x[c]! - sim.bodies.x[r]!, sim.bodies.z[c]! - sim.bodies.z[r]!)).toBeCloseTo(Math.hypot(1.2, 1), 1);
  });

  it('shrugs off bullets but not explosions', () => {
    const { sim, ram: r } = ram();
    const before = sim.bodies.hp[r]!;
    expect(before).toBe(SOLDIERS.ram.hp);
    expect(sim.hit(r, 500, 0, 1).blocked).toBe(true);
    expect(sim.damage(r, 500, 0, 1)).toBe(false);
    expect(sim.bodies.hp[r]).toBe(before);
    sim.explode(r, 150, 0, 1);
    expect(sim.bodies.hp[r]).toBe(before - 150);
  });

  it('slows as its crew fall, and is abandoned when the last one does', () => {
    const { sim, ram: r } = ram();
    const crew = sim.wagonParts(r)!.crew;
    let z = sim.bodies.z[r]!;
    run(sim, 2);
    const full = sim.bodies.z[r]! - z;
    for (const c of crew.slice(0, 5)) sim.damage(c, 9999, 0, 1);
    z = sim.bodies.z[r]!;
    run(sim, 2);
    expect(sim.bodies.z[r]! - z).toBeLessThan(full * 0.6);
    // The fallen lie where they fell, off the ram.
    expect(sim.lift[crew[0]!]).toBe(0);
    sim.damage(crew[5]!, 9999, 0, 1);
    expect(sim.knockedTime(r)).toBeGreaterThanOrEqual(0);
  });

  it('broken by explosions, throws its crew down', () => {
    const { sim, ram: r } = ram();
    const crew = sim.wagonParts(r)!.crew;
    sim.explode(r, 99999, 0, 1);
    expect(sim.knockedTime(r)).toBeGreaterThanOrEqual(0);
    for (const c of crew) expect(sim.knockedTime(c)).toBeGreaterThanOrEqual(0);
  });
});

describe('the Brute (GDD §9.1, Battle 11)', () => {
  it('is a giant who charges after a glowing wind-up, and has no boss rout', () => {
    const sim = new CrowdSim(32, flat, field(), clips);
    sim.goal.x = 0;
    sim.goal.z = 0;
    sim.spawnSquad({ type: 'brute', count: 1, formation: 'block', x: 0, z: -30, facing: 0, order: 'attack' });
    let windups = 0;
    sim.onWindup = () => windups++;
    run(sim, 9);
    expect(windups).toBeGreaterThanOrEqual(1);
    expect(sim.bossUp).toBe(-1);
  });
});

describe('the battering ram from the front', () => {
  it("doesn't shield its crew from a shot down its side", () => {
    // Its hit circle stays inside the line its crew walk on, with a soldier's width to spare.
    const crewX = Math.min(...SOLDIERS.ram.wagon!.crew.map(([x]) => Math.abs(x)));
    expect(SOLDIERS.ram.radius! + 0.35).toBeLessThan(crewX);
  });
});

describe("the Queen's knights (GDD §10, Battle 13)", () => {
  it('charge the nearest of the Baron\'s men in reach and bowl them over, never the hero', () => {
    const sim = new CrowdSim(64, flat, field(), clips);
    let heroHits = 0;
    sim.onHeroHit = () => heroHits++;
    sim.hero.active = true;
    sim.hero.x = 0;
    sim.hero.z = -1;
    sim.spawnSquad({ type: 'allyKnight', count: 2, formation: 'line', x: 0, z: 0, facing: 0, order: 'hold' });
    sim.spawnSquad({ type: 'footman', count: 4, formation: 'block', x: 0, z: -18, facing: Math.PI, order: 'hold' });
    let windups = 0;
    sim.onWindup = () => windups++;
    const foes = () => {
      let hp = 0;
      for (let i = 0; i < sim.capacity; i++) if (sim.live[i] && sim.team[i] === ENEMY) hp += Math.max(0, sim.bodies.hp[i]!);
      return hp;
    };
    const before = foes();
    run(sim, 4);
    const after = foes();
    expect(windups).toBeGreaterThanOrEqual(1);
    expect(after).toBeLessThan(before);
    expect(heroHits).toBe(0);
  });
});

describe('the catapult (GDD §9.1, Battle 14)', () => {
  function catapult(): { sim: CrowdSim; cat: number } {
    const sim = new CrowdSim(64, flat, field(), clips);
    sim.goal.x = 0;
    sim.goal.z = 0;
    sim.spawnSquad({ type: 'catapult', count: 1, formation: 'block', x: 0, z: -48, facing: 0, order: 'attack' });
    let c = -1;
    for (let i = 0; i < sim.capacity; i++) if (sim.live[i] && sim.wagonParts(i)) c = i;
    return { sim, cat: c };
  }

  it('rolls in to about 40 m, then throws boulders that land after their flight', () => {
    const { sim, cat } = catapult();
    sim.spawnSquad({ type: 'militia', count: 6, formation: 'block', x: 0, z: -6, facing: 0, order: 'hold' });
    const lobs: number[] = [];
    const lands: number[] = [];
    sim.onLob = () => lobs.push(sim.time);
    sim.onBoulder = () => lands.push(sim.time);
    run(sim, 20);
    expect(Math.hypot(sim.bodies.x[cat]!, sim.bodies.z[cat]!)).toBeLessThanOrEqual(40.5);
    expect(lobs.length).toBeGreaterThanOrEqual(2);
    expect(lands.length).toBeGreaterThanOrEqual(1);
    expect(lands[0]! - lobs[0]!).toBeCloseTo(SOLDIERS.catapult.lob!.flight, 0);
  });

  it('hurts the Queen\'s soldiers where it lands, and stops throwing with its crew down', () => {
    const { sim, cat } = catapult();
    sim.spawnSquad({ type: 'militia', count: 6, formation: 'block', x: 0, z: -6, facing: 0, order: 'hold' });
    run(sim, 14);
    let hurt = 0;
    for (let i = 0; i < sim.capacity; i++) if (sim.live[i] && sim.team[i] === ALLY && sim.bodies.hp[i]! < sim.bodies.maxHp[i]!) hurt++;
    expect(hurt + (6 - sim.standing(ALLY))).toBeGreaterThan(0);
    for (const c of sim.wagonParts(cat)!.crew) sim.damage(c, 9999, 0, 1);
    expect(sim.knockedTime(cat)).toBeGreaterThanOrEqual(0);
    let lobs = 0;
    sim.onLob = () => lobs++;
    run(sim, 10);
    expect(lobs).toBe(0);
  });
});

describe("the catapult's open frame", () => {
  it('lets a shot from the banner reach the crewman behind it', () => {
    const sim = new CrowdSim(64, flat, field(), clips);
    sim.goal.x = 0;
    sim.goal.z = 0;
    sim.spawnSquad({ type: 'catapult', count: 1, formation: 'block', x: 0, z: -41, facing: 0, order: 'attack' });
    run(sim, 3);
    let cat = -1;
    for (let i = 0; i < sim.capacity; i++) if (sim.live[i] && sim.wagonParts(i)) cat = i;
    const b = sim.bodies;
    // The crewman furthest from the banner stands behind the engine.
    const crew = [...sim.wagonParts(cat)!.crew].sort((p, q) => Math.hypot(b.x[q]!, b.z[q]!) - Math.hypot(b.x[p]!, b.z[p]!))[0]!;
    const dx = b.x[crew]!;
    const dz = b.z[crew]!;
    const d = Math.hypot(dx, dz);
    const hits: ShotHit[] = [];
    const n = traceShot(b, 0, 1.2, 0, dx / d, 0, dz / d, 0, 60, 1, 1, hits);
    expect(n).toBe(1);
    expect(hits[0]!.id).toBe(crew);
  });
});

describe('a freed wagon slot', () => {
  it("doesn't pass its parts on to the next soldier in it", () => {
    const sim = new CrowdSim(16, flat, field(), clips);
    sim.goal.x = 0;
    sim.goal.z = 0;
    sim.spawnSquad({ type: 'ram', count: 1, formation: 'block', x: 0, z: -40, facing: 0, order: 'attack' });
    let ram = -1;
    for (let i = 0; i < sim.capacity; i++) if (sim.live[i] && sim.wagonParts(i)) ram = i;
    sim.explode(ram, 99999, 0, 1);
    // Long enough for the fallen to sink and their slots to free.
    run(sim, 12);
    expect(sim.live[ram]).toBe(0);
    expect(sim.wagonParts(ram)).toBeUndefined();
    sim.spawnSquad({ type: 'footman', count: 12, formation: 'block', x: 0, z: -30, facing: 0, order: 'hold' });
    for (let i = 0; i < sim.capacity; i++) if (sim.live[i]) expect(sim.wagonParts(i)).toBeUndefined();
  });
});

describe('the Siege Tower (GDD §9.3, Battle 15)', () => {
  function tower(): { sim: CrowdSim; tower: number } {
    const sim = new CrowdSim(160, flat, field(), clips);
    sim.goal.x = 0;
    sim.goal.z = 0;
    sim.spawnSquad({ type: 'siegeTower', count: 1, formation: 'block', x: 0, z: -45, facing: 0, order: 'attack' });
    let t = -1;
    for (let i = 0; i < sim.capacity; i++) if (sim.live[i] && sim.wagonParts(i)) t = i;
    return { sim, tower: t };
  }

  it('brings three beams up its front at their heights, and ten pushers walking beside it', () => {
    const { sim, tower: t } = tower();
    const parts = sim.wagonParts(t)!;
    expect(parts.wheels).toHaveLength(3);
    expect(parts.crew).toHaveLength(10);
    expect(sim.lift[parts.wheels[1]!]).toBeGreaterThan(3);
    const z0 = sim.bodies.z[t]!;
    run(sim, 3);
    expect(sim.bodies.z[t]!).toBeGreaterThan(z0 + 1.5);
    expect(sim.state[parts.crew[0]!]).toBe(STATE.move);
    // Its health on the boss bar is its beams'.
    expect(sim.bodies.hp[t]).toBe(SOLDIERS.towerBeam.hp * 3);
  });

  it('stalls with its pushers down, but stands', () => {
    const { sim, tower: t } = tower();
    let stalls = 0;
    sim.onWagonStall = () => stalls++;
    for (const c of sim.wagonParts(t)!.crew) sim.damage(c, 9999, 0, 1);
    expect(stalls).toBe(1);
    expect(sim.knockedTime(t)).toBe(-1);
    const z = sim.bodies.z[t]!;
    run(sim, 3);
    expect(sim.bodies.z[t]!).toBeCloseTo(z, 1);
  });

  it('opens its doors every so often, a squad stepping out', () => {
    const { sim } = tower();
    const sides: number[] = [];
    sim.onDoors = (_t, side) => sides.push(side);
    const before = sim.standing(ENEMY);
    run(sim, 28);
    expect(sides).toEqual([-1, 1]);
    expect(sim.standing(ENEMY)).toBe(before + 12);
  });

  it('topples when its three beams break, and its army runs', () => {
    const { sim, tower: t } = tower();
    let downs = 0;
    sim.onBossDown = () => downs++;
    for (const beam of sim.wagonParts(t)!.wheels) sim.damage(beam, 9999, 0, 1);
    expect(downs).toBe(1);
    expect(sim.knockedTime(t)).toBeGreaterThanOrEqual(0);
  });
});

describe('elite captains (GDD §4.4, Region 4)', () => {
  it('rout their squad within 25 m (a captain: 15)', () => {
    const routed = (elite: boolean): number => {
      const sim = new CrowdSim(64, flat, field(), clips);
      const squad = sim.spawnSquad({ type: 'footman', count: 1, formation: 'line', x: 0, z: -20, facing: 0, captain: true, elite, order: 'hold' });
      const s = sim.squads[squad]!;
      // His man stands 20 m away: inside an elite captain's rout, outside a captain's.
      for (let i = 0; i < sim.capacity; i++) if (sim.live[i] && i !== s.captain) { sim.bodies.x[i] = 20; sim.bodies.z[i] = -20; }
      sim.bodies.x[s.captain] = 0;
      sim.damage(s.captain, 99999, 0, 1);
      return sim.standing(ENEMY);
    };
    expect(routed(false)).toBe(1);
    expect(routed(true)).toBe(0);
  });

  it("has twice a captain's health", () => {
    expect(SOLDIERS.eliteCaptain.hp).toBe(SOLDIERS.captain.hp * 2);
  });
});

describe('the rocket launcher (GDD §8.1, Battle 18)', () => {
  it('bursts for double on siege engines and bosses, and plain on soldiers', () => {
    const sim = new CrowdSim(64, flat, field(), clips);
    sim.spawnSquad({ type: 'ram', count: 1, formation: 'block', x: 0, z: -10, facing: 0, order: 'hold' });
    const foot = sim.squads[sim.spawnSquad({ type: 'peasant', count: 1, formation: 'block', x: 3, z: -10, facing: 0, order: 'hold' })]!;
    let ram = -1;
    let peasant = -1;
    for (let i = 0; i < sim.capacity; i++) {
      if (!sim.live[i]) continue;
      if (sim.wagonParts(i)) ram = i;
      if (sim.squadOf[i] === foot.id) peasant = i;
    }
    const ramHp = sim.bodies.hp[ram]!;
    const peasantHp = sim.bodies.hp[peasant]!;
    const g = new Grenades(() => 0);
    g.launch(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, -10), 20, 6, true, GUNS.rocketLauncher.siegeBonus);
    for (let k = 0; k < 20; k++) g.update(0.05, sim);
    expect(ramHp - sim.bodies.hp[ram]!).toBe(40);
    expect(peasantHp - sim.bodies.hp[peasant]!).toBe(20);
  });
});

describe('the Iron Ox (GDD §9.3, Battle 20)', () => {
  function ox(): { sim: CrowdSim; ox: number } {
    const sim = new CrowdSim(96, flat, field(), clips);
    sim.goal.x = 0;
    sim.goal.z = 0;
    sim.spawnSquad({ type: 'ironOx', count: 1, formation: 'block', x: 0, z: -40, facing: 0, order: 'attack' });
    let o = -1;
    for (let i = 0; i < sim.capacity; i++) if (sim.live[i]) o = i;
    return { sim, ox: o };
  }

  it("shows its cone, then burns the Queen's soldiers in it and not those beside it", () => {
    const { sim, ox: o } = ox();
    sim.spawnSquad({ type: 'militia', count: 1, formation: 'block', x: 0, z: -30, facing: 0, order: 'hold' });
    sim.spawnSquad({ type: 'militia', count: 1, formation: 'block', x: 9, z: -36, facing: 0, order: 'hold' });
    let windups = 0;
    let fires = 0;
    sim.onFireWindup = () => windups++;
    sim.onFire = () => fires++;
    let shown = false;
    for (let k = 0; k < 6 * 30; k++) {
      sim.step(1 / 30);
      if (sim.fireCone(o)) shown = true;
    }
    expect(windups).toBeGreaterThanOrEqual(1);
    expect(shown).toBe(true);
    expect(fires).toBeGreaterThanOrEqual(1);
    let inCone = 0;
    let beside = 0;
    for (let i = 0; i < sim.capacity; i++) {
      if (!sim.live[i] || sim.team[i] !== ALLY) continue;
      const hurt = sim.bodies.hp[i]! < sim.bodies.maxHp[i]!;
      if (Math.abs(sim.bodies.x[i]!) < 3) inCone += hurt ? 1 : 0;
      else beside += hurt ? 1 : 0;
    }
    expect(inCone).toBe(1);
    expect(beside).toBe(0);
  });

  it('halves bullets until its core shows, summons at 60%, and takes more from explosions after 30%', () => {
    const { sim, ox: o } = ox();
    let halves = 0;
    let cores = 0;
    sim.onBossHalf = () => halves++;
    sim.onOxCore = () => cores++;
    const max = sim.bodies.maxHp[o]!;
    sim.damage(o, 100, 0, 1);
    expect(max - sim.bodies.hp[o]!).toBe(50);
    sim.explode(o, max * 0.45, 0, 1);
    expect(halves).toBe(1);
    expect(cores).toBe(0);
    sim.explode(o, max * 0.25, 0, 1);
    expect(cores).toBe(1);
    expect(sim.oxPhase(o)).toBe(2);
    const before = sim.bodies.hp[o]!;
    sim.explode(o, 100, 0, 1);
    expect(before - sim.bodies.hp[o]!).toBe(150);
    sim.damage(o, 100, 0, 1);
    expect(before - sim.bodies.hp[o]!).toBe(250);
  });
});

describe('squads over a long Last Stand', () => {
  it("reuse a finished enemy squad's place, never the Queen's", () => {
    const sim = new CrowdSim(64, flat, field(), clips);
    const militia = sim.spawnSquad({ type: 'militia', count: 2, formation: 'line', x: 0, z: 0, facing: 0, order: 'hold' });
    const first = sim.spawnSquad({ type: 'footman', count: 2, formation: 'block', x: 0, z: -20, facing: 0, order: 'hold' });
    for (let i = 0; i < sim.capacity; i++) if (sim.live[i] && sim.team[i] === ENEMY) sim.damage(i, 9999, 0, 1);
    // The fallen still lie on the field: not yet.
    expect(sim.spawnSquad({ type: 'footman', count: 1, formation: 'block', x: 5, z: -20, facing: 0, order: 'hold' })).not.toBe(first);
    run(sim, 12);
    for (let i = 0; i < sim.capacity; i++) if (sim.live[i] && sim.team[i] === ENEMY) sim.damage(i, 9999, 0, 1);
    run(sim, 12);
    const before = sim.squads.length;
    const next = sim.spawnSquad({ type: 'footman', count: 2, formation: 'block', x: 0, z: -20, facing: 0, order: 'hold' });
    expect(sim.squads.length).toBe(before);
    expect(next).not.toBe(militia);
    expect(sim.squads[next]!.team).toBe(ENEMY);
  });
});
