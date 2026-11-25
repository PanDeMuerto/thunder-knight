import type * as THREE from 'three';
import { type BattleDef, battle, battleName, bossWave } from '@/content/battles';
import { BANNER, HERO_BODY } from '@/content/economy';
import { GUNS, type GunId } from '@/content/guns';
import { t } from '@/content/strings';
import { GREYBOX } from '@/content/tuning';
import { ADS } from '@/content/ads';
import { ALLY, ENEMY, TYPES, type CrowdSim } from '@/crowd/crowdSim';
import { SOLDIERS, type SoldierType } from '@/content/soldiers';
import { allyBoost, allyCount, bannerMax, heroStats, hpMultiplier, killGold, waveBonus, type HeroStats } from '@/state/economy';
import type { GameState } from '@/state/gameState';
import { recordDefeat, recordVictory, reachedBattle, type VictoryResult } from '@/state/progress';
import { fillSecondHand, handSlots, supportCharges } from '@/state/shop';
import { lastStandBest, lastStandBossWave, lastStandHp, lastStandShopAfter, lastStandWave, recordLastStand } from '@/state/lastStand';
import { LAST_STAND } from '@/content/lastStand';
import type { SupportId } from '@/content/support';
import { Director } from './director';

/** `ready`: before wave 1. `wave`: fighting. `break`: between waves (the shop). Then `victory` or `defeat`. */
export type Phase = 'ready' | 'wave' | 'break' | 'victory' | 'defeat';

/** What a battle needs from the game. Only the game touches Poki, the cards, the shop panel and the save store. */
export interface BattleHost {
  readonly state: GameState;
  readonly sim: CrowdSim;
  /** Soldiers the device can show at once (both sides). */
  cap(): number;
  /** The phase changed (Poki's gameplay events, the Next wave button, the shop). */
  onPhase(phase: Phase): void;
  /** Time to show the victory or defeat card. */
  onResult(): void;
  /** The hero's gun in hand changed (equip it). */
  onGun(gun: GunId, level: number): void;
  /** Battle events for sound, toasts and effects. */
  onEvent(event: BattleEvent): void;
  save(): void;
}

export type BattleEvent =
  | { kind: 'waveStart'; wave: number }
  | { kind: 'waveCleared'; bonus: number }
  | { kind: 'atBanner' }
  | { kind: 'heroHurt'; fromX: number; fromZ: number }
  | { kind: 'heroDown' }
  | { kind: 'heroUp' }
  /** A rift crate's gun went back after its wave. */
  | { kind: 'loanOver'; gun: GunId }
  /** The break before a boss wave (GDD §9.3: "Last shop before the boss!"). */
  | { kind: 'lastShop' }
  /** The boss fell below half health: he changes, and reinforcements come. */
  | { kind: 'bossHalf'; boss: SoldierType }
  | { kind: 'oxCore' }
  /** The boss is down: his army runs and the wave is won. */
  | { kind: 'bossDown'; boss: SoldierType }
  /** The War Wagon has stopped on its broken wheels: footmen spill out (GDD §9.3). */
  | { kind: 'wagonStall'; tower: boolean }
  /** The quiet comeback help is on for this attempt (GDD §4.8). */
  | { kind: 'comeback' };

const READY_SECONDS = 2.5;
const VICTORY_CARD_SECONDS = 2.6;
const DEFEAT_CARD_SECONDS = 1.8;
/**
 * The hired squads (GDD §10) and where each holds, metres in front of the banner (negative: behind it): archers on
 * the hill's shoulders behind it, men-at-arms in an armoured line out on the main lane, knights in a line just in
 * front of it, ready to charge down the lane.
 */
const HIRED: readonly { unit: 'archers' | 'menAtArms' | 'knights'; type: SoldierType; out: number }[] = [
  { unit: 'archers', type: 'allyArcher', out: -4 },
  { unit: 'menAtArms', type: 'allyManAtArms', out: 15 },
  { unit: 'knights', type: 'allyKnight', out: 5 },
];
const SLOW_MOTION = 0.3;

