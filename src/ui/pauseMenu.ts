import { CREDITS } from '@/content/credits';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, currentLanguage, t, type StringKey } from '@/content/strings';
import { QUALITY_SETTINGS } from '@/render/stage';
import type { Settings } from '@/save/saveStore';
import { el, toggle } from './dom';
import { ICONS } from './icons';

declare const __APP_VERSION__: string;

export interface PauseHooks {
  onResume(): void;
  onRetreat(): void;
  onSettings(settings: Settings): void;
}

type View = 'pause' | 'confirm' | 'settings' | 'credits';

/**
 * The pause card and settings (GDD §15.7): Resume first, Settings, and Back to map in a battle (it asks first; gold is
 * kept). Settings change at once and are remembered; rows only show on the devices they're for (aim help, left
 * hand and vibration on touch; auto-fire for the mouse on desktop). Keyboard: arrows and Tab move focus, Enter or
 * Space press, Esc goes back (`back`).
 */
export class PauseMenu {
  private readonly layer: HTMLElement;
  private readonly card: HTMLElement;
  private view: View = 'pause';
  private settings: Settings | null = null;
  private touch = false;
  private canRetreat = false;

  constructor(
    parent: HTMLElement,
    private readonly hooks: PauseHooks,
  ) {
    this.layer = el('div', 'card-layer is-hidden', parent);
    this.card = el('div', 'card card-pause', this.layer);
    this.layer.addEventListener('keydown', (e) => this.onKey(e));
  }

  get open(): boolean {
    return !this.layer.classList.contains('is-hidden');
  }

  /** `canRetreat`: in a battle, the card offers Back to map. */
  show(shown: boolean, canRetreat = false, settings?: Settings, touch = false): void {
    toggle(this.layer, 'is-hidden', !shown);
    if (!shown) return;
    this.canRetreat = canRetreat;
    this.touch = touch;
    if (settings) this.settings = { ...settings };
    this.render('pause');
  }

  /** Redraws the open view (a new language, M11), keeping the focus on the language picker. */
  refresh(): void {
    if (!this.open) return;
    this.render(this.view);
    this.card.querySelector<HTMLElement>('.setting-select')?.focus({ preventScroll: true });
  }

  /** Esc: from settings or the question back to the pause card; from the pause card, resume. */
  back(): void {
    if (this.view === 'pause') this.hooks.onResume();
    else this.render(this.view === 'credits' ? 'settings' : 'pause');
  }

  private render(view: View): void {
    this.view = view;
    this.card.replaceChildren();
    this.card.className = `card card-pause is-${view}`;
    if (view === 'pause') {
      el('h2', 'card-title', this.card, t('paused'));
      this.button(t('resume'), 'btn-main', () => this.hooks.onResume());
      this.button(t('pause.settings'), 'btn-second', () => this.render('settings'), ICONS.gear);
      if (this.canRetreat) this.button(t('pause.retreat'), 'btn-second', () => this.render('confirm'));
      el('div', 'card-version', this.card, `v${__APP_VERSION__}`);
    } else if (view === 'confirm') {
      el('h2', 'card-title', this.card, t('pause.leave'));
      el('p', 'card-text', this.card, t('pause.keepGold'));
      this.button(t('pause.leaveNo'), 'btn-main', () => this.render('pause'));
      this.button(t('pause.leaveYes'), 'btn-second', () => this.hooks.onRetreat());
    } else if (view === 'credits') {
      el('h2', 'card-title', this.card, t('settings.credits'));
      const list = el('div', 'credits', this.card);
      for (const group of CREDITS) {
        el('div', 'credits-heading', list, t(group.heading));
        for (const name of group.names) el('div', 'credits-name', list, name);
      }
      el('p', 'card-text', this.card, t('credits.rest'));
      this.button(t('settings.back'), 'btn-main', () => this.render('settings'));
    } else {
      this.renderSettings();
    }
    // Keyboards start on the first control; a finger doesn't need a focus ring.
    const first = this.card.querySelector<HTMLElement>('button, input, select');
    if (this.touch) (document.activeElement as HTMLElement | null)?.blur();
    else first?.focus({ preventScroll: true });
  }

