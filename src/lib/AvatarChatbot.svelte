<script lang="ts">
  // ===========================================================================
  // <AvatarChatbot> — <AniaAvatar> + a minimal chat input that POSTs to a
  // webhook (n8n-style) and speaks the reply via the avatar's TTS.
  // ===========================================================================
  import AniaAvatar from './AniaAvatar.svelte';
  import type { AniaAvatarProps, AniaAvatarHandle } from './types';

  interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
  }

  interface AvatarChatbotProps extends AniaAvatarProps {
    /** Placeholder text for the chat input. */
    placeholder?: string;
    /** Assistant display name. */
    assistantName?: string;
  }

  let {
    placeholder = 'Type a message…',
    assistantName = 'Ania',
    webhookUrl,
    webhookApiKey,
    webhookHeaders,
    ...avatarProps
  }: AvatarChatbotProps = $props();

  let avatar = $state<AniaAvatar | null>(null);
  let input = $state('');
  let busy = $state(false);
  let messages = $state<ChatMessage[]>([]);

  function getHandle(): AniaAvatarHandle | null {
    // Svelte 5: component instances expose exported functions directly.
    return (avatar as unknown as { getHandle?: () => AniaAvatarHandle })?.getHandle?.() ?? null;
  }

  async function send(): Promise<void> {
    const text = input.trim();
    if (!text || busy) return;
    input = '';
    messages = [...messages, { role: 'user', content: text }];

    if (!webhookUrl) {
      // No webhook -> just speak the echo locally.
      getHandle()?.runCommand(`tts ${text}`);
      return;
    }

    busy = true;
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
      if (reply) {
        messages = [...messages, { role: 'assistant', content: String(reply) }];
        getHandle()?.runCommand(`tts ${reply}`);
      }
    } catch (e) {
      messages = [...messages, { role: 'assistant', content: 'Sorry, something went wrong.' }];
      console.warn('[ania-avatar-svelte] chatbot send failed:', e);
    } finally {
      busy = false;
    }
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }
</script>

<div class="ania-chatbot">
  <AniaAvatar
    bind:this={avatar}
    {...avatarProps}
    {webhookUrl}
    {webhookApiKey}
    {webhookHeaders}
  />

  {#if messages.length}
    <ul class="ania-chatbot__log">
      {#each messages as m (m)}
        <li class={`ania-chatbot__msg ania-chatbot__msg--${m.role}`}>
          <strong>{m.role === 'user' ? 'You' : assistantName}:</strong>
          {m.content}
        </li>
      {/each}
    </ul>
  {/if}

  <div class="ania-chatbot__bar">
    <input
      class="ania-chatbot__input"
      type="text"
      {placeholder}
      bind:value={input}
      onkeydown={onKey}
      disabled={busy}
    />
    <button class="ania-chatbot__send" type="button" onclick={() => void send()} disabled={busy}>
      {busy ? '…' : 'Send'}
    </button>
  </div>
</div>

<style>
  .ania-chatbot {
    display: inline-flex;
    flex-direction: column;
    gap: 8px;
    font: 14px/1.4 system-ui, sans-serif;
  }
  .ania-chatbot__log {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 160px;
    overflow-y: auto;
  }
  .ania-chatbot__msg {
    margin: 2px 0;
    color: #cbd5f5;
  }
  .ania-chatbot__msg--user {
    color: #a855f7;
  }
  .ania-chatbot__bar {
    display: flex;
    gap: 6px;
  }
  .ania-chatbot__input {
    flex: 1;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid #2a2a45;
    background: #12121f;
    color: #fff;
  }
  .ania-chatbot__send {
    padding: 8px 14px;
    border-radius: 8px;
    border: none;
    background: #a855f7;
    color: #fff;
    cursor: pointer;
  }
  .ania-chatbot__send:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
