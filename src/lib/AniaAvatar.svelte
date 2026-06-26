<script lang="ts">
  // ===========================================================================
  // <AniaAvatar> — Svelte 5 wrapper around ania-avatar-core.
  //
  // Binds reactive props to the imperative engine: creates the player in
  // $effect, reacts to prop changes via $effect blocks calling player methods,
  // and tears it down on unmount. Exposes an imperative handle via bind:this.
  // ===========================================================================
  import {
    createAniaPlayer,
    executeCommand,
    installPostMessageControl,
    professionalTTSRequest,
    getWakeWordEngine,
  } from 'ania-avatar-core';
  import type {
    AniaPlayerInstance,
    CommandContext,
    CommandResult,
    LoadSource,
    WakeWordEngineLike,
  } from 'ania-avatar-core';
  import type { AniaAvatarProps, AniaAvatarHandle } from './types';

  let {
    // source
    avatarUrl,
    avatarPassword,
    avatarData,
    authToken,
    // layout
    position,
    width = 320,
    height = 320,
    theme = 'dark',
    class: className = '',
    // speeds
    idleSpeed,
    talkSpeed,
    autoCalculateSpeed = false,
    // lip sync
    lipSyncEnabled = false,
    lipSyncServerUrl,
    lipSyncIntensity = 0.6,
    lipSyncResponsiveness = 0.5,
    lipSyncSustainStyle = 'wiggle',
    lipSyncWiggleSpeed = 2,
    // actions
    actions,
    initialAction,
    // wake word
    wakeWordEnabled = false,
    wakeWordModelUrl,
    wakeWordThreshold = 0.5,
    wakeWordWasmPaths,
    // tts
    ttsProvider = 'browser',
    ttsApiKey,
    ttsApiUrl,
    ttsVoice,
    ttsVoiceId,
    ttsModel,
    ttsLang,
    ttsGender,
    ttsRate,
    ttsPitch,
    ttsRegion,
    piperModelUrl,
    piperModelConfigUrl,
    piperSpeakerId,
    // stt (forwarded into command ctx / future chat use)
    sttProvider,
    sttLang,
    // webhook
    webhookUrl,
    webhookApiKey,
    webhookHeaders,
    // external control
    enablePostMessageControl = false,
    postMessageOrigins = [],
    // events
    onload,
    ontalkstart,
    ontalkend,
    onactionstart,
    onactionend,
    onwake,
    onerror,
    onclose,
  }: AniaAvatarProps = $props();

  // ----- Local reactive state -----
  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let player = $state<AniaPlayerInstance | null>(null);
  let status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
  let errorMsg = $state<string | null>(null);

  const THEME_BG: Record<string, string> = {
    dark: '#080810',
    light: '#f4f4fb',
    blue: '#081026',
    purple: '#160821',
  };

  // Static positioning style (derived once per relevant prop).
  const positionStyle = $derived.by(() => {
    if (!position) return '';
    const map: Record<string, string> = {
      'bottom-left': 'position:fixed;left:16px;bottom:16px;',
      'bottom-right': 'position:fixed;right:16px;bottom:16px;',
      'top-left': 'position:fixed;left:16px;top:16px;',
      'top-right': 'position:fixed;right:16px;top:16px;',
    };
    return map[position] ?? '';
  });

  // ----- speak() helper (cloud/keyless via core's tts-api) -----
  async function speak(text: string): Promise<void> {
    if (!player || !text) return;
    try {
      if (ttsProvider === 'browser' || !ttsProvider) {
        // Browser SpeechSynthesis: drive talk state around the utterance.
        const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
        if (!synth) return;
        const u = new SpeechSynthesisUtterance(text);
        if (ttsLang) u.lang = ttsLang;
        if (ttsRate != null) u.rate = ttsRate;
        if (ttsPitch != null) u.pitch = ttsPitch;
        player.setTalking(true);
        u.onend = () => player?.setTalking(false);
        synth.cancel();
        synth.speak(u);
        return;
      }
      // Cloud providers -> fetch audio, play it, gate talk on playback.
      const result = await professionalTTSRequest(text, ttsProvider, {
        apiKey: ttsApiKey,
        apiUrl: ttsApiUrl,
        voiceId: ttsVoiceId,
        model: ttsModel,
        lang: ttsLang,
        gender: ttsGender,
        rate: ttsRate,
        pitch: ttsPitch,
        region: ttsRegion,
        piperModelUrl,
        piperModelConfigUrl,
        piperSpeakerId,
      });
      if (!result?.audioUrl) return;
      const audio = new Audio(result.audioUrl);
      player.setTalking(true);
      audio.onended = () => player?.setTalking(false);
      audio.onerror = () => player?.setTalking(false);
      await audio.play();
    } catch (e) {
      player?.setTalking(false);
      // eslint-disable-next-line no-console
      console.warn('[ania-avatar-svelte] speak failed:', e);
    }
  }

  // ----- ask() helper (webhook chat) -----
  async function ask(text: string): Promise<void> {
    if (!webhookUrl || !text) return;
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(webhookApiKey ? { Authorization: `Bearer ${webhookApiKey}` } : {}),
        ...(webhookHeaders ?? {}),
      };
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json().catch(() => ({}));
      const reply =
        typeof data === 'string'
          ? data
          : (data.message ?? data.reply ?? data.output ?? '');
      if (reply) await speak(String(reply));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[ania-avatar-svelte] ask failed:', e);
    }
  }

  // ----- Command context (shared by runCommand + postMessage) -----
  function buildCommandContext(extra?: Partial<CommandContext>): CommandContext {
    return {
      player: player ?? undefined,
      getActions: () => player?.getAvailableActions() ?? [],
      triggerAction: (id) => void player?.triggerAction(id),
      cancelAction: () => player?.cancelAction(true),
      speak: (t) => void speak(t),
      ask: (t) => ask(t),
      setVisible: (v) => (v ? player?.play() : player?.pause()),
      setSpeeds: (idle, talk) => player?.setSpeeds(idle, talk),
      stopSpeaking: () => {
        if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
        player?.setTalking(false);
      },
      triggerWake: () => onwake?.(),
      ...extra,
    };
  }

  function runCommand(line: string, extraCtx?: Partial<CommandContext>): CommandResult {
    return executeCommand(line, buildCommandContext(extraCtx));
  }

  // ----- Imperative handle (bind:this) -----
  export function getHandle(): AniaAvatarHandle {
    return {
      getPlayer: () => player,
      play: () => player?.play(),
      pause: () => player?.pause(),
      setTalking: (t) => player?.setTalking(t),
      triggerAction: (id) => player?.triggerAction(id) ?? false,
      cancelAction: (force) => player?.cancelAction(force),
      runCommand,
    };
  }

  // ===========================================================================
  // Lifecycle: create player when the canvas mounts; load the source.
  // ===========================================================================
  $effect(() => {
    const el = canvasEl;
    if (!el) return;

    const instance = createAniaPlayer(el, {
      width,
      height,
      autoplay: true,
      idleSpeed,
      talkSpeed,
      autoCalculateSpeed,
      serverUrl: lipSyncServerUrl,
      fetchActionsFromServer: !!lipSyncServerUrl,
      lipSync: lipSyncEnabled
        ? {
            enabled: true,
            intensity: lipSyncIntensity,
            responsiveness: lipSyncResponsiveness,
            sustainStyle: lipSyncSustainStyle,
            wiggleSpeed: lipSyncWiggleSpeed,
          }
        : undefined,
    });

    // Wire engine events -> Svelte callback props.
    const offs = [
      instance.on('load', () => {
        status = 'ready';
        onload?.(instance);
        if (initialAction) instance.triggerAction(initialAction);
      }),
      instance.on('talkStart', () => ontalkstart?.()),
      instance.on('talkEnd', () => ontalkend?.()),
      instance.on('actionStart', (id) => onactionstart?.(id)),
      instance.on('actionEnd', (id) => onactionend?.(id)),
      instance.on('error', (e) => {
        status = 'error';
        errorMsg = e?.message ?? String(e);
        onerror?.(e);
      }),
    ];

    player = instance;

    // Kick off the load (untracked: we don't want a re-create when source props
    // change here — a dedicated $effect below handles reloads).
    void loadSource(instance);

    return () => {
      offs.forEach((off) => off());
      instance.destroy();
      if (player === instance) player = null;
    };
  });

  // Build a LoadSource from the current source props and load it.
  async function loadSource(instance: AniaPlayerInstance): Promise<void> {
    if (!avatarUrl && !avatarData) return;
    status = 'loading';
    errorMsg = null;
    try {
      if (avatarData) {
        await instance.load(avatarData);
      } else {
        const src: LoadSource = {
          url: avatarUrl,
          password: avatarPassword,
          authToken,
        };
        await instance.load(src);
      }
    } catch {
      // 'error' event already set status/errorMsg.
    }
  }

  // ----- React to source changes (reload without recreating the player) -----
  let lastSourceKey = $state('');
  $effect(() => {
    // Track the source-identifying props.
    const key = JSON.stringify([avatarUrl, avatarPassword, authToken, !!avatarData]);
    if (!player) return;
    if (key === lastSourceKey) return;
    lastSourceKey = key;
    void loadSource(player);
  });

  // ----- React to actions changes -----
  $effect(() => {
    const a = actions;
    if (player && a) player.configureActions(a);
  });

  // ----- React to lip-sync changes -----
  $effect(() => {
    if (!player) return;
    player.configureLipsSync(
      lipSyncEnabled,
      lipSyncIntensity,
      lipSyncResponsiveness,
      null,
      lipSyncSustainStyle,
      lipSyncWiggleSpeed
    );
  });

  // ----- React to speed changes -----
  $effect(() => {
    if (player && (idleSpeed != null || talkSpeed != null)) {
      player.setSpeeds(idleSpeed, talkSpeed);
    }
  });

  // ----- postMessage external control -----
  $effect(() => {
    if (!enablePostMessageControl || !player) return;
    const uninstall = installPostMessageControl(buildCommandContext(), {
      origins: postMessageOrigins,
    });
    return uninstall;
  });

  // ----- Wake word (lazy; degrades gracefully without onnxruntime-web) -----
  $effect(() => {
    if (!wakeWordEnabled || !wakeWordModelUrl) return;
    let engine: WakeWordEngineLike | null = null;
    let cancelled = false;
    (async () => {
      try {
        engine = getWakeWordEngine();
        await engine.loadModel?.(wakeWordModelUrl, { wasmPaths: wakeWordWasmPaths });
        if (cancelled) return;
        await engine.startListening({
          threshold: wakeWordThreshold,
          onDetect: (score) => onwake?.(score),
          onError: (e) => console.warn('[ania-avatar-svelte] wake-word error:', e),
        });
      } catch (e) {
        console.warn('[ania-avatar-svelte] wake-word unavailable:', e);
      }
    })();
    return () => {
      cancelled = true;
      void engine?.stopListening();
      void engine?.dispose?.();
    };
  });
