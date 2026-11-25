import * as THREE from 'three';
import { t } from '@/content/strings';
import { GREYBOX } from '@/content/tuning';
import { ENEMY, type CrowdSim } from '@/crowd/crowdSim';
import type { GameState } from '@/state/gameState';
import type { BattleHud } from '@/ui/battleHud';
import type { Hud } from '@/ui/hud';
import type { Prompt, PromptSpec } from '@/ui/prompt';
import type { RosieBubble } from '@/ui/rosie';
import type { ShopPanel } from '@/ui/shopPanel';
import type { Markers } from '@/world/markers';
import type { AimAssist } from './aimAssist';
import type { Battle } from './battle';
import type { Coins } from './coins';
import type { Gun } from './gun';
import type { Hero } from './hero';

/** What onboarding needs from the game. The game owns all of these; onboarding only reads and nudges. */
export interface OnboardingHost {
  readonly state: GameState;
  readonly touch: boolean;
  readonly screen: 'battle' | 'map' | 'sandbox';
  readonly battle: Battle | null;
  readonly hero: Hero;
  readonly sim: CrowdSim;
  readonly aim: AimAssist;
  readonly gun: Gun;
  readonly coins: Coins;
  readonly hud: Hud;
  readonly battleHud: BattleHud;
  readonly prompt: Prompt;
  readonly rosie: RosieBubble;
  readonly markers: Markers;
  readonly shop: ShopPanel;
  /** Seconds since the player last looked; total degrees looked. */
  readonly look: { since: number; total: number };
  readonly buttons: { grenade: HTMLElement; gun: HTMLElement; next: HTMLElement; support: HTMLElement };
  /** The result card's primary button and the map's Fight button, when shown. */
  cardButton(): HTMLElement | null;
  fightButton(): HTMLElement | null;
  /** Reveals a touch button (the gun's ammo ring, grenades). */
  revealButton(name: 'gun' | 'grenade' | 'support', shown: boolean): void;
  showShopRing(shown: boolean): void;
  measure(category: string, what: string, action: string): void;
  save(): void;
}

/** Where the first step's gold ring glows: on the hill in front of the banner (onboarding §4, step 1). */
const RING = { x: 1.5, z: -7, radius: 2.2 } as const;
/** Stuck helpers (onboarding §1): the prompt pulses, then Rosie rephrases, then the world helps. */
const STUCK = { pulse: 6, rosie: 12, world: 20 } as const;
/** The next prompt waits at least this long after one completes (onboarding §2). */
const GAP = 0.8;

type B1Step =
  | 'move'
  | 'aim'
  | 'shoot'
  | 'gold'
  | 'mob'
  | 'truck'
  | 'buy'
  | 'nextwave'
  | 'wave2'
  | 'break2'
  | 'captain'
  | 'victory'
  | 'map'
  | 'done';

/** Measured steps, in funnel order (onboarding §7). */
export const MEASURED: readonly string[] = ['move', 'aim', 'shoot', 'gold', 'mob', 'truck', 'buy', 'nextwave', 'captain', 'map'];

const tmp = new THREE.Vector3();

/**
 * Onboarding (docs/onboarding.md): Battle 1's step-by-step script for a new player, then one lesson at a time in
 * Battles 2–4, and the controls again once on a new kind of device. Every step ends when the player does the thing,
 * shows a key picture or a hand plus at most four words, and gets help when the player is stuck: the prompt pulses at
 * 6 s, Rosie rephrases at 12 s, the world helps at 20 s. Each lesson is saved as seen and measured for Poki's funnel.
 */
export class Onboarding {
  /** The Battle 1 step, or `done` (null when Battle 1's script isn't running). */
  step: B1Step | null = null;
  private stepTime = 0;
  private gap = 0;
  private onTarget = 0;
  private scout = -1;
  private captain = -1;
  private quietTime = 0;
  /** Rosie has rephrased this step already. */
  private rosieSaid = false;
  /** The lesson running in later battles, if any. */
  private lesson: string | null = null;
  private lessonTime = 0;
  private lessonStart = { x: 0, z: 0, look: 0 };
  /** Call-ins made before the current lesson began (the Sentry lesson ends on the next one). */
  private callsAtStart = 0;

