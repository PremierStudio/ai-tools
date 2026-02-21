import { describe, it, expect } from "vitest";
import { defineRulesConfig } from "./define.js";

describe("defineRulesConfig", () => {
  it("returns the config as-is", () => {
    const config = {
      rules: [
        {
          id: "test",
          name: "Test Rule",
          content: "Test content",
          scope: { type: "always" as const },
        },
      ],
    };
    expect(defineRulesConfig(config)).toBe(config);
  });

  it("works with empty rules", () => {
    const config = { rules: [] };
    expect(defineRulesConfig(config)).toEqual({ rules: [] });
  });
});
