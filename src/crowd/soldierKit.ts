import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ARCHETYPES, CLIPS, CROWD, HORSE, ONE_SHOT, TOWER_SHIELD, type ArchetypeId, type ClipName } from '@/content/soldiers';

/** Clips are sampled at this rate into the bone texture. */
export const CLIP_FPS = 30;
/** Texels per bone per frame: the three rows of its 3×4 matrix. */
const TEXELS_PER_BONE = 3;

export interface ClipInfo {
  /** First row in the bone texture. */
  start: number;
  frames: number;
  duration: number;
  loop: boolean;
  /** For walk and run: the speed the feet move at, in metres a second at game scale (rate = speed / this). */
  speed: number;
}

export interface Archetype {
  /** A soldier model, or a mount (the riders' horse, M9). */
  id: ArchetypeId | 'horse';
  /** Body and every kept accessory merged, skinned to the shared rig; `aPart` says which part a vertex belongs to. */
  geometry: THREE.BufferGeometry;
  /** Part names; a part's index is its bit in a soldier's part mask (0 is the body, always shown). */
  parts: string[];
  map: THREE.Texture;
  /** Bone matrices for every clip frame, rows = frames. */
  bones: THREE.DataTexture;
  boneCount: number;
  /** Model units to metres, so the soldier stands `CROWD.height` tall. */
  scale: number;
  cloth: THREE.Color;
}

/** Palette cells in the knight texture for the captain's banner (u, v from the top left). */
const CELL = { red: [0.05, 0.36], gold: [0.54, 0.33], wood: [0.79, 0.12] } as const;

/**
 * The crowd's models and animation, built once at load (tech design §5.6). Instead of baking vertex positions, the
 * shared rig's clips are sampled into a small bone texture and every soldier is skinned on the GPU from it: one
 * draw call per model for the whole crowd, with helmets, shields and weapons riding their bones.
 */
export class SoldierKit {
  readonly archetypes = {} as Record<ArchetypeId, Archetype>;
  /** The riders' horse (M9), on its own rig, sampled into the same clip rows; null if its file didn't load. */
  mount: Archetype | null = null;
  readonly clips = {} as Record<ClipName, ClipInfo>;
  totalFrames = 0;

  static async load(base: string, progress?: (fraction: number) => void): Promise<SoldierKit> {
    const kit = new SoldierKit();
    const loader = new GLTFLoader();
    const ids = Object.keys(ARCHETYPES) as ArchetypeId[];
    let done = 0;
    const loaded = await Promise.all(
      ids.map(async (id) => {
        const gltf = await loader.loadAsync(`${base}${ARCHETYPES[id].file}`);
        progress?.(++done / ids.length);
        return [id, gltf] as const;
      }),
    );
    const byId = new Map(loaded);
    const rigFile = byId.get('knight')!;
    const sampled = kit.sampleClips(rigFile.scene, rigFile.animations);
    for (const id of ids) kit.archetypes[id] = kit.build(id, byId.get(id)!.scene, sampled);
    return kit;
  }

  /**
   * The riders' horse (M9), fetched after the first load (M11: no rider comes before Region 2). Optional: without it
   * riders are drawn on foot.
   */
  async loadMount(base: string): Promise<Archetype | null> {
    if (this.mount) return this.mount;
    try {
      const horse = await new GLTFLoader().loadAsync(`${base}${HORSE.file}`);
      this.mount = this.buildMount(horse.scene, horse.animations);
    } catch (error) {
      console.warn('SoldierKit: the horse failed to load; riders go on foot', error);
    }
    return this.mount;
  }

