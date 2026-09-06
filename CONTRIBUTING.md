# Contributing to ai-tools

**Requirements:** Node >= 22, npm >= 10

```bash
git clone https://github.com/itz4blitz/ai-tools.git
cd ai-tools
npm install
npm run check
```

| Command | What it does |
|---------|--------------|
| `npm run check` | lint + format + typecheck + coverage-gated tests + smoke |
| `npm test` | vitest |
| `npm run lint` | oxlint |
| `npm run fmt` | oxfmt |
| `npm run typecheck` | tsc across workspaces |
| `npm run build` | tsup via Turborepo |

## Layout

One public package (`packages/cli`, published as `@itz4blitz/ai-tools`). Each engine is its own workspace with adapters under `src/adapters/`:

```
packages/
  cli/        # public CLI + plugin planner
  hooks/
  mcp/
  agents/
  skills/
  rules/
  sessions/
  ui/         # interactive TUI (not a separately published engine)
```

## Conventions

- Strict TypeScript (`noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`)
- No `any`
- Unused params: `void name`, not `_name`
- ESM only
- Tests: vitest, co-located `*.test.ts`, globals on

## Adding an adapter

Adapters live **inside the engine package**, not as separate npm packages.

1. Add `packages/<engine>/src/adapters/<tool>.ts` next to an existing adapter (Claude Code is the usual template for hooks).
2. Register it in that package's `src/adapters/registry.ts` / `all.ts`.
3. Cover detect, generate, and event mapping with co-located tests.
4. Add the host to the README fleet table only if it is first-class.

## Pull requests

- [ ] `npm run check` passes
- [ ] Tests cover the new behavior
- [ ] README updated when the public surface changes
- [ ] No unrelated diffs

## Issues

Include the host name and version, the `ai-*.config.ts` snippet, generated files if relevant, expected vs actual, and reproduction steps.
