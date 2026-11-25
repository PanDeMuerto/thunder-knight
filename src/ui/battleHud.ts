import { t } from '@/content/strings';
import { el, label, pulse, setText, toggle } from './dom';
import { ICONS } from './icons';

/**
 * The battle's own HUD (GDD §15.3–15.4), small and at the edges:
 * - top left, after Pause: gold
 * - top centre: the wave, the banner's bar (blue) and the enemies-left bar (red)
 * - bottom left: the hero's health
 * - a toast under the bars ("Wave cleared! +30"), the Next wave button in breaks, the knocked-out countdown
 * M4 reveals these one at a time for new players and tunes them on every screen size.
 */
/** HUD parts that onboarding reveals one at a time (onboarding §3). A revealed part stays revealed. */
export type HudPart = 'gold' | 'banner' | 'wave' | 'health' | 'next';

/** How far a long toast's font may shrink before it takes a second line. */
const TOAST_SHRINK = 0.74;

export class BattleHud {
  readonly root: HTMLElement;
  private readonly gold: HTMLElement;
  private readonly goldText: HTMLElement;
  private readonly top: HTMLElement;
  private readonly wave: HTMLElement;
  private readonly banner: HTMLElement;
  private readonly bannerFill: HTMLElement;
  private readonly enemies: HTMLElement;
  private readonly enemiesFill: HTMLElement;
  private readonly enemiesIcon: HTMLElement;
  private readonly bossName: HTMLElement;
  private bossShown = false;
  private readonly health: HTMLElement;
  private readonly healthFill: HTMLElement;
  private readonly toastNode: HTMLElement;
  readonly next: HTMLButtonElement;
  private readonly knocked: HTMLElement;
  private readonly knockedText: HTMLElement;
  private readonly grenades: HTMLElement;
  private readonly supportCount: HTMLElement;
  private toastTimer = 0;
  private shownGold = -1;
  private targetGold = 0;
  private values = { banner: -1, enemies: -1, health: -1 };
  private readonly objective: HTMLElement;
  private readonly plate: HTMLElement;
  private plateTimer = 0;
  private readonly parts: Record<Exclude<HudPart, 'next'>, HTMLElement>;
  private nextAllowed_ = true;

  constructor(parent: HTMLElement, grenadeButton: HTMLElement, supportButton: HTMLElement, onNext: () => void) {
    this.root = el('div', 'battle-hud is-hidden', parent);
    this.gold = el('div', 'hud-gold', this.root);
    el('span', 'hud-gold-icon', this.gold, ICONS.coin);
    this.goldText = el('span', 'hud-gold-text', this.gold);
    this.top = el('div', 'hud-top', this.root);
    this.wave = el('div', 'hud-wave', this.top);
    this.bossName = el('div', 'hud-boss-name', this.top);
    const bars = el('div', 'hud-bars', this.top);
    this.banner = el('div', 'hud-bar hud-banner', bars);
    el('span', 'hud-bar-icon', this.banner, ICONS.flag);
    this.bannerFill = el('i', 'hud-bar-fill', el('span', 'hud-bar-track', this.banner));
    this.enemies = el('div', 'hud-bar hud-enemies', bars);
    this.enemiesIcon = el('span', 'hud-bar-icon', this.enemies, ICONS.swords);
    this.enemiesFill = el('i', 'hud-bar-fill', el('span', 'hud-bar-track', this.enemies));
    this.objective = el('div', 'hud-objective is-hidden', this.top);
    // The toast stacks under the bars and the objective, so the three never cover each other.
    this.toastNode = el('div', 'hud-toast is-hidden', this.top);
    this.plate = el('div', 'nameplate is-hidden', this.root);
    this.health = el('div', 'hud-health', this.root);
    el('span', 'hud-bar-icon', this.health, ICONS.heart);
    this.healthFill = el('i', 'hud-bar-fill', el('span', 'hud-bar-track', this.health));
    this.next = el('button', 'btn-next is-hidden', this.root);
    this.next.type = 'button';
    el('span', 'btn-next-icon', this.next, ICONS.swords);
    label(el('span', 'btn-next-text', this.next), 'nextWave');
    el('span', 'key-cap', this.next, 'Enter');
    this.next.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.next.addEventListener('click', (e) => {
      e.stopPropagation();
      onNext();
    });
    this.knocked = el('div', 'hud-knocked is-hidden', this.root);
    this.knockedText = el('span', '', this.knocked);
    this.grenades = el('span', 'btn-count', grenadeButton);
    this.supportCount = el('span', 'btn-count', supportButton);
    this.parts = { gold: this.gold, banner: this.banner, wave: this.wave, health: this.health };
  }

