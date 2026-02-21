import { describe, it, expect } from "vitest";
import { isBeforeEvent } from "./hooks.js";
import type { HookEvent } from "./events.js";

describe("isBeforeEvent", () => {
  const beforeTypes: HookEvent["type"][] = [
    "session:start",
    "prompt:submit",
    "tool:before",
    "file:write",
    "file:edit",
    "file:delete",
    "shell:before",
    "mcp:before",
  ];

  const afterTypes: HookEvent["type"][] = [
    "session:end",
    "prompt:response",
    "tool:after",
    "file:read",
    "shell:after",
    "mcp:after",
    "notification",
  ];

  for (const type of beforeTypes) {
    it(`returns true for ${type}`, () => {
      const event = { type, timestamp: Date.now(), metadata: {} } as HookEvent;
      expect(isBeforeEvent(event)).toBe(true);
    });
  }

  for (const type of afterTypes) {
    it(`returns false for ${type}`, () => {
      const event = { type, timestamp: Date.now(), metadata: {} } as HookEvent;
      expect(isBeforeEvent(event)).toBe(false);
    });
  }
});
