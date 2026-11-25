import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ENDING, ESCAPE } from '@/content/ending';
import { EN } from '@/content/strings/en';
import { EndingScene, type EndingHost } from '@/game/ending';
import type { AdaFigure } from '@/world/adaFigure';

/** A stand-in Ada: where she stands and what she plays. */
function fakeAda() {
  const root = new THREE.Group();
  const plays: string[] = [];
  const ada = {
    root,
    shown: false,
    place(x: number, y: number, z: number, yaw: number) {
      root.position.set(x, y, z);
      root.rotation.y = yaw;
      ada.shown = true;
    },
    play(name: string) {
      plays.push(name);
    },
    update() {},
    hide() {
      ada.shown = false;
    },
  };
  return { ada, plays };
}

function scene() {
  const said: string[] = [];
  const log = { fades: [] as boolean[], cheers: 0, done: 0, hero: null as null | { x: number; z: number; yaw: number }, shots: 0 };
  const host: EndingHost = {
    heightAt: () => 0,
    portrait: () => false,
    placeHero: (x, z, yaw) => (log.hero = { x, z, yaw }),
    setShot: () => log.shots++,
    say: (who, key) => said.push(`${who}:${key}`),
    fade: (on) => log.fades.push(on),
    cheer: () => log.cheers++,
    done: () => log.done++,
  };
  const { ada, plays } = fakeAda();
  const ending = new EndingScene(host, ada as unknown as AdaFigure);
  const run = (seconds: number) => {
    for (let t = 0; t < seconds; t += 1 / 30) ending.update(1 / 30);
  };
  return { ending, said, log, ada, plays, run };
}

describe('the ending (M10)', () => {
  it('dips to dark, sets the scene, walks Ada up and plays its four lines by itself', () => {
    const { ending, said, log, ada, run } = scene();
    ending.start();
    expect(log.fades).toEqual([true]);
    expect(ending.framing).toBe(false);
    run(ENDING.fade + 0.1);
    expect(log.fades).toEqual([true, false]);
    expect(ending.framing).toBe(true);
    expect(log.hero).toMatchObject({ x: ENDING.hero.x, z: ENDING.hero.z });
    expect(ada.shown).toBe(true);
    const walk = Math.hypot(ENDING.ada.to.x - ENDING.ada.from.x, ENDING.ada.to.z - ENDING.ada.from.z) / ENDING.ada.speed;
    run(walk + 0.2);
    expect(ada.root.position.x).toBeCloseTo(ENDING.ada.to.x);
    expect(said).toEqual(['ada:ending.line1']);
    run(ENDING.lines.length * ENDING.lineSeconds + 0.2);
    expect(said).toEqual(ENDING.lines.map((l) => `${l.who}:${l.key}`));
    expect(log.done).toBe(1);
    expect(log.cheers).toBe(1);
    // The camera holds on them behind the card until the game stops it.
    expect(ending.framing).toBe(true);
    expect(ending.speaking).toBe(false);
    ending.stop();
    expect(ending.active).toBe(false);
    expect(ada.shown).toBe(false);
  });

  it('moves on at a press (not before a moment has passed), and Skip goes straight to the card', () => {
    const { ending, said, log, run } = scene();
    ending.start();
    run(ENDING.fade + 0.1 + ENDING.minLine + 0.05);
    ending.press();
    expect(said).toEqual(['ada:ending.line1']);
    ending.press();
    expect(said.length).toBe(1);
    run(ENDING.minLine + 0.05);
    ending.press();
    expect(said.length).toBe(2);
    ending.skip();
    expect(log.done).toBe(1);
    expect(log.cheers).toBe(1);
    ending.skip();
    ending.press();
    expect(log.done).toBe(1);
  });

  it('can be skipped while still dark', () => {
    const { ending, log, ada } = scene();
    ending.start();
    ending.update(0.1);
    ending.skip();
    expect(log.fades).toEqual([true, false]);
    expect(log.done).toBe(1);
    expect(ada.root.position.x).toBeCloseTo(ENDING.ada.to.x);
  });

  it('has every line in the strings, short, and Rosie and the Queen take turns', () => {
    for (const line of ENDING.lines) {
      expect(EN[line.key]).toBeTruthy();
      expect(EN[line.key].split(' ').length).toBeLessThanOrEqual(8);
    }
    for (let i = 1; i < ENDING.lines.length; i++) expect(ENDING.lines[i]!.who).not.toBe(ENDING.lines[i - 1]!.who);
  });

  it('times the Baron’s escape to finish well inside a victory card’s patience', () => {
    const total = ESCAPE.trot + ESCAPE.hop + ESCAPE.gallop.seconds + ESCAPE.fade;
    expect(total).toBeLessThan(8);
    expect(ESCAPE.gallop.least).toBeLessThan(ESCAPE.gallop.seconds);
  });
});
