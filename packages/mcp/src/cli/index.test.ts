import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { BaseMCPAdapter } from "../adapters/base.js";
import type { MCPServerDefinition, GeneratedFile } from "../types/index.js";

const {
  mockRegistryDetectAll,
  mockRegistryList,
  mockRegistryGet,
  mockRegistryGetAll,
  mockWriteFile,
  mockMkdir,
} = vi.hoisted(() => ({
  mockRegistryDetectAll: vi.fn(),
  mockRegistryList: vi.fn(),
  mockRegistryGet: vi.fn(),
  mockRegistryGetAll: vi.fn(),
  mockWriteFile: vi.fn(),
  mockMkdir: vi.fn(),
}));

vi.mock("../adapters/all.js", () => ({}));

vi.mock("../adapters/registry.js", () => ({
  registry: {
    detectAll: (...args: unknown[]) => mockRegistryDetectAll(...args),
    list: () => mockRegistryList(),
    get: (id: string) => mockRegistryGet(id),
    getAll: () => mockRegistryGetAll(),
  },
}));

vi.mock("node:fs/promises", () => ({
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
}));

import { run } from "./index.js";

function makeAdapter(overrides: Partial<BaseMCPAdapter> = {}): BaseMCPAdapter {
  return {
    id: overrides.id ?? "test-tool",
    name: overrides.name ?? "Test Tool",
    nativeSupport: overrides.nativeSupport ?? true,
    configPath: overrides.configPath ?? ".test/mcp.json",
    generate:
      overrides.generate ??
      vi
        .fn<(servers: MCPServerDefinition[]) => Promise<GeneratedFile[]>>()
        .mockResolvedValue([{ path: ".test/mcp.json", content: "{}", format: "json" }]),
    import:
      overrides.import ??
      vi.fn<(cwd?: string) => Promise<MCPServerDefinition[]>>().mockResolvedValue([]),
    detect: overrides.detect ?? vi.fn<(cwd?: string) => Promise<boolean>>().mockResolvedValue(true),
    install:
      overrides.install ??
      vi.fn<(files: GeneratedFile[], cwd?: string) => Promise<void>>().mockResolvedValue(undefined),
    uninstall:
      overrides.uninstall ?? vi.fn<(cwd?: string) => Promise<void>>().mockResolvedValue(undefined),
  } as unknown as BaseMCPAdapter;
}

let logOutput: string[];
let errorOutput: string[];
let warnOutput: string[];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalExit = process.exit;

beforeEach(() => {
  logOutput = [];
  errorOutput = [];
  warnOutput = [];
  exitCode = undefined;

  console.log = vi.fn((...args: unknown[]) => {
    logOutput.push(args.map(String).join(" "));
  });
  console.error = vi.fn((...args: unknown[]) => {
    errorOutput.push(args.map(String).join(" "));
  });
  console.warn = vi.fn((...args: unknown[]) => {
    warnOutput.push(args.map(String).join(" "));
  });
  process.exit = vi.fn((code?: number) => {
    exitCode = code ?? 0;
    throw new Error(`process.exit(${code})`);
  }) as never;

  vi.clearAllMocks();
  mockWriteFile.mockResolvedValue(undefined);
  mockMkdir.mockResolvedValue(undefined);
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  console.warn = originalWarn;
  process.exit = originalExit;
});

function allLog(): string {
  return logOutput.join("\n");
}

function allError(): string {
  return errorOutput.join("\n");
}

function allWarn(): string {
  return warnOutput.join("\n");
}

describe("run() - help output", () => {
  it('prints help text for "help" command', async () => {
    await run(["help"]);
    expect(allLog()).toContain("ai-mcp - Universal MCP server configuration");
    expect(allLog()).toContain("USAGE:");
    expect(allLog()).toContain("COMMANDS:");
    expect(allLog()).toContain("OPTIONS:");
    expect(allLog()).toContain("EXAMPLES:");
  });

  it("prints help text for --help flag", async () => {
    await run(["--help"]);
    expect(allLog()).toContain("ai-mcp - Universal MCP server configuration");
  });

  it("prints help text for -h flag", async () => {
    await run(["-h"]);
    expect(allLog()).toContain("ai-mcp - Universal MCP server configuration");
  });

  it("prints help text when no arguments are provided", async () => {
    await run([]);
    expect(allLog()).toContain("ai-mcp - Universal MCP server configuration");
  });

  it("includes all documented commands in help text", async () => {
    await run(["help"]);
    const output = allLog();
    for (const cmd of [
      "init",
      "detect",
      "generate",
      "install",
      "import",
      "sync",
      "export",
      "help",
    ]) {
      expect(output).toContain(cmd);
    }
  });
});

