import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SessionContext, UnifiedSession } from "@itz4blitz/ai-tools-sessions";

const mockAdapters: Array<{
  id: string;
  detect: () => Promise<boolean>;
  parseSessions: () => Promise<UnifiedSession[]>;
  extractContext: (session: UnifiedSession) => Promise<SessionContext>;
}> = [];

vi.mock("@itz4blitz/ai-tools-sessions", () => ({
  registry: {
    detectAll: async () => mockAdapters,
  },
}));

vi.mock("@itz4blitz/ai-tools-sessions/adapters/all", () => ({}));

import { performHandoff } from "./handoff.js";

function makeContext(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    sessionId: "s1",
    tool: "claude",
    title: "Test Session",
    summary: "A test summary",
    keyFiles: ["./src/index.ts"],
    keyDecisions: ["Use TypeScript"],
    lastActivity: "2025-01-01T01:00:00Z",
    handoffMarkdown: "# Handoff content",
    ...overrides,
  };
}

function makeSession(id: string = "s1"): UnifiedSession {
  return {
    id,
    tool: "claude",
    toolName: "Claude Code",
    startedAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T01:00:00Z",
    messageCount: 2,
    messages: [],
  };
}

beforeEach(() => {
  mockAdapters.length = 0;
  vi.clearAllMocks();
});

describe("performHandoff()", () => {
  it("returns null when session not found", async () => {
    const result = await performHandoff("nonexistent");
    expect(result).toBeNull();
  });

  it("returns handoff result with context and preview", async () => {
    const context = makeContext();
    mockAdapters.push({
      id: "claude",
      detect: async () => true,
      parseSessions: async () => [makeSession()],
      extractContext: async () => context,
    });

    const result = await performHandoff("s1");
    expect(result).not.toBeNull();
    expect(result?.context).toEqual(context);
    expect(result?.preview).toContain("Handoff Preview");
    expect(result?.launchCommand).toBeNull();
    expect(result?.launchArgs).toEqual([]);
  });

  it("includes launch command when target tool is specified", async () => {
    const context = makeContext();
    mockAdapters.push({
      id: "claude",
      detect: async () => true,
      parseSessions: async () => [makeSession()],
      extractContext: async () => context,
    });

    const result = await performHandoff("s1", "codex");
    expect(result?.launchCommand).toBe("codex");
    expect(result?.launchArgs).toContain("--prompt");
    expect(result?.launchArgs).toContain("# Handoff content");
  });

  it("returns null launch command for unknown target tool", async () => {
    const context = makeContext();
    mockAdapters.push({
      id: "claude",
      detect: async () => true,
      parseSessions: async () => [makeSession()],
      extractContext: async () => context,
    });

    const result = await performHandoff("s1", "unknown-tool");
    expect(result?.launchCommand).toBeNull();
    expect(result?.launchArgs).toEqual([]);
  });

  it("returns empty args for tools without prompt flag", async () => {
    const context = makeContext();
    mockAdapters.push({
      id: "claude",
      detect: async () => true,
      parseSessions: async () => [makeSession()],
      extractContext: async () => context,
    });

    const result = await performHandoff("s1", "gemini");
    expect(result?.launchCommand).toBe("gemini");
    expect(result?.launchArgs).toEqual([]);
  });
});
