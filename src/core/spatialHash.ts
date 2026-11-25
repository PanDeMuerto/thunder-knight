/**
 * A uniform grid over the ground plane (x, z) for finding bodies near a point or along a ray without looking at every
 * one (tech design §5.4–5.5). Linked lists in typed arrays: rebuilding it every tick allocates nothing. Points
 * outside the bounds land in the edge cells, so nothing is ever lost.
 */
export class SpatialHash {
  readonly cols: number;
  readonly rows: number;
  private readonly head: Int32Array;
  private next: Int32Array;
  /** Per id, the query that last returned it, so each query returns an id once. */
  private seen: Uint32Array;
  private readonly cellSeen: Uint32Array;
  private query = 0;

  constructor(
    readonly cell: number,
    readonly minX: number,
    readonly minZ: number,
    maxX: number,
    maxZ: number,
    capacity: number,
  ) {
    this.cols = Math.max(1, Math.ceil((maxX - minX) / cell));
    this.rows = Math.max(1, Math.ceil((maxZ - minZ) / cell));
    this.head = new Int32Array(this.cols * this.rows).fill(-1);
    this.cellSeen = new Uint32Array(this.cols * this.rows);
    this.next = new Int32Array(capacity).fill(-1);
    this.seen = new Uint32Array(capacity);
  }

  clear(): void {
    this.head.fill(-1);
  }

  col(x: number): number {
    return Math.max(0, Math.min(this.cols - 1, Math.floor((x - this.minX) / this.cell)));
  }

  row(z: number): number {
    return Math.max(0, Math.min(this.rows - 1, Math.floor((z - this.minZ) / this.cell)));
  }

  insert(id: number, x: number, z: number): void {
    if (id >= this.next.length) this.grow(id + 1);
    const c = this.row(z) * this.cols + this.col(x);
    this.next[id] = this.head[c]!;
    this.head[c] = id;
  }

  /** Appends every id in the cells touching a circle (a broad phase: callers test the exact shape). */
  queryCircle(x: number, z: number, r: number, out: number[]): void {
    this.begin();
    const c0 = this.col(x - r);
    const c1 = this.col(x + r);
    const r0 = this.row(z - r);
    const r1 = this.row(z + r);
    for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++) this.collect(row * this.cols + col, out);
  }

  /**
   * Appends every id in the cells within `pad` of a segment on the ground, roughly in order along it. Walks the grid
   * cell by cell (Amanatides and Woo), visiting the neighbouring cells too when `pad` reaches into them.
   */
  querySegment(x0: number, z0: number, x1: number, z1: number, pad: number, out: number[]): void {
    this.begin();
    const dx = x1 - x0;
    const dz = z1 - z0;
    const length = Math.hypot(dx, dz);
    let col = this.col(x0);
    let row = this.row(z0);
    const endCol = this.col(x1);
    const endRow = this.row(z1);
    const spread = Math.ceil(pad / this.cell);
    this.visitAround(col, row, spread, out);
    if (length < 1e-9) return;
    const stepCol = dx > 0 ? 1 : -1;
    const stepRow = dz > 0 ? 1 : -1;
    const ux = dx / length;
    const uz = dz / length;
    const nextX = this.minX + (col + (stepCol > 0 ? 1 : 0)) * this.cell;
    const nextZ = this.minZ + (row + (stepRow > 0 ? 1 : 0)) * this.cell;
    let tMaxX = Math.abs(ux) > 1e-12 ? (nextX - x0) / ux : Infinity;
    let tMaxZ = Math.abs(uz) > 1e-12 ? (nextZ - z0) / uz : Infinity;
    const tDeltaX = Math.abs(ux) > 1e-12 ? this.cell / Math.abs(ux) : Infinity;
    const tDeltaZ = Math.abs(uz) > 1e-12 ? this.cell / Math.abs(uz) : Infinity;
    // A guard against an endless walk if the end cell is clamped.
    let steps = this.cols + this.rows + 2;
    while ((col !== endCol || row !== endRow) && steps-- > 0) {
      if (tMaxX < tMaxZ) {
        if (tMaxX > length) break;
        col += stepCol;
        tMaxX += tDeltaX;
      } else {
        if (tMaxZ > length) break;
        row += stepRow;
        tMaxZ += tDeltaZ;
      }
      if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) break;
      this.visitAround(col, row, spread, out);
    }
  }

  private visitAround(col: number, row: number, spread: number, out: number[]): void {
    const c0 = Math.max(0, col - spread);
    const c1 = Math.min(this.cols - 1, col + spread);
    const r0 = Math.max(0, row - spread);
    const r1 = Math.min(this.rows - 1, row + spread);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) this.collect(r * this.cols + c, out);
  }

  private begin(): void {
    this.query++;
    if (this.query === 0xffffffff) {
      this.query = 1;
      this.seen.fill(0);
      this.cellSeen.fill(0);
    }
  }

  private collect(cellIndex: number, out: number[]): void {
    if (this.cellSeen[cellIndex] === this.query) return;
    this.cellSeen[cellIndex] = this.query;
    for (let id = this.head[cellIndex]!; id >= 0; id = this.next[id]!) {
      if (this.seen[id] === this.query) continue;
      this.seen[id] = this.query;
      out.push(id);
    }
  }

  private grow(capacity: number): void {
    const size = Math.max(capacity, this.next.length * 2);
    const next = new Int32Array(size).fill(-1);
    next.set(this.next);
    this.next = next;
    const seen = new Uint32Array(size);
    seen.set(this.seen);
    this.seen = seen;
  }
}
