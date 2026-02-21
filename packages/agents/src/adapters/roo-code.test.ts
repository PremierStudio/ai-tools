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
import { readFile } from "node:fs/promises";
import { RooCodeAgentAdapter } from "./roo-code.js";

describe("RooCodeAgentAdapter", () => {
  let adapter: RooCodeAgentAdapter;

  const testAgent: AgentDefinition = {
    id: "reviewer",
    name: "Code Reviewer",
    instructions: "Review all code changes carefully.",
    tools: ["read", "edit", "command"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new RooCodeAgentAdapter();
  });

  describe("metadata", () => {
    it("has correct id", () => {
      expect(adapter.id).toBe("roo-code");
    });

    it("has correct name", () => {
      expect(adapter.name).toBe("Roo Code");
    });

    it("has native support", () => {
      expect(adapter.nativeSupport).toBe(true);
    });

    it("has correct configDir", () => {
      expect(adapter.configDir).toBe(".roo");
    });
  });

  describe("generate", () => {
    it("returns empty array for no agents", async () => {
      const files = await adapter.generate([]);
      expect(files).toEqual([]);
    });

    it("generates single .roomodes file", async () => {
      const files = await adapter.generate([testAgent]);
      expect(files).toHaveLength(1);
      expect(files[0]!.path).toBe(".roomodes");
    });

    it("generates file with json format", async () => {
      const files = await adapter.generate([testAgent]);
      expect(files[0]!.format).toBe("json");
    });

    it("generates valid JSON with customModes", async () => {
      const files = await adapter.generate([testAgent]);
      const parsed = JSON.parse(files[0]!.content) as {
        customModes: Array<{
          slug: string;
          name: string;
          roleDefinition: string;
          groups: string[];
        }>;
      };
      expect(parsed.customModes).toBeDefined();
      expect(parsed.customModes).toHaveLength(1);
    });

    it("maps agent id to slug", async () => {
      const files = await adapter.generate([testAgent]);
      const parsed = JSON.parse(files[0]!.content) as {
        customModes: Array<{ slug: string }>;
      };
      expect(parsed.customModes[0]!.slug).toBe("reviewer");
    });

    it("maps agent name to name", async () => {
      const files = await adapter.generate([testAgent]);
      const parsed = JSON.parse(files[0]!.content) as {
        customModes: Array<{ name: string }>;
      };
      expect(parsed.customModes[0]!.name).toBe("Code Reviewer");
    });

    it("maps agent instructions to roleDefinition", async () => {
      const files = await adapter.generate([testAgent]);
      const parsed = JSON.parse(files[0]!.content) as {
        customModes: Array<{ roleDefinition: string }>;
      };
      expect(parsed.customModes[0]!.roleDefinition).toBe("Review all code changes carefully.");
    });

    it("maps agent tools to groups", async () => {
      const files = await adapter.generate([testAgent]);
      const parsed = JSON.parse(files[0]!.content) as {
        customModes: Array<{ groups: string[] }>;
      };
      expect(parsed.customModes[0]!.groups).toEqual(["read", "edit", "command"]);
    });

    it("uses default groups when no tools provided", async () => {
      const agent: AgentDefinition = {
        id: "simple",
        name: "Simple",
        instructions: "Do stuff.",
      };
      const files = await adapter.generate([agent]);
      const parsed = JSON.parse(files[0]!.content) as {
        customModes: Array<{ groups: string[] }>;
      };
      expect(parsed.customModes[0]!.groups).toEqual(["read", "edit", "command"]);
    });

    it("generates multiple agents in single file", async () => {
      const agents: AgentDefinition[] = [
        testAgent,
        { id: "fixer", name: "Bug Fixer", instructions: "Fix bugs." },
      ];
      const files = await adapter.generate(agents);
      expect(files).toHaveLength(1);
      const parsed = JSON.parse(files[0]!.content) as {
        customModes: Array<{ slug: string }>;
      };
      expect(parsed.customModes).toHaveLength(2);
      expect(parsed.customModes[0]!.slug).toBe("reviewer");
      expect(parsed.customModes[1]!.slug).toBe("fixer");
    });

    it("content ends with newline", async () => {
      const files = await adapter.generate([testAgent]);
      expect(files[0]!.content.endsWith("\n")).toBe(true);
    });
  });

  describe("import", () => {
    it("returns empty array when .roomodes does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const agents = await adapter.import("/project");
      expect(agents).toEqual([]);
    });

    it("parses agents from .roomodes JSON", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          customModes: [
            {
              slug: "reviewer",
              name: "Code Reviewer",
              roleDefinition: "Review all code.",
              groups: ["read", "edit"],
            },
          ],
        }),
      );

      const agents = await adapter.import("/project");
      expect(agents).toHaveLength(1);
      expect(agents[0]!.id).toBe("reviewer");
      expect(agents[0]!.name).toBe("Code Reviewer");
      expect(agents[0]!.instructions).toBe("Review all code.");
      expect(agents[0]!.tools).toEqual(["read", "edit"]);
    });

    it("parses multiple agents from .roomodes", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          customModes: [
            { slug: "agent1", name: "Agent 1", roleDefinition: "Do A.", groups: ["read"] },
            { slug: "agent2", name: "Agent 2", roleDefinition: "Do B.", groups: ["edit"] },
          ],
        }),
      );

      const agents = await adapter.import("/project");
      expect(agents).toHaveLength(2);
    });

    it("handles empty customModes array", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ customModes: [] }));

      const agents = await adapter.import("/project");
      expect(agents).toEqual([]);
    });

    it("handles missing customModes key", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({}));

      const agents = await adapter.import("/project");
      expect(agents).toEqual([]);
    });

    it("imports without cwd argument", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const result = await adapter.import();
      expect(result).toEqual([]);
    });
  });

  describe("detect", () => {
    it("detects based on .roomodes file", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const result = await adapter.detect("/project");
      expect(result).toBe(true);
    });

    it("returns false when .roomodes does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const result = await adapter.detect("/project");
      expect(result).toBe(false);
    });

    it("detects without cwd argument", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const result = await adapter.detect();
      expect(result).toBe(false);
    });
  });
});
