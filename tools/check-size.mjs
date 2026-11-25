// Fails the build when dist/ goes over Poki's size targets.
// "Initial" is everything the page needs before play. "Total" adds anything fetched afterwards.
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

// M11's exit: the first download at most 3.5 MB on the wire, everything at most 8 MB.
const LIMITS = { initial: 3.5 * 1024 * 1024, total: 8 * 1024 * 1024 };
// Audio loads after the first input, so it doesn't delay the first frame. The later regions' field pieces, the riders'
// horse and the War Wagon's oxen are fetched after the first load (M11), Queen Ada when Battle 20 starts.
const DEFERRED_PREFIXES = [
  'assets/deferred/',
  'assets/audio/',
  'assets/field/kit-later.glb',
  'assets/soldiers/horse.glb',
  'assets/soldiers/ox.glb',
  'assets/hero/ada.glb',
];
// The folder to check: dist/ (Poki) by default, or another build's (`node tools/check-size.mjs dist-itch`).
const dist = fileURLToPath(new URL(`../${process.argv[2] ?? 'dist'}/`, import.meta.url));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(dist).map((file) => {
  const data = readFileSync(file);
  const rel = relative(dist, file).replaceAll('\\', '/');
  const compressible = /\.(js|css|html|json|svg|glb)$/.test(rel);
  return { rel, raw: data.length, wire: compressible ? gzipSync(data).length : data.length };
});

const kb = (n) => `${(n / 1024).toFixed(0)} KB`.padStart(9);
for (const f of [...files].sort((a, b) => b.wire - a.wire).slice(0, 15)) {
  console.log(`${kb(f.raw)} raw ${kb(f.wire)} wire  ${f.rel}`);
}

const initial = files
  .filter((f) => !DEFERRED_PREFIXES.some((p) => f.rel.startsWith(p)))
  .reduce((sum, f) => sum + f.wire, 0);
const total = files.reduce((sum, f) => sum + f.wire, 0);

console.log(`\nInitial ${kb(initial)} of ${kb(LIMITS.initial)}`);
console.log(`Total   ${kb(total)} of ${kb(LIMITS.total)}`);

if (initial > LIMITS.initial || total > LIMITS.total) {
  console.error('Size budget exceeded.');
  process.exit(1);
}