  /** Every clip's bone world matrices (relative to the model), frame by frame, by bone name. */
  private sampleClips(root: THREE.Object3D, animations: THREE.AnimationClip[]): Map<string, Float32Array> {
    const skinned = findSkinned(root);
    const bones = skinned[0]!.skeleton.bones;
    const mixer = new THREE.AnimationMixer(root);
    const frames: { name: ClipName; clip: THREE.AnimationClip; count: number; loop: boolean }[] = [];
    for (const name of Object.keys(CLIPS) as ClipName[]) {
      const clip = animations.find((a) => a.name === CLIPS[name]);
      if (!clip) throw new Error(`SoldierKit: missing clip ${CLIPS[name]}`);
      const loop = !ONE_SHOT.includes(name);
      const count = Math.max(1, Math.round(clip.duration * CLIP_FPS)) + (loop ? 0 : 1);
      frames.push({ name, clip, count, loop });
    }
    this.totalFrames = frames.reduce((n, f) => n + f.count, 0);
    const out = new Map<string, Float32Array>();
    for (const b of bones) out.set(b.name, new Float32Array(this.totalFrames * 16));
    const rootInverse = new THREE.Matrix4();
    const m = new THREE.Matrix4();
    let row = 0;
    for (const f of frames) {
      mixer.stopAllAction();
      const action = mixer.clipAction(f.clip);
      action.reset().play();
      this.clips[f.name] = { start: row, frames: f.count, duration: f.clip.duration, loop: f.loop, speed: 1 };
      for (let i = 0; i < f.count; i++) {
        action.time = Math.min(i / CLIP_FPS, f.clip.duration);
        mixer.update(0);
        root.updateMatrixWorld(true);
        rootInverse.copy(root.matrixWorld).invert();
        for (const b of bones) {
          m.multiplyMatrices(rootInverse, b.matrixWorld);
          m.toArray(out.get(b.name)!, (row + i) * 16);
        }
      }
      row += f.count;
    }
    mixer.stopAllAction();
    return out;
  }

