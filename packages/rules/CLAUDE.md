# packages/rules

Project rules configuration. Distinguished by its scoping system and priority.

## Key Types (`types/definition.ts`)

`RuleDefinition`: `id`, `name`, `description?`, `content`, `scope`, `priority?`, `tags?`, `enabled?`

`RuleScope` is the unique feature — four scoping modes:

- `{ type: "always" }` — rule applies everywhere
- `{ type: "glob", patterns: string[] }` — rule applies to matching file paths
- `{ type: "manual" }` — user-invoked only
- `{ type: "agent", agentId: string }` — scoped to a specific agent

## Naming Exception

This package exports `defineRulesConfig()` — NOT `defineConfig()` like every other package. This is intentional (avoids ambiguity with the more generic name).

## Markdown Format

YAML frontmatter with `description`, `globs` (if glob scope), and `priority`. Claude Code adapter generates `.claude/rules/*.md`.

## CLI Commands

`detect`, `generate`, `install`, `import`, `sync`, `export`, `help` (no `init`).
