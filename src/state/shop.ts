import { ARMY, BANNER_UPGRADE, HERO_UPGRADES, type ArmyUnit, type HeroStat } from '@/content/economy';
import { GUN_LEVELS, GUNS, type GunId } from '@/content/guns';
import { SUPPORT, SUPPORT_ORDER, type SupportId } from '@/content/support';
import type { GameState } from './gameState';
import { levelPrice } from './guns';

/**
 * Rosie's shop (GDD §12): what's on offer for the battle reached, each card's state and price, buying and equipping,
 * and the Recommended ribbon. Plain functions on the save; the panel (`ui/shopPanel.ts`) only draws what these say.
 */

export type ShopTab = 'guns' | 'hero' | 'army';
export type CardState = 'buy' | 'expensive' | 'equip' | 'max' | 'locked';

export interface ShopCard {
  id: string;
  tab: ShopTab;
  /** What the card is about, for its name, icon and effect line. */
  kind: 'gun' | 'hero' | 'army' | 'banner' | 'support';
  key: string;
  /** Current level (guns ★1–5; others 0 up). */
  level: number;
  maxLevel: number;
  state: CardState;
  /** Gold the action costs (buy or the next level), or null. */
  price: number | null;
  /** Gold still missing, when too expensive. */
  missing: number;
  /** The battle that unlocks a locked card. */
  unlockBattle: number;
  /** A gun in the hand (its card offers the next level, with an Equipped badge). */
  equipped: boolean;
  recommended: boolean;
}

/** Tabs appear as they're first needed: Guns in Battle 1, Army in 2, Hero in 3 (GDD §12.2). */
export const TAB_UNLOCK: Record<ShopTab, number> = { guns: 1, army: 2, hero: 3 };

export function openTabs(reached: number): ShopTab[] {
  return (['guns', 'army', 'hero'] as ShopTab[]).filter((t) => reached >= TAB_UNLOCK[t]);
}

/** Scripted Recommended picks for the first battles (GDD §12.2), before the general rule takes over. */
const SCRIPTED: Record<number, string[]> = {
  1: ['gun:pistol'],
  2: ['army:militia', 'gun:pistol'],
  3: ['army:banner', 'hero:health', 'army:militia'],
};

/**
 * Saving goals (GDD §12.2): in these battles the new gun holds the ribbon until it's bought, so a player saves for it
 * rather than spending on small upgrades (the shotgun in Battle 4).
 */
const GOALS: Record<number, string> = {
  4: 'gun:shotgun',
  5: 'gun:shotgun',
  6: 'gun:smg',
  7: 'gun:smg',
  8: 'gun:assaultRifle',
  9: 'gun:assaultRifle',
  10: 'gun:huntingRifle',
  11: 'gun:huntingRifle',
  12: 'gun:machineGun',
  13: 'gun:machineGun',
  14: 'gun:grenadeLauncher',
  15: 'gun:grenadeLauncher',
  16: 'gun:minigun',
  17: 'gun:minigun',
  18: 'gun:rocketLauncher',
  19: 'gun:rocketLauncher',
};

const GUN_ORDER = Object.keys(GUNS) as GunId[];
const ARMY_ORDER: ArmyUnit[] = ['militia', 'archers', 'menAtArms', 'knights'];
const HERO_ORDER: HeroStat[] = ['health', 'speed', 'grenades', 'magnet'];

/** Every card in a tab, for a player who has reached `reached`. Shows what's open plus the next lock. */
export function shopCards(state: GameState, reached: number, tab: ShopTab): ShopCard[] {
  const cards = tab === 'guns' ? gunCards(state, reached) : tab === 'army' ? armyCards(state, reached) : heroCards(state, reached);
  return cards;
}

/** All open tabs' cards, with the Recommended ribbon set on one. */
export function allCards(state: GameState, reached: number): ShopCard[] {
  const cards = openTabs(reached).flatMap((tab) => shopCards(state, reached, tab));
  const pick = recommend(cards, reached);
  for (const c of cards) c.recommended = c.id === pick;
  return cards;
}

