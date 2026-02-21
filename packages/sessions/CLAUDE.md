# packages/sessions

Cross-tool session reading and context handoff. Adapters _read_ session data (reversed from other engines that _write_ config).

## Key Types

- `UnifiedSession`: Normalized session data from any AI tool
- `SessionContext`: Extracted handoff context (summary, files, decisions)

## Adapters

7 session parsers, each reading from tool-specific storage formats:

- Claude Code: JSONL from `~/.claude/projects/*/`
- Codex: JSONL from `~/.codex/`
- Copilot: YAML + JSONL from `~/.config/github-copilot/`
- Gemini CLI: JSON from `~/.gemini/`
- OpenCode: JSON from `~/.opencode/sessions/`
- Factory Droid: JSONL from `~/.factory/`
- Cursor: JSONL from `~/.cursor/`

## CLI Commands

`detect`, `list`, `context`, `handoff`, `scan`, `help`
