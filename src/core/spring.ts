/**
 * A damped spring, stepped in small slices so it stays stable at any frame rate. Impulses set it
 * moving; it settles back to zero by itself. Recoil, landings and bumps are all springs, so they
 * overlap and blend instead of snapping.
 */
export class Spring {
  x = 0;
  private v = 0;

  constructor(
    private readonly stiffness: number,
    private readonly damping: number,
  ) {}

  kick(velocity: number): void {
    this.v += velocity;
  }

  update(dt: number): number {
    const slices = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / slices;
    for (let i = 0; i < slices; i++) {
      this.v += (-this.stiffness * this.x - this.damping * this.v) * h;
      this.x += this.v * h;
    }
    return this.x;
  }

  reset(): void {
    this.x = 0;
    this.v = 0;
  }
}
