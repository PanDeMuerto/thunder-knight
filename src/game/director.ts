import { EDGES, type SquadDef, type WaveDef } from '@/content/battles';
import { GREYBOX } from '@/content/tuning';
import { ENEMY, type CrowdSim } from '@/crowd/crowdSim';

/**
 * Plays a wave's squads (tech design §5.7): each enters at its edge after its `at` seconds, in formation, marching on
 * the banner. Under the device's soldier cap, a squad that doesn't fit waits off-field until there's room, so phones
 * get the same waves, spread out a little longer.
 */
export class Director {
  private pending: SquadDef[] = [];
  private held: { pending: SquadDef[]; waiting: number } | null = null;
  private time = 0;
  /** Cues released by onboarding, with where the squad should enter (or the edge). */
  private readonly released = new Map<string, { x: number; z: number } | null>();
  /** False while onboarding scripts this wave: cued squads wait for `release`. */
  autoCues = true;
  /** Soldiers in the wave, captains included. */
  total = 0;
  private waiting = 0;

  constructor(
    private readonly sim: CrowdSim,
    private cap: number,
  ) {}

  setCap(cap: number): void {
    this.cap = cap;
  }

  start(wave: WaveDef): void {
    this.pending = [...wave.squads].sort((a, b) => a.at - b.at);
    this.time = 0;
    this.released.clear();
    this.total = wave.squads.reduce((n, s) => n + s.count + (s.captain ? 1 : 0), 0);
    this.waiting = this.total;
  }

  stop(): void {
    this.pending = [];
    this.waiting = 0;
    this.held = null;
  }

  /** A defeat: the wave's remaining squads wait in case the player rallies (GDD §16). */
  hold(): void {
    const held = { pending: this.pending, waiting: this.waiting };
    this.stop();
    this.held = held;
  }

  /** Rally: the held squads come on again. */
  resume(): void {
    if (!this.held) return;
    this.pending = this.held.pending;
    this.waiting = this.held.waiting;
    this.held = null;
  }

  /** Squads that join the wave now (a boss's reinforcements). */
  add(squads: readonly SquadDef[]): void {
    for (const squad of squads) {
      const size = squad.count + (squad.captain ? 1 : 0);
      this.pending.push({ ...squad, at: this.time });
      this.waiting += size;
      this.total += size;
    }
  }

  /** Every squad of the wave is on the field. */
  get done(): boolean {
    return this.pending.length === 0;
  }

  /** Enemies still to beat: waiting to enter, plus standing on the field. */
  get left(): number {
    return this.waiting + this.sim.standing(ENEMY);
  }

  /** Lets a cued squad in now, optionally at a chosen spot (the scout steps out where the player can see him). */
  release(cue: string, at: { x: number; z: number } | null = null): void {
    this.released.set(cue, at);
  }

  update(dt: number): void {
    this.time += dt;
    for (;;) {
      // The next squad due: cued ones wait for their cue unless cues run by themselves.
      const def = this.pending.find((s) => (s.cue && !this.autoCues ? this.released.has(s.cue) : s.at <= this.time));
      if (!def) break;
      const size = def.count + (def.captain ? 1 : 0);
      // Lying soldiers count toward the cap until they sink away.
      if (this.sim.count + size > this.cap) break;
      const edge = EDGES[def.edge];
      const spot = def.cue ? this.released.get(def.cue) : null;
      const x = spot ? spot.x : edge.x + edge.alongX * (def.offset ?? 0);
      const z = spot ? spot.z : edge.z + edge.alongZ * (def.offset ?? 0);
      const facing = Math.atan2(-(GREYBOX.bannerAt.x - x), -(GREYBOX.bannerAt.z - z));
      const id = this.sim.spawnSquad({ type: def.type, count: def.count, formation: def.formation, x, z, facing, captain: def.captain, elite: def.elite, order: 'attack' });
      if (id < 0) break;
      this.pending.splice(this.pending.indexOf(def), 1);
      this.waiting -= size;
    }
  }
}