  constructor(private readonly host: OnboardingHost) {}

  /** True while Battle 1's script runs (the battle and the HUD follow it). */
  get scripted(): boolean {
    return this.step !== null && this.step !== 'done';
  }

  private seen(id: string): boolean {
    return this.host.state.seenLessons.includes(id);
  }

  private markSeen(id: string): void {
    if (!this.seen(id)) this.host.state.seenLessons.push(id);
  }

  private get device(): string {
    return this.host.touch ? 'touch' : 'desktop';
  }

  /** A battle begins. Battle 1 for a new player starts the script; other battles get their lessons. */
  battleStarted(battleId: number): void {
    const h = this.host;
    this.lesson = null;
    // Fight! on the first map view finishes Battle 1's script (onboarding §4, step 13).
    if (this.step === 'map') this.go('done');
    if (battleId === 1 && !this.seen('b1')) {
      this.step = null;
      this.go('move');
      // The HUD starts nearly empty and grows as it's needed (onboarding §3).
      for (const part of ['gold', 'banner', 'wave', 'health', 'next'] as const) h.battleHud.reveal(part, false);
      h.hud.showCrosshair(false);
      h.revealButton('gun', false);
      h.rosie.say(t('rosie.peasants'));
    } else {
      if (this.step !== 'done') this.step = null;
      h.prompt.show(null, h.touch);
      h.rosie.hush();
      for (const part of ['gold', 'banner', 'wave', 'health', 'next'] as const) h.battleHud.reveal(part, true);
      h.revealButton('gun', true);
    }
  }

  /** Leaving a battle (map, retry): clears prompts and markers; Battle 1's map step survives the trip to the map. */
  battleEnded(): void {
    const h = this.host;
    h.prompt.show(null, h.touch);
    h.markers.setGoal(null);
    h.markers.setTrail(null);
    h.hud.setDiamond(null);
    h.battleHud.setObjective(null);
    if (this.step && this.step !== 'victory' && this.step !== 'map' && this.step !== 'done') this.step = null;
    this.lesson = null;
  }

  /** The first map view after Battle 1 (onboarding §4, step 13). */
  mapShown(): void {
    if (this.step === 'victory') this.go('map');
  }

  update(dt: number): void {
    const h = this.host;
    // Dev scenes teach nothing.
    if (h.screen === 'sandbox') return;
    this.gap = Math.max(0, this.gap - dt);
    if (this.scripted) this.updateScript(dt);
    else if (h.screen === 'battle' && h.battle) this.updateLessons(dt);
    h.prompt.place();
  }

  // ---- Battle 1 ------------------------------------------------------------------------------------------------

  private go(step: B1Step): void {
    const h = this.host;
    const previous = this.step;
    if (previous && MEASURED.includes(previous)) h.measure('tutorial', previous, 'complete');
    if (previous && previous !== step) {
      h.prompt.show(null, h.touch);
      this.gap = GAP;
    }
    this.step = step;
    this.stepTime = 0;
    this.onTarget = 0;
    this.quietTime = 0;
    this.rosieSaid = false;
    h.markers.setTrail(null);
    if (MEASURED.includes(step)) h.measure('tutorial', step, 'start');
    this.enter(step);
    h.save();
  }

