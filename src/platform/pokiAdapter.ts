import type { PlatformAdapter } from './types';

interface PokiSdk {
  init(): Promise<void>;
  gameLoadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  commercialBreak(onStart?: () => void): Promise<void>;
  rewardedBreak(onStart?: () => void): Promise<boolean>;
  getLanguage?(): string;
  measure?(category: string, what: string, action: string): void;
  movePill?(topPercent: number, topPx: number): void;
}

declare global {
  interface Window {
    PokiSDK?: PokiSdk;
  }
}

/** The SDK script can be missing when an ad blocker removes it, so every call handles that. */
export class PokiAdapter implements PlatformAdapter {
  readonly ads = true;

  private get sdk(): PokiSdk | undefined {
    return window.PokiSDK;
  }

  async init(): Promise<void> {
    await this.sdk?.init();
  }

  loadingFinished(): void {
    this.sdk?.gameLoadingFinished();
  }

  gameplayStart(): void {
    this.sdk?.gameplayStart();
  }

  gameplayStop(): void {
    this.sdk?.gameplayStop();
  }

  async commercialBreak(onStart: () => void): Promise<void> {
    await this.sdk?.commercialBreak(onStart);
  }

  async rewardedBreak(onStart: () => void): Promise<boolean> {
    if (!this.sdk) return false;
    return this.sdk.rewardedBreak(onStart);
  }

  movePill(topPercent: number, topPx: number): void {
    this.sdk?.movePill?.(topPercent, topPx);
  }

  measure(category: string, what: string, action: string): void {
    this.sdk?.measure?.(category, what, action);
  }

  /** Poki may give a region too (`pt-br`): the game wants the base language. */
  language(): string | null {
    const code = this.sdk?.getLanguage?.();
    return code ? code.toLowerCase().split(/[-_]/)[0]! : null;
  }
}
