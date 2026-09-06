import { describe, expect, it } from "vitest";
import { ENGINE_NAMES } from "./index.js";

describe("ENGINE_NAMES", () => {
  it("lists every engine the unified CLI actually routes", () => {
    expect([...ENGINE_NAMES]).toEqual([
      "hooks",
      "mcp",
      "skills",
      "agents",
      "rules",
      "plugins",
      "sessions",
    ]);
  });
});
