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
import { CursorRuleAdapter } from "./cursor.js";
import type { RuleDefinition } from "../types/index.js";

describe("CursorRuleAdapter", () => {
  let adapter: CursorRuleAdapter;

  const testRule: RuleDefinition = {
    id: "typescript",
    name: "TypeScript Standards",
    description: "TypeScript coding standards",
    content: "Always use strict TypeScript.",
    scope: { type: "glob", patterns: ["*.ts", "*.tsx"] },
  };

  const alwaysRule: RuleDefinition = {
    id: "general",
    name: "General",
    description: "General rules",
    content: "Be concise.",
    scope: { type: "always" },
  };

  const manualRule: RuleDefinition = {
    id: "manual",
    name: "Manual Rule",
    description: "A manual rule",
    content: "Invoke when needed.",
    scope: { type: "manual" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new CursorRuleAdapter();
  });

  describe("metadata", () => {
    it("has correct id", () => expect(adapter.id).toBe("cursor"));
    it("has correct name", () => expect(adapter.name).toBe("Cursor"));
    it("has correct configDir", () => expect(adapter.configDir).toBe(".cursor/rules"));
    it("has nativeSupport true", () => expect(adapter.nativeSupport).toBe(true));
  });

  describe("generate", () => {
    it("uses subdirectory pattern with RULE.md", async () => {
      const files = await adapter.generate([testRule]);
      expect(files).toHaveLength(1);
      expect(files[0].path).toBe(".cursor/rules/typescript/RULE.md");
      expect(files[0].format).toBe("md");
    });

    it("includes frontmatter with alwaysApply false for glob scope", async () => {
      const files = await adapter.generate([testRule]);
      expect(files[0].content).toContain("alwaysApply: false");
      expect(files[0].content).toContain('- "*.ts"');
    });

    it("includes alwaysApply true for always scope", async () => {
      const files = await adapter.generate([alwaysRule]);
      expect(files[0].content).toContain("alwaysApply: true");
    });

    it("includes alwaysApply false for manual scope", async () => {
      const files = await adapter.generate([manualRule]);
      expect(files[0].content).toContain("alwaysApply: false");
      expect(files[0].content).not.toContain("globs:");
    });

    it("generates rule without description", async () => {
      const noDescRule: RuleDefinition = {
        id: "nodesc",
        name: "No Description",
        content: "Content only.",
        scope: { type: "always" },
      };
      const files = await adapter.generate([noDescRule]);
      expect(files[0].content).not.toContain("description:");
      expect(files[0].content).toContain("alwaysApply: true");
      expect(files[0].content).toContain("Content only.");
    });

    it("handles empty rules array", async () => {
      const files = await adapter.generate([]);
      expect(files).toHaveLength(0);
    });

    it("generates multiple files for multiple rules", async () => {
      const files = await adapter.generate([testRule, alwaysRule]);
      expect(files).toHaveLength(2);
      expect(files[0].path).toBe(".cursor/rules/typescript/RULE.md");
      expect(files[1].path).toBe(".cursor/rules/general/RULE.md");
    });
  });

  describe("import", () => {
    it("returns empty when dir missing", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const result = await adapter.import("/test");
      expect(result).toEqual([]);
    });

    it("imports rules from subdirectories", async () => {
      vi.mocked(existsSync).mockImplementation((p) => {
        const path = String(p);
        return path.includes(".cursor/rules") || path.includes("RULE.md");
      });
      vi.mocked(readdir).mockResolvedValue(["typescript"] as unknown);
      vi.mocked(readFile).mockResolvedValue(
        '---\ndescription: TS rules\nalwaysApply: false\nglobs:\n  - "*.ts"\n---\n\nUse strict TS.',
      );

      const result = await adapter.import("/test");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("typescript");
      expect(result[0].description).toBe("TS rules");
      expect(result[0].scope).toEqual({ type: "glob", patterns: ["*.ts"] });
    });

    it("parses alwaysApply true as always scope", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["general"] as unknown);
      vi.mocked(readFile).mockResolvedValue(
        "---\ndescription: General\nalwaysApply: true\n---\n\nBe concise.",
      );

      const result = await adapter.import("/test");
      expect(result).toHaveLength(1);
      expect(result[0].scope).toEqual({ type: "always" });
    });

    it("parses alwaysApply false without globs as manual scope", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["manual"] as unknown);
      vi.mocked(readFile).mockResolvedValue(
        "---\ndescription: Manual\nalwaysApply: false\n---\n\nManual rule.",
      );

      const result = await adapter.import("/test");
      expect(result).toHaveLength(1);
      expect(result[0].scope).toEqual({ type: "manual" });
    });

    it("uses process.cwd() when cwd is not provided", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const result = await adapter.import();
      expect(result).toEqual([]);
    });

    it("imports rule without frontmatter", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["plain"] as unknown);
      vi.mocked(readFile).mockResolvedValue("Just plain content.");

      const result = await adapter.import("/test");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("plain");
      expect(result[0].content).toBe("");
      expect(result[0].scope).toEqual({ type: "always" });
    });

    it("skips entries without RULE.md", async () => {
      vi.mocked(existsSync).mockImplementation((p) => {
        const path = String(p);
        if (path.includes("RULE.md")) return false;
        return path.includes(".cursor/rules");
      });
      vi.mocked(readdir).mockResolvedValue(["norule"] as unknown);

      const result = await adapter.import("/test");
      expect(result).toEqual([]);
    });
  });
});
