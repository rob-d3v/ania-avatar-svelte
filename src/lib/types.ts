// ===========================================================================
// ania-avatar-svelte — public prop / event types
//
// Mirrors ania-avatar-react / ania-avatar-vue so consumers across the ecosystem
// see the same prop names. The wrapper binds these to the framework-agnostic
// `ania-avatar-core` engine (createAniaPlayer).
// ===========================================================================

import type {
  ActionConfig,
  AniaAvatarData,
  AniaPlayerInstance,
  CommandContext,
  CommandResult,
  LipSyncSustainStyle,
  PlayerPosition,
  STTProvider,
  TTSProvider,
} from 'ania-avatar-core';

export type {
  ActionConfig,
  ActionInfo,
  AniaAvatarData,
  AniaPlayerInstance,
  CommandContext,
  CommandResult,
  LipSyncSustainStyle,
  PlayerPosition,
  STTProvider,
  TTSProvider,
} from 'ania-avatar-core';

/** Theme presets for the optional chrome (frame/background tint). */
export type AniaAvatarTheme = 'dark' | 'light' | 'blue' | 'purple';

/**
 * Props for `<AniaAvatar>`. Snake-cased ecosystem prop names are preserved.
 * Event callbacks use Svelte 5 lowercase `on*` prop conventions
 * (`onload`, `ontalkstart`, ...).
 */
export interface AniaAvatarProps {
  // ----- Source -----
  /** URL to a `.ania` file (market or personal). */
  avatarUrl?: string;
  /** Password for an encrypted (personal) `.ania` file. */
  avatarPassword?: string;
  /** Already-decrypted avatar payload (skips download + decrypt). */
  avatarData?: AniaAvatarData;
  /** Bearer token sent as `Authorization` when downloading `avatarUrl`. */
  authToken?: string;

  // ----- Layout -----
  /** Visual anchor (applies fixed positioning + corner offset). */
  position?: PlayerPosition;
  /** Canvas pixel width. Default 320. */
  width?: number;
  /** Canvas pixel height. Default 320. */
  height?: number;
  /** Theme preset for the optional chrome. Default 'dark'. */
  theme?: AniaAvatarTheme;
  /** Extra class applied to the root element. */
  class?: string;

  // ----- Animation speeds -----
  idleSpeed?: number;
  talkSpeed?: number;
  /** Auto-derive idle/talk speeds from the avatar fps. */
  autoCalculateSpeed?: boolean;

  // ----- Lip sync -----
  lipSyncEnabled?: boolean;
  /** Base server URL for fetching lip-sync / actions config by contentHash. */
  lipSyncServerUrl?: string;
  /** 0..1 openness boost. */
  lipSyncIntensity?: number;
  /** 0.05..1 envelope smoothing (higher = snappier). */
  lipSyncResponsiveness?: number;
  /** Sustain shaping while a vowel is held. */
  lipSyncSustainStyle?: LipSyncSustainStyle;
  /** 1..6 wiggle oscillation speed for held vowels. */
  lipSyncWiggleSpeed?: number;

  // ----- Actions -----
  actions?: ActionConfig[];
  /** Action id to trigger right after load. */
  initialAction?: string;

  // ----- Wake word -----
  wakeWordEnabled?: boolean;
  /** URL to the openWakeWord ONNX model. Required when wakeWordEnabled. */
  wakeWordModelUrl?: string;
  /** Detection threshold 0..1. Default 0.5. */
  wakeWordThreshold?: number;
  /** Path the onnxruntime-web .wasm files are served from. */
  wakeWordWasmPaths?: string;

  // ----- TTS (used by the imperative `speak` helper) -----
  ttsProvider?: TTSProvider;
  ttsApiKey?: string;
  ttsApiUrl?: string;
  ttsVoice?: string;
  ttsVoiceId?: string;
  ttsModel?: string;
  ttsLang?: string;
  ttsGender?: 'auto' | 'male' | 'female';
  ttsRate?: number;
  ttsPitch?: number;
  /** Azure region (e.g. 'brazilsouth'). */
  ttsRegion?: string;
  /** Piper on-device ONNX model URL. */
  piperModelUrl?: string;
  piperModelConfigUrl?: string;
  piperSpeakerId?: number;

  // ----- STT -----
  sttProvider?: STTProvider;
  sttLang?: string;
  sttContinuous?: boolean;
  sttInterimResults?: boolean;
  sttApiKey?: string;
  sttApiUrl?: string;

  // ----- Webhook (used by `<AvatarChatbot>` / runCommand `ask`) -----
  webhookUrl?: string;
  webhookApiKey?: string;
  webhookHeaders?: Record<string, string>;

  // ----- External control -----
  /** Install an origin-allowlisted window.postMessage command listener. */
  enablePostMessageControl?: boolean;
  /** Allowed origins for postMessage control. Use ['*'] to allow all (unsafe). */
  postMessageOrigins?: string[];

  // ----- Events (Svelte 5 callback props) -----
  /** Fired once the avatar data is loaded. Receives the player instance. */
  onload?: (player: AniaPlayerInstance) => void;
  /** Fired when the avatar enters the talking state. */
  ontalkstart?: () => void;
  /** Fired when the avatar leaves the talking state. */
  ontalkend?: () => void;
  /** Fired when an action starts. Receives the action id. */
  onactionstart?: (actionId: string) => void;
  /** Fired when an action ends/cancels. Receives the action id. */
  onactionend?: (actionId: string) => void;
  /** Fired when the wake word is detected. */
  onwake?: (score?: number) => void;
  /** Fired on a load/runtime error. */
  onerror?: (error: Error) => void;
  /** Fired when the user dismisses the avatar (only if chrome `closable`). */
  onclose?: () => void;
}

/**
 * Imperative handle bound via `bind:this` on `<AniaAvatar>`. Lets a host drive
 * the avatar directly (play/pause/talk/actions/lip-sync) and run desktop-style
 * command lines.
 */
export interface AniaAvatarHandle {
  /** The live player instance (null until loaded). */
  getPlayer(): AniaPlayerInstance | null;
  play(): void;
  pause(): void;
  setTalking(talking: boolean): void;
  triggerAction(id: string): boolean;
  cancelAction(force?: boolean): void;
  /** Run a desktop-style command line against the avatar. */
  runCommand(line: string, extraCtx?: Partial<CommandContext>): CommandResult;
}
