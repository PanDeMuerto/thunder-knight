import { BATTLES, type BattleDef, battleName, battleNews } from '@/content/battles';
import { t, type StringKey } from '@/content/strings';
import type { GameState } from '@/state/gameState';
import { lastStandBest, lastStandUnlocked } from '@/state/lastStand';
import { firstClearBonus } from '@/state/economy';
import { reachedBattle } from '@/state/progress';
import { el, label, setText, toggle } from './dom';
import { ICONS } from './icons';

/** Node positions on a 1000 × 600 map (landscape); portrait swaps the axes. Four regions, left to right. */
const NODES: [number, number][] = [
  [70, 470], [150, 390], [120, 290], [200, 200], [290, 150],
  [370, 230], [430, 330], [400, 440], [490, 500], [580, 450],
  [620, 350], [580, 250], [640, 150], [730, 110], [800, 190],
  [820, 300], [770, 400], [840, 480], [920, 420], [930, 300],
];
const REGION_COLOURS = ['#a9c98a', '#9cc5c9', '#c9bd9c', '#b9a3a8'];

/**
 * Region 1's landmarks, a placeholder until M7's painted map: small line drawings beside each battle's node, in the
 * map's ink. Each is drawn round (0, 0) in map units and placed by the node.
 */
const LANDMARKS: Record<number, string> = {
  // The Mill: a windmill.
  1: '<path d="M-6 14h12l-3-16h-6z"/><path d="M0 -4l-12-10M0 -4l12-10M0 -4l-10 10M0 -4l10 10" stroke-width="3"/>',
  // Turnip Field: rows of turnips.
  2: '<path d="M-14 8h28M-14 0h28M-14 -8h28" stroke-width="2"/><circle cx="-8" cy="0" r="3"/><circle cx="4" cy="-8" r="3"/><circle cx="8" cy="8" r="3"/>',
  // Old Stone Bridge: an arch over water.
  3: '<path d="M-16 6q16 -18 32 0" stroke-width="4" fill="none"/><path d="M-16 12q8 3 16 0t16 0" stroke-width="2" fill="none"/>',
  // Hollow Farm: a barn.
  4: '<path d="M-12 12v-12l12 -10l12 10v12z"/><path d="M-4 12v-8h8v8" stroke="#f4ead2" stroke-width="2"/>',
  // Grudge's Hill: a hill with a black banner.
  5: '<path d="M-18 12q18 -24 36 0z"/><path d="M0 -6v-14" stroke-width="2"/><path d="M0 -20h10l-3 4 3 4h-10z" fill="#2b2830"/>',
};
/** Where each landmark sits from its node (landscape map units; portrait swaps them). */
const LANDMARK_AT: Record<number, [number, number]> = { 1: [48, -6], 2: [52, 22], 3: [-50, 6], 4: [-48, -14], 5: [24, -50] };
/** Pixels per map unit at the least: a node's hit circle (radius 40) stays 48 px across on any phone. */
const MIN_SCALE = 0.6;
const HIT_RADIUS = 40;

/**
 * The campaign map (GDD §13.1), a placeholder until the painted parchment of M7: twenty battles on a winding road in
 * four regions. Won battles show their crowns, the next one pulses, later ones are locked. Picking one opens its
 * card: name, waves, what's new, the first-win bonus, **Fight!** and **Truck** (the shop).
 */
/**
 * Queen Ada's line on the map card (GDD §2, M11): once the campaign is won, her thanks; on the first battle of a new
 * region once the last is won, a line for the region just freed; otherwise one about the battle's region.
 */
export function adaLine(state: GameState, def: BattleDef): StringKey {
  if (state.battles[String(BATTLES.length)]?.won) return 'ada.free';
  const previous = BATTLES[def.id - 2];
  if (previous && previous.region < def.region && state.battles[String(previous.id)]?.won) return `ada.end.${previous.region}` as StringKey;
  return `ada.region.${def.region}` as StringKey;
}

export class MapScreen {
  private readonly layer: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly goldText: HTMLElement;
  private readonly card: HTMLElement;
  private selected = 1;
  private state: GameState | null = null;
  private portrait = false;

