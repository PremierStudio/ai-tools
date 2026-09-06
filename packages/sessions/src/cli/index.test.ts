import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { registry } from "../adapters/registry.js";
import type { BaseSessionAdapter } from "../adapters/base.js";
import type { UnifiedSession, SessionFilter } from "../types/index.js";

// Must import after adapters/all.js is loaded by the module under test
import { run } from "./index.js";

let logOutput: string[];
let errorOutput: string[];
let warnOutput: string[];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalExit = process.exit;

function makeSession(overrides: Partial<UnifiedSession> = {}): UnifiedSession {
  return {
    id: "test-session-1",
    tool: "claude",
    toolName: "Claude Code",
    title: "Test Session",
    startedAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T01:00:00Z",
    messageCount: 2,
    messages: [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
    ],
    ...overrides,
  };
}

function makeFakeAdapter(
  id: string,
  sessions: UnifiedSession[] = [],
  detects: boolean = true,
): BaseSessionAdapter {
  return {
    id,
    name: `${id} Tool`,
    command: id,
    storagePaths: [`~/.${id}`],
    detect: async () => detects,
    parseSessions: async (filter?: SessionFilter) => {
      void filter;
      return sessions;
    },
    extractContext: async (session: UnifiedSession) => ({
      sessionId: session.id,
      tool: session.tool,
      title: session.title ?? "Untitled",
      summary: `Summary of ${session.id}`,
      keyFiles: ["./src/index.ts"],
      keyDecisions: ["use TypeScript"],
      lastActivity: session.updatedAt,
      handoffMarkdown: `# Handoff: ${session.id}`,
    }),
    getStoragePath: async () => `/home/testuser/.${id}`,
  } as unknown as BaseSessionAdapter;
}

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

  registry.clear();
  vi.clearAllMocks();
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

// -- Help output --

describe("run() - help output", () => {
  it("prints help text for 'help' command", async () => {
    await run(["help"]);
    expect(allLog()).toContain("ai-sessions");
    expect(allLog()).toContain("USAGE:");
    expect(allLog()).toContain("COMMANDS:");
    expect(allLog()).toContain("EXAMPLES:");
  });

  it("prints help text for --help flag", async () => {
    await run(["--help"]);
    expect(allLog()).toContain("ai-sessions");
  });

  it("prints help text for -h flag", async () => {
    await run(["-h"]);
    expect(allLog()).toContain("ai-sessions");
  });

  it("prints help text when no arguments are provided", async () => {
    await run([]);
    expect(allLog()).toContain("ai-sessions");
  });

  it("lists only implemented commands and options", async () => {
    await run(["help"]);
    const output = allLog();
    expect(output).toContain("detect");
    expect(output).toContain("list");
    expect(output).toContain("context");
    expect(output).toContain("handoff");
    expect(output).toContain("scan");
    expect(output).toContain("--tool");
    expect(output).toContain("--limit");
    expect(output).toContain("--since");
    expect(output).toContain("--to");
    expect(output).not.toContain("--verbose");
    expect(output).not.toContain("canonical");
  });
});

// -- Unknown command --

describe("run() - unknown command", () => {
  it("prints error and help, then exits with code 1", async () => {
    await expect(run(["foobar"])).rejects.toThrow("process.exit(1)");
    expect(allError()).toContain("Unknown command: foobar");
    expect(allLog()).toContain("USAGE:");
    expect(exitCode).toBe(1);
  });
});

// -- detect command --

describe("run() - detect", () => {
  it("lists all registered adapters with detection status", async () => {
    registry.register(makeFakeAdapter("claude", [], true));
    registry.register(makeFakeAdapter("codex", [], false));

    await run(["detect"]);
    const output = allLog();
    expect(output).toContain("claude");
    expect(output).toContain("codex");
    expect(output).toContain("Detected");
  });
});

// -- list command --

describe("run() - list", () => {
  it("lists sessions from detected adapters", async () => {
    const session = makeSession();
    registry.register(makeFakeAdapter("claude", [session], true));

    await run(["list"]);
    const output = allLog();
    expect(output).toContain("test-session-1");
    expect(output).toContain("1 session(s)");
  });

  it("shows message when no sessions found", async () => {
    registry.register(makeFakeAdapter("claude", [], true));

    await run(["list"]);
    expect(allLog()).toContain("No sessions found");
  });

  it("shows message when no tools detected", async () => {
    await run(["list"]);
    expect(allLog()).toContain("No AI tools detected");
  });

  it("filters by tool", async () => {
    const session = makeSession({ tool: "claude" });
    registry.register(makeFakeAdapter("claude", [session], true));

    await run(["list", "--tool=claude"]);
    const output = allLog();
    expect(output).toContain("test-session-1");
  });
});

// -- context command --

describe("run() - context", () => {
  it("displays handoff context for a session", async () => {
    const session = makeSession();
    registry.register(makeFakeAdapter("claude", [session], true));

    await run(["context", "test-session-1", "--tool=claude"]);
    const output = allLog();
    expect(output).toContain("Handoff: test-session-1");
  });

  it("errors when session id is missing", async () => {
    await expect(run(["context"])).rejects.toThrow("process.exit(1)");
    expect(allError()).toContain("Usage:");
  });

  it("errors when session is not found", async () => {
    registry.register(makeFakeAdapter("claude", [], true));
    await expect(run(["context", "nonexistent", "--tool=claude"])).rejects.toThrow(
      "process.exit(1)",
    );
    expect(allError()).toContain("Session not found");
  });
});

// -- handoff command --

describe("run() - handoff", () => {
  it("generates handoff markdown for a session", async () => {
    const session = makeSession();
    registry.register(makeFakeAdapter("claude", [session], true));

    await run(["handoff", "test-session-1", "--tool=claude"]);
    const output = allLog();
    expect(output).toContain("Session Handoff");
  });

  it("shows launch command with --to flag", async () => {
    const session = makeSession();
    registry.register(makeFakeAdapter("claude", [session], true));

    await run(["handoff", "test-session-1", "--tool=claude", "--to=codex"]);
    const output = allLog();
    expect(output).toContain("continue in codex");
  });

  it("shows message for unknown target tool", async () => {
    const session = makeSession();
    registry.register(makeFakeAdapter("claude", [session], true));

    await run(["handoff", "test-session-1", "--tool=claude", "--to=unknown"]);
    const output = allLog();
    expect(output).toContain("No launch command available");
  });

  it("errors when session id is missing", async () => {
    await expect(run(["handoff"])).rejects.toThrow("process.exit(1)");
    expect(allError()).toContain("Usage:");
  });
});

// -- scan command --

describe("run() - scan", () => {
  it("scans sessions and builds index", async () => {
    vi.mock("../utils/index.js", async (importOriginal) => {
      const orig = await importOriginal<typeof import("../utils/index.js")>();
      return {
        ...orig,
        writeIndex: vi.fn().mockResolvedValue(undefined),
      };
    });

    const session = makeSession();
    registry.register(makeFakeAdapter("claude", [session], true));

    await run(["scan", "--tool=claude"]);
    const output = allLog();
    expect(output).toContain("Scanning sessions");
    expect(output).toContain("1 session(s)");
  });

  it("shows message when no tools detected", async () => {
    await run(["scan"]);
    expect(allLog()).toContain("No AI tools detected");
  });
});
