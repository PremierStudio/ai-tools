import { describe, it, expect } from "vitest";
import type { SessionRow } from "../widgets/session-browser.js";
import { mockUi } from "../test-helpers.js";
import { renderSessionDetailView, getSessionDetailKeyHints } from "./session-detail.js";
import type { SessionDetailState } from "./session-detail.js";

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

function makeState(overrides: Partial<SessionDetailState> = {}): SessionDetailState {
  return {
    sessions: [],
    selectedSessionId: null,
    ...overrides,
  };
}

// ── helpers ───────────────────────────────────────────

type AnyNode = {
  type?: string;
  content?: string;
  props?: Record<string, unknown>;
  children?: AnyNode[];
};

/** Flatten a node tree into all text content strings. */
function allText(node: AnyNode): string[] {
  const out: string[] = [];
  if (node.content !== undefined) out.push(node.content);
  for (const c of node.children ?? []) out.push(...allText(c));
  return out;
}

// ── renderSessionDetailView ───────────────────────────

describe("renderSessionDetailView", () => {
  it("shows not found when session ID is null", () => {
    const state = makeState({ selectedSessionId: null });
    const vnode = renderSessionDetailView(mockUi, state) as unknown as AnyNode;
    expect(String(vnode.props?.title)).toBe("Session Detail");
    const texts = allText(vnode);
    expect(texts.some((t) => t.includes("Session not found."))).toBe(true);
  });

  it("shows not found when session ID does not match", () => {
    const state = makeState({
      sessions: [makeSession({ id: "s1" })],
      selectedSessionId: "nonexistent",
    });
    const vnode = renderSessionDetailView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    expect(texts.some((t) => t.includes("Session not found."))).toBe(true);
  });

  it("renders session title in box title", () => {
    const state = makeState({
      sessions: [makeSession({ id: "s1", title: "Fix auth bug" })],
      selectedSessionId: "s1",
    });
    const vnode = renderSessionDetailView(mockUi, state) as unknown as AnyNode;
    expect(String(vnode.props?.title)).toBe("Session: Fix auth bug");
  });

  it("shows tool name", () => {
    const state = makeState({
      sessions: [makeSession({ id: "s1", toolName: "Claude Code" })],
      selectedSessionId: "s1",
    });
    const vnode = renderSessionDetailView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    expect(texts.some((t) => t.includes("Tool:") && t.includes("Claude Code"))).toBe(true);
  });

  it("shows message count", () => {
    const state = makeState({
      sessions: [makeSession({ id: "s1", messageCount: 42 })],
      selectedSessionId: "s1",
    });
    const vnode = renderSessionDetailView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    expect(texts.some((t) => t.includes("Messages:") && t.includes("42"))).toBe(true);
  });

  it("shows session ID", () => {
    const state = makeState({
      sessions: [makeSession({ id: "abc-123" })],
      selectedSessionId: "abc-123",
    });
    const vnode = renderSessionDetailView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    expect(texts.some((t) => t.includes("ID:") && t.includes("abc-123"))).toBe(true);
  });

  it("shows updated timestamp", () => {
    const state = makeState({
      sessions: [makeSession({ id: "s1", updatedAt: "2025-01-15T10:00:00Z" })],
      selectedSessionId: "s1",
    });
    const vnode = renderSessionDetailView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    expect(texts.some((t) => t.includes("Updated:") && t.includes("2025-01-15T10:00:00Z"))).toBe(
      true,
    );
  });

  it("shows actions section", () => {
    const state = makeState({
      sessions: [makeSession({ id: "s1" })],
      selectedSessionId: "s1",
    });
    const vnode = renderSessionDetailView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    expect(texts.some((t) => t === "Actions:")).toBe(true);
  });
});

// ── getSessionDetailKeyHints ──────────────────────────

describe("getSessionDetailKeyHints", () => {
  it("returns key hint string", () => {
    const hints = getSessionDetailKeyHints();
    expect(hints).toContain("h:Handoff");
    expect(hints).toContain("Enter:Continue");
    expect(hints).toContain("Backspace:Back");
  });
});
