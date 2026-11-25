import type { PlatformAdapter } from './types';

export interface RecordedEvent {
  name: string;
  time: number;
}

declare global {
  interface Window {
    /** Event log read by the automated QA run. */
    __platformEvents?: RecordedEvent[];
    /**
     * Set by QA or the console. 'fail': the rewarded video plays but reports no reward (skipped, no fill). 'blocked':
     * nothing plays and nothing is granted, as with an ad blocker (the SDK missing).
     */
    __adMode?: 'ok' | 'fail' | 'blocked';
  }
}

/** Stands in for the portal during development, with a visible fake ad. Never ships to Poki. */
export class DevAdapter implements PlatformAdapter {
  /** `?noads` in the URL plays as the ad-free (itch.io) build. */
  readonly ads = !new URLSearchParams(location.search).has('noads');

  private record(name: string): void {
    (window.__platformEvents ??= []).push({ name, time: Math.round(performance.now()) });
  }

  async init(): Promise<void> {
    this.record('init');
  }

  loadingFinished(): void {
    this.record('gameLoadingFinished');
  }

  gameplayStart(): void {
    this.record('gameplayStart');
  }

  gameplayStop(): void {
    this.record('gameplayStop');
  }

  async commercialBreak(onStart: () => void): Promise<void> {
    this.record('commercialBreak');
    if (window.__adMode === 'blocked') return;
    onStart();
    await this.showFakeAd('Commercial break', 700);
  }

  async rewardedBreak(onStart: () => void): Promise<boolean> {
    this.record('rewardedBreak');
    if (window.__adMode === 'blocked') {
      this.record('rewardDenied');
      return false;
    }
    onStart();
    await this.showFakeAd('Rewarded video', 900);
    const success = window.__adMode !== 'fail';
    this.record(success ? 'rewardGranted' : 'rewardDenied');
    return success;
  }

  movePill(topPercent: number, topPx: number): void {
    this.record(`movePill:${topPercent}:${topPx}`);
  }

  measure(category: string, what: string, action: string): void {
    this.record(`measure:${category}:${what}:${action}`);
  }

  language(): string | null {
    return new URLSearchParams(location.search).get('lang') ?? 'en';
  }

  private showFakeAd(label: string, ms: number): Promise<void> {
    const overlay = document.createElement('div');
    overlay.textContent = `${label} (dev mock)`;
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:#111;color:#fff;font:600 20px sans-serif';
    document.body.append(overlay);
    return new Promise((resolve) =>
      setTimeout(() => {
        overlay.remove();
        resolve();
      }, ms),
    );
  }
}
