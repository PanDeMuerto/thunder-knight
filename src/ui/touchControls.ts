import type { StringKey } from '@/content/strings';
import type { ControlButtons, Input } from '@/input/input';
import { el, label, toggle } from './dom';
import { ICONS } from './icons';

/**
 * The on-screen controls: the floating stick's ring and knob, and the action buttons on the right above the resting
 * thumb (GDD §6.2–6.3). Buttons stay hidden until onboarding teaches them (`reveal`): grenades in Battle 2, the gun
 * swap in Battle 6, support in Battle 8. The pause button is always there (Poki requires a way to pause).
 */
export class TouchControls {
  readonly buttons: ControlButtons;
  private readonly layer: HTMLElement;
  private readonly stick: HTMLElement;
  private readonly knob: HTMLElement;

  constructor(parent: HTMLElement) {
    this.layer = el('div', 'controls', parent);
    this.stick = el('div', 'stick', this.layer);
    this.knob = el('div', 'stick-knob', this.stick);
    const pad = el('div', 'action-pad', parent);
    this.buttons = {
      grenade: button(pad, 'btn-grenade is-hidden', ICONS.grenade, 'grenade'),
      support: button(pad, 'btn-support is-hidden', ICONS.support, 'support'),
      gun: button(pad, 'btn-gun is-hidden', ICONS.gun, 'swap'),
      pause: button(parent, 'btn-pause', ICONS.pause, 'pause'),
    };
  }

  setTouch(touch: boolean): void {
    toggle(this.layer, 'is-touch', touch);
    const root = this.layer.closest<HTMLElement>('#game');
    if (root) toggle(root, 'is-touch', touch);
  }

  /** Shows or hides one button, for lessons that introduce controls one at a time. */
  reveal(name: keyof ControlButtons, shown: boolean): void {
    toggle(this.buttons[name], 'is-hidden', !shown);
  }

  update(input: Input): void {
    const v = input.stickVisual;
    toggle(this.stick, 'is-active', v !== null);
    if (v) {
      this.stick.style.transform = `translate(${v.x}px, ${v.y}px)`;
      this.knob.style.transform = `translate(${v.dx}px, ${v.dy}px)`;
    }
  }
}

/** A round control button; `name` labels it for screen readers in the player's language. */
function button(parent: HTMLElement, className: string, icon: string, name: StringKey): HTMLButtonElement {
  const b = el('button', `btn ${className}`, parent, icon);
  b.type = 'button';
  label(b, name, true);
  return b;
}
