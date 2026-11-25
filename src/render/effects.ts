import * as THREE from 'three';
import type { Field } from '@/world/field';

/** Tracers per pool; older ones are reused first. */
const TRACERS = 24;
/** Metres a second a tracer's head travels, and the streak's longest length. */
const TRACER_SPEED = 240;
const TRACER_LENGTH = 4;
/** Wide enough to read at 20 m; it thins out over its short life instead of fading (no alpha per instance). */
const TRACER_WIDTH = 0.05;
const PARTICLES = 160;
const SHELLS = 16;
const SHELL_LIFE = 1.6;

/** A particle's look: dust from soldiers (bloodless, GDD §2), sparks off armour and props. */
export interface PuffStyle {
  count: number;
  color: number;
  /** Starting size in metres; it grows by `grow` over its life. */
  size: number;
  grow: number;
  speed: number;
  /** Upward drift in m/s (dust rises, sparks fall). */
  lift: number;
  gravity: number;
  life: number;
  alpha: number;
}

export const PUFFS = {
  /** A bullet hits a soldier: a small burst of cloth dust. */
  hit: { count: 6, color: 0xf1e6cf, size: 0.2, grow: 1.6, speed: 1.8, lift: 0.5, gravity: 0, life: 0.4, alpha: 0.85 },
  /** A bullet hits the ground or a prop. */
  ground: { count: 4, color: 0xcbbf9f, size: 0.16, grow: 2.2, speed: 1.2, lift: 0.9, gravity: 0, life: 0.45, alpha: 0.75 },
  /** Sparks off armour (and the "clink"). */
  spark: { count: 5, color: 0xffe08a, size: 0.05, grow: 0.2, speed: 4, lift: 1, gravity: 9, life: 0.22, alpha: 1 },
  /** A grenade bursts: a big soft cloud with a few sparks (kept small: GDD §18.1). */
  blast: { count: 22, color: 0xe8dcc0, size: 0.7, grow: 2.2, speed: 4.5, lift: 1.2, gravity: 0, life: 0.9, alpha: 0.7 },
  /** A firebrand's pot bursts (M9): a short orange cloud, kept small like the grenade's. */
  fire: { count: 18, color: 0xff9440, size: 0.75, grow: 2.2, speed: 3.2, lift: 1.8, gravity: 0, life: 0.7, alpha: 0.85 },
  /** A rocket's trail: a couple of soft grey puffs left behind as it flies. */
  smoke: { count: 3, color: 0xcfc8bc, size: 0.34, grow: 2.4, speed: 0.35, lift: 0.25, gravity: 0, life: 0.7, alpha: 0.62 },
  /** The Baron's donkey galloping off (M10): a little dust at its hooves. */
  hoof: { count: 4, color: 0xd9ccae, size: 0.3, grow: 2.2, speed: 0.8, lift: 0.4, gravity: 0, life: 0.7, alpha: 0.5 },
  /** A knocked-out soldier lands: a soft cloud at the feet. */
  knock: { count: 9, color: 0xe2d6bb, size: 0.35, grow: 2.4, speed: 1.3, lift: 0.35, gravity: 0, life: 0.8, alpha: 0.55 },
} satisfies Record<string, PuffStyle>;

const tmpQ = new THREE.Quaternion();
const tmpM = new THREE.Matrix4();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpC = new THREE.Color();
const FORWARD = new THREE.Vector3(0, 0, -1);

interface Tracer {
  from: THREE.Vector3;
  dir: THREE.Vector3;
  length: number;
  age: number;
  live: boolean;
}

interface Shell {
  p: THREE.Vector3;
  v: THREE.Vector3;
  spin: THREE.Vector3;
  rot: THREE.Euler;
  age: number;
  live: boolean;
}

/**
 * Small, soft effects in three draw calls (GDD §18.1: effects stay small): bullet tracers, particles (dust and
 * sparks), and spent casings. Everything is pooled; nothing is allocated while playing.
 */
export class Effects {
  readonly group = new THREE.Group();
  private readonly tracerMesh: THREE.InstancedMesh;
  private readonly tracers: Tracer[] = [];
  private nextTracer = 0;
  private readonly points: THREE.Points;
  private readonly pPos: Float32Array;
  private readonly pVel = new Float32Array(PARTICLES * 3);
  private readonly pColor: Float32Array;
  private readonly pSize: Float32Array;
  private readonly pAlpha: Float32Array;
  private readonly pAge = new Float32Array(PARTICLES).fill(-1);
  private readonly pLife = new Float32Array(PARTICLES);
  private readonly pStart = new Float32Array(PARTICLES * 3);
  private readonly pGrav = new Float32Array(PARTICLES);
  private nextParticle = 0;
  private readonly shellMesh: THREE.InstancedMesh;
  private readonly shells: Shell[] = [];
  private nextShell = 0;
  private readonly pointMaterial: THREE.ShaderMaterial;

