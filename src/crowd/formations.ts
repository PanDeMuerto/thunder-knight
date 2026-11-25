import { Rng } from '@/core/math';

export type Formation = 'block' | 'line' | 'mob' | 'crescent';

export interface Slot {
  /** Metres to the squad's right. */
  x: number;
  /** Metres behind the squad's front (0 is the front rank). */
  z: number;
}

/**
 * Where each member of a squad stands, relative to its anchor and facing (GDD §9.2: block, line or mob; allies stand
 * in a crescent, §10). The captain, if any, takes slot 1 (middle of the second rank) so his banner rises from inside
 * the block.
 */
export function formationSlots(kind: Formation, count: number, spacing: number, seed = 1): Slot[] {
  const slots: Slot[] = [];
  if (count <= 0) return slots;
  if (kind === 'mob') {
    // A loose cluster: a sunflower spiral, jittered.
    const rng = new Rng(seed);
    for (let i = 0; i < count; i++) {
      const r = spacing * 0.75 * Math.sqrt(i + 0.5) * 1.15;
      const a = i * 2.39996;
      slots.push({ x: Math.cos(a) * r + (rng.next() - 0.5) * spacing * 0.5, z: Math.sin(a) * r + r * 0.6 });
    }
    return slots;
  }
  if (kind === 'crescent') {
    // An arc, convex toward the enemy, two deep when long.
    const ranks = count > 12 ? 2 : 1;
    const perRank = Math.ceil(count / ranks);
    for (let i = 0; i < count; i++) {
      const rank = Math.floor(i / perRank);
      const k = i % perRank;
      const t = perRank > 1 ? k / (perRank - 1) - 0.5 : 0;
      const width = perRank * spacing * 1.25;
      slots.push({ x: t * width, z: rank * spacing + t * t * width * 0.45 });
    }
    return slots;
  }
  const columns = kind === 'line' ? Math.ceil(count / 2) : Math.max(3, Math.min(count, Math.round(Math.sqrt(count * 1.7))));
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / columns);
    const inRow = Math.min(columns, count - row * columns);
    const col = i % columns;
    slots.push({ x: (col - (inRow - 1) / 2) * spacing, z: row * spacing });
  }
  return slots;
}

/** The slot a squad's captain takes: the middle of the second rank (or the front if there's only one). */
export function captainSlot(slots: readonly Slot[]): number {
  if (slots.length < 2) return 0;
  const behind = slots.filter((s) => s.z > 1e-3);
  const z = behind.length ? Math.min(...behind.map((s) => s.z)) : 0;
  let best = 0;
  let bestX = Infinity;
  slots.forEach((s, i) => {
    if (Math.abs(s.z - z) < 1e-3 && Math.abs(s.x) < bestX) {
      best = i;
      bestX = Math.abs(s.x);
    }
  });
  return best;
}