  private build(id: ArchetypeId, root: THREE.Object3D, sampled: Map<string, Float32Array>): Archetype {
    root.updateMatrixWorld(true);
    const skinned = findSkinned(root);
    const skeleton = skinned[0]!.skeleton;
    // The bind pose: where every accessory sits on its bone.
    skeleton.pose();
    root.updateMatrixWorld(true);
    const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const boneIndex = new Map(skeleton.bones.map((b, i) => [b, i]));
    const parts = ['body'];
    const pieces: THREE.BufferGeometry[] = [];
    let rectangle: THREE.BufferGeometry | null = null;
    for (const mesh of skinned) {
      const g = clean(mesh.geometry);
      g.applyMatrix4(mesh.bindMatrix);
      setPart(g, 0);
      pieces.push(g);
    }
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
      let bone: THREE.Object3D | null = mesh.parent;
      while (bone && !boneIndex.has(bone as THREE.Bone)) bone = bone.parent;
      if (!bone) return;
      const name = partName(mesh);
      let index = parts.indexOf(name);
      if (index < 0) index = parts.push(name) - 1;
      const g = clean(mesh.geometry);
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(rootInverse, mesh.matrixWorld));
      rigid(g, boneIndex.get(bone as THREE.Bone)!);
      setPart(g, index);
      pieces.push(g);
      if (name === TOWER_SHIELD.from) rectangle = g;
    });
    const body = new THREE.Box3();
    for (const mesh of skinned) {
      const box = new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position as THREE.BufferAttribute);
      box.applyMatrix4(mesh.bindMatrix);
      body.union(box);
    }
    const scale = CROWD.height / (body.max.y - Math.min(0, body.min.y));
    if (id === 'knight') {
      const chest = skeleton.bones.find((b) => b.name === 'chest') ?? skeleton.bones[0]!;
      if (rectangle) {
        const tower = towerShield(rectangle, chest.getWorldPosition(new THREE.Vector3()).applyMatrix4(rootInverse), 1 / scale);
        rigid(tower, boneIndex.get(chest)!);
        setPart(tower, parts.push('Tower_Shield') - 1);
        pieces.push(tower);
      }
      const banner = bannerGeometry(1 / scale, chest.getWorldPosition(new THREE.Vector3()).applyMatrix4(rootInverse));
      rigid(banner, boneIndex.get(chest)!);
      setPart(banner, parts.push('banner') - 1);
      pieces.push(banner);
    }
    const geometry = mergeGeometries(pieces, false);
    if (!geometry) throw new Error(`SoldierKit: could not merge ${id}`);
    geometry.computeBoundingSphere();

    const bones = this.boneTexture(skeleton, sampled);
    if (id === 'knight') this.measureSpeeds(sampled, scale);
    const map = ((skinned[0]!.material as THREE.MeshStandardMaterial).map ?? new THREE.Texture()) as THREE.Texture;
    return { id, geometry, parts, map, bones, boneCount: skeleton.bones.length, scale, cloth: new THREE.Color(ARCHETYPES[id].cloth) };
  }

  /** A model's bone texture: the sampled world matrices times its own inverse bind matrices, a row per clip frame. */
  private boneTexture(skeleton: THREE.Skeleton, sampled: Map<string, Float32Array>): THREE.DataTexture {
    const boneCount = skeleton.bones.length;
    const width = boneCount * TEXELS_PER_BONE;
    const data = new Float32Array(width * this.totalFrames * 4);
    const world = new THREE.Matrix4();
    const m = new THREE.Matrix4();
    for (let b = 0; b < boneCount; b++) {
      const frames = sampled.get(skeleton.bones[b]!.name);
      const inverse = skeleton.boneInverses[b]!;
      for (let f = 0; f < this.totalFrames; f++) {
        if (frames) world.fromArray(frames, f * 16);
        else world.identity();
        m.multiplyMatrices(world, inverse);
        const e = m.elements;
        const at = (f * width + b * TEXELS_PER_BONE) * 4;
        // Rows of the 3×4 affine part (elements are column-major).
        data.set([e[0]!, e[4]!, e[8]!, e[12]!, e[1]!, e[5]!, e[9]!, e[13]!, e[2]!, e[6]!, e[10]!, e[14]!], at);
      }
    }
    const bones = new THREE.DataTexture(data, width, this.totalFrames, THREE.RGBAFormat, THREE.FloatType);
    bones.magFilter = bones.minFilter = THREE.NearestFilter;
    bones.needsUpdate = true;
    return bones;
  }

  /**
   * The riders' horse (M9): its own rig, with its clips (`HORSE.clips`) sampled into the same rows as the soldiers'
   * (each row range stretched over the horse's clip), so a horse plays whatever its rider's body plays. Its material
   * colours become a small palette, since the crowd's shader paints from a texture.
   */
  private buildMount(root: THREE.Object3D, animations: THREE.AnimationClip[]): Archetype {
    root.updateMatrixWorld(true);
    const skinned = findSkinned(root);
    const skeleton = skinned[0]!.skeleton;
    const bones = skeleton.bones;
    const mixer = new THREE.AnimationMixer(root);
    const sampled = new Map<string, Float32Array>();
    for (const b of bones) sampled.set(b.name, new Float32Array(this.totalFrames * 16));
    const rootInverse = new THREE.Matrix4();
    const m = new THREE.Matrix4();
    for (const name of Object.keys(this.clips) as ClipName[]) {
      const info = this.clips[name];
      const clip = animations.find((a) => a.name === HORSE.clips[name]) ?? animations[0]!;
      mixer.stopAllAction();
      const action = mixer.clipAction(clip);
      action.reset().play();
      for (let i = 0; i < info.frames; i++) {
        const k = info.loop ? i / info.frames : i / Math.max(1, info.frames - 1);
        action.time = k * clip.duration;
        mixer.update(0);
        root.updateMatrixWorld(true);
        rootInverse.copy(root.matrixWorld).invert();
        for (const b of bones) {
          m.multiplyMatrices(rootInverse, b.matrixWorld);
          m.toArray(sampled.get(b.name)!, (info.start + i) * 16);
        }
      }
    }
    mixer.stopAllAction();
    skeleton.pose();
    root.updateMatrixWorld(true);
    // One palette cell per material, and every vertex of a piece pointed at its cell.
    const colours = skinned.map((mesh) => (mesh.material as THREE.MeshStandardMaterial).color ?? new THREE.Color(0x8a5a3a));
    const pieces = skinned.map((mesh, k) => {
      const g = clean(mesh.geometry);
      g.applyMatrix4(mesh.bindMatrix);
      const n = g.getAttribute('position')!.count;
      const uv = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) uv.set([(k + 0.5) / colours.length, 0.5], i * 2);
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      if (!g.getAttribute('normal')) g.computeVertexNormals();
      setPart(g, 0);
      return g;
    });
    const geometry = mergeGeometries(pieces, false);
    if (!geometry) throw new Error('SoldierKit: could not merge the horse');
    geometry.computeBoundingSphere();
    const pixels = new Uint8Array(colours.length * 4);
    colours.forEach((c, k) => {
      const srgb = c.clone().convertLinearToSRGB();
      pixels.set([Math.round(srgb.r * 255), Math.round(srgb.g * 255), Math.round(srgb.b * 255), 255], k * 4);
    });
    const map = new THREE.DataTexture(pixels, colours.length, 1, THREE.RGBAFormat);
    map.colorSpace = THREE.SRGBColorSpace;
    map.magFilter = map.minFilter = THREE.NearestFilter;
    map.needsUpdate = true;
    // Its size as the bone texture draws it: relative to the model's root, where its node may carry a scale.
    const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const box = new THREE.Box3();
    for (const mesh of skinned) {
      const b = new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position as THREE.BufferAttribute);
      b.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toRoot, mesh.matrixWorld));
      box.union(b);
    }
    const scale = HORSE.height / Math.max(1e-3, box.max.y - Math.min(0, box.min.y));
    // A cloth colour the horse never has (magenta): nothing on it is repainted.
    return { id: 'horse', geometry, parts: ['body'], map, bones: this.boneTexture(skeleton, sampled), boneCount: bones.length, scale, cloth: new THREE.Color(1, 0, 1) };
  }

  /**
   * How fast the feet carry a soldier in the walk and run clips: the planted foot's backward speed. Playing a clip at
   * `actual speed / this` keeps feet from sliding (checked by `tools/qa/feet.mjs`).
   *
   * Planted means the toes are low *and* moving back: in a run the swinging foot also passes close to the ground, but
   * moving forward, and counting it would get the speed wrong.
   */
  private measureSpeeds(sampled: Map<string, Float32Array>, scale: number): void {
    for (const name of ['walk', 'run'] as const) {
      const clip = this.clips[name];
      const speeds: number[] = [];
      // GLTFLoader drops the dots from node names ('toes.l' is 'toesl').
      for (const toes of ['toes.l', 'toes.r']) {
        const frames = sampled.get(THREE.PropertyBinding.sanitizeNodeName(toes));
        if (!frames) continue;
        const ys: number[] = [];
        const zs: number[] = [];
        for (let f = 0; f < clip.frames; f++) {
          ys.push(frames[(clip.start + f) * 16 + 13]!);
          zs.push(frames[(clip.start + f) * 16 + 14]!);
        }
        const low = Math.min(...ys);
        const high = Math.max(...ys);
        for (let f = 0; f < clip.frames; f++) {
          const next = (f + 1) % clip.frames;
          const dz = zs[next]! - zs[f]!;
          // The models face +Z, so a planted foot moves toward −Z.
          if (dz >= 0) continue;
          if (ys[f]! > low + (high - low) * 0.25 || ys[next]! > low + (high - low) * 0.25) continue;
          speeds.push(-dz * CLIP_FPS);
        }
      }
      speeds.sort((a, b) => a - b);
      const median = speeds[Math.floor(speeds.length / 2)] ?? 1;
      clip.speed = Math.max(0.3, median * scale);
    }
  }
}

