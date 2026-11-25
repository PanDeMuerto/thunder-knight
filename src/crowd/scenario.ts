import { GREYBOX } from '@/content/tuning';
import { SCENARIOS, type Scenario, type ScenarioName } from '@/content/scenarios';
import { ALLY, ENEMY, type CrowdSim } from './crowdSim';

/** Counts in scenarios are written for this many soldiers (the High tier). */
const FULL = 300;
const CHECK_SECONDS = 1.2;

/**
 * Runs a test scenario on the crowd (M2): the opening squads, scaled to the device's soldier cap, then reinforcements
 * so a clash keeps going for as long as it's watched. Battles and their director replace this in M3.
 */
export class ScenarioRunner {
  private scenario: Scenario = SCENARIOS.none;
  private wait = 0;
  private scale = 1;
  private cap = FULL;
  name: ScenarioName = 'none';

  constructor(private readonly sim: CrowdSim) {}

  /** Clears the field and starts a scenario for a device that can show `cap` soldiers. */
  start(name: ScenarioName, cap: number): void {
    this.name = name;
    this.scenario = SCENARIOS[name];
    this.scale = Math.min(1, cap / FULL);
    this.cap = cap;
    this.sim.clear();
    for (const spec of this.scenario.squads) {
      const count = Math.max(1, Math.round(spec.count * this.scale));
      this.sim.spawnSquad({ ...spec, count });
    }
    this.wait = CHECK_SECONDS;
  }

  update(dt: number): void {
    this.wait -= dt;
    if (this.wait > 0) return;
    this.wait = CHECK_SECONDS;
    const sim = this.sim;
    if (this.scenario.repeat && sim.standing(ENEMY) === 0 && sim.count === 0) {
      this.start(this.name, this.cap);
      return;
    }
    const top = this.scenario.topUp;
    if (!top) return;
    // Lying and fleeing soldiers still take room until they're gone.
    const room = Math.min(sim.capacity, this.cap + 40) - sim.count;
    const enemies = sim.standing(ENEMY);
    if (enemies < this.cap * top.enemies * 0.85) {
      const pick = top.enemySquads[Math.floor(Math.random() * top.enemySquads.length)]!;
      const count = Math.max(2, Math.round(pick.count * this.scale));
      if (count + (pick.captain ? 1 : 0) <= room) {
        const x = (Math.random() - 0.5) * 60;
        sim.spawnSquad({ ...pick, count, x, z: top.enemyEdgeZ, facing: Math.PI, order: 'attack' });
      }
    }
    const allies = sim.standing(ALLY);
    if (allies < this.cap * top.allies * 0.75) {
      const count = Math.max(2, Math.round(14 * this.scale));
      if (count <= room) {
        // Fresh militia jog up from behind the truck to a spot in the crescent.
        const x = (Math.random() - 0.5) * 36;
        const z = GREYBOX.bannerAt.z - 9 - Math.random() * 5;
        const id = sim.spawnSquad({ type: 'militia', count, formation: 'mob', x, z: top.allyFromZ, facing: 0, order: 'hold' });
        const squad = sim.squads[id];
        if (squad) {
          squad.anchorX = x;
          squad.anchorZ = z;
        }
      }
    }
  }
}
