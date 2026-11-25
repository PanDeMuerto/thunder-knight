import * as THREE from 'three';
import { ADS } from '@/content/ads';
import { COIN_COMBO, DISTANCE, type MusicName } from '@/content/audio';
import { battle, bossWave } from '@/content/battles';
import { GUNS, type GunId } from '@/content/guns';
import { SCENES, type SceneName } from '@/content/scenarios';
import { currentLanguage, isStringKey, setLanguage, SUPPORTED_LANGUAGES, t } from '@/content/strings';
import { CAMERA, GREYBOX, HERO, HIT_STOP } from '@/content/tuning';
import { BANNER } from '@/content/economy';
import { angleDelta, DEG, damp } from '@/core/math';
import { GameAudio } from '@/audio/audio';
import { Crowd } from '@/crowd/crowd';
import { Input } from '@/input/input';
import type { PlatformSession } from '@/platform/platformSession';
import { CameraRig } from '@/render/cameraRig';
import { Effects, PUFFS } from '@/render/effects';
import { ICONS } from '@/ui/icons';
import { renderGunIcons } from '@/render/gunIcons';
import { Stage } from '@/render/stage';
import type { SaveStore, Settings } from '@/save/saveStore';
import { commercialAllowed, crateDue, crateGun, doubleGoldBonus } from '@/state/ads';
import { newGameState, type GameState } from '@/state/gameState';
import { isNewPlayer, reachedBattle } from '@/state/progress';
import { act } from '@/state/shop';
import { BattleHud } from '@/ui/battleHud';
import { EdgeArrows } from '@/ui/edgeArrows';
import { Prompt } from '@/ui/prompt';
import { RosieBubble } from '@/ui/rosie';
import { Hud } from '@/ui/hud';
import { MapScreen } from '@/ui/mapScreen';
import { relabel } from '@/ui/dom';
import { OfferCard } from '@/ui/offerCard';
import { PauseMenu } from '@/ui/pauseMenu';
import { ResultCard } from '@/ui/resultCard';
import type { RewardOffer, RewardPlacement } from '@/ui/rewardButton';
import { ShopPanel } from '@/ui/shopPanel';
import { TouchControls } from '@/ui/touchControls';
import { Field } from '@/world/field';
import { FieldKit } from '@/world/fieldKit';
import { type LaneSpec, Markers } from '@/world/markers';
import { RamModel } from '@/world/ramModel';
import { Boulders, CatapultModel } from '@/world/catapult';
import { SiegeTowerModel } from '@/world/siegeTowerModel';
import { IronOxModel } from '@/world/ironOxModel';
import { DeliveryCrates } from '@/world/deliveryCrate';
import { RiftStrike } from '@/world/riftStrike';
import { loadOx, WarWagonModel } from '@/world/warWagonModel';
import { RIFT_STRIKE, SENTRY, type SupportId } from '@/content/support';
import { SentryGuns } from './sentry';
import { RiftCrate } from '@/world/riftCrate';
import { loadRosie, RosieFigure } from '@/world/rosieFigure';
import { AdaFigure, loadAda } from '@/world/adaFigure';
import { DonkeyEscape, loadDonkey } from '@/world/donkeyEscape';
import { EndingDialogue } from '@/ui/endingDialogue';
import { LAST_STAND } from '@/content/lastStand';
import { lastStandUnlocked } from '@/state/lastStand';
import { EndingScene } from './ending';
import { Haptics } from '@/input/haptics';
import type { FieldKit as FieldKitType } from '@/world/fieldKit';
import { loadHeroAssets } from './heroModel';
import { ALLY, ENEMY, TYPES } from '@/crowd/crowdSim';
import { CROWD, SOLDIERS } from '@/content/soldiers';
import { Battle, type BattleEvent, type Phase } from './battle';
import { Coins } from './coins';
import { Combat } from './combat';
import { Grenades } from './grenades';
import { Hero } from './hero';
import { Onboarding } from './onboarding';
import { nameplate, planReveal, RevealShot } from './reveal';

declare const __PLATFORM__: 'poki' | 'web' | 'dev';

/** `play`: the hero is controllable. `paused`: the pause card. `busy`: an ad is running. */
export type Mode = 'play' | 'paused' | 'busy';
/** Where the player is: a battle, the campaign map, or a dev scene (`?scene=`). */
export type Screen = 'battle' | 'map' | 'sandbox';

/** Seconds between autosaves while playing. */
const AUTOSAVE_SECONDS = 15;

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
/** Which crowd types carry a health bar over them, by type index (the Brute, the ram). */
const HEALTH_BAR = TYPES.map((type) => !!SOLDIERS[type].healthBar);
/** Seconds between a battering ram's thuds at the banner. */
const RAM_THUD = 1.3;

/**
 * Owns the frame, the screens and the game's modes (tech design §4): the map, battles (`Battle`), the field, the
 * hero, the over-the-shoulder rig, shooting (`Combat`), the armies (`Crowd`), coins and grenades, the shop, the
 * cards, pause, saves and Poki's events. Poki's gameplay start and stop follow one rule (`syncGameplay`): gameplay is
 * on while a wave (or its countdown) runs in play mode, after the first input; breaks, the map and cards are off.
 */
export class Game {
  readonly stage: Stage;
  readonly input: Input;
  readonly audio = new GameAudio();
  readonly field = new Field();
  readonly hero: Hero;
  readonly rig: CameraRig;
  readonly effects: Effects;
  /** The armies; loaded in `load`. */
  crowd!: Crowd;
  readonly combat: Combat;
  readonly coins: Coins;
  readonly grenades: Grenades;
  readonly hud: Hud;
  readonly battleHud: BattleHud;
  readonly touch: TouchControls;
  readonly shop: ShopPanel;
  readonly result: ResultCard;
  readonly offer: OfferCard;
  readonly crate: RiftCrate;
  readonly map: MapScreen;
  readonly prompt: Prompt;
  readonly rosie: RosieBubble;
  /** Rosie herself by the truck (once her model has loaded). */
  private rosieFigure: RosieFigure | null = null;
  /** Gun silhouettes rendered from the models, by gun id (`renderGunIcons`). */
  private gunArt: Partial<Record<GunId, string>> = {};
  readonly markers: Markers;
  readonly onboarding: Onboarding;
  private readonly edges: EdgeArrows;
  private readonly reveal = new RevealShot();
  /** Presses counted when the reveal began: any press after skips it. */
  private revealPresses = 0;
  private wasRevealing = false;
  /** Seconds of real time left in a hit-stop (game time nearly freezes; M8). */
  private hitStop = 0;
  /** Real seconds since boot, for the coin combo. */
  private clock = 0;
  private lastCoin = -10;
  private coinCombo = 0;
  /** Purchases arriving as crates beside Rosie. */
  private readonly deliveries: DeliveryCrates;
  /** The Rift Strike call-in (GDD §8.3). */
  private readonly strike: RiftStrike;
  /** Sentry Guns standing (GDD §8.3), and which call-in the support button shows. */
  private readonly sentries: SentryGuns;
  private supportIcon: SupportId | null = 'riftStrike';
  /** The War Wagon's model (Battle 10's boss), once its oxen have loaded; and where it was last frame. */
  private wagonModel: WarWagonModel | null = null;
  private wagonLast: { x: number; z: number } | null = null;
  /** The Iron Ox (Battle 20's boss), made when it first appears, and which body it draws. */
  private ox: { model: IronOxModel; body: number } | null = null;
  /** The Baron's donkey (M10), fetched once an Iron Ox is on the field; the victory card waits for his escape. */
  private escape: DonkeyEscape | null = null;
  private escapeLoading = false;
  private resultWaiting = false;
  /** Battle 20's ending (M10): Queen Ada is fetched when the battle starts, the first time it can end the story. */
  private ending: EndingScene | null = null;
  private endingLoading = false;
  private readonly endingUi: EndingDialogue;
  /** Short vibrations on a phone (M11), when Vibration is on. */
  private readonly haptics = new Haptics();
  /** The tab is hidden: the sound is held off until it's back (M11). */
  private hiddenSilenced = false;
  /** The field kit (its later regions' pieces arrive with `later`). */
  private fieldKit: FieldKitType | null = null;
  /**
   * The later regions' download (M11): their field pieces, the riders' horse, the War Wagon's oxen. A returning player
   * past Region 1 gets it once the first screen is up; a new player at the first map (nothing during Battle 1's
   * lessons). A battle from Region 2 on waits for it (`playBattle`).
   */
  private later: Promise<void> | null = null;
  private laterDone = false;
  private readonly groundAt = (x: number, z: number): number => this.field.heightAt(x, z);
  private readonly hoofDust = (at: THREE.Vector3): void => this.effects.puff(at, PUFFS.hoof);
  /** The Siege Tower (Battle 15's boss), made when it first appears: which body it draws, where it was. */
  private tower: { model: SiegeTowerModel; body: number; last: { x: number; z: number } | null } | null = null;
  /** Catapults on the field (Battle 14), made as they first appear, and the boulders in the air. */
  private readonly catapults: { model: CatapultModel; body: number; last: { x: number; z: number } | null; fallen: boolean }[] = [];
  private readonly boulders = new Boulders();
  /** Battering rams on the field (Battle 12), made as they first appear: which body each draws, where it was. */
  private readonly rams: { model: RamModel; body: number; last: { x: number; z: number } | null; fallen: boolean; thud: number }[] = [];
  /** Where champions' health bars go this frame (GDD §9.1). */
  private readonly championSpots = Array.from({ length: 3 }, () => ({ at: new THREE.Vector3(), fraction: 1 }));
  private readonly pause: PauseMenu;
  state: GameState = newGameState();
  settings: Settings;
  mode: Mode = 'play';
  screen: Screen = 'battle';
  battle: Battle | null = null;
  /** The mode to go back to when an ad ends. */
  private modeBeforeAd: Mode = 'play';
  /** True once the player has given the first deliberate input (Poki's gameplayStart). */
  started = false;
  private last = 0;
  private sinceSave = 0;
  private heroOpacity = 1;
  /** Closed with ✕ while standing in the shop's ring: don't reopen until the hero steps out. */
  private shopDismissed = false;
  /** The shop opened from the map rather than the truck. */
  private shopFromMap = false;
  private defeatTip = 0;
  private lastReload = 0;
  private lastPhase: Phase | null = null;
  /** This battle's rift crate (GDD §12.3): planned at the start, dropped in the first break, then done. */
  private crateState: 'none' | 'planned' | 'dropped' | 'done' = 'none';
  private crateLoan: GunId | null = null;
  /** A rewarded ad played in this break or on this card: the next interstitial is skipped (GDD §16). */
  private rewardedHere = false;
  /** An ad was asked for and hasn't finished: presses on Next wave and the cards wait. */
  private adPending = false;
  /** Dev link `?boss=2`: the boss starts in his second phase. */
  private devBossPhase = __PLATFORM__ === 'dev' && new URLSearchParams(location.search).get('boss') === '2';

