import { describe, it, expect, vi } from "vitest";

vi.mock("./registry.js", () => ({ registry: { register: vi.fn() } }));
vi.mock("node:fs", () => ({ existsSync: vi.fn(() => false) }));
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}));

import { ZcodeRuleAdapter } from "./zcode.js";

describe("ZcodeRuleAdapter", () => {
  it("writes markdown rules under .zcode/rules", async () => {
    const adapter = new ZcodeRuleAdapter();
    expect(adapter.id).toBe("zcode");
    expect(adapter.configDir).toBe(".zcode/rules");
    const files = await adapter.generate([
      { id: "style", name: "Style", content: "Be terse.", scope: { type: "always" } },
    ]);
    expect(files[0]?.path).toBe(".zcode/rules/style.md");
  });
});
