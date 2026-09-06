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

vi.mock("node:fs", () => ({ existsSync: vi.fn(() => false) }));
vi.mock("node:fs/promises", () => ({ readFile: vi.fn(), readdir: vi.fn() }));

import { ZcodeAgentAdapter } from "./zcode.js";

describe("ZcodeAgentAdapter", () => {
  it("writes markdown agents under .zcode/agents", async () => {
    const adapter = new ZcodeAgentAdapter();
    expect(adapter.id).toBe("zcode");
    expect(adapter.configDir).toBe(".zcode/agents");
    const files = await adapter.generate([
      { id: "reviewer", name: "Reviewer", instructions: "Review diffs." },
    ]);
    expect(files[0]?.path).toBe(".zcode/agents/reviewer.md");
  });
});