  constructor(
    private readonly session: PlatformSession,
    private readonly store: SaveStore,
    root: HTMLElement,
  ) {
    const canvas = root.querySelector<HTMLCanvasElement>('#view')!;
    const ui = root.querySelector<HTMLElement>('#ui')!;
    const surface = root.querySelector<HTMLElement>('#touch-surface')!;
    this.stage = new Stage(canvas, root);
    this.hud = new Hud(ui);
    this.touch = new TouchControls(ui);
    this.battleHud = new BattleHud(ui, this.touch.buttons.grenade, this.touch.buttons.support, () => void this.requestNextWave());
    this.pause = new PauseMenu(ui, {
      onResume: () => this.resume(),
      onRetreat: () => this.retreat(),
      onSettings: (settings) => this.setSettings(settings),
    });
    this.shop = new ShopPanel(
      ui,
      (id) => this.buy(id),
      () => this.closeShop(true),
    );
    this.shop.onToggle = (open) => this.frameForShop(open);
    this.result = new ResultCard(ui);
    this.offer = new OfferCard(ui);
    this.map = new MapScreen(
      ui,
      (id) => this.playBattle(id),
      () => this.openShopFromMap(),
      (id) => this.playBattle(id, 1, 'lastStand'),
    );
    this.input = new Input(surface, this.touch.buttons, {
      onFirstInput: () => this.onFirstInput(),
      onPause: () => this.openPause(),
      onEscape: () => {
        if (this.mode === 'paused') this.pause.back();
        else if (this.ending?.speaking) this.ending.skip();
        else if (this.offer.open) this.closeCrate();
        else if (this.shop.isOpen) this.closeShop(true);
      },
      onDeviceChange: (touch) => {
        this.touch.setTouch(touch);
        this.combat.configure(touch, this.settings);
        this.haptics.enabled = this.settings.vibration && touch;
      },
    });
    this.touch.setTouch(this.input.isTouch);
    this.edges = new EdgeArrows(ui);
    this.rosie = new RosieBubble(ui);
    this.endingUi = new EndingDialogue(
      ui,
      () => this.ending?.press(),
      () => this.ending?.skip(),
    );
    this.prompt = new Prompt(ui);
    this.markers = new Markers((x, z) => this.field.heightAt(x, z));
    this.hero = new Hero(this.field);
    this.rig = new CameraRig(this.stage.camera, this.field);
    this.effects = new Effects(this.field);
    this.coins = new Coins((x, z) => this.field.heightAt(x, z));
    this.grenades = new Grenades((x, z) => this.field.heightAt(x, z));
    this.crate = new RiftCrate((x, z) => this.field.heightAt(x, z));
    this.crate.onLand = (at) => {
      this.effects.puff(tmpA.copy(at).setY(at.y + 0.2), PUFFS.knock);
      this.audio.play('crate');
      this.rosie.say(t('rosie.crate'));
    };
    this.strike = new RiftStrike((x, z) => this.field.heightAt(x, z));
    this.strike.onShell = (at) => this.strikeShell(at);
    this.sentries = new SentryGuns(
      (x, z) => this.field.heightAt(x, z),
      (ax, ay, az, bx, by, bz) => this.field.clear(ax, ay, az, bx, by, bz),
    );
    this.sentries.onLand = (at) => {
      this.effects.puff(tmpA.copy(at).setY(at.y + 0.2), PUFFS.knock);
      this.audio.play('crate', { gain: Math.max(0.5, this.near(at.x, at.z)) });
      this.rig.kick(0.3, 0.2, 0.2);
    };
    this.sentries.onShot = (from, to, hit, _knocked, armoured, blocked) => {
      this.effects.tracer(from, to);
      if (hit || blocked) this.effects.puff(to, armoured || blocked ? PUFFS.spark : PUFFS.hit);
      this.audio.play('smg', { gain: 0.75 * this.near(from.x, from.z), rate: 1.2 + Math.random() * 0.08 });
    };
    this.sentries.onFold = (at) => this.effects.puff(tmpA.copy(at).setY(at.y + 0.3), PUFFS.knock);
    this.deliveries = new DeliveryCrates((x, z) => this.field.heightAt(x, z));
    this.deliveries.onSpawn = (at) => this.effects.puff(tmpA.copy(at).setY(at.y + 0.4), PUFFS.spark);
    this.deliveries.onLand = (at) => {
      this.effects.puff(tmpA.copy(at).setY(at.y + 0.1), PUFFS.knock);
      this.audio.play('crate', { gain: 0.7, rate: 1.15 });
    };
    // Every button in the menus, cards and shop clicks softly; the battle's own buttons (fire, grenade) don't.
    ui.addEventListener(
      'click',
      (e) => {
        const target = e.target instanceof Element ? e.target : null;
        if (target?.closest('button') && !target.closest('.action-pad')) this.audio.play('click');
      },
      true,
    );
    this.hud.attachAmmo(this.touch.buttons.gun);
    this.touch.reveal('gun', true);
    this.combat = new Combat(this.stage.camera, this.rig, this.hero, this.field, this.effects, this.hud, this.audio);
    // Battle 9's armour tip (onboarding §5): the first light-gun hit on armour, once.
    // The grenade launcher's rounds fly with the grenades and burst where they land (on the ground under the hit).
    this.combat.onLaunch = (from, to, damage, radius, def) => {
      tmpB.copy(to);
      // A lobbed round bursts on the ground under its mark; a rocket where it strikes.
      if (!def.rocket) tmpB.y = this.field.heightAt(to.x, to.z);
      this.grenades.launch(from, tmpB, damage, radius, !!def.rocket, def.siegeBonus ?? 1);
    };
    this.grenades.onTrail = (at) => this.effects.puff(at, PUFFS.smoke);
    this.combat.onLightOnArmour = () => {
      if (this.state.seenLessons.includes('armour')) return;
      this.state.seenLessons.push('armour');
      this.rosie.say(t('rosie.armour'));
    };
    this.stage.scene.add(this.field.group, this.hero.group, this.effects.group, this.coins.mesh, this.grenades.group, this.markers.group, this.crate.group, this.deliveries.group, this.strike.group, this.sentries.group, this.boulders.group);
    this.stage.onResize = (portrait) => {
      this.input.portrait = portrait;
      this.effects.setViewport(this.stage.renderer.domElement.height, this.stage.camera.fov);
      if (this.map.open) this.map.refresh(portrait);
      if (this.shop.isOpen) this.frameForShop(true);
      this.battleHud.fit();
    };
    this.input.portrait = this.stage.portrait;
    this.effects.setViewport(this.stage.renderer.domElement.height, this.stage.camera.fov);
    this.settings = store.loadSettings();
    this.applySettings();
    this.coins.onCollect = (value) => {
      this.battle?.collect(value);
      if (!this.onboarding.scripted || this.onboarding.step !== 'gold') this.battleHud.reveal('gold', true);
      // A combo of pickups climbs in pitch (GDD §17).
      this.coinCombo = this.clock - this.lastCoin < COIN_COMBO.window ? Math.min(COIN_COMBO.steps, this.coinCombo + 1) : 0;
      this.lastCoin = this.clock;
      this.audio.play('coin', { rate: 1 + this.coinCombo * COIN_COMBO.step });
    };
    this.grenades.onBurst = (at, round, rocket) => {
      this.effects.puff(at.clone().setY(at.y + 0.3), PUFFS.blast);
      const near = this.near(at.x, at.z);
      // A rocket: the full boom and a beat's freeze (GDD §8.1: 40 ms on rocket hits). A launcher's round: quieter and
      // higher, and only a nudge unless it bursts close by.
      if (rocket) {
        this.audio.play('blast', { gain: Math.max(0.6, near), rate: 0.85 + Math.random() * 0.1 });
        this.stopFor(0.04);
        if (near > 0.5) this.rig.kick(0.6, 0.3, 0.6);
      } else if (round) {
        this.audio.play('blast', { gain: Math.max(0.45, near) * 0.8, rate: 1.1 + Math.random() * 0.15 });
        if (near > 0.8) this.rig.kick(0.3, 0.2, 0.3);
      } else {
        this.audio.play('blast', { gain: Math.max(0.6, near) });
        this.rig.kick(1.2, 0.6, 1.5);
      }
    };
    // Onboarding reads the game through this narrow window (`game/onboarding.ts`). Its getters need the game itself.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const game = this;
    this.onboarding = new Onboarding({
      get state() {
        return game.state;
      },
      get touch() {
        return game.input.isTouch;
      },
      get screen() {
        return game.screen;
      },
      get battle() {
        return game.battle;
      },
      hero: this.hero,
      get sim() {
        return game.crowd.sim;
      },
      aim: this.combat.aim,
      get gun() {
        return game.combat.gun;
      },
      coins: this.coins,
      hud: this.hud,
      battleHud: this.battleHud,
      prompt: this.prompt,
      rosie: this.rosie,
      markers: this.markers,
      shop: this.shop,
      get look() {
        return { since: game.input.sinceLook, total: game.input.totalLook };
      },
      buttons: { grenade: this.touch.buttons.grenade, gun: this.touch.buttons.gun, next: this.battleHud.next, support: this.touch.buttons.support },
      cardButton: () => this.result.primary,
      fightButton: () => this.map.fightButton,
      revealButton: (name, shown) => this.touch.reveal(name, shown),
      showShopRing: (shown) => this.field.setShopOpen(shown),
      measure: (category, what, action) => this.session.measure(category, what, action),
      save: () => this.save(),
    });
    window.addEventListener('pagehide', () => this.save());
    document.addEventListener('visibilitychange', () => this.onVisibility(document.hidden));
  }

  /**
   * The tab is hidden or back (M11): hidden, the game saves, its sound goes quiet and a wave in progress pauses (the
   * pause card waits for the player); back, the sound returns unless the pause card or an ad still holds it.
   */
  onVisibility(hidden: boolean): void {
    if (hidden) {
      this.save();
      if (!this.hiddenSilenced) {
        this.hiddenSilenced = true;
        this.audio.silence(true);
      }
      const fighting = this.screen === 'battle' && this.battle?.phase === 'wave' && !this.shop.isOpen && !this.offer.open;
      if (this.mode === 'play' && fighting && !this.ending?.active) this.openPause();
    } else if (this.hiddenSilenced) {
      this.hiddenSilenced = false;
      this.audio.silence(false);
    }
  }

