import { beforeEach, describe, expect, it, vi } from "vitest";

const buildPluginInstallPlan = vi.fn();
const loadEngineRegistries = vi.fn();

vi.mock("./plan.js", () => ({
  buildPluginInstallPlan,
}));

vi.mock("./runtime.js", () => ({
  loadEngineRegistries,
}));

const plugin = {
  id: "release-confidence",
  name: "Release Confidence",
  version: "0.1.0",
  mcpServers: [{ id: "api", name: "API", transport: { type: "stdio", command: "api-mcp" } }],
  skills: [{ id: "tdd", name: "TDD", content: "Test first." }],
  hooks: [
    { id: "audit", name: "Audit", events: ["prompt:submit"], phase: "before", handler: vi.fn() },
  ],
};

const readyTarget = {
  toolId: "codex",
  toolName: "Codex",
  detected: true,
  selected: true,
  installable: true,
  host: {
    id: "codex",
    name: "Codex",
    kind: "cli",
    nativeEngineSupport: {},
    supportsInteractiveApps: false,
    supportsNativeBundles: false,
    notes: "Codex host",
  },
  engines: [
    {
      engine: "mcp",
      requested: true,
      nativeHostSupport: true,
      adapterAvailable: true,
      detected: true,
      status: "ready",
    },
    {
      engine: "skills",
      requested: true,
      nativeHostSupport: true,
      adapterAvailable: true,
      detected: true,
      status: "ready",
    },
    {
      engine: "rules",
      requested: false,
      nativeHostSupport: true,
      adapterAvailable: true,
      detected: true,
      status: "not-requested",
    },
  ],
};

const plan = {
  plugin: { id: plugin.id, name: plugin.name, version: plugin.version },
  requestedEngines: ["mcp", "skills"],
  targets: [readyTarget],
};

function adapter(files: { path: string; content: string; format: string }[], fail = false) {
  return {
    id: "codex",
    detect: vi.fn(),
    generate: vi.fn().mockResolvedValue(files),
    install: fail
      ? vi.fn().mockRejectedValue(new Error("install failed"))
      : vi.fn().mockResolvedValue(undefined),
  };
}

describe("installPluginBundle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildPluginInstallPlan.mockResolvedValue(plan);
  });

  it("returns the plan without installing files in dry-run mode", async () => {
    const mcpAdapter = adapter([{ path: ".codex/mcp.json", content: "{}", format: "json" }]);
    loadEngineRegistries.mockResolvedValue({
      mcp: { get: () => mcpAdapter },
      skills: { get: () => undefined },
      rules: { get: () => undefined },
      agents: { get: () => undefined },
      hooks: { get: () => undefined },
    });
    const { installPluginBundle } = await import("./install.js");

    const result = await installPluginBundle(plugin, { dryRun: true, tools: ["codex"] });

    expect(result).toEqual({ plan, installed: [], failed: [] });
    expect(mcpAdapter.generate).not.toHaveBeenCalled();
  });

  it("installs ready engines and de-duplicates generated paths", async () => {
    const mcpAdapter = adapter([
      { path: ".codex/mcp.json", content: "{}", format: "json" },
      { path: ".codex/mcp.json", content: "{}", format: "json" },
    ]);
    const skillsAdapter = adapter([
      { path: ".codex/skills/tdd/SKILL.md", content: "Test first.", format: "md" },
    ]);
    loadEngineRegistries.mockResolvedValue({
      mcp: { get: () => mcpAdapter },
      skills: { get: () => skillsAdapter },
      rules: { get: () => undefined },
      agents: { get: () => undefined },
      hooks: { get: () => undefined },
    });
    const { installPluginBundle } = await import("./install.js");

    const result = await installPluginBundle(plugin, { tools: ["codex"], force: true });

    expect(result.failed).toEqual([]);
    expect(result.installed).toEqual([
      {
        toolId: "codex",
        toolName: "Codex",
        engine: "mcp",
        filePaths: [".codex/mcp.json"],
      },
      {
        toolId: "codex",
        toolName: "Codex",
        engine: "skills",
        filePaths: [".codex/skills/tdd/SKILL.md"],
      },
    ]);
  });

  it("records install failures without aborting the bundle", async () => {
    const mcpAdapter = adapter([{ path: ".codex/mcp.json", content: "{}", format: "json" }], true);
    const skillsAdapter = adapter([
      { path: ".codex/skills/tdd/SKILL.md", content: "Test first.", format: "md" },
    ]);
    loadEngineRegistries.mockResolvedValue({
      mcp: { get: () => mcpAdapter },
      skills: { get: () => skillsAdapter },
      rules: { get: () => undefined },
      agents: { get: () => undefined },
      hooks: { get: () => undefined },
    });
    const { installPluginBundle } = await import("./install.js");

    const result = await installPluginBundle(plugin);

    expect(result.installed).toHaveLength(1);
    expect(result.failed).toEqual([
      {
        toolId: "codex",
        toolName: "Codex",
        engine: "mcp",
        error: "install failed",
      },
    ]);
  });
});
