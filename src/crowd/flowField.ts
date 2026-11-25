/**
 * The way to the banner from anywhere on the field (tech design §5.5): a 1 m grid holding the walking distance to the
 * capture ring around props, built once per battlefield. Enemies steer down its slope; squads move their anchor
 * along it. Built with Dijkstra over 8 neighbours, so diagonals cost √2.
 */
export class FlowField {
  readonly cols: number;
  readonly rows: number;
  /** Walking distance to the goal ring, per cell (Infinity inside props). */
  readonly cost: Float32Array;
  private readonly blocked: Uint8Array;

  constructor(
    readonly minX: number,
    readonly minZ: number,
    readonly size: number,
    readonly cell: number,
    isBlocked: (x: number, z: number) => boolean,
  ) {
    this.cols = Math.ceil(size / cell);
    this.rows = this.cols;
    this.cost = new Float32Array(this.cols * this.rows).fill(Infinity);
    this.blocked = new Uint8Array(this.cols * this.rows);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (isBlocked(this.minX + (c + 0.5) * cell, this.minZ + (r + 0.5) * cell)) this.blocked[r * this.cols + c] = 1;
      }
    }
  }

  /** Fills the distances to a ring of `radius` round (gx, gz). */
  build(gx: number, gz: number, radius: number): void {
    const { cols, rows, cell } = this;
    this.cost.fill(Infinity);
    const heap = new MinHeap(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (this.blocked[i]) continue;
        const x = this.minX + (c + 0.5) * cell;
        const z = this.minZ + (r + 0.5) * cell;
        if (Math.hypot(x - gx, z - gz) <= radius) {
          this.cost[i] = 0;
          heap.push(i, 0);
        }
      }
    }
    while (heap.size) {
      const i = heap.pop();
      const base = this.cost[i]!;
      const c = i % cols;
      const r = (i - c) / cols;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nc = c + dc;
          const nr = r + dr;
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
          const n = nr * cols + nc;
          if (this.blocked[n]) continue;
          // No cutting corners past a prop.
          if (dr && dc && (this.blocked[r * cols + nc] || this.blocked[nr * cols + c])) continue;
          const next = base + (dr && dc ? Math.SQRT2 : 1) * cell;
          if (next < this.cost[n]!) {
            this.cost[n] = next;
            heap.push(n, next);
          }
        }
      }
    }
  }

  /** Walking distance from a point to the ring (bilinear between cells). */
  distance(x: number, z: number): number {
    const fx = (x - this.minX) / this.cell - 0.5;
    const fz = (z - this.minZ) / this.cell - 0.5;
    const c = Math.max(0, Math.min(this.cols - 1, Math.round(fx)));
    const r = Math.max(0, Math.min(this.rows - 1, Math.round(fz)));
    return this.cost[r * this.cols + c]!;
  }

  /**
   * The downhill direction at a point, as a unit vector into `out` (zero at the goal). The slope of the distance,
   * from the four cells round the point, so steering is smooth between cells.
   */
  direction(x: number, z: number, out: { x: number; z: number }): void {
    const h = this.cell;
    const here = this.nearestCost(x, z);
    // A blocked or outside neighbour counts as uphill from here, so the slope never points into a prop.
    const e = this.sample(x + h, z, here);
    const w = this.sample(x - h, z, here);
    const s = this.sample(x, z + h, here);
    const n = this.sample(x, z - h, here);
    const dx = w - e;
    const dz = n - s;
    const l = Math.hypot(dx, dz);
    if (l < 1e-6) {
      out.x = 0;
      out.z = 0;
      return;
    }
    out.x = dx / l;
    out.z = dz / l;
  }

  private sample(x: number, z: number, here: number): number {
    const c = Math.floor((x - this.minX) / this.cell);
    const r = Math.floor((z - this.minZ) / this.cell);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return here + this.cell * 2;
    const v = this.cost[r * this.cols + c]!;
    return Number.isFinite(v) ? v : here + this.cell * 2;
  }

  /** The cost of the cell under a point, or of the nearest open cell round it. */
  private nearestCost(x: number, z: number): number {
    const c = Math.max(0, Math.min(this.cols - 1, Math.floor((x - this.minX) / this.cell)));
    const r = Math.max(0, Math.min(this.rows - 1, Math.floor((z - this.minZ) / this.cell)));
    const own = this.cost[r * this.cols + c]!;
    if (Number.isFinite(own)) return own;
    let best = Infinity;
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= this.cols || nr >= this.rows) continue;
        best = Math.min(best, this.cost[nr * this.cols + nc]!);
      }
    }
    return Number.isFinite(best) ? best : 1e4;
  }
}

/** A binary heap of cell indices by cost (decrease-key by pushing again; stale entries are skipped by the caller's check). */
class MinHeap {
  private readonly ids: Int32Array;
  private readonly keys: Float32Array;
  size = 0;

  constructor(capacity: number) {
    this.ids = new Int32Array(capacity * 4);
    this.keys = new Float32Array(capacity * 4);
  }

  push(id: number, key: number): void {
    let i = this.size++;
    this.ids[i] = id;
    this.keys[i] = key;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p]! <= this.keys[i]!) break;
      this.swap(i, p);
      i = p;
    }
  }

  pop(): number {
    const top = this.ids[0]!;
    this.size--;
    if (this.size > 0) {
      this.ids[0] = this.ids[this.size]!;
      this.keys[0] = this.keys[this.size]!;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.size && this.keys[l]! < this.keys[m]!) m = l;
        if (r < this.size && this.keys[r]! < this.keys[m]!) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    const id = this.ids[a]!;
    const key = this.keys[a]!;
    this.ids[a] = this.ids[b]!;
    this.keys[a] = this.keys[b]!;
    this.ids[b] = id;
    this.keys[b] = key;
  }
}
