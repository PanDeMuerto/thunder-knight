import * as THREE from 'three';
import { angleDelta } from '@/core/math';
import { ARCHETYPES, CROWD, FIRE_POT, HORSE, SOLDIERS, type ArchetypeId, type ClipName } from '@/content/soldiers';
import { crowdMaterials, crowdTime, INSTANCE_ATTRIBUTES } from '@/render/crowdMaterial';
import { SHADOW_LAYER, type QualityTier } from '@/render/stage';
import { CLIP_INDEX, CLIP_LIST, ENEMY, TYPES, type CrowdSim } from './crowdSim';
import type { Archetype, SoldierKit } from './soldierKit';

interface Batch {
  archetype: Archetype;
  mesh: THREE.InstancedMesh;
  attrs: Record<keyof typeof INSTANCE_ATTRIBUTES, THREE.InstancedBufferAttribute>;
}

const BOLTS = 96;
/** Most firebrands drawn with their pots at once. */
const POTS = 48;
const BACKDROP_ROWS = 3;
const BACKDROP_COLUMNS = 24;
/** Backdrop soldiers drawn per tier: they're far and fogged, so phones show fewer. */
const BACKDROP_BY_TIER: Record<QualityTier, number> = { high: BACKDROP_ROWS * BACKDROP_COLUMNS, low: 36, lowest: 0 };

const tmpM = new THREE.Matrix4();
const tmpP = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3(0, 0, -1);

/**
 * Draws the crowd (tech design §5.6): one instanced mesh per model for every soldier of both armies, skinned on the
 * GPU. Each frame the living soldiers are written into their model's instances, between the last two simulation
 * ticks so motion is smooth at any frame rate. Also the bolts in flight, the red rings where enemy bolts will land
 * (GDD §9.1), and the backdrop army marching on the far hills (no simulation).
 */
export class CrowdRender {
  readonly group = new THREE.Group();
  private readonly batches = new Map<ArchetypeId, Batch>();
  /** Per soldier type: its model, part mask and cloth colour. */
  private readonly looks: {
    archetype: ArchetypeId;
    mask: number;
    cloth: THREE.Color;
    steel: THREE.Color;
    size: number;
    /** Drawn by its own model (the War Wagon and its wheels). */
    hidden: boolean;
    /** Rides a horse (M9). */
    mount: boolean;
    /** Carries a lit fire-pot over his head (M9). */
    pot: boolean;
  }[];
  /** The riders' horses (one instance under each rider), once the horse has loaded (`setMount`). */
  private horses: Batch | null = null;
  private tier: QualityTier = 'high';
  private readonly pots: THREE.InstancedMesh;
  private readonly flames: THREE.InstancedMesh;
  private readonly bolts: THREE.InstancedMesh;
  private readonly marks: THREE.InstancedMesh;
  private readonly backdrop: Batch | null;
  private backdropOffset = 0;
  private backdropCount = BACKDROP_ROWS * BACKDROP_COLUMNS;
  /** Soft round shadows under soldiers on tiers without real soldier shadows. */
  private readonly blobs: THREE.InstancedMesh;
  private blobShadows = false;

