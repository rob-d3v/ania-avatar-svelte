import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig} */
export default {
  // Compile TS in <script lang="ts"> blocks.
  preprocess: vitePreprocess(),
  compilerOptions: {
    // Svelte 5 runes mode for the whole package.
    runes: true,
  },
};