  private renderSettings(): void {
    const s = this.settings!;
    el('h2', 'card-title', this.card, t('settings.title'));
    const list = el('div', 'settings', this.card);
    const change = (): void => this.hooks.onSettings({ ...s });
    const range = (label: StringKey, value: number, min: number, max: number, step: number, set: (v: number) => void): void => {
      const row = el('label', 'setting', list);
      el('span', '', row, t(label));
      const input = el('input', 'setting-range', row);
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(value);
      input.setAttribute('aria-label', t(label));
      input.addEventListener('input', () => {
        set(Number(input.value));
        change();
      });
    };
    const cycle = <T extends string>(label: StringKey, options: readonly T[], value: T, set: (v: T) => void, name: (v: T) => string): void => {
      const row = el('button', 'setting', list);
      row.type = 'button';
      el('span', '', row, t(label));
      const shown = el('span', 'setting-value', row, name(value));
      let current = value;
      row.addEventListener('click', () => {
        current = options[(options.indexOf(current) + 1) % options.length]!;
        shown.textContent = name(current);
        set(current);
        change();
      });
    };
    const onOff = (v: boolean): string => t(v ? 'value.on' : 'value.off');
    const flag = (label: StringKey, value: boolean, set: (v: boolean) => void): void =>
      cycle(label, ['on', 'off'] as const, value ? 'on' : 'off', (v) => set(v === 'on'), (v) => onOff(v === 'on'));
    range('settings.sound', s.sound ? s.volume : 0, 0, 1, 0.05, (v) => {
      s.volume = v;
      s.sound = v > 0;
    });
    range('settings.music', s.music, 0, 1, 0.05, (v) => (s.music = v));
    range('settings.sensitivity', s.sensitivity, 0.5, 2, 0.05, (v) => (s.sensitivity = v));
    flag('settings.invertY', s.invertY, (v) => (s.invertY = v));
    if (this.touch) {
      flag('settings.autoFireTouch', s.autoFireTouch, (v) => (s.autoFireTouch = v));
      cycle('settings.aimAssist', ['off', 'normal', 'strong'] as const, s.aimAssist, (v) => (s.aimAssist = v), (v) => t(`value.${v}`));
    } else {
      flag('settings.autoFireMouse', s.autoFireMouse, (v) => (s.autoFireMouse = v));
    }
    cycle('settings.waveIntros', ['full', 'short', 'off'] as const, s.waveIntros, (v) => (s.waveIntros = v), (v) => t(`value.${v}`));
    cycle('settings.shake', ['full', 'low', 'off'] as const, s.shake, (v) => (s.shake = v), (v) => t(`value.${v}`));
    flag('settings.reducedMotion', s.reducedMotion, (v) => (s.reducedMotion = v));
    cycle('settings.graphics', QUALITY_SETTINGS, s.quality, (v) => (s.quality = v), (v) => t(`value.${v}`));
    range('settings.hudScale', s.hudScale, 1, 1.5, 0.05, (v) => (s.hudScale = v));
    if (this.touch) {
      flag('settings.leftHanded', s.leftHanded, (v) => (s.leftHanded = v));
      flag('settings.vibration', s.vibration, (v) => (s.vibration = v));
    }
    if (SUPPORTED_LANGUAGES.length > 1) {
      const row = el('label', 'setting', list);
      el('span', '', row, t('settings.language'));
      const select = el('select', 'setting-select', row);
      for (const code of SUPPORTED_LANGUAGES) {
        const o = el('option', '', select, LANGUAGE_NAMES[code] ?? code);
        o.value = code;
        o.selected = code === (s.language ?? currentLanguage());
      }
      select.addEventListener('change', () => {
        s.language = select.value;
        change();
      });
    }
    const credits = el('button', 'setting', list);
    credits.type = 'button';
    el('span', '', credits, t('settings.credits'));
    credits.addEventListener('click', () => this.render('credits'));
    this.button(t('settings.back'), 'btn-main', () => this.render('pause'));
  }

  private button(label: string, className: string, onClick: () => void, icon?: string): HTMLButtonElement {
    const b = el('button', className, this.card);
    b.type = 'button';
    if (icon) el('span', 'btn-icon', b, icon);
    el('span', '', b, label);
    b.addEventListener('click', () => onClick());
    return b;
  }

  /** Arrow keys move focus through the card's controls (Tab works too; ranges keep left and right). */
  private onKey(e: KeyboardEvent): void {
    if (e.code !== 'ArrowDown' && e.code !== 'ArrowUp') return;
    const items = [...this.card.querySelectorAll<HTMLElement>('button, input, select')];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next = items[(at + (e.code === 'ArrowDown' ? 1 : items.length - 1)) % items.length];
    next?.focus();
    e.preventDefault();
  }
}
