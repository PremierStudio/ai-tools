import type { HookDefinition } from "./hooks.js";
import type { Adapter } from "./adapter.js";

/**
 * Top-level ai-hooks configuration.
 * Used in `ai-hooks.config.ts` via `defineConfig()`.
 */
export type AiHooksConfig = {
  /** Hooks to install across all configured tools. */
  hooks: HookDefinition[];
  /** Tool adapters to target. If empty, auto-detects installed tools. */
  adapters?: Adapter[];
  /** Global settings. */
  settings?: ConfigSettings;
  /** Presets to extend (merged before local hooks). */
  extends?: AiHooksConfig[];
};

export type ConfigSettings = {
  /** Working directory override. Default: process.cwd(). */
  cwd?: string;
  /** Log level for hook execution. */
  logLevel?: "silent" | "error" | "warn" | "info" | "debug";
  /** Timeout for individual hook execution (ms). Default: 5000. */
  hookTimeout?: number;
  /** Whether to fail open (continue) or fail closed (block) on hook errors. */
  failMode?: "open" | "closed";
  /** Enable telemetry. Default: false. */
  telemetry?: boolean;
};
