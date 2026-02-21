import { describe, it, expect } from "vitest";
import { defineConfig } from "./define.js";

describe("defineConfig", () => {
  it("returns the config as-is", () => {
    const config = {
      agents: [
        {
          id: "reviewer",
          name: "Code Reviewer",
          instructions: "Review code for issues",
        },
      ],
    };
    expect(defineConfig(config)).toEqual(config);
  });

  it("returns empty agents array", () => {
    const config = { agents: [] };
    expect(defineConfig(config)).toEqual({ agents: [] });
  });

  it("preserves all agent fields", () => {
    const config = {
      agents: [
        {
          id: "test-agent",
          name: "Test Agent",
          description: "A test agent",
          instructions: "Do the test",
          model: "claude-sonnet-4-20250514",
          tools: ["Read", "Bash"],
          tags: ["testing"],
          enabled: false,
        },
      ],
    };
    expect(defineConfig(config)).toEqual(config);
  });
});