describe("run() - unknown command", () => {
  it("prints error and help, then exits with code 1", async () => {
    await expect(run(["foobar"])).rejects.toThrow("process.exit(1)");
    expect(allError()).toContain("Unknown command: foobar");
    expect(allLog()).toContain("USAGE:");
    expect(exitCode).toBe(1);
  });
});

describe("run() - detect command", () => {
  it("shows detection header", async () => {
    mockRegistryDetectAll.mockResolvedValue([]);
    mockRegistryList.mockReturnValue([]);
    await run(["detect"]);
    expect(allLog()).toContain("Detecting AI coding tools with MCP support...");
  });

  it("lists detected and missing tools", async () => {
    const detected = makeAdapter({ id: "claude-code", name: "Claude Code" });
    const missing = makeAdapter({ id: "codex", name: "Codex" });

    mockRegistryDetectAll.mockResolvedValue([detected]);
    mockRegistryList.mockReturnValue(["claude-code", "codex"]);
    mockRegistryGet.mockImplementation((id: string) => {
      if (id === "claude-code") return detected;
      if (id === "codex") return missing;
      return undefined;
    });

    await run(["detect"]);
    const output = allLog();
    expect(output).toContain("\u2713");
    expect(output).toContain("Claude Code");
    expect(output).toContain("\u2717");
    expect(output).toContain("Codex");
  });

  it("shows detection summary with counts", async () => {
    const adapter = makeAdapter({ id: "claude-code", name: "Claude Code" });
    mockRegistryDetectAll.mockResolvedValue([adapter]);
    mockRegistryList.mockReturnValue(["claude-code", "codex", "gemini-cli"]);
    mockRegistryGet.mockReturnValue(adapter);

    await run(["detect"]);
    expect(allLog()).toContain("Detected 1/3 tools");
  });
});

describe("run() - generate command", () => {
  it("prints message when no tools detected and no --tools flag", async () => {
    mockRegistryDetectAll.mockResolvedValue([]);

    await run(["generate"]);
    expect(allLog()).toContain("No AI tools detected");
    expect(allLog()).toContain("--tools");
  });

  it("generates configs for detected adapters", async () => {
    const adapter = makeAdapter({ id: "claude-code", name: "Claude Code" });
    mockRegistryDetectAll.mockResolvedValue([adapter]);

    await run(["generate"]);
    expect(allLog()).toContain("Generating MCP configs for 1 tool(s)");
    expect(allLog()).toContain("Generated: .test/mcp.json");
    expect(allLog()).toContain("Done!");
  });

  it("respects --dry-run and does not write files", async () => {
    const adapter = makeAdapter({ id: "claude-code", name: "Claude Code" });
    mockRegistryDetectAll.mockResolvedValue([adapter]);

    await run(["generate", "--dry-run"]);
    expect(allLog()).toContain("[dry-run] Would write: .test/mcp.json");
    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(mockMkdir).not.toHaveBeenCalled();
  });

  it("uses --tools flag to resolve specific adapters", async () => {
    const adapter = makeAdapter({ id: "claude-code", name: "Claude Code" });
    mockRegistryGet.mockImplementation((id: string) => {
      if (id === "claude-code") return adapter;
      return undefined;
    });

    await run(["generate", "--tools=claude-code"]);
    expect(allLog()).toContain("Generating MCP configs for 1 tool(s)");
    expect(mockRegistryDetectAll).not.toHaveBeenCalled();
  });

  it("warns for unknown adapter IDs in --tools flag", async () => {
    mockRegistryGet.mockReturnValue(undefined);

    await run(["generate", "--tools=nonexistent"]);
    expect(allWarn()).toContain('Warning: Unknown adapter "nonexistent"');
    expect(allLog()).toContain("No AI tools detected");
  });
});

