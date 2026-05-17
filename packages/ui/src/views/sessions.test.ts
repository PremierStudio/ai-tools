import { describe, it, expect } from "vitest";
import type { SessionRow } from "../widgets/session-browser.js";
import { mockUi } from "../test-helpers.js";
import {
  renderSessionsView,
  filterSessions,
  sortSessions,
  cycleSortColumn,
  getSessionsKeyHints,
} from "./sessions.js";
import type { SessionsViewState } from "./sessions.js";

function makeSession(overrides: Partial<SessionRow> = {}): SessionRow {
  return {
    id: "s1",
    tool: "claude",
    toolName: "Claude Code",
    title: "Fix auth bug",
    messageCount: 10,
    updatedAt: "2025-01-15T10:00:00Z",
    ...overrides,
  };
}

function makeState(overrides: Partial<SessionsViewState> = {}): SessionsViewState {
  return {
    sessions: [],
    selectedSessionIndex: 0,
    loadingSessions: false,
    sessionFilter: {},
    sessionSort: { column: "updatedAt", direction: "desc" },
    keyOverrides: {},
    ...overrides,
  };
}

// Flatten all text content from a vnode tree (handles row/column children)
type AnyVNode = { content?: string; children?: AnyVNode[] };
function allText(node: AnyVNode): string {
  const parts: string[] = [];
  if (node.content !== undefined) parts.push(node.content);
  for (const child of node.children ?? []) {
    parts.push(allText(child));
  }
  return parts.join(" ");
}

// ── renderSessionsView ────────────────────────────────

