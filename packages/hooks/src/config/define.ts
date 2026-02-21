import type {
  AiHooksConfig,
  HookDefinition,
  HookEventType,
  HookContext,
  EventOf,
} from "../types/index.js";

/**
 * Define an ai-hooks configuration.
 * Use this as the default export of your `ai-hooks.config.ts`.
 *
 * @example
 * ```ts
 * import { defineConfig, hook } from "@premierstudio/ai-hooks";
 *
 * export default defineConfig({
 *   hooks: [
 *     hook("before", ["shell:before"], async (ctx, next) => {
 *       if (ctx.event.command.includes("rm -rf /")) {
 *         ctx.results.push({ blocked: true, reason: "Dangerous command" });
 *         return;
 *       }
 *       await next();
 *     }).id("block-dangerous").name("Block Dangerous Commands").build(),
 *   ],
 * });
 * ```
 */
export function defineConfig(config: AiHooksConfig): AiHooksConfig {
  return config;
}

/**
 * Fluent builder for creating hook definitions.
 * The generic parameter provides type-safe access to event properties
 * inside the handler, while the output is a non-generic HookDefinition
 * for collection compatibility.
 *
 * @example
 * ```ts
 * hook("before", ["file:write", "file:edit"], async (ctx, next) => {
 *   // validate file changes
 *   await next();
 * })
 *   .id("validate-writes")
 *   .name("Validate File Writes")
 *   .priority(10)
 *   .build()
 * ```
 */
export function hook<T extends HookEventType>(
  phase: "before",
  events: T[],
  handler: (ctx: HookContext<T>, next: () => Promise<void>) => Promise<void> | void,
): HookBuilderChain<T>;
export function hook<T extends HookEventType>(
  phase: "after",
  events: T[],
  handler: (ctx: HookContext<T>, next: () => Promise<void>) => Promise<void> | void,
): HookBuilderChain<T>;
export function hook<T extends HookEventType>(
  phase: "before" | "after",
  events: T[],
  handler: (ctx: HookContext<T>, next: () => Promise<void>) => Promise<void> | void,
): HookBuilderChain<T> {
  return new HookBuilderChain(phase, events, handler);
}

class HookBuilderChain<T extends HookEventType> {
  private _id: string;
  private _name: string;
  private _description?: string;
  private _priority?: number;
  private _filter?: (event: EventOf<T>) => boolean;
  private _enabled?: boolean;

  constructor(
    private phase: "before" | "after",
    private events: T[],
    private handler: (ctx: HookContext<T>, next: () => Promise<void>) => Promise<void> | void,
  ) {
    this._id = `hook-${events.join("-")}-${Date.now()}`;
    this._name = `Hook for ${events.join(", ")}`;
  }

  id(id: string): this {
    this._id = id;
    return this;
  }

  name(name: string): this {
    this._name = name;
    return this;
  }

  description(desc: string): this {
    this._description = desc;
    return this;
  }

  priority(p: number): this {
    this._priority = p;
    return this;
  }

  filter(fn: (event: EventOf<T>) => boolean): this {
    this._filter = fn;
    return this;
  }

  enabled(e: boolean): this {
    this._enabled = e;
    return this;
  }

  build(): HookDefinition {
    // The handler/filter are widened from their narrow generic types to
    // the base HookContext/HookEvent types. This is runtime-safe because
    // the handler only accesses properties of the specific event type
    // it was designed for, which are always present on the actual event.
    return {
      id: this._id,
      name: this._name,
      description: this._description,
      events: this.events,
      handler: this.handler as unknown as HookDefinition["handler"],
      phase: this.phase,
      priority: this._priority,
      filter: this._filter as unknown as HookDefinition["filter"],
      enabled: this._enabled,
    };
  }
}