  /** A button whose battle waits for its download: "Loading…", and no second press. */
  private waiting(button: HTMLButtonElement): void {
    for (const b of this.card.querySelectorAll('button')) b.disabled = true;
    button.textContent = t('loading');
  }

  constructor(
    parent: HTMLElement,
    /** Returns true when the battle has to wait for its region's download (the button reads "Loading…"). */
    private readonly onFight: (battle: number) => boolean,
    private readonly onTruck: () => void,
    private readonly onLastStand: (battle: number) => boolean,
  ) {
    this.layer = el('div', 'map is-hidden', parent);
    this.layer.addEventListener('pointerdown', (e) => e.stopPropagation());
    const head = el('div', 'map-head', this.layer);
    const gold = el('div', 'hud-gold map-gold', head);
    el('span', 'hud-gold-icon', gold, ICONS.coin);
    this.goldText = el('span', 'hud-gold-text', gold);
    label(el('div', 'map-title', head), 'map.title');
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.classList.add('map-svg');
    this.layer.append(this.svg);
    this.card = el('div', 'map-card', this.layer);
  }

  get open(): boolean {
    return !this.layer.classList.contains('is-hidden');
  }

  /** Shows the map with a battle selected (the next one to play by default). */
  show(state: GameState, portrait: boolean, select?: number): void {
    this.state = state;
    this.portrait = portrait;
    this.selected = select ?? reachedBattle(state);
    toggle(this.layer, 'is-hidden', false);
    toggle(this.layer, 'is-portrait', portrait);
    this.render();
  }

  /** The Fight! button while the map shows a playable battle (onboarding points at it). */
  get fightButton(): HTMLElement | null {
    const b = this.open ? this.card.querySelector<HTMLButtonElement>('.btn-main') : null;
    return b && !b.disabled ? b : null;
  }

  hide(): void {
    toggle(this.layer, 'is-hidden', true);
  }

  /** Redraws (gold after shopping, or a new orientation). */
  refresh(portrait = this.portrait): void {
    if (!this.open || !this.state) return;
    this.portrait = portrait;
    toggle(this.layer, 'is-portrait', portrait);
    this.render();
  }

  private point(i: number): [number, number] {
    const [x, y] = NODES[i]!;
    return this.portrait ? [y, x] : [x, y];
  }

  private render(): void {
    const state = this.state!;
    setText(this.goldText, state.gold.toLocaleString('en-US'));
    const reached = reachedBattle(state);
    // The card first: in portrait its height decides how much room the road gets.
    this.renderCard(BATTLES[this.selected - 1]!, reached);
    const w = this.portrait ? 600 : 1000;
    const h = this.portrait ? 1000 : 600;
    this.svg.setAttribute('viewBox', this.view(w, h));
    let html = '';
    // Region tints behind the road.
    for (let r = 0; r < 4; r++) {
      const [x0, y0] = this.point(r * 5);
      const [x1, y1] = this.point(r * 5 + 4);
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      html += `<ellipse cx="${cx}" cy="${cy}" rx="${this.portrait ? 260 : 150}" ry="${this.portrait ? 150 : 260}" fill="${REGION_COLOURS[r]}" opacity="0.55"/>`;
      html += `<text class="map-region" x="${cx}" y="${this.portrait ? cy - 110 : 40}" text-anchor="middle">${t(`region.${r + 1}` as 'region.1')}</text>`;
    }
    const path = NODES.map((_, i) => this.point(i).join(',')).join(' L ');
    html += `<path d="M ${path}" class="map-road"/>`;
    for (const [id, art] of Object.entries(LANDMARKS)) {
      const [nx, ny] = this.point(Number(id) - 1);
      const [ox, oy] = LANDMARK_AT[Number(id)]!;
      const [dx, dy] = this.portrait ? [oy, ox] : [ox, oy];
      html += `<g class="map-landmark" transform="translate(${nx + dx} ${ny + dy})">${art}</g>`;
    }
    for (let i = 0; i < NODES.length; i++) {
      const id = i + 1;
      const [x, y] = this.point(i);
      const record = state.battles[String(id)];
      const won = !!record?.won;
      const open = id <= reached;
      const cls = `map-node${won ? ' is-won' : ''}${open ? ' is-open' : ''}${id === reached && !won ? ' is-next' : ''}${id === this.selected ? ' is-selected' : ''}`;
      html += `<g class="${cls}" data-battle="${id}" transform="translate(${x} ${y})">`;
      html += `<circle r="26"/><text y="8" text-anchor="middle">${id}</text><circle class="map-hit" r="${HIT_RADIUS}"/>`;
      if (won) {
        for (let c = 0; c < 3; c++) html += `<circle class="map-crown${c < (record?.crowns ?? 0) ? ' is-on' : ''}" cx="${(c - 1) * 15}" cy="38" r="6"/>`;
      }
      html += '</g>';
    }
    this.svg.innerHTML = html;
    for (const node of this.svg.querySelectorAll<SVGGElement>('.map-node')) {
      node.addEventListener('click', () => {
        this.selected = Number(node.dataset.battle);
        this.render();
      });
    }
  }

