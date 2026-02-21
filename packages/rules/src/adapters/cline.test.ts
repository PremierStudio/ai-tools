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
import { ClineRuleAdapter } from "./cline.js";
import type { RuleDefinition } from "../types/index.js";

describe("ClineRuleAdapter", () => {
  let adapter: ClineRuleAdapter;

  const testRule: RuleDefinition = {
    id: "typescript",
    name: "TypeScript Standards",
    content: "Always use strict TypeScript.",
    scope: { type: "always" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new ClineRuleAdapter();
  });

  describe("metadata", () => {
    it("has correct id", () => expect(adapter.id).toBe("cline"));
    it("has correct name", () => expect(adapter.name).toBe("Cline"));
    it("has correct configDir", () => expect(adapter.configDir).toBe(".clinerules"));
  });

  describe("generate", () => {
    it("generates one file per rule", async () => {
      const files = await adapter.generate([testRule]);
      expect(files).toHaveLength(1);
      expect(files[0].path).toBe(".clinerules/typescript.md");
      expect(files[0].format).toBe("md");
    });

    it("uses simple markdown format with heading", async () => {
      const files = await adapter.generate([testRule]);
      expect(files[0].content).toBe("# TypeScript Standards\n\nAlways use strict TypeScript.\n");
    });

    it("handles empty rules array", async () => {
      const files = await adapter.generate([]);
      expect(files).toHaveLength(0);
    });
  });

  describe("import", () => {
    it("returns empty when dir missing", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const result = await adapter.import("/test");
      expect(result).toEqual([]);
    });

    it("imports rules with heading", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["ts.md"] as unknown);
      vi.mocked(readFile).mockResolvedValue("# TypeScript Rules\n\nUse strict TS.");
      const result = await adapter.import("/test");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("ts");
      expect(result[0].name).toBe("TypeScript Rules");
      expect(result[0].content).toBe("Use strict TS.");
    });

    it("imports rules without heading", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["plain.md"] as unknown);
      vi.mocked(readFile).mockResolvedValue("Just content.");
      const result = await adapter.import("/test");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("plain");
      expect(result[0].name).toBe("plain");
      expect(result[0].content).toBe("Just content.");
    });

    it("skips non-md files", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["readme.txt", "rule.md"] as unknown);
      vi.mocked(readFile).mockResolvedValue("Content");
      const result = await adapter.import("/test");
      expect(result).toHaveLength(1);
    });

    it("imports without cwd argument", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const result = await adapter.import();
      expect(result).toEqual([]);
    });
  });
});