/** Drain weight of each enemy in the ring (GDD §4.5): light, heavy, and a boss as much as a ram. */
function drainOf(type: SoldierType): number {
  if (SOLDIERS[type].boss) return BANNER.drain.boss;
  // The battering ram at the banner (GDD §9.1): 4% a second.
  if (type === 'ram') return BANNER.drain.ram;
  // What rides on the War Wagon drains through the wagon.
  if (SOLDIERS[type].fixture || type === 'wagonCrossbow') return 0;
  // Shield walls block rather than rush: they drain like peasants.
  return type === 'footman' || type === 'captain' || type === 'rider' ? BANNER.drain.heavy : BANNER.drain.light;
}

/**
 * One battle from start to its card (GDD §4): the waves through the director, the banner and its ring, the hero's
 * health, knockouts and getting up, grenades, gold, the breaks between waves, victory and defeat. Rules that can be
 * tested without a battle live in `state/`; this is their running order.
 */
export class Battle {
  readonly def: BattleDef;
  phase: Phase = 'ready';
  /** The wave fighting now or last fought (0-based); −1 before the first. */
  wave = -1;
  /** The banner's health, 0 up to `bannerMax` (1 is the base 100%). */
  banner: number;
  readonly bannerMax: number;
  heroHp: number;
  stats: HeroStats;
  /** Seconds the hero has left on the ground, 0 when up. */
  knocked = 0;
  grenades = 0;
  /** Support call-ins left this wave (GDD §8.3), and how many were called this battle. */
  support = 0;
  supportCalls = 0;
  /** Rosie's free charge (Battle 8's lesson) stands in for an owned call-in this battle. */
  private supportGift = false;
  /** What Rosie lent for this battle (Battle 8: the Rift Strike; Battle 13: her Sentry Gun), if anything. */
  private giftKind: SupportId | null = null;
  /** Gold this battle, for the victory card (GDD §4.8). */
  readonly earned = { kills: 0, waves: 0, firstClear: 0 };
  victory: VictoryResult | null = null;
  /** Which gun in the hand is out (0 or 1). */
  slot = 0;
  /** Swaps this battle (the swap lesson ends on the first). */
  swaps = 0;
  /** 1 normally; slow motion as the banner falls. */
  timeScale = 1;
  /** True during the army reveal: the hero can't be hurt (GDD §4.3). */
  shielded = false;
  /** Rally was used (once per battle, GDD §16). */
  rallied = false;
  /** A gun lent by the rift crate for the next wave (GDD §12.3), at `ADS.rewarded.riftCrateLevel`. */
  loan: GunId | null = null;
  private readonly director: Director;
  private timer = 0;
  private invulnerable = 0;
  private sinceHurt = 99;
  private warned = false;
  private militia = -1;
  /** Each hired squad's index in the crowd (−1: not hired yet), in `HIRED`'s order. */
  private hired = HIRED.map(() => -1);
  private resultShown = false;

  /** A campaign battle, or a Last Stand on its field (GDD §13.4: endless waves, made as they come). */
  readonly mode: 'campaign' | 'lastStand';
  /** A Last Stand's record as of the last wave held (shown on its card), and the field's best when the run began. */
  record = { best: 0, newBest: false };
  private startBest = 0;

  constructor(
    private readonly host: BattleHost,
    id: number,
    mode: 'campaign' | 'lastStand' = 'campaign',
  ) {
    this.mode = mode;
    this.def = mode === 'lastStand' ? { ...battle(id), waves: [], plannedWaves: 0 } : battle(id);
    if (mode === 'lastStand') {
      this.startBest = lastStandBest(host.state, id);
      this.record = { best: this.startBest, newBest: false };
    }
    const state = host.state;
    this.bannerMax = bannerMax(state);
    this.banner = this.bannerMax;
    this.stats = heroStats(state, id);
    this.heroHp = this.stats.health;
    this.director = new Director(host.sim, host.cap());
  }

  get id(): number {
    return this.def.id;
  }

  get waves(): number {
    return this.lastStand ? Infinity : this.def.waves.length;
  }

  get lastStand(): boolean {
    return this.mode === 'lastStand';
  }

  /** Waves held so far (a Last Stand's score). */
  get held(): number {
    return this.phase === 'wave' || this.phase === 'defeat' ? this.wave : this.wave + 1;
  }

  get heroUp(): boolean {
    return this.knocked <= 0;
  }

