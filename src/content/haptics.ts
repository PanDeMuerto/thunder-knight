/**
 * Vibration on a phone (M11, GDD §15.7): short pulses for the big moments only, never for every shot, so it stays a
 * nudge. Milliseconds (an array is on, off, on). Off in Settings, and never on a computer.
 */
export const HAPTICS = {
  hurt: 22,
  down: 70,
  boss: 35,
  bossDown: [45, 50, 90],
  blast: 16,
  buy: 10,
  /** The least time between two pulses, seconds: a volley of hits is one buzz. */
  gap: 0.25,
} as const;

export type HapticKind = Exclude<keyof typeof HAPTICS, 'gap'>;
