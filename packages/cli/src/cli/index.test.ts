import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockHooksRun = vi.fn();
const mockMcpRun = vi.fn();
const mockSkillsRun = vi.fn();
const mockAgentsRun = vi.fn();
const mockRulesRun = vi.fn();

vi.mock("@premierstudio/ai-hooks/cli", () => ({ run: mockHooksRun }));
vi.mock("@premierstudio/ai-mcp/cli", () => ({ run: mockMcpRun }));
vi.mock("@premierstudio/ai-skills/cli", () => ({ run: mockSkillsRun }));
vi.mock("@premierstudio/ai-agents/cli", () => ({ run: mockAgentsRun }));
vi.mock("@premierstudio/ai-rules/cli", () => ({ run: mockRulesRun }));

import { run } from "./index.js";

let logOutput: string[];
let errorOutput: string[];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;

beforeEach(() => {
  logOutput = [];
  errorOutput = [];
  exitCode = undefined;

  console.log = vi.fn((...args: unknown[]) => {
    logOutput.push(args.map(String).join(" "));
  });
  console.error = vi.fn((...args: unknown[]) => {
    errorOutput.push(args.map(String).join(" "));
  });
  process.exit = vi.fn((code?: number) => {
    exitCode = code ?? 0;
    throw new Error(`process.exit(${code})`);
  }) as never;

  vi.clearAllMocks();
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  process.exit = originalExit;
});

function allLog(): string {
  return logOutput.join("\n");
}

function allError(): string {
  return errorOutput.join("\n");
}

// ── Help output ──────────────────────────────────────────────

describe("run() - help output", () => {
  it("prints help text for 'help' command", async () => {
    await run(["help"]);
    expect(allLog()).toContain("ai-tools - Unified CLI");
    expect(allLog()).toContain("USAGE:");
    expect(allLog()).toContain("ENGINES:");
    expect(allLog()).toContain("CROSS-CUTTING COMMANDS:");
    expect(allLog()).toContain("EXAMPLES:");
  });

  it("prints help text for --help flag", async () => {
    await run(["--help"]);
    expect(allLog()).toContain("ai-tools - Unified CLI");
  });

  it("prints help text for -h flag", async () => {
    await run(["-h"]);
    expect(allLog()).toContain("ai-tools - Unified CLI");
  });

  it("prints help text when no arguments are provided", async () => {
    await run([]);
    expect(allLog()).toContain("ai-tools - Unified CLI");
  });

  it("includes all engine names in help text", async () => {
    await run(["help"]);
    const output = allLog();
    for (const name of ["hooks", "mcp", "skills", "agents", "rules"]) {
      expect(output).toContain(name);
    }
  });
});

// ── Unknown command ──────────────────────────────────────────

describe("run() - unknown command", () => {
  it("prints error and help, then exits with code 1", async () => {
    await expect(run(["foobar"])).rejects.toThrow("process.exit(1)");
    expect(allError()).toContain("Unknown command: foobar");
    expect(allLog()).toContain("USAGE:");
    expect(exitCode).toBe(1);
  });
});

// ── Engine delegation ────────────────────────────────────────

describe("run() - engine delegation", () => {
  it("delegates to hooks engine", async () => {
    await run(["hooks", "detect"]);
    expect(mockHooksRun).toHaveBeenCalledWith(["detect"]);
  });

  it("delegates to mcp engine", async () => {
    await run(["mcp", "install"]);
    expect(mockMcpRun).toHaveBeenCalledWith(["install"]);
  });

  it("delegates to skills engine", async () => {
    await run(["skills", "sync"]);
    expect(mockSkillsRun).toHaveBeenCalledWith(["sync"]);
  });

  it("delegates to agents engine", async () => {
    await run(["agents", "export"]);
    expect(mockAgentsRun).toHaveBeenCalledWith(["export"]);
  });

  it("delegates to rules engine", async () => {
    await run(["rules", "import"]);
    expect(mockRulesRun).toHaveBeenCalledWith(["import"]);
  });

  it("forwards all remaining args to the engine", async () => {
    await run(["mcp", "install", "--tools=claude-code", "--dry-run"]);
    expect(mockMcpRun).toHaveBeenCalledWith(["install", "--tools=claude-code", "--dry-run"]);
  });
});

// ── Cross-cutting detect ─────────────────────────────────────

