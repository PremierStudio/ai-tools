# ADR 0002: Keybinding Governance and Collision Policy

- Status: Accepted
- Date: 2026-02-21

## Context

The settings UI allows rebinding keys, but uncontrolled overrides can create ambiguous input paths and non-deterministic behavior.

## Decision

Adopt a governed keybinding model:

1. Effective binding resolution uses `getEffectiveKey(actionId, overrides)`.
2. Runtime registration is centralized in `runtime/keybindings.ts`.
3. Unsupported custom formats fall back to defaults.
4. Restricted chords (`quit-ctrl`, `tab-prev`) only accept known trigger syntax.
5. Collision detection uses `findKeybindingCollision(actionId, key, overrides)`.
   - On collision, override is rejected.
   - User receives a visible error toast.
   - Preferences are not persisted for invalid override.

## Consequences

- Pros
  - Deterministic key routing.
  - Prevents accidental key shadowing.
  - Keeps settings behavior predictable and supportable.
- Cons
  - Some desired advanced bindings are intentionally disallowed.
  - Users may need better messaging for why a key was rejected.

## Extension Pattern

For future richer bindings:

1. Extend parser/normalization in one place (preferences/keybindings runtime).
2. Keep collision checks centralized.
3. Update tests for accepted/rejected patterns.
4. Preserve fallback semantics to avoid breaking existing configs.
