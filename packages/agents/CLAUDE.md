# packages/agents

Agent configuration management. Notable for its reusable markdown adapter factory.

## Key Types (`types/definition.ts`)

`AgentDefinition`: `id`, `name`, `description?`, `instructions` (main content), `model?`, `tools?: string[]`, `tags?`, `enabled?`

Agents differ from skills by having `model` and `tools` fields — they represent configurable AI agent personas, not just prompt content.

## Markdown Adapter Factory (`adapters/markdown-adapter.ts`)

`createMarkdownAdapter(options)` is a reusable factory that generates markdown files with YAML frontmatter from agent definitions. Used by the Claude Code adapter and extensible for other tools.

The Claude Code adapter generates `.claude/agents/*.md` files — each agent becomes a markdown file with YAML frontmatter (name, description, model, tools) and instructions as the body.

## CLI Commands

`detect`, `generate`, `install`, `import`, `sync`, `export`, `help` (no `init` command — unlike hooks/mcp).
