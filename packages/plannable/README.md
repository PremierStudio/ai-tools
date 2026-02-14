# @premierstudio/plannable

Connect your AI coding tools to [Plannable](https://plannable.ai) with a single command. Automatically detects your IDE, sets up MCP connections, and installs PM-AI hooks that keep your AI tools in sync with Plannable.

## Quick Start

```bash
npx @premierstudio/plannable
```

That's it. The CLI will:

1. **Authenticate** via OAuth (opens browser)
2. **Detect** your AI tools (Claude Code, Cursor, Gemini CLI, Codex, and more)
3. **Configure** MCP server connections for each detected tool
4. **Install** PM-AI hooks for intelligent guardrails

## Commands

```bash
npx @premierstudio/plannable                # Interactive setup (default)
npx @premierstudio/plannable status          # Check connection status
npx @premierstudio/plannable remove          # Clean removal
```

## Options

```
--server <url>   Plannable server URL (default: https://plannable.ai)
                 Also configurable via PLANNABLE_SERVER env var
```

## Supported AI Tools

| Tool        | Detection                                         | MCP | Hooks   |
| ----------- | ------------------------------------------------- | --- | ------- |
| Claude Code | `claude` CLI or `.claude/` directory              | Yes | Yes     |
| Cursor      | `cursor` CLI or `.cursor/` directory              | Yes | Yes     |
| Gemini CLI  | `gemini` CLI or `.gemini/` directory              | Yes | Yes     |
| Codex       | `codex` CLI, `codex.json`, or `.codex/` directory | Yes | Yes     |
| Cline       | `cline` CLI or `.clinerules/` directory           | Yes | Yes     |
| Kiro        | `kiro` CLI or `.kiro/` directory                  | Yes | Yes     |
| OpenCode    | `opencode` CLI or `.opencode/` directory          | Yes | Yes     |
| Droid       | `droid` CLI or `.factory/` directory              | Yes | Yes     |
| Amp         | `amp` CLI or `.amp/` directory                    | Yes | Planned |

## What Are PM-AI Hooks?

Hooks are lightweight middleware that run inside your AI tool. They let Plannable:

- Guide your AI toward the right tasks and priorities
- Enforce project conventions automatically
- Signal file and shell activity back to Plannable for risk detection
- Block unsafe operations before they happen

Hooks are installed via [ai-hooks](https://github.com/PremierStudio/ai-hooks), a universal hooks framework for AI coding tools.

## Self-Hosted

```bash
# Use a custom server
npx @premierstudio/plannable --server https://your-instance.example.com

# Or set via environment variable
PLANNABLE_SERVER=https://your-instance.example.com npx @premierstudio/plannable
```

## Requirements

- Node.js >= 22.0.0
- At least one supported AI coding tool installed

## License

MIT