  /** Enemies left in the wave (waiting plus standing), and its size. */
  get enemiesLeft(): number {
    return this.phase === 'wave' ? this.director.left : 0;
  }

  get enemiesTotal(): number {
    return this.director.total;
  }

  /** The battle reached for the shop: what this battle and the save have opened. */
  get reached(): number {
    return Math.max(this.def.id, reachedBattle(this.host.state));
  }

  /** Sets the field up: allies at the banner, the region's enemy health, the comeback help. */
  begin(): void {
    const { sim, state } = this.host;
    sim.clear();
    sim.enemyHp = this.lastStand ? lastStandHp(this.def.id, 1) : hpMultiplier(this.def.id);
    sim.allyBoost = allyBoost(state, this.def.id);
    const { bannerAt } = GREYBOX;
    sim.goal.x = bannerAt.x;
    sim.goal.z = bannerAt.z;
    // A boss below half health brings his reinforcements (GDD §9.3).
    sim.onBossHalf = (i) => {
      const extra = this.def.waves[this.wave]?.bossHalf;
      if (extra && this.phase === 'wave') this.director.add(extra);
      this.host.onEvent({ kind: 'bossHalf', boss: TYPES[sim.type[i]!]! });
    };
    // His fall routs his army and calls off whoever hadn't come yet: the wave is won.
    sim.onBossDown = (i) => {
      this.director.stop();
      this.host.onEvent({ kind: 'bossDown', boss: TYPES[sim.type[i]!]! });
    };
    sim.onOxCore = () => this.host.onEvent({ kind: 'oxCore' });
    sim.onWagonStall = (i) => this.host.onEvent({ kind: 'wagonStall', tower: TYPES[sim.type[i]!] === 'siegeTower' });
    this.militia = sim.spawnSquad({
      type: 'militia',
      count: allyCount(state, 'militia', this.def.id),
      formation: 'crescent',
      x: bannerAt.x,
      z: bannerAt.z - 9.5,
      facing: 0,
      order: 'hold',
    });
    // The hired squads stand at their places from the start.
    this.hired = HIRED.map((h) => {
      const count = allyCount(state, h.unit, this.def.id);
      return count > 0 ? sim.spawnSquad({ type: h.type, count, formation: 'line', x: bannerAt.x, z: bannerAt.z - h.out, facing: 0, order: 'hold' }) : -1;
    });
    this.equipHand();
    this.phase = 'ready';
    this.timer = READY_SECONDS;
    this.host.onPhase('ready');
    if (sim.allyBoost > 1) this.host.onEvent({ kind: 'comeback' });
  }

  /** Re-reads the hand and the hero's stats (after the shop). A rift crate's loan stays in hand until its wave ends. */
  equipHand(): void {
    const state = this.host.state;
    fillSecondHand(state, this.reached);
    this.stats = heroStats(state, this.def.id);
    if (this.slot >= handSlots(this.reached) || !state.hand[this.slot]) this.slot = 0;
    if (this.loan) {
      this.host.onGun(this.loan, ADS.rewarded.riftCrateLevel);
      return;
    }
    const gun = state.hand[this.slot] as GunId;
    this.host.onGun(gun, state.guns[gun] ?? 1);
  }

  /** The rift crate's reward: a gun for the rest of this break and the next wave. */
  lend(gun: GunId): void {
    this.loan = gun;
    this.equipHand();
  }

  /**
   * Rally (rewarded, GDD §16): from the defeat card back into the same wave. The banner flares back to half, the
   * enemies at it are knocked out, the hero is up, and the wave's remaining squads come on as before.
   */
  rally(): void {
    if (this.phase !== 'defeat' || this.rallied) return;
    const { sim } = this.host;
    this.rallied = true;
    this.banner = this.bannerMax * ADS.rewarded.rallyBanner;
    const { bannerAt } = GREYBOX;
    const b = sim.bodies;
    for (let i = 0; i < sim.capacity; i++) {
      if (!b.alive[i] || sim.team[i] !== ENEMY) continue;
      const dx = b.x[i]! - bannerAt.x;
      const dz = b.z[i]! - bannerAt.z;
      // The Rally's blast: a ram in the ring breaks too.
      if (Math.hypot(dx, dz) < BANNER.ringRadius + 2) sim.damage(i, 99999, dx || 0.01, dz, true);
    }
    this.timeScale = 1;
    this.resultShown = false;
    this.warned = false;
    this.director.resume();
    if (this.knocked > 0) this.getUp();
    this.heroHp = this.stats.health;
    this.invulnerable = HERO_BODY.getUpInvulnerable;
    this.phase = 'wave';
    this.host.onPhase('wave');
  }

