import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentDefinition } from "../types/index.js";

vi.mock("./index.js", () => {
  const registry = { register: vi.fn() };
  abstract class BaseAgentAdapter {
    abstract readonly id: string;
    abstract readonly name: string;
    abstract readonly nativeSupport: boolean;
    abstract readonly configDir: string;
    abstract generate(agents: AgentDefinition[]): Promise<unknown[]>;
    abstract import(cwd?: string): Promise<AgentDefinition[]>;
    async detect() {
      return false;
    }
    async install() {}
    async uninstall() {}
  }
  return { BaseAgentAdapter, registry };
});

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => false),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}));

import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { CursorAgentAdapter } from "./cursor.js";

describe("CursorAgentAdapter", () => {
  let adapter: CursorAgentAdapter;

  const testAgent: AgentDefinition = {
    id: "reviewer",
    name: "Code Reviewer",
    description: "Reviews code for quality",
    instructions: "Review all code changes carefully.",
    tools: ["Read", "Grep"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new CursorAgentAdapter();
  });

  describe("metadata", () => {
    it("has correct id", () => {
      expect(adapter.id).toBe("cursor");
    });

    it("has correct name", () => {
      expect(adapter.name).toBe("Cursor");
    });

    it("has native support", () => {
      expect(adapter.nativeSupport).toBe(true);
    });

    it("has correct configDir", () => {
      expect(adapter.configDir).toBe(".cursor/agents");
    });
  });

  describe("generate", () => {
    it("returns empty array for no agents", async () => {
      const files = await adapter.generate([]);
      expect(files).toEqual([]);
    });

    it("generates one file per agent at correct path", async () => {
      const files = await adapter.generate([testAgent]);
      expect(files).toHaveLength(1);
      expect(files[0]!.path).toBe(".cursor/agents/reviewer.md");
    });

    it("generates file with md format", async () => {
      const files = await adapter.generate([testAgent]);
      expect(files[0]!.format).toBe("md");
    });

    it("includes frontmatter and heading", async () => {
      const files = await adapter.generate([testAgent]);
      expect(files[0]!.content).toContain("---");
      expect(files[0]!.content).toContain("# Code Reviewer");
      expect(files[0]!.content).toContain("Review all code changes carefully.");
    });

    it("generates multiple agent files", async () => {
      const agents: AgentDefinition[] = [
        testAgent,
        { id: "fixer", name: "Bug Fixer", instructions: "Fix bugs." },
      ];
      const files = await adapter.generate(agents);
      expect(files).toHaveLength(2);
    });
  });

  describe("import", () => {
    it("returns empty array when config dir does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const agents = await adapter.import("/project");
      expect(agents).toEqual([]);
    });

    it("imports without cwd argument", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const agents = await adapter.import();
      expect(agents).toEqual([]);
    });

    it("parses agent from markdown file", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["reviewer.md"] as unknown as never);
      vi.mocked(readFile).mockResolvedValue(
        "---\ndescription: Reviews code\n---\n\n# Code Reviewer\n\nReview carefully.\n",
      );

      const agents = await adapter.import("/project");
      expect(agents).toHaveLength(1);
      expect(agents[0]!.id).toBe("reviewer");
      expect(agents[0]!.name).toBe("Code Reviewer");
    });
  });
});
