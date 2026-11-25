import * as THREE from 'three';
import { SHOOTING } from '@/content/tuning';
import { el, setText, toggle } from './dom';
import { gunArt, ICONS } from './icons';

const NUMBERS = 10;
const ARCS = 4;

interface FloatingNumber {
  node: HTMLElement;
  world: THREE.Vector3;
  age: number;
  live: boolean;
}

interface Arc {
  node: HTMLElement;
  age: number;
  live: boolean;
}

const tmp = new THREE.Vector3();
/** Champion health bars at once (two Brutes in Battle 11, one spare). */
const CHAMPION_BARS = 3;

/**
 * The battle HUD (GDD §15.3–15.4). M1: the crosshair with its hit markers, captain diamond and auto-fire pip, damage
 * arcs round it, small damage numbers, and the ammo count on the gun button. The bars, gold, health, prompts and
 * off-screen arrows arrive in M3–M4 and are revealed one by one by onboarding (docs/onboarding.md §3). The HUD only
 * touches the DOM when a value changes.
 */
export class Hud {
  readonly root: HTMLElement;
  private readonly crosshair: HTMLElement;
  private readonly marker: HTMLElement;
  private readonly shieldMark: HTMLElement;
  private readonly ring: HTMLElement;
  private readonly arcLayer: HTMLElement;
  private readonly numberLayer: HTMLElement;
  private readonly numbers: FloatingNumber[] = [];
  private readonly arcs: Arc[] = [];
  private nextNumber = 0;
  private nextArc = 0;
  private onTarget = false;
  private captain = false;
  private pip: 'off' | 'idle' | 'armed' = 'off';
  private ammoText = '';
  private ammoLow = false;
  private reload = -1;
  private ammoNode: HTMLElement | null = null;
  private gunButton: HTMLElement | null = null;
  /** A diamond over a target in the world (onboarding §2): the scout, a captain. */
  private readonly diamond: HTMLElement;
  private diamondAt: THREE.Vector3 | null = null;
  /** Small health bars over champions' heads (GDD §9.1: the Brute). */
  private readonly champions: { node: HTMLElement; fill: HTMLElement; at: THREE.Vector3; fraction: number; shown: boolean }[] = [];
  private championCount = 0;

  constructor(parent: HTMLElement) {
    this.root = el('div', 'hud', parent);
    this.arcLayer = el('div', 'damage-arcs', this.root);
    for (let i = 0; i < ARCS; i++) this.arcs.push({ node: el('div', 'damage-arc', this.arcLayer), age: 0, live: false });
    this.crosshair = el('div', 'crosshair is-hidden', this.root);
    this.ring = el('div', 'crosshair-ring', this.crosshair);
    el('div', 'crosshair-dot', this.crosshair);
    el('div', 'crosshair-diamond', this.crosshair);
    el('div', 'crosshair-pip', this.crosshair);
    this.marker = el('div', 'hit-marker', this.crosshair);
    for (let i = 0; i < 4; i++) el('i', '', this.marker);
    this.shieldMark = el('div', 'shield-mark', this.crosshair, ICONS.shield);
    this.diamond = el('div', 'target-diamond is-hidden', this.root);
    for (let i = 0; i < CHAMPION_BARS; i++) {
      const node = el('div', 'champion-bar is-hidden', this.root);
      this.champions.push({ node, fill: el('div', 'champion-bar-fill', node), at: new THREE.Vector3(), fraction: 1, shown: false });
    }
    this.numberLayer = el('div', 'damage-numbers', this.root);
    for (let i = 0; i < NUMBERS; i++) {
      this.numbers.push({ node: el('div', 'damage-number', this.numberLayer), world: new THREE.Vector3(), age: 0, live: false });
    }
  }

  /** The gun button carries the ammo count and the reload ring (GDD §6.2: tap it to reload). */
  attachAmmo(gunButton: HTMLElement): void {
    this.gunButton = gunButton;
    gunButton.classList.add('has-ammo');
    this.ammoNode = el('span', 'ammo-count', gunButton);
  }

