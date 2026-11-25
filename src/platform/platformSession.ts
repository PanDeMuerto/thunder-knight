import type { AdHooks, PlatformAdapter } from './types';

/**
 * Enforces Poki's event rules in one place, so game code can't break them:
 * no duplicate start or stop, no events during ads, one ad at a time.
 */
export class PlatformSession {
  private playing = false;
  /** Poki shows no ad before the first gameplayStart (no preroll); the session doesn't ask for one either. */
  private everPlayed = false;
  private adRunning = false;
  private loadingDone = false;
  /** Measures sent while loading (the first battle starts then) wait until `gameLoadingFinished`. */
  private readonly early: [string, string, string][] = [];
  private readonly adapter: PlatformAdapter;
  private readonly hooks: AdHooks;

  constructor(adapter: PlatformAdapter, hooks: AdHooks) {
    this.adapter = adapter;
    this.hooks = hooks;
  }

  async init(): Promise<void> {
    try {
      await this.adapter.init();
    } catch (error) {
      // A failed SDK (ad blocker, offline) must never stop the game.
      console.warn('Platform init failed, continuing without it', error);
    }
  }

  loadingFinished(): void {
    if (this.loadingDone) return;
    this.loadingDone = true;
    this.safely(() => this.adapter.loadingFinished());
    for (const [category, what, action] of this.early.splice(0)) this.measure(category, what, action);
  }

  gameplayStart(): void {
    if (this.playing || this.adRunning) return;
    this.playing = true;
    this.everPlayed = true;
    this.safely(() => this.adapter.gameplayStart());
  }

  gameplayStop(): void {
    if (!this.playing || this.adRunning) return;
    this.playing = false;
    this.safely(() => this.adapter.gameplayStop());
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get isAdRunning(): boolean {
    return this.adRunning;
  }

  /** False in the ad-free build: the game neither asks for breaks nor offers rewards. */
  get adsAvailable(): boolean {
    return this.adapter.ads;
  }

  /** At a natural stop (Next wave, leaving a card). Gameplay must already be stopped, and must have started once. */
  async commercialBreak(): Promise<void> {
    if (!this.adapter.ads || this.adRunning || this.playing || !this.everPlayed) return;
    this.adRunning = true;
    try {
      await this.adapter.commercialBreak(() => this.hooks.onAdStart());
    } catch (error) {
      console.warn('Commercial break failed', error);
    } finally {
      this.adRunning = false;
      this.hooks.onAdEnd();
    }
  }

  /** Stops gameplay first if needed. Returns true only when the reward should be granted. */
  async rewardedBreak(): Promise<boolean> {
    if (!this.adapter.ads || this.adRunning) return false;
    this.gameplayStop();
    this.adRunning = true;
    try {
      return (await this.adapter.rewardedBreak(() => this.hooks.onAdStart())) === true;
    } catch (error) {
      console.warn('Rewarded break failed', error);
      return false;
    } finally {
      this.adRunning = false;
      this.hooks.onAdEnd();
    }
  }

  movePill(topPercent: number, topPx: number): void {
    this.safely(() => this.adapter.movePill(topPercent, topPx));
  }

  /**
   * A game event for Poki's funnels (GDD 18): `action` is `start`, `complete` or `fail` for progress, `visible` or
   * `interact` for a rewarded placement, or a custom word. Strings never contain `/` or `^`. Never during an ad.
   */
  measure(category: string, what: string, action: string): void {
    if (this.adRunning) return;
    if (!this.loadingDone) {
      this.early.push([category, what, action]);
      return;
    }
    this.safely(() => this.adapter.measure(category, what, action));
  }

  language(): string | null {
    try {
      return this.adapter.language();
    } catch {
      return null;
    }
  }

  private safely(call: () => void): void {
    try {
      call();
    } catch (error) {
      console.warn('Platform call failed', error);
    }
  }
}