  private enter(step: B1Step): void {
    const h = this.host;
    const battle = h.battle;
    switch (step) {
      case 'move':
        h.markers.setGoal(RING);
        break;
      case 'aim': {
        h.markers.setGoal(null);
        h.hud.showCrosshair(true);
        this.markSeen(`move:${this.device}`);
        // The scout steps out 15 m away, about 35° to the side of the view (onboarding §4, step 2).
        const yaw = Math.atan2(-(GREYBOX.bannerAt.x - h.hero.position.x), -(GREYBOX.bannerAt.z - h.hero.position.z));
        const side = yaw - 0.61;
        let x = h.hero.position.x - Math.sin(side) * 15;
        let z = h.hero.position.z - Math.cos(side) * 15;
        z = Math.max(z, GREYBOX.bannerAt.z - 6);
        x = Math.max(-40, Math.min(40, x));
        battle?.releaseCue('scout', { x, z });
        break;
      }
      case 'gold':
        this.markSeen(`aim:${this.device}`);
        break;
      case 'mob':
        h.battleHud.reveal('banner', true);
        h.battleHud.reveal('wave', true);
        h.battleHud.setObjective(t('objective.banner'));
        battle?.releaseCue('mob');
        break;
      case 'truck':
        h.battleHud.setObjective(null);
        h.rosie.say(t('rosie.bringGold'));
        break;
      case 'buy':
        h.shop.only(['gun:pistol']);
        break;
      case 'nextwave':
        h.shop.only(null);
        h.battleHud.reveal('next', true);
        h.battleHud.showNext(true);
        break;
      case 'wave2':
        h.battleHud.reveal('health', true);
        break;
      case 'captain':
        break;
      case 'victory':
        h.hud.setDiamond(null);
        break;
      case 'map':
        break;
      case 'done':
        this.markSeen('b1');
        h.prompt.show(null, h.touch);
        break;
    }
  }

