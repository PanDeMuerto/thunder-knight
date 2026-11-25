import { el, pulse, toggle } from './dom';
import { ICONS } from './icons';

/** What a lesson shows (onboarding §2). */
export interface PromptSpec {
  /**
   * Desktop: key caps (`W`, `G`, `Enter`) and mouse pictures (`mouse-move` with arrows, `mouse-left` with the left
   * button lit), shown before the text.
   */
  keys?: string[];
  /** Touch: a hand that drags on the left (move) or the right (aim), or taps a button. */
  hand?: 'drag-left' | 'drag-right' | 'tap';
  /** The button the prompt is about: a tapping hand points at it, and the prompt sits beside it. */
  target?: HTMLElement;
  /** At most four words. */
  text: string;
}

const MOUSE_LABELS: Record<string, string> = {
  'mouse-move': ICONS.mouseMove,
  'mouse-left': ICONS.mouseLeft,
};

/**
 * One lesson prompt at a time (onboarding §2): key caps and a mouse picture on desktop, an animated hand on touch,
 * plus at most four words. Never mid-screen: bottom centre above the health bar on desktop, under the top bars on a
 * landscape phone, above the button stack in portrait; beside its button when it's about one. It fades in, stays
 * until the step is done, then ticks and fades out. `urgent` pulses it when the player is stuck.
 */
export class Prompt {
  private readonly node: HTMLElement;
  private readonly hand: HTMLElement;
  private key = '';
  private target: HTMLElement | null = null;

  constructor(parent: HTMLElement) {
    this.node = el('div', 'prompt', parent);
    this.hand = el('div', 'hand', parent, ICONS.hand);
  }

  get shown(): boolean {
    return this.node.classList.contains('is-shown');
  }

  /** Shows a prompt (or hides it with null). Calling again with the same prompt changes nothing. */
  show(spec: PromptSpec | null, touch: boolean): void {
    // A button that already says the words (Next wave, Continue, Fight!) needs only the key pictures beside it on a
    // computer, and only the tapping hand on touch.
    const echo = !!spec?.target && (spec.target.textContent ?? '').includes(spec.text);
    const caps = !touch && !!spec?.keys?.length;
    const key = spec ? `${touch}|${spec.text}|${spec.keys?.join() ?? ''}|${spec.hand ?? ''}|${echo}` : '';
    this.target = spec?.target ?? null;
    if (key !== this.key) {
      this.key = key;
      if (!spec || (echo && !caps)) {
        toggle(this.node, 'is-shown', false);
        toggle(this.node, 'is-urgent', false);
      } else {
        this.node.replaceChildren();
        if (caps) {
          const row = el('span', 'caps', this.node);
          for (const k of spec.keys!) {
            const mouse = MOUSE_LABELS[k];
            if (mouse) el('span', 'cap cap-mouse', row, mouse);
            else el('span', `cap${k.length > 2 ? ' cap-wide' : ''}`, row, k);
          }
        }
        if (!echo) el('span', 'prompt-text', this.node, spec.text);
        toggle(this.node, 'is-urgent', false);
        pulse(this.node, 'is-shown');
      }
    }
    const mode = spec && touch ? spec.hand : undefined;
    toggle(this.hand, 'is-shown', !!mode);
    this.hand.dataset.mode = mode ?? '';
    toggle(this.node, 'is-beside', !!this.target);
    this.place();
  }

  /** Draws attention: the player has been stuck a while (6 s, onboarding §1). */
  urgent(on: boolean): void {
    toggle(this.node, 'is-urgent', on);
  }

  /** Keeps a button prompt and its hand next to the button (it can move with the layout). */
  place(): void {
    const target = this.target;
    if (!target) {
      this.node.style.left = this.node.style.top = '';
      if (this.hand.dataset.mode !== 'tap') this.hand.style.left = this.hand.style.top = '';
      return;
    }
    const host = this.node.parentElement!.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    if (this.hand.dataset.mode === 'tap') {
      this.hand.style.left = `${r.left - host.left + r.width * 0.55}px`;
      this.hand.style.top = `${r.top - host.top + r.height * 0.55}px`;
    }
    if (!this.shown) return;
    const box = this.node.getBoundingClientRect();
    const spot = besideSpot(r, target.closest('.card, .shop, .map-card')?.getBoundingClientRect() ?? r, box, host, target);
    // No room anywhere (a small phone's full shop): the tapping hand says it alone.
    toggle(this.node, 'is-crowded', !spot);
    if (spot) {
      this.node.style.left = `${spot.x - host.left}px`;
      this.node.style.top = `${spot.y - host.top}px`;
    }
  }
}

const GAP_PX = 14;

/**
 * Where a button's prompt goes: beside the card or panel the button sits in (level with the button), else over or under
 * the whole card, else just under or over the button. The first spot on screen that covers no other button wins; null
 * when there's none.
 */
function besideSpot(button: DOMRect, container: DOMRect, box: DOMRect, host: DOMRect, target: HTMLElement): { x: number; y: number } | null {
  const w = box.width;
  const h = box.height;
  const midY = button.top + button.height / 2 - h / 2;
  const midX = button.left + button.width / 2 - w / 2;
  const spots = [
    { x: container.left - w - GAP_PX, y: midY },
    { x: container.right + GAP_PX, y: midY },
    { x: midX, y: container.top - h - GAP_PX },
    { x: midX, y: container.bottom + GAP_PX },
    { x: midX, y: button.bottom + GAP_PX },
    { x: midX, y: button.top - h - GAP_PX },
  ];
  const buttons = [...document.querySelectorAll<HTMLElement>('#ui button')]
    .filter((b) => b !== target && b.offsetParent !== null)
    .map((b) => b.getBoundingClientRect());
  const free = (s: { x: number; y: number }) =>
    s.x >= host.left + 8 &&
    s.y >= host.top + 8 &&
    s.x + w <= host.right - 8 &&
    s.y + h <= host.bottom - 8 &&
    !buttons.some((b) => s.x < b.right && s.x + w > b.left && s.y < b.bottom && s.y + h > b.top);
  return spots.find(free) ?? null;
}
