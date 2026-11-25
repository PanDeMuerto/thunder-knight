import type { Bodies } from './bodies';

export interface ShotHit {
  id: number;
  /** Distance along the ray. */
  t: number;
}

/**
 * Distance along a ray (unit direction) to a standing capsule whose feet are at `y`, or Infinity. After Inigo Quilez's
 * capsule intersection. A ray that starts inside returns 0.
 */
export function rayCapsule(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  x: number,
  y: number,
  z: number,
  height: number,
  r: number,
): number {
  const half = Math.max(0, height - 2 * r);
  // The ray's start relative to the bottom of the capsule's core segment, which runs up by `half`.
  const ax = ox - x;
  const ay = oy - (y + r);
  const az = oz - z;
  const k = half > 0 ? Math.max(0, Math.min(1, ay / half)) : 0;
  const iy = ay - k * half;
  if (ax * ax + iy * iy + az * az <= r * r) return 0;
  const baba = half * half;
  if (baba < 1e-12) return raySphere(dx, dy, dz, ax, ay, az, r);
  const bard = dy * half;
  const a = baba - bard * bard;
  // Straight along the axis: only the end caps can be hit.
  if (a < 1e-9) return Math.min(raySphere(dx, dy, dz, ax, ay, az, r), raySphere(dx, dy, dz, ax, ay - half, az, r));
  const baoa = ay * half;
  const rdoa = dx * ax + dy * ay + dz * az;
  const oaoa = ax * ax + ay * ay + az * az;
  const b = baba * rdoa - baoa * bard;
  const c = baba * oaoa - baoa * baoa - r * r * baba;
  const h = b * b - a * c;
  if (h < 0) return Infinity;
  const t = (-b - Math.sqrt(h)) / a;
  const along = baoa + t * bard;
  if (along > 0 && along < baba) return t >= 0 ? t : Infinity;
  return along <= 0 ? raySphere(dx, dy, dz, ax, ay, az, r) : raySphere(dx, dy, dz, ax, ay - half, az, r);
}

/** A ray from `o` (relative to the sphere's centre) against a sphere of radius r: the distance in front, or Infinity. */
function raySphere(dx: number, dy: number, dz: number, ox: number, oy: number, oz: number, r: number): number {
  const b = ox * dx + oy * dy + oz * dz;
  const c = ox * ox + oy * oy + oz * oz - r * r;
  const h = b * b - c;
  if (h < 0) return Infinity;
  const t = -b - Math.sqrt(h);
  if (t >= 0) return t;
  return c < 0 ? 0 : Infinity;
}

const candidates: number[] = [];

/**
 * One bullet (tech design §5.4): walks the hash cells along the ray, tests each body's capsule, and returns the first
 * `pierce` bodies hit between `start` and `end` (metres along the ray), nearest first. `hitScale` widens bodies (aim
 * assist's forgiveness). Fills `out` and returns how many.
 */
export function traceShot(
  bodies: Bodies,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  start: number,
  end: number,
  pierce: number,
  hitScale: number,
  out: ShotHit[],
): number {
  out.length = 0;
  if (end <= start || pierce <= 0) return 0;
  candidates.length = 0;
  const pad = bodies.maxRadius * hitScale + 0.05;
  bodies.hash.querySegment(ox + dx * start, oz + dz * start, ox + dx * end, oz + dz * end, pad, candidates);
  for (const id of candidates) {
    if (!bodies.alive[id] || bodies.open[id]) continue;
    const r = bodies.radius[id]! * hitScale;
    const t = rayCapsule(ox, oy, oz, dx, dy, dz, bodies.x[id]!, bodies.y[id]!, bodies.z[id]!, bodies.height[id]!, r);
    if (t < start || t > end) continue;
    out.push({ id, t });
  }
  out.sort((a, b) => a.t - b.t);
  if (out.length > pierce) out.length = pierce;
  return out.length;
}
