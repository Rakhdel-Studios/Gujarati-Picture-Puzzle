#!/usr/bin/env node
// Drop-in swap from the data pipeline's build output to this site.
//
//   npm run import-data -- ../PicturePuzzleDataGenerationPipeline/dist
//
// Copies dist/levels.json -> src/data/levels.json and dist/images -> public/images.
// The zod schema in src/content.config.ts validates the result at build time,
// so a contract drift fails the build loudly instead of shipping broken pages.
import { cp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(process.argv[2] ?? '../PicturePuzzleDataGenerationPipeline/dist');

const levels = JSON.parse(await readFile(resolve(src, 'levels.json'), 'utf8'));
if (!Array.isArray(levels) || levels.length === 0) throw new Error('levels.json is not a non-empty array');
for (const l of levels) {
  if (!Array.isArray(l.tiles) || l.tiles.length < 2) throw new Error(`${l.slug}: tiles must be a pre-split array`);
  if (l.tiles.join('') !== l.gujarati) throw new Error(`${l.slug}: tiles do not join back to "${l.gujarati}"`);
}

await writeFile(resolve(root, 'src/data/levels.json'), JSON.stringify(levels, null, 2) + '\n');
await rm(resolve(root, 'public/images'), { recursive: true, force: true });
await cp(resolve(src, 'images'), resolve(root, 'public/images'), { recursive: true });

console.log(`imported ${levels.length} levels + images from ${src}`);