</script>

<div
  class={`ania-avatar ${className}`}
  style={`${positionStyle}width:${width}px;height:${height}px;`}
>
  <canvas
    bind:this={canvasEl}
    {width}
    {height}
    style={`display:block;width:100%;height:100%;border-radius:12px;background:${THEME_BG[theme] ?? THEME_BG.dark};`}
  ></canvas>

  {#if status === 'loading'}
    <div class="ania-avatar__overlay">Loading…</div>
  {:else if status === 'error'}
    <div class="ania-avatar__overlay ania-avatar__overlay--error">
      {errorMsg ?? 'Failed to load avatar'}
    </div>
  {/if}

  {#if onclose}
    <button
      type="button"
      class="ania-avatar__close"
      aria-label="Close"
      onclick={() => onclose?.()}
    >×</button>
  {/if}
</div>

<style>
  .ania-avatar {
    display: inline-block;
    position: relative;
    line-height: 0;
  }
  .ania-avatar__overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font: 14px/1.4 system-ui, sans-serif;
    color: #cbd5f5;
    background: rgba(8, 8, 16, 0.6);
    border-radius: 12px;
    pointer-events: none;
  }
  .ania-avatar__overlay--error {
    color: #ff6b9d;
  }
  .ania-avatar__close {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 24px;
    height: 24px;
    line-height: 22px;
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.45);
    color: #fff;
    font-size: 16px;
    cursor: pointer;
  }
</style>
