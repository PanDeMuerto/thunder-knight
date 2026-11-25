import * as THREE from 'three';
import { DEG } from '@/core/math';
import { CAMERA } from '@/content/tuning';

/**
 * Quality tiers (tech design §6). Each caps the canvas's short edge in drawn pixels (the browser stretches it
 * smoothly), so phones with very high pixel ratios stay fast; sets the sun's shadow map; and caps how many soldiers
 * are alive at once (both sides together).
 */
export type QualityTier = 'high' | 'low' | 'lowest';
/** The player's choice in Pause: a fixed tier, or `auto` (a quick benchmark, then a watch on the frame rate). */
export type QualitySetting = QualityTier | 'auto';
export const QUALITY_SETTINGS: readonly QualitySetting[] = ['auto', 'high', 'low', 'lowest'];
export interface TierLook {
  shortEdge: number;
  shadow: number;
  /** Soldiers alive at once, both sides (GDD §19). */
  soldiers: number;
  pixelRatio: number;
}
export const TIERS: Record<QualityTier, TierLook> = {
  high: { shortEdge: 1080, shadow: 2048, soldiers: 300, pixelRatio: 2 },
  low: { shortEdge: 720, shadow: 1024, soldiers: 160, pixelRatio: 1.5 },
  lowest: { shortEdge: 520, shadow: 0, soldiers: 100, pixelRatio: 1 },
};
/** Seconds of play before the benchmark starts timing (shaders compile, the first meshes upload). */
const WARM_UP_SECONDS = 2;
/** The benchmark: the first window after the warm-up. Then the watch, every few seconds. */
const BENCHMARK_SECONDS = 1.5;
const FPS_SAMPLE_SECONDS = 3;
const LOW_FPS = 40;
/** Under this in the benchmark, a device goes straight to the lowest tier. */
const VERY_LOW_FPS = 24;
/** The HUD scales with the short edge of the screen, and grows gently on big monitors. */
const UI_SCALE_MIN = 0.92;
const UI_SCALE_PHONE_MAX = 1.25;
const UI_SCALE_PHONE_EDGE = 720;
const UI_SCALE_PER_LARGE_PIXEL = 0.001;
const UI_SCALE_MAX = 1.9;
/** A screen whose short edge is this, at the smallest scale, is the yardstick for room (qa:hud's p360 and d640). */
const TIGHTEST_EDGE = 360;

const SKY_TOP = new THREE.Color(0x6fa8e0);
const SKY_HORIZON = new THREE.Color(0xd6e8ee);
const FOG = new THREE.Color(0xcfe0e4);
const SUN = new THREE.Color(0xfff0d8);

/** The layer of everything that casts the sun's shadow. */
export const SHADOW_LAYER = 2;

