import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

/**
 * Levels come straight from the data pipeline's `dist/levels.json`, an array
 * ordered easiest-first. `npm run import-data` drops that file in here verbatim.
 *
 * The array order IS the difficulty order, so we keep it as `order` — the file()
 * loader does not otherwise guarantee iteration order.
 */
const levels = defineCollection({
  loader: file('src/data/levels.json', {
    parser: (text) =>
      Object.fromEntries(
        JSON.parse(text).map((level: Record<string, unknown>, i: number) => [
          level.slug,
          { ...level, order: i },
        ])
      ),
  }),
  schema: z.object({
    slug: z.string(),
    english: z.string(),
    gujarati: z.string(),
    // PRE-SPLIT aksharas. Never re-split these in the browser — Gujarati is an
    // abugida and [...word] shreds it into unreadable codepoints.
    tiles: z.array(z.string()).min(2),
    decoys: z.array(z.string()).default([]),
    definition: z.string(),
    images: z.array(z.string()).length(4),
    // Contract says `[]`; the pipeline may fill it with plain attribution
    // strings or with Openverse license objects. Accept both rather than
    // breaking the build on the day images land.
    credits: z
      .array(z.union([z.string(), z.record(z.string(), z.any())]))
      .default([]),
    order: z.number(),
  }),
});

export const collections = { levels };
