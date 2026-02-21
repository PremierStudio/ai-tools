import { describe, it, expect } from "vitest";
import { defineConfig } from "./define.js";
import type { SkillsConfig } from "../types/index.js";

describe("defineConfig", () => {
  it("returns the config object unchanged", () => {
    const config: SkillsConfig = {
      skills: [
        {
          id: "review",
          name: "Code Review",
          content: "Review the code",
        },
      ],
    };
    expect(defineConfig(config)).toBe(config);
  });

  it("returns empty skills array unchanged", () => {
    const config: SkillsConfig = { skills: [] };
    expect(defineConfig(config)).toEqual({ skills: [] });
  });

  it("preserves all skill fields", () => {
    const config: SkillsConfig = {
      skills: [
        {
          id: "test",
          name: "Test Skill",
          description: "A test skill",
          content: "Do the thing",
          tags: ["test", "dev"],
          enabled: false,
        },
      ],
    };
    const result = defineConfig(config);
    expect(result.skills[0]?.tags).toEqual(["test", "dev"]);
    expect(result.skills[0]?.enabled).toBe(false);
    expect(result.skills[0]?.description).toBe("A test skill");
  });
});
