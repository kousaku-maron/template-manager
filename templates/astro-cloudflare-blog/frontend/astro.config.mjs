import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  integrations: [preact({ compact: true })],
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: cloudflare({
    imageService: 'compile',
  }),
});