  private updateScript(dt: number): void {
    const h = this.host;
    const battle = h.battle;
    this.stepTime += dt;
    const s = this.step!;
    let spec: PromptSpec | null = null;
    switch (s) {
      case 'move': {
        spec = { keys: ['mouse-left', 'W', 'A', 'S', 'D'], hand: 'drag-left', text: t('move') };
        const d = Math.hypot(h.hero.position.x - RING.x, h.hero.position.z - RING.z);
        this.stuck(t('rosie.upHill'), () => h.markers.setTrail({ fromX: h.hero.position.x, fromZ: h.hero.position.z, toX: RING.x, toZ: RING.z }), STUCK);
        if (d < RING.radius) this.go('aim');
        break;
      }
      case 'aim': {
        this.findScout();
        spec = { keys: ['mouse-move'], hand: 'drag-right', text: t('aim') };
        const scoutUp = this.scout >= 0 && h.sim.bodies.alive[this.scout] === 1;
        if (this.scout >= 0) h.hud.setDiamond(scoutUp ? this.top(this.scout) : null, this.stepTime > STUCK.pulse);
        const onScout = scoutUp && h.aim.target === this.scout && h.aim.onBody;
        this.onTarget = onScout ? this.onTarget + dt : 0;
        const hit = this.scout >= 0 && h.sim.bodies.hp[this.scout]! < h.sim.bodies.maxHp[this.scout]!;
        this.stuck(null, null, STUCK);
        // A computer player who fires before the Shoot prompt has done both: Shoot completes at once. Down already
        // without a shot of ours (the militia got him): straight to the gold. Touch: aiming is done when auto-fire hits.
        const shotHim = !h.touch && this.scout >= 0 && h.gun.sinceShot < 1 && (hit || !scoutUp);
        if (shotHim) this.go('shoot');
        else if (this.scout >= 0 && !scoutUp) this.go('gold');
        else if (h.touch ? hit : this.onTarget >= 0.2) this.go(h.touch ? 'gold' : 'shoot');
        break;
      }
      case 'shoot': {
        spec = { keys: ['mouse-left'], text: t('shoot') };
        const scoutUp = this.scout >= 0 && h.sim.bodies.alive[this.scout] === 1;
        if (scoutUp) h.hud.setDiamond(this.top(this.scout));
        this.stuck(null, null, STUCK);
        const hit = this.scout < 0 || !scoutUp || h.sim.bodies.hp[this.scout]! < h.sim.bodies.maxHp[this.scout]!;
        if (hit) this.go('gold');
        break;
      }
      case 'gold': {
        // The scout tumbles; his coins fly in and the gold counter appears (no prompt).
        const scoutUp = this.scout >= 0 && h.sim.bodies.alive[this.scout] === 1;
        h.hud.setDiamond(scoutUp ? this.top(this.scout) : null);
        if (!scoutUp && this.stepTime > 0.3) {
          h.coins.collectAll();
          if (h.coins.pending === 0) {
            h.battleHud.reveal('gold', true);
            h.rosie.say(t('rosie.gold'));
            this.go('mob');
          }
        }
        break;
      }
      case 'mob': {
        // 8 s without a shot: the aim prompt comes back.
        this.quietTime = h.gun.sinceShot > 8 && h.sim.standing(ENEMY) > 0 ? this.quietTime + dt : 0;
        if (this.quietTime > 0) spec = { keys: ['mouse-move', 'mouse-left'], hand: 'drag-right', text: t('aim') };
        if (battle?.phase === 'break') this.go('truck');
        break;
      }
      case 'truck': {
        spec = { text: t('goTruck') };
        const { shopSpot } = GREYBOX;
        // 10 s: footprints to the truck; 20 s: Rosie (onboarding §4, step 6).
        this.stuck(t('rosie.overHere'), () => h.markers.setTrail({ fromX: h.hero.position.x, fromZ: h.hero.position.z, toX: shopSpot.x, toZ: shopSpot.z }), { pulse: 6, rosie: 20, world: 10 });
        if (h.shop.isOpen) this.go('buy');
        break;
      }
      case 'buy': {
        const button = h.shop.buttonFor('gun:pistol');
        spec = { keys: ['mouse-left'], hand: 'tap', target: button ?? undefined, text: t('buy') };
        this.stuck(null, null, { pulse: 8, rosie: 99, world: 99 });
        if ((h.state.guns.pistol ?? 1) >= 2) this.go('nextwave');
        else if (!h.shop.isOpen) this.go('truck');
        break;
      }
      case 'nextwave': {
        spec = { keys: ['mouse-left', 'Enter'], hand: 'tap', target: h.buttons.next, text: t('nextWave') };
        this.stuck(t('rosie.ready'), null, { pulse: 10, rosie: 20, world: 99 });
        if (battle?.phase === 'wave') this.go('wave2');
        break;
      }
      case 'wave2':
        if (battle?.phase === 'break') this.go('break2');
        break;
      case 'break2':
        if (battle?.phase === 'wave') this.go('captain');
        break;
      case 'captain': {
        this.findCaptain();
        const up = this.captain >= 0 && h.sim.bodies.alive[this.captain] === 1;
        if (up) {
          // 10 s with the captain on screen and not hit: the diamond pulses (onboarding §4, step 11).
          const hurt = h.sim.bodies.hp[this.captain]! < h.sim.bodies.maxHp[this.captain]!;
          h.hud.setDiamond(this.top(this.captain), !hurt && this.stepTime > 10);
          if (this.stepTime > 1.5) spec = { text: t('downCaptain') };
        }
        if (this.captain >= 0 && !up) {
          h.hud.setDiamond(null);
          h.rosie.say(t('rosie.run'));
          this.go('victory');
        } else if (battle?.phase === 'victory') {
          this.go('victory');
        }
        break;
      }
      case 'victory': {
        const button = h.cardButton();
        if (button) spec = { keys: ['mouse-left'], hand: 'tap', target: button, text: t('continue') };
        break;
      }
      case 'map': {
        const button = h.fightButton();
        if (button) spec = { keys: ['mouse-left'], hand: 'tap', target: button, text: t('map.fight') };
        if (h.screen === 'battle') this.go('done');
        break;
      }
      case 'done':
        break;
    }
    h.prompt.show(this.gap > 0 ? null : spec, h.touch);
  }

