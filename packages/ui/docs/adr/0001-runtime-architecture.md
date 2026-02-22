# ADR 0001: Runtime Architecture for TUI Interaction

- Status: Accepted
- Date: 2026-02-21

## Context

The UI runtime previously concentrated reducer logic, keybinding wiring, side effects, and command-mode behavior in `tui.ts`. This made feature iteration risky and caused regressions in continue/handoff/keybinding flows.

## Decision

Use an explicit runtime layering model:

1. `runtime/state.ts`
   - Defines composed `TuiState` from domain slices (navigation, data, session, handoff, overlay, preferences, settings, feedback).
2. `runtime/key-handler.ts`
   - Pure reducer/input intent translation (`SimpleKeyEvent` -> `KeyResult`).
3. `runtime/action-executor.ts`
   - Side-effect layer with a typed handler registry (command bus style) keyed by `KeyAction["type"]`.
4. `runtime/terminal-command-executor.ts`
   - Dedicated handler for terminal command-mode actions.
5. `runtime/keybindings.ts`
   - Declarative keybinding map builder with defaults, overrides, and fallback policy.

`tui.ts` remains the composition root and render orchestrator.

## Consequences

- Pros
  - Strong SRP boundaries.
  - Easier testability for reducer/effects separately.
  - Explicit extension points for new actions and keybinding policies.
- Cons
  - More files and wiring overhead.
  - Requires strict ownership discipline to avoid logic leakage back into `tui.ts`.

## Extension Pattern

When adding a user action:

1. Add action type in `runtime/types.ts`.
2. Emit action from `runtime/key-handler.ts`.
3. Implement side effect in `runtime/action-executor.ts` handlers map.
4. Add keybinding definition in `preferences.ts` + `runtime/keybindings.ts` as needed.
5. Add focused unit/integration tests in `runtime/*.test.ts`.
