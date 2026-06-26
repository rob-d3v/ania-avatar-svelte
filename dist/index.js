// ===========================================================================
// ania-avatar-svelte — public entry (the svelte-package primary artifact).
//
// Source-Svelte consumers import the compiled components + types from here.
// ===========================================================================
export { default as AniaAvatar } from './AniaAvatar.svelte';
export { default as AvatarChatbot } from './AvatarChatbot.svelte';
// Re-export the imperative command runner for hosts that want it standalone.
export { executeCommand as runCommand } from 'ania-avatar-core';
