<script lang="ts">
  import { AniaAvatar } from '../src/lib/index';

  let avatarUrl = $state('');
  let talking = $state(false);
</script>

<main>
  <h1>ania-avatar-svelte</h1>
  <p>Paste a public <code>.ania</code> URL (market/unencrypted) to load it.</p>

  <input
    type="text"
    placeholder="https://example.com/avatar.ania"
    bind:value={avatarUrl}
    style="width:380px;max-width:80vw;padding:8px;border-radius:8px;border:1px solid #333;background:#12121f;color:#fff;"
  />

  <div style="margin-top:24px;">
    <AniaAvatar
      {avatarUrl}
      width={320}
      height={320}
      theme="dark"
      lipSyncEnabled
      ontalkstart={() => (talking = true)}
      ontalkend={() => (talking = false)}
      onload={() => console.log('avatar loaded')}
    />
  </div>

  <p style="opacity:0.7;">State: {talking ? 'talking' : 'idle'}</p>
</main>

<style>
  main {
    text-align: center;
    padding: 32px;
  }
  h1 {
    color: #a855f7;
  }
</style>
