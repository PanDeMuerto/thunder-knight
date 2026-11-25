import * as THREE from 'three';
import { el, toggle } from './dom';
import { ICONS } from './icons';

export type ArrowKind = 'banner' | 'truck' | 'squad' | 'crate';

interface Arrow {
  node: HTMLElement;
  kind: ArrowKind;
  live: boolean;
}

const MAX = 8;
const tmp = new THREE.Vector3();
const local = new THREE.Vector3();

/**
 * Off-screen arrows at the screen's edge (GDD §15.3): the banner when it's under attack (blue flag), the truck in a
 * break (teal), a rift crate (violet), and arriving squads (small red chevrons). An arrow shows only while its target is off screen or
 * behind the camera, and points toward it. Rebuilt each frame from a short list; pooled.
 */
export class EdgeArrows {
  private readonly layer: HTMLElement;
  private readonly arrows: Arrow[] = [];
  private used = 0;

  constructor(parent: HTMLElement) {
    this.layer = el('div', 'edge-arrows', parent);
  }

  begin(): void {
    this.used = 0;
  }

  /** Points at a world position if it's off screen. Call between `begin` and `end` each frame. */
  point(camera: THREE.Camera, at: THREE.Vector3, kind: ArrowKind, width: number, height: number): void {
    if (this.used >= MAX) return;
    // Where the point is relative to the camera: in front and on screen means no arrow.
    local.copy(at).applyMatrix4(camera.matrixWorldInverse);
    tmp.copy(at).project(camera);
    const inFront = local.z < 0;
    const margin = 0.92;
    if (inFront && Math.abs(tmp.x) < margin && Math.abs(tmp.y) < margin) return;
    // Direction on screen: from the camera-space x/y (flipped when behind, so it points the way to turn).
    let dx = local.x;
    let dy = local.y;
    if (!inFront && Math.abs(dx) < 1e-3) dx = 1;
    if (inFront) {
      dx = tmp.x * width;
      dy = tmp.y * height;
    }
    const angle = Math.atan2(-dy, dx);
    const a = this.take(kind);
    // Onto an ellipse just inside the screen's edge.
    const rx = width / 2 - 36;
    const ry = height / 2 - 36;
    const x = width / 2 + Math.cos(angle) * rx;
    const y = height / 2 + Math.sin(angle) * ry;
    a.node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
    (a.node.firstElementChild as HTMLElement).style.transform = `rotate(${angle}rad)`;
  }

  end(): void {
    for (let i = 0; i < this.arrows.length; i++) {
      const a = this.arrows[i]!;
      const live = i < this.used;
      if (live !== a.live) {
        a.live = live;
        toggle(a.node, 'is-hidden', !live);
      }
    }
  }

  private take(kind: ArrowKind): Arrow {
    let a = this.arrows[this.used];
    if (!a) {
      const node = el('div', 'edge-arrow is-hidden', this.layer);
      el('span', 'edge-arrow-tip', node, ICONS.chevron);
      el('span', 'edge-arrow-icon', node);
      a = { node, kind, live: false };
      this.arrows.push(a);
    }
    if (a.kind !== kind || !a.node.dataset.kind) {
      a.kind = kind;
      a.node.dataset.kind = kind;
      const icon = a.node.querySelector('.edge-arrow-icon')!;
      icon.innerHTML = kind === 'banner' ? ICONS.flag : kind === 'truck' ? ICONS.truck : kind === 'crate' ? ICONS.crate : '';
    }
    this.used++;
    return a;
  }
}
