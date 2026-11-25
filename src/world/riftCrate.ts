import * as THREE from 'three';

const DROP_HEIGHT = 7;
const DROP_SECONDS = 0.7;

/**
 * The rift crate (GDD §12.3), a greybox until M7: a wooden crate with a soft violet glow that drops out of the sky
 * beside the truck in a break, with a violet ring on the ground where it lands. Walking up to it opens its offer.
 * Calm: no flashing, a slow bob once it has landed.
 */
export class RiftCrate {
  readonly group = new THREE.Group();
  /** Where it lands. */
  readonly at = new THREE.Vector3();
  private readonly box: THREE.Group;
  private readonly ring: THREE.Mesh;
  private time = 0;
  private live = false;
  /** Called once as it lands (dust and a thud). */
  onLand: ((at: THREE.Vector3) => void) | null = null;

  constructor(private readonly heightAt: (x: number, z: number) => number) {
    this.box = new THREE.Group();
    const wood = new THREE.MeshLambertMaterial({ color: 0x9a6b3f, emissive: 0x4b2f8f, emissiveIntensity: 0.35 });
    const band = new THREE.MeshLambertMaterial({ color: 0x5b3c22 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), wood);
    body.position.y = 0.35;
    body.castShadow = true;
    this.box.add(body);
    for (const y of [0.12, 0.58]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.08, 0.94), band);
      strip.position.y = y;
      this.box.add(strip);
    }
    const ring = new THREE.RingGeometry(0.85, 1.05, 40);
    ring.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(
      ring,
      new THREE.MeshBasicMaterial({ color: 0xa99bff, transparent: true, opacity: 0.6, depthWrite: false }),
    );
    this.group.add(this.box, this.ring);
    this.group.visible = false;
  }

  /** On the field (landed or falling). */
  get active(): boolean {
    return this.live;
  }

  get landed(): boolean {
    return this.live && this.time >= DROP_SECONDS;
  }

  /** Drops a crate at (x, z). */
  drop(x: number, z: number): void {
    this.at.set(x, this.heightAt(x, z), z);
    this.group.position.copy(this.at);
    this.time = 0;
    this.live = true;
    this.group.visible = true;
    this.ring.visible = false;
    this.box.position.y = DROP_HEIGHT;
  }

  remove(): void {
    this.live = false;
    this.group.visible = false;
  }

  /** Metres from (x, z) to the crate. */
  distance(x: number, z: number): number {
    return Math.hypot(x - this.at.x, z - this.at.z);
  }

  update(dt: number): void {
    if (!this.live) return;
    const before = this.time;
    this.time += dt;
    if (this.time < DROP_SECONDS) {
      const k = this.time / DROP_SECONDS;
      this.box.position.y = DROP_HEIGHT * (1 - k * k);
      return;
    }
    if (before < DROP_SECONDS) {
      this.ring.visible = true;
      this.onLand?.(this.at);
    }
    // A slow, small bob and turn once landed.
    const t = this.time - DROP_SECONDS;
    this.box.position.y = 0.04 + Math.sin(t * 2.2) * 0.04;
    this.box.rotation.y = Math.sin(t * 0.7) * 0.15;
    (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.45 + Math.sin(t * 2.2) * 0.15;
  }
}