function card(
  state: GameState,
  partial: Omit<ShopCard, 'state' | 'missing' | 'recommended' | 'equipped'> & { owned?: boolean; equipped?: boolean },
  reached: number,
): ShopCard {
  let s: CardState;
  if (reached < partial.unlockBattle) s = 'locked';
  else if ((partial.kind === 'gun' || partial.kind === 'support') && partial.owned && !partial.equipped) s = 'equip';
  else if (partial.price === null) s = 'max';
  else s = state.gold >= partial.price ? 'buy' : 'expensive';
  const { owned, equipped, ...rest } = partial;
  return {
    ...rest,
    state: s,
    missing: s === 'expensive' ? partial.price! - state.gold : 0,
    equipped: !!(owned && equipped),
    recommended: false,
  };
}

function gunCards(state: GameState, reached: number): ShopCard[] {
  const cards: ShopCard[] = [];
  let lockShown = false;
  for (const id of GUN_ORDER) {
    const def = GUNS[id];
    const level = state.guns[id] ?? 0;
    const owned = level > 0;
    if (!owned && def.unlockBattle > reached) {
      // Show the next gun to come, locked; hide the rest.
      if (lockShown) continue;
      lockShown = true;
    }
    const equipped = state.hand.includes(id);
    const price = owned ? (equipped ? levelPrice(id, level) : null) : def.price;
    cards.push(
      card(state, { id: `gun:${id}`, tab: 'guns', kind: 'gun', key: id, level, maxLevel: GUN_LEVELS.max, price, unlockBattle: def.unlockBattle, owned, equipped }, reached),
    );
  }
  return cards;
}

function armyCards(state: GameState, reached: number): ShopCard[] {
  const cards: ShopCard[] = [];
  const entries: { id: string; kind: 'army' | 'banner'; key: string; level: number; prices: readonly number[]; unlock: number }[] = [
    ...ARMY_ORDER.map((u) => ({ id: `army:${u}`, kind: 'army' as const, key: u, level: state.army[u], prices: ARMY[u].prices, unlock: ARMY[u].unlockBattle })),
    { id: 'army:banner', kind: 'banner', key: 'banner', level: state.army.banner, prices: BANNER_UPGRADE.prices, unlock: BANNER_UPGRADE.unlockBattle },
  ];
  entries.sort((a, b) => a.unlock - b.unlock);
  let lockShown = false;
  for (const e of entries) {
    if (e.unlock > reached) {
      if (lockShown) continue;
      lockShown = true;
    }
    const price = e.prices[e.level] ?? null;
    cards.push(card(state, { id: e.id, tab: 'army', kind: e.kind, key: e.key, level: e.level, maxLevel: e.prices.length, price, unlockBattle: e.unlock }, reached));
  }
  return cards;
}

function heroCards(state: GameState, reached: number): ShopCard[] {
  const stats = HERO_ORDER.map((stat) => {
    const def = HERO_UPGRADES[stat];
    const level = state.hero[stat];
    const price = def.prices[level] ?? null;
    return card(state, { id: `hero:${stat}`, tab: 'hero', kind: 'hero', key: stat, level, maxLevel: def.prices.length, price, unlockBattle: def.unlockBattle }, reached);
  });
  // Support call-ins (GDD §8.3) follow the hero's own upgrades. One is equipped (and levelled); the other offers Equip.
  const support = SUPPORT_ORDER.map((id) => {
    const def = SUPPORT[id];
    const level = state.support.owned[id] ?? 0;
    const owned = level > 0;
    const equipped = state.support.equipped === id;
    const price = owned && !equipped ? null : (def.prices[level] ?? null);
    return card(state, { id: `support:${id}`, tab: 'hero', kind: 'support', key: id, level, maxLevel: def.prices.length, price, unlockBattle: def.unlockBattle, owned, equipped }, reached);
  });
  return [...stats, ...support];
}

