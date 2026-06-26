<svelte:options
  customElement={{
    tag: 'ania-avatar',
    shadow: 'open',
    props: {
      avatarUrl: { attribute: 'avatar-url', type: 'String' },
      avatarPassword: { attribute: 'avatar-password', type: 'String' },
      authToken: { attribute: 'auth-token', type: 'String' },
      width: { attribute: 'width', type: 'Number' },
      height: { attribute: 'height', type: 'Number' },
      theme: { attribute: 'theme', type: 'String' },
      idleSpeed: { attribute: 'idle-speed', type: 'Number' },
      talkSpeed: { attribute: 'talk-speed', type: 'Number' },
      lipSyncEnabled: { attribute: 'lip-sync-enabled', type: 'Boolean' },
      lipSyncIntensity: { attribute: 'lip-sync-intensity', type: 'Number' },
      initialAction: { attribute: 'initial-action', type: 'String' },
    },
  }}
/>

<script lang="ts">
  // ===========================================================================
  // <ania-avatar> custom element — self-contained CDN drop-in.
  //
  // Compiled with customElement:true and bundled WITH ania-avatar-core into
  // dist/ania-avatar-element.js. Attribute props mirror the main component
  // (kebab-cased). Emits DOM CustomEvents: load / talkstart / talkend /
  // actionstart / actionend / error.
  // ===========================================================================
  import { createAniaPlayer } from 'ania-avatar-core';
  import type { AniaPlayerInstance, LoadSource } from 'ania-avatar-core';

  let {
    avatarUrl = '',
    avatarPassword = '',
    authToken = '',
    width = 320,
    height = 320,
    theme = 'dark',
    idleSpeed = undefined as number | undefined,
    talkSpeed = undefined as number | undefined,
    lipSyncEnabled = false,
    lipSyncIntensity = 0.6,
    initialAction = '',
  } = $props();

  const THEME_BG: Record<string, string> = {
    dark: '#080810',
    light: '#f4f4fb',
    blue: '#081026',
    purple: '#160821',
  };

  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let player: AniaPlayerInstance | null = null;

  function emit(name: string, detail?: unknown): void {
    // bubbles + composed crosses the shadow boundary so listeners on the
    // <ania-avatar> host element (or document) receive the event.
    canvasEl?.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  $effect(() => {
    const el = canvasEl;
    if (!el) return;

    const instance = createAniaPlayer(el, {
      width,
      height,
      autoplay: true,
      idleSpeed,
      talkSpeed,
      lipSync: lipSyncEnabled
        ? { enabled: true, intensity: lipSyncIntensity }
        : undefined,
    });
    player = instance;

    const offs = [
      instance.on('load', () => {
        emit('load');
        if (initialAction) instance.triggerAction(initialAction);
      }),
      instance.on('talkStart', () => emit('talkstart')),
      instance.on('talkEnd', () => emit('talkend')),
      instance.on('actionStart', (id) => emit('actionstart', id)),
      instance.on('actionEnd', (id) => emit('actionend', id)),
      instance.on('error', (e) => emit('error', e)),
    ];

    if (avatarUrl) {
      const src: LoadSource = { url: avatarUrl, password: avatarPassword, authToken };
      void instance.load(src).catch(() => {});
    }

    return () => {
      offs.forEach((off) => off());
      instance.destroy();
      player = null;
    };
  });
</script>

<canvas
  bind:this={canvasEl}
  {width}
  {height}
  style={`display:block;width:${width}px;height:${height}px;border-radius:12px;background:${THEME_BG[theme] ?? THEME_BG.dark};`}
></canvas>
