import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pocket-kingdom.com',
  integrations: [preact(), tailwind(), sitemap()],
  redirects: {
    '/monsters': '/creatures',
  },
});