  /** Stuck helpers for the current step, at the step's own times: the prompt pulses, Rosie rephrases once, the world helps. */
  private stuck(line: string | null, world: (() => void) | null, at: { pulse: number; rosie: number; world: number }): void {
    const h = this.host;
    const time = this.stepTime;
    h.prompt.urgent(time > at.pulse);
    if (line && !this.rosieSaid && time > at.rosie) {
      this.rosieSaid = true;
      h.rosie.say(line);
    }
    if (world && time > at.world) world();
  }

  /** The point above a soldier's head, for the diamond. */
  private top(i: number): THREE.Vector3 {
    const b = this.host.sim.bodies;
    return tmp.set(b.x[i]!, b.y[i]! + b.height[i]! + 0.5, b.z[i]!).clone();
  }

  private findScout(): void {
    if (this.scout >= 0) return;
    const b = this.host.sim.bodies;
    for (let i = 0; i < b.count; i++) if (b.alive[i]) this.scout = i;
  }

  private findCaptain(): void {
    if (this.captain >= 0 && this.host.sim.bodies.alive[this.captain]) return;
    const b = this.host.sim.bodies;
    for (let i = 0; i < b.count; i++) {
      if (b.alive[i] && b.role[i] === 2) {
        this.captain = i;
        return;
      }
    }
  }

  // ---- Later battles: one lesson at a time (onboarding §5, §6) --------------------------------------------------

  private updateLessons(dt: number): void {
    const h = this.host;
    const battle = h.battle!;
    if (!this.lesson) this.pickLesson(battle);
    const id = this.lesson;
    if (!id) {
      h.prompt.show(null, h.touch);
      return;
    }
    this.lessonTime += dt;
    let spec: PromptSpec | null = null;
    let done = false;
    switch (id) {
      case 'move': {
        spec = { keys: ['W', 'A', 'S', 'D'], hand: 'drag-left', text: t('move') };
        done = Math.hypot(h.hero.position.x - this.lessonStart.x, h.hero.position.z - this.lessonStart.z) > 3;
        break;
      }
      case 'aim':
        spec = { keys: ['mouse-move'], hand: 'drag-right', text: t('aim') };
        done = h.look.total - this.lessonStart.look > 25;
        break;
      case 'grenade': {
        // Taught when the first dense block is within 25 m (onboarding §5).
        if (battle.phase === 'wave' && battle.grenades > 0 && this.blockNear(25)) {
          spec = { keys: ['G'], hand: 'tap', target: h.buttons.grenade, text: t('grenade') };
        }
        done = battle.grenades < battle.stats.grenades;
        break;
      }
      case 'army':
        done = h.shop.isOpen && h.shop.tab === 'army';
        break;
      case 'boss':
        // The boss's first glowing wind-up (onboarding §5, Battle 5): get out of the lane.
        spec = { keys: ['W', 'A', 'S', 'D'], hand: 'drag-left', text: t('stepAside') };
        done = !h.sim.charging;
        break;
      case 'hero':
        done = h.shop.isOpen && h.shop.tab === 'hero';
        break;
      case 'sentry':
        // Battle 13 (onboarding §5): Rosie lends her Sentry Gun; call it once.
        if (battle.phase === 'wave' && battle.support > 0) {
          spec = { keys: ['E'], hand: 'tap', target: h.buttons.support, text: t('sentryGun') };
        }
        done = battle.supportCalls > this.callsAtStart;
        break;
      case 'support':
        // Battle 8 (onboarding §5): a free charge; taught when a big block is within 30 m.
        if (battle.phase === 'wave' && battle.support > 0 && this.blockNear(30)) {
          spec = { keys: ['E'], hand: 'tap', target: h.buttons.support, text: t('riftStrike') };
        }
        done = battle.supportCalls > 0;
        break;
      case 'swap':
        // Battle 6 (onboarding §5): two guns in hand; swap once.
        if (battle.phase === 'wave') spec = { keys: ['X'], hand: 'tap', target: h.buttons.gun, text: t('swapGuns') };
        done = battle.swaps > 0;
        break;
    }
    h.prompt.urgent(!!spec && this.lessonTime > STUCK.pulse);
    h.prompt.show(this.gap > 0 ? null : spec, h.touch);
    if (done) {
      h.measure('tutorial', id, 'complete');
      this.markSeen(id === 'move' || id === 'aim' || id === 'grenade' || id === 'swap' || id === 'support' ? `${id}:${this.device}` : id);
      this.lesson = null;
      this.gap = GAP;
      h.prompt.show(null, h.touch);
      h.save();
    }
  }

