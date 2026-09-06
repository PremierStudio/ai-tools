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

import { GrokAgentAdapter } from "./grok.js";

describe("GrokAgentAdapter", () => {
  let adapter: GrokAgentAdapter;

  beforeEach(() => {
    adapter = new GrokAgentAdapter();
  });

  it("writes markdown agents under .grok/agents", async () => {
    expect(adapter.id).toBe("grok");
    expect(adapter.configDir).toBe(".grok/agents");
    const files = await adapter.generate([
      { id: "explore", name: "Explore", instructions: "Search the repo." },
    ]);
    expect(files[0]?.path).toBe(".grok/agents/explore.md");
    expect(String(files[0]?.content)).toContain("# Explore");
    expect(String(files[0]?.content)).toContain("Search the repo.");
  });
});
