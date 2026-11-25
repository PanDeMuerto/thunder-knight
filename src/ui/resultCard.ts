import { t } from '@/content/strings';
import { el, pulse, toggle } from './dom';
import { ICONS } from './icons';
import { rewardButton, type RewardOffer } from './rewardButton';

export interface VictoryView {
  crowns: number;
  kills: number;
  waves: number;
  firstClear: number;
}

/**
 * The victory and defeat cards (GDD §4.8, §15.5): one title of four words at most, numbers with icons, the primary
 * button first and focused. The rewarded offers (×2 gold on victory, Rally on defeat) come after the standard
 * choices, only when the game passes one (ads on, the placement switched on).
 */
export class ResultCard {
  private readonly layer: HTMLElement;
  private readonly card: HTMLElement;
  private totalText: HTMLElement | null = null;
  private total = 0;

  constructor(parent: HTMLElement) {
    this.layer = el('div', 'card-layer is-hidden', parent);
    this.card = el('div', 'card card-result', this.layer);
  }

  get open(): boolean {
    return !this.layer.classList.contains('is-hidden');
  }

  /** The primary button while the card shows (onboarding points at it). */
  get primary(): HTMLElement | null {
    return this.open ? this.card.querySelector<HTMLElement>('.btn-main') : null;
  }

  hide(): void {
    toggle(this.layer, 'is-hidden', true);
  }

  /**
   * `double`: the 🎬 ×2 gold offer, after Continue. `ending`: Battle 20's first win (M10), "Larkmoor is free!" with
   * Last Stand unlocked, and "To the map".
   */
  showVictory(v: VictoryView, onContinue: () => void, double: RewardOffer | null = null, ending = false): void {
    this.card.replaceChildren();
    this.card.className = `card card-result is-victory${ending ? ' is-ending' : ''}`;
    el('h2', 'card-title', this.card, t(ending ? 'ending.title' : 'victory.title'));
    const crowns = el('div', 'result-crowns', this.card);
    for (let i = 0; i < 3; i++) el('span', `result-crown${i < v.crowns ? ' is-on' : ''}`, crowns, ICONS.crown);
    const rows = el('div', 'result-rows', this.card);
    this.row(rows, t('victory.kills'), v.kills);
    this.row(rows, t('victory.waves'), v.waves);
    if (v.firstClear > 0) this.row(rows, t('victory.firstClear'), v.firstClear);
    const total = el('div', 'result-total', this.card);
    el('span', 'hud-gold-icon', total, ICONS.coin);
    this.total = v.kills + v.waves + v.firstClear;
    this.totalText = el('span', '', total, `+${this.total.toLocaleString('en-US')}`);
    if (ending) {
      const unlock = el('div', 'result-unlock', this.card);
      el('span', 'result-unlock-title', unlock, t('ending.unlock'));
      el('span', 'result-unlock-hint', unlock, t('ending.unlockHint'));
    }
    this.button(t(ending ? 'ending.toMap' : 'continue'), 'btn-main', onContinue).focus({ preventScroll: true });
    if (double) rewardButton(this.card, 'double', double);
    toggle(this.layer, 'is-hidden', false);
  }

  /**
   * A Last Stand's end (GDD §13.4): waves held (a stamp on a new best), the field's best, gold kept; Again and Map,
   * and the 🎬 Rally offer to go on from this wave.
   */
  showLastStand(v: { held: number; best: number; newBest: boolean; gold: number }, onAgain: () => void, onMap: () => void, rally: RewardOffer | null = null): void {
    this.card.replaceChildren();
    this.card.className = 'card card-result is-defeat is-stand';
    this.totalText = null;
    el('h2', 'card-title', this.card, t('laststand.over'));
    const held = el('div', 'result-total', this.card);
    el('span', '', held, t('laststand.held', { n: v.held }));
    if (v.newBest) el('span', 'result-stamp is-in', held, t('laststand.newBest'));
    const rows = el('div', 'result-rows', this.card);
    if (!v.newBest) {
      const best = el('div', 'result-row', rows);
      el('span', '', best, t('laststand.bestLabel'));
      el('span', '', best, String(v.best));
    }
    this.row(rows, t('laststand.gold'), v.gold);
    const again = this.button(t('laststand.again'), 'btn-main', onAgain);
    this.button(t('map'), 'btn-second', onMap);
    if (rally) rewardButton(this.card, 'rally', rally);
    again.focus({ preventScroll: true });
    toggle(this.layer, 'is-hidden', false);
  }

  /** `rally`: the 🎬 Rally offer, after Retry and Map. */
  showDefeat(gold: number, onRetry: () => void, onMap: () => void, rally: RewardOffer | null = null): void {
    this.card.replaceChildren();
    this.card.className = 'card card-result is-defeat';
    this.totalText = null;
    el('h2', 'card-title', this.card, t('defeat.title'));
    const keep = el('div', 'result-total', this.card);
    el('span', 'hud-gold-icon', keep, ICONS.coin);
    el('span', '', keep, t('defeat.keep', { gold: gold.toLocaleString('en-US') }));
    const retry = this.button(t('retry'), 'btn-main', onRetry);
    this.button(t('map'), 'btn-second', onMap);
    if (rally) rewardButton(this.card, 'rally', rally);
    retry.focus({ preventScroll: true });
    toggle(this.layer, 'is-hidden', false);
  }

  /** ×2 gold granted: the total counts up a second time, with a stamp; the offer is gone. */
  doubled(extra: number): void {
    this.card.querySelector('.btn-reward')?.remove();
    const node = this.totalText;
    if (!node) return;
    const from = this.total;
    this.total += extra;
    const to = this.total;
    const start = performance.now();
    const tick = (now: number): void => {
      const k = Math.min(1, (now - start) / 900);
      node.textContent = `+${Math.round(from + (to - from) * (1 - (1 - k) ** 3)).toLocaleString('en-US')}`;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const stamp = el('span', 'result-stamp', node.parentElement!, t('victory.doubled'));
    pulse(stamp, 'is-in');
  }

  /** The ad didn't play or gave nothing: the offer quietly goes (no message, Poki rule). */
  withdrawOffer(): void {
    this.card.querySelector('.btn-reward')?.remove();
    this.card.querySelector<HTMLElement>('.btn-main')?.focus({ preventScroll: true });
  }

  private row(parent: HTMLElement, label: string, gold: number): void {
    const r = el('div', 'result-row', parent);
    el('span', '', r, label);
    const v = el('span', 'result-gold', r);
    el('span', 'hud-gold-icon', v, ICONS.coin);
    el('span', '', v, gold.toLocaleString('en-US'));
  }

  private button(label: string, className: string, onClick: () => void): HTMLButtonElement {
    const b = el('button', className, this.card, label);
    b.type = 'button';
    b.addEventListener('click', () => onClick());
    return b;
  }
}
