import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Used only for the demo (`npm run dev` / a demo build). The library itself is
// built with svelte-package (see `npm run build`).
export default defineConfig({
  plugins: [svelte()],
  root: 'demo',
  server: { open: true },
  build: { outDir: '../.demo-dist' },
});
