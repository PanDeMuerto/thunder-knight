import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GUNS } from '@/content/guns';
import { SHOOTING } from '@/content/tuning';
import { SpatialHash } from '@/core/spatialHash';
import { AimAssist, aimProfile } from '@/game/aimAssist';
import { Bodies, ROLE } from '@/game/bodies';
import { Gun } from '@/game/gun';
import { rayCapsule, traceShot, type ShotHit } from '@/game/hitscan';
import { gunStats, levelPrice } from '@/state/guns';

const clear = (): boolean => true;

describe('spatial hash', () => {
  it('finds points near a circle once each', () => {
    const hash = new SpatialHash(2, -10, -10, 10, 10, 8);
    hash.insert(0, 0, 0);
    hash.insert(1, 1.5, 0.5);
    hash.insert(2, 8, 8);
    const out: number[] = [];
    hash.queryCircle(0, 0, 2, out);
    expect(out.sort()).toEqual([0, 1]);
  });

  it('walks a segment and returns what lies along it, in order', () => {
    const hash = new SpatialHash(2, -20, -20, 20, 20, 8);
    hash.insert(0, 0, -3);
    hash.insert(1, 0, -9);
    hash.insert(2, 0, -15);
    hash.insert(3, 9, -9);
    const out: number[] = [];
    hash.querySegment(0, 0, 0, -16, 0.5, out);
    expect(out).toEqual([0, 1, 2]);
  });

  it('keeps points outside its bounds in the edge cells', () => {
    const hash = new SpatialHash(2, -4, -4, 4, 4, 2);
    hash.insert(0, 50, 50);
    const out: number[] = [];
    hash.queryCircle(3.9, 3.9, 0.1, out);
    expect(out).toEqual([0]);
  });
});

describe('hitscan', () => {
  it('hits a standing capsule from the side and misses past it', () => {
    expect(rayCapsule(0, 1, 5, 0, 0, -1, 0, 0, 0, 1.6, 0.3)).toBeCloseTo(4.7, 5);
    expect(rayCapsule(0, 1, 5, 0, 0, -1, 0.5, 0, 0, 1.6, 0.3)).toBe(Infinity);
    // Over the head.
    expect(rayCapsule(0, 2.0, 5, 0, 0, -1, 0, 0, 0, 1.6, 0.3)).toBe(Infinity);
    // Behind the ray's start.
    expect(rayCapsule(0, 1, 5, 0, 0, 1, 0, 0, 0, 1.6, 0.3)).toBe(Infinity);
  });

  it('hits the head cap from above', () => {
    const t = rayCapsule(0, 5, 0, 0, -1, 0, 0, 0, 0, 1.6, 0.3);
    expect(t).toBeCloseTo(5 - 1.6, 5);
  });

  it('stops after its pierce, nearest first', () => {
    const bodies = new Bodies(8);
    for (let i = 0; i < 4; i++) bodies.add(0, 0, -5 - i * 2, 0.3, 1.6, 20);
    bodies.reindex();
    const hits: ShotHit[] = [];
    expect(traceShot(bodies, 0, 1, 0, 0, 0, -1, 0, 40, 1, 1, hits)).toBe(1);
    expect(hits[0]!.id).toBe(0);
    expect(traceShot(bodies, 0, 1, 0, 0, 0, -1, 0, 40, 3, 1, hits)).toBe(3);
    expect(hits.map((h) => h.id)).toEqual([0, 1, 2]);
  });

  it('respects the start and the range', () => {
    const bodies = new Bodies(4);
    bodies.add(0, 0, -2, 0.3, 1.6, 20);
    bodies.add(0, 0, -30, 0.3, 1.6, 20);
    bodies.reindex();
    const hits: ShotHit[] = [];
    // The first body is between the camera and the hero (start 4 m): it can't be hit.
    expect(traceShot(bodies, 0, 1, 0, 0, 0, -1, 4, 20, 2, 1, hits)).toBe(0);
    expect(traceShot(bodies, 0, 1, 0, 0, 0, -1, 4, 40, 2, 1, hits)).toBe(1);
    expect(hits[0]!.id).toBe(1);
  });

  it('skips knocked-out bodies', () => {
    const bodies = new Bodies(4);
    bodies.add(0, 0, -5, 0.3, 1.6, 20);
    bodies.add(0, 0, -8, 0.3, 1.6, 20);
    bodies.reindex();
    expect(bodies.hurt(0, 25)).toBe(true);
    const hits: ShotHit[] = [];
    traceShot(bodies, 0, 1, 0, 0, 0, -1, 0, 40, 1, 1, hits);
    expect(hits[0]!.id).toBe(1);
  });
});

