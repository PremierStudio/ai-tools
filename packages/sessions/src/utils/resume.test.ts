import { describe, it, expect, vi } from "vitest";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(() => ({ pid: 1234 })),
}));

import { spawn } from "node:child_process";
import { launchWithContext, spawnTool } from "./resume.js";
import type { SessionContext } from "../types/index.js";

function makeContext(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    sessionId: "sess-123",
    tool: "claude",
    title: "Fix bug",
    summary: "Working on bug fix.",
    keyFiles: [],
    keyDecisions: [],
    lastActivity: "2025-01-01T12:00:00Z",
    handoffMarkdown: "",
    ...overrides,
  };
}

describe("launchWithContext", () => {
  it("returns command and args for claude", () => {
    const ctx = makeContext({ tool: "claude" });
    const result = launchWithContext("claude", ctx);
    expect(result).not.toBeNull();
    expect(result?.command).toBe("claude");
    expect(result?.args[0]).toBe("--prompt");
    expect(result?.args[1]).toContain("Session Handoff");
  });

  it("returns command and args for codex", () => {
    const ctx = makeContext({ tool: "codex" });
    const result = launchWithContext("codex", ctx);
    expect(result).not.toBeNull();
    expect(result?.command).toBe("codex");
    expect(result?.args[0]).toBe("--prompt");
  });

  it("returns command with empty args for gemini (no prompt flag)", () => {
    const ctx = makeContext({ tool: "gemini" });
    const result = launchWithContext("gemini", ctx);
    expect(result).not.toBeNull();
    expect(result?.command).toBe("gemini");
    expect(result?.args).toEqual([]);
  });

  it("returns null for unknown tools", () => {
    const ctx = makeContext({ tool: "unknown" });
    const result = launchWithContext("unknown", ctx);
    expect(result).toBeNull();
  });

  it("returns null for copilot (not in TOOL_COMMANDS)", () => {
    const ctx = makeContext({ tool: "copilot" });
    const result = launchWithContext("copilot", ctx);
    expect(result).toBeNull();
  });
});

describe("spawnTool", () => {
  it("calls spawn with correct arguments", () => {
    spawnTool("claude", ["--prompt", "hello"]);
    expect(vi.mocked(spawn)).toHaveBeenCalledWith("claude", ["--prompt", "hello"], {
      stdio: "inherit",
      cwd: undefined,
    });
  });

  it("passes cwd option", () => {
    spawnTool("codex", [], { cwd: "/my/project" });
    expect(vi.mocked(spawn)).toHaveBeenCalledWith("codex", [], {
      stdio: "inherit",
      cwd: "/my/project",
    });
  });
});
