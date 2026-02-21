# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Universal hook engine and configuration management for AI coding tools. Monorepo (`@premierstudio/*`) providing a unified event/hook system that translates to 9+ AI tool-specific formats (Claude Code, Codex, Cursor, Gemini CLI, Kiro, OpenCode, Cline, Factory Droid, Amp).

## Commands

```bash
npm run check          # Full verification: lint + format + typecheck + test (run before PRs)
npm run build          # Build all packages (turbo)
npm test               # Run all tests (vitest)
npx vitest run packages/hooks   # Run tests for a single package
npx vitest run packages/hooks/src/adapters/claude-code.test.ts  # Single test file
npm run test:watch     # Watch mode
npm run lint           # oxlint
npm run lint:fix       # oxlint --fix
npm run fmt            # oxfmt (auto-format)
npm run fmt:check      # Check formatting
npm run typecheck      # tsc across all packages (turbo)
```

## Architecture

### Monorepo Structure

Six packages managed by npm workspaces + Turborepo:

| Package | npm name | Purpose |
|---------|----------|---------|
| `packages/hooks` | `@premierstudio/ai-hooks` | Core engine: hook engine, adapters, config loader, built-in hooks |
| `packages/mcp` | `@premierstudio/ai-mcp` | MCP server configuration management |
| `packages/agents` | `@premierstudio/ai-agents` | Agent configuration for AI tools |
| `packages/skills` | `@premierstudio/ai-skills` | Skills/prompts configuration |
| `packages/rules` | `@premierstudio/ai-rules` | Project rules configuration |
| `packages/cli` | `@premierstudio/ai-tools` | Unified CLI routing to all engines |

The `cli` package depends on all others. The other five packages are independent of each other.

### Repeated Package Pattern

Each engine package (hooks, mcp, agents, skills, rules) follows the same internal layout:

- `src/adapters/` — Tool-specific implementations (one per AI tool) + `base.ts` base class + `registry.ts` global registry
- `src/config/` — `defineConfig()` helper and `loadConfig()` dynamic importer
- `src/cli/` — Package-specific CLI commands with `bin.ts` entry point
- `src/types/` — TypeScript type definitions
- `src/index.ts` — Public API barrel export

### Hook Engine (packages/hooks) — the most complex package

Express.js-style middleware chain. For runtime internals, event mapping, and adapter implementation details, see `packages/hooks/CLAUDE.md`.

- **HookEngine** (`runtime/engine.ts`): Central orchestrator. Registers hooks, dispatches events via `emit()`.
- **Chain execution** (`runtime/chain.ts`): Hooks sorted by priority (lower = first), `next()` middleware pattern. Stops on block. Enforces per-hook timeouts.
- **15 universal events** (`types/events.ts`): session:start/end, prompt:submit/response, tool:before/after, file:read/write/edit/delete, shell:before/after, mcp:before/after, notification. Before events are blockable; after events are observe-only.
- **Built-in hooks** (`hooks/builtin.ts`): block-dangerous-commands, scan-secrets, protect-sensitive-files, audit-shell.

### Adapter System (shared across all engine packages)

Each adapter extends its package's `BaseAdapter` and self-registers into a global registry on import. Importing `adapters/all.ts` registers all adapters for that engine. The hooks package has the most complex adapters (event mapping, blocking); other packages have simpler adapters (config file generation only).

### Config System

Each engine has a `defineConfig()` helper (exception: rules uses `defineRulesConfig()`). The hooks package additionally has a `hook()` fluent builder, `loadConfig()` dynamic importer, and preset composition via `extends`. Other engines have trivial config helpers that pass through the object.

### Simpler Engine Packages (mcp, agents, skills, rules)

All follow the same adapter-registry-CLI pattern as hooks but without the runtime engine. Each package's CLAUDE.md documents what's unique:

- **mcp**: Transport types (stdio/SSE), server definitions, import/sync across tools
- **agents**: Reusable `createMarkdownAdapter()` factory, YAML frontmatter, model/tools fields
- **skills**: Simplest — just name + content as markdown, no metadata
- **rules**: Scoping system (always/glob/manual/agent), priority, YAML frontmatter

## Code Conventions

- **Strict TypeScript**: `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess` all enabled
- **No `any`**: `typescript/no-explicit-any` is an error in oxlint
- **No `_variable` prefix** for unused params — use `void variable` instead
- **ESM only**: All packages are `"type": "module"`, target ES2023/Node 22
- **Formatting**: oxfmt — double quotes, trailing commas, 100 char width, 2-space indent
- **Tests**: vitest with globals, co-located as `*.test.ts` next to source files, target 100% coverage

## Build & Release

- **tsup** builds each package to ESM with declaration maps
- **Turborepo** orchestrates build order (packages build in dependency order)
- **semantic-release** on master: analyzes conventional commits, bumps versions, publishes to npm
- `scripts/sync-versions.js` keeps all workspace package versions in lockstep
- `scripts/publish-workspaces.js` publishes non-primary packages after the core package
