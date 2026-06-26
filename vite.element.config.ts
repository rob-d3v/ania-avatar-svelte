import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Self-contained custom-element / IIFE bundle for CDN <script> drop-in.
//
// Compiles the <ania-avatar> custom element AND bundles ania-avatar-core into a
// single file (nothing is externalized) so a plain <script src> defines the
// element with zero extra requests.
export default defineConfig({
  plugins: [
    svelte({
      // Compile *.svelte.ce.svelte sources as custom elements.
      compilerOptions: { customElement: true },
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: false, // keep svelte-package output already in dist/
    lib: {
      entry: 'src/element.ts',
      name: 'AniaAvatarSvelte',
      formats: ['iife'],
      fileName: () => 'ania-avatar-element.js',
    },
    // Bundle EVERYTHING (incl. ania-avatar-core + svelte runtime) -> self-contained.
    rollupOptions: { external: [] },
    minify: true,
  },
});