  /** Onboarding scripts this battle's first wave: its cued squads wait, and there's no countdown. */
  scriptFirstWave(): void {
    this.director.autoCues = false;
    this.phase = 'ready';
    this.nextWave();
  }

  /** Lets a cued squad in (onboarding), optionally at a chosen spot. */
  releaseCue(cue: string, at: { x: number; z: number } | null = null): void {
    this.director.release(cue, at);
  }

  /** A firebrand's burst inside the banner's ring takes a share of its health (GDD §9.1); the loss is checked next frame. */
  /** The Iron Ox's fire: the banner burns if it stands in the cone from (x, z) along (dirX, dirZ) (GDD §9.3). */
  fireAt(x: number, z: number, dirX: number, dirZ: number, length: number, half: number, share: number): void {
    const { bannerAt } = GREYBOX;
    const dx = bannerAt.x - x;
    const dz = bannerAt.z - z;
    const d = Math.hypot(dx, dz);
    if (this.phase !== 'wave' || d > length + 1 || d < 0.01 || (dx * dirX + dz * dirZ) / d < Math.cos(half)) return;
    this.banner = Math.max(0, this.banner - share);
  }

  burstAt(x: number, z: number, share: number): void {
    if (this.phase !== 'wave') return;
    const { bannerAt } = GREYBOX;
    if (Math.hypot(x - bannerAt.x, z - bannerAt.z) > BANNER.ringRadius) return;
    this.banner = Math.max(this.def.id === 1 ? BANNER.floorBattle1 / 100 : 0, this.banner - share);
  }

  /** Two guns in hand and no loan: the swap works. */
  get canSwap(): boolean {
    return !this.loan && handSlots(this.reached) === 2 && !!this.host.state.hand[1];
  }

  /** Swaps to the other gun in the hand, when there are two (GDD §6). Not while holding a loan. */
  swap(): boolean {
    const hand = this.host.state.hand;
    if (this.loan || handSlots(this.reached) < 2 || !hand[1]) return false;
    this.slot = 1 - this.slot;
    this.swaps++;
    this.equipHand();
    return true;
  }

  /** Starts the next wave (the Next wave button, or the ready countdown). */
  nextWave(): void {
    if (this.phase !== 'break' && this.phase !== 'ready') return;
    const { sim, state } = this.host;
    this.wave++;
    // A Last Stand makes each wave as it comes, a little tougher every time.
    if (this.lastStand) {
      if (!this.def.waves[this.wave]) this.def.waves.push(lastStandWave(this.def.id, this.wave + 1));
      sim.enemyHp = lastStandHp(this.def.id, this.wave + 1);
    }
    const def = this.def.waves[this.wave];
    if (!def) return;
    this.director.setCap(this.host.cap());
    this.director.start(def);
    // Only the first wave of a scripted battle waits for cues.
    if (this.wave > 0) this.director.autoCues = true;
    // Allies refill to their squad size; newcomers jog in from behind the truck (GDD §4.7, §10).
    const from = { x: GREYBOX.truckAt.x, z: GREYBOX.truckAt.z + 6 };
    if (this.militia >= 0) sim.refill(this.militia, allyCount(state, 'militia', this.def.id), from.x, from.z);
    // Hired squads refill too; one hired since the last wave jogs in from the truck to its place.
    HIRED.forEach((h, k) => {
      const count = allyCount(state, h.unit, this.def.id);
      const index = this.hired[k]!;
      if (index >= 0) sim.refill(index, count, from.x, from.z);
      else if (count > 0) {
        this.hired[k] = sim.spawnSquad({ type: h.type, count, formation: 'line', x: from.x, z: from.z, facing: 0, order: 'hold' });
        const squad = sim.squads[this.hired[k]!];
        if (squad) {
          squad.anchorX = GREYBOX.bannerAt.x;
          squad.anchorZ = GREYBOX.bannerAt.z - h.out;
        }
      }
    });
    this.stats = heroStats(state, this.def.id);
    this.grenades = this.stats.grenades;
    this.support = this.lentOther ? 1 : Math.max(supportCharges(state), this.supportGift ? 1 : 0);
    this.warned = false;
    this.phase = 'wave';
    this.host.onPhase('wave');
    this.host.onEvent({ kind: 'waveStart', wave: this.wave + 1 });
  }