  /** The next lesson this battle needs, if any. */
  private pickLesson(battle: Battle): void {
    const h = this.host;
    const device = this.device;
    let next: string | null = null;
    // A player who learned on a laptop gets the touch Move and Aim hints once (onboarding §6), and the other way round.
    if (this.seen('b1') && !this.seen(`move:${device}`)) next = 'move';
    else if (this.seen('b1') && !this.seen(`aim:${device}`)) next = 'aim';
    else if (battle.stats.grenades > 0 && !this.seen(`grenade:${device}`) && battle.phase === 'wave') next = 'grenade';
    else if (battle.phase === 'wave' && h.sim.windingUp() >= 0 && !this.seen('boss')) next = 'boss';
    else if (battle.reached >= 2 && battle.phase === 'break' && !this.seen('army')) next = 'army';
    else if (battle.reached >= 3 && battle.phase === 'break' && !this.seen('hero')) next = 'hero';
    else if (battle.phase === 'wave' && battle.canSwap && !this.seen(`swap:${device}`)) next = 'swap';
    else if (battle.reached >= 8 && battle.phase === 'wave' && !this.seen(`support:${device}`)) next = 'support';
    else if (battle.def.id >= 13 && battle.phase === 'wave' && battle.wave >= 1 && !this.seen('sentry')) next = 'sentry';
    if (!next) return;
    this.lesson = next;
    this.lessonTime = 0;
    this.lessonStart = { x: h.hero.position.x, z: h.hero.position.z, look: h.look.total };
    h.measure('tutorial', next, 'start');
    if (next === 'grenade') h.rosie.say(t('rosie.catch'));
    if (next === 'army') h.rosie.say(t('rosie.help'));
    if (next === 'hero') h.rosie.say(t('rosie.hero'));
    this.callsAtStart = battle.supportCalls;
    if (next === 'sentry') {
      // Rosie's own Sentry Gun, lent for this battle unless it's already the player's.
      if (h.state.support.equipped !== 'sentryGun') battle.giftSupport('sentryGun');
      h.rosie.say(t('rosie.sentry'));
      h.revealButton('support', true);
    }
    if (next === 'support') {
      // On the house: one charge a wave this battle, until it's in the shop.
      if (!battle.supportOn) {
        battle.giftSupport();
        h.rosie.say(t('rosie.free'));
      }
      h.revealButton('support', true);
    }
    if (next === 'swap') {
      h.rosie.say(t('rosie.swap'));
      h.revealButton('gun', true);
    }
  }

  /** A block of six or more enemies close together within `range` of the hero. */
  private blockNear(range: number): boolean {
    const h = this.host;
    const b = h.sim.bodies;
    const p = h.hero.position;
    for (let i = 0; i < b.count; i++) {
      if (!b.alive[i] || Math.hypot(b.x[i]! - p.x, b.z[i]! - p.z) > range) continue;
      let n = 0;
      for (let j = 0; j < b.count; j++) if (b.alive[j] && Math.hypot(b.x[j]! - b.x[i]!, b.z[j]! - b.z[i]!) < 3) n++;
      if (n >= 6) return true;
    }
    return false;
  }
}
