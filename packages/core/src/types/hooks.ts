import type { HookEvent, HookEventType, EventOf, BeforeEvent } from "./events.js";

// Re-export for direct import paths
export type { HookEventType } from "./events.js";

/**
 * Result of a "before" hook. Controls whether the event proceeds.
 */
export type HookResult = {
  /** If true, the event is blocked and won't proceed to the tool. */
  blocked?: boolean;
  /** Reason for blocking (shown to the user/tool). */
  reason?: string;
  /** Modified event data to pass forward (mutation). */
  mutated?: Partial<HookEvent>;
  /** Arbitrary data to attach to the hook context. */
  data?: Record<string, unknown>;
};

/**
 * The context object passed to every hook function.
 * Inspired by Express.js req/res pattern but adapted for AI tools.
 */
export type HookContext<T extends HookEventType = HookEventType> = {
  /** The event that triggered this hook. */
  event: EventOf<T>;
  /** The AI tool that emitted this event. */
  tool: {
    name: string;
    version: string;
  };
  /** Working directory where the tool is running. */
  cwd: string;
  /** Shared state bag for passing data between hooks in a chain. */
  state: Map<string, unknown>;
  /** Accumulated results from previous hooks in the chain. */
  results: HookResult[];
  /** Timestamp of when the hook chain started. */
  startedAt: number;
};

/**
 * A "before" hook function. Runs before the event is processed.
 * Can block, mutate, or pass through.
 */
export type BeforeHookFn<T extends HookEventType = HookEventType> = (
  ctx: HookContext<T>,
  next: () => Promise<void>,
) => Promise<void> | void;

/**
 * An "after" hook function. Runs after the event is processed.
 * Cannot block (event already happened), but can observe and react.
 */
export type AfterHookFn<T extends HookEventType = HookEventType> = (
  ctx: HookContext<T>,
  next: () => Promise<void>,
) => Promise<void> | void;

/**
 * A hook definition with metadata.
 *
 * The generic parameter provides type safety when creating hooks
 * for specific events. For collections/storage, use the non-generic
 * default which accepts any event type.
 */
export type HookDefinition = {
  /** Unique identifier for this hook. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Description of what this hook does. */
  description?: string;
  /** Which event types this hook listens to. */
  events: HookEventType[];
  /** The hook function. Takes the widest context; narrowing happens at creation time via hook(). */
  handler: (ctx: HookContext, next: () => Promise<void>) => Promise<void> | void;
  /** Priority (lower = runs first). Default: 100. */
  priority?: number;
  /** Whether this hook runs "before" or "after" the event. */
  phase: "before" | "after";
  /** Optional filter to narrow when this hook runs. */
  filter?: (event: HookEvent) => boolean;
  /** Whether this hook is enabled. Default: true. */
  enabled?: boolean;
};

/**
 * Type guard: is this a "before" event type?
 */
export function isBeforeEvent(event: HookEvent): event is BeforeEvent {
  return (
    event.type === "session:start" ||
    event.type === "prompt:submit" ||
    event.type === "tool:before" ||
    event.type === "file:write" ||
    event.type === "file:edit" ||
    event.type === "file:delete" ||
    event.type === "shell:before" ||
    event.type === "mcp:before"
  );
}
