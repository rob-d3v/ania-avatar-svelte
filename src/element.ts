// ===========================================================================
// CDN entry — importing this file registers the <ania-avatar> custom element.
//
// Built (vite.element.config.ts) into a self-contained IIFE
// (dist/ania-avatar-element.js) with ania-avatar-core bundled in. Drop in via:
//   <script src="https://cdn.jsdelivr.net/npm/ania-avatar-svelte/dist/ania-avatar-element.js"></script>
//   <ania-avatar avatar-url="/avatar.ania" width="320" height="320"></ania-avatar>
// ===========================================================================
import AniaAvatarElement from './element/AniaAvatarElement.svelte';

// Importing the component (customElement:true) auto-registers the tag via
// customElements.define. Re-export the class for programmatic use.
export default AniaAvatarElement;