  /** Loads the save and the soldiers, and opens the first screen. `progress` drives the loading bar (0 to 1). */
  async load(progress: (fraction: number) => void): Promise<void> {
    progress(0.2);
    this.state = this.store.load()?.state ?? newGameState();
    progress(0.25);
    // The field's dressing first: the crowd's paths go round what it blocks.
    // Dev: `?nokit` keeps the greybox field (before-and-after comparisons, `noise.py`).
    const bare = __PLATFORM__ === 'dev' && new URLSearchParams(location.search).has('nokit');
    // The field kit, the hero and Rosie download together; each is put in place in turn below.
    const kitFile = bare ? null : FieldKit.load();
    const heroFiles = loadHeroAssets();
    const rosieFile = loadRosie();
    for (const p of [kitFile, heroFiles, rosieFile]) p?.catch(() => {});
    try {
      if (kitFile) {
        this.fieldKit = await kitFile;
        this.field.dress(this.fieldKit);
      }
    } catch (error) {
      console.warn('Field kit failed to load; the greybox field stays', error);
    }
    // The hero's model and guns (the capsule stands in if they fail).
    try {
      const assets = await heroFiles;
      this.hero.setModel(assets);
      // The shop's and the gun button's gun pictures, rendered from the same models.
      // Only guns with their own model get a picture (later guns borrow a model, not its picture).
      const art = renderGunIcons(this.stage.renderer, assets.guns);
      this.gunArt = { pistol: art.get('pistol'), shotgun: art.get('shotgun'), smg: art.get('smg'), assaultRifle: art.get('rifle'), huntingRifle: art.get('hunting'), machineGun: art.get('mg'), grenadeLauncher: art.get('launcher'), minigun: art.get('minigun'), rocketLauncher: art.get('rocket') };
      this.shop.setGunArt(this.gunArt);
      const held = this.battle?.gun ?? 'pistol';
      this.hero.setGun(held, this.state.guns[held] ?? 1);
      this.hud.setGunArt(this.gunArt[this.battle?.gun ?? 'pistol']);
    } catch (error) {
      console.warn('Hero model failed to load; the capsule stays', error);
    }
    // The War Wagon (built in code); its oxen come with the later regions' download.
    this.wagonModel = new WarWagonModel(null);
    this.stage.scene.add(this.wagonModel.group);
    // Rosie at her truck (before the crowd: the field's blockers include her spot).
    try {
      this.rosieFigure = new RosieFigure(await rosieFile);
      this.field.placeRosie(this.rosieFigure);
    } catch (error) {
      console.warn('Rosie failed to load', error);
    }
    progress(0.3);
    this.crowd = await Crowd.load(this.field, (f) => progress(0.3 + f * 0.6));
    this.stage.scene.add(this.crowd.group);
    this.crowd.render.setTier(this.stage.tier);
    this.stage.onTier = (tier) => this.crowd.render.setTier(tier);
    const sim = this.crowd.sim;
    sim.onLand = (x, y, z) => {
      this.effects.puff(tmpA.set(x, y + 0.1, z), PUFFS.knock);
      this.audio.play('knock', { gain: this.near(x, z), rate: 0.9 + Math.random() * 0.2 });
    };
    sim.onLoose = (x, _y, z) => this.audio.play('bolt', { gain: this.near(x, z), rate: 0.9 + Math.random() * 0.2 });
    sim.onBoltLand = (x, y, z) => this.effects.puff(tmpA.set(x, y + 0.05, z), PUFFS.ground);
    sim.onHeroHit = (damage, x, z) => {
      if (this.battle) this.battle.hurtHero(damage, x, z);
      else this.hurtFrom(x, z);
    };
    sim.onFallen = (type, x, y, z, routed) => {
      if (this.battle) this.coins.drop(x, y, z, this.battle.goldFor(type));
      if (!routed) this.audio.yelp(this.near(x, z));
    };
    // The rout moment (GDD §4.4): Larkmoor's horn, the runners yelp, and a beat's freeze.
    sim.onRout = (x, z) => {
      this.battleHud.toast(t('battle.rout'), 1.6);
      this.state.stats.routs += 1;
      this.audio.play('rout', { gain: Math.max(0.7, this.near(x, z)) });
      this.audio.yelp();
      this.audio.yelp();
      this.stopFor(HIT_STOP.rout);
    };
    // Shields (GDD §9.1): a crack shows as sparks and a clonk; a break as a burst of splinters.
    const shieldAt = (i: number): THREE.Vector3 => {
      const b = sim.bodies;
      const h = sim.heading[i]!;
      return tmpA.set(b.x[i]! - Math.sin(h) * 0.35, b.y[i]! + b.height[i]! * 0.55, b.z[i]! - Math.cos(h) * 0.35);
    };
    sim.onShieldCrack = (i) => {
      this.effects.puff(shieldAt(i), PUFFS.spark);
      this.audio.play('crack', { gain: this.near(sim.bodies.x[i]!, sim.bodies.z[i]!) });
    };
    sim.onShieldBreak = (i) => {
      this.effects.puff(shieldAt(i), PUFFS.knock);
      this.effects.puff(shieldAt(i), PUFFS.spark);
      this.audio.play('splinter', { gain: this.near(sim.bodies.x[i]!, sim.bodies.z[i]!) });
    };
    // A boss roars before his charge; a rider's gallop sounds as his charge begins.
    sim.onWindup = (i) => {
      if (SOLDIERS[TYPES[sim.type[i]!]!].mount) this.audio.play('hooves', { gain: this.near(sim.bodies.x[i]!, sim.bodies.z[i]!), rate: 0.95 + Math.random() * 0.1 });
      // A Brute's wind-up is lower and fades with distance (two can wind up at once); a boss's always carries.
      else if (SOLDIERS[TYPES[sim.type[i]!]!].boss) this.audio.play('windup', { rate: 0.8 });
      else this.audio.play('windup', { rate: 0.68, gain: Math.max(0.55, this.near(sim.bodies.x[i]!, sim.bodies.z[i]!)) });
    };
    // Firebrands (GDD §9.1): the scream and the sizzle are the cue; the burst hurts everyone near, the banner too.
    sim.onSprint = (i) => {
      const gain = this.near(sim.bodies.x[i]!, sim.bodies.z[i]!);
      this.audio.play('scream', { gain, rate: 0.95 + Math.random() * 0.2 });
      this.audio.play('sizzle', { gain });
    };
    // A wagon's wheel breaks: splinters, a crack and a jolt (GDD §9.3).
    sim.onWheelBreak = (wheel) => {
      const b = sim.bodies;
      this.effects.puff(tmpA.set(b.x[wheel]!, b.y[wheel]! + 0.6, b.z[wheel]!), PUFFS.knock);
      this.effects.puff(tmpA.set(b.x[wheel]!, b.y[wheel]! + 0.6, b.z[wheel]!), PUFFS.spark);
      this.audio.play('splinter', { gain: Math.max(0.6, this.near(b.x[wheel]!, b.z[wheel]!)), rate: 0.8 });
      this.rig.kick(0.5, 0.3, 0.5);
    };
    // The Iron Ox (GDD §9.3): its horns roar as they glow; then fire fills the cone (and the banner, if it's in it).
    sim.onFireWindup = (ox) => this.audio.play('windup', { gain: Math.max(0.6, this.near(sim.bodies.x[ox]!, sim.bodies.z[ox]!)), rate: 0.55 });
    sim.onFire = (ox, dirX, dirZ, fire) => {
      const b = sim.bodies;
      const x = b.x[ox]!;
      const z = b.z[ox]!;
      for (let k = 0; k < 7; k++) {
        const along = 2 + (k / 6) * (fire.length - 2.5);
        const side = (Math.random() - 0.5) * 2 * Math.tan(fire.half) * along * 0.7;
        const fx = x + dirX * along - dirZ * side;
        const fz = z + dirZ * along + dirX * side;
        this.effects.puff(tmpA.set(fx, this.field.heightAt(fx, fz) + 0.6, fz), PUFFS.fire);
      }
      const gain = Math.max(0.6, this.near(x, z));
      this.audio.play('burst', { gain, rate: 0.7 });
      this.audio.play('sizzle', { gain });
      this.battle?.fireAt(x, z, dirX, dirZ, fire.length, fire.half, fire.banner);
      if (Math.hypot(this.hero.position.x - x, this.hero.position.z - z) < fire.length + 4) this.rig.kick(0.6, 0.4, 0.6);
    };
    // The Siege Tower's doors open (GDD §9.3): a heavy wooden thud, and a squad steps out.
    sim.onDoors = (tower, side) => {
      if (this.tower?.body === tower) this.tower.model.openDoor(side);
      this.audio.play('block', { gain: Math.max(0.5, this.near(sim.bodies.x[tower]!, sim.bodies.z[tower]!)), rate: 0.5 });
    };
    // A catapult throws (GDD §9.1): a creak and a whoosh; a boulder lands: a thud, dust, the banner if it's in the ring.
    sim.onLob = (catapult, boulder) => {
      for (const c of this.catapults) if (c.body === catapult) c.model.fire();
      const gain = Math.max(0.45, this.near(boulder.fromX, boulder.fromZ));
      this.audio.play('splinter', { gain: gain * 0.6, rate: 1.5 });
      this.audio.play('throw', { gain, rate: 0.55 });
    };
    sim.onBoulder = (boulder) => {
      const { toX: x, toY: y, toZ: z } = boulder;
      this.effects.puff(tmpA.set(x, y + 0.3, z), PUFFS.blast);
      this.effects.puff(tmpA.set(x, y + 0.2, z), PUFFS.knock);
      this.audio.play('blast', { gain: Math.max(0.5, this.near(x, z)), rate: 0.6 + Math.random() * 0.1 });
      this.battle?.burstAt(x, z, boulder.lob.banner);
      if (Math.hypot(x - this.hero.position.x, z - this.hero.position.z) < boulder.lob.radius * 3) this.rig.kick(0.6, 0.4, 0.6);
    };
    sim.onBurst = (x, y, z, burst) => {
      this.effects.puff(tmpA.set(x, y + 1.6, z), PUFFS.fire);
      this.effects.puff(tmpA.set(x, y + 0.2, z), PUFFS.knock);
      this.audio.play('burst', { gain: this.near(x, z), rate: 0.9 + Math.random() * 0.2 });
      if (Math.hypot(x - this.hero.position.x, z - this.hero.position.z) < burst.radius * 2) this.haptics.pulse('blast');
      this.battle?.burstAt(x, z, burst.banner);
      if (Math.hypot(x - this.hero.position.x, z - this.hero.position.z) < burst.radius * 2) this.rig.kick(0.6, 0.4, 0.6);
    };
    // Compile every shader now, so the first frames of play don't hitch.
    this.stage.renderer.compile(this.stage.scene, this.stage.camera);
    progress(1);
    if (reachedBattle(this.state) > 5) this.startLater();
    this.openFirstScreen();
  }

  /** Starts the later regions' download, once. */
  startLater(): Promise<void> {
    this.later ??= this.loadLater();
    return this.later;
  }

  /** Fetches what only later regions use (M11); each part falls back on its own if it fails. */
  private loadLater(): Promise<void> {
    const kit = this.fieldKit?.addLater().catch((error: unknown) => console.warn('The later field kit failed to load; those fields go bare', error));
    const horse = this.crowd.addMount();
    const oxen = loadOx()
      .then((ox) => this.wagonModel?.addOxen(ox))
      .catch((error: unknown) => console.warn('Oxen failed to load', error));
    return Promise.all([kit, horse, oxen]).then(() => {
      this.laterDone = true;
      // The horses' shader, as boot does for the rest, so the first rider doesn't hitch.
      this.stage.renderer.compileAsync(this.stage.scene, this.stage.camera).catch(() => {});
    });
  }

  /**
   * Starts a battle (or a Last Stand) once its region's pieces are here: Region 1 at once, a later region when the
   * later download is done. Returns true when it has to wait (the map's button says "Loading…").
   */
  playBattle(id: number, fromWave = 1, mode: 'campaign' | 'lastStand' = 'campaign'): boolean {
    if (battle(id).region <= 1 || this.laterDone) {
      this.startBattle(id, fromWave, mode);
      return false;
    }
    // Unless the player has gone elsewhere meanwhile.
    const screen = this.screen;
    const current = this.battle;
    void this.startLater().then(() => {
      if (this.screen === screen && this.battle === current) this.startBattle(id, fromWave, mode);
    });
    return true;
  }

  /**
   * The first screen (GDD §15.2): a dev scene or jump link in development; a new player starts straight in Battle 1;
   * a returning player lands on the map with the next battle selected.
   */
  private openFirstScreen(): void {
    const params = new URLSearchParams(location.search);
    const scene = params.get('scene');
    if (scene && scene in SCENES) {
      this.devScene(scene as SceneName);
      return;
    }
    // Dev: `?stand=N` opens a Last Stand on Battle N's field (`&gold=G` too).
    const stand = Number(params.get('stand'));
    if (__PLATFORM__ === 'dev' && stand >= 1) {
      const gold = Number(params.get('gold'));
      if (gold > 0) this.state.gold = gold;
      this.playBattle(stand, 1, 'lastStand');
      return;
    }
    const jump = Number(params.get('battle'));
    if (__PLATFORM__ === 'dev' && jump >= 1) {
      const gold = Number(params.get('gold'));
      if (gold > 0) this.state.gold = gold;
      this.playBattle(jump, Number(params.get('wave')) || 1);
      return;
    }
    if (isNewPlayer(this.state)) this.startBattle(1);
    else this.showMap();
  }

