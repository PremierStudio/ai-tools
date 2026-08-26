# packages/ui

Interactive terminal dashboard (`ai-tools-tui` binary). Embeds AI coding tools in terminal panes with session handoff.

## Architecture

- `src/types.ts` — Core types (ToolInfo, PaneState, AppState)
- `src/app.ts` — Application state management
- `src/widgets/` — Business logic for each widget (tool launcher, terminal pane, session browser, handoff, config, status bar)
- `src/commands/` — Action logic (handoff, switch-tool, config-sync)
- `src/cli/` — CLI entry point

## Dependencies

- `@rezi-ui/core` + `@rezi-ui/node` — TUI framework
- `node-pty` — PTY embedding for terminal panes
- `@itz4blitz/ai-tools-sessions` — Session reading and handoff
