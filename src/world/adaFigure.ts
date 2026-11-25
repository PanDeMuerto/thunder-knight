import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ADA_LOOK } from '@/content/adaLook';
import { recolour } from '@/render/recolour';
import { SHADOW_LAYER } from '@/render/stage';

/** Queen Ada's model, fetched when the ending first needs her (not part of the first download). */
export async function loadAda(): Promise<{ scene: THREE.Group; clips: THREE.AnimationClip[] }> {
  const gltf = await new GLTFLoader().loadAsync('assets/hero/ada.glb');
  return { scene: gltf.scene, clips: gltf.animations };
}

/**
 * Queen Ada (GDD §2) in the ending: KayKit's rogue in her cape, her greens turned Larkmoor's royal blue, a gold crown
 * on her head. She walks up to the hero and cheers with her army.
 */
export class AdaFigure {
  readonly root = new THREE.Group();
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions: Record<'idle' | 'cheer' | 'walk', THREE.AnimationAction>;
  private current: THREE.AnimationAction;

  constructor(assets: { scene: THREE.Group; clips: THREE.AnimationClip[] }) {
    const L = ADA_LOOK;
    const model = assets.scene;
    const box = new THREE.Box3().setFromObject(model, true);
    model.scale.setScalar(L.height / Math.max(0.1, box.max.y - box.min.y));
    // The model faces +Z; the root's yaw turns −Z (like the hero) toward where she looks.
    model.rotation.y = Math.PI;
    const mats = new Map<THREE.Material, THREE.Material>();
    model.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as THREE.MeshStandardMaterial;
      let mat = mats.get(src);
      if (!mat) {
        const { robe } = L;
        const map = src.map ? recolour(src.map, robe.from, robe.to, robe.hue, { saturation: robe.saturation, light: robe.light }) : null;
        mat = new THREE.MeshLambertMaterial({ map });
        mats.set(src, mat);
      }
      mesh.material = mat;
      mesh.castShadow = true;
      mesh.layers.enable(SHADOW_LAYER);
      mesh.frustumCulled = false;
    });
    // A gold crown on her head bone: a ring with five points.
    let head: THREE.Object3D | null = null;
    model.traverse((o) => {
      if (!head && /head/i.test(o.name) && !(o as THREE.Mesh).isMesh) head = o;
    });
    const crown = new THREE.Group();
    const gold = new THREE.MeshLambertMaterial({ color: L.crown.color, emissive: 0x3a2600 });
    const C = L.crown;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(C.radius, C.radius * 1.05, C.band, 14, 1, true), gold);
    band.material.side = THREE.DoubleSide;
    crown.add(band);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const point = new THREE.Mesh(new THREE.ConeGeometry(C.radius * 0.28, C.point, 6), gold);
      point.position.set(Math.sin(a) * C.radius, C.band / 2 + C.point / 2, Math.cos(a) * C.radius);
      crown.add(point);
    }
    crown.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = true;
    });
    const holder = head as THREE.Object3D | null;
    if (holder) {
      // The bone's own scale is the model's: size the crown in metres by undoing it.
      holder.add(crown);
      holder.updateWorldMatrix(true, false);
      const s = new THREE.Vector3();
      holder.getWorldScale(s);
      crown.scale.setScalar(1 / Math.max(1e-3, s.y));
      crown.position.set(0, C.above / Math.max(1e-3, s.y), 0);
    }
    this.root.add(model);
    this.mixer = new THREE.AnimationMixer(model);
    const action = (name: string): THREE.AnimationAction => {
      const clip = assets.clips.find((c) => c.name === name);
      if (!clip) throw new Error(`Ada clip ${name} missing`);
      return this.mixer.clipAction(clip);
    };
    this.actions = { idle: action('Idle'), cheer: action('Cheer'), walk: action('Walking_A') };
    this.current = this.actions.idle;
    this.current.play();
    this.root.visible = false;
  }

  /** Stands her at (x, y, z) facing `yaw` (radians, 0 = −Z). */
  place(x: number, y: number, z: number, yaw: number): void {
    this.root.position.set(x, y, z);
    this.root.rotation.y = yaw;
    this.root.visible = true;
  }

  /** She walks, stands or cheers. */
  play(name: 'idle' | 'cheer' | 'walk'): void {
    const next = this.actions[name];
    if (next === this.current) return;
    next.reset().fadeIn(0.25).play();
    this.current.fadeOut(0.25);
    this.current = next;
  }

  update(dt: number): void {
    if (this.root.visible) this.mixer.update(dt);
  }

  hide(): void {
    this.root.visible = false;
  }
}
