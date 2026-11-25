import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ROSIE_LOOK } from '@/content/rosieLook';
import { recolour } from '@/render/recolour';
import { SHADOW_LAYER } from '@/render/stage';
import { angleDelta } from '@/core/math';

export async function loadRosie(): Promise<{ scene: THREE.Group; clips: THREE.AnimationClip[] }> {
  const gltf = await new GLTFLoader().loadAsync('assets/hero/rosie.glb');
  return { scene: gltf.scene, clips: gltf.animations };
}

/**
 * Rosie by her truck (GDD §2): she stands idle and turns to watch the hero; in a break she waves him over until he
 * walks into her ring, and serves (reaches out) when the shop opens or he buys something. She cheers a win.
 */
export class RosieFigure {
  readonly root = new THREE.Group();
  private readonly mixer: THREE.AnimationMixer;
  private readonly idle: THREE.AnimationAction;
  private readonly waveAction: THREE.AnimationAction;
  private readonly serveAction: THREE.AnimationAction;
  private gesture: THREE.AnimationAction | null = null;
  private gestureLeft = 0;
  private sinceWave = 0;
  private yaw = 0;

  constructor(assets: { scene: THREE.Group; clips: THREE.AnimationClip[] }) {
    const model = assets.scene;
    const box = new THREE.Box3().setFromObject(model, true);
    model.scale.setScalar(ROSIE_LOOK.height / Math.max(0.1, box.max.y - box.min.y));
    // The model faces +Z; the root's yaw turns −Z (like the hero) toward what she watches.
    model.rotation.y = Math.PI;
    const mats = new Map<THREE.Material, THREE.Material>();
    model.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as THREE.MeshStandardMaterial;
      let mat = mats.get(src);
      if (!mat) {
        const { cloth } = ROSIE_LOOK;
        const map = src.map ? recolour(src.map, cloth.from, cloth.to, cloth.hue, { saturation: cloth.saturation, light: cloth.light }) : null;
        mat = new THREE.MeshLambertMaterial({ map });
        mats.set(src, mat);
      }
      mesh.material = mat;
      mesh.castShadow = true;
      mesh.layers.enable(SHADOW_LAYER);
      mesh.frustumCulled = false;
    });
    this.root.add(model);
    this.mixer = new THREE.AnimationMixer(model);
    const action = (name: string, once: boolean): THREE.AnimationAction => {
      const clip = assets.clips.find((c) => c.name === name);
      if (!clip) throw new Error(`Rosie clip ${name} missing`);
      const a = this.mixer.clipAction(clip);
      if (once) {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      return a;
    };
    this.idle = action('Unarmed_Idle', false);
    this.waveAction = action('Cheer', true);
    this.serveAction = action('Interact', true);
    this.idle.play();
    // Start mid-loop so she doesn't move in step with anything else.
    this.idle.time = Math.random() * this.idle.getClip().duration;
  }

  /** Places her at her spot, facing `yaw` (radians, 0 = −Z). */
  place(x: number, y: number, z: number, yaw: number): void {
    this.root.position.set(x, y, z);
    this.yaw = yaw;
    this.root.rotation.y = yaw;
  }

  /** She reaches out over the counter (the shop opens, a purchase). */
  serve(): void {
    this.play(this.serveAction, 1.3);
  }

  /** She cheers (a win). */
  cheer(): void {
    this.play(this.waveAction, 1);
  }

  /**
   * One frame. `hero`: where he is; `calling`: a break with the shop closed, so she waves him over now and then;
   * `banner`: where she looks when he's far.
   */
  update(dt: number, hero: THREE.Vector3, calling: boolean, banner: { x: number; z: number }): void {
    const dx = hero.x - this.root.position.x;
    const dz = hero.z - this.root.position.z;
    const near = Math.hypot(dx, dz) < ROSIE_LOOK.watch;
    const want = near ? Math.atan2(-dx, -dz) : Math.atan2(-(banner.x - this.root.position.x), -(banner.z - this.root.position.z));
    const turn = angleDelta(this.yaw, want);
    this.yaw += Math.sign(turn) * Math.min(Math.abs(turn), ROSIE_LOOK.turnRate * dt);
    this.root.rotation.y = this.yaw;
    if (calling) {
      this.sinceWave += dt;
      if (this.sinceWave > ROSIE_LOOK.waveEvery && !this.gesture) {
        this.sinceWave = 0;
        this.play(this.waveAction, 1);
      }
    } else {
      // The first wave of a break comes soon after it starts.
      this.sinceWave = ROSIE_LOOK.waveEvery - 1;
    }
    if (this.gesture) {
      this.gestureLeft -= dt;
      if (this.gestureLeft <= 0) {
        this.gesture.fadeOut(0.25);
        this.idle.reset().fadeIn(0.25).play();
        this.gesture = null;
      }
    }
    this.mixer.update(dt);
  }

  private play(action: THREE.AnimationAction, timeScale: number): void {
    if (this.gesture && this.gesture !== action) this.gesture.fadeOut(0.15);
    action.reset();
    action.timeScale = timeScale;
    action.setEffectiveWeight(1);
    action.fadeIn(0.15).play();
    this.idle.fadeOut(0.15);
    this.gesture = action;
    this.gestureLeft = action.getClip().duration / timeScale - 0.2;
  }
}