describe("renderSessionsView", () => {
  it("shows loading message when loading with no sessions", () => {
    const state = makeState({ loadingSessions: true });
    const vnode = renderSessionsView(mockUi, state) as {
      children: Array<{ props?: { label?: string }; content?: string }>;
    };
    // children[0] is a spinner node — check its label prop
    const first = vnode.children[0]!;
    const text = first.props?.label ?? first.content ?? "";
    expect(text).toContain("Loading sessions");
  });

  it("shows no sessions message when empty and not loading", () => {
    const state = makeState({ loadingSessions: false });
    const vnode = renderSessionsView(mockUi, state) as AnyVNode;
    const texts = allText(vnode);
    expect(texts).toContain("No sessions found");
  });

  it("renders session rows when sessions exist", () => {
    const state = makeState({
      sessions: [makeSession(), makeSession({ id: "s2", title: "Add feature" })],
    });
    const vnode = renderSessionsView(mockUi, state) as {
      children: Array<{ type: string; children?: Array<{ content: string }> }>;
    };
    // Should have header, divider, then column of rows
    const colNode = vnode.children.find((c) => c.type === "column");
    expect(colNode).toBeTruthy();
  });

  it("shows search bar when query is active", () => {
    const state = makeState({
      sessions: [makeSession()],
      sessionFilter: { query: "auth" },
    });
    const vnode = renderSessionsView(mockUi, state) as AnyVNode;
    // Search bar is a row node — use allText to flatten the tree
    const searchNode = (vnode.children ?? []).find((c) => allText(c).includes("auth"));
    expect(searchNode).toBeTruthy();
  });

  it("shows search with Esc hint when query is active", () => {
    const state = makeState({
      sessions: [makeSession()],
      sessionFilter: { query: "auth" },
    });
    const vnode = renderSessionsView(mockUi, state) as AnyVNode;
    // Search bar richText spans include "Esc" and ":clear" (or "to clear") separately
    const full = allText(vnode);
    expect(full).toContain("Esc");
    expect(full).toContain("clear");
  });

  it("shows search bar even when filtered results are empty", () => {
    const state = makeState({
      sessions: [makeSession()],
      sessionFilter: { query: "nonexistent" },
    });
    const vnode = renderSessionsView(mockUi, state) as AnyVNode;
    // Search bar is a row node — use allText to flatten the tree
    const searchNode = (vnode.children ?? []).find((c) => allText(c).includes("nonexistent"));
    expect(searchNode).toBeTruthy();
  });

  it("renders table header with column names", () => {
    const state = makeState({
      sessions: [makeSession()],
    });
    const vnode = renderSessionsView(mockUi, state) as AnyVNode;
    // Header is a richText node — its mock content is the concatenation of all spans
    const header = (vnode.children ?? []).find(
      (c) => c.content?.includes("Tool") && c.content?.includes("Title"),
    );
    expect(header).toBeTruthy();
    // Bold is applied per-span in richText — the node itself contains the column names
    expect(header!.content).toContain("Tool");
  });

  it("shows sort indicator on active column", () => {
    const state = makeState({
      sessions: [makeSession()],
      sessionSort: { column: "updatedAt", direction: "desc" },
    });
    const vnode = renderSessionsView(mockUi, state) as {
      children: Array<{ content: string }>;
    };
    const header = vnode.children.find((c) => c.content?.includes("Updated"));
    expect(header!.content).toContain("\u25BC");
  });

  it("shows ascending sort indicator", () => {
    const state = makeState({
      sessions: [makeSession()],
      sessionSort: { column: "updatedAt", direction: "asc" },
    });
    const vnode = renderSessionsView(mockUi, state) as {
      children: Array<{ content: string }>;
    };
    const header = vnode.children.find((c) => c.content?.includes("Updated"));
    expect(header!.content).toContain("\u25B2");
  });

  it("marks selected row with triangle prefix", () => {
    const state = makeState({
      sessions: [makeSession({ id: "a" }), makeSession({ id: "b" })],
      selectedSessionIndex: 1,
    });
    const vnode = renderSessionsView(mockUi, state) as AnyVNode;
    const col = (vnode.children ?? []).find(
      (c) => allText(c).length > 0 && (c.children ?? []).length > 0,
    );
    // First row (not selected): has gutter bar ▐ but no ▸
    const firstText = allText((col!.children ?? [])[0]!);
    expect(firstText).not.toContain("\u25B8");
    // Second row (selected): has ▸ selection marker
    const secondText = allText((col!.children ?? [])[1]!);
    expect(secondText).toContain("\u25B8");
  });

  it("bolds the selected row", () => {
    const state = makeState({
      sessions: [makeSession({ id: "a" }), makeSession({ id: "b" })],
      selectedSessionIndex: 0,
    });
    const vnode = renderSessionsView(mockUi, state) as AnyVNode;
    const col = (vnode.children ?? []).find((c) => (c.children ?? []).length > 0);
    // First row (selected): contains ▸ marker
    const firstText = allText((col!.children ?? [])[0]!);
    expect(firstText).toContain("\u25B8");
    // Second row (not selected): has gutter bar ▐ but no ▸
    const secondText = allText((col!.children ?? [])[1]!);
    expect(secondText).not.toContain("\u25B8");
  });

  it("includes title with keybinding hints", () => {
    const state = makeState({
      sessions: [makeSession()],
    });
    const vnode = renderSessionsView(mockUi, state) as {
      props: { title: string };
    };
    expect(vnode.props.title).toContain("/:Search");
    expect(vnode.props.title).toContain("H:Handoff");
  });
});

// ── filterSessions ────────────────────────────────────

describe("filterSessions", () => {
  const sessions: SessionRow[] = [
    makeSession({ id: "1", tool: "claude", title: "Fix auth bug" }),
    makeSession({ id: "2", tool: "codex", title: "Add tests" }),
    makeSession({ id: "3", tool: "claude", title: "Refactor API" }),
  ];

  it("returns all sessions when no filter", () => {
    const result = filterSessions(sessions, {});
    expect(result).toHaveLength(3);
  });

  it("filters by tool", () => {
    const result = filterSessions(sessions, { tool: "claude" });
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.tool === "claude")).toBe(true);
  });

  it("filters by query (case-insensitive)", () => {
    const result = filterSessions(sessions, { query: "AUTH" });
    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe("Fix auth bug");
  });

  it("filters by both tool and query", () => {
    const result = filterSessions(sessions, { tool: "claude", query: "api" });
    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe("Refactor API");
  });

  it("returns empty array when no matches", () => {
    const result = filterSessions(sessions, { query: "nonexistent" });
    expect(result).toHaveLength(0);
  });
});

// ── sortSessions ──────────────────────────────────────

