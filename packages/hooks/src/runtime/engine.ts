import type {
  HookDefinition,
  HookContext,
  HookResult,
  HookEvent,
  HookEventType,
  AiHooksConfig,
  ConfigSettings,
} from "../types/index.js";
import { isBeforeEvent } from "../types/index.js";
import { executeChain } from "./chain.js";

const DEFAULT_SETTINGS: Required<ConfigSettings> = {
  cwd: process.cwd(),
  logLevel: "warn",
  hookTimeout: 5000,
  failMode: "open",
  telemetry: false,
};

/**
 * The ai-hooks runtime engine.
 *
 * Manages hook registration, event dispatch, and chain execution.
 * This is the core orchestrator - adapters feed events into this engine,
 * and it runs the appropriate hook chains.
 */
export class HookEngine {
  private hooks: Map<HookEventType, HookDefinition[]> = new Map();
  private settings: Required<ConfigSettings>;

  constructor(config?: AiHooksConfig) {
    this.settings = { ...DEFAULT_SETTINGS, ...config?.settings };

    if (config) {
      // Apply presets first (in order)
      if (config.extends) {
        for (const preset of config.extends) {
          this.registerAll(preset.hooks);
        }
      }
      // Then apply local hooks (override presets)
      this.registerAll(config.hooks);
    }
  }

  /**
   * Register a single hook definition.
   */
  register(hook: HookDefinition): void {
    for (const event of hook.events) {
      const existing = this.hooks.get(event) ?? [];
      existing.push(hook);
      this.hooks.set(event, existing);
    }
  }

  /**
   * Register multiple hook definitions.
   */
  registerAll(hooks: HookDefinition[]): void {
    for (const hook of hooks) {
      this.register(hook);
    }
  }

  /**
   * Unregister a hook by ID.
   */
  unregister(hookId: string): void {
    for (const [event, hooks] of this.hooks) {
      const filtered = hooks.filter((h) => h.id !== hookId);
      if (filtered.length === 0) {
        this.hooks.delete(event);
      } else {
        this.hooks.set(event, filtered);
      }
    }
  }

  /**
   * Emit an event and run the matching hook chain.
   *
   * For "before" events: returns results that may include blocks.
   * For "after" events: returns observation results (no blocking).
   */
  async emit(event: HookEvent, toolInfo: { name: string; version: string }): Promise<HookResult[]> {
    const eventType = event.type as HookEventType;
    const phase = isBeforeEvent(event) ? "before" : "after";

    const allHooks = this.hooks.get(eventType) ?? [];
    const phaseHooks = allHooks.filter((h) => h.phase === phase);

    if (phaseHooks.length === 0) {
      return [];
    }

    const ctx: HookContext = {
      event,
      tool: toolInfo,
      cwd: this.settings.cwd,
      state: new Map(),
      results: [],
      startedAt: Date.now(),
    };

    try {
      return await executeChain(phaseHooks, ctx, this.settings.hookTimeout);
    } catch (error) {
      if (this.settings.failMode === "open") {
        this.log("error", `Hook chain error (fail-open): ${error}`);
        return [];
      }
      // fail-closed: treat as blocked
      return [
        {
          blocked: true,
          reason: `Hook chain error (fail-closed): ${error}`,
        },
      ];
    }
  }

  /**
   * Check if an event is blocked by running before hooks.
   * Convenience wrapper around emit().
   */
  async isBlocked(
    event: HookEvent,
    toolInfo: { name: string; version: string },
  ): Promise<{ blocked: boolean; reason?: string }> {
    if (!isBeforeEvent(event)) {
      return { blocked: false };
    }

    const results = await this.emit(event, toolInfo);
    const blockResult = results.find((r) => r.blocked);

    return blockResult ? { blocked: true, reason: blockResult.reason } : { blocked: false };
  }

  /**
   * Get all registered hooks, optionally filtered by event type.
   */
  getHooks(eventType?: HookEventType): HookDefinition[] {
    if (eventType) {
      return this.hooks.get(eventType) ?? [];
    }
    const all: HookDefinition[] = [];
    const seen = new Set<string>();
    for (const hooks of this.hooks.values()) {
      for (const hook of hooks) {
        if (!seen.has(hook.id)) {
          seen.add(hook.id);
          all.push(hook);
        }
      }
    }
    return all;
  }

  /**
   * Get current engine settings.
   */
  getSettings(): Required<ConfigSettings> {
    return { ...this.settings };
  }

  private log(level: "error" | "warn" | "info" | "debug", message: string): void {
    const levels = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };
    const threshold = levels[this.settings.logLevel];
    const messageLevel = levels[level];

    if (messageLevel <= threshold) {
      const prefix = `[ai-hooks:${level}]`;
      if (level === "error") {
        console.error(prefix, message);
      } else if (level === "warn") {
        console.warn(prefix, message);
      } else {
        console.log(prefix, message);
      }
    }
  }
}