  /**
   * Shows or hides a part. New players see the HUD grow as the battle needs it (onboarding §3); everyone else sees
   * it all. `next` allows or holds back the Next wave button.
   */
  reveal(part: HudPart, shown: boolean): void {
    if (part === 'next') {
      this.nextAllowed_ = shown;
      if (!shown) toggle(this.next, 'is-hidden', true);
      return;
    }
    toggle(this.parts[part], 'is-veiled', !shown);
    if (part === 'wave') toggle(this.enemies, 'is-veiled', !shown);
    if (part === 'gold') this.fit();
  }

  /** Whether the Next wave button may show (onboarding holds it back in Battle 1 until its step). */
  get nextAllowed(): boolean {
    return this.nextAllowed_;
  }

  /** The army reveal's nameplate for a new enemy type ("Captain: they'll run!", GDD §4.3). */
  nameplate(text: string, seconds: number): void {
    setText(this.plate, text);
    toggle(this.plate, 'is-hidden', false);
    pulse(this.plate, 'is-in');
    this.plateTimer = seconds;
  }

  /** The objective line under the bars ("Protect the banner"), or null. */
  setObjective(text: string | null): void {
    toggle(this.objective, 'is-hidden', !text);
    if (text) setText(this.objective, text);
  }

  show(shown: boolean): void {
    toggle(this.root, 'is-hidden', !shown);
    if (shown) this.fit();
  }

  /** A new battle: no leftover toast, nameplate, objective or countdown. */
  clear(): void {
    this.toastTimer = this.plateTimer = 0;
    toggle(this.toastNode, 'is-hidden', true);
    toggle(this.plate, 'is-hidden', true);
    this.setObjective(null);
    this.setKnocked(0);
  }

  /** Gold counts up toward the new value rather than jumping. */
  setGold(gold: number, instant = false): void {
    if (gold > this.targetGold && !instant && this.shownGold >= 0) pulse(this.gold, 'is-up');
    this.targetGold = gold;
    if (instant || this.shownGold < 0) {
      this.shownGold = gold;
      this.setGoldText(gold.toLocaleString('en-US'));
    }
  }

  setWave(n: number, total: number): void {
    setText(this.wave, t('battle.wave', { n, total }));
  }

  /** The wave label's own text (a Last Stand's "Wave 12 · best 17"). */
  setWaveText(text: string): void {
    setText(this.wave, text);
  }

  /** 0 to 1 of the banner's health; `max` above 1 with Banner upgrades. */
  setBanner(fraction: number, hurt: boolean): void {
    const v = Math.round(Math.max(0, Math.min(1, fraction)) * 200) / 200;
    if (v !== this.values.banner) {
      this.values.banner = v;
      this.bannerFill.style.transform = `scaleX(${v})`;
    }
    toggle(this.banner, 'is-hurt', hurt);
  }

  /**
   * During a boss wave the enemies bar becomes the boss's health bar, with his name over it (GDD §9.3). Null when
   * there's no boss standing.
   */
  setBoss(name: string | null, fraction = 0): void {
    const on = name !== null;
    if (on !== this.bossShown) {
      this.bossShown = on;
      toggle(this.top, 'has-boss', on);
      toggle(this.enemies, 'is-boss', on);
      this.enemiesIcon.innerHTML = on ? ICONS.shield : ICONS.swords;
    }
    if (!on) return;
    setText(this.bossName, name);
    const v = Math.round(Math.max(0, Math.min(1, fraction)) * 400) / 400;
    if (v !== this.values.enemies) {
      this.values.enemies = v;
      this.enemiesFill.style.transform = `scaleX(${v})`;
    }
  }