describe('gun', () => {
  it('fires at its rate while held and not faster', () => {
    const gun = new Gun(GUNS.pistol);
    let shots = 0;
    for (let i = 0; i < 60; i++) shots += gun.update(1 / 60, true, false);
    // 4 a second, the first at once.
    expect(shots).toBe(4);
  });

  it('reloads by itself when the magazine runs dry', () => {
    const gun = new Gun(GUNS.pistol);
    let shots = 0;
    for (let i = 0; i < 60 * 4; i++) shots += gun.update(1 / 60, true, false);
    expect(shots).toBe(12 + 1);
    expect(gun.events).toContain('reloadStart');
    expect(gun.events).toContain('reloadEnd');
  });

  it('reloads early on request, and tops up when idle', () => {
    const gun = new Gun(GUNS.pistol);
    gun.update(1 / 60, true, false);
    expect(gun.ammo).toBe(11);
    gun.update(1 / 60, false, true);
    expect(gun.reloading).toBeGreaterThan(0);
    for (let i = 0; i < 70; i++) gun.update(1 / 60, false, false);
    expect(gun.ammo).toBe(12);

    gun.update(1 / 60, true, false);
    let t = 0;
    while (t < SHOOTING.idleReloadSeconds + 0.1) {
      gun.update(1 / 60, false, false);
      t += 1 / 60;
    }
    expect(gun.reloading).toBeGreaterThan(0);
  });

  it("doesn't reload a full magazine", () => {
    const gun = new Gun(GUNS.pistol);
    gun.update(1 / 60, false, true);
    expect(gun.reloading).toBe(0);
  });

  it('levels add damage and magazine and shorten reloads, with the GDD prices', () => {
    const one = gunStats(GUNS.pistol, 1);
    const five = gunStats(GUNS.pistol, 5);
    expect(one).toEqual({ damage: 20, magazine: 12, reload: 1 });
    expect(five.damage).toBe(36);
    expect(five.magazine).toBe(19);
    expect(five.reload).toBeCloseTo(0.8, 5);
    expect([1, 2, 3, 4, 5].map((l) => levelPrice('pistol', l))).toEqual([100, 180, 300, 500, null]);
  });
});

describe('aim assist', () => {
  const eye = new THREE.Vector3(0, 1, 0);
  const ahead = new THREE.Vector3(0, 0, -1);
  const touch = aimProfile(true, 'normal');

  it('picks the body under the crosshair over a captain beside it', () => {
    const bodies = new Bodies(4);
    bodies.add(0, 0, -10, 0.32, 1.6, 30);
    bodies.add(0.8, 0, -10, 0.32, 1.6, 150, ROLE.captain);
    const aim = new AimAssist();
    aim.update(0.016, eye, ahead, bodies, touch, 40, clear);
    expect(aim.target).toBe(0);
    expect(aim.onBody).toBe(true);
  });

  it('prefers a captain, then an archer, inside the cone', () => {
    const bodies = new Bodies(4);
    bodies.add(0.9, 0, -10, 0.32, 1.6, 30);
    bodies.add(-0.9, 0, -12, 0.32, 1.6, 40, ROLE.ranged);
    bodies.add(1.0, 0, -14, 0.32, 1.6, 150, ROLE.captain);
    const aim = new AimAssist();
    aim.update(0.016, eye, ahead, bodies, touch, 40, clear);
    expect(aim.target).toBe(2);
    bodies.hurt(2, 999);
    aim.update(0.016, eye, ahead, bodies, touch, 40, clear);
    expect(aim.target).toBe(1);
  });

  it('keeps its target a little past the cone, and never sees through props', () => {
    const bodies = new Bodies(4);
    bodies.add(1.0, 0, -10, 0.32, 1.6, 30);
    const aim = new AimAssist();
    aim.update(0.016, eye, ahead, bodies, touch, 40, clear);
    expect(aim.target).toBe(0);
    // Turned so it's just outside the cone, but inside the sticky margin.
    const turned = ahead.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (2 * Math.PI) / 180);
    aim.update(0.016, eye, turned, bodies, touch, 40, clear);
    expect(aim.target).toBe(0);
    aim.update(0.016, eye, ahead, bodies, touch, 40, () => false);
    expect(aim.target).toBe(-1);
  });

  it('bends shots toward the target on touch, and not when assist is off', () => {
    const bodies = new Bodies(2);
    bodies.add(0.9, 0, -10, 0.32, 1.6, 30);
    const aim = new AimAssist();
    aim.update(0.016, eye, ahead, bodies, touch, 40, clear);
    const dir = new THREE.Vector3();
    expect(aim.shotDirection(eye, ahead, touch, 40, dir)).toBe(true);
    expect(dir.x).toBeGreaterThan(0.05);
    const off = aimProfile(true, 'off');
    aim.update(0.016, eye, ahead, bodies, off, 40, clear);
    expect(aim.shotDirection(eye, ahead, off, 40, dir)).toBe(false);
    expect(dir.x).toBe(0);
  });

  it('ignores bodies between the camera and the hero', () => {
    const bodies = new Bodies(2);
    bodies.add(0, 0, -2, 0.32, 1.6, 30);
    const aim = new AimAssist();
    aim.update(0.016, eye, ahead, bodies, touch, 40, clear, 4);
    expect(aim.target).toBe(-1);
  });
});