  constructor(private readonly field: Field) {
    // Tracers: thin boxes stretched along the shot, a pale warm yellow that reads on grass and sky alike.
    const box = new THREE.BoxGeometry(1, 1, 1);
    box.translate(0, 0, -0.5);
    this.tracerMesh = new THREE.InstancedMesh(
      box,
      new THREE.MeshBasicMaterial({ color: 0xfff1b8, toneMapped: false, fog: false }),
      TRACERS,
    );
    this.tracerMesh.frustumCulled = false;
    this.tracerMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < TRACERS; i++) {
      this.tracers.push({ from: new THREE.Vector3(), dir: new THREE.Vector3(), length: 0, age: 0, live: false });
      this.tracerMesh.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
      this.tracerMesh.setColorAt(i, new THREE.Color(0, 0, 0));
    }
    this.tracerMesh.count = TRACERS;

    // Particles: soft round points, sized in metres.
    const geometry = new THREE.BufferGeometry();
    this.pPos = new Float32Array(PARTICLES * 3);
    this.pColor = new Float32Array(PARTICLES * 3);
    this.pSize = new Float32Array(PARTICLES);
    this.pAlpha = new Float32Array(PARTICLES);
    geometry.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(this.pColor, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.pSize, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.pAlpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.pointMaterial = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 400 } },
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        uniform float uScale;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aAlpha > 0.0 ? min(220.0, aSize * uScale / max(0.1, -mv.z)) : 0.0;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.18, d) * vAlpha;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vColor, a);
        }`,
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(geometry, this.pointMaterial);
    this.points.frustumCulled = false;

    // Casings: tiny brass cylinders.
    const shell = new THREE.CylinderGeometry(0.009, 0.009, 0.032, 6);
    shell.rotateX(Math.PI / 2);
    this.shellMesh = new THREE.InstancedMesh(
      shell,
      new THREE.MeshLambertMaterial({ color: 0xd9a441, emissive: 0x3a2a08 }),
      SHELLS,
    );
    this.shellMesh.frustumCulled = false;
    this.shellMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < SHELLS; i++) {
      this.shells.push({
        p: new THREE.Vector3(),
        v: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        rot: new THREE.Euler(),
        age: 0,
        live: false,
      });
      this.shellMesh.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
    }
    this.group.add(this.tracerMesh, this.points, this.shellMesh);
  }

  /** Pixels per metre at 1 m, for particle sizes: call on resize with the drawing buffer height and the FOV. */
  setViewport(heightPixels: number, verticalFovDegrees: number): void {
    this.pointMaterial.uniforms.uScale!.value = heightPixels / (2 * Math.tan((verticalFovDegrees * Math.PI) / 360));
  }

  tracer(from: THREE.Vector3, to: THREE.Vector3): void {
    const t = this.tracers[this.nextTracer]!;
    this.nextTracer = (this.nextTracer + 1) % TRACERS;
    t.from.copy(from);
    t.dir.subVectors(to, from);
    t.length = t.dir.length();
    if (t.length < 0.05) return;
    t.dir.divideScalar(t.length);
    t.age = 0;
    t.live = true;
  }

  puff(at: THREE.Vector3, style: PuffStyle, away?: THREE.Vector3): void {
    tmpC.setHex(style.color);
    for (let n = 0; n < style.count; n++) {
      const i = this.nextParticle;
      this.nextParticle = (this.nextParticle + 1) % PARTICLES;
      const k = i * 3;
      this.pPos[k] = at.x;
      this.pPos[k + 1] = at.y;
      this.pPos[k + 2] = at.z;
      // Random directions, leaning back toward the shooter when told where that is.
      let vx = Math.random() * 2 - 1;
      let vy = Math.random() * 2 - 1;
      let vz = Math.random() * 2 - 1;
      if (away) {
        vx += away.x * 1.2;
        vy += away.y * 1.2;
        vz += away.z * 1.2;
      }
      const l = Math.hypot(vx, vy, vz) || 1;
      const speed = style.speed * (0.5 + Math.random() * 0.5);
      this.pVel[k] = (vx / l) * speed;
      this.pVel[k + 1] = (vy / l) * speed + style.lift;
      this.pVel[k + 2] = (vz / l) * speed;
      const shade = 0.9 + Math.random() * 0.1;
      this.pColor[k] = tmpC.r * shade;
      this.pColor[k + 1] = tmpC.g * shade;
      this.pColor[k + 2] = tmpC.b * shade;
      this.pStart[k] = style.size * (0.8 + Math.random() * 0.4);
      this.pStart[k + 1] = style.grow;
      this.pStart[k + 2] = style.alpha;
      this.pGrav[i] = style.gravity;
      this.pAge[i] = 0;
      this.pLife[i] = style.life * (0.8 + Math.random() * 0.4);
    }
  }

  /** A spent casing flies out to the right of the gun. */
  shell(from: THREE.Vector3, right: THREE.Vector3): void {
    const s = this.shells[this.nextShell]!;
    this.nextShell = (this.nextShell + 1) % SHELLS;
    s.p.copy(from);
    s.v
      .copy(right)
      .multiplyScalar(1.6 + Math.random() * 0.8)
      .add(tmpV.set((Math.random() - 0.5) * 0.6, 2.2 + Math.random() * 0.8, (Math.random() - 0.5) * 0.6));
    s.spin.set(Math.random() * 30 - 15, Math.random() * 30 - 15, Math.random() * 30 - 15);
    s.rot.set(0, Math.random() * 6, 0);
    s.age = 0;
    s.live = true;
  }

  update(dt: number): void {
    this.updateTracers(dt);
    this.updateParticles(dt);
    this.updateShells(dt);
  }

  private updateTracers(dt: number): void {
    for (let i = 0; i < TRACERS; i++) {
      const t = this.tracers[i]!;
      if (!t.live) continue;
      t.age += dt;
      const head = Math.min(t.length, t.age * TRACER_SPEED);
      const tail = Math.max(0, head - TRACER_LENGTH);
      if (tail >= t.length - 0.01 || t.age > 0.5) {
        t.live = false;
        this.tracerMesh.setMatrixAt(i, tmpM.makeScale(0, 0, 0));
        continue;
      }
      // The first frame draws a short streak from the muzzle, so even a point-blank shot shows.
      const from = tail;
      const to = Math.max(head, Math.min(t.length, 0.8));
      tmpV.copy(t.from).addScaledVector(t.dir, from);
      tmpQ.setFromUnitVectors(FORWARD, t.dir);
      const width = TRACER_WIDTH * (1 - Math.min(1, t.age / 0.2) * 0.6);
      tmpS.set(width, width, Math.max(0.01, to - from));
      tmpM.compose(tmpV, tmpQ, tmpS);
      this.tracerMesh.setMatrixAt(i, tmpM);
      this.tracerMesh.setColorAt(i, tmpC.setScalar(1));
    }
    this.tracerMesh.instanceMatrix.needsUpdate = true;
    if (this.tracerMesh.instanceColor) this.tracerMesh.instanceColor.needsUpdate = true;
  }

  private updateParticles(dt: number): void {
    let any = false;
    for (let i = 0; i < PARTICLES; i++) {
      const age = this.pAge[i]!;
      if (age < 0) continue;
      const life = this.pLife[i]!;
      const next = age + dt;
      const k = i * 3;
      if (next >= life) {
        this.pAge[i] = -1;
        this.pAlpha[i] = 0;
        any = true;
        continue;
      }
      this.pAge[i] = next;
      const drag = Math.exp(-3.2 * dt);
      this.pVel[k] = this.pVel[k]! * drag;
      this.pVel[k + 1] = this.pVel[k + 1]! * drag - this.pGrav[i]! * dt;
      this.pVel[k + 2] = this.pVel[k + 2]! * drag;
      this.pPos[k] = this.pPos[k]! + this.pVel[k]! * dt;
      this.pPos[k + 1] = this.pPos[k + 1]! + this.pVel[k + 1]! * dt;
      this.pPos[k + 2] = this.pPos[k + 2]! + this.pVel[k + 2]! * dt;
      const u = next / life;
      this.pSize[i] = this.pStart[k]! * (1 + this.pStart[k + 1]! * u);
      // Fade in fast, out slowly.
      this.pAlpha[i] = this.pStart[k + 2]! * Math.min(1, u * 8) * (1 - u) * (1 - u);
      any = true;
    }
    if (!any) return;
    const g = this.points.geometry;
    g.attributes.position!.needsUpdate = true;
    g.attributes.aColor!.needsUpdate = true;
    g.attributes.aSize!.needsUpdate = true;
    g.attributes.aAlpha!.needsUpdate = true;
  }

  private updateShells(dt: number): void {
    let any = false;
    for (let i = 0; i < SHELLS; i++) {
      const s = this.shells[i]!;
      if (!s.live) continue;
      any = true;
      s.age += dt;
      if (s.age > SHELL_LIFE) {
        s.live = false;
        this.shellMesh.setMatrixAt(i, tmpM.makeScale(0, 0, 0));
        continue;
      }
      s.v.y -= 9.8 * dt;
      s.p.addScaledVector(s.v, dt);
      const ground = this.field.heightAt(s.p.x, s.p.z) + 0.01;
      if (s.p.y < ground) {
        s.p.y = ground;
        // A small bounce, then it lies still.
        s.v.y = Math.abs(s.v.y) * 0.3;
        s.v.x *= 0.5;
        s.v.z *= 0.5;
        s.spin.multiplyScalar(0.5);
        if (s.v.y < 0.3) {
          s.v.set(0, 0, 0);
          s.spin.set(0, 0, 0);
        }
      }
      s.rot.x += s.spin.x * dt;
      s.rot.y += s.spin.y * dt;
      s.rot.z += s.spin.z * dt;
      tmpQ.setFromEuler(s.rot);
      // Sink into the grass at the end instead of popping out.
      const sink = Math.max(0, (s.age - (SHELL_LIFE - 0.4)) / 0.4);
      tmpS.setScalar(1 - sink);
      tmpM.compose(s.p, tmpQ, tmpS);
      this.shellMesh.setMatrixAt(i, tmpM);
    }
    if (any) this.shellMesh.instanceMatrix.needsUpdate = true;
  }
}