  /** The held gun's silhouette on the gun button (`url` from `renderGunIcons`), or the drawn icon. */
  setGunArt(url: string | undefined): void {
    if (!this.gunButton) return;
    const old = this.gunButton.querySelector('svg, .gun-art');
    const holder = document.createElement('span');
    holder.innerHTML = url ? gunArt(url) : ICONS.gun;
    const next = holder.firstElementChild;
    if (old && next) old.replaceWith(next);
  }

  showCrosshair(shown: boolean): void {
    toggle(this.crosshair, 'is-hidden', !shown);
  }

  /** Hides the crosshair for a moment (a camera shot) without changing whether it's revealed. */
  showCrosshairDuring(shown: boolean): void {
    toggle(this.crosshair, 'is-paused', !shown);
  }

  /** Red while the crosshair is on an enemy, with a diamond over a captain (GDD §15.3). */
  setAim(onTarget: boolean, captain: boolean): void {
    if (onTarget !== this.onTarget) {
      this.onTarget = onTarget;
      toggle(this.crosshair, 'is-on-target', onTarget);
    }
    const cap = onTarget && captain;
    if (cap !== this.captain) {
      this.captain = cap;
      toggle(this.crosshair, 'is-captain', cap);
    }
  }

  /** The auto-fire pip (touch): dim while auto-fire is waiting, lit while it fires. */
  setAutoPip(state: 'off' | 'idle' | 'armed'): void {
    if (state === this.pip) return;
    this.pip = state;
    toggle(this.crosshair, 'pip-idle', state === 'idle');
    toggle(this.crosshair, 'pip-armed', state === 'armed');
  }

  /** A soft tick on a hit, a heavier one on a knockout (GDD §8.1). */
  hitMarker(knockout: boolean): void {
    this.marker.getAnimations().forEach((a) => a.cancel());
    toggle(this.marker, 'is-knock', knockout);
    this.marker.animate(
      [
        { opacity: 1, transform: `translate(-50%, -50%) scale(${knockout ? 1.15 : 0.9})` },
        { opacity: 0, transform: `translate(-50%, -50%) scale(${knockout ? 1.45 : 1.1})` },
      ],
      { duration: (knockout ? SHOOTING.knockMarker : SHOOTING.hitMarker) * 1000, easing: 'ease-out' },
    );
  }

  /** A bullet bounced off a shield: a small shield mark beside the crosshair (onboarding §5, Battle 4). */
  blocked(): void {
    this.shieldMark.getAnimations().forEach((a) => a.cancel());
    this.shieldMark.animate(
      [
        { opacity: 0.95, transform: 'translate(-50%, -50%) scale(1)' },
        { opacity: 0, transform: 'translate(-50%, -50%) scale(1.25)' },
      ],
      { duration: 420, easing: 'ease-out' },
    );
  }

  /** The ring opens a little on each shot. */
  kick(amount: number): void {
    this.ring.getAnimations().forEach((a) => a.cancel());
    this.ring.animate([{ transform: `scale(${1 + 0.25 * amount})` }, { transform: 'scale(1)' }], {
      duration: 140,
      easing: 'ease-out',
    });
  }

  /** A small number where a bullet landed; grey when armour took half (GDD §8.1). */
  damageNumber(world: THREE.Vector3, amount: number, armoured: boolean): void {
    const n = this.numbers[this.nextNumber]!;
    this.nextNumber = (this.nextNumber + 1) % NUMBERS;
    n.world.copy(world);
    n.world.x += (Math.random() - 0.5) * 0.3;
    n.age = 0;
    n.live = true;
    setText(n.node, String(Math.round(amount)));
    toggle(n.node, 'is-armoured', armoured);
    n.node.style.opacity = '0';
  }

  /** A red arc round the crosshair toward a hit from off to the side; `angle` is 0 ahead, positive to the right. */
  damageArc(angle: number): void {
    const a = this.arcs[this.nextArc]!;
    this.nextArc = (this.nextArc + 1) % ARCS;
    a.age = 0;
    a.live = true;
    a.node.style.transform = `rotate(${angle}rad)`;
    a.node.style.opacity = '1';
  }

