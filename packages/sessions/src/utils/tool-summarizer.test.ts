import { describe, it, expect } from "vitest";
import { summarizeSession, sessionRow } from "./tool-summarizer.js";
import type { UnifiedSession } from "../types/index.js";

function makeSession(overrides: Partial<UnifiedSession> = {}): UnifiedSession {
  return {
    id: "test-session",
    tool: "claude",
    toolName: "Claude Code",
    startedAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T01:00:00Z",
    messageCount: 10,
    messages: [],
    ...overrides,
  };
}

describe("summarizeSession", () => {
  it("formats a one-line summary", () => {
    const session = makeSession({ title: "Fix bug in parser" });
    const result = summarizeSession(session);
    expect(result).toBe("[Claude Code] Fix bug in parser (10 messages)");
  });

  it("uses 'Untitled' when no title", () => {
    const session = makeSession();
    const result = summarizeSession(session);
    expect(result).toBe("[Claude Code] Untitled (10 messages)");
  });

  it("truncates long titles", () => {
    const session = makeSession({
      title: "This is a very long session title that should be truncated at some point",
    });
    const result = summarizeSession(session);
    expect(result).toContain("...");
    expect(result).toContain("[Claude Code]");
    expect(result).toContain("(10 messages)");
  });
});

describe("sessionRow", () => {
  it("returns table-friendly row data", () => {
    const session = makeSession({
      title: "Implement feature X",
      messageCount: 25,
    });
    const row = sessionRow(session);
    expect(row).toEqual({
      tool: "Claude Code",
      title: "Implement feature X",
      messages: 25,
      started: "2025-01-01T00:00:00Z",
      updated: "2025-01-01T01:00:00Z",
    });
  });

  it("uses 'Untitled' when no title", () => {
    const session = makeSession();
    const row = sessionRow(session);
    expect(row.title).toBe("Untitled");
  });

  it("truncates long titles to 40 chars", () => {
    const session = makeSession({
      title: "A very long title that goes beyond forty characters in length",
    });
    const row = sessionRow(session);
    expect(row.title.length).toBeLessThanOrEqual(40);
    expect(row.title).toContain("...");
  });
});