/**
 * The Recommended ribbon: the battle's scripted pick when affordable, else the cheapest affordable purchase (cheap
 * steps keep every break rewarding). Never a locked, equip or max card.
 */
export function recommend(cards: readonly ShopCard[], reached: number): string | null {
  // A saving goal: the battle's new gun keeps the ribbon until it's bought, affordable or not ("Save for this").
  const goal = GOALS[reached];
  const goalCard = goal ? cards.find((c) => c.id === goal) : undefined;
  if (goalCard && goalCard.level === 0 && (goalCard.state === 'buy' || goalCard.state === 'expensive')) return goal!;
  const affordable = cards.filter((c) => c.state === 'buy');
  for (const id of SCRIPTED[reached] ?? []) if (affordable.some((c) => c.id === id)) return id;
  affordable.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  return affordable[0]?.id ?? null;
}

/**
 * Buys or equips a card. Changes the save in place and returns true when something happened. Gold never goes
 * negative; locked and maxed cards do nothing.
 */
export function act(state: GameState, reached: number, id: string): boolean {
  const [kind, key] = id.split(':') as [string, string];
  const tab: ShopTab = kind === 'gun' ? 'guns' : kind === 'hero' || kind === 'support' ? 'hero' : 'army';
  const c = shopCards(state, reached, tab).find((x) => x.id === id);
  if (!c) return false;
  if (c.state === 'equip') {
    if (kind === 'support') state.support.equipped = key as SupportId;
    else equip(state, key as GunId, reached);
    return true;
  }
  if (c.state !== 'buy' || c.price === null) return false;
  state.gold -= c.price;
  if (kind === 'gun') {
    const gun = key as GunId;
    const owned = state.guns[gun] ?? 0;
    state.guns[gun] = owned + 1;
    // A new gun goes straight into the hand.
    if (owned === 0) equip(state, gun, reached);
  } else if (kind === 'hero') {
    state.hero[key as HeroStat] += 1;
  } else if (kind === 'support') {
    const s = key as SupportId;
    const had = state.support.owned[s] ?? 0;
    state.support.owned[s] = had + 1;
    // One call-in is equipped; a newly bought one goes straight on (the other's card offers Equip).
    if (had === 0) state.support.equipped = s;
  } else if (key === 'banner') {
    state.army.banner += 1;
  } else {
    state.army[key as ArmyUnit] += 1;
  }
  return true;
}

/** Charges a wave of the equipped support call-in (GDD §8.3): 1, then +1 a level; 0 with none. */
export function supportCharges(state: GameState): number {
  const id = state.support.equipped as SupportId | null;
  if (!id || !(id in SUPPORT)) return 0;
  const level = state.support.owned[id] ?? 0;
  return level > 0 ? (SUPPORT[id].charges[level - 1] ?? 0) : 0;
}

/** Hands hold one gun until Battle 6, then two (GDD §8.1). */
export function handSlots(reached: number): 1 | 2 {
  return reached >= 6 ? 2 : 1;
}

/**
 * When the second hand opens (Battle 6) and it's empty, it takes the most valuable other gun the player owns, so the
 * swap lesson has two guns to swap between. Returns true if it changed the hand.
 */
export function fillSecondHand(state: GameState, reached: number): boolean {
  if (handSlots(reached) < 2 || state.hand[1]) return false;
  const others = (Object.keys(state.guns) as GunId[]).filter((g) => state.guns[g] && g !== state.hand[0]);
  if (!others.length) return false;
  others.sort((a, b) => GUNS[b].value - GUNS[a].value);
  state.hand[1] = others[0]!;
  return true;
}

/** Puts an owned gun in the hand: the free second slot if there is one, else the first. */
export function equip(state: GameState, gun: GunId, reached: number): void {
  if (!state.guns[gun] || state.hand.includes(gun)) return;
  if (handSlots(reached) === 2 && state.hand[1] === null) state.hand[1] = gun;
  else state.hand[0] = gun;
}