  setEnemies(left: number, total: number): void {
    if (this.bossShown) return;
    const v = total > 0 ? Math.round((left / total) * 200) / 200 : 0;
    if (v !== this.values.enemies) {
      this.values.enemies = v;
      this.enemiesFill.style.transform = `scaleX(${v})`;
    }
  }

  setHealth(fraction: number): void {
    const v = Math.round(Math.max(0, Math.min(1, fraction)) * 200) / 200;
    if (v === this.values.health) return;
    this.values.health = v;
    this.healthFill.style.transform = `scaleX(${v})`;
    toggle(this.health, 'is-low', v < 0.3);
  }

  setGrenades(count: number, available: boolean): void {
    setText(this.grenades, available ? String(count) : '');
    toggle(this.grenades.parentElement!, 'is-empty', available && count === 0);
  }

  /** The support button's charges this wave (GDD §8.3). */
  setSupport(count: number, available: boolean): void {
    setText(this.supportCount, available ? String(count) : '');
    toggle(this.supportCount.parentElement!, 'is-empty', available && count === 0);
  }

  toast(text: string, seconds = 2.2): void {
    setText(this.toastNode, text);
    toggle(this.toastNode, 'is-hidden', false);
    this.fitToast();
    pulse(this.toastNode, 'is-in');
    this.toastTimer = seconds;
  }

  /**
   * Keeps a toast within the bars' width (M11: other languages run longer, and Rosie's bubble and Poki's pill sit
   * either side): a smaller font first, down to about three quarters, and only then a second line.
   */
  private fitToast(): void {
    const node = this.toastNode;
    node.style.fontSize = '';
    toggle(node, 'is-wrapped', false);
    const room = this.top.clientWidth;
    if (room <= 0) return;
    const full = parseFloat(getComputedStyle(node).fontSize);
    let size = full;
    while (node.offsetWidth > room && size > full * TOAST_SHRINK) {
      size -= 0.5;
      node.style.fontSize = `${size}px`;
    }
    if (node.offsetWidth > room) toggle(node, 'is-wrapped', true);
  }

  showNext(shown: boolean, label = t('nextWave')): void {
    toggle(this.next, 'is-hidden', !shown || !this.nextAllowed_);
    setText(this.next.querySelector('.btn-next-text')!, label);
  }

  /** Seconds left before the hero gets up, or 0 to hide. */
  setKnocked(seconds: number): void {
    toggle(this.knocked, 'is-hidden', seconds <= 0);
    if (seconds > 0) setText(this.knockedText, t('battle.knocked', { s: Math.ceil(seconds) }));
  }

  update(dt: number): void {
    if (this.plateTimer > 0) {
      this.plateTimer -= dt;
      if (this.plateTimer <= 0) toggle(this.plate, 'is-hidden', true);
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) toggle(this.toastNode, 'is-hidden', true);
    }
    if (this.shownGold !== this.targetGold) {
      const step = Math.max(1, Math.abs(this.targetGold - this.shownGold) * Math.min(1, dt * 8));
      this.shownGold += Math.sign(this.targetGold - this.shownGold) * Math.min(step, Math.abs(this.targetGold - this.shownGold));
      this.setGoldText(Math.round(this.shownGold).toLocaleString('en-US'));
    }
  }

  /**
   * The bars stay centred unless the gold pill would touch them (a narrow screen, a big HUD, a lot of gold); then they
   * move to the top right. Runs when the screen changes and when the gold gains or loses a digit.
   */
  fit(): void {
    toggle(this.top, 'is-right', false);
    const gold = this.gold.getBoundingClientRect();
    const top = this.top.getBoundingClientRect();
    const touches = gold.width > 0 && gold.right + 8 > top.left && gold.bottom > top.top && gold.top < top.bottom;
    toggle(this.top, 'is-right', touches);
  }

  private setGoldText(text: string): void {
    const longer = text.length !== this.goldText.textContent?.length;
    setText(this.goldText, text);
    if (longer) this.fit();
  }
}