function findSkinned(root: THREE.Object3D): THREE.SkinnedMesh[] {
  const out: THREE.SkinnedMesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) out.push(o as THREE.SkinnedMesh);
  });
  if (!out.length) throw new Error('SoldierKit: no skinned mesh');
  return out;
}

/** The node's name, or its parent's when the mesh is a child of a named group. */
function partName(mesh: THREE.Object3D): string {
  return mesh.name.replace(/_\d+$/, '') || mesh.parent?.name || 'part';
}

/** A copy with only position, normal, uv and skinning, all as plain floats (so every piece merges). */
function clean(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv', 'skinIndex', 'skinWeight']) {
    const a = source.getAttribute(name);
    if (!a) continue;
    const array = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) array[i * a.itemSize + k] = a.getComponent(i, k);
    g.setAttribute(name, new THREE.BufferAttribute(array, a.itemSize));
  }
  if (source.index) g.setIndex(Array.from(source.index.array));
  else g.setIndex([...Array(source.getAttribute('position')!.count).keys()]);
  return g;
}

/** Binds a rigid piece wholly to one bone. */
function rigid(g: THREE.BufferGeometry, bone: number): void {
  const n = g.getAttribute('position')!.count;
  const index = new Float32Array(n * 4);
  const weight = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    index[i * 4] = bone;
    weight[i * 4] = 1;
  }
  g.setAttribute('skinIndex', new THREE.BufferAttribute(index, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(weight, 4));
}

