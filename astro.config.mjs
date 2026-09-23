// @ts-check
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

/** Every file under `dir`, recursively. */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${dir}${e.name}/`) : [`${dir}${e.name}`]
  );
}

/**
 * Writes dist/sw.js from src/sw.js, stamping in the precache list and a cache
 * name derived from the built assets.
 *
 * Hand-rolled rather than @vite-pwa/astro: the whole job is one cache name, one
 * cleanup loop and two fetch strategies. Workbox would add a build dependency
 * and a config surface to own for about sixty lines of logic that never needs
 * to grow.
 *
 * @returns {import('astro').AstroIntegration}
 */
function serviceWorker() {
  return {
    name: 'picture-puzzle-sw',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        // Vite content-hashes these filenames, so the list IS a content hash of
        // the shell: same site, same cache name; changed site, new cache name.
        const assets = readdirSync(new URL('_astro/', dir))
          .filter((f) => f.endsWith('.js') || f.endsWith('.css'))
          .sort();

        const shell = [
          '/',
          '/offline/',
          '/about/',
          '/manifest.webmanifest',
          '/favicon.svg',
          '/icons/icon-192.png',
          '/icons/icon-512.png',
          ...assets.map((f) => `/_astro/${f}`),
        ];

        const src = readFileSync(new URL('./src/sw.js', import.meta.url), 'utf8');
        // Version = a hash of the whole output. Text files are hashed by
        // content (a one-word copy change on one puzzle page must bump it);
        // images, which are many and large, by path and size. Hashing only the
        // home page or only the asset names silently misses page edits, and a
        // version that does not move is exactly how a stale worker survives.
        const hash = createHash('sha256').update(src);
        for (const f of walk(out).sort()) {
          if (f.endsWith('/sw.js')) continue;
          hash.update(f.slice(out.length));
          hash.update(/\.(html|css|js|svg|webmanifest|json|xml|txt)$/.test(f) ? readFileSync(f) : String(statSync(f).size));
        }
        const version = hash.digest('hex').slice(0, 12);

        writeFileSync(
          `${out}sw.js`,
          src.replaceAll('__CACHE__', `puzzle-${version}`).replaceAll('__SHELL__', JSON.stringify(shell))
        );
        logger.info(`service worker: cache puzzle-${version}, ${shell.length} shell files precached`);
      },
    },
  };
}

// Custom subdomain on GitHub Pages (picture-puzzle.rakhdel.games) => served from
// the root of its own host, so `base` stays '/'. Only a project page served at
// user.github.io/repo would need a base path.
export default defineConfig({
  site: 'https://picture-puzzle.rakhdel.games',
  base: '/',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [serviceWorker()],
});