  constructor(
    private readonly kit: SoldierKit,
    capacity: number,
  ) {
    for (const id of Object.keys(ARCHETYPES) as ArchetypeId[]) {
      const batch = this.batch(kit.archetypes[id], capacity, true);
      this.batches.set(id, batch);
      this.group.add(batch.mesh);
    }
    this.looks = TYPES.map((type) => {
      const def = SOLDIERS[type];
      const archetype = kit.archetypes[def.model];
      let mask = 0;
      for (const part of def.parts) {
        const bit = archetype.parts.indexOf(part);
        if (bit > 0) mask += 2 ** bit;
      }
      return {
        archetype: def.model,
        mask,
        cloth: new THREE.Color(def.cloth),
        steel: new THREE.Color(def.steel),
        size: def.size ?? 1,
        hidden: !!def.hidden,
        mount: !!def.mount,
        pot: !!def.burst,
      };
    });
    if (kit.mount) this.setMount(kit.mount, capacity);
    // Firebrands' pots (dark clay) and their flames (unlit orange, so they read as fire without a bright glow).
    const pot = new THREE.CylinderGeometry(FIRE_POT.pot * 0.55, FIRE_POT.pot * 0.42, FIRE_POT.pot * 0.8, 8);
    pot.translate(0, FIRE_POT.pot * 0.4, 0);
    this.pots = new THREE.InstancedMesh(pot, new THREE.MeshLambertMaterial({ color: 0x6e4630 }), POTS);
    const flame = new THREE.ConeGeometry(FIRE_POT.flame * 0.32, FIRE_POT.flame, 7);
    flame.translate(0, FIRE_POT.pot * 0.8 + FIRE_POT.flame * 0.45, 0);
    this.flames = new THREE.InstancedMesh(flame, new THREE.MeshBasicMaterial({ color: 0xff9a3c }), POTS);
    for (const m of [this.pots, this.flames]) {
      m.frustumCulled = false;
      m.count = 0;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(m);
    }

    // Bolts: a thin shaft with a dark head, pointing down −Z.
    const shaft = new THREE.BoxGeometry(0.03, 0.03, 0.7);
    this.bolts = new THREE.InstancedMesh(shaft, new THREE.MeshLambertMaterial({ color: 0x6d4a2c }), BOLTS);
    this.bolts.frustumCulled = false;
    this.bolts.count = 0;
    // Landing marks: soft red rings on the ground.
    const ring = new THREE.RingGeometry(0.62, 0.8, 28);
    ring.rotateX(-Math.PI / 2);
    this.marks = new THREE.InstancedMesh(
      ring,
      new THREE.MeshBasicMaterial({ color: 0xe0503c, transparent: true, opacity: 0.6, depthWrite: false }),
      BOLTS,
    );
    this.marks.frustumCulled = false;
    this.marks.count = 0;
    this.marks.renderOrder = 1;
    this.group.add(this.bolts, this.marks);
    const disc = new THREE.CircleGeometry(0.42, 14);
    disc.rotateX(-Math.PI / 2);
    this.blobs = new THREE.InstancedMesh(
      disc,
      new THREE.MeshBasicMaterial({ color: 0x1f2a14, transparent: true, opacity: 0.28, depthWrite: false }),
      capacity,
    );
    this.blobs.frustumCulled = false;
    this.blobs.count = 0;
    this.blobs.visible = false;
    this.group.add(this.blobs);

    this.backdrop = this.batch(kit.archetypes.knight, BACKDROP_ROWS * BACKDROP_COLUMNS, false);
    this.group.add(this.backdrop.mesh);
    this.setupBackdrop();
  }

  /** The riders' horses' batch, when the horse arrives (M11: after the first load). */
  setMount(mount: Archetype, capacity: number): void {
    if (this.horses) return;
    this.horses = this.batch(mount, capacity, this.tier === 'high');
    this.group.add(this.horses.mesh);
  }

