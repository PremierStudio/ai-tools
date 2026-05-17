import { describe, it, expect, beforeEach } from "vitest";
import { AntigravityCliRuleAdapter } from "./antigravity-cli.js";

describe("AntigravityCliRuleAdapter", () => {
  let adapter: AntigravityCliRuleAdapter;

  beforeEach(() => {
    adapter = new AntigravityCliRuleAdapter();
  });

  it("targets Antigravity workspace rules", () => {
    expect(adapter.id).toBe("antigravity-cli");
    expect(adapter.name).toBe("Antigravity CLI");
    expect(adapter.configDir).toBe(".agents/rules");
    expect(adapter.command).toBe("antigravity");
  });

  it("generates markdown rule files under .agents/rules", async () => {
    const files = await adapter.generate([
      {
        id: "testing",
        name: "Testing",
        content: "Use TDD and verify the failing test first.",
        scope: { type: "always" },
      },
    ]);

    expect(files[0]!.path).toBe(".agents/rules/testing.md");
    expect(files[0]!.content).toContain("# Testing");
  });
});
