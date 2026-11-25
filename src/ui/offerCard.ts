import { t } from '@/content/strings';
import { el, toggle } from './dom';
import { rewardButton, type RewardOffer } from './rewardButton';

/**
 * A small card for an offer met in the world (the rift crate, GDD §12.3): a question, one line, **No thanks** first
 * and focused, then the 🎬 choice.
 */
export class OfferCard {
  private readonly layer: HTMLElement;
  private readonly card: HTMLElement;

  constructor(parent: HTMLElement) {
    this.layer = el('div', 'card-layer is-hidden', parent);
    this.layer.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.card = el('div', 'card card-offer', this.layer);
  }

  get open(): boolean {
    return !this.layer.classList.contains('is-hidden');
  }

  show(title: string, text: string, onNo: () => void, offer: RewardOffer): void {
    this.card.replaceChildren();
    el('h2', 'card-title', this.card, title);
    el('p', 'card-text', this.card, text);
    const no = el('button', 'btn-second', this.card, t('offer.noThanks'));
    no.type = 'button';
    no.addEventListener('click', () => onNo());
    rewardButton(this.card, 'crate', offer);
    toggle(this.layer, 'is-hidden', false);
    no.focus({ preventScroll: true });
  }

  hide(): void {
    toggle(this.layer, 'is-hidden', true);
  }
}