  start(): void {
    this.input.setEnabled(this.screen !== 'map');
    this.last = performance.now();
    // Dev only: `?speed=3` runs game time faster, for the autopilot (`npm run qa`).
    const speed = __PLATFORM__ === 'dev' ? Number(new URLSearchParams(location.search).get('speed')) || 1 : 1;
    const frame = (now: number): void => {
      const dt = Math.min(0.1, ((now - this.last) / 1000) * speed);
      this.last = now;
      this.update(dt);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  // ---- Screens -------------------------------------------------------------------------------------------------

  /** Starts a battle from its beginning (or, from a dev link, at a later wave). */
  startBattle(id: number, fromWave = 1, mode: 'campaign' | 'lastStand' = 'campaign'): void {
    this.map.hide();
    this.result.hide();
    this.closeShop(false);
    this.stopEnding();
    if (mode === 'campaign' && id === LAST_STAND.unlockAfter && !lastStandUnlocked(this.state)) this.prepareEnding();
    this.screen = 'battle';
    this.mode = 'play';
    this.resetOffers();
    // The rift crate (GDD §12.3): decided now, dropped in the first break. Dev: `?crate` forces one in any battle.
    const forced = __PLATFORM__ === 'dev' && new URLSearchParams(location.search).has('crate');
    this.crateState = this.offerable('crate') && (forced || crateDue(id, Math.random())) ? 'planned' : 'none';
    this.crowd.start('none', this.stage.look.soldiers);
    this.coins.clear();
    this.grenades.clear();
    this.strike.clear();
    this.sentries.clear();
    this.field.setRegion(battle(id).region);
    this.field.setLandmark(id, battle(id).region);
    this.field.tipBanner(0);
    this.defeatTip = 0;
    const { battleStart, bannerAt } = GREYBOX;
    const facing = Math.atan2(-(bannerAt.x - battleStart.x), -(bannerAt.z - battleStart.z));
    this.hero.place(battleStart.x, battleStart.z, facing);
    this.hero.setDown(false);
    this.crowd.heroTargetable = true;
    this.rig.snap(this.hero.position, facing, this.stage.portrait);
    this.rig.update(0, this.hero.position, this.stage.portrait);
    this.battle = new Battle(
      {
        state: this.state,
        sim: this.crowd.sim,
        cap: () => this.stage.look.soldiers,
        onPhase: (phase) => this.onPhase(phase),
        onResult: () => this.showResult(),
        onGun: (gun, level) => this.equip(gun, level),
        onEvent: (event) => this.onBattleEvent(event),
        save: () => this.save(),
      },
      id,
      mode,
    );
    this.reveal.active = false;
    this.rig.shotWeight = 0;
    this.battle.begin();
    this.onboarding.battleStarted(id);
    if (this.onboarding.scripted) this.battle.scriptFirstWave();
    // Dev jump links start later waves straight away.
    for (let w = 1; w < fromWave && w < this.battle.waves; w++) this.battle.wave++;
    this.battleHud.show(true);
    this.battleHud.clear();
    this.battleHud.setGold(this.state.gold, true);
    if (!this.onboarding.scripted) this.battleHud.toast(this.battle.title, 2.4);
    this.hud.showCrosshair(this.started && !this.onboarding.scripted);
    this.session.measure('battle', mode === 'lastStand' ? 'laststand' : battleKey(id), 'start');
    this.input.setEnabled(true);
    document.getElementById('game')?.classList.remove('is-down');
    this.syncGameplay();
  }

  /** The campaign map (GDD §13.1), with `select` (or the next battle) chosen. */
  showMap(select?: number): void {
    this.stopEnding();
    void this.startLater();
    this.onboarding.battleEnded();
    this.rosie.hush();
    this.battle = null;
    this.screen = 'map';
    this.deliveries.clear();
    this.mode = 'play';
    this.result.hide();
    this.resetOffers();
    this.closeShop(false);
    this.battleHud.show(false);
    this.hud.showCrosshair(false);
    this.field.setShopOpen(false);
    this.crowd.start('none', this.stage.look.soldiers);
    this.coins.clear();
    this.grenades.clear();
    this.strike.clear();
    this.sentries.clear();
    this.input.releasePointer();
    this.input.setEnabled(false);
    document.getElementById('game')?.classList.remove('is-down');
    this.map.show(this.state, this.stage.portrait, select);
    this.onboarding.mapShown();
    this.syncGameplay();
  }

  /** Puts the hero at a dev scene's spot, looking where it says, and starts its scenario (`?scene=`, `npm run shots`). */
  devScene(name: SceneName): void {
    const s = SCENES[name];
    // A clean sandbox: no onboarding prompts, markers or Rosie; every control shown.
    this.onboarding.battleEnded();
    this.rosie.hush();
    this.touch.reveal('gun', true);
    this.hud.showCrosshair(this.started);
    this.battle = null;
    this.screen = 'sandbox';
    this.field.setRegion(1);
    this.field.setLandmark(1);
    this.map.hide();
    this.battleHud.show(false);
    this.crowd.start(s.scenario, this.stage.look.soldiers);
    const facing = Math.atan2(-(s.lookX - s.x), -(s.lookZ - s.z));
    this.hero.place(s.x, s.z, facing);
    this.rig.snap(this.hero.position, facing, this.stage.portrait);
    if (s.pitch !== null) this.rig.pitch = s.pitch * DEG;
    this.rig.update(0, this.hero.position, this.stage.portrait);
    this.input.setEnabled(true);
    this.syncGameplay();
  }

  /** Dev and QA: runs the armies (and a battle) forward without drawing, to reach a moment quickly. */
  devAdvance(seconds: number): void {
    const tick = 1 / 30;
    const sim = this.crowd.sim;
    sim.hero.x = this.hero.position.x;
    sim.hero.z = this.hero.position.z;
    sim.hero.active = true;
    sim.camera.x = this.stage.camera.position.x;
    sim.camera.z = this.stage.camera.position.z;
    for (let t = 0; t < seconds; t += tick) {
      sim.tick(tick);
      if (this.battle) this.battle.update(tick);
      else this.crowd.runner.update(tick);
    }
    // An army reveal started meanwhile is over by now.
    this.reveal.active = false;
    this.rig.shotWeight = 0;
  }

  /** A red arc round the crosshair toward a hit from a point on the field. */
  hurtFrom(x: number, z: number): void {
    const toward = Math.atan2(-(x - this.hero.position.x), -(z - this.hero.position.z));
    let angle = this.rig.yaw - toward;
    angle = Math.atan2(Math.sin(angle), Math.cos(angle));
    this.hud.damageArc(angle);
  }

  // ---- Battle hooks --------------------------------------------------------------------------------------------

  private onPhase(phase: Phase): void {
    const battle = this.battle;
    if (!battle) return;
    const from = this.lastPhase;
    this.lastPhase = phase;
    const inBreak = phase === 'break';
    if (inBreak) this.rewardedHere = false;
    this.battleHud.showNext(inBreak);
    this.field.setShopOpen(inBreak);
    if (!inBreak) this.closeShop(false);
    this.shopDismissed = false;
    if (inBreak && !this.onboarding.scripted) this.battleHud.toast(t('battle.truck'), 2.6);
    if (phase === 'victory') {
      this.audio.play('fanfare');
      this.hero.cheer();
      this.rosieFigure?.cheer();
      this.session.measure('battle', this.measureKey(battle), 'complete');
    }
    if (phase === 'defeat') {
      this.audio.play('defeat');
      this.session.measure('battle', this.measureKey(battle), 'fail');
    }
    // A Rally goes straight back into the wave: no army reveal.
    if (phase === 'wave' && from !== 'defeat') this.startReveal();
    if (inBreak && this.crateState === 'planned') this.dropCrate();
    else if (!inBreak && this.crateState === 'dropped') this.closeCrate();
    if (phase === 'victory' || phase === 'defeat') this.input.releasePointer();
    if (phase === 'wave') this.showWave(battle, battle.wave + 1);
    else if (phase === 'ready') {
      this.showWave(battle, battle.wave + 2);
      // A Last Stand's short break between shops: the next wave comes on its own.
      if (battle.lastStand && battle.wave >= 0) this.battleHud.toast(t('laststand.next', { n: battle.wave + 2 }), 2.4);
    }
    this.syncGameplay();
  }

  private onBattleEvent(event: BattleEvent): void {
    switch (event.kind) {
      case 'waveCleared':
        this.coins.collectAll();
        if (this.battle) this.session.measure('wave', `${battleKey(this.battle.id)}w${this.battle.wave + 1}`, 'complete');
        this.battleHud.toast(t('battle.cleared', { gold: event.bonus }), 2.6);
        // The last wave's win plays the fanfare instead.
        if (this.battle && this.battle.wave + 1 < this.battle.waves) this.audio.play('waveClear');
        break;
      case 'atBanner':
        this.rosie.say(t('battle.atBanner'), 2.4);
        this.audio.play('alarm');
        break;
      case 'heroHurt':
        this.haptics.pulse('hurt');
        this.battleHud.reveal('health', true);
        this.hurtFrom(event.fromX, event.fromZ);
        this.audio.play('hurt', { rate: 0.9 + Math.random() * 0.2 });
        break;
      case 'heroDown':
        this.haptics.pulse('down');
        this.hero.setDown(true);
        this.crowd.heroTargetable = false;
        document.getElementById('game')?.classList.add('is-down');
        break;
      case 'heroUp': {
        const spot = Battle.getUpSpot(tmpA);
        this.hero.place(spot.x, spot.z, this.rig.yaw);
        this.hero.setDown(false);
        this.crowd.heroTargetable = true;
        this.rig.snap(this.hero.position, this.rig.yaw, this.stage.portrait);
        document.getElementById('game')?.classList.remove('is-down');
        break;
      }
      case 'loanOver':
        this.rosie.say(t('rosie.saving'));
        break;
      case 'lastShop':
        this.battleHud.toast(t('battle.lastShop'), 3.2);
        this.rosie.say(t('rosie.lastShop'));
        break;
      case 'bossHalf':
        this.haptics.pulse('boss');
        this.battleHud.toast(t(event.boss === 'ironOx' ? 'battle.oxSummon' : 'battle.bossHalf'), 2.4);
        this.audio.play('splinter');
        this.rig.kick(0.8, 0.4, 0.8);
        this.stopFor(HIT_STOP.bossHalf);
        break;
      case 'wagonStall':
        this.battleHud.toast(t(event.tower ? 'battle.towerStall' : 'battle.wagonStall'), 2.4);
        this.audio.play('splinter', { rate: 0.6 });
        this.stopFor(HIT_STOP.bossHalf);
        break;
      case 'oxCore':
        // Phase 3: the plates fall and the core glows (the model shows it): rocket time.
        this.battleHud.toast(t('battle.oxCore'), 2.6);
        this.audio.play('splinter', { rate: 0.5 });
        this.audio.play('clink', { rate: 0.6 });
        this.rig.kick(1, 0.5, 1);
        this.stopFor(HIT_STOP.bossHalf);
        break;
      case 'bossDown':
        this.haptics.pulse('bossDown');
        this.audio.play('bossDown');
        this.rig.kick(1.4, 0.5, 1.6);
        this.stopFor(HIT_STOP.bossDown);
        if (event.boss === 'ironOx') this.startEscape();
        break;
      case 'comeback':
        this.rosie.say(t('rosie.comeback'));
        break;
      case 'waveStart':
        break;
    }
  }

  /** The HUD's wave label: "Wave 3/5" in the campaign, "Wave 12 · best 17" in a Last Stand. */
  private showWave(battle: Battle, n: number): void {
    if (battle.lastStand) {
      // The field's best shows once there is one.
      const best = Math.max(battle.record.best, battle.held);
      this.battleHud.setWaveText(best > 0 ? t('laststand.wave', { n, best }) : t('laststand.waveFirst', { n }));
    }
    else this.battleHud.setWave(n, battle.waves);
  }

  /** Poki's measure key for a battle: its number, or the Last Stand. */
  private measureKey(battle: Battle): string {
    return battle.lastStand ? 'laststand' : battleKey(battle.id);
  }

  /** A Last Stand from the map (GDD §13.4). */
  startLastStand(id: number): void {
    this.startBattle(id, 1, 'lastStand');
  }

  /** The Iron Ox is down: the Baron hops onto his donkey and gallops off away from the banner (M10). */
  private startEscape(): void {
    const ox = this.ox;
    const escape = this.escape;
    if (!ox || !escape || ox.body < 0) return;
    const b = this.crowd.sim.bodies;
    const at = tmpA.set(b.x[ox.body]!, 0, b.z[ox.body]!);
    at.y = this.field.heightAt(at.x, at.z);
    const { bannerAt } = GREYBOX;
    escape.begin(at, ox.model.riderAt(tmpB), at.x - bannerAt.x, at.z - bannerAt.z, this.groundAt, GREYBOX.size / 2);
    this.battleHud.toast(t('battle.baronFlees'), 3);
    this.rosie.say(t('rosie.donkey'), 3);
  }

  /** Fetches Queen Ada for Battle 20's ending; without her the ending card shows alone. */
  private prepareEnding(): void {
    if (this.ending || this.endingLoading) return;
    this.endingLoading = true;
    loadAda()
      .then((assets) => {
        const ada = new AdaFigure(assets);
        this.stage.scene.add(ada.root);
        this.ending = new EndingScene(
          {
            heightAt: this.groundAt,
            portrait: () => this.stage.portrait,
            placeHero: (x, z, yaw) => {
              this.hero.place(x, z, yaw);
              this.rig.snap(this.hero.position, yaw, this.stage.portrait);
            },
            setShot: (pos, target) => this.rig.setShot(pos, target),
            say: (who, key) => this.endingUi.say(who, t(who === 'ada' ? 'ending.ada' : 'ending.rosie'), t(key)),
            fade: (on) => this.endingUi.fade(on),
            cheer: () => {
              this.hero.cheer();
              this.rosieFigure?.cheer();
              this.crowd.sim.cheer(ALLY);
              this.audio.play('waveClear');
            },
            done: () => {
              this.endingUi.hide();
              this.showResult();
            },
          },
          ada,
        );
      })
      .catch((error: unknown) => console.warn('Queen Ada failed to load; the ending card shows alone', error))
      .finally(() => {
        this.endingLoading = false;
      });
  }

  /** The ending scene (M10): the HUD goes, the dip to dark, Ada and the lines; its card follows. */
  private startEnding(): void {
    this.input.releasePointer();
    this.input.setEnabled(false);
    this.battleHud.clear();
    this.battleHud.show(false);
    this.hud.showCrosshair(false);
    this.rosie.hush();
    document.getElementById('game')?.classList.add('is-ending');
    this.endingUi.show(t('ending.skip'));
    this.ending?.start();
  }

  private stopEnding(): void {
    this.ending?.stop();
    this.endingUi.hide();
    document.getElementById('game')?.classList.remove('is-ending');
    this.escape?.stop();
    this.resultWaiting = false;
    this.rig.shotWeight = 0;
  }

  private showResult(): void {
    const battle = this.battle;
    if (!battle) return;
    // The Baron's escape plays out before the card (M10).
    if (battle.phase === 'victory' && this.escape?.active) {
      this.resultWaiting = true;
      return;
    }
    // Battle 20's first win: the ending scene, then its card.
    const finale = battle.phase === 'victory' && !battle.lastStand && battle.id === LAST_STAND.unlockAfter && battle.earned.firstClear > 0;
    if (finale && this.ending && !this.ending.active) {
      this.startEnding();
      return;
    }
    this.input.releasePointer();
    this.input.setEnabled(false);
    this.battleHud.clear();
    this.rewardedHere = false;
    if (battle.lastStand && battle.phase === 'defeat') {
      // The run is over: waves held, the record, gold kept; Again or the map; 🎬 Rally goes on from this wave.
      const rally: RewardOffer | null =
        this.offerable('rally') && !battle.rallied
          ? { label: t('offer.rally'), onPress: () => void this.watchReward('rally', () => this.rally(), () => this.result.withdrawOffer()) }
          : null;
      this.result.showLastStand(
        { held: battle.held, best: battle.record.best, newBest: battle.record.newBest, gold: battle.earned.kills + battle.earned.waves },
        () => void this.leaveCard(() => this.startLastStand(battle.id)),
        () => this.showMap(battle.id),
        rally,
      );
      if (rally) this.session.measure('rewarded', 'rally', 'visible');
      this.save();
      return;
    }
    if (battle.phase === 'victory') {
      // ×2 gold (rewarded, GDD §16); not while Battle 1 is still teaching.
      const double: RewardOffer | null =
        this.offerable('double') && !this.onboarding.scripted
          ? {
              label: t('offer.double'),
              onPress: () =>
                void this.watchReward(
                  'double',
                  () => {
                    const extra = doubleGoldBonus(battle.earned);
                    this.state.gold += extra;
                    battle.earned.kills *= 2;
                    battle.earned.waves *= 2;
                    this.result.doubled(extra);
                    this.audio.play('buy');
                  },
                  () => this.result.withdrawOffer(),
                ),
            }
          : null;
      this.result.showVictory(
        { crowns: battle.victory?.crowns ?? 1, kills: battle.earned.kills, waves: battle.earned.waves, firstClear: battle.earned.firstClear },
        () => void this.leaveCard(() => this.showMap(Math.min(reachedBattle(this.state), battle.id + 1))),
        double,
        finale,
      );
      if (double) this.session.measure('rewarded', 'double', 'visible');
    } else {
      // Rally (rewarded, once per battle): back into the same wave with the banner at half.
      const rally: RewardOffer | null =
        this.offerable('rally') && !battle.rallied
          ? {
              label: t('offer.rally'),
              onPress: () => void this.watchReward('rally', () => this.rally(), () => this.result.withdrawOffer()),
            }
          : null;
      this.result.showDefeat(
        battle.earned.kills + battle.earned.waves,
        () => void this.leaveCard(() => this.startBattle(battle.id)),
        () => this.showMap(battle.id),
        rally,
      );
      if (rally) this.session.measure('rewarded', 'rally', 'visible');
    }
    this.save();
  }

  /**
   * The army reveal at a wave's start (GDD §4.3): a high, wide shot from behind the banner as the wave enters, with a
   * nameplate the first time an enemy type appears. Battle 1's scripted first wave has none.
   */
  private startReveal(): void {
    const battle = this.battle;
    if (!battle || (this.onboarding.scripted && battle.wave === 0)) return;
    const wave = battle.def.waves[battle.wave];
    if (!wave) return;
    const met = (type: string): boolean => this.state.seenLessons.includes(`intro:${type}`);
    const plan = planReveal(wave, met, this.settings.waveIntros, this.settings.reducedMotion);
    if (plan.introduce) {
      if (!met(plan.introduce)) this.state.seenLessons.push(`intro:${plan.introduce}`);
      this.battleHud.nameplate(nameplate(plan.introduce), Math.max(2.5, plan.seconds));
    }
    this.reveal.start(plan);
    this.audio.play('horn');
    if (bossWave(battle.def) === battle.wave) this.audio.play('menace');
    else if (this.reveal.active) this.audio.play('drums');
    if (this.reveal.active) {
      this.rig.setShot(this.reveal.pos, this.reveal.target);
      this.revealPresses = this.input.presses;
    }
  }

  private equip(gun: GunId, level: number): void {
    this.combat.gun.equip(GUNS[gun], level);
    this.hero.setGun(gun, level);
    this.hud.setGunArt(this.gunArt[gun]);
  }

  // ---- The shop ------------------------------------------------------------------------------------------------

  private buy(id: string): void {
    const reached = this.battle?.reached ?? reachedBattle(this.state);
    if (!act(this.state, reached, id)) return;
    this.session.measure('shop', id.replace(':', '-'), 'interact');
    this.audio.play('buy');
    this.haptics.pulse('buy');
    this.rosieFigure?.serve();
    this.deliveries.drop();
    this.effects.puff(tmpA.set(GREYBOX.truckAt.x, 3, GREYBOX.truckAt.z), PUFFS.spark);
    this.battle?.equipHand();
    // A bigger militia sends its new soldiers out at once.
    this.shop.refresh();
    this.map.refresh();
    this.battleHud.setGold(this.state.gold, true);
    this.save();
  }

  private openShop(): void {
    const reached = this.battle?.reached ?? reachedBattle(this.state);
    this.input.releasePointer();
    this.input.lockAllowed = false;
    this.shop.open(this.state, reached);
    this.rosieFigure?.serve();
  }

  private openShopFromMap(): void {
    this.shopFromMap = true;
    this.shop.open(this.state, reachedBattle(this.state));
  }

  /** `dismissed`: closed by the player (✕ or Esc) while possibly still in the ring. */
  private closeShop(dismissed: boolean): void {
    if (!this.shop.isOpen) return;
    this.shop.close();
    this.input.lockAllowed = true;
    if (dismissed && !this.shopFromMap) this.shopDismissed = true;
    this.shopFromMap = false;
  }

  /** Keeps the hero in view beside the docked panel (GDD §12.1), and the HUD's centre out from under it. */
  private frameForShop(open: boolean): void {
    document.getElementById('game')?.classList.toggle('is-shop-open', open && !this.shopFromMap && this.screen !== 'map');
    if (!open || this.shopFromMap || this.screen === 'map') {
      this.stage.setFrameShift(0, 0);
      return;
    }
    if (this.stage.portrait) this.stage.setFrameShift(0, this.stage.height * 0.3);
    // The field's centre moves to the middle of what the panel leaves.
    else this.stage.setFrameShift((this.stage.width - this.shop.leftEdge) / 2, 0);
  }

  /** In a break, walking into Rosie's ring opens the shop; walking out closes it. */
  private updateShopRing(): void {
    const battle = this.battle;
    if (!battle || battle.phase !== 'break') return;
    const { shopSpot } = GREYBOX;
    const inside = Math.hypot(this.hero.position.x - shopSpot.x, this.hero.position.z - shopSpot.z) < shopSpot.radius;
    if (inside && !this.shop.isOpen && !this.shopDismissed) this.openShop();
    if (!inside) {
      this.shopDismissed = false;
      if (this.shop.isOpen) this.closeShop(false);
    }
  }

  /** Draws the War Wagon where its body is, between the sim's ticks like the crowd (GDD §9.3). */
  private updateWagon(dt: number): void {
    const model = this.wagonModel;
    if (!model) return;
    const sim = this.crowd?.sim;
    let wagon = -1;
    if (sim && this.screen !== 'map') {
      for (let i = 0; i < sim.capacity; i++) {
        if (sim.live[i] && TYPES[sim.type[i]!] === 'warWagon') {
          wagon = i;
          break;
        }
      }
    }
    if (!sim || wagon < 0) {
      model.hide();
      this.wagonLast = null;
      return;
    }
    const alpha = this.crowd.alpha;
    const b = sim.bodies;
    const x = sim.prevX[wagon]! + (b.x[wagon]! - sim.prevX[wagon]!) * alpha;
    const z = sim.prevZ[wagon]! + (b.z[wagon]! - sim.prevZ[wagon]!) * alpha;
    const heading = sim.prevHeading[wagon]! + angleDelta(sim.prevHeading[wagon]!, sim.heading[wagon]!) * alpha;
    const moved = this.wagonLast ? Math.hypot(x - this.wagonLast.x, z - this.wagonLast.z) : 0;
    this.wagonLast = { x, z };
    const parts = sim.wagonParts(wagon);
    const broken = (parts?.wheels ?? []).map((w) => !sim.live[w] || !b.alive[w]);
    model.update(dt, x, this.field.heightAt(x, z), z, heading, broken, moved, sim.knockedTime(wagon));
  }

  /**
   * Draws each battering ram where its body is (GDD §9.1). At the banner its log thuds; when it's abandoned or broken
   * it splinters and settles, then sinks with the fallen.
   */
  private updateRams(dt: number): void {
    const sim = this.crowd?.sim;
    let n = 0;
    if (sim && this.screen !== 'map') {
      const b = sim.bodies;
      const alpha = this.crowd.alpha;
      for (let i = 0; i < sim.capacity; i++) {
        if (!sim.live[i] || TYPES[sim.type[i]!] !== 'ram') continue;
        if (n === this.rams.length) {
          const model = new RamModel();
          this.stage.scene.add(model.group);
          this.rams.push({ model, body: -1, last: null, fallen: false, thud: 0 });
        }
        const r = this.rams[n++]!;
        if (r.body !== i) {
          r.body = i;
          r.last = null;
          r.fallen = false;
        }
        const x = sim.prevX[i]! + (b.x[i]! - sim.prevX[i]!) * alpha;
        const z = sim.prevZ[i]! + (b.z[i]! - sim.prevZ[i]!) * alpha;
        const heading = sim.prevHeading[i]! + angleDelta(sim.prevHeading[i]!, sim.heading[i]!) * alpha;
        const moved = r.last ? Math.hypot(x - r.last.x, z - r.last.z) : 0;
        r.last = { x, z };
        const fell = sim.knockedTime(i);
        if (fell >= 0 && !r.fallen) {
          r.fallen = true;
          this.effects.puff(tmpA.set(x, b.y[i]! + 1, z), PUFFS.knock);
          this.audio.play('splinter', { gain: Math.max(0.6, this.near(x, z)), rate: 0.65 });
        }
        // At the banner: the log swings into it, a heavy thud every so often.
        const atBanner = fell < 0 && Math.hypot(x - GREYBOX.bannerAt.x, z - GREYBOX.bannerAt.z) < BANNER.ringRadius + 1;
        r.thud = atBanner ? r.thud - dt : 0.4;
        if (atBanner && r.thud <= 0) {
          r.thud = RAM_THUD;
          this.audio.play('block', { gain: Math.max(0.5, this.near(x, z)), rate: 0.55 });
          this.rig.kick(0.25, 0.15, 0.2);
        }
        r.model.update(x, this.field.heightAt(x, z), z, heading, atBanner ? Math.abs(Math.sin(this.clock * 2.6)) * dt * 2 : moved, fell, sim.sinkAmount(i));
      }
    }
    for (let k = n; k < this.rams.length; k++) {
      this.rams[k]!.model.hide();
      this.rams[k]!.body = -1;
    }
  }

  /** Draws the Iron Ox where its body is (GDD §9.3), its horns glowing through a wind-up, its fire cone on the ground. */
  private updateOx(dt: number): void {
    const sim = this.crowd?.sim;
    let body = -1;
    if (sim && this.screen !== 'map') {
      for (let i = 0; i < sim.capacity; i++) {
        if (sim.live[i] && TYPES[sim.type[i]!] === 'ironOx') {
          body = i;
          break;
        }
      }
    }
    if (!sim || body < 0) {
      this.ox?.model.hide();
      this.markers.setCones([]);
      return;
    }
    if (!this.ox) {
      const model = new IronOxModel();
      this.stage.scene.add(model.group);
      this.ox = { model, body };
    }
    if (!this.escape && !this.escapeLoading) {
      this.escapeLoading = true;
      loadDonkey()
        .then((assets) => {
          this.escape = new DonkeyEscape(assets);
          this.stage.scene.add(this.escape.group);
        })
        .catch((error: unknown) => console.warn('The donkey failed to load; the Baron stays put', error));
    }
    this.ox.body = body;
    const alpha = this.crowd.alpha;
    const b = sim.bodies;
    const x = sim.prevX[body]! + (b.x[body]! - sim.prevX[body]!) * alpha;
    const z = sim.prevZ[body]! + (b.z[body]! - sim.prevZ[body]!) * alpha;
    const heading = sim.prevHeading[body]! + angleDelta(sim.prevHeading[body]!, sim.heading[body]!) * alpha;
    const cone = sim.fireCone(body);
    const fire = SOLDIERS.ironOx.ox!.fire;
    this.markers.setCones(cone ? [cone] : []);
    const windup = cone ? 1 - cone.left / fire.windup : 0;
    this.ox.model.update(dt, x, this.field.heightAt(x, z), z, heading, windup, sim.oxPhase(body), sim.knockedTime(body), sim.sinkAmount(body));
  }

  /** Draws the Siege Tower where its body is, its broken beams gone, toppling when it falls (GDD §9.3). */
  private updateTower(dt: number): void {
    const sim = this.crowd?.sim;
    let body = -1;
    if (sim && this.screen !== 'map') {
      for (let i = 0; i < sim.capacity; i++) {
        if (sim.live[i] && TYPES[sim.type[i]!] === 'siegeTower') {
          body = i;
          break;
        }
      }
    }
    if (!sim || body < 0) {
      this.tower?.model.hide();
      if (this.tower) this.tower.body = -1;
      return;
    }
    if (!this.tower) {
      const model = new SiegeTowerModel();
      this.stage.scene.add(model.group);
      this.tower = { model, body: -1, last: null };
    }
    const tw = this.tower;
    if (tw.body !== body) {
      tw.body = body;
      tw.last = null;
    }
    const alpha = this.crowd.alpha;
    const b = sim.bodies;
    const x = sim.prevX[body]! + (b.x[body]! - sim.prevX[body]!) * alpha;
    const z = sim.prevZ[body]! + (b.z[body]! - sim.prevZ[body]!) * alpha;
    const heading = sim.prevHeading[body]! + angleDelta(sim.prevHeading[body]!, sim.heading[body]!) * alpha;
    const moved = tw.last ? Math.hypot(x - tw.last.x, z - tw.last.z) : 0;
    tw.last = { x, z };
    const broken = (sim.wagonParts(body)?.wheels ?? []).map((w) => !sim.live[w] || !b.alive[w]);
    tw.model.update(dt, x, this.field.heightAt(x, z), z, heading, broken, moved, sim.knockedTime(body), sim.sinkAmount(body));
  }

  /** Draws each catapult where its body is, and the boulders in the air with their growing shadows (GDD §9.1). */
  private updateCatapults(dt: number): void {
    const sim = this.crowd?.sim;
    let n = 0;
    if (sim && this.screen !== 'map') {
      const b = sim.bodies;
      const alpha = this.crowd.alpha;
      for (let i = 0; i < sim.capacity; i++) {
        if (!sim.live[i] || TYPES[sim.type[i]!] !== 'catapult') continue;
        if (n === this.catapults.length) {
          const model = new CatapultModel();
          this.stage.scene.add(model.group);
          this.catapults.push({ model, body: -1, last: null, fallen: false });
        }
        const c = this.catapults[n++]!;
        if (c.body !== i) {
          c.body = i;
          c.last = null;
          c.fallen = false;
        }
        const x = sim.prevX[i]! + (b.x[i]! - sim.prevX[i]!) * alpha;
        const z = sim.prevZ[i]! + (b.z[i]! - sim.prevZ[i]!) * alpha;
        const heading = sim.prevHeading[i]! + angleDelta(sim.prevHeading[i]!, sim.heading[i]!) * alpha;
        const moved = c.last ? Math.hypot(x - c.last.x, z - c.last.z) : 0;
        c.last = { x, z };
        const fell = sim.knockedTime(i);
        if (fell >= 0 && !c.fallen) {
          c.fallen = true;
          this.effects.puff(tmpA.set(x, b.y[i]! + 1, z), PUFFS.knock);
          this.audio.play('splinter', { gain: Math.max(0.6, this.near(x, z)), rate: 0.7 });
        }
        c.model.update(dt, x, this.field.heightAt(x, z), z, heading, moved, fell, sim.sinkAmount(i));
      }
      this.boulders.update(sim.boulders, alpha, 1 / CROWD.tickRate);
    } else {
      this.boulders.update([], 1, 1);
    }
    for (let k = n; k < this.catapults.length; k++) {
      this.catapults[k]!.model.hide();
      this.catapults[k]!.body = -1;
    }
  }

  // ---- Sound and juice (M8) ------------------------------------------------------------------------------------

  /** A sound out in the field fades with distance from the hero (GDD §17). */
  private near(x: number, z: number): number {
    const d = Math.hypot(x - this.hero.position.x, z - this.hero.position.z);
    const { near, far, floor } = DISTANCE;
    return d <= near ? 1 : Math.max(floor, 1 - ((d - near) / (far - near)) * (1 - floor));
  }

  /** A beat's freeze on a big hit (game time nearly stops for `seconds` of real time). */
  private stopFor(seconds: number): void {
    this.hitStop = Math.max(this.hitStop, seconds);
  }

  /** Music and ambience follow the screen and the battle's phase (GDD §17). */
  private updateBeds(): void {
    const battle = this.battle;
    let music: MusicName | null = null;
    if (this.screen === 'map') music = 'musicBreak';
    else if (battle) {
      const phase = battle.phase;
      if (phase === 'wave') music = bossWave(battle.def) === battle.wave ? 'musicBoss' : 'musicWave';
      else if (phase === 'ready' || phase === 'break') music = 'musicBreak';
    }
    this.audio.setMusic(music);
    this.audio.setAmbience(this.screen !== 'map');
  }

  // ---- The frame -----------------------------------------------------------------------------------------------

  private update(rawDt: number): void {
    const battle = this.battle;
    this.clock += rawDt;
    const stopped = this.hitStop > 0;
    if (stopped) this.hitStop = Math.max(0, this.hitStop - rawDt);
    const dt = rawDt * (battle?.timeScale ?? 1) * (stopped ? HIT_STOP.scale : 1);
    this.updateBeds();
    this.deliveries.update(dt);
    this.input.update(dt);
    const playing = this.mode === 'play' && this.screen !== 'map';
    const heroUp = !battle || battle.heroUp;
    // The army reveal: any press skips; meanwhile the hero stands still and can't be hurt (GDD §4.3).
    if (this.reveal.active && this.input.presses > this.revealPresses) this.reveal.skip();
    const revealWeight = this.reveal.update(dt);
    // The ending's camera holds over everything (M10).
    this.ending?.update(rawDt);
    this.rig.shotWeight = this.ending?.framing ? 1 : revealWeight;
    const revealing = this.reveal.active;
    if (battle) battle.shielded = revealing;
    // Prompts and the target diamond step aside while the reveal's nameplate shows (guide.css).
    if (revealing !== this.wasRevealing) {
      this.wasRevealing = revealing;
      document.getElementById('game')?.classList.toggle('is-revealing', revealing);
    }
    const fighting = !revealing && (!battle || battle.phase === 'wave' || battle.phase === 'ready' || battle.phase === 'break');
    if (playing) {
      const raw = this.input.consumeLook();
      const active = this.input.sinceLook < 0.15 || Math.hypot(this.input.moveX, this.input.moveY) > 0.1;
      const look = this.combat.steerLook(dt, raw, active);
      this.rig.look(look.x, look.y);
      const canMove = heroUp && fighting;
      // The minigun's weight slows him while it fires (GDD §8.1); its barrels spin in his hand.
      const gun = this.combat.gun;
      const walk = gun.firing ? (gun.def.firingWalk ?? 1) : 1;
      this.hero.setGunSpin(gun.spin);
      const facing = this.ending?.framing ? this.ending.heroYaw : this.rig.yaw;
      this.hero.update(dt, canMove ? this.input.moveX : 0, canMove ? this.input.moveY : 0, facing, (battle?.stats.speed ?? HERO.speed) * walk);
      if (this.started) {
        this.state.stats.playSeconds += dt;
        this.sinceSave += dt;
        if (this.sinceSave > AUTOSAVE_SECONDS) this.save();
      }
    }
    if (playing && battle) battle.update(dt);
    this.rosieFigure?.update(dt, this.hero.position, battle?.phase === 'break' && !this.shop.isOpen, GREYBOX.bannerAt);
    if (battle?.phase === 'defeat') {
      this.defeatTip = Math.min(1, this.defeatTip + rawDt * 1.4);
      this.field.tipBanner(this.defeatTip);
    }
    this.rig.update(dt, this.hero.position, this.stage.portrait);
    if (this.screen !== 'map') this.crowd.update(dt, playing, this.hero.position, this.stage.camera.position);
    if (playing) {
      const touch = this.input.isTouch;
      const canShoot = heroUp && fighting && !this.shop.isOpen;
      const autoFire = canShoot && this.started && (touch ? this.settings.autoFireTouch : this.settings.autoFireMouse);
      let reload = this.input.consume('reload');
      if (this.input.consume('swap') && !battle?.swap()) reload = true;
      if (this.input.consume('grenade')) this.throwGrenade();
      if (this.input.consume('next')) void this.requestNextWave();
      if (this.input.consume('support')) this.callSupport();
      // The ending: he stands at ease (no aiming stance, nothing fired).
      const atEase = this.ending?.framing ?? false;
      this.hero.relax(atEase);
      if (!atEase) this.combat.update(dt, this.crowd, canShoot && this.input.fireHeld, autoFire, reload, touch);
      this.updateShopRing();
    }
    // Battle 1: the ammo ring appears at the first reload (onboarding §3). The body plays each reload once.
    const reloading = this.combat.gun.reloading;
    if (reloading > 0) this.touch.reveal('gun', true);
    if (reloading > 0 && this.lastReload <= 0) this.hero.reload(reloading);
    this.lastReload = reloading;
    this.onboarding.update(dt);
    this.updateCrate(dt);
    this.updateCharges();
    this.updateWagon(dt);
    this.updateRams(dt);
    this.updateCatapults(dt);
    this.updateTower(dt);
    this.updateOx(dt);
    this.escape?.update(dt, this.groundAt, this.hoofDust);
    if (this.resultWaiting && !this.escape?.active) {
      this.resultWaiting = false;
      this.showResult();
    }
    this.markers.update(dt);
    this.rosie.update(dt);
    this.hud.showCrosshairDuring(!revealing);
    this.coins.update(dt, this.hero.position, battle?.stats.magnet ?? 5);
    this.grenades.update(dt, this.crowd.sim);
    this.strike.update(dt);
    if (this.screen === 'battle') this.sentries.update(dt, this.crowd.sim, this.crowd);
    this.field.update(dt);
    this.updateBattleHud(dt);
    this.updateArrows();
    this.stage.setFovPunch(this.rig.fovPunch);
    // The hero turns see-through when the camera is pushed in close (GDD §5.1).
    const d = this.rig.heroDistance;
    const fade = d >= CAMERA.fadeDistance ? 1 : d > CAMERA.ghostDistance ? CAMERA.fadeOpacity : CAMERA.ghostOpacity;
    this.heroOpacity = damp(this.heroOpacity, fade, 12, dt);
    this.hero.setOpacity(this.heroOpacity);
    this.effects.update(dt);
    this.hud.update(dt, this.stage.camera, this.stage.width, this.stage.height);
    this.touch.update(this.input);
    const p = this.hero.position;
    this.stage.setShadowFocus(p.x, p.y, p.z, 60);
    this.stage.sampleFps(rawDt);
    // The map covers the whole screen: don't spend power drawing the field under it.
    if (this.screen !== 'map') this.stage.render();
  }

  /**
   * A health bar floats over the big ones (GDD §9.1: the Brute, the ram), at most three, while up. Placed where
   * the crowd is drawn this frame (between ticks), so it doesn't step.
   */
  private updateChampions(): void {
    const sim = this.crowd.sim;
    const b = sim.bodies;
    const alpha = this.crowd.alpha;
    let n = 0;
    if (this.screen === 'battle') {
      for (let i = 0; i < sim.capacity && n < this.championSpots.length; i++) {
        if (!sim.live[i] || !HEALTH_BAR[sim.type[i]!] || !sim.isUp(i)) continue;
        const spot = this.championSpots[n]!;
        const x = sim.prevX[i]! + (b.x[i]! - sim.prevX[i]!) * alpha;
        const z = sim.prevZ[i]! + (b.z[i]! - sim.prevZ[i]!) * alpha;
        spot.at.set(x, b.y[i]! + b.height[i]! + 0.35, z);
        spot.fraction = b.hp[i]! / b.maxHp[i]!;
        n++;
      }
    }
    this.hud.setChampions(this.championSpots, n);
  }

  private updateBattleHud(dt: number): void {
    const battle = this.battle;
    if (!battle) return;
    const hud = this.battleHud;
    hud.setGold(this.state.gold);
    hud.setBanner(battle.banner / battle.bannerMax, battle.phase === 'wave' && this.crowd.sim.pressure(GREYBOX.bannerAt.x, GREYBOX.bannerAt.z, 6, () => 1) > 0);
    // A boss wave: his health bar in place of the enemies bar (GDD §9.3).
    const sim = this.crowd.sim;
    const boss = sim.bossUp;
    const bossDef = boss >= 0 ? SOLDIERS[TYPES[sim.type[boss]!]!] : null;
    if (bossDef?.bossName && isStringKey(bossDef.bossName)) hud.setBoss(t(bossDef.bossName), sim.bodies.hp[boss]! / sim.bodies.maxHp[boss]!);
    else hud.setBoss(null);
    this.updateChampions();
    hud.setEnemies(battle.enemiesLeft, Math.max(1, battle.enemiesTotal));
    hud.setHealth(battle.heroHp / battle.stats.health);
    hud.setKnocked(battle.knocked);
    const grenadesOn = battle.stats.grenades > 0;
    this.touch.reveal('grenade', grenadesOn);
    hud.setGrenades(battle.grenades, grenadesOn);
    const supportOn = battle.supportOn;
    if (supportOn && battle.supportCalls > 0) this.touch.reveal('support', true);
    hud.setSupport(battle.support, supportOn);
    // The support button shows the call-in E calls now.
    const kind = battle.supportKind;
    if (kind !== this.supportIcon) {
      this.supportIcon = kind;
      const old = this.touch.buttons.support.querySelector('svg');
      const holder = document.createElement('span');
      holder.innerHTML = kind === 'sentryGun' ? ICONS.sentry : ICONS.support;
      if (old && holder.firstElementChild) old.replaceWith(holder.firstElementChild);
    }
    hud.update(dt);
  }

  /** Off-screen arrows (GDD §15.3): the banner under attack, the truck in a break, squads arriving. */
  private updateArrows(): void {
    const battle = this.battle;
    const edges = this.edges;
    edges.begin();
    if (battle && this.screen === 'battle' && !this.reveal.active && this.mode === 'play') {
      const camera = this.stage.camera;
      camera.updateMatrixWorld();
      const { width, height } = this.stage;
      const { bannerAt, shopSpot } = GREYBOX;
      if (battle.phase === 'wave' && this.crowd.sim.pressure(bannerAt.x, bannerAt.z, 6, () => 1) > 0) {
        edges.point(camera, tmpA.set(bannerAt.x, this.field.heightAt(bannerAt.x, bannerAt.z) + 3, bannerAt.z), 'banner', width, height);
      }
      if (battle.phase === 'break' && !this.shop.isOpen) edges.point(camera, tmpA.set(shopSpot.x, 1, shopSpot.z), 'truck', width, height);
      if (battle.phase === 'break' && this.crate.landed && !this.offer.open) {
        edges.point(camera, tmpA.copy(this.crate.at).setY(this.crate.at.y + 0.6), 'crate', width, height);
      }
      const sim = this.crowd.sim;
      for (const squad of sim.squads) {
        if (squad.team !== ENEMY || squad.standing <= 0 || sim.time - squad.spawnedAt > 5) continue;
        edges.point(camera, tmpA.set(squad.anchorX, 1, squad.anchorZ), 'squad', width, height);
      }
    }
    edges.end();
  }

  /**
   * The call-in in use (GDD §8.3). The Sentry Gun drops beside the hero, to his right and a little ahead. The Rift
   * Strike goes at the aim point, snapped to the densest group nearby: a red circle, then shells.
   */
  private callSupport(): void {
    const battle = this.battle;
    if (!battle) return;
    if (battle.supportKind === 'sentryGun') {
      if (this.sentries.standing >= SENTRY.most || !battle.takeSupport()) return;
      const yaw = this.rig.yaw;
      const p = this.hero.position;
      const x = p.x + Math.cos(yaw) * SENTRY.side - Math.sin(yaw) * SENTRY.ahead;
      const z = p.z - Math.sin(yaw) * SENTRY.side - Math.cos(yaw) * SENTRY.ahead;
      this.sentries.drop(x, z, yaw);
      this.audio.play('rift', { gain: 1, rate: 1.15 });
      return;
    }
    if (this.strike.active || !battle.takeSupport()) return;
    const to = this.grenades.target(this.crowd.sim, this.hero.position, this.combat.aimPoint, tmpB, RIFT_STRIKE.range, RIFT_STRIKE.snap);
    this.strike.start(to.x, to.z);
    this.audio.play('rift', { gain: 1.2 });
  }

  /** A shell lands: the Baron's men within its blast are hurt and knocked about; shields break (GDD §8.3). */
  private strikeShell(at: THREE.Vector3): void {
    const sim = this.crowd.sim;
    const b = sim.bodies;
    for (let i = 0; i < sim.capacity; i++) {
      if (!b.alive[i] || sim.team[i] !== ENEMY) continue;
      const dx = b.x[i]! - at.x;
      const dz = b.z[i]! - at.z;
      if (Math.hypot(dx, dz) > RIFT_STRIKE.blast + b.radius[i]!) continue;
      sim.explode(i, RIFT_STRIKE.damage, dx, dz);
    }
    this.effects.puff(tmpA.copy(at).setY(at.y + 0.4), PUFFS.blast);
    this.audio.play('blast', { gain: Math.max(0.5, this.near(at.x, at.z)), rate: 0.85 + Math.random() * 0.25 });
    if (Math.hypot(at.x - this.hero.position.x, at.z - this.hero.position.z) < 14) this.rig.kick(0.5, 0.3, 0.5);
  }

  private throwGrenade(): void {
    const battle = this.battle;
    if (!battle || !battle.takeGrenade()) return;
    const to = this.grenades.target(this.crowd.sim, this.hero.position, this.combat.aimPoint, tmpB);
    this.hero.throwGrenade();
    this.audio.play('throw');
    this.hero.muzzle(tmpA);
    this.grenades.throw(tmpA, to);
  }

  /**
   * A charge's wind-up (GDD §9.3): its lane glows on the ground until the run starts. Dev: `?boss=2` takes the boss
   * to his second phase as soon as he's on the field.
   */
  private updateCharges(): void {
    const sim = this.crowd?.sim;
    if (!sim) return;
    // Every glowing wind-up gets its lane (Battle 11 has two Brutes).
    const lanes: LaneSpec[] = [];
    if (this.screen === 'battle' && !this.ending?.active) {
      for (let i = sim.windingUp(); i >= 0 && lanes.length < 3; i = sim.windingUp(i + 1)) {
        const c = SOLDIERS[TYPES[sim.type[i]!]!].charge!;
        lanes.push({
          x: sim.bodies.x[i]!,
          z: sim.bodies.z[i]!,
          dirX: sim.chargeX[i]!,
          dirZ: sim.chargeZ[i]!,
          length: c.speed * c.seconds,
          width: sim.bodies.radius[i]! * 2 + 1.2,
        });
      }
    }
    this.markers.setLanes(lanes);
    if (this.devBossPhase && sim.bossUp >= 0) {
      this.devBossPhase = false;
      const b = sim.bossUp;
      sim.damage(b, sim.bodies.hp[b]! - sim.bodies.maxHp[b]! * 0.49, 0, 1);
    }
  }

  // ---- Ads: interstitials at natural stops, rewarded offers (GDD §16) ----------------------------------------------

  /** Whether a rewarded placement is on: ads in this build and its switch in `content/ads.ts`. */
  private offerable(placement: RewardPlacement): boolean {
    if (!this.session.adsAvailable) return false;
    const r = ADS.rewarded;
    return placement === 'double' ? r.doubleGold : placement === 'rally' ? r.rally : r.riftCrate;
  }

  /** A new battle or the map: no crate, no offer, no pending flags. */
  private resetOffers(): void {
    this.crate.remove();
    this.offer.hide();
    this.crateState = 'none';
    this.crateLoan = null;
    this.rewardedHere = false;
    this.lastPhase = null;
  }

  /** Next wave (the button or Enter): from Battle 2, an interstitial first, unless a rewarded ad played this break. */
  private async requestNextWave(): Promise<void> {
    const battle = this.battle;
    if (!battle || battle.phase !== 'break' || !this.battleHud.nextAllowed || this.adPending || this.offer.open) return;
    if (commercialAllowed('nextWave', battle.id, this.rewardedHere)) {
      this.adPending = true;
      this.battleHud.showNext(false);
      await this.session.commercialBreak();
      this.adPending = false;
      if (this.battle !== battle || battle.phase !== 'break') return;
    }
    battle.nextWave();
  }

  /** Continue or Retry on a result card: from Battle 2, an interstitial first, unless a rewarded ad played on it. */
  private async leaveCard(go: () => void): Promise<void> {
    const battle = this.battle;
    if (this.adPending) return;
    if (battle && commercialAllowed('result', battle.id, this.rewardedHere)) {
      this.adPending = true;
      await this.session.commercialBreak();
      this.adPending = false;
    }
    go();
  }

  /**
   * A rewarded ad the player chose: measured, then granted only on success (Poki rule). A failed, skipped or blocked
   * ad grants nothing and shows no message.
   */
  private async watchReward(placement: RewardPlacement, grant: () => void, failed: () => void): Promise<void> {
    if (this.adPending) return;
    this.session.measure('rewarded', placement, 'interact');
    this.adPending = true;
    const ok = await this.session.rewardedBreak();
    this.adPending = false;
    if (ok) {
      this.rewardedHere = true;
      grant();
    } else {
      failed();
    }
    this.save();
  }

  /** Rally granted: the defeat card goes, the battle picks up its wave with the banner at half. */
  private rally(): void {
    const battle = this.battle;
    if (!battle) return;
    this.result.hide();
    battle.rally();
    this.defeatTip = 0;
    this.field.tipBanner(0);
    this.mode = 'play';
    this.input.setEnabled(true);
    this.crowd.sim.cheer(ALLY);
    this.battleHud.toast(t('battle.rallied'), 2);
    this.audio.play('rout');
    document.getElementById('game')?.classList.remove('is-down');
    this.syncGameplay();
  }

  /** The battle's first break: the crate drops beside the truck, if there's a gun to lend. */
  private dropCrate(): void {
    const battle = this.battle;
    const gun = battle ? crateGun(this.state, battle.reached) : null;
    if (!gun) {
      this.crateState = 'done';
      return;
    }
    this.crateLoan = gun;
    this.crateState = 'dropped';
    const { crateAt } = GREYBOX;
    this.crate.drop(crateAt.x, crateAt.z);
    this.audio.play('rift');
    if (!this.state.seenLessons.includes('crate')) this.state.seenLessons.push('crate');
  }

  /** Walking up to a landed crate opens its offer (No thanks first). */
  private updateCrate(dt: number): void {
    this.crate.update(dt);
    const battle = this.battle;
    if (!battle || battle.phase !== 'break' || !this.crate.landed || this.offer.open || this.adPending || this.shop.isOpen) return;
    if (this.crate.distance(this.hero.position.x, this.hero.position.z) > ADS.rewarded.riftCrateReach) return;
    const gun = this.crateLoan;
    if (!gun) return;
    const name = t(`gun.${gun}`);
    this.input.releasePointer();
    this.input.setEnabled(false);
    this.offer.show(t('offer.crate', { gun: name }), t('offer.crateText'), () => this.closeCrate(), {
      label: t('offer.open'),
      onPress: () =>
        void this.watchReward(
          'crate',
          () => {
            battle.lend(gun);
            this.battleHud.toast(t('battle.loan', { gun: name }), 2.6);
            this.audio.play('buy');
            this.closeCrate();
          },
          () => this.closeCrate(),
        ),
    });
    this.session.measure('rewarded', 'crate', 'visible');
  }

  /** The crate goes in a puff (taken, declined, or its break is over). */
  private closeCrate(): void {
    if (this.crate.active) this.effects.puff(tmpA.copy(this.crate.at).setY(this.crate.at.y + 0.4), PUFFS.knock);
    this.crate.remove();
    this.offer.hide();
    this.crateState = 'done';
    if (this.mode === 'play' && this.screen === 'battle' && !this.result.open) this.input.setEnabled(true);
  }

  // ---- Poki, pause and ads -------------------------------------------------------------------------------------

  /**
   * Poki's gameplay events follow one rule: on while a wave (or its countdown) runs in play, after the first input,
   * and in dev scenes; off in breaks, on the map, on cards, in pause and in ads (GDD §4.7, §16).
   */
  private syncGameplay(): void {
    const phase = this.battle?.phase;
    const live = this.screen === 'sandbox' || (this.screen === 'battle' && (phase === 'wave' || phase === 'ready'));
    if (this.started && this.mode === 'play' && live) this.session.gameplayStart();
    else this.session.gameplayStop();
  }

  private onFirstInput(): void {
    this.started = true;
    this.audio.unlock();
    // Battle 1's script reveals the crosshair at its aim step.
    this.hud.showCrosshair(!this.onboarding.scripted || this.onboarding.step !== 'move');
    this.syncGameplay();
  }

  /** Pause (Esc, P, the button, or losing the mouse): stops gameplay for Poki and frees the pointer. */
  openPause(): void {
    if (this.offer.open) {
      this.closeCrate();
      return;
    }
    if (this.shop.isOpen && !this.shopFromMap) {
      this.closeShop(true);
      return;
    }
    if (this.mode !== 'play' || this.screen === 'map' || this.result.open) return;
    this.mode = 'paused';
    this.input.releasePointer();
    this.input.setEnabled(false);
    this.audio.silence(true);
    this.syncGameplay();
    this.save();
    this.pause.show(true, this.screen === 'battle', this.settings, this.input.isTouch);
  }

  resume(): void {
    if (this.mode !== 'paused') return;
    this.pause.show(false);
    this.mode = 'play';
    this.input.setEnabled(true);
    this.audio.silence(false);
    this.syncGameplay();
  }

  /** Pause → Back to map: the battle ends where it is (gold is kept; it isn't a defeat). */
  private retreat(): void {
    this.pause.show(false);
    this.mode = 'play';
    this.audio.silence(false);
    this.showMap(this.battle?.id);
  }

  /** Called by the platform session when an ad really starts: silence, freeze and free the mouse. */
  onAdStart(): void {
    if (this.mode === 'busy') return;
    this.modeBeforeAd = this.mode;
    this.mode = 'busy';
    this.input.releasePointer();
    this.input.setEnabled(false);
    this.audio.silence(true);
  }

  onAdEnd(): void {
    if (this.mode !== 'busy') return;
    this.mode = this.modeBeforeAd;
    this.audio.silence(false);
    this.input.setEnabled(this.mode === 'play' && this.screen !== 'map' && !this.result.open && !this.offer.open);
  }

  save(): void {
    this.sinceSave = 0;
    this.store.save(this.state);
  }

  /** A new language (M11): the labels built once, and whatever is on screen, redone in it. */
  private applyLanguage(code: string): void {
    setLanguage(SUPPORTED_LANGUAGES.includes(code) ? code : 'en');
    document.documentElement.lang = currentLanguage();
    const game = document.getElementById('game');
    if (game) relabel(game);
    this.pause.refresh();
    this.map.refresh();
    if (this.shop.isOpen) this.shop.refresh();
    if (this.battle) {
      const battle = this.battle;
      this.showWave(battle, battle.phase === 'wave' ? battle.wave + 1 : battle.wave + 2);
    }
  }

  setSettings(settings: Settings): void {
    this.settings = settings;
    this.store.saveSettings(settings);
    this.applySettings();
  }

  private applySettings(): void {
    const s = this.settings;
    if (s.language && s.language !== currentLanguage()) this.applyLanguage(s.language);
    this.input.sensitivity = s.sensitivity;
    this.input.invertY = s.invertY;
    this.input.leftHanded = s.leftHanded;
    document.getElementById('game')?.classList.toggle('is-left-handed', s.leftHanded);
    document.getElementById('game')?.classList.toggle('is-reduced-motion', s.reducedMotion);
    this.haptics.enabled = s.vibration && this.input.isTouch;
    this.audio.setSoundOn(s.sound);
    this.audio.setVolume(s.volume);
    this.audio.setMusicVolume(s.music);
    this.rig.shake = s.reducedMotion ? CAMERA.shake.low * 0.5 : CAMERA.shake[s.shake];
    this.combat.configure(this.input.isTouch, s);
    this.stage.hudScale = s.hudScale;
    if (this.stage.quality !== s.quality) this.stage.setQuality(s.quality);
    else this.stage.resize();
  }
}

/** Poki's battle ids for measures: b01…b20 (GDD §21). */
function battleKey(id: number): string {
  return `b${String(id).padStart(2, '0')}`;
}
