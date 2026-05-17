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

import { AntigravityCliAgentAdapter } from "./antigravity-cli.js";

describe("AntigravityCliAgentAdapter", () => {
  let adapter: AntigravityCliAgentAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new AntigravityCliAgentAdapter();
  });

  it("targets Antigravity agent templates", async () => {
    expect(adapter.id).toBe("antigravity-cli");
    expect(adapter.name).toBe("Antigravity CLI");
    expect(adapter.configDir).toBe(".agents/agents");
  });

  it("generates markdown agent files under .agents/agents", async () => {
    const files = await adapter.generate([
      {
        id: "reviewer",
        name: "Reviewer",
        description: "Reviews code.",
        instructions: "Review correctness and tests.",
      },
    ]);

    expect(files[0]!.path).toBe(".agents/agents/reviewer.md");
    expect(files[0]!.content).toContain("description: Reviews code.");
    expect(files[0]!.content).toContain("# Reviewer");
  });
});
