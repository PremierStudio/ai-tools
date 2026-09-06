import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("./registry.js", () => ({
  registry: { register: vi.fn() },
}));

import { CursorRuleAdapter } from "./cursor.js";
import type { RuleDefinition } from "../types/index.js";

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "ai-tools-rules-cursor-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

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
    adapter = new CursorRuleAdapter();
  });

  describe("metadata", () => {
    it("has correct id", () => expect(adapter.id).toBe("cursor"));
    it("has correct name", () => expect(adapter.name).toBe("Cursor"));
    it("has correct configDir", () => expect(adapter.configDir).toBe(".cursor/rules"));
    it("has nativeSupport true", () => expect(adapter.nativeSupport).toBe(true));
  });

  describe("generate", () => {
    it("uses flat *.mdc files Cursor actually loads", async () => {
      const files = await adapter.generate([testRule]);
      expect(files).toHaveLength(1);
      expect(files[0]?.path).toBe(".cursor/rules/typescript.mdc");
      expect(files[0]?.format).toBe("md");
    });

    it("includes frontmatter with alwaysApply false for glob scope", async () => {
      const files = await adapter.generate([testRule]);
      expect(files[0]?.content).toContain("alwaysApply: false");
      expect(files[0]?.content).toContain('- "*.ts"');
    });

    it("includes alwaysApply true for always scope", async () => {
      const files = await adapter.generate([alwaysRule]);
      expect(files[0]?.content).toContain("alwaysApply: true");
    });

    it("includes alwaysApply false for manual scope", async () => {
      const files = await adapter.generate([manualRule]);
      expect(files[0]?.content).toContain("alwaysApply: false");
      expect(files[0]?.content).not.toContain("globs:");
    });

    it("generates rule without description", async () => {
      const noDescRule: RuleDefinition = {
        id: "nodesc",
        name: "No Description",
        content: "Content only.",
        scope: { type: "always" },
      };
      const files = await adapter.generate([noDescRule]);
      expect(files[0]?.content).not.toContain("description:");
      expect(files[0]?.content).toContain("alwaysApply: true");
      expect(files[0]?.content).toContain("Content only.");
    });

    it("handles empty rules array", async () => {
      const files = await adapter.generate([]);
      expect(files).toHaveLength(0);
    });

    it("generates multiple flat mdc files for multiple rules", async () => {
      const files = await adapter.generate([testRule, alwaysRule]);
      expect(files).toHaveLength(2);
      expect(files[0]?.path).toBe(".cursor/rules/typescript.mdc");
      expect(files[1]?.path).toBe(".cursor/rules/general.mdc");
    });
  });

  describe("install", () => {
    it("writes flat .mdc files, not nested RULE.md", async () => {
      await withTempDir(async (dir) => {
        const files = await adapter.generate([testRule, alwaysRule]);
        await adapter.install(files, dir);

        const mdcPath = join(dir, ".cursor/rules/typescript.mdc");
        expect(existsSync(mdcPath)).toBe(true);
        expect(existsSync(join(dir, ".cursor/rules/general.mdc"))).toBe(true);
        expect(existsSync(join(dir, ".cursor/rules/typescript/RULE.md"))).toBe(false);
        expect(await readFile(mdcPath, "utf-8")).toContain("alwaysApply: false");
      });
    });
  });

  describe("import", () => {
    it("returns empty when dir missing", async () => {
      await withTempDir(async (dir) => {
        expect(await adapter.import(join(dir, "missing"))).toEqual([]);
      });
    });

    it("imports rules from flat .mdc files", async () => {
      await withTempDir(async (dir) => {
        await mkdir(join(dir, ".cursor/rules"), { recursive: true });
        await writeFile(
          join(dir, ".cursor/rules/typescript.mdc"),
          '---\ndescription: TS rules\nalwaysApply: false\nglobs:\n  - "*.ts"\n---\n\nUse strict TS.',
        );

        const result = await adapter.import(dir);
        expect(result).toHaveLength(1);
        expect(result[0]?.id).toBe("typescript");
        expect(result[0]?.description).toBe("TS rules");
        expect(result[0]?.scope).toEqual({ type: "glob", patterns: ["*.ts"] });
      });
    });

    it("parses alwaysApply true as always scope", async () => {
      await withTempDir(async (dir) => {
        await mkdir(join(dir, ".cursor/rules"), { recursive: true });
        await writeFile(
          join(dir, ".cursor/rules/general.mdc"),
          "---\ndescription: General\nalwaysApply: true\n---\n\nBe concise.",
        );

        const result = await adapter.import(dir);
        expect(result).toHaveLength(1);
        expect(result[0]?.scope).toEqual({ type: "always" });
      });
    });

    it("parses alwaysApply false without globs as manual scope", async () => {
      await withTempDir(async (dir) => {
        await mkdir(join(dir, ".cursor/rules"), { recursive: true });
        await writeFile(
          join(dir, ".cursor/rules/manual.mdc"),
          "---\ndescription: Manual\nalwaysApply: false\n---\n\nManual rule.",
        );

        const result = await adapter.import(dir);
        expect(result).toHaveLength(1);
        expect(result[0]?.scope).toEqual({ type: "manual" });
      });
    });

    it("uses process.cwd() when cwd is not provided", async () => {
      await withTempDir(async (dir) => {
        const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(dir);
        try {
          expect(await adapter.import()).toEqual([]);
        } finally {
          cwdSpy.mockRestore();
        }
      });
    });

    it("imports rule without frontmatter", async () => {
      await withTempDir(async (dir) => {
        await mkdir(join(dir, ".cursor/rules"), { recursive: true });
        await writeFile(join(dir, ".cursor/rules/plain.mdc"), "Just plain content.");

        const result = await adapter.import(dir);
        expect(result).toHaveLength(1);
        expect(result[0]?.id).toBe("plain");
        expect(result[0]?.content).toBe("");
        expect(result[0]?.scope).toEqual({ type: "always" });
      });
    });

    it("ignores unclosed frontmatter", async () => {
      await withTempDir(async (dir) => {
        await mkdir(join(dir, ".cursor/rules"), { recursive: true });
        await writeFile(join(dir, ".cursor/rules/broken.mdc"), "---\ndescription: no closer\n");

        const result = await adapter.import(dir);
        expect(result[0]?.id).toBe("broken");
        expect(result[0]?.content).toBe("");
      });
    });

    it("skips non-mdc entries including nested RULE.md leftovers", async () => {
      await withTempDir(async (dir) => {
        await mkdir(join(dir, ".cursor/rules/norule"), { recursive: true });
        await writeFile(join(dir, ".cursor/rules/norule/RULE.md"), "ignored");
        await writeFile(join(dir, ".cursor/rules/readme.md"), "ignored markdown");

        const result = await adapter.import(dir);
        expect(result).toEqual([]);
      });
    });
  });
});