/** Owns the renderer, scene, camera, lights, sky and sizing. Gameplay adds its objects to `scene`. */
export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(CAMERA.landscape.verticalFov, 1, CAMERA.near, CAMERA.far);
  width = 1;
  height = 1;
  portrait = false;
  uiScale = 1;
  tier: QualityTier = 'high';
  readonly sun = new THREE.DirectionalLight(SUN, 2.2);
  private readonly hemisphere = new THREE.HemisphereLight(0xdcecff, 0x6f7a4a, 1.3);
  private readonly sky: THREE.Mesh;
  private sampleTime = 0;
  private readonly frameTimes: number[] = [];
  private watched = 0;
  private benchmarked = false;
  quality: QualitySetting = 'auto';
  /** HUD size from the settings (1 to 1.5), on top of the screen's own scale. */
  hudScale = 1;
  /** Called when the tier changes, so the world can thin what it draws. */
  onTier: ((tier: QualityTier) => void) | null = null;
  /** Called after every resize, with the new orientation. */
  onResize: ((portrait: boolean) => void) | null = null;
  private readonly sunDir = new THREE.Vector3(0.5, 0.82, 0.28).normalize();
  private shadowSize = 0;
  /** A shift of the picture's centre in CSS pixels, so a docked panel (the shop) can sit beside what it shows. */
  private frameShift = { x: 0, y: 0 };
  /** The field of view the screen shape asks for; shots add a moment's punch on top (`setFovPunch`). */
  private baseFov: number = CAMERA.landscape.verticalFov;
  private fovPunch = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly root: HTMLElement,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.tier = startsLowEnd() ? 'low' : 'high';
    // Count a whole frame (shadow map and scene), not just its last pass (tools/qa/perf.mjs).
    this.renderer.info.autoReset = false;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.camera.layers.set(SHADOW_LAYER);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 300;
    this.sky = createSky(this.sunDir);
    this.scene.add(this.hemisphere, this.sun, this.sun.target, this.sky);
    this.scene.fog = new THREE.Fog(FOG, CAMERA.fog.near, CAMERA.fog.far);
    this.renderer.setClearColor(FOG);
    this.setShadowFocus(0, 0, 0, 70);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
  }

  /**
   * The sun's shadow covers a square box of `size` metres round a point. The box moves in whole shadow-map texels, so
   * shadows never shimmer as the hero walks (calm visuals).
   */
  setShadowFocus(x: number, y: number, z: number, size: number): void {
    const res = TIERS[this.tier].shadow || 1024;
    if (Math.abs(size - this.shadowSize) > this.shadowSize * 0.15) {
      this.shadowSize = size;
      const cam = this.sun.shadow.camera;
      cam.left = cam.bottom = -size / 2;
      cam.right = cam.top = size / 2;
      cam.updateProjectionMatrix();
      this.sun.shadow.normalBias = size * 0.0015;
    }
    const texel = this.shadowSize / res;
    const light = new THREE.Matrix4().lookAt(this.sunDir, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
    const inv = light.clone().invert();
    const p = new THREE.Vector3(x, y, z).applyMatrix4(inv);
    p.x = Math.round(p.x / texel) * texel;
    p.y = Math.round(p.y / texel) * texel;
    p.applyMatrix4(light);
    this.sun.target.position.copy(p);
    this.sun.position.copy(p).addScaledVector(this.sunDir, 120);
    this.sun.target.updateMatrixWorld();
  }

  setFrameShift(x: number, y: number): void {
    if (x === this.frameShift.x && y === this.frameShift.y) return;
    this.frameShift = { x, y };
    this.applyViewOffset();
    this.camera.updateProjectionMatrix();
  }

  /** Widens the view by a few degrees for a moment (a shot's punch). */
  setFovPunch(degrees: number): void {
    const punch = Math.abs(degrees) < 0.01 ? 0 : degrees;
    if (punch === this.fovPunch) return;
    this.fovPunch = punch;
    this.camera.fov = this.baseFov + punch;
    this.camera.updateProjectionMatrix();
  }

  /** The vertical position of the crosshair, as a fraction of the screen height from the top. */
  get crosshairY(): number {
    return this.portrait ? CAMERA.portraitCrosshairY : 0.5;
  }

  /**
   * In portrait the view's centre (and the crosshair) sits higher than the middle, so the hero stands above the
   * thumbs (GDD §5.1); a frame shift (the shop's panel) replaces that.
   */
  private applyViewOffset(): void {
    const w = this.width;
    const h = this.height;
    const { x, y } = this.frameShift;
    const down = this.portrait && x === 0 && y === 0 ? (0.5 - CAMERA.portraitCrosshairY) * h : y;
    if (x === 0 && down === 0) this.camera.clearViewOffset();
    else this.camera.setViewOffset(w, h, x, down, w, h);
  }

  resize(): void {
    const w = Math.max(1, this.root.clientWidth);
    const h = Math.max(1, this.root.clientHeight);
    this.width = w;
    this.height = h;
    this.portrait = h > w;
    const look = TIERS[this.tier];
    const dpr = window.devicePixelRatio || 1;
    const short = Math.min(w, h);
    const ratio = Math.min(dpr, look.pixelRatio, look.shortEdge / short);
    this.renderer.setPixelRatio(Math.max(0.5, ratio));
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    const base = this.portrait ? CAMERA.portrait.verticalFov : CAMERA.landscape.verticalFov;
    // Keep a decent horizontal view on tall screens, up to the vertical cap.
    const minVertical = (2 * Math.atan(Math.tan((CAMERA.minHorizontalFov * DEG) / 2) / aspect)) / DEG;
    this.baseFov = Math.min(CAMERA.maxVerticalFov, Math.max(base, minVertical));
    this.camera.fov = this.baseFov + this.fovPunch;
    this.applyViewOffset();
    this.camera.updateProjectionMatrix();
    const phone = clampNumber(short / UI_SCALE_PHONE_EDGE, UI_SCALE_MIN, UI_SCALE_PHONE_MAX);
    const large = Math.max(0, short - 900) * UI_SCALE_PER_LARGE_PIXEL;
    this.uiScale = Math.min(UI_SCALE_MAX, phone + large);
    // The HUD size setting grows the HUD only as far as the screen has room: never past the proportions of the
    // tightest layout that passes qa:hud (a 360 px phone at the smallest scale).
    const room = Math.max(this.uiScale, short * (UI_SCALE_MIN / TIGHTEST_EDGE));
    this.root.style.setProperty('--s', Math.min(this.uiScale * this.hudScale, room).toFixed(3));
    this.root.style.setProperty('--crosshair-y', `${(this.crosshairY * 100).toFixed(1)}%`);
    this.root.classList.toggle('is-portrait', this.portrait);
    this.applyTier();
    this.onResize?.(this.portrait);
  }

  private applyTier(): void {
    const res = TIERS[this.tier].shadow;
    const on = res > 0;
    if (this.renderer.shadowMap.enabled !== on || (on && this.sun.shadow.mapSize.x !== res)) {
      this.renderer.shadowMap.enabled = on;
      this.sun.castShadow = on;
      this.sun.shadow.mapSize.set(res, res);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
      this.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (m) for (const mat of Array.isArray(m) ? m : [m]) mat.needsUpdate = true;
      });
    }
  }

  get look(): TierLook {
    return TIERS[this.tier];
  }

  render(): void {
    this.sky.position.copy(this.camera.position);
    this.sky.scale.setScalar(this.camera.far * 0.9);
    this.renderer.info.reset();
    this.renderer.render(this.scene, this.camera);
  }

  /** The player's graphics setting. `auto` starts again from the device's guess and benchmarks again. */
  setQuality(quality: QualitySetting): void {
    this.quality = quality;
    this.benchmarked = false;
    this.watched = 0;
    this.sampleTime = 0;
    this.frameTimes.length = 0;
    this.setTier(quality === 'auto' ? (startsLowEnd() ? 'low' : 'high') : quality);
  }

  private setTier(tier: QualityTier): void {
    const changed = tier !== this.tier;
    this.tier = tier;
    this.resize();
    if (changed) this.onTier?.(tier);
  }

  /**
   * On `auto`, times the frames and steps down a tier when the device can't keep up. The first window is the quick
   * benchmark, which can drop a slow phone straight to the lowest tier. Each window leaves out its slowest tenth of
   * frames, so one hitch (a shader compiling) never costs a tier.
   */
  sampleFps(dt: number): void {
    if (this.quality !== 'auto' || this.tier === 'lowest') return;
    this.watched += dt;
    if (this.watched < WARM_UP_SECONDS) return;
    this.frameTimes.push(dt);
    this.sampleTime += dt;
    const first = !this.benchmarked;
    if (this.sampleTime < (first ? BENCHMARK_SECONDS : FPS_SAMPLE_SECONDS)) return;
    const fps = steadyFps(this.frameTimes);
    this.frameTimes.length = 0;
    this.sampleTime = 0;
    this.benchmarked = true;
    if (fps >= LOW_FPS) return;
    this.setTier(this.tier === 'high' && !(first && fps < VERY_LOW_FPS) ? 'low' : 'lowest');
  }
}

