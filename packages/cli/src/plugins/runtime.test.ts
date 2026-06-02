import { describe, expect, it, vi } from "vitest";

const mcpRegistry = { list: () => ["codex"], get: () => undefined, detectAll: vi.fn() };
const skillsRegistry = { list: () => ["codex"], get: () => undefined, detectAll: vi.fn() };
const rulesRegistry = { list: () => ["codex"], get: () => undefined, detectAll: vi.fn() };
const agentsRegistry = { list: () => ["codex"], get: () => undefined, detectAll: vi.fn() };
const hooksRegistry = { list: () => ["codex"], get: () => undefined, detectAll: vi.fn() };

vi.mock("@premierstudio/ai-tools-mcp/adapters/all", () => ({}));
vi.mock("@premierstudio/ai-tools-skills/adapters/all", () => ({}));
vi.mock("@premierstudio/ai-tools-rules/adapters/all", () => ({}));
vi.mock("@premierstudio/ai-tools-agents/adapters/all", () => ({}));
vi.mock("@premierstudio/ai-tools-hooks/adapters/all", () => ({}));

vi.mock("@premierstudio/ai-tools-mcp", () => ({ registry: mcpRegistry }));
vi.mock("@premierstudio/ai-tools-skills", () => ({ registry: skillsRegistry }));
vi.mock("@premierstudio/ai-tools-rules", () => ({ registry: rulesRegistry }));
vi.mock("@premierstudio/ai-tools-agents", () => ({ registry: agentsRegistry }));
vi.mock("@premierstudio/ai-tools-hooks", () => ({ registry: hooksRegistry }));

describe("plugin runtime", () => {
  it("loads all engine registries after side-effect adapter modules", async () => {
    const { loadEngineRegistries } = await import("./runtime.js");

    const registries = await loadEngineRegistries();

    expect(registries).toEqual({
      mcp: mcpRegistry,
      skills: skillsRegistry,
      rules: rulesRegistry,
      agents: agentsRegistry,
      hooks: hooksRegistry,
    });
  });

  it("lists every plugin engine in install order", async () => {
    const { getAllPluginEngines } = await import("./runtime.js");

    expect(getAllPluginEngines()).toEqual(["mcp", "skills", "rules", "agents", "hooks"]);
  });
});
