import { GUN_LEVELS, GUNS, type GunDef, type GunId } from '@/content/guns';

/** A gun's numbers at a level, after ★ upgrades (GDD §8.1). */
export interface GunStats {
  damage: number;
  magazine: number;
  reload: number;
}

export function clampLevel(level: number): number {
  return Math.max(1, Math.min(GUN_LEVELS.max, Math.floor(level)));
}

/** Each level above ★1 adds 20% damage and 15% magazine, and takes 5% off the reload. */
export function gunStats(def: GunDef, level: number): GunStats {
  const steps = clampLevel(level) - 1;
  return {
    damage: Math.round(def.damage * (1 + GUN_LEVELS.damagePerLevel * steps)),
    magazine: Math.round(def.magazine * (1 + GUN_LEVELS.magazinePerLevel * steps)),
    reload: def.reload * (1 + GUN_LEVELS.reloadPerLevel * steps),
  };
}

/** The price of the next level, or null at ★5. */
export function levelPrice(id: GunId, currentLevel: number): number | null {
  const level = clampLevel(currentLevel);
  const share = GUN_LEVELS.priceShares[level - 1];
  if (share === undefined) return null;
  return Math.round(GUNS[id].value * share);
}