describe("sortSessions", () => {
  const sessions: SessionRow[] = [
    makeSession({
      id: "1",
      tool: "codex",
      title: "B task",
      messageCount: 5,
      updatedAt: "2025-01-10",
    }),
    makeSession({
      id: "2",
      tool: "claude",
      title: "A task",
      messageCount: 20,
      updatedAt: "2025-01-20",
    }),
    makeSession({
      id: "3",
      tool: "gemini",
      title: "C task",
      messageCount: 1,
      updatedAt: "2025-01-05",
    }),
  ];

  it("sorts by tool ascending", () => {
    const result = sortSessions(sessions, { column: "tool", direction: "asc" });
    expect(result.map((s) => s.tool)).toEqual(["claude", "codex", "gemini"]);
  });

  it("sorts by tool descending", () => {
    const result = sortSessions(sessions, { column: "tool", direction: "desc" });
    expect(result.map((s) => s.tool)).toEqual(["gemini", "codex", "claude"]);
  });

  it("sorts by title ascending", () => {
    const result = sortSessions(sessions, { column: "title", direction: "asc" });
    expect(result.map((s) => s.title)).toEqual(["A task", "B task", "C task"]);
  });

  it("sorts by title descending", () => {
    const result = sortSessions(sessions, { column: "title", direction: "desc" });
    expect(result.map((s) => s.title)).toEqual(["C task", "B task", "A task"]);
  });

  it("sorts by messageCount ascending", () => {
    const result = sortSessions(sessions, { column: "messageCount", direction: "asc" });
    expect(result.map((s) => s.messageCount)).toEqual([1, 5, 20]);
  });

  it("sorts by messageCount descending", () => {
    const result = sortSessions(sessions, { column: "messageCount", direction: "desc" });
    expect(result.map((s) => s.messageCount)).toEqual([20, 5, 1]);
  });

  it("sorts by updatedAt ascending", () => {
    const result = sortSessions(sessions, { column: "updatedAt", direction: "asc" });
    expect(result.map((s) => s.updatedAt)).toEqual(["2025-01-05", "2025-01-10", "2025-01-20"]);
  });

  it("sorts by updatedAt descending", () => {
    const result = sortSessions(sessions, { column: "updatedAt", direction: "desc" });
    expect(result.map((s) => s.updatedAt)).toEqual(["2025-01-20", "2025-01-10", "2025-01-05"]);
  });

  it("preserves order for unknown column", () => {
    const result = sortSessions(sessions, { column: "unknown", direction: "asc" });
    expect(result.map((s) => s.id)).toEqual(["1", "2", "3"]);
  });

  it("does not mutate the original array", () => {
    const original = [...sessions];
    sortSessions(sessions, { column: "title", direction: "asc" });
    expect(sessions.map((s) => s.id)).toEqual(original.map((s) => s.id));
  });
});

// ── cycleSortColumn ───────────────────────────────────

describe("cycleSortColumn", () => {
  it("toggles from asc to desc on same column", () => {
    const result = cycleSortColumn({ column: "updatedAt", direction: "asc" });
    expect(result).toEqual({ column: "updatedAt", direction: "desc" });
  });

  it("advances to next column on desc", () => {
    const result = cycleSortColumn({ column: "updatedAt", direction: "desc" });
    expect(result).toEqual({ column: "tool", direction: "asc" });
  });

  it("cycles through all columns", () => {
    let current = { column: "updatedAt" as string, direction: "desc" as const };
    current = cycleSortColumn(current); // tool asc
    expect(current.column).toBe("tool");
    current = cycleSortColumn(current); // tool desc
    current = cycleSortColumn(current); // title asc
    expect(current.column).toBe("title");
    current = cycleSortColumn(current); // title desc
    current = cycleSortColumn(current); // messageCount asc
    expect(current.column).toBe("messageCount");
    current = cycleSortColumn(current); // messageCount desc
    current = cycleSortColumn(current); // updatedAt asc (wraps)
    expect(current.column).toBe("updatedAt");
  });

  it("wraps from last column back to first", () => {
    const result = cycleSortColumn({ column: "messageCount", direction: "desc" });
    expect(result).toEqual({ column: "updatedAt", direction: "asc" });
  });
});

// ── getSessionsKeyHints ───────────────────────────────

describe("getSessionsKeyHints", () => {
  it("returns key hint string", () => {
    const hints = getSessionsKeyHints({});
    expect(hints).toContain("Enter:Detail");
    expect(hints).toContain("/:Search");
    expect(hints).toContain("H:Handoff");
    expect(hints).toContain("s:Sort");
    expect(hints).toContain("Esc:Clear");
  });
});
