import type { HookDefinition, HookEventType } from "./hooks.js";

/**
 * Capability flags indicating what a tool adapter supports.
 * Used by the runtime to determine which hooks can be installed.
 */
export type AdapterCapabilities = {
  /** Tool supports native pre-execution hooks (can block). */
  beforeHooks: boolean;
  /** Tool supports native post-execution hooks (observe). */
  afterHooks: boolean;
  /** Tool supports MCP servers (fallback enforcement). */
  mcp: boolean;
  /** Tool supports config file generation. */
  configFile: boolean;
  /** Specific event types this adapter can handle. */
  supportedEvents: HookEventType[];
  /** Events that can be blocked (subset of supportedEvents). */
  blockableEvents: HookEventType[];
};

/**
 * The output format for a tool's native configuration.
 * Each adapter produces this, and the CLI writes it to disk.
 */
export type GeneratedConfig = {
  /** Relative path where the config should be written. */
  path: string;
  /** File content (JSON string, TOML, YAML, etc.). */
  content: string;
  /** File format for display purposes. */
  format: "json" | "toml" | "yaml" | "jsonc" | "js" | "ts";
  /** Whether this file should be gitignored. */
  gitignore?: boolean;
};

/**
 * The adapter interface that every tool-specific package implements.
 *
 * Adapters translate between ai-hooks universal events and the
 * tool's native hook/plugin system.
 */
export interface Adapter {
  /** Unique identifier (e.g., "claude-code", "codex", "gemini-cli"). */
  readonly id: string;

  /** Human-readable tool name. */
  readonly name: string;

  /** Tool version this adapter targets. */
  readonly version: string;

  /** What this adapter can do. */
  readonly capabilities: AdapterCapabilities;

  /**
   * Detect if this tool is installed/available in the current environment.
   */
  detect(): Promise<boolean>;

  /**
   * Generate the tool's native config files from universal hook definitions.
   * Returns one or more files to write to disk.
   */
  generate(hooks: HookDefinition[]): Promise<GeneratedConfig[]>;

  /**
   * Install/apply generated configs to the tool.
   * May copy files, update settings, register MCP servers, etc.
   */
  install(configs: GeneratedConfig[]): Promise<void>;

  /**
   * Remove all ai-hooks configuration from this tool.
   */
  uninstall(): Promise<void>;

  /**
   * Map a universal event type to the tool's native event name(s).
   */
  mapEvent(event: HookEventType): string[];

  /**
   * Map a tool's native event name back to universal event type(s).
   */
  mapNativeEvent(nativeEvent: string): HookEventType[];
}

/**
 * Factory function signature for creating an adapter.
 */
export type AdapterFactory = (options?: Record<string, unknown>) => Adapter;
