import type * as THREE from 'three';
import { GREYBOX } from '@/content/tuning';
import type { ScenarioName } from '@/content/scenarios';
import type { HitResult, Targets } from '@/game/combat';
import type { Field } from '@/world/field';
import { CrowdRender } from './crowdRender';
import { CrowdSim } from './crowdSim';
import { FlowField } from './flowField';
import { ScenarioRunner } from './scenario';
import { SoldierKit } from './soldierKit';

/** Room for the High tier's 300 soldiers plus those still lying down or running off. */
export const CROWD_CAPACITY = 360;
/** Enemies march right into the capture ring (GDD §4.5), up to this close to the pole. */
const GOAL_RADIUS = 2;

/**
 * The armies on the field: the soldier kit, the simulation and its drawing. Battles spawn through their director; dev
 * scenes (`?scene=`) through the test scenario runner. The hero's shots see it as `Targets`.
 */
export class Crowd implements Targets {
  readonly group: THREE.Group;
  /** False while the hero is down: enemies look for someone else. */
  heroTargetable = true;

  private constructor(
    readonly kit: SoldierKit,
    readonly sim: CrowdSim,
    readonly render: CrowdRender,
    readonly runner: ScenarioRunner,
    private readonly field: Field,
  ) {
    this.group = render.group;
  }

  /** The riders' horse (M11: fetched after the first load; riders go on foot without it). */
  async addMount(): Promise<void> {
    const mount = await this.kit.loadMount('assets/soldiers/');
    if (mount) this.render.setMount(mount, CROWD_CAPACITY);
  }

  static async load(field: Field, progress?: (fraction: number) => void): Promise<Crowd> {
    const kit = await SoldierKit.load('assets/soldiers/', progress);
    const edge = field.half - 3;
    const flow = new FlowField(-field.half, -field.half, field.half * 2, 1, (x, z) => {
      if (Math.abs(x) > edge || Math.abs(z) > edge) return true;
      return field.blockers.some(([x0, z0, x1, z1]) => x > x0 - 0.4 && x < x1 + 0.4 && z > z0 - 0.4 && z < z1 + 0.4);
    });
    flow.build(GREYBOX.bannerAt.x, GREYBOX.bannerAt.z, GOAL_RADIUS);
    const sim = new CrowdSim(CROWD_CAPACITY, field, flow, {
      duration: (clip) => kit.clips[clip].duration,
      speed: (clip) => kit.clips[clip].speed,
    });
    const render = new CrowdRender(kit, CROWD_CAPACITY);
    return new Crowd(kit, sim, render, new ScenarioRunner(sim), field);
  }

  get bodies(): Targets['bodies'] {
    return this.sim.bodies;
  }

  push(id: number, metres: number, dirX: number, dirZ: number): boolean {
    return this.sim.push(id, metres, dirX, dirZ);
  }

  hit(id: number, damage: number, dirX: number, dirZ: number): HitResult {
    return this.sim.hit(id, damage, dirX, dirZ);
  }

  start(scenario: ScenarioName, cap: number): void {
    this.runner.start(scenario, cap);
  }

  /** How far the last frame was between the sim's ticks (others draw in step with the crowd). */
  alpha = 1;

  /** Steps the armies (when `running`) and draws them. */
  update(dt: number, running: boolean, hero: THREE.Vector3, camera: THREE.Vector3): void {
    const sim = this.sim;
    sim.hero.x = hero.x;
    sim.hero.z = hero.z;
    sim.hero.active = running && this.heroTargetable;
    sim.camera.x = camera.x;
    sim.camera.z = camera.z;
    const alpha = running ? sim.step(dt) : 1;
    this.alpha = alpha;
    if (running) this.runner.update(dt);
    this.render.update(sim, alpha, (x, z) => this.field.heightAt(x, z), running ? dt : 0);
  }
}
