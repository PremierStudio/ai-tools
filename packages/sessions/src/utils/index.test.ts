import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock("node:os", () => ({
  homedir: vi.fn(() => "/home/testuser"),
}));

import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { readIndex, writeIndex, toIndexEntry, filterSessions } from "./index.js";
import type { UnifiedSession } from "../types/index.js";

function makeSession(overrides: Partial<UnifiedSession> = {}): UnifiedSession {
  return {
    id: "test-session",
    tool: "claude",
    toolName: "Claude Code",
    startedAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T01:00:00Z",
    messageCount: 5,
    messages: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("readIndex", () => {
  it("returns empty index when file does not exist", async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const index = await readIndex("/tmp/cache");
    expect(index.sessions).toEqual([]);
    expect(index.updatedAt).toBeDefined();
  });

  it("reads and parses existing index file", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const data = {
      sessions: [{ id: "s1", tool: "claude", toolName: "Claude Code" }],
      updatedAt: "2025-01-01T00:00:00Z",
    };
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(data));
    const index = await readIndex("/tmp/cache");
    expect(index.sessions).toHaveLength(1);
    expect(index.sessions[0]?.id).toBe("s1");
  });
});

describe("writeIndex", () => {
  it("creates cache directory and writes index file", async () => {
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(writeFile).mockResolvedValue(undefined);

    const index = {
      sessions: [
        {
          id: "s1",
          tool: "claude",
          toolName: "Claude Code",
          startedAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T01:00:00Z",
          messageCount: 5,
        },
      ],
      updatedAt: "2025-01-01T00:00:00Z",
    };

    await writeIndex(index, "/tmp/cache");

    expect(vi.mocked(mkdir)).toHaveBeenCalledWith("/tmp/cache", { recursive: true });
    expect(vi.mocked(writeFile)).toHaveBeenCalledWith(
      expect.stringContaining("index.json"),
      expect.stringContaining('"s1"'),
      "utf-8",
    );
  });
});

describe("toIndexEntry", () => {
  it("strips messages from session", () => {
    const session = makeSession({
      id: "sess-1",
      title: "My Session",
      messages: [{ role: "user", content: "Hello" }],
    });
    const entry = toIndexEntry(session);
    expect(entry.id).toBe("sess-1");
    expect(entry.title).toBe("My Session");
    expect(entry).not.toHaveProperty("messages");
  });

  it("includes all metadata fields", () => {
    const session = makeSession({
      projectPath: "/home/user/project",
    });
    const entry = toIndexEntry(session);
    expect(entry.tool).toBe("claude");
    expect(entry.toolName).toBe("Claude Code");
    expect(entry.projectPath).toBe("/home/user/project");
    expect(entry.startedAt).toBeDefined();
    expect(entry.updatedAt).toBeDefined();
    expect(entry.messageCount).toBe(5);
  });
});

describe("filterSessions", () => {
  const sessions = [
    makeSession({ id: "s1", tool: "claude", updatedAt: "2025-06-01T00:00:00Z" }),
    makeSession({
      id: "s2",
      tool: "codex",
      projectPath: "/proj",
      updatedAt: "2025-03-01T00:00:00Z",
    }),
    makeSession({ id: "s3", tool: "claude", updatedAt: "2025-01-01T00:00:00Z" }),
  ];

  it("returns all sessions when no filter", () => {
    expect(filterSessions(sessions)).toEqual(sessions);
  });

  it("returns all sessions when filter is undefined", () => {
    expect(filterSessions(sessions, undefined)).toEqual(sessions);
  });

  it("filters by tool", () => {
    const result = filterSessions(sessions, { tool: "claude" });
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.tool === "claude")).toBe(true);
  });

  it("filters by projectPath", () => {
    const result = filterSessions(sessions, { projectPath: "/proj" });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("s2");
  });

  it("filters by since date", () => {
    const result = filterSessions(sessions, {
      since: new Date("2025-04-01T00:00:00Z"),
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("s1");
  });

  it("limits results", () => {
    const result = filterSessions(sessions, { limit: 2 });
    expect(result).toHaveLength(2);
  });

  it("combines multiple filters", () => {
    const result = filterSessions(sessions, { tool: "claude", limit: 1 });
    expect(result).toHaveLength(1);
    expect(result[0]?.tool).toBe("claude");
  });
});
