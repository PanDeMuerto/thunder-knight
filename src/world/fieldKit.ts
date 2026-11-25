import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PIECE_SCALE, type PieceId, type Placement } from '@/content/fields';
import { recolour } from '@/render/recolour';
import { SHADOW_LAYER } from '@/render/stage';

/** A footprint that blocks the hero (x/z) and shots and the camera (with its height). */
export interface Footprint {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  height: number;
}

interface Part {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /** The part's place inside its piece. */
  local: THREE.Matrix4;
}

/** Pieces that don't cast shadows (flat or tiny): saves shadow draws. */
const NO_SHADOW: ReadonlySet<PieceId> = new Set(['rockA', 'rockB', 'rockC', 'crate', 'sack', 'flagRed']);

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const box = new THREE.Box3();

/**
 * The field kit (`public/assets/field/kit.glb`, built by `npm run assets:field`): one named node per piece. `build`
 * turns a list of placements into a group, each piece drawn once for all its copies (instancing), on the ground's
 * height, with Lambert materials like the rest of the field. Solid placements return their footprints.
 */
/** The burnt orchard's pieces (Region 4): their leaves turn charcoal at load. */
const BURNT = new Set<PieceId>(['treeBurnt', 'treesBurnt', 'stumpBurnt']);

export class FieldKit {
  private readonly parts = new Map<PieceId, Part[]>();
  /** Each piece's bounds at its usual scale, centred on its origin. */
  private readonly bounds = new Map<PieceId, THREE.Box3>();
  private readonly materials = new Map<THREE.Material, THREE.Material>();
  /** The later regions' pieces have arrived (`addLater`, M11). */
  complete = false;

  private constructor(root: THREE.Object3D) {
    this.add(root);
  }

  /** Takes a kit file's pieces: one named node each. */
  private add(root: THREE.Object3D): void {
    const materials = this.materials;
    const lambert = (m: THREE.Material, id: PieceId): THREE.Material => {
      let out = materials.get(m);
      if (!out) {
        const std = m as THREE.MeshStandardMaterial;
        // Rosie's truck is teal (GDD §18.1): the pickup's blue paint is turned teal in its palette. The burnt orchard's
        // leaves turn from green to charcoal (a darker colour alone only made them dark green).
        const map =
          id === 'truck' && std.map
            ? recolour(std.map, 195, 255, 176)
            : BURNT.has(id) && std.map
              ? recolour(std.map, 60, 185, 28, { saturation: 0.2, light: 0.9 })
              : (std.map ?? null);
        out = new THREE.MeshLambertMaterial({ map, color: std.color ?? new THREE.Color(1, 1, 1) });
        materials.set(m, out);
      }
      return out;
    };
    root.updateMatrixWorld(true);
    for (const node of root.children) {
      const id = node.name as PieceId;
      const inverse = new THREE.Matrix4().copy(node.matrixWorld).invert();
      const parts: Part[] = [];
      const bounds = new THREE.Box3();
      node.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const local = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
        const material = Array.isArray(mesh.material) ? mesh.material[0]! : mesh.material;
        parts.push({ geometry: mesh.geometry, material: lambert(material, id), local });
        mesh.geometry.computeBoundingBox();
        bounds.union(box.copy(mesh.geometry.boundingBox!).applyMatrix4(local));
      });
      this.parts.set(id, parts);
      this.bounds.set(id, bounds);
    }
  }

  /** Region 1's kit and the pieces every battle shares (the first download). */
  static async load(url = 'assets/field/kit.glb'): Promise<FieldKit> {
    const gltf = await new GLTFLoader().loadAsync(url);
    return new FieldKit(gltf.scene);
  }

  /** The later regions' pieces (`kit-later.glb`, M11), fetched after the first load. */
  async addLater(url = 'assets/field/kit-later.glb'): Promise<void> {
    if (this.complete) return;
    const gltf = await new GLTFLoader().loadAsync(url);
    this.add(gltf.scene);
    this.complete = true;
  }

  has(id: PieceId): boolean {
    return this.parts.has(id);
  }

  /** A piece's size (x, y, z) at scale 1. */
  size(id: PieceId, out = new THREE.Vector3()): THREE.Vector3 {
    return this.bounds.get(id)?.getSize(out) ?? out.set(0, 0, 0);
  }

  /** Where a placement stands in the world: on the ground, turned, scaled. */
  placementMatrix(p: Placement, heightAt: (x: number, z: number) => number, out = new THREE.Matrix4()): THREE.Matrix4 {
    const s = PIECE_SCALE[p.piece] * (p.size ?? 1);
    tmpQ.setFromAxisAngle(UP, p.rot ?? 0);
    tmpV.set(p.x, heightAt(p.x, p.z) - (p.sink ?? 0), p.z);
    return out.compose(tmpV, tmpQ, tmpS.set(s, s, s));
  }

  /**
   * The placements as one group: every piece's parts instanced over its copies. Returns the group and the solid
   * placements' footprints (their bounds on the ground, a little inside the visible edge).
   */
  build(placements: readonly Placement[], heightAt: (x: number, z: number) => number): { group: THREE.Group; solids: Footprint[] } {
    const group = new THREE.Group();
    const solids: Footprint[] = [];
    const byPiece = new Map<PieceId, Placement[]>();
    for (const p of placements) {
      if (!this.parts.has(p.piece)) continue;
      const list = byPiece.get(p.piece) ?? [];
      list.push(p);
      byPiece.set(p.piece, list);
    }
    const place = new THREE.Matrix4();
    for (const [id, list] of byPiece) {
      for (const part of this.parts.get(id)!) {
        const mesh = new THREE.InstancedMesh(part.geometry, part.material, list.length);
        list.forEach((p, n) => mesh.setMatrixAt(n, tmpM.multiplyMatrices(this.placementMatrix(p, heightAt, place), part.local)));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        mesh.receiveShadow = true;
        if (!NO_SHADOW.has(id)) {
          mesh.castShadow = true;
          mesh.layers.enable(SHADOW_LAYER);
        }
        group.add(mesh);
      }
      for (const p of list) {
        if (!p.solid) continue;
        box.copy(this.bounds.get(id)!).applyMatrix4(this.placementMatrix(p, heightAt, place));
        // A little inside the visible edge, so the hero can brush past a roof's overhang.
        const inset = Math.min(0.4, (box.max.x - box.min.x) * 0.12);
        solids.push({ minX: box.min.x + inset, minZ: box.min.z + inset, maxX: box.max.x - inset, maxZ: box.max.z - inset, height: box.max.y });
      }
    }
    return { group, solids };
  }
}
