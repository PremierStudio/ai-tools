# Contributing to ai-hooks

## Development setup

**Requirements:** Node >= 22, npm >= 10

```bash
git clone https://github.com/PremierStudio/ai-hooks.git
cd ai-hooks
npm install
```

## Commands

```bash
npm run check       # lint + format + typecheck + test (run before every PR)
npm run test        # vitest
npm run lint        # oxlint
npm run fmt         # oxfmt
npm run typecheck   # tsc across all packages
npm run build       # tsup build for all packages
```

## Project structure

```
packages/
  core/              # Engine, types, built-in hooks, config loader
  cli/               # CLI commands (init, detect, generate, install, ...)
  adapter-*/         # Provider-specific adapters (9 total)
  preset-*/          # Opinionated hook presets
```

## Code conventions

- TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`)
- No `any` types — use explicit type casts
- No `_variable` prefixed unused params — use `void variable` instead
- No `TODO`, `FIXME`, or `HACK` comments
- ESM only (`"type": "module"`)
- Tests use vitest with globals enabled

## Adding a new adapter

This is the most common contribution. Each adapter translates ai-hooks' universal event model into a specific tool's native hook format.

### 1. Determine the tool's hook capabilities

Before writing code, answer these questions:

| Question | Determines |
|----------|-----------|
| Does the tool have a native hook/plugin system? | `beforeHooks`, `afterHooks`, `configFile` |
| Can hooks block actions (exit code, JSON response)? | `blockableEvents` |
| Does the tool support MCP? | `mcp` capability |
| What events does the tool expose natively? | `supportedEvents`, event map |
| Where do config files go? | `generate()` output paths |
| How does the tool discover hooks? | Config format (JSON, YAML, JS) |

**Native hooks** = the tool runs your script at specific lifecycle points (like Claude Code's `settings.json` hooks). All adapters in this project target tools with native hook support.

### 2. Create the package

```bash
mkdir -p packages/adapter-{name}/src
```

Create these files (copy from an existing adapter as template):

- `package.json` — use `@premierstudio/adapter-{name}` as the name
- `tsconfig.json` — extends `../../tsconfig.base.json`
- `tsup.config.ts` — standard ESM + DTS build

**For native hook adapters**, use `adapter-claude-code` as your template.

### 3. Implement the adapter

```ts
// packages/adapter-{name}/src/index.ts
import { BaseAdapter, registry } from "ai-hooks/adapters";
import type { Adapter, AdapterCapabilities, GeneratedConfig, HookDefinition, HookEventType } from "ai-hooks";

const EVENT_MAP: Record<HookEventType, string[]> = {
  // Map each universal event to the tool's native event name(s)
  "session:start": ["NativeSessionStart"],
  "shell:before":  ["NativeBeforeShell"],
  // ... map all 15 event types (empty array for unsupported)
};

const REVERSE_MAP: Record<string, HookEventType[]> = {
  // Reverse of EVENT_MAP — native event -> universal event(s)
  "NativeSessionStart": ["session:start"],
  "NativeBeforeShell":  ["shell:before"],
};

class MyToolAdapter extends BaseAdapter implements Adapter {
  id = "my-tool";
  name = "My Tool";
  version = "1.0";

  capabilities: AdapterCapabilities = {
    beforeHooks: true,       // Can run hooks before actions?
    afterHooks: true,        // Can run hooks after actions?
    mcp: false,              // Supports MCP?
    configFile: true,        // Generates config files?
    supportedEvents: [...],  // Which universal events are supported
    blockableEvents: [...],  // Which events can block execution
  };

  async detect(): Promise<boolean> {
    // Check if the tool is installed (command exists, config dir exists, etc.)
    return await this.commandExists("my-tool") || this.existsSync(".my-tool/");
  }

  mapEvent(event: HookEventType): string[] {
    return EVENT_MAP[event] ?? [];
  }

  mapNativeEvent(nativeEvent: string): HookEventType[] {
    return REVERSE_MAP[nativeEvent] ?? [];
  }

  async generate(hooks: HookDefinition[]): Promise<GeneratedConfig[]> {
    // Generate the tool's native config files
    // Return array of { path, content, isGitignored } objects
  }
}

const adapter = new MyToolAdapter();
registry.register(adapter);
export default adapter;
```

### 4. Write tests

Create `packages/adapter-{name}/src/index.test.ts`. Every adapter test should cover:

- **Metadata**: `id`, `name`, `version`
- **Capabilities**: all flags, `supportedEvents`, `blockableEvents`
- **mapEvent**: every entry in EVENT_MAP + unknown events returning `[]`
- **mapNativeEvent**: every entry in REVERSE_MAP + unknown events returning `[]`
- **generate**: file paths, content format, deduplication, empty hooks, multi-event hooks
- **detect**: both found and not-found paths

Use an existing adapter test as your template. Target 100% coverage.

### 5. Register in the CLI

Add the import to `packages/cli/src/index.ts` so the CLI discovers the adapter:

```ts
import "@premierstudio/adapter-{name}";
```

### 6. Verify

```bash
npm run check   # must pass with 0 errors, 0 warnings
```

## Adding a preset

Presets are opinionated collections of hooks for specific workflows. See `packages/preset-plannable` for the pattern.

A preset exports a factory function that returns `{ hooks: HookDefinition[] }` with optional configuration.

## Pull request checklist

- [ ] `npm run check` passes (lint + format + typecheck + test)
- [ ] New adapter has 100% test coverage
- [ ] README updated with the new tool in the supported tools table
- [ ] No unrelated changes included

## Reporting issues

Include:

- Tool name and version
- ai-hooks config snippet
- Generated config artifacts (if applicable)
- Expected vs actual behavior
- Steps to reproduce
