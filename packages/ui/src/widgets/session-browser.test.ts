import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UnifiedSession } from "@premierstudio/ai-tools-sessions";

vi.mock("@premierstudio/ai-tools-sessions", () => {
  const mockAdapters: Array<{
    id: string;
    detect: () => Promise<boolean>;
    parseSessions: () => Promise<UnifiedSession[]>;
  }> = [];

  return {
    registry: {
      detectAll: async () => mockAdapters.filter(async (a) => a.detect()),
      __addAdapter: (adapter: (typeof mockAdapters)[0]) => {
        mockAdapters.push(adapter);
      },
      __clear: () => {
        mockAdapters.length = 0;
      },
    },
  };
});

vi.mock("@premierstudio/ai-tools-sessions/adapters/all", () => ({}));

import { listSessions, formatSessionRow, groupByTool } from "./session-browser.js";
import { registry } from "@premierstudio/ai-tools-sessions";

type MockRegistry = typeof registry & {
  __addAdapter: (adapter: {
    id: string;
    detect: () => Promise<boolean>;
    parseSessions: () => Promise<UnifiedSession[]>;
  }) => void;
  __clear: () => void;
};

function makeSession(overrides: Partial<UnifiedSession> = {}): UnifiedSession {
  return {
    id: "session-1",
    tool: "claude",
    toolName: "Claude Code",
    title: "Test Session",
    startedAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T01:00:00Z",
    messageCount: 5,
    messages: [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi!" },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  (registry as MockRegistry).__clear();
  vi.clearAllMocks();
});

// -- listSessions --

describe("listSessions()", () => {
  it("returns empty array when no adapters detected", async () => {
    const sessions = await listSessions();
    expect(sessions).toEqual([]);
  });

  it("returns sessions from detected adapters", async () => {
    const session = makeSession();
    (registry as MockRegistry).__addAdapter({
      id: "claude",
      detect: async () => true,
      parseSessions: async () => [session],
    });

    const sessions = await listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.id).toBe("session-1");
  });

  it("sorts sessions by updatedAt descending", async () => {
    const older = makeSession({ id: "old", updatedAt: "2025-01-01T00:00:00Z" });
    const newer = makeSession({ id: "new", updatedAt: "2025-06-01T00:00:00Z" });

    (registry as MockRegistry).__addAdapter({
      id: "claude",
      detect: async () => true,
      parseSessions: async () => [older, newer],
    });

    const sessions = await listSessions();
    expect(sessions[0]?.id).toBe("new");
    expect(sessions[1]?.id).toBe("old");
  });

  it("respects limit in filter", async () => {
    const sessions = Array.from({ length: 5 }, (v, i) => {
      void v;
      return makeSession({ id: `s${i}`, updatedAt: `2025-01-0${i + 1}T00:00:00Z` });
    });

    (registry as MockRegistry).__addAdapter({
      id: "claude",
      detect: async () => true,
      parseSessions: async () => sessions,
    });

    const result = await listSessions({ limit: 2 });
    expect(result).toHaveLength(2);
  });

  it("handles adapter parse failure gracefully", async () => {
    (registry as MockRegistry).__addAdapter({
      id: "broken",
      detect: async () => true,
      parseSessions: async () => {
        throw new Error("parse error");
      },
    });

    const sessions = await listSessions();
    expect(sessions).toEqual([]);
  });
});

// -- formatSessionRow --

describe("formatSessionRow()", () => {
  it("formats session into display row", () => {
    const session = makeSession();
    const row = formatSessionRow(session);

    expect(row.id).toBe("session-1");
    expect(row.tool).toBe("claude");
    expect(row.toolName).toBe("Claude Code");
    expect(row.title).toBe("Test Session");
    expect(row.messageCount).toBe(5);
    expect(row.updatedAt).toBe("2025-01-01T01:00:00Z");
  });

  it("uses Untitled when title is undefined", () => {
    const session = makeSession({ title: undefined });
    const row = formatSessionRow(session);
    expect(row.title).toBe("Untitled");
  });
});

// -- groupByTool --

describe("groupByTool()", () => {
  it("groups sessions by tool", () => {
    const sessions = [
      makeSession({ id: "s1", tool: "claude", toolName: "Claude Code" }),
      makeSession({ id: "s2", tool: "codex", toolName: "Codex" }),
      makeSession({ id: "s3", tool: "claude", toolName: "Claude Code" }),
    ];

    const groups = groupByTool(sessions);
    expect(groups).toHaveLength(2);

    const claudeGroup = groups.find((g) => g.tool === "claude");
    expect(claudeGroup?.sessions).toHaveLength(2);

    const codexGroup = groups.find((g) => g.tool === "codex");
    expect(codexGroup?.sessions).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    const groups = groupByTool([]);
    expect(groups).toEqual([]);
  });

  it("preserves tool name in group", () => {
    const sessions = [makeSession({ tool: "gemini", toolName: "Gemini CLI" })];
    const groups = groupByTool(sessions);
    expect(groups[0]?.toolName).toBe("Gemini CLI");
  });
});
