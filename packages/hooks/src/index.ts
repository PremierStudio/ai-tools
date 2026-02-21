// ── Public API ────────────────────────────────────────────────
// The main entry point for ai-hooks.
//
// Usage:
//   import { defineConfig, hook, HookEngine } from "@premierstudio/ai-hooks";

// Config helpers (used in ai-hooks.config.ts)
export { defineConfig, hook } from "./config/index.js";
export { loadConfig, findConfigFile } from "./config/index.js";

// Runtime engine
export { HookEngine } from "./runtime/index.js";
export { executeChain, HookTimeoutError } from "./runtime/index.js";

// Adapter system
export { registry } from "./adapters/index.js";
export { BaseAdapter } from "./adapters/index.js";

// Built-in hooks
export {
  blockDangerousCommands,
  scanSecrets,
  protectGitignored,
  auditShellCommands,
  builtinHooks,
} from "./hooks/index.js";

// Types (re-export everything)
export type {
  // Events
  SessionStartEvent,
  SessionEndEvent,
  PromptSubmitEvent,
  PromptResponseEvent,
  ToolCallEvent,
  ToolResultEvent,
  FileReadEvent,
  FileWriteEvent,
  FileEditEvent,
  FileDeleteEvent,
  ShellBeforeEvent,
  ShellAfterEvent,
  McpCallEvent,
  McpResultEvent,
  NotificationEvent,
  BeforeEvent,
  AfterEvent,
  HookEvent,
  HookEventType,
  EventOf,
  // Hooks
  HookResult,
  HookContext,
  BeforeHookFn,
  AfterHookFn,
  HookDefinition,
  // Adapter
  AdapterCapabilities,
  GeneratedConfig,
  Adapter,
  AdapterFactory,
  // Config
  AiHooksConfig,
  ConfigSettings,
} from "./types/index.js";
export { isBeforeEvent } from "./types/index.js";