  /**
   * The part of the map to show: all of it when the nodes stay finger-sized, else a window around the selected battle
   * (a small phone shows about one region; picking a node near the edge moves the window).
   */
  private view(w: number, h: number): string {
    const box = this.svg.getBoundingClientRect();
    if (box.width < 10 || box.height < 10) return `0 0 ${w} ${h}`;
    const scale = Math.max(MIN_SCALE, Math.min(box.width / w, box.height / h));
    const vw = Math.min(w, box.width / scale);
    const vh = Math.min(h, box.height / scale);
    const [cx, cy] = this.point(this.selected - 1);
    const x = Math.max(0, Math.min(w - vw, cx - vw / 2));
    const y = Math.max(0, Math.min(h - vh, cy - vh / 2));
    return `${x.toFixed(0)} ${y.toFixed(0)} ${vw.toFixed(0)} ${vh.toFixed(0)}`;
  }

  private renderCard(def: BattleDef, reached: number): void {
    const state = this.state!;
    this.card.replaceChildren();
    el('div', 'map-card-region', this.card, t(`region.${def.region}` as 'region.1'));
    el('div', 'map-card-title', this.card, t('battle.title', { n: def.id, name: battleName(def.id) }));
    const facts = el('div', 'map-card-facts', this.card);
    el('span', '', facts, t('map.waves', { n: def.plannedWaves }));
    el('span', '', facts, t('map.new', { what: battleNews(def.id) }));
    const record = state.battles[String(def.id)];
    if (!record?.won) el('span', 'map-card-bonus', facts, t('map.firstClear', { gold: firstClearBonus(def.id) }));
    else {
      const crowns = el('span', 'result-crowns', facts);
      for (let c = 0; c < 3; c++) el('span', `result-crown${c < record.crowns ? ' is-on' : ''}`, crowns, ICONS.crown);
    }
    // Queen Ada's line (GDD §2): her face and a few words, under the facts.
    const ada = el('div', 'map-ada', this.card);
    el('span', 'map-ada-face', ada, ICONS.ada);
    el('span', 'map-ada-text', ada, t(adaLine(state, def)));
    const buttons = el('div', 'map-card-buttons', this.card);
    const playable = def.ready && def.id <= reached;
    const fight = el('button', 'btn-main', buttons, playable ? t('map.fight') : def.ready ? t('map.locked', { n: def.id - 1 }) : t('map.soon'));
    fight.type = 'button';
    fight.disabled = !playable;
    fight.addEventListener('click', () => {
      if (this.onFight(def.id)) this.waiting(fight);
    });
    const truck = el('button', 'btn-second', buttons);
    truck.type = 'button';
    el('span', 'btn-icon', truck, ICONS.truck);
    el('span', '', truck, t('map.truck'));
    truck.addEventListener('click', () => this.onTruck());
    // Last Stand (GDD §13.4): on a cleared field once the campaign is won, with the field's best wave.
    if (record?.won && lastStandUnlocked(state)) {
      const stand = el('button', 'btn-second map-card-stand', buttons);
      stand.type = 'button';
      const best = lastStandBest(state, def.id);
      el('span', '', stand, best > 0 ? t('map.lastStandBest', { n: best }) : t('map.lastStand'));
      stand.addEventListener('click', () => {
        if (this.onLastStand(def.id)) this.waiting(stand);
      });
    }
    if (playable) fight.focus({ preventScroll: true });
  }
}