  private batch(archetype: Archetype, capacity: number, shadows: boolean): Batch {
    const geometry = archetype.geometry.clone();
    const attrs = {} as Batch['attrs'];
    for (const [name, size] of Object.entries(INSTANCE_ATTRIBUTES) as [keyof typeof INSTANCE_ATTRIBUTES, number][]) {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(capacity * size), size);
      a.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute(name, a);
      attrs[name] = a;
    }
    const { material, depth } = crowdMaterials(archetype);
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    mesh.customDepthMaterial = depth;
    if (shadows) mesh.layers.enable(SHADOW_LAYER);
    return { archetype, mesh, attrs };
  }

  /**
   * Fits the crowd to a quality tier (tech design §6): real soldier shadows only on High (they double the vertex work);
   * Low and Lowest get soft blob shadows, and fewer or no backdrop soldiers.
   */
  setTier(tier: QualityTier): void {
    this.tier = tier;
    const real = tier === 'high';
    for (const batch of [...this.batches.values(), ...(this.horses ? [this.horses] : [])]) {
      batch.mesh.castShadow = real;
      if (real) batch.mesh.layers.enable(SHADOW_LAYER);
      else batch.mesh.layers.disable(SHADOW_LAYER);
    }
    this.blobShadows = !real;
    this.blobs.visible = !real;
    this.backdropCount = BACKDROP_BY_TIER[tier];
    if (this.backdrop) this.backdrop.mesh.count = this.backdropCount;
  }

  /** Draws the crowd as it stands `alpha` of the way from the last tick to the next. */
  update(sim: CrowdSim, alpha: number, heightAt: (x: number, z: number) => number, dt: number): void {
    const tick = 1 / CROWD.tickRate;
    const now = sim.time - (1 - alpha) * tick;
    crowdTime.value = now;
    for (const batch of this.batches.values()) batch.mesh.count = 0;
    if (this.horses) this.horses.mesh.count = 0;
    const b = sim.bodies;
    let blobs = 0;
    let pots = 0;
    for (let i = 0; i < sim.capacity; i++) {
      if (!sim.live[i]) continue;
      const look = this.looks[sim.type[i]!]!;
      if (look.hidden) continue;
      const batch = this.batches.get(look.archetype)!;
      const slot = batch.mesh.count++;
      const scale = batch.archetype.scale;
      const x = sim.prevX[i]! + (b.x[i]! - sim.prevX[i]!) * alpha;
      const z = sim.prevZ[i]! + (b.z[i]! - sim.prevZ[i]!) * alpha;
      const heading = sim.prevHeading[i]! + angleDelta(sim.prevHeading[i]!, sim.heading[i]!) * alpha;
      const ground = heightAt(x, z);
      // A rider sits in the saddle, and falls from it when knocked out; his horse is drawn under him.
      const knockedFor = look.mount || look.pot ? sim.knockedTime(i) : -1;
      const mounted = look.mount && this.horses !== null;
      const lift = mounted ? HORSE.saddle * (knockedFor < 0 ? 1 : Math.max(0, 1 - knockedFor / HORSE.fall)) : 0;
      if (mounted) this.writeHorse(sim, i, x, ground, z, heading, knockedFor);
      tmpP.set(x, ground + lift + sim.lift[i]!, z);
      // The models face +Z; the game's heading 0 faces −Z.
      tmpQ.setFromAxisAngle(UP, heading + Math.PI);
      tmpS.setScalar(scale * look.size);
      tmpM.compose(tmpP, tmpQ, tmpS);
      batch.mesh.setMatrixAt(slot, tmpM);
      const ride = mounted && knockedFor < 0;
      this.writeClip(batch.attrs.iClip, slot, ride ? riderClip(sim.clip[i]!) : sim.clip[i]!, sim.clipStart[i]!, ride ? riderRate(sim.clip[i]!, sim.clipRate[i]!) : sim.clipRate[i]!);
      this.writeClip(batch.attrs.iPrev, slot, ride ? riderClip(sim.prevClip[i]!) : sim.prevClip[i]!, sim.prevStart[i]!, ride ? riderRate(sim.prevClip[i]!, sim.prevRate[i]!) : sim.prevRate[i]!);
      // A firebrand's pot and flame ride over his head while he's up.
      if (look.pot && knockedFor < 0 && pots < POTS) {
        tmpP.set(x, ground + b.height[i]! + FIRE_POT.above, z);
        tmpQ.setFromAxisAngle(UP, heading);
        tmpM.compose(tmpP, tmpQ, tmpS.set(1, 1, 1));
        this.pots.setMatrixAt(pots, tmpM);
        const k = 1 + FIRE_POT.flicker * Math.sin(now * 11 + i * 1.7);
        tmpM.compose(tmpP, tmpQ, tmpS.set(1 / k, k, 1 / k));
        this.flames.setMatrixAt(pots, tmpM);
        pots++;
      }
      batch.attrs.iLook.setXYZW(slot, sim.blendStart[i]!, sim.flash[i]!, (sim.sinkAmount(i) * 0.7) / scale, look.mask);
      batch.attrs.iCloth.setXYZ(slot, look.cloth.r, look.cloth.g, look.cloth.b);
      batch.attrs.iSteel.setXYZ(slot, look.steel.r, look.steel.g, look.steel.b);
      if (this.blobShadows && sim.sinkAmount(i) === 0) {
        tmpP.y += 0.04;
        tmpM.compose(tmpP, tmpQ.identity(), tmpS.setScalar(look.size));
        this.blobs.setMatrixAt(blobs++, tmpM);
      }
    }
    for (const batch of this.batches.values()) this.flush(batch);
    if (this.horses) this.flush(this.horses);
    this.pots.count = pots;
    this.flames.count = pots;
    this.pots.instanceMatrix.needsUpdate = true;
    this.flames.instanceMatrix.needsUpdate = true;
    this.blobs.count = blobs;
    if (blobs) this.blobs.instanceMatrix.needsUpdate = true;
    this.updateBolts(sim);
    this.updateBackdrop(dt);
  }

  /**
   * A rider's horse: it plays its rider's row (its own clip there), its walk and gallop re-timed so the legs keep pace.
   * Riderless, it bolts away from the shot at a gallop, then sinks out of sight.
   */
  private writeHorse(sim: CrowdSim, i: number, x: number, ground: number, z: number, heading: number, knockedFor: number): void {
    const batch = this.horses!;
    const slot = batch.mesh.count++;
    const s = batch.archetype.scale;
    const [w, h, l] = HORSE.shape;
    let clip = sim.clip[i]!;
    const start = sim.clipStart[i]!;
    let rate = sim.clipRate[i]!;
    let facing = heading;
    let sink = 0;
    let hx = x;
    let hz = z;
    if (knockedFor >= 0) {
      // The body faces the shot as he falls; the horse turns and runs the other way.
      facing = heading + Math.PI;
      const t = Math.min(knockedFor, HORSE.bolt.seconds);
      hx += -Math.sin(facing) * HORSE.bolt.speed * t;
      hz += -Math.cos(facing) * HORSE.bolt.speed * t;
      clip = CLIP_INDEX.run;
      rate = HORSE.bolt.speed / HORSE.gallopSpeed;
      sink = Math.max(0, knockedFor - HORSE.bolt.seconds) * 3;
      if (sink > HORSE.height) {
        batch.mesh.count--;
        return;
      }
    } else {
      rate = horseRate(this.kit, CLIP_LIST[clip]!, rate);
    }
    tmpP.set(hx, ground, hz);
    tmpQ.setFromAxisAngle(UP, facing + Math.PI);
    tmpM.compose(tmpP, tmpQ, tmpS.set(s * w, s * h, s * l));
    batch.mesh.setMatrixAt(slot, tmpM);
    this.writeClip(batch.attrs.iClip, slot, clip, start, rate);
    this.writeClip(batch.attrs.iPrev, slot, knockedFor >= 0 ? clip : sim.prevClip[i]!, sim.prevStart[i]!, knockedFor >= 0 ? rate : horseRate(this.kit, CLIP_LIST[sim.prevClip[i]!]!, sim.prevRate[i]!));
    batch.attrs.iLook.setXYZW(slot, sim.blendStart[i]!, knockedFor >= 0 ? 0 : sim.flash[i]!, sink / s / h, 0);
    batch.attrs.iCloth.setXYZ(slot, 1, 0, 1);
    batch.attrs.iSteel.setXYZ(slot, 1, 1, 1);
  }

  private writeClip(attr: THREE.InstancedBufferAttribute, slot: number, clipIndex: number, start: number, rate: number): void {
    const info = this.kit.clips[CLIP_LIST[clipIndex]!];
    attr.setXYZW(slot, info.start, info.loop ? info.frames : -info.frames, start, rate);
  }

  private flush(batch: Batch): void {
    batch.mesh.instanceMatrix.needsUpdate = true;
    for (const a of Object.values(batch.attrs)) {
      a.needsUpdate = true;
      a.clearUpdateRanges();
      a.addUpdateRange(0, Math.max(1, batch.mesh.count) * a.itemSize);
    }
  }

  private updateBolts(sim: CrowdSim): void {
    let n = 0;
    let m = 0;
    for (const bolt of sim.bolts) {
      if (!bolt.live || n >= BOLTS) continue;
      const u = Math.min(1, bolt.age / bolt.flight);
      const dx = bolt.toX - bolt.fromX;
      const dz = bolt.toZ - bolt.fromZ;
      const arc = Math.min(8, Math.hypot(dx, dz) * 0.22);
      const y = bolt.fromY + (bolt.toY + 0.2 - bolt.fromY) * u + arc * 4 * u * (1 - u);
      tmpP.set(bolt.fromX + dx * u, y, bolt.fromZ + dz * u);
      // Point along the arc's slope.
      const dy = bolt.toY + 0.2 - bolt.fromY + arc * 4 * (1 - 2 * u);
      tmpV.set(dx, dy, dz).normalize();
      tmpQ.setFromUnitVectors(FORWARD, tmpV);
      tmpM.compose(tmpP, tmpQ, tmpS.set(1, 1, 1));
      this.bolts.setMatrixAt(n++, tmpM);
      if (bolt.team === ENEMY) {
        // The ring tightens as the bolt comes down.
        const k = 1.35 - 0.35 * u;
        tmpP.set(bolt.toX, bolt.toY + 0.06, bolt.toZ);
        tmpM.compose(tmpP, tmpQ.identity(), tmpS.set(k, 1, k));
        this.marks.setMatrixAt(m++, tmpM);
      }
    }
    this.bolts.count = n;
    this.marks.count = m;
    this.bolts.instanceMatrix.needsUpdate = true;
    this.marks.instanceMatrix.needsUpdate = true;
  }

  /** The backdrop army: blocks of red soldiers marching along the far hills beyond the field, looping. */
  private setupBackdrop(): void {
    const batch = this.backdrop;
    if (!batch) return;
    const mask = this.looks[TYPES.indexOf('footman')]!.mask;
    const red = new THREE.Color(SOLDIERS.footman.cloth);
    const steel = new THREE.Color(SOLDIERS.footman.steel);
    const walk = this.kit.clips.walk;
    const n = BACKDROP_ROWS * BACKDROP_COLUMNS;
    for (let s = 0; s < n; s++) {
      batch.attrs.iClip.setXYZW(s, walk.start, walk.frames, -Math.random() * walk.duration, 1);
      batch.attrs.iPrev.setXYZW(s, walk.start, walk.frames, 0, 1);
      batch.attrs.iLook.setXYZW(s, -10, 0, 0, mask);
      batch.attrs.iCloth.setXYZ(s, red.r, red.g, red.b);
      batch.attrs.iSteel.setXYZ(s, steel.r, steel.g, steel.b);
    }
    batch.mesh.count = Math.min(n, this.backdropCount);
    this.flush(batch);
  }

  private updateBackdrop(dt: number): void {
    const batch = this.backdrop;
    if (!batch || this.backdropCount === 0) return;
    const speed = 1.4;
    this.backdropOffset = (this.backdropOffset + dt * speed) % 26;
    const scale = batch.archetype.scale * 1.05;
    let s = 0;
    for (let row = 0; row < BACKDROP_ROWS; row++) {
      for (let col = 0; col < BACKDROP_COLUMNS; col++) {
        // Four blocks with gaps, marching right to left far beyond the north hedge.
        const block = Math.floor(col / 6.5);
        const x = 70 - ((col * 1.3 + block * 6 + this.backdropOffset * (1 + row * 0.02)) % 150);
        const z = -78 - row * 1.3 - block * 2.5;
        tmpP.set(x, 0, z);
        // Facing −X, the way they march (the model faces +Z at rest).
        tmpQ.setFromAxisAngle(UP, -Math.PI / 2);
        tmpS.setScalar(scale);
        tmpM.compose(tmpP, tmpQ, tmpS);
        batch.mesh.setMatrixAt(s++, tmpM);
      }
    }
    batch.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** A rider's own clip in the saddle: his sword held forward through a wind-up and a gallop, resting at a walk. */
function riderClip(clip: number): number {
  const name = CLIP_LIST[clip];
  if (name === 'run' || name === 'block') return CLIP_INDEX.block;
  if (name === 'walk' || name === 'idle') return CLIP_INDEX.idle;
  return clip;
}

function riderRate(clip: number, rate: number): number {
  const name = CLIP_LIST[clip];
  return name === 'run' || name === 'block' || name === 'walk' || name === 'idle' ? 1 : rate;
}

/** A horse's walk and gallop rates: the soldier's rate (set for his stride) re-timed for the horse's stride. */
function horseRate(kit: SoldierKit, name: ClipName, rate: number): number {
  if (name === 'run') return (rate * kit.clips.run.speed) / HORSE.gallopSpeed;
  if (name === 'walk') return (rate * kit.clips.walk.speed) / HORSE.walkSpeed;
  return rate;
}
