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
import { CodexAgentAdapter } from "./codex.js";

describe("CodexAgentAdapter", () => {
  let adapter: CodexAgentAdapter;

  const testAgent: AgentDefinition = {
    id: "reviewer",
    name: "Code Reviewer",
    description: "Reviews code for correctness and missing tests.",
    instructions: "Review code like an owner.\nPrioritize correctness.",
    model: "gpt-5.5",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new CodexAgentAdapter();
  });

  describe("metadata", () => {
    it("targets Codex custom agents", () => {
      expect(adapter.id).toBe("codex");
      expect(adapter.name).toBe("Codex");
      expect(adapter.nativeSupport).toBe(true);
      expect(adapter.configDir).toBe(".codex/agents");
      expect(adapter.command).toBe("codex");
    });
  });

  describe("generate", () => {
    it("returns empty array for no agents", async () => {
      await expect(adapter.generate([])).resolves.toEqual([]);
    });

    it("writes one TOML file per Codex custom agent", async () => {
      const files = await adapter.generate([testAgent]);

      expect(files).toEqual([
        {
          path: ".codex/agents/reviewer.toml",
          format: "toml",
          content: expect.stringContaining('name = "Code Reviewer"'),
        },
      ]);
    });

    it("emits required Codex custom agent fields", async () => {
      const files = await adapter.generate([testAgent]);
      const content = files[0]!.content;

      expect(content).toContain('name = "Code Reviewer"');
      expect(content).toContain('description = "Reviews code for correctness and missing tests."');
      expect(content).toContain(
        'developer_instructions = "Review code like an owner.\\nPrioritize correctness."',
      );
      expect(content).toContain('model = "gpt-5.5"');
    });

    it("omits optional model when not provided", async () => {
      const files = await adapter.generate([
        { id: "worker", name: "Worker", instructions: "Implement focused changes." },
      ]);

      expect(files[0]!.content).not.toContain("model =");
    });
  });

  describe("import", () => {
    it("returns empty array when config dir does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await expect(adapter.import("/project")).resolves.toEqual([]);
    });

    it("imports TOML custom agents", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["reviewer.toml"] as unknown as never);
      vi.mocked(readFile).mockResolvedValue(
        'name = "Code Reviewer"\n' +
          'description = "Reviews code."\n' +
          'developer_instructions = "Review carefully.\\nFind bugs."\n' +
          'model = "gpt-5.5"\n',
      );

      const agents = await adapter.import("/project");

      expect(agents).toEqual([
        {
          id: "reviewer",
          name: "Code Reviewer",
          description: "Reviews code.",
          instructions: "Review carefully.\nFind bugs.",
          model: "gpt-5.5",
        },
      ]);
    });

    it("skips non-TOML files", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue(["README.md", "worker.toml"] as unknown as never);
      vi.mocked(readFile).mockResolvedValue(
        'name = "Worker"\ndeveloper_instructions = "Do the work."\n',
      );

      const agents = await adapter.import("/project");

      expect(agents).toHaveLength(1);
      expect(agents[0]!.id).toBe("worker");
    });
  });
});