describe("run() - install command", () => {
  it("prints message when no tools detected", async () => {
    mockRegistryDetectAll.mockResolvedValue([]);

    await run(["install"]);
    expect(allLog()).toContain("No AI tools detected");
  });

  it("installs MCP servers into detected tools", async () => {
    const installFn = vi
      .fn<(files: GeneratedFile[], cwd?: string) => Promise<void>>()
      .mockResolvedValue(undefined);
    const adapter = makeAdapter({
      id: "claude-code",
      name: "Claude Code",
      install: installFn,
    });

    mockRegistryDetectAll.mockResolvedValue([adapter]);

    await run(["install"]);
    expect(installFn).toHaveBeenCalled();
    expect(allLog()).toContain("Installing MCP servers into 1 tool(s)");
    expect(allLog()).toContain("\u2713 Claude Code");
    expect(allLog()).toContain("MCP servers installed!");
  });

  it("respects --dry-run and does not call install", async () => {
    const installFn = vi
      .fn<(files: GeneratedFile[], cwd?: string) => Promise<void>>()
      .mockResolvedValue(undefined);
    const adapter = makeAdapter({
      id: "claude-code",
      name: "Claude Code",
      install: installFn,
      generate: vi
        .fn<(servers: MCPServerDefinition[]) => Promise<GeneratedFile[]>>()
        .mockResolvedValue([{ path: ".mcp.json", content: "{}", format: "json" }]),
    });

    mockRegistryDetectAll.mockResolvedValue([adapter]);

    await run(["install", "--dry-run"]);
    expect(installFn).not.toHaveBeenCalled();
    expect(allLog()).toContain("[dry-run] Would install: .mcp.json");
  });

  it("skips undetected tool in --tools and warns", async () => {
    const adapter = makeAdapter({
      id: "kiro",
      name: "Kiro",
      detect: vi.fn<(cwd?: string) => Promise<boolean>>().mockResolvedValue(false),
    });

    mockRegistryGet.mockImplementation((id: string) => {
      if (id === "kiro") return adapter;
      return undefined;
    });

    await run(["install", "--tools=kiro"]);
    expect(allWarn()).toContain("Kiro not detected, skipping");
    expect(allWarn()).toContain("--force");
    expect(allLog()).toContain("No AI tools detected");
  });

  it("--force bypasses detection check for --tools", async () => {
    const installFn = vi
      .fn<(files: GeneratedFile[], cwd?: string) => Promise<void>>()
      .mockResolvedValue(undefined);
    const adapter = makeAdapter({
      id: "kiro",
      name: "Kiro",
      detect: vi.fn<(cwd?: string) => Promise<boolean>>().mockResolvedValue(false),
      install: installFn,
    });

    mockRegistryGet.mockImplementation((id: string) => {
      if (id === "kiro") return adapter;
      return undefined;
    });

    await run(["install", "--tools=kiro", "--force"]);
    expect(installFn).toHaveBeenCalled();
    expect(allLog()).toContain("Installing MCP servers into 1 tool(s)");
  });
});

describe("run() - export command", () => {
  it("exports servers as JSON to stdout", async () => {
    const servers: MCPServerDefinition[] = [
      {
        id: "test",
        name: "test",
        transport: { type: "stdio", command: "npx", args: ["-y", "test"] },
      },
    ];
    const adapter = makeAdapter({
      id: "claude-code",
      name: "Claude Code",
      import: vi.fn<(cwd?: string) => Promise<MCPServerDefinition[]>>().mockResolvedValue(servers),
    });

    mockRegistryDetectAll.mockResolvedValue([adapter]);

    await run(["export"]);
    const output = allLog();
    expect(output).toContain('"id": "test"');
    expect(output).toContain('"command": "npx"');
  });

  it("uses --tools flag", async () => {
    const adapter = makeAdapter({
      id: "claude-code",
      name: "Claude Code",
      import: vi.fn<(cwd?: string) => Promise<MCPServerDefinition[]>>().mockResolvedValue([]),
    });
    mockRegistryGet.mockImplementation((id: string) => {
      if (id === "claude-code") return adapter;
      return undefined;
    });

    await run(["export", "--tools=claude-code"]);
    expect(mockRegistryDetectAll).not.toHaveBeenCalled();
  });
});

describe("run() - import command", () => {
  it("imports servers from a detected tool", async () => {
    const servers: MCPServerDefinition[] = [
      {
        id: "test",
        name: "test",
        transport: { type: "stdio", command: "npx", args: ["-y", "test"] },
      },
    ];
    const adapter = makeAdapter({
      id: "claude-code",
      name: "Claude Code",
      import: vi.fn<(cwd?: string) => Promise<MCPServerDefinition[]>>().mockResolvedValue(servers),
    });

    mockRegistryDetectAll.mockResolvedValue([adapter]);

    await run(["import"]);
    expect(allLog()).toContain("Imported 1 server(s) from Claude Code");
  });

  it("prints message when no tools detected", async () => {
    mockRegistryDetectAll.mockResolvedValue([]);

    await run(["import"]);
    expect(allLog()).toContain("No AI tools detected");
  });
});

