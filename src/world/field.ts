import * as THREE from 'three';
import { GROUND_LOOK, GROUND_TINT, LANDMARKS, REGION1_BASE, riverDressing, SOIL, STREAMS, TREE_LINES } from '@/content/fields';
import { ROSIE_LOOK } from '@/content/rosieLook';
import { GREYBOX } from '@/content/tuning';
import { SHADOW_LAYER } from '@/render/stage';
import type { FieldKit, Footprint } from './fieldKit';
import { queenBanner } from './bannerModel';
import type { RosieFigure } from './rosieFigure';

/** A stream's water and its bank (calm, flat colours). Double-sided: the strip's winding follows the line's turns. */
const WATER = new THREE.MeshLambertMaterial({ color: 0x5fa8d3, emissive: 0x0d2a3a, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
const SOIL_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x8a6a45, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 });
/** Distance from (x, z) to a polyline of [x, z] points. */
function distanceToLine(x: number, z: number, points: readonly (readonly [number, number])[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < points.length; i++) {
    const [ax, az] = points[i]!;
    const [bx, bz] = points[i + 1]!;
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

/** 0 below `a`, 1 above `b`, smooth between. */
function smooth(a: number, b: number, v: number): number {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const BANK = new THREE.MeshLambertMaterial({ color: 0x6f9a4c, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 });

/**
 * The battlefield (GDD §4.1): a meadow with the banner on a low hill and Rosie's truck behind it. Built as a greybox
 * (the ground, the banner, a box truck, hedge walls), then dressed from the field kit once it loads (M7,
 * `content/fields.ts`): a low stone wall round the edge, trees beyond it, the Queen's camp, and each battle's landmark.
 */
export class Field {
  readonly group = new THREE.Group();
  readonly half = GREYBOX.size / 2;
  /** Boxes the hero can't walk through, as [minX, minZ, maxX, maxZ]. */
  readonly blockers: [number, number, number, number][] = [];
  /** Solid boxes that stop shots, sight lines and the camera, as [minX, minY, minZ, maxX, maxY, maxZ]. */
  readonly solids: [number, number, number, number, number, number][] = [];
  /** The banner's pole and flag, which tip over when the banner falls. */
  private bannerGroup: THREE.Group | null = null;
  /** The shop's ring on the ground and the marker over the truck, shown in breaks. */
  private readonly shopRing: THREE.Mesh;
  private readonly shopMarker: THREE.Mesh;
  private markerTime = 0;
  private readonly truckGroup: THREE.Group;
  private kit: FieldKit | null = null;
  /** The battle's landmark and what of it blocks (swapped at each battle start). */
  private landmark: THREE.Group | null = null;
  /** The meadow's ground (its colour tinted per region, `GROUND_TINT`). */
  private readonly groundMesh: THREE.Mesh;
  /** The region's tree line (M9) and which region it is. */
  private trees: THREE.Group | null = null;
  private region = 0;
  private readonly landmarkBlockers: [number, number, number, number][] = [];
  private readonly landmarkSolids: [number, number, number, number, number, number][] = [];

  constructor() {
    this.truckGroup = this.truck();
    this.groundMesh = this.ground();
    this.group.add(this.groundMesh, this.banner(), this.truckGroup, ...this.hedges());
    const { shopSpot, truckAt } = GREYBOX;
    const ring = new THREE.RingGeometry(shopSpot.radius - 0.22, shopSpot.radius, 48);
    ring.rotateX(-Math.PI / 2);
    this.shopRing = new THREE.Mesh(
      ring,
      new THREE.MeshBasicMaterial({ color: 0xf2b632, transparent: true, opacity: 0.7, depthWrite: false }),
    );
    this.shopRing.position.set(shopSpot.x, this.heightAt(shopSpot.x, shopSpot.z) + 0.05, shopSpot.z);
    const cone = new THREE.ConeGeometry(0.45, 0.8, 4);
    cone.rotateX(Math.PI);
    this.shopMarker = new THREE.Mesh(cone, new THREE.MeshLambertMaterial({ color: 0xf2b632, emissive: 0x6a4a00 }));
    this.shopMarker.position.set(truckAt.x, 4.2, truckAt.z);
    this.shopRing.visible = this.shopMarker.visible = false;
    this.group.add(this.shopRing, this.shopMarker);
  }

  /**
   * Dresses the field from the kit: the edge walls and trees, the Queen's camp, the truck. Call before the crowd
   * builds its flow field, so soldiers path round what blocks.
   */
  dress(kit: FieldKit): void {
    this.kit = kit;
    // The edge stays a smooth hedge: a stone wall's fine brick lines across the whole view measured busier
    // (noise.py), and the calm read matters more (feedback-calm-visuals).
    const { group, solids } = kit.build(REGION1_BASE, (x, z) => this.heightAt(x, z));
    this.group.add(group);
    this.addFootprints(solids, this.blockers, this.solids);
    this.setRegion(1);
    // Rosie's truck: the kit's pickup, as long as the greybox box was, in its place.
    if (kit.has('truck')) {
      const size = kit.size('truck');
      const along = Math.max(size.x, size.z);
      const turn = size.x > size.z ? Math.PI / 2 : 0;
      const { truckAt } = GREYBOX;
      const built = kit.build([{ piece: 'truck', x: 0, z: 0, rot: turn, size: 5.2 / along }], () => 0).group;
      this.truckGroup.clear();
      this.truckGroup.add(built);
      this.truckGroup.position.set(truckAt.x, 0, truckAt.z);
    }
  }

  /** Shows a region's tree line beyond the hedge (M9: Region 1's pines, the Riverlands' leafy trees). */
  setRegion(region: number): void {
    const list = TREE_LINES[region] ?? TREE_LINES[1]!;
    if (!this.kit || region === this.region) return;
    this.region = region;
    (this.groundMesh.material as THREE.MeshLambertMaterial).color.setHex(GROUND_TINT[region] ?? 0xffffff);
    if (this.trees) this.group.remove(this.trees);
    this.trees = this.kit.build(list, (x, z) => this.heightAt(x, z)).group;
    this.group.add(this.trees);
  }

  /** Shows a battle's landmark (GDD §13.2), or none. From Region 2, its stream gets reeds and lilies. */
  setLandmark(battleId: number | null, region = 1): void {
    if (this.landmark) {
      this.group.remove(this.landmark);
      this.landmark = null;
    }
    this.landmarkBlockers.length = 0;
    this.landmarkSolids.length = 0;
    const stream = battleId ? STREAMS[battleId] : undefined;
    const base = battleId ? LANDMARKS[battleId] : undefined;
    if (!base || !this.kit) return;
    const list = stream && region >= 2 ? [...base, ...riverDressing(stream)] : base;
    const { group, solids } = this.kit.build(list, (x, z) => this.heightAt(x, z));
    for (const soil of (battleId && SOIL[battleId]) || []) {
      const h = soil.depth / 2;
      group.add(this.ribbon([[soil.x, soil.z - h], [soil.x, soil.z + h]], soil.width, 0.03, SOIL_MATERIAL));
    }
    if (stream) {
      // A darker bank under the water, then the water: flat, calm, a little above the grass.
      group.add(this.ribbon(stream.points, stream.width + 2.2, 0.02, BANK));
      group.add(this.ribbon(stream.points, stream.width, 0.05, WATER));
    }
    this.landmark = group;
    this.group.add(group);
    this.addFootprints(solids, this.landmarkBlockers, this.landmarkSolids);
  }

  /** A flat strip along a line on the ground (a stream or its bank), `lift` metres up. */
  private ribbon(points: readonly [number, number][], width: number, lift: number, material: THREE.Material): THREE.Mesh {
    // Smooth the line with a curve, then lay a strip either side of it.
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const samples = curve.getSpacedPoints(80);
    const positions: number[] = [];
    const index: number[] = [];
    samples.forEach((p, i) => {
      const next = samples[Math.min(i + 1, samples.length - 1)]!;
      const prev = samples[Math.max(i - 1, 0)]!;
      const dx = next.x - prev.x;
      const dz = next.z - prev.z;
      const l = Math.hypot(dx, dz) || 1;
      const nx = -dz / l;
      const nz = dx / l;
      for (const side of [-1, 1]) {
        const x = p.x + nx * (width / 2) * side;
        const z = p.z + nz * (width / 2) * side;
        positions.push(x, this.heightAt(x, z) + lift, z);
      }
      if (i < samples.length - 1) {
        const k = i * 2;
        index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  private addFootprints(
    list: Footprint[],
    blockers: [number, number, number, number][],
    solids: [number, number, number, number, number, number][],
  ): void {
    for (const f of list) {
      blockers.push([f.minX, f.minZ, f.maxX, f.maxZ]);
      solids.push([f.minX, 0, f.minZ, f.maxX, f.height, f.maxZ]);
    }
  }



  /** Shows the way to the shop in a break (GDD §4.7): a gold ring at Rosie's spot and a marker over the truck. */
  setShopOpen(open: boolean): void {
    this.shopRing.visible = this.shopMarker.visible = open;
  }

  /** 0 standing to 1 lying: the banner tipping over when it falls (GDD §4.8). */
  tipBanner(amount: number): void {
    if (!this.bannerGroup) return;
    const t = Math.max(0, Math.min(1, amount));
    this.bannerGroup.rotation.z = -t * t * 1.45;
  }

  update(dt: number): void {
    if (!this.shopMarker.visible) return;
    this.markerTime += dt;
    this.shopMarker.position.y = 4.2 + Math.sin(this.markerTime * 3) * 0.18;
    this.shopMarker.rotation.y += dt * 1.5;
  }

  /** Ground height at a point: flat, with the banner's gentle hill (high ground, GDD §5.2). */
  heightAt(x: number, z: number): number {
    const { bannerAt, bannerHill } = GREYBOX;
    const d = Math.hypot(x - bannerAt.x, z - bannerAt.z) / bannerHill.radius;
    if (d >= 1) return 0;
    const s = 1 - d * d;
    return bannerHill.height * s * s;
  }

  /** Keeps a circle inside the field and outside the blockers. */
  confine(p: { x: number; z: number }, radius: number): void {
    const edge = this.half - 3;
    p.x = Math.max(-edge, Math.min(edge, p.x));
    p.z = Math.max(-edge, Math.min(edge, p.z));
    for (const [x0, z0, x1, z1] of this.allBlockers()) {
      const cx = Math.max(x0, Math.min(x1, p.x));
      const cz = Math.max(z0, Math.min(z1, p.z));
      const dx = p.x - cx;
      const dz = p.z - cz;
      const d = Math.hypot(dx, dz);
      if (d >= radius) continue;
      if (d > 1e-4) {
        p.x = cx + (dx / d) * radius;
        p.z = cz + (dz / d) * radius;
      } else {
        // Inside the box: push out along the shortest axis.
        const out = [p.x - x0, x1 - p.x, p.z - z0, z1 - p.z];
        const i = out.indexOf(Math.min(...out));
        if (i === 0) p.x = x0 - radius;
        else if (i === 1) p.x = x1 + radius;
        else if (i === 2) p.z = z0 - radius;
        else p.z = z1 + radius;
      }
    }
  }

  /**
   * How far along a segment (0 to 1) a ball of `radius` can travel before it touches a solid box or the ground, or 1
   * when the way is clear. The camera uses it to pull in (GDD §5.1); shots and sight lines use it with radius 0.
   */
  sweep(ax: number, ay: number, az: number, bx: number, by: number, bz: number, radius: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    let best = 1;
    for (const [x0, y0, z0, x1, y1, z1] of this.allSolids()) {
      const t = segmentBox(ax, ay, az, dx, dy, dz, x0 - radius, y0 - radius, z0 - radius, x1 + radius, y1 + radius, z1 + radius);
      if (t < best) best = t;
    }
    // The ground: step along and stop where the segment dips under it (the hill is gentle, so 0.5 m steps do).
    const length = Math.hypot(dx, dy, dz);
    const steps = Math.max(1, Math.ceil((length * best) / 0.5));
    for (let i = 1; i <= steps; i++) {
      const t = (i / steps) * best;
      if (ay + dy * t - radius < this.heightAt(ax + dx * t, az + dz * t)) {
        best = Math.max(0, ((i - 1) / steps) * best);
        break;
      }
    }
    return best;
  }

  private *allBlockers(): Iterable<[number, number, number, number]> {
    yield* this.blockers;
    yield* this.landmarkBlockers;
  }

  private *allSolids(): Iterable<[number, number, number, number, number, number]> {
    yield* this.solids;
    yield* this.landmarkSolids;
  }

  /** True when nothing solid stands between two points. */
  clear(ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
    return this.sweep(ax, ay, az, bx, by, bz, 0) >= 1;
  }

  private ground(): THREE.Mesh {
    const size = GREYBOX.size + 80;
    const geometry = new THREE.PlaneGeometry(size, size, 120, 120);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position!;
    const colors: number[] = [];
    const meadow = new THREE.Color(0x8fbf62);
    const hill = new THREE.Color(0xa3c96e);
    const beyond = new THREE.Color(0x9cbf7a);
    const worn = new THREE.Color(GROUND_LOOK.track.color);
    const { patches, track } = GROUND_LOOK;
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.heightAt(x, z);
      pos.setY(i, y);
      const outside = Math.max(Math.abs(x), Math.abs(z)) > this.half;
      c.copy(outside ? beyond : meadow).lerp(hill, Math.min(1, y / GREYBOX.bannerHill.height));
      // Soft patches: two slow waves across the meadow, lighter and darker by a few percent.
      const [a, b] = patches.wavelengths;
      const wave = Math.sin((x * 0.8 + z * 0.6) * ((Math.PI * 2) / a)) * Math.sin((x * -0.5 + z * 0.87) * ((Math.PI * 2) / b));
      c.multiplyScalar(1 + wave * patches.amount);
      // The worn track: grass gone a little straw-coloured near its middle, fading out at the edge.
      const d = Math.min(distanceToLine(x, z, track.points), distanceToLine(x, z, track.camp));
      const wear = 1 - smooth(track.half, track.half + track.soft, d);
      if (wear > 0 && !outside) c.lerp(worn, wear * track.strength);
      colors.push(c.r, c.g, c.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
    mesh.receiveShadow = true;
    return mesh;
  }

  /** Queen Ada's banner (`bannerModel.ts`) on the hilltop, with the capture ring round it. */
  private banner(): THREE.Group {
    const { bannerAt } = GREYBOX;
    const g = new THREE.Group();
    const y = this.heightAt(bannerAt.x, bannerAt.z);
    g.position.set(bannerAt.x, y, bannerAt.z);
    // The capture ring lies on the hill's curve, a few centimetres up so it never sinks into the grass.
    const segments = 72;
    const positions: number[] = [];
    const index: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      for (const r of [5.7, 6]) {
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        positions.push(x, this.heightAt(bannerAt.x + x, bannerAt.z + z) - y + 0.06, z);
      }
      if (i < segments) {
        const k = i * 2;
        index.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
    const ringGeometry = new THREE.BufferGeometry();
    ringGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    ringGeometry.setIndex(index);
    const ring = new THREE.Mesh(
      ringGeometry,
      new THREE.MeshBasicMaterial({
        color: 0x9cc3ff,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const tipping = new THREE.Group();
    tipping.add(queenBanner());
    this.bannerGroup = tipping;
    g.add(tipping, ring);
    this.blockers.push([bannerAt.x - 0.3, bannerAt.z - 0.3, bannerAt.x + 0.3, bannerAt.z + 0.3]);
    return g;
  }

  /** Stands Rosie at her spot by the ring, facing the banner; the hero walks round her. */
  placeRosie(figure: RosieFigure): void {
    const { at } = ROSIE_LOOK;
    const { bannerAt } = GREYBOX;
    figure.place(at.x, this.heightAt(at.x, at.z), at.z, Math.atan2(-(bannerAt.x - at.x), -(bannerAt.z - at.z)));
    this.group.add(figure.root);
    this.blockers.push([at.x - 0.35, at.z - 0.35, at.x + 0.35, at.z + 0.35]);
  }

  /** Rosie's truck, a teal box until the field kit loads. */
  private truck(): THREE.Group {
    const { truckAt } = GREYBOX;
    const g = new THREE.Group();
    g.position.set(truckAt.x, 0, truckAt.z);
    g.rotation.y = 0.35;
    const teal = new THREE.MeshLambertMaterial({ color: 0x2f9e9a });
    const dark = new THREE.MeshLambertMaterial({ color: 0x2b2f36 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.1, 5), teal);
    body.position.y = 1.35;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 1.6), teal);
    cab.position.set(0, 1.0, 3.2);
    const parts: THREE.Mesh[] = [body, cab];
    for (const [x, z] of [
      [-1.1, -1.6],
      [1.1, -1.6],
      [-1.1, 2.9],
      [1.1, 2.9],
    ] as const) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 14), dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.45, z);
      parts.push(wheel);
    }
    for (const p of parts) {
      p.castShadow = true;
      p.layers.enable(SHADOW_LAYER);
    }
    g.add(...parts);
    g.updateMatrixWorld();
    const box = new THREE.Box3().setFromObject(g);
    this.blockers.push([box.min.x + 0.3, box.min.z + 0.3, box.max.x - 0.3, box.max.z - 0.3]);
    this.solids.push([box.min.x + 0.3, 0, box.min.z + 0.3, box.max.x - 0.3, box.max.y, box.max.z - 0.3]);
    return g;
  }

  private readonly hedgeMeshes: THREE.Mesh[] = [];

  /** Hedges round the edge of the field (the greybox's; hidden once the kit's stone wall is up). */
  private hedges(): THREE.Mesh[] {
    const material = new THREE.MeshLambertMaterial({ color: 0x5f8f45 });
    const h = this.half;
    const out: THREE.Mesh[] = [];
    for (const [x, z, w, d] of [
      [0, -h, GREYBOX.size, 1.6],
      [0, h, GREYBOX.size, 1.6],
      [-h, 0, 1.6, GREYBOX.size],
      [h, 0, 1.6, GREYBOX.size],
    ] as const) {
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(w, 1.6, d), material);
      hedge.position.set(x, 0.8, z);
      hedge.receiveShadow = true;
      out.push(hedge);
      this.hedgeMeshes.push(hedge);
      this.solids.push([x - w / 2, 0, z - d / 2, x + w / 2, 1.6, z + d / 2]);
    }
    return out;
  }


}

/** Where a segment (start a, direction d, t from 0 to 1) enters a box, or Infinity. A start inside counts as 0. */
function segmentBox(
  ax: number,
  ay: number,
  az: number,
  dx: number,
  dy: number,
  dz: number,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
): number {
  let near = 0;
  let far = 1;
  const axes: [number, number, number, number][] = [
    [ax, dx, x0, x1],
    [ay, dy, y0, y1],
    [az, dz, z0, z1],
  ];
  for (const [a, d, lo, hi] of axes) {
    if (Math.abs(d) < 1e-12) {
      if (a < lo || a > hi) return Infinity;
      continue;
    }
    let t0 = (lo - a) / d;
    let t1 = (hi - a) / d;
    if (t0 > t1) [t0, t1] = [t1, t0];
    if (t0 > near) near = t0;
    if (t1 < far) far = t1;
    if (near > far) return Infinity;
  }
  return near;
}