/** Frames a second from frame times, leaving out the slowest tenth. */
export function steadyFps(times: readonly number[]): number {
  if (!times.length) return 60;
  const sorted = [...times].sort((a, b) => a - b);
  const kept = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.9)));
  return kept.length / kept.reduce((sum, t) => sum + t, 0);
}

function clampNumber(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Where `auto` starts: the middle tier on phones and tablets (a touch-first screen) and on small machines. */
function startsLowEnd(): boolean {
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const touchFirst = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return touchFirst || cores <= 4 || memory <= 3;
}

/** A soft gradient dome with a gentle sun. Its foot fades into the fog colour, so the horizon has no seam. */
function createSky(sunDir: THREE.Vector3): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(1, 24, 12);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: SKY_TOP.clone() },
      uHorizon: { value: SKY_HORIZON.clone() },
      uFog: { value: FOG.clone() },
      uSunDir: { value: sunDir.clone() },
      uSun: { value: SUN.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      uniform vec3 uFog;
      uniform vec3 uSunDir;
      uniform vec3 uSun;
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 sky = mix(uHorizon, uTop, smoothstep(0.02, 0.55, h));
        float toward = max(0.0, dot(normalize(vDir), uSunDir));
        sky += uSun * (pow(toward, 900.0) * 2.5 + pow(toward, 12.0) * 0.15);
        sky = mix(uFog, sky, smoothstep(-0.05, 0.12, h));
        gl_FragColor = vec4(sky, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return mesh;
}
