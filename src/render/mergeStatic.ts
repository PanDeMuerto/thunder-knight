import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Merges the meshes under `root` that never move against it into one mesh per colour, so a model built in code from
 * dozens of boxes (the Siege Tower, a ram, a catapult, the War Wagon) costs a handful of draw calls rather than one per
 * box, twice over with the shadow pass. Meshes inside `moving` (wheels, doors, an arm, the weak points that hide when
 * broken) are left alone. Each merged mesh takes the first material of its colour.
 */
export function mergeStatic(root: THREE.Object3D, moving: readonly THREE.Object3D[] = []): void {
  const skip = new Set<THREE.Object3D>();
  for (const m of moving) m.traverse((o) => skip.add(o));
  root.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || skip.has(mesh) || Array.isArray(mesh.material)) return;
    const material = mesh.material as THREE.MeshLambertMaterial;
    const key = `${material.type}:${material.color?.getHexString() ?? ''}:${material.emissive?.getHexString() ?? ''}:${material.flatShading ? 1 : 0}`;
    let g = groups.get(key);
    if (!g) {
      g = { material, geometries: [], meshes: [] };
      groups.set(key, g);
    }
    const geometry = (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
    // Only what every box and cylinder has, so they merge.
    for (const name of Object.keys(geometry.attributes)) if (name !== 'position' && name !== 'normal') geometry.deleteAttribute(name);
    g.geometries.push(geometry);
    g.meshes.push(mesh);
  });
  for (const g of groups.values()) {
    if (g.meshes.length < 2) continue;
    const merged = mergeGeometries(g.geometries, false);
    if (!merged) continue;
    for (const mesh of g.meshes) mesh.removeFromParent();
    root.add(new THREE.Mesh(merged, g.material));
  }
}
