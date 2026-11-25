import type { PlatformAdapter } from './types';

/** For plain web hosting with no portal (the itch.io build): no ads at all, and no SDK. */
export class WebAdapter implements PlatformAdapter {
  readonly ads = false;

  async init(): Promise<void> {}
  loadingFinished(): void {}
  gameplayStart(): void {}
  gameplayStop(): void {}
  async commercialBreak(): Promise<void> {}
  async rewardedBreak(): Promise<boolean> {
    return false;
  }
  measure(): void {}
  movePill(): void {}
  language(): string | null {
    return navigator.language?.slice(0, 2).toLowerCase() ?? null;
  }
}
