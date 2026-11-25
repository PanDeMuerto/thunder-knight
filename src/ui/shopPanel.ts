import { isStringKey, t } from '@/content/strings';
import type { GameState } from '@/state/gameState';
import { allCards, openTabs, type ShopCard, type ShopTab } from '@/state/shop';
import { el, label, setText, toggle } from './dom';
import { gunArt, ICONS } from './icons';

const TAB_ICON: Record<ShopTab, string> = { guns: ICONS.gun, hero: ICONS.hero, army: ICONS.army };

/**
 * Rosie's shop as a docked panel (GDD §12): beside the hero in landscape, a bottom sheet in portrait, so the truck and
 * the hero stay in view. Tabs appear as they unlock; each card has one action. It only draws what `state/shop.ts`
 * says; buying goes back through `onAct`. Keyboard: 1/2/3 switch tabs, Tab and Enter buy, Esc closes (the game).
 */
export class ShopPanel {
  private readonly layer: HTMLElement;
  private readonly goldText: HTMLElement;
  private readonly tabsRow: HTMLElement;
  private readonly list: HTMLElement;
  private current: ShopTab = 'guns';
  /** Onboarding can show just a few cards (Battle 1's first buy: only the pistol, onboarding §4). */
  private onlyIds: string[] | null = null;
  private state: GameState | null = null;
  private reached = 1;
  /** Guns' silhouettes rendered from their models (`renderGunIcons`), by gun id; others keep the drawn icon. */
  private gunArt: Readonly<Record<string, string>> = {};
  /** Called when the panel opens or closes, so the view can make room (stage frame shift). */
  onToggle: ((open: boolean) => void) | null = null;

