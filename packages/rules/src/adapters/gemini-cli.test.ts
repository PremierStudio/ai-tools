import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./registry.js", () => ({ registry: { register: vi.fn() } }));
vi.mock("node:fs", () => ({ existsSync: vi.fn(() => false) }));
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  rm: vi.fn(),
}));

import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { GeminiCliRuleAdapter } from "./gemini-cli.js";

describe("GeminiCliRuleAdapter", () => {
  let adapter: GeminiCliRuleAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new GeminiCliRuleAdapter();
  });

  describe("metadata", () => {
    it("has correct id", () => expect(adapter.id).toBe("gemini-cli"));
    it("has correct name", () => expect(adapter.name).toBe("Gemini CLI"));
    it("has correct configDir", () => expect(adapter.configDir).toBe(".gemini/rules"));
  });

  describe("generate", () => {
    it("generates files at correct path", async () => {
      const files = await adapter.generate([
        { id: "test", name: "Test", content: "Content", scope: { type: "always" } },
      ]);
      expect(files[0].path).toBe(".gemini/rules/test.md");
    });

    it("handles empty rules", async () => {
      expect(await adapter.generate([])).toHaveLength(0);
    });
  });

  describe("import", () => {
    it("returns empty when dir missing", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      expect(await adapter.import("/test")).toEqual([]);
    });

    it("imports rules", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["rule.md"] as unknown);
      vi.mocked(readFile).mockResolvedValue("# My Rule\n\nContent here.");
      const result = await adapter.import("/test");
      expect(result[0].name).toBe("My Rule");
    });

    it("skips non-markdown files", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["readme.txt", "rule.md"] as unknown);
      vi.mocked(readFile).mockResolvedValue("# Skill\n\nContent");
      const result = await adapter.import("/test");
      expect(result).toHaveLength(1);
    });

    it("imports rule without heading", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["plain.md"] as unknown);
      vi.mocked(readFile).mockResolvedValue("Just content, no heading");
      const result = await adapter.import("/test");
      expect(result[0].name).toBe("plain");
      expect(result[0].content).toBe("Just content, no heading");
    });

    it("imports without cwd argument", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const result = await adapter.import();
      expect(result).toEqual([]);
    });
  });
});
