import { describe, expect, it } from 'vitest';
import { BATTLES, battle } from '@/content/battles';
import { LANDMARKS, PIECE_SCALE, REGION1_BASE, riverDressing, STREAMS, TREE_LINES, type PieceId } from '@/content/fields';
import KIT from '@/content/kitLater.json';

const later = new Set<string>(KIT.later);

/** Every piece a battle's field shows: the shared dressing, its region's tree line, its landmark and stream. */
function piecesOf(id: number): Set<PieceId> {
  const { region } = battle(id);
  const out = new Set<PieceId>(['truck']);
  for (const p of [...REGION1_BASE, ...(TREE_LINES[region] ?? TREE_LINES[1]!), ...(LANDMARKS[id] ?? [])]) out.add(p.piece);
  const stream = STREAMS[id];
  if (stream && region >= 2) for (const p of riverDressing(stream)) out.add(p.piece);
  return out;
}

describe('the field kit split (M11: Region 1 first, the rest fetched after)', () => {
  it('names only real pieces', () => {
    for (const name of later) expect(PIECE_SCALE).toHaveProperty(name);
  });

  it('gives Region 1 every piece it shows in the first file', () => {
    const region1 = BATTLES.filter((b) => b.region === 1).map((b) => b.id);
    expect(region1.length).toBeGreaterThan(0);
    for (const id of region1) for (const piece of piecesOf(id)) expect(later.has(piece), `Battle ${id} shows ${piece}`).toBe(false);
  });

  it('only puts off pieces some later battle uses', () => {
    const used = new Set<string>();
    for (const b of BATTLES) for (const piece of piecesOf(b.id)) used.add(piece);
    for (const name of later) expect(used.has(name), `${name} is in no battle`).toBe(true);
  });
});
