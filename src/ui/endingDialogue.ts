import { el, pulse, setText, toggle } from './dom';
import { ICONS } from './icons';

/**
 * The ending scene's screen (M10): a dip to dark between the battle and the scene, one short line at a time at the
 * bottom (a face, a name, the line; never mid-screen), and a small Skip at the bottom right. A tap, click or key moves
 * on; Escape skips (through the game's Escape).
 */
export class EndingDialogue {
  private readonly layer: HTMLElement;
  private readonly veil: HTMLElement;
  private readonly line: HTMLElement;
  private readonly face: HTMLElement;
  private readonly name: HTMLElement;
  private readonly text: HTMLElement;
  private readonly skipLabel: HTMLButtonElement;
  private shown = false;

  constructor(parent: HTMLElement, onPress: () => void, onSkip: () => void) {
    this.layer = el('div', 'ending is-hidden', parent);
    this.veil = el('div', 'ending-veil', this.layer);
    this.line = el('div', 'ending-line is-hidden', this.layer);
    this.face = el('span', 'ending-face', this.line);
    const words = el('span', 'ending-words', this.line);
    this.name = el('span', 'ending-name', words);
    this.text = el('span', 'ending-text', words);
    const skip = el('button', 'ending-skip', this.layer, '');
    skip.type = 'button';
    this.skipLabel = skip;
    skip.addEventListener('pointerdown', (e) => e.stopPropagation());
    skip.addEventListener('click', (e) => {
      e.stopPropagation();
      onSkip();
    });
    this.layer.addEventListener('pointerdown', (e) => {
      if (e.button === 0 || e.pointerType !== 'mouse') onPress();
    });
    window.addEventListener('keydown', (e) => {
      if (!this.shown || e.repeat || e.code === 'Escape' || e.code === 'Tab') return;
      onPress();
    });
  }

  get open(): boolean {
    return this.shown;
  }

  show(skip: string): void {
    this.shown = true;
    setText(this.skipLabel, skip);
    toggle(this.layer, 'is-hidden', false);
    toggle(this.line, 'is-hidden', true);
  }

  /** The dip to dark (on) or back (off). */
  fade(on: boolean): void {
    toggle(this.veil, 'is-on', on);
  }

  say(who: 'ada' | 'rosie', name: string, line: string): void {
    this.face.innerHTML = who === 'ada' ? ICONS.ada : ICONS.rosie;
    this.line.dataset.who = who;
    setText(this.name, name);
    setText(this.text, line);
    toggle(this.line, 'is-hidden', false);
    pulse(this.line, 'is-in');
  }

  /** The lines are done: the card comes over the scene. */
  quiet(): void {
    toggle(this.line, 'is-hidden', true);
    this.fade(false);
  }

  hide(): void {
    this.shown = false;
    this.quiet();
    toggle(this.layer, 'is-hidden', true);
  }
}
