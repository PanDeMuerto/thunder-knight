import * as THREE from 'three';
import { BANNER_LOOK } from '@/content/fields';
import { SHADOW_LAYER } from '@/render/stage';

/** The flag's sideways ripple at `x` metres from the pole (none at the pole, `ripple` at the far end). */
function ripple(x: number): number {
  const { width, ripple: amount, waves } = BANNER_LOOK.flag;
  return amount * (x / width) * Math.sin((x / width) * waves * Math.PI * 2);
}

/** The flag: a strip from the pole, cut into two tails at the far end, rippled. Its top edge is at y = 0. */
function flagGeometry(): THREE.BufferGeometry {
  const { width, height, notch } = BANNER_LOOK.flag;
  const columns = 14;
  const g = new THREE.PlaneGeometry(width, height, columns, 2);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i) + width / 2;
    const y = p.getY(i) - height / 2;
    // The middle row stops short of the end: the swallow tail's notch.
    if (Math.abs(y + height / 2) < 1e-3) x = Math.min(x, width - notch);
    p.setXYZ(i, x, y, ripple(x));
  }
  g.computeVertexNormals();
  return g;
}

/** A simple crown: a band with three points, flat, centred on the origin. */
function crownGeometry(): THREE.BufferGeometry {
  const s = BANNER_LOOK.crown.size;
  const w = s / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-w, -s * 0.35);
  shape.lineTo(w, -s * 0.35);
  shape.lineTo(w, s * 0.3);
  shape.lineTo(w * 0.5, 0);
  shape.lineTo(0, s * 0.38);
  shape.lineTo(-w * 0.5, 0);
  shape.lineTo(-w, s * 0.3);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

/** Queen Ada's banner, its foot at the origin: the pole, knob, crossbar, flag and crown on both faces. */
export function queenBanner(): THREE.Group {
  const { pole, knob, flag, crown } = BANNER_LOOK;
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: pole.color });
  const gold = new THREE.MeshLambertMaterial({ color: knob.color, side: THREE.DoubleSide });
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(pole.radius * 0.85, pole.radius * 1.1, pole.height, 8), wood);
  stick.position.y = pole.height / 2;
  const top = new THREE.Mesh(new THREE.IcosahedronGeometry(knob.radius, 1), gold);
  top.position.y = pole.height + knob.radius * 0.6;
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(pole.radius * 0.5, pole.radius * 0.5, flag.width + 0.15, 6), wood);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(flag.width / 2, flag.top, 0);
  const cloth = new THREE.Mesh(flagGeometry(), new THREE.MeshLambertMaterial({ color: flag.color, side: THREE.DoubleSide }));
  cloth.position.set(0, flag.top - 0.04, 0);
  g.add(stick, top, bar, cloth);
  // The crown on both faces, just off the cloth (it sits near the pole, where the ripple is small).
  for (const side of [1, -1]) {
    const c = new THREE.Mesh(crownGeometry(), gold);
    c.position.set(crown.at, flag.top - 0.04 - flag.height * 0.42, ripple(crown.at) + side * 0.025);
    if (side < 0) c.rotation.y = Math.PI;
    g.add(c);
  }
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.layers.enable(SHADOW_LAYER);
    m.castShadow = true;
  });
  return g;
}