  /** The magazine count and the reload ring on the gun button. */
  setAmmo(ammo: number, magazine: number, reloadProgress: number): void {
    if (!this.ammoNode || !this.gunButton) return;
    const reloading = reloadProgress < 1;
    const text = reloading ? '' : String(ammo);
    if (text !== this.ammoText) {
      this.ammoText = text;
      setText(this.ammoNode, text);
    }
    const low = !reloading && ammo <= Math.max(2, Math.floor(magazine * 0.25));
    if (low !== this.ammoLow) {
      this.ammoLow = low;
      toggle(this.gunButton, 'is-low', low);
    }
    const r = reloading ? Math.round(reloadProgress * 40) / 40 : -1;
    if (r !== this.reload) {
      this.reload = r;
      toggle(this.gunButton, 'is-reloading', reloading);
      this.gunButton.style.setProperty('--reload', String(Math.max(0, r)));
    }
  }

  /** Marks a target in the world with a diamond above it, or hides it (null). `urgent` makes it pulse. */
  setDiamond(at: THREE.Vector3 | null, urgent = false): void {
    this.diamondAt = at;
    toggle(this.diamond, 'is-hidden', !at);
    toggle(this.diamond, 'is-urgent', !!at && urgent);
  }

  /** The champions standing: where over their heads (world), and their health (0–1); the first `count` show. */
  setChampions(spots: readonly { at: THREE.Vector3; fraction: number }[], count: number): void {
    this.championCount = Math.min(count, this.champions.length);
    this.champions.forEach((c, k) => {
      const on = k < this.championCount;
      if (on) {
        c.at.copy(spots[k]!.at);
        if (c.fraction !== spots[k]!.fraction) {
          c.fraction = spots[k]!.fraction;
          c.fill.style.transform = `scaleX(${Math.max(0, Math.min(1, c.fraction)).toFixed(3)})`;
        }
      }
      if (on !== c.shown) {
        c.shown = on;
        toggle(c.node, 'is-hidden', !on);
      }
    });
  }

  /** Moves the damage numbers, the diamond and the champion bars with the world, and fades the arcs. */
  update(dt: number, camera: THREE.Camera, width: number, height: number): void {
    if (this.diamondAt) {
      tmp.copy(this.diamondAt).project(camera);
      const behind = tmp.z > 1;
      toggle(this.diamond, 'is-off', behind);
      if (!behind) {
        const x = Math.max(16, Math.min(width - 16, (tmp.x * 0.5 + 0.5) * width));
        const y = Math.max(16, Math.min(height - 16, (-tmp.y * 0.5 + 0.5) * height));
        this.diamond.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      }
    }
    for (let k = 0; k < this.championCount; k++) {
      const c = this.champions[k]!;
      tmp.copy(c.at).project(camera);
      // Off screen or behind: no bar (an edge arrow already points the way).
      const off = tmp.z > 1 || Math.abs(tmp.x) > 1.05 || Math.abs(tmp.y) > 1.05;
      toggle(c.node, 'is-off', off);
      if (off) continue;
      const x = (tmp.x * 0.5 + 0.5) * width;
      const y = (-tmp.y * 0.5 + 0.5) * height;
      c.node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    }
    for (const n of this.numbers) {
      if (!n.live) continue;
      n.age += dt;
      const u = n.age / SHOOTING.numberSeconds;
      if (u >= 1) {
        n.live = false;
        n.node.style.opacity = '0';
        continue;
      }
      tmp.copy(n.world).project(camera);
      if (tmp.z > 1) {
        n.node.style.opacity = '0';
        continue;
      }
      const x = (tmp.x * 0.5 + 0.5) * width;
      const y = (-tmp.y * 0.5 + 0.5) * height;
      const rise = (1 - (1 - u) * (1 - u)) * SHOOTING.numberRise;
      n.node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, calc(-100% - ${rise.toFixed(1)} * var(--s) * 1px)) scale(${u < 0.12 ? 1.2 - u : 1})`;
      n.node.style.opacity = String(Math.min(1, (1 - u) * 2.2).toFixed(2));
    }
    for (const a of this.arcs) {
      if (!a.live) continue;
      a.age += dt;
      const u = a.age / SHOOTING.arcSeconds;
      if (u >= 1) {
        a.live = false;
        a.node.style.opacity = '0';
        continue;
      }
      a.node.style.opacity = String(((1 - u) * (1 - u)).toFixed(2));
    }
  }
}
