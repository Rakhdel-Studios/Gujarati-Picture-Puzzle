// @ts-check
import { defineConfig } from 'astro/config';

// Custom subdomain on GitHub Pages (picture-puzzle.rakhdel.games) => served from
// the root of its own host, so `base` stays '/'. Only a project page served at
// user.github.io/repo would need a base path.
export default defineConfig({
  site: 'https://picture-puzzle.rakhdel.games',
  base: '/',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
