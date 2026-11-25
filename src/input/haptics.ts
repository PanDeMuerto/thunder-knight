import { HAPTICS, type HapticKind } from '@/content/haptics';

/** Short vibrations on a phone (M11): only when the Vibration setting is on, the device is touch and it can buzz. */
export class Haptics {
  /** The setting, on a touch device. */
  enabled = false;
  private last = -Infinity;

  pulse(kind: HapticKind): void {
    if (!this.enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    const now = performance.now() / 1000;
    if (now - this.last < HAPTICS.gap && kind !== 'down' && kind !== 'bossDown') return;
    this.last = now;
    const pattern = HAPTICS[kind];
    navigator.vibrate(typeof pattern === 'number' ? pattern : [...pattern]);
  }
}
