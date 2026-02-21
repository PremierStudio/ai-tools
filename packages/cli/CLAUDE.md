# packages/cli

Unified CLI dispatcher (`ai-tools` binary). Thin routing layer — no domain logic of its own.

## Architecture (`src/cli/index.ts`)

Routes `ai-tools <engine> <command>` to the appropriate engine's CLI:

- `ai-tools hooks <cmd>` → `@premierstudio/ai-hooks/cli`
- `ai-tools mcp <cmd>` → `@premierstudio/ai-mcp/cli`
- `ai-tools agents <cmd>` → `@premierstudio/ai-agents/cli`
- `ai-tools skills <cmd>` → `@premierstudio/ai-skills/cli`
- `ai-tools rules <cmd>` → `@premierstudio/ai-rules/cli`

Uses dynamic `import()` for lazy engine loading — only the invoked engine is loaded.

## Cross-Cutting Commands

Two commands run across all engines:

- `ai-tools detect` — runs `detect` on every engine
- `ai-tools sync [--dry-run]` — runs `sync` across mcp, skills, agents, rules (not hooks)

Engine list defined by `ENGINE_NAMES` constant in `src/index.ts`.
