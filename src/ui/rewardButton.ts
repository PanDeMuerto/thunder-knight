import { el } from './dom';
import { ICONS } from './icons';

/** Where a rewarded ad is offered (GDD §16, §21: `measure('rewarded', placement, …)`). */
export type RewardPlacement = 'rally' | 'double' | 'crate';

/** A rewarded offer on a card: its words, and what pressing it does (the game runs the ad and the reward). */
export interface RewardOffer {
  label: string;
  onPress: (button: HTMLButtonElement) => void;
}

/**
 * The one way to make a rewarded button, so Poki's rules hold everywhere:
 * - it shows the video mark (🎬) and the reward colour, never green (`.btn-reward`);
 * - it comes after a standard choice in the same card, which is at least as large (the CSS keeps it no taller than
 *   `.btn-second` and no wider than its card's other buttons);
 * - it can be pressed once; the game removes it if the ad fails, without a message.
 * `npm run qa:poki` checks the order and sizes on every card.
 */
export function rewardButton(parent: HTMLElement, placement: RewardPlacement, offer: RewardOffer): HTMLButtonElement {
  if (!parent.querySelector('.btn-main, .btn-second')) {
    console.error(`Rewarded button "${placement}" has no standard choice before it`);
  }
  const button = el('button', 'btn-reward', parent);
  button.type = 'button';
  button.dataset.reward = placement;
  el('span', 'btn-icon', button, ICONS.video);
  el('span', '', button, offer.label);
  button.addEventListener('click', () => {
    if (button.disabled) return;
    button.disabled = true;
    offer.onPress(button);
  });
  return button;
}
