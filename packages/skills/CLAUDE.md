# packages/skills

Skills/prompts configuration. The simplest content package — no metadata beyond name.

## Key Types (`types/definition.ts`)

`SkillDefinition`: `id`, `name`, `description?`, `content` (raw prompt text), `tags?`, `enabled?`

Skills are just name + content. No model, tools, scope, or priority fields (contrast with agents and rules).

## Markdown Format

Simple: markdown H1 title as name, body as content. No YAML frontmatter. Claude Code adapter generates `.claude/commands/*.md`.

## CLI Commands

`detect`, `generate`, `install`, `import`, `sync`, `export`, `help` (no `init`).
