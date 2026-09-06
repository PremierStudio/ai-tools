import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./registry.js", () => ({ registry: { register: vi.fn() } }));
vi.mock("node:fs", () => ({ existsSync: vi.fn(() => false) }));
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}));

import { GrokRuleAdapter } from "./grok.js";

describe("GrokRuleAdapter", () => {
  it("writes markdown rules under .grok/rules", async () => {
    const adapter = new GrokRuleAdapter();
    expect(adapter.id).toBe("grok");
    expect(adapter.configDir).toBe(".grok/rules");
    const files = await adapter.generate([
      { id: "ts-strict", name: "TypeScript strict", content: "No any.", scope: { type: "always" } },
    ]);
    expect(files[0]?.path).toBe(".grok/rules/ts-strict.md");
    expect(files[0]?.content).toBe("# TypeScript strict\n\nNo any.\n");
  });
});
