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
import { ClaudeCodeAgentAdapter } from "./claude-code.js";

describe("ClaudeCodeAgentAdapter", () => {
  let adapter: ClaudeCodeAgentAdapter;

  const testAgent: AgentDefinition = {
    id: "reviewer",
    name: "Code Reviewer",
    description: "Reviews code for quality",
    instructions: "Review all code changes carefully.",
    model: "claude-sonnet-4-20250514",
    tools: ["Read", "Grep"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new ClaudeCodeAgentAdapter();
  });

  describe("metadata", () => {
    it("has correct id", () => {
      expect(adapter.id).toBe("claude-code");
    });

    it("has correct name", () => {
      expect(adapter.name).toBe("Claude Code");
    });

    it("has native support", () => {
      expect(adapter.nativeSupport).toBe(true);
    });

    it("has correct configDir", () => {
      expect(adapter.configDir).toBe(".claude/agents");
    });
  });

  describe("generate", () => {
    it("returns empty array for no agents", async () => {
      const files = await adapter.generate([]);
      expect(files).toEqual([]);
    });

    it("generates one file per agent", async () => {
      const files = await adapter.generate([testAgent]);
      expect(files).toHaveLength(1);
    });

    it("generates file at correct path", async () => {
      const files = await adapter.generate([testAgent]);
      expect(files[0]!.path).toBe(".claude/agents/reviewer.md");
    });

    it("generates file with md format", async () => {
      const files = await adapter.generate([testAgent]);
      expect(files[0]!.format).toBe("md");
    });

    it("includes frontmatter with description", async () => {
      const files = await adapter.generate([testAgent]);
      expect(files[0]!.content).toContain("description: Reviews code for quality");
    });

    it("includes frontmatter with model", async () => {
      const files = await adapter.generate([testAgent]);
      expect(files[0]!.content).toContain("model: claude-sonnet-4-20250514");
    });

    it("includes frontmatter with tools", async () => {
      const files = await adapter.generate([testAgent]);
      expect(files[0]!.content).toContain("tools:");
      expect(files[0]!.content).toContain("  - Read");
      expect(files[0]!.content).toContain("  - Grep");
    });

    it("includes agent name as heading", async () => {
      const files = await adapter.generate([testAgent]);
      expect(files[0]!.content).toContain("# Code Reviewer");
    });

    it("includes instructions in body", async () => {
      const files = await adapter.generate([testAgent]);
      expect(files[0]!.content).toContain("Review all code changes carefully.");
    });

    it("wraps content in frontmatter delimiters", async () => {
      const files = await adapter.generate([testAgent]);
      expect(files[0]!.content.startsWith("---\n")).toBe(true);
      expect(files[0]!.content).toContain("\n---\n");
    });

    it("generates multiple agent files", async () => {
      const agents: AgentDefinition[] = [
        testAgent,
        { id: "fixer", name: "Bug Fixer", instructions: "Fix bugs." },
      ];
      const files = await adapter.generate(agents);
      expect(files).toHaveLength(2);
      expect(files[0]!.path).toBe(".claude/agents/reviewer.md");
      expect(files[1]!.path).toBe(".claude/agents/fixer.md");
    });

    it("omits description from frontmatter when not provided", async () => {
      const agent: AgentDefinition = { id: "simple", name: "Simple", instructions: "Do stuff." };
      const files = await adapter.generate([agent]);
      expect(files[0]!.content).not.toContain("description:");
    });

    it("omits model from frontmatter when not provided", async () => {
      const agent: AgentDefinition = { id: "simple", name: "Simple", instructions: "Do stuff." };
      const files = await adapter.generate([agent]);
      expect(files[0]!.content).not.toContain("model:");
    });

    it("omits tools from frontmatter when not provided", async () => {
      const agent: AgentDefinition = { id: "simple", name: "Simple", instructions: "Do stuff." };
      const files = await adapter.generate([agent]);
      expect(files[0]!.content).not.toContain("tools:");
    });
  });

  describe("import", () => {
    it("returns empty array when config dir does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const agents = await adapter.import("/project");
      expect(agents).toEqual([]);
    });

    it("returns empty array when directory has no md files", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue([] as unknown as never);
      const agents = await adapter.import("/project");
      expect(agents).toEqual([]);
    });

    it("parses agent from markdown file with frontmatter", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["reviewer.md"] as unknown as never);
      vi.mocked(readFile).mockResolvedValue(
        "---\ndescription: Reviews code\nmodel: claude-sonnet-4-20250514\ntools:\n  - Read\n  - Grep\n---\n\n# Code Reviewer\n\nReview all code carefully.\n",
      );

      const agents = await adapter.import("/project");
      expect(agents).toHaveLength(1);
      expect(agents[0]!.id).toBe("reviewer");
      expect(agents[0]!.name).toBe("Code Reviewer");
      expect(agents[0]!.description).toBe("Reviews code");
      expect(agents[0]!.model).toBe("claude-sonnet-4-20250514");
      expect(agents[0]!.tools).toEqual(["Read", "Grep"]);
      expect(agents[0]!.instructions).toBe("Review all code carefully.");
    });

    it("skips non-md files", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["README.txt", "agent.md"] as unknown as never);
      vi.mocked(readFile).mockResolvedValue(
        "---\ndescription: Test\n---\n\n# Agent\n\nInstructions.\n",
      );

      const agents = await adapter.import("/project");
      expect(agents).toHaveLength(1);
    });

    it("uses filename as id", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["my-custom-agent.md"] as unknown as never);
      vi.mocked(readFile).mockResolvedValue("---\n---\n\n# Custom Agent\n\nDo things.\n");

      const agents = await adapter.import("/project");
      expect(agents[0]!.id).toBe("my-custom-agent");
    });

    it("handles file without frontmatter", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["plain.md"] as unknown as never);
      vi.mocked(readFile).mockResolvedValue("# Plain Agent\n\nJust instructions.\n");

      const agents = await adapter.import("/project");
      expect(agents).toHaveLength(1);
      expect(agents[0]!.id).toBe("plain");
      expect(agents[0]!.name).toBe("Plain Agent");
      expect(agents[0]!.instructions).toBe("Just instructions.");
    });

    it("imports without cwd argument", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const agents = await adapter.import();
      expect(agents).toEqual([]);
    });

    it("handles file without frontmatter and without heading", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["raw.md"] as unknown as never);
      vi.mocked(readFile).mockResolvedValue("Just raw content, no heading no frontmatter.\n");

      const agents = await adapter.import("/project");
      expect(agents).toHaveLength(1);
      expect(agents[0]!.id).toBe("raw");
      expect(agents[0]!.name).toBe("raw");
      expect(agents[0]!.instructions).toBe("Just raw content, no heading no frontmatter.");
    });

    it("ignores unknown array keys in frontmatter", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["agent.md"] as unknown as never);
      vi.mocked(readFile).mockResolvedValue(
        "---\ndescription: A test agent\nunknown_key:\n  - item1\n  - item2\ntools:\n  - read\n  - edit\nmodel: gpt-4\n---\n\n# Test Agent\n\nInstructions here.\n",
      );

      const agents = await adapter.import("/project");
      expect(agents).toHaveLength(1);
      expect(agents[0]!.description).toBe("A test agent");
      expect(agents[0]!.tools).toEqual(["read", "edit"]);
      expect(agents[0]!.model).toBe("gpt-4");
      expect(agents[0]!.name).toBe("Test Agent");
      expect(agents[0]!.instructions).toBe("Instructions here.");
    });
  });
});