describe("run() - sync command", () => {
  it("syncs servers across detected tools", async () => {
    const servers: MCPServerDefinition[] = [
      {
        id: "test",
        name: "test",
        transport: { type: "stdio", command: "npx", args: ["-y", "test"] },
      },
    ];
    const importFn = vi
      .fn<(cwd?: string) => Promise<MCPServerDefinition[]>>()
      .mockResolvedValue(servers);
    const installFn = vi
      .fn<(files: GeneratedFile[], cwd?: string) => Promise<void>>()
      .mockResolvedValue(undefined);
    const adapter1 = makeAdapter({
      id: "claude-code",
      name: "Claude Code",
      import: importFn,
      install: installFn,
    });
    const adapter2 = makeAdapter({
      id: "cursor",
      name: "Cursor",
      install: installFn,
    });

    mockRegistryDetectAll.mockResolvedValue([adapter1, adapter2]);

    await run(["sync"]);
    expect(allLog()).toContain("Syncing MCP servers across 2 tool(s)");
    expect(allLog()).toContain("Sync complete!");
  });

  it("respects --dry-run", async () => {
    const servers: MCPServerDefinition[] = [
      {
        id: "test",
        name: "test",
        transport: { type: "stdio", command: "npx", args: ["-y", "test"] },
      },
    ];
    const importFn = vi
      .fn<(cwd?: string) => Promise<MCPServerDefinition[]>>()
      .mockResolvedValue(servers);
    const installFn = vi
      .fn<(files: GeneratedFile[], cwd?: string) => Promise<void>>()
      .mockResolvedValue(undefined);
    const adapter1 = makeAdapter({
      id: "claude-code",
      name: "Claude Code",
      import: importFn,
      install: installFn,
    });

    mockRegistryDetectAll.mockResolvedValue([adapter1]);

    await run(["sync", "--dry-run"]);
    expect(installFn).not.toHaveBeenCalled();
  });
});

describe("run() - flag parsing", () => {
  it("parses --tools flag with = syntax", async () => {
    const adapter = makeAdapter({ id: "claude-code", name: "Claude Code" });
    mockRegistryGet.mockImplementation((id: string) => {
      if (id === "claude-code") return adapter;
      return undefined;
    });

    await run(["generate", "--tools=claude-code"]);
    expect(mockRegistryGet).toHaveBeenCalledWith("claude-code");
    expect(mockRegistryDetectAll).not.toHaveBeenCalled();
  });

  it("parses --dry-run flag", async () => {
    mockRegistryDetectAll.mockResolvedValue([]);
    await run(["generate", "--dry-run"]);
    // No error means flag was parsed
  });

  it("parses --force flag", async () => {
    const adapter = makeAdapter({
      id: "kiro",
      name: "Kiro",
      detect: vi.fn<(cwd?: string) => Promise<boolean>>().mockResolvedValue(false),
    });
    mockRegistryGet.mockImplementation((id: string) => {
      if (id === "kiro") return adapter;
      return undefined;
    });

    await run(["generate", "--tools=kiro", "--force"]);
    expect(allLog()).toContain("Generating MCP configs for 1 tool(s)");
  });
});

describe("run() - error propagation", () => {
  it("propagates adapter generate errors", async () => {
    const adapter = makeAdapter({
      id: "broken",
      name: "Broken",
      generate: vi
        .fn<(servers: MCPServerDefinition[]) => Promise<GeneratedFile[]>>()
        .mockRejectedValue(new Error("generate failed")),
    });

    mockRegistryDetectAll.mockResolvedValue([adapter]);

    await expect(run(["generate"])).rejects.toThrow("generate failed");
  });

  it("propagates adapter install errors", async () => {
    const adapter = makeAdapter({
      id: "broken",
      name: "Broken",
      install: vi
        .fn<(files: GeneratedFile[], cwd?: string) => Promise<void>>()
        .mockRejectedValue(new Error("install failed")),
    });

    mockRegistryDetectAll.mockResolvedValue([adapter]);

    await expect(run(["install"])).rejects.toThrow("install failed");
  });
});