describe("run() - cross-cutting detect", () => {
  it("calls detect on all 5 engines", async () => {
    await run(["detect"]);

    expect(mockHooksRun).toHaveBeenCalledWith(["detect"]);
    expect(mockMcpRun).toHaveBeenCalledWith(["detect"]);
    expect(mockSkillsRun).toHaveBeenCalledWith(["detect"]);
    expect(mockAgentsRun).toHaveBeenCalledWith(["detect"]);
    expect(mockRulesRun).toHaveBeenCalledWith(["detect"]);
  });

  it("prints engine headers", async () => {
    await run(["detect"]);
    const output = allLog();
    expect(output).toContain("── hooks ──");
    expect(output).toContain("── mcp ──");
    expect(output).toContain("── skills ──");
    expect(output).toContain("── agents ──");
    expect(output).toContain("── rules ──");
  });

  it("forwards flags to each engine", async () => {
    await run(["detect", "--tools=claude-code"]);

    expect(mockHooksRun).toHaveBeenCalledWith(["detect", "--tools=claude-code"]);
    expect(mockMcpRun).toHaveBeenCalledWith(["detect", "--tools=claude-code"]);
  });

  it("catches engine errors and continues", async () => {
    mockHooksRun.mockRejectedValueOnce(new Error("hooks failed"));

    await run(["detect"]);

    expect(allError()).toContain("Error: hooks failed");
    // Other engines still called
    expect(mockMcpRun).toHaveBeenCalledWith(["detect"]);
    expect(mockSkillsRun).toHaveBeenCalledWith(["detect"]);
    expect(mockAgentsRun).toHaveBeenCalledWith(["detect"]);
    expect(mockRulesRun).toHaveBeenCalledWith(["detect"]);
  });
});

// ── Cross-cutting sync ───────────────────────────────────────

describe("run() - cross-cutting sync", () => {
  it("calls sync on 4 engines (skips hooks)", async () => {
    await run(["sync"]);

    expect(mockHooksRun).not.toHaveBeenCalled();
    expect(mockMcpRun).toHaveBeenCalledWith(["sync"]);
    expect(mockSkillsRun).toHaveBeenCalledWith(["sync"]);
    expect(mockAgentsRun).toHaveBeenCalledWith(["sync"]);
    expect(mockRulesRun).toHaveBeenCalledWith(["sync"]);
  });

  it("prints engine headers for sync-capable engines only", async () => {
    await run(["sync"]);
    const output = allLog();
    expect(output).not.toContain("── hooks ──");
    expect(output).toContain("── mcp ──");
    expect(output).toContain("── skills ──");
    expect(output).toContain("── agents ──");
    expect(output).toContain("── rules ──");
  });

  it("forwards flags to each engine", async () => {
    await run(["sync", "--dry-run"]);

    expect(mockMcpRun).toHaveBeenCalledWith(["sync", "--dry-run"]);
    expect(mockSkillsRun).toHaveBeenCalledWith(["sync", "--dry-run"]);
  });

  it("catches engine errors and continues", async () => {
    mockMcpRun.mockRejectedValueOnce(new Error("mcp failed"));

    await run(["sync"]);

    expect(allError()).toContain("Error: mcp failed");
    // Other engines still called
    expect(mockSkillsRun).toHaveBeenCalledWith(["sync"]);
    expect(mockAgentsRun).toHaveBeenCalledWith(["sync"]);
    expect(mockRulesRun).toHaveBeenCalledWith(["sync"]);
  });
});

// ── Flag pass-through ────────────────────────────────────────

describe("run() - flag pass-through", () => {
  it("passes --tools flag through to engine", async () => {
    await run(["mcp", "generate", "--tools=cursor,claude-code"]);
    expect(mockMcpRun).toHaveBeenCalledWith(["generate", "--tools=cursor,claude-code"]);
  });

  it("passes --dry-run flag through to engine", async () => {
    await run(["rules", "sync", "--dry-run"]);
    expect(mockRulesRun).toHaveBeenCalledWith(["sync", "--dry-run"]);
  });

  it("passes multiple flags through to engine", async () => {
    await run(["skills", "install", "--tools=claude-code", "--dry-run"]);
    expect(mockSkillsRun).toHaveBeenCalledWith(["install", "--tools=claude-code", "--dry-run"]);
  });
});