  /** A knockout's or a rout's gold: what drops, for coins. */
  goldFor(type: SoldierType): number {
    return killGold(type, this.def.id);
  }

  /** A coin reached the hero. */
  collect(value: number): void {
    this.host.state.gold += value;
    this.earned.kills += value;
  }

  /** An enemy blow or bolt reached the hero (GDD §4.6, §7). */
  hurtHero(damage: number, fromX: number, fromZ: number): void {
    if (this.phase !== 'wave' || this.knocked > 0 || this.invulnerable > 0 || this.shielded) return;
    this.heroHp -= damage;
    // Battle 1 can't knock the hero out.
    if (this.def.id === 1) this.heroHp = Math.max(1, this.heroHp);
    this.invulnerable = HERO_BODY.invulnerable;
    this.sinceHurt = 0;
    this.host.onEvent({ kind: 'heroHurt', fromX, fromZ });
    if (this.heroHp <= 0) {
      this.heroHp = 0;
      this.knocked = HERO_BODY.knockedSeconds;
      this.host.onEvent({ kind: 'heroDown' });
    }
  }

  /** A call-in this battle can use: one equipped, or Rosie's free charge. */
  get supportOn(): boolean {
    return this.supportGift || supportCharges(this.host.state) > 0;
  }

  /**
   * Rosie lends a call-in for this battle (Battle 8: the Rift Strike; Battle 13: her Sentry Gun): one charge now, and
   * one each wave. Lent in place of the player's own, it replaces it for this battle.
   */
  giftSupport(kind: SupportId = 'riftStrike'): void {
    this.supportGift = true;
    this.giftKind = kind;
    this.support = this.lentOther ? 1 : Math.max(this.support, 1);
  }

  /** The call-in E calls this battle: Rosie's loan, else the equipped one (null: none). */
  get supportKind(): SupportId | null {
    return this.giftKind ?? (this.host.state.support.equipped as SupportId | null);
  }

  /** Rosie lent something other than the player's own equipped call-in. */
  private get lentOther(): boolean {
    return !!this.giftKind && this.giftKind !== this.host.state.support.equipped;
  }

  /** One call-in from this wave's charges, if there is one. */
  takeSupport(): boolean {
    if (this.phase !== 'wave' || this.support <= 0 || this.knocked > 0) return false;
    this.support--;
    this.supportCalls++;
    return true;
  }

  /** One grenade from this wave's belt, if there is one. */
  takeGrenade(): boolean {
    if (this.phase !== 'wave' || this.grenades <= 0 || this.knocked > 0) return false;
    this.grenades--;
    return true;
  }

  update(dt: number): void {
    const { sim } = this.host;
    this.timer -= dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.sinceHurt += dt;
    if (this.knocked > 0) {
      this.knocked -= dt;
      if (this.knocked <= 0) this.getUp();
    } else if (this.sinceHurt > HERO_BODY.regenDelay) {
      this.heroHp = Math.min(this.stats.health, this.heroHp + HERO_BODY.regenPerSecond * dt);
    }
    if (this.phase === 'ready') {
      if (this.timer <= 0) this.nextWave();
      return;
    }
    if (this.phase === 'wave') {
      this.director.update(dt);
      const { bannerAt } = GREYBOX;
      const pressure = sim.pressure(bannerAt.x, bannerAt.z, BANNER.ringRadius, drainOf);
      if (pressure > 0) {
        this.banner -= (pressure / 100) * dt;
        if (this.def.id === 1) this.banner = Math.max(BANNER.floorBattle1 / 100, this.banner);
        if (!this.warned) {
          this.warned = true;
          this.host.onEvent({ kind: 'atBanner' });
        }
      }
      if (this.banner <= 0) {
        this.banner = 0;
        this.lose();
        return;
      }
      if (this.director.done && this.director.left === 0) this.waveCleared();
      return;
    }
    if (this.phase === 'victory' && !this.resultShown && this.timer <= 0) {
      this.resultShown = true;
      this.host.onResult();
    }
    if (this.phase === 'defeat') {
      // A moment of slow motion as the banner tips, then the card (GDD §4.8).
      if (this.timer > DEFEAT_CARD_SECONDS - 1) this.timeScale = SLOW_MOTION;
      else this.timeScale = 1;
      if (!this.resultShown && this.timer <= 0) {
        this.resultShown = true;
        this.host.onResult();
      }
    }
  }

