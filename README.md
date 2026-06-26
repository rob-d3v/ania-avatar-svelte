# ania-avatar-svelte

**Svelte 5** wrapper for the **Ania animated-avatar player**, built on the
framework-agnostic [`ania-avatar-core`](https://github.com/rob-d3v/ania-avatar-core)
engine.

Drop an `<AniaAvatar>` component into any Svelte 5 app: it mounts a `<canvas>`,
loads a `.ania` avatar (market or password-encrypted), and drives idle/talk
animation, lip-sync, actions, TTS/STT, wake-word, and desktop-style commands —
all through reactive props and Svelte-5 callback events.

- **Runes-based** (`$props`, `$state`, `$derived`, `$effect`) — idiomatic Svelte 5.
- **Fully typed** — props/events/handle, plus the re-exported engine types.
- **Prop-compatible** with `ania-avatar-react` / `ania-avatar-vue`.
- **CDN drop-in** — a self-contained `<ania-avatar>` custom element (core bundled in).

## Install

```bash
npm install ania-avatar-svelte
# (svelte >= 5 is a peer dependency)
```

`ania-avatar-core` is pulled in automatically as a dependency.

## Usage (Svelte 5 / SvelteKit)

```svelte
<script lang="ts">
  import { AniaAvatar } from 'ania-avatar-svelte';
</script>

<AniaAvatar
  avatarUrl="/avatars/ania.ania"
  width={320}
  height={320}
  lipSyncEnabled
  onload={() => console.log('avatar loaded')}
  ontalkstart={() => console.log('talking')}
/>
```

### Encrypted (personal) avatar

```svelte
<AniaAvatar
  avatarUrl="https://api.example.com/avatar.ania"
  avatarPassword="secret"
  authToken={jwt}
/>
```

### Already-decrypted data

```svelte
<AniaAvatar avatarData={decryptedAvatarData} />
```

## Props

| Prop | Type | Notes |
| ---- | ---- | ----- |
| `avatarUrl` | `string` | URL to a `.ania` file (market or personal) |
| `avatarPassword` | `string` | Password for an encrypted file |
| `avatarData` | `AniaAvatarData` | Already-decrypted payload (skips fetch) |
| `authToken` | `string` | Bearer token for the download |
| `position` | `'bottom-left' \| 'bottom-right' \| 'top-left' \| 'top-right'` | Fixed-position anchor |
| `width` / `height` | `number` | Canvas size (default 320) |
| `theme` | `'dark' \| 'light' \| 'blue' \| 'purple'` | Background tint |
| `idleSpeed` / `talkSpeed` | `number` | Animation speed overrides |
| `autoCalculateSpeed` | `boolean` | Derive speeds from fps |
| `lipSyncEnabled` | `boolean` | Enable lip-sync |
| `lipSyncServerUrl` | `string` | Fetch lip-sync / actions config by contentHash |
| `lipSyncIntensity` | `number` | 0..1 openness boost |
| `lipSyncResponsiveness` | `number` | 0.05..1 envelope smoothing |
| `lipSyncSustainStyle` | `'hold' \| 'wiggle'` | Held-vowel shaping |
| `lipSyncWiggleSpeed` | `number` | 1..6 wiggle oscillation |
| `actions` | `ActionConfig[]` | Registered action clips |
| `initialAction` | `string` | Action id to trigger on load |
| `wakeWordEnabled` | `boolean` | On-device wake word (needs `onnxruntime-web`) |
| `wakeWordModelUrl` | `string` | openWakeWord ONNX model URL |
| `wakeWordThreshold` | `number` | Detection threshold 0..1 |
| `wakeWordWasmPaths` | `string` | onnxruntime-web wasm path |
| `tts*` | various | `ttsProvider`, `ttsApiKey`, `ttsVoiceId`, `ttsLang`, `ttsRate`, `ttsPitch`, `piperModelUrl`, … (drive the `speak`/`tts` command) |
| `stt*` | various | `sttProvider`, `sttLang`, `sttContinuous`, … |
| `webhookUrl` / `webhookApiKey` / `webhookHeaders` | | Chat webhook (used by `ask` / `<AvatarChatbot>`) |
| `enablePostMessageControl` | `boolean` | Install an origin-allowlisted `postMessage` command listener |
| `postMessageOrigins` | `string[]` | Allowed origins (`['*']` = all, unsafe) |

### Events (Svelte 5 callback props)

`onload(player)` · `ontalkstart()` · `ontalkend()` · `onactionstart(id)` ·
`onactionend(id)` · `onwake(score?)` · `onerror(error)` · `onclose()`

### Imperative handle

Bind the component and call its exported `getHandle()`:

```svelte
<script lang="ts">
  import { AniaAvatar } from 'ania-avatar-svelte';
  let avatar: AniaAvatar;

  function wave() {
    avatar.getHandle().triggerAction('wave');
  }
  function say(text: string) {
    // Run a desktop-style command line against the avatar.
    avatar.getHandle().runCommand(`tts ${text}`);
  }
</script>

<AniaAvatar bind:this={avatar} avatarUrl="/ania.ania" />
<button onclick={wave}>Wave</button>
```

The handle exposes: `getPlayer()`, `play()`, `pause()`, `setTalking()`,
`triggerAction()`, `cancelAction()`, `runCommand(line, extraCtx?)`.

## `<AvatarChatbot>`

`<AvatarChatbot>` composes `<AniaAvatar>` with a minimal chat input that POSTs
to your `webhookUrl` (n8n-style) and speaks the reply through the avatar's TTS.
It accepts every `<AniaAvatar>` prop plus `placeholder` and `assistantName`.

```svelte
<script lang="ts">
  import { AvatarChatbot } from 'ania-avatar-svelte';
</script>

<AvatarChatbot avatarUrl="/ania.ania" webhookUrl="https://n8n.example.com/webhook/ania" />
```

## CDN (custom element)

A self-contained build defines a `<ania-avatar>` custom element with
`ania-avatar-core` bundled in — no other `<script>` needed:

```html
<script src="https://cdn.jsdelivr.net/npm/ania-avatar-svelte/dist/ania-avatar-element.js"></script>

<ania-avatar
  avatar-url="https://example.com/avatar.ania"
  width="320"
  height="320"
  theme="dark"
  lip-sync-enabled
></ania-avatar>

<script>
  document.querySelector('ania-avatar')
    .addEventListener('load', () => console.log('loaded'));
</script>
```

Attributes are kebab-cased (`avatar-url`, `lip-sync-enabled`, `idle-speed`, …)
and the element emits DOM `CustomEvent`s: `load`, `talkstart`, `talkend`,
`actionstart`, `actionend`, `error`.

> The CDN bundle exposes a subset of props (source, size, theme, idle/talk
> speed, basic lip-sync, initial action). Use the Svelte component for the full
> surface (TTS/STT/wake-word/webhook/postMessage).

## Demo

```bash
npm install
npm run dev   # opens the /demo route
```

## Build

```bash
npm run build   # svelte-package (-> dist/) + the CDN custom-element bundle
```

`dist/` is committed to the repo so jsDelivr / unpkg can serve the CDN bundle
straight from GitHub.

## License

MIT
