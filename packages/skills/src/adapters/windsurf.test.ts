import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./registry.js", () => ({
  registry: { register: vi.fn() },
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => false),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  rm: vi.fn(),
}));

import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { WindsurfSkillAdapter } from "./windsurf.js";
import type { SkillDefinition } from "../types/index.js";

describe("WindsurfSkillAdapter", () => {
  let adapter: WindsurfSkillAdapter;

  const testSkill: SkillDefinition = {
    id: "review",
    name: "Code Review",
    description: "Review code for best practices",
    content:
      "Please review the selected code for:\n- Security issues\n- Performance\n- Best practices",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new WindsurfSkillAdapter();
  });

  describe("metadata", () => {
    it("has correct id", () => expect(adapter.id).toBe("windsurf"));
    it("has correct name", () => expect(adapter.name).toBe("Windsurf"));
    it("has native support", () => expect(adapter.nativeSupport).toBe(true));
    it("has correct config dir", () => expect(adapter.configDir).toBe(".windsurf/skills"));
  });

  describe("generate", () => {
    it("generates one file per skill", async () => {
      const files = await adapter.generate([testSkill]);
      expect(files).toHaveLength(1);
      expect(files[0]?.path).toBe(".windsurf/skills/review.md");
      expect(files[0]?.format).toBe("md");
    });

    it("formats skill with name heading and content", async () => {
      const files = await adapter.generate([testSkill]);
      expect(files[0]?.content).toContain("# Code Review");
      expect(files[0]?.content).toContain("Review code for best practices");
      expect(files[0]?.content).toContain("Security issues");
    });

    it("handles empty skills array", async () => {
      const files = await adapter.generate([]);
      expect(files).toHaveLength(0);
    });

    it("handles multiple skills", async () => {
      const skills = [testSkill, { ...testSkill, id: "debug", name: "Debug" }];
      const files = await adapter.generate(skills);
      expect(files).toHaveLength(2);
    });

    it("handles skill without description", async () => {
      const skill: SkillDefinition = { id: "test", name: "Test", content: "Content here" };
      const files = await adapter.generate([skill]);
      expect(files[0]?.content).toBe("# Test\n\nContent here\n");
    });
  });

  describe("import", () => {
    it("returns empty array when dir does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const result = await adapter.import("/test");
      expect(result).toEqual([]);
    });

    it("imports skills from markdown files", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["review.md"] as unknown);
      vi.mocked(readFile).mockResolvedValue("# Code Review\n\nReview the code");
      const result = await adapter.import("/test");
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("review");
      expect(result[0]?.name).toBe("Code Review");
    });

    it("skips non-markdown files", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["readme.txt", "skill.md"] as unknown);
      vi.mocked(readFile).mockResolvedValue("# Skill\n\nContent");
      const result = await adapter.import("/test");
      expect(result).toHaveLength(1);
    });

    it("imports skill without heading", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["plain.md"] as unknown);
      vi.mocked(readFile).mockResolvedValue("Just content, no heading");
      const result = await adapter.import("/test");
      expect(result[0]?.name).toBe("plain");
      expect(result[0]?.content).toBe("Just content, no heading");
    });

    it("imports without cwd argument", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const result = await adapter.import();
      expect(result).toEqual([]);
    });
  });
});