  private waveCleared(): void {
    const { state } = this.host;
    const bonus = waveBonus(this.def.id, this.wave + 1);
    state.gold += bonus;
    this.earned.waves += bonus;
    this.director.stop();
    this.host.onEvent({ kind: 'waveCleared', bonus });
    // The rift crate's gun goes back after its wave.
    if (this.loan) {
      const gun = this.loan;
      this.loan = null;
      this.equipHand();
      this.host.onEvent({ kind: 'loanOver', gun });
    }
    const last = !this.lastStand && this.wave >= this.def.waves.length - 1;
    if (this.lastStand) {
      // A Last Stand never ends in victory: each wave held counts, the shop opens every 3rd, else a short countdown.
      // Saved as each wave falls (quitting keeps it); "new best" is against the record when the run began.
      this.record = { best: recordLastStand(state, this.def.id, this.wave + 1).best, newBest: this.wave + 1 > this.startBest };
      this.banner = Math.min(this.bannerMax, this.banner + BANNER.healPerBreak / 100);
      if (lastStandShopAfter(this.wave + 1)) {
        this.phase = 'break';
        this.host.onPhase('break');
        if (lastStandBossWave(this.wave + 2)) this.host.onEvent({ kind: 'lastShop' });
      } else {
        this.phase = 'ready';
        this.timer = LAST_STAND.breakSeconds;
        this.host.onPhase('ready');
      }
    } else if (last) {
      this.victory = recordVictory(state, this.def.id, this.banner / this.bannerMax);
      this.earned.firstClear = this.victory.firstClear;
      this.host.sim.cheer(ALLY);
      this.phase = 'victory';
      this.timer = VICTORY_CARD_SECONDS;
      this.host.onPhase('victory');
    } else {
      // The banner mends a little at each break (GDD §4.5).
      this.banner = Math.min(this.bannerMax, this.banner + BANNER.healPerBreak / 100);
      this.phase = 'break';
      this.host.onPhase('break');
      if (bossWave(this.def) === this.wave + 1) this.host.onEvent({ kind: 'lastShop' });
    }
    this.host.save();
  }

  private lose(): void {
    if (this.lastStand) this.record = { best: recordLastStand(this.host.state, this.def.id, this.wave).best, newBest: this.wave > this.startBest };
    else recordDefeat(this.host.state, this.def.id);
    this.director.hold();
    this.phase = 'defeat';
    this.timer = DEFEAT_CARD_SECONDS;
    this.host.onPhase('defeat');
    this.host.save();
  }

  /** Back on his feet at the banner, full health and a moment's safety (GDD §4.6). */
  private getUp(): void {
    this.knocked = 0;
    this.heroHp = this.stats.health;
    this.invulnerable = HERO_BODY.getUpInvulnerable;
    this.host.onEvent({ kind: 'heroUp' });
  }

  /** Where the hero gets up: on the hill just behind the banner. */
  static getUpSpot(out: THREE.Vector3): THREE.Vector3 {
    return out.set(GREYBOX.bannerAt.x + 1.5, 0, GREYBOX.bannerAt.z + 3);
  }

  /** Label for the battle (map and toasts). */
  get title(): string {
    if (this.lastStand) return t('laststand.title', { name: battleName(this.def.id) });
    return t('battle.title', { n: this.def.id, name: battleName(this.def.id) });
  }

  /** The gun now in hand (a rift crate's loan first). */
  get gun(): GunId {
    return this.loan ?? ((this.host.state.hand[this.slot] ?? 'pistol') as GunId);
  }

  /** Gun data in hand, for the HUD. */
  get gunDef(): (typeof GUNS)[GunId] {
    return GUNS[this.gun];
  }
}