  constructor(
    parent: HTMLElement,
    private readonly onAct: (id: string) => void,
    private readonly onClose: () => void,
  ) {
    this.layer = el('div', 'shop is-hidden', parent);
    this.layer.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.layer.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
    const head = el('div', 'shop-head', this.layer);
    const titles = el('div', 'shop-titles', head);
    label(el('div', 'shop-title', titles), 'shop.title');
    label(el('div', 'shop-rosie', titles), 'shop.rosie');
    const gold = el('div', 'shop-gold', head);
    el('span', 'hud-gold-icon', gold, ICONS.coin);
    this.goldText = el('span', '', gold);
    const close = el('button', 'shop-close', head, ICONS.close);
    close.type = 'button';
    label(close, 'shop.close', true);
    close.addEventListener('click', () => this.onClose());
    this.tabsRow = el('div', 'shop-tabs', this.layer);
    this.list = el('div', 'shop-list', this.layer);
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      const tabs = this.state ? openTabs(this.reached) : [];
      const n = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
      if (n >= 0 && tabs[n]) {
        this.tab = tabs[n]!;
        this.render();
      }
    });
  }

  get tab(): ShopTab {
    return this.current;
  }

  private set tab(tab: ShopTab) {
    this.current = tab;
  }

  /** Shows only these cards (null shows all). */
  only(ids: string[] | null): void {
    this.onlyIds = ids;
    this.refresh();
  }

  /** A card's action button, for prompts that point at it. */
  buttonFor(id: string): HTMLElement | null {
    return this.isOpen ? this.list.querySelector<HTMLElement>(`[data-card="${id}"] .shop-buy`) : null;
  }

  get isOpen(): boolean {
    return !this.layer.classList.contains('is-hidden');
  }

  /** Where the docked panel starts, in CSS pixels from the screen's left (landscape framing). */
  get leftEdge(): number {
    return this.layer.getBoundingClientRect().left - this.layer.parentElement!.getBoundingClientRect().left;
  }

  open(state: GameState, reached: number): void {
    this.state = state;
    this.reached = reached;
    // Open on the tab with the Recommended buy, so the ribbon is the first thing seen.
    const best = allCards(state, reached).find((c) => c.recommended);
    if (best) this.tab = best.tab;
    if (!openTabs(reached).includes(this.tab)) this.tab = 'guns';
    toggle(this.layer, 'is-hidden', false);
    this.render();
    this.onToggle?.(true);
  }

  close(): void {
    if (!this.isOpen) return;
    toggle(this.layer, 'is-hidden', true);
    this.onToggle?.(false);
  }

  /** The gun silhouettes rendered from their models, by gun id. */
  setGunArt(art: Readonly<Record<string, string>>): void {
    this.gunArt = art;
    this.refresh();
  }

  /** Redraws after a purchase or a gold change. */
  refresh(): void {
    if (this.isOpen) this.render();
  }

  private render(): void {
    const state = this.state;
    if (!state) return;
    setText(this.goldText, state.gold.toLocaleString('en-US'));
    const cards = allCards(state, this.reached);
    this.tabsRow.replaceChildren();
    for (const tab of openTabs(this.reached)) {
      const b = el('button', `shop-tab${tab === this.tab ? ' is-on' : ''}`, this.tabsRow);
      b.type = 'button';
      el('span', 'shop-tab-icon', b, TAB_ICON[tab]);
      el('span', '', b, t(`shop.tab.${tab}`));
      // A dot on a tab with something affordable.
      if (tab !== this.tab && cards.some((c) => c.tab === tab && c.state === 'buy')) el('i', 'shop-dot', b);
      b.addEventListener('click', () => {
        this.tab = tab;
        this.render();
      });
    }
    this.list.replaceChildren();
    for (const c of cards.filter((x) => x.tab === this.tab && (!this.onlyIds || this.onlyIds.includes(x.id)))) {
      this.list.append(this.card(c));
    }
  }

  private card(c: ShopCard): HTMLElement {
    const node = el('div', `shop-card is-${c.state}${c.recommended ? ' is-best' : ''}`);
    node.dataset.card = c.id;
    const art = c.kind === 'gun' ? this.gunArt[c.key] : undefined;
    const icon = art
      ? gunArt(art)
      : c.kind === 'gun'
        ? ICONS.gun
        : c.kind === 'hero'
          ? ICONS.hero
          : c.kind === 'support'
            ? (c.key === 'sentryGun' ? ICONS.sentry : ICONS.support)
            : c.kind === 'banner'
              ? ICONS.flag
              : ICONS.army;
    el('div', 'shop-card-icon', node, c.state === 'locked' ? ICONS.lock : icon);
    const body = el('div', 'shop-card-body', node);
    const name = el('div', 'shop-card-name', body);
    const nameKey = `${c.kind === 'banner' ? 'army' : c.kind}.${c.key}`;
    setText(name, isStringKey(nameKey) ? t(nameKey) : c.key);
    if (c.level > 0 || c.kind === 'gun') {
      const pips = el('span', 'shop-pips', name);
      const filled = c.kind === 'gun' ? c.level : c.level;
      pips.textContent = c.kind === 'gun' ? '★'.repeat(Math.max(1, filled)) : '●'.repeat(filled);
    }
    const noteKey = c.kind === 'gun' && c.level > 0 && c.equipped ? 'shop.levelUp' : `${nameKey}.note`;
    el('div', 'shop-card-note', body, isStringKey(noteKey) ? t(noteKey) : '');
    if (c.equipped) el('span', 'shop-badge', body, t('shop.equipped'));
    if (c.recommended) el('span', 'shop-ribbon', node, t(c.state === 'expensive' ? 'shop.goal' : 'shop.best'));
    const action = el('button', 'shop-buy', node);
    action.type = 'button';
    if (c.state === 'buy' || c.state === 'expensive') {
      el('span', 'shop-coin', action, ICONS.coin);
      el('span', '', action, c.state === 'buy' ? c.price!.toLocaleString('en-US') : t('shop.more', { gold: c.missing }));
    } else if (c.state === 'equip') {
      action.textContent = t('shop.equip');
    } else if (c.state === 'max') {
      action.textContent = t('shop.max');
    } else {
      action.textContent = t('shop.locked', { n: c.unlockBattle });
    }
    action.disabled = c.state !== 'buy' && c.state !== 'equip';
    action.addEventListener('click', () => this.onAct(c.id));
    return node;
  }
}