/**
 * The tower shield, in model units (`unit` of them to a metre): the rectangle shield turned to face forward (its thinnest
 * side along +Z, its longest up), sized to `TOWER_SHIELD.height`, and set in front of the chest's left side. It rides
 * the chest bone, so it stays in front through the walk.
 */
function towerShield(shield: THREE.BufferGeometry, chest: THREE.Vector3, unit: number): THREE.BufferGeometry {
  const g = shield.clone();
  g.computeBoundingBox();
  const box = g.boundingBox!;
  const c = box.getCenter(new THREE.Vector3());
  g.translate(-c.x, -c.y, -c.z);
  // The box's axes from thinnest to longest become Z (the face), X and Y.
  const size = box.getSize(new THREE.Vector3()).toArray();
  const [thin, mid, long] = [0, 1, 2].sort((a, b) => size[a]! - size[b]!) as [number, number, number];
  const axis = (i: number): THREE.Vector3 => new THREE.Vector3().setComponent(i, 1);
  const turn = new THREE.Matrix4().makeBasis(axis(mid), axis(long), axis(thin)).transpose();
  if (turn.determinant() < 0) turn.premultiply(new THREE.Matrix4().makeScale(-1, 1, 1));
  g.applyMatrix4(turn);
  const s = (TOWER_SHIELD.height * unit) / size[long]!;
  const { offset } = TOWER_SHIELD;
  g.scale(s, s, s).translate(chest.x + offset[0] * unit, chest.y + offset[1] * unit, chest.z + offset[2] * unit);
  return g;
}

function setPart(g: THREE.BufferGeometry, part: number): void {
  const n = g.getAttribute('position')!.count;
  g.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(n).fill(part), 1));
}

/**
 * The captain's tall banner (GDD §4.4), in model units: a pole up the back to 3.5 m, a flag that faces front and back,
 * a gold stripe and knob. Coloured by pointing its UVs at cells of the knight's palette (the flag's red takes the
 * soldier's cloth colour).
 */
function bannerGeometry(perMetre: number, chest: THREE.Vector3): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, cell: readonly [number, number], x: number, y: number, z: number): void => {
    g.translate(x * perMetre, y * perMetre, z * perMetre);
    const uv = g.getAttribute('uv')!;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, cell[0], cell[1]);
    pieces.push(clean(g));
  };
  const back = chest.z / perMetre - 0.24;
  const bottom = chest.y / perMetre - 0.15;
  const top = 3.45;
  const pole = new THREE.CylinderGeometry(0.035 * perMetre, 0.035 * perMetre, (top - bottom) * perMetre, 6);
  add(pole, CELL.wood, 0, (top + bottom) / 2, back);
  add(new THREE.BoxGeometry(0.8 * perMetre, 0.62 * perMetre, 0.04 * perMetre), CELL.red, 0.42, 3.06, back);
  add(new THREE.BoxGeometry(0.8 * perMetre, 0.1 * perMetre, 0.045 * perMetre), CELL.gold, 0.42, 2.78, back);
  add(new THREE.SphereGeometry(0.06 * perMetre, 8, 6), CELL.gold, 0, top, back);
  const merged = mergeGeometries(pieces, false)!;
  return merged;
}
