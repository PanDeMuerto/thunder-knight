/**
 * The game only talks to this interface. To ship on another portal, add one adapter and
 * register it in `createPlatform`.
 */
export interface PlatformAdapter {
  /** False where the game ships without ads (itch.io): no breaks are asked for and no 🎬 options are shown. */
  readonly ads: boolean;
  init(): Promise<void>;
  loadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  /** `onStart` fires only if an ad actually plays. Resolves when the game may continue. */
  commercialBreak(onStart: () => void): Promise<void>;
  /** Resolves true only when the reward should be granted. */
  rewardedBreak(onStart: () => void): Promise<boolean>;
  /** Lowercase base language code, or null when unknown. */
  language(): string | null;
  /** Moves Poki's mobile pill down the screen edge (up and down only, at most halfway). */
  movePill(topPercent: number, topPx: number): void;
  /** A funnel event for Poki's game events dashboard: onboarding steps, stage-ups, unlocks. */
  measure(category: string, what: string, action: string): void;
}

export interface AdHooks {
  /** Mute audio and freeze input. */
  onAdStart(): void;
  /** Restore audio and input. */
  onAdEnd(): void;
}
