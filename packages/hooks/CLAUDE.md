# packages/hooks

Core engine package. Most complex package in the monorepo — the only one with a runtime execution engine.

## Event System

15 universal event types defined in `src/types/events.ts`. Each has a phase:

- **Before events** (blockable): `session:start`, `prompt:submit`, `tool:before`, `file:read`, `file:write`, `file:edit`, `file:delete`, `shell:before`, `mcp:before`
- **After events** (observe-only): `session:end`, `prompt:response`, `tool:after`, `shell:after`, `mcp:after`, `notification`

Adapters map these to tool-native events via `EVENT_MAP` (universal → native) and `REVERSE_MAP` (native → universal). Both maps live as module-level constants in each adapter file.

## Chain Execution (`runtime/chain.ts`)

`executeChain(hooks, ctx, settings)` runs hooks in Express.js middleware style:

1. Sorts by priority (lower number = runs first, default 100)
2. Each hook receives `next()` — not calling it stops the chain
3. Skips hooks where `enabled === false` or `filter()` returns false
4. Stops processing before-phase hooks after a block (`ctx.results.blocked = true`)
5. Each hook wrapped in `Promise.race()` against timeout — timeout rejects with `HookTimeoutError`
6. All results accumulate in `ctx.results[]`

## HookEngine (`runtime/engine.ts`)

Stores hooks in `Map<HookEventType, HookDefinition[]>`. Key methods:

- `register(hook)` / `registerAll(hooks)` — adds to event-type buckets
- `emit(event, toolInfo)` — creates `HookContext`, calls `executeChain()`, returns results
- `isBlocked(event, toolInfo)` — convenience: emits and checks if any result blocked

Settings: `hookTimeout` (default 5000ms), `failMode` ("open" = swallow errors, "closed" = block on error), `logLevel`.

## Adapter Implementation

Each adapter in `src/adapters/` follows this pattern:

1. Define `EVENT_MAP: Record<HookEventType, string[]>` — maps each of the 15 events to native event names (empty array if unsupported)
2. Define `REVERSE_MAP: Record<string, HookEventType[]>` — inverse mapping
3. Extend `BaseAdapter`, set `id`, `name`, `version`, `capabilities`
4. Implement `detect()` — use `this.commandExists()` or `this.existsSync()` from base class
5. Implement `generate(hooks)` — return `GeneratedConfig[]` with `{ path, content }`
6. Instantiate and call `registry.register(adapter)`

The `capabilities` object declares: `beforeHooks`, `afterHooks`, `mcp`, `configFile`, `supportedEvents[]`, `blockableEvents[]`.

Use `claude-code.ts` as the reference adapter — it's the most complete, generating both a runner script and settings.json modifications.

## Config & Builder (`config/`)

- `defineConfig(config)` — type-safe wrapper, returns config as-is
- `hook()` — fluent builder: `hook().id("x").name("X").on("shell:before").do(handler).build()`
- `loadConfig()` — searches for `ai-hooks.config.{ts,js,mts,mjs}`, dynamically imports it
- Config supports `extends: [preset]` for composing hook collections

## Built-in Hooks (`hooks/builtin.ts`)

Four security hooks with escalating priority:

1. `block-dangerous-commands` (priority 1) — blocks `rm -rf /`, `mkfs`, `dd`, fork bombs, `DROP DATABASE`, etc.
2. `scan-secrets` (priority 2) — detects API keys, tokens, private keys in content
3. `protect-sensitive-files` (priority 3) — blocks writes to `.env`, credentials, SSH keys
4. `audit-shell` (priority 100) — records command, exit code, duration (after-phase, observe-only)

## Registry (`adapters/registry.ts`)

Uses `globalThis` singleton pattern to survive module duplication (multiple copies of the package loaded). All adapters register on import. Import `adapters/all.ts` to register every adapter at once.
