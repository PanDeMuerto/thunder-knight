import { BATTLES, captainOf } from '@/content/battles';
import { ECONOMY } from '@/content/economy';
import { squadGold, waveBonus } from './economy';
import { newGameState, type GameState } from './gameState';
import { recordVictory } from './progress';
import { act, allCards } from './shop';

/**
 * The economy simulator (GDD §11.2, `npm run balance`): plays each built battle's gold without the action. Every
 * knockout pays (coins fly to the hero whoever knocked the soldier out), every wave pays its bonus, the first win its
 * bonus. At each break a saving player buys the Recommended item if it's affordable. The report says what was
 * affordable and bought at every break, and the targets it breaks.
 */

export interface BreakLog {
  battle: number;
  /** The wave just cleared (1-based); the last wave's "break" is the victory. */
  wave: number;
  gold: number;
  /** Something useful could be bought here (before buying). */
  affordable: boolean;
  bought: string | null;
}

export interface BalanceReport {
  breaks: BreakLog[];
  /** Gold earned in each battle, by battle id. */
  earned: Record<number, number>;
  /** Gold the player holds at the end. */
  gold: number;
  state: GameState;
  /** The player as Region 1 ends (after Battle 5), for its targets, once more battles are built. */
  region1?: GameState;
}

/** Plays battles 1 to `last` once each, in order. */
export function simulate(last: number): BalanceReport {
  const state = newGameState();
  const breaks: BreakLog[] = [];
  const earned: Record<number, number> = {};
  let region1: GameState | undefined;
  for (const def of BATTLES.slice(0, last)) {
    if (!def.ready) break;
    let gold = 0;
    def.waves.forEach((wave, w) => {
      // A boss wave's reinforcements come too (GDD §9.3).
      const squads = [...wave.squads, ...(wave.bossHalf ?? [])];
      const kills = squads.reduce((n, s) => n + squadGold(s.type, s.count, captainOf(s) ?? false, def.id), 0);
      gold += kills;
      const bonus = waveBonus(def.id, w + 1);
      state.gold += kills + bonus;
      gold += bonus;
      const isLast = w === def.waves.length - 1;
      if (isLast) {
        gold += recordVictory(state, def.id, 1).firstClear;
      }
      // A break (or, after the last wave, the map before the next battle): buy the Recommended item.
      const reached = isLast ? def.id + 1 : def.id;
      const cards = allCards(state, reached);
      const affordable = cards.some((c) => c.state === 'buy');
      const pick = cards.find((c) => c.recommended);
      const bought = pick && act(state, reached, pick.id) ? pick.id : null;
      breaks.push({ battle: def.id, wave: w + 1, gold: state.gold + (bought ? pick!.price! : 0), affordable, bought });
    });
    earned[def.id] = gold;
    if (def.id === 5) region1 = structuredClone(state);
  }
  return { breaks, earned, gold: state.gold, state, region1 };
}

/** The GDD §11.2 targets that apply to the battles built so far. Returns what failed, in words. */
export function checkTargets(report: BalanceReport): string[] {
  const failures: string[] = [];
  // End of Region 1 (Battle 5): about 4,000–5,000 earned; the shotgun bought, militia L2–3, pistol ★3–4.
  if (report.earned[5] !== undefined && report.region1) {
    const total = [1, 2, 3, 4, 5].reduce((a, id) => a + (report.earned[id] ?? 0), 0) + ECONOMY.startingGold;
    if (total < 3800 || total > 5200) failures.push(`Region 1 should earn about 4,000–5,000 in all; it earns ${total}`);
    const s = report.region1;
    if (!s.guns.shotgun) failures.push('by the end of Region 1 the shotgun should be bought');
    const militia = s.army.militia ?? 0;
    if (militia < 2 || militia > 3) failures.push(`by the end of Region 1 militia should be level 2–3; it's ${militia}`);
    const pistol = s.guns.pistol ?? 1;
    if (pistol < 3 || pistol > 4) failures.push(`by the end of Region 1 the pistol should be ★3–4; it's ★${pistol}`);
  }
  // A new gun is affordable within 1–2 battles of unlocking (GDD §11.2): the SMG (Battle 6) by the end of Battle 7.
  if (report.earned[7] !== undefined && !report.state.guns.smg) failures.push('by the end of Battle 7 the SMG should be bought');
  if (report.earned[9] !== undefined && !report.state.guns.assaultRifle) failures.push('by the end of Battle 9 the assault rifle should be bought');
  if (report.earned[10] !== undefined && !report.state.guns.huntingRifle) failures.push('by the end of Battle 10 the hunting rifle should be bought');
  // The machine gun unlocks at Battle 12: on sale after it, bought by the end of Battle 13 (checked from Battle 12 on).
  if (report.earned[13] !== undefined && !report.state.guns.machineGun) failures.push('by the end of Battle 13 the machine gun should be bought');
  // The grenade launcher unlocks at Battle 14: bought by the end of Battle 15.
  if (report.earned[15] !== undefined && !report.state.guns.grenadeLauncher) failures.push('by the end of Battle 15 the grenade launcher should be bought');
  // The minigun unlocks at Battle 16: bought by the end of Battle 17.
  if (report.earned[17] !== undefined && !report.state.guns.minigun) failures.push('by the end of Battle 17 the minigun should be bought');
  // The rocket launcher unlocks at Battle 18: bought by the end of Battle 19, ready for the Iron Ox.
  if (report.earned[19] !== undefined && !report.state.guns.rocketLauncher) failures.push('by the end of Battle 19 the rocket launcher should be bought');
  const first = report.breaks.find((b) => b.battle === 1 && b.wave === 1);
  if (first && (first.gold < 100 || first.gold > 140)) {
    failures.push(`Battle 1's first break should hold about 110–130 gold (pistol ★2 is 100); it holds ${first.gold}`);
  }
  if (first && first.bought !== 'gun:pistol') failures.push(`Battle 1's first break should buy pistol ★2; it buys ${first.bought}`);
  const b1 = report.earned[1];
  if (b1 !== undefined && (b1 < 350 || b1 > 460)) failures.push(`Battle 1 should earn about 400; it earns ${b1}`);
  report.breaks.forEach((b, n) => {
    // Right after a purchase the purse is light, so a break may only show "X more" (Battle 1's second break does
    // this on purpose, onboarding §4). A break after one where the player bought nothing must offer something.
    const spent = n > 0 && report.breaks[n - 1]!.bought !== null;
    // The final battle is exempt: by then the cheap cards are bought and the player saves for the big ones (GDD §11.2:
    // about 75% of the catalogue by the end), so a break may offer only "X more".
    if (b.battle === BATTLES.length) return;
    if (!b.affordable && !spent) failures.push(`Battle ${b.battle}, after wave ${b.wave}: nothing affordable (${b.gold} gold) after a break with no purchase`);
  });
  return failures;
}
