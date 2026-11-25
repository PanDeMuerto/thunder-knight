import type { StringKey } from '@/content/strings';

/**
 * The credits screen (M11, docs/credits.md): who made the models and sounds, under translated headings. Names are
 * written as their makers write them. Kay Lousberg and Pizza Doggy ask for credit; the rest are named out of thanks.
 */
export const CREDITS: readonly { heading: StringKey; names: readonly string[] }[] = [
  { heading: 'credits.models', names: ['KayKit · Kay Lousberg (CC0)', 'Quaternius (CC0)', 'Kenney (CC0)', 'Poly Pizza'] },
  { heading: 'credits.sound', names: ['Ovani Sound', 'Echoes Audio · Pizza Doggy', 'Kenney (CC0)'] },
];
