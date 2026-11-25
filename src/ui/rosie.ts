import { el, pulse, setText, toggle } from './dom';
import { ICONS } from './icons';

/**
 * Rosie's speech bubbles (onboarding §1): flavour, never instructions a player must read. Small, at the left edge
 * under the gold (never mid-screen), one at a time; a new line replaces the old one.
 */
export class RosieBubble {
  private readonly node: HTMLElement;
  private readonly text: HTMLElement;
  private timer = 0;

  constructor(parent: HTMLElement) {
    this.node = el('div', 'rosie is-hidden', parent);
    el('span', 'rosie-face', this.node, ICONS.rosie);
    this.text = el('span', 'rosie-text', this.node);
  }

  get speaking(): boolean {
    return this.timer > 0;
  }

  say(line: string, seconds = 3.2): void {
    setText(this.text, line);
    toggle(this.node, 'is-hidden', false);
    pulse(this.node, 'is-in');
    this.timer = seconds;
  }

  hush(): void {
    this.timer = 0;
    toggle(this.node, 'is-hidden', true);
  }

  update(dt: number): void {
    if (this.timer <= 0) return;
    this.timer -= dt;
    if (this.timer <= 0) toggle(this.node, 'is-hidden', true);
  }
}
