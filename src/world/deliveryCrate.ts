import * as THREE from 'three';
import { DELIVERY } from '@/content/tuning';
import { SHADOW_LAYER } from '@/render/stage';

interface Crate {
  mesh: THREE.Group;
  time: number;
  ground: number;
  live: boolean;
}

/**
 * Purchases arriving (GDD §2: "purchases arrive as crates that drop out of a spark in the sky"): a small crate falls
 * beside Rosie, lands, sits a moment and sinks into the grass. A few can be on the way at once.
 */
export class DeliveryCrates {
  readonly group = new THREE.Group();
  private readonly crates: Crate[] = [];
  /** A crate appears high up (the spark), and lands (the thud and the dust). */
  onSpawn: ((at: THREE.Vector3) => void) | null = null;
  onLand: ((at: THREE.Vector3) => void) | null = null;

  constructor(private readonly heightAt: (x: number, z: number) => number) {
    const s = DELIVERY.size;
    const wood = new THREE.MeshLambertMaterial({ color: 0xa7774a });
    const band = new THREE.MeshLambertMaterial({ color: 0x5b3c22 });
    const body = new THREE.BoxGeometry(s, s, s);
    const strip = new THREE.BoxGeometry(s * 1.04, s * 0.12, s * 1.04);
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Group();
      const box = new THREE.Mesh(body, wood);
      box.position.y = s / 2;
      mesh.add(box);
      for (const y of [0.18, 0.82]) {
        const b = new THREE.Mesh(strip, band);
        b.position.y = s * y;
        mesh.add(b);
      }
      mesh.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.castShadow = true;
        m.layers.enable(SHADOW_LAYER);
      });
      mesh.visible = false;
      this.group.add(mesh);
      this.crates.push({ mesh, time: 0, ground: 0, live: false });
    }
  }

  /** One purchase: a crate drops (the oldest is reused when all are busy). */
  drop(): void {
    const crate = this.crates.find((c) => !c.live) ?? this.crates.reduce((a, b) => (a.time > b.time ? a : b));
    const { at, spread, height } = DELIVERY;
    const x = at.x + (Math.random() - 0.5) * spread * 2;
    const z = at.z + (Math.random() - 0.5) * spread * 2;
    crate.ground = this.heightAt(x, z);
    crate.time = 0;
    crate.live = true;
    crate.mesh.visible = true;
    crate.mesh.position.set(x, crate.ground + height, z);
    crate.mesh.rotation.set(0, Math.random() * Math.PI, 0);
    this.onSpawn?.(crate.mesh.position);
  }

  update(dt: number): void {
    const { fall, stay, sink, height, size } = DELIVERY;
    for (const c of this.crates) {
      if (!c.live) continue;
      const before = c.time;
      c.time += dt;
      const p = c.mesh.position;
      if (c.time < fall) {
        // Falling, faster as it goes.
        const k = c.time / fall;
        p.y = c.ground + height * (1 - k * k);
      } else if (c.time < fall + stay) {
        p.y = c.ground;
        if (before < fall) this.onLand?.(p);
      } else if (c.time < fall + stay + sink) {
        p.y = c.ground - ((c.time - fall - stay) / sink) * size * 1.1;
      } else {
        c.live = false;
        c.mesh.visible = false;
      }
    }
  }

  /** Clears every crate (a new battle, the map). */
  clear(): void {
    for (const c of this.crates) {
      c.live = false;
      c.mesh.visible = false;
    }
  }
}
