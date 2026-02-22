import { describe, it, expect } from "vitest";
import type { SessionRow } from "../widgets/session-browser.js";
import { mockUi } from "../test-helpers.js";
import {
  renderHandoffView,
  getHandoffTargets,
  getTargetToolId,
  getHandoffKeyHints,
} from "./handoff.js";
import type { HandoffViewState } from "./handoff.js";

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

function makeState(overrides: Partial<HandoffViewState> = {}): HandoffViewState {
  return {
    sessions: [],
    handoffStep: 0,
    handoffSessionId: null,
    handoffTargetTool: null,
    handoffPreview: null,
    selectedSessionIndex: 0,
    selectedTargetIndex: 0,
    ...overrides,
  };
}

type AnyVNode = { content?: string; children?: AnyVNode[] };

function allText(node: AnyVNode): string {
  const parts: string[] = [];
  if (node.content !== undefined) parts.push(node.content);
  for (const child of node.children ?? []) {
    parts.push(allText(child));
  }
  return parts.join(" ");
}

// ── renderHandoffView ─────────────────────────────────

describe("renderHandoffView", () => {
  describe("step 0: session selection", () => {
    it("shows empty message when no sessions", () => {
      const state = makeState({ handoffStep: 0, sessions: [] });
      const vnode = renderHandoffView(mockUi, state) as {
        children: Array<{ content: string }>;
      };
      expect(vnode.children[0]!.content).toContain("No sessions available");
    });

    it("shows session list when sessions exist", () => {
      const state = makeState({
        handoffStep: 0,
        sessions: [makeSession({ id: "s1" }), makeSession({ id: "s2" })],
      });
      const vnode = renderHandoffView(mockUi, state) as {
        children: [{ children: Array<{ content: string }> }];
      };
      const col = vnode.children[0]!;
      const selectText = col.children.find((c) => c.content?.includes("Select a session"));
      expect(selectText).toBeTruthy();
    });

    it("marks selected session with triangle", () => {
      const state = makeState({
        handoffStep: 0,
        sessions: [makeSession({ id: "s1" }), makeSession({ id: "s2" })],
        selectedSessionIndex: 1,
      });
      const vnode = renderHandoffView(mockUi, state) as {
        children: [{ children: Array<{ content: string }> }];
      };
      const col = vnode.children[0]!;
      const sessionRows = col.children.filter((c) => allText(c).includes("claude"));
      expect(allText(sessionRows[0]!)).toMatch(/^ /);
      expect(allText(sessionRows[1]!)).toMatch(/^\u25B6/);
    });

    it("shows step 1 of 4 in title", () => {
      const state = makeState({ handoffStep: 0 });
      const vnode = renderHandoffView(mockUi, state) as {
        props: { title: string };
      };
      expect(vnode.props.title).toContain("Step 1 of 4");
    });
  });

  describe("step 1: preview", () => {
    it("shows loading when no preview available", () => {
      const state = makeState({ handoffStep: 1, handoffPreview: null });
      const vnode = renderHandoffView(mockUi, state) as {
        children: [{ children: Array<{ content: string }> }];
      };
      const col = vnode.children[0]!;
      const loadingText = col.children.find((c) => allText(c).includes("Loading handoff preview"));
      expect(loadingText).toBeTruthy();
    });

    it("shows preview text when available", () => {
      const state = makeState({
        handoffStep: 1,
        handoffPreview: "Context summary here",
      });
      const vnode = renderHandoffView(mockUi, state) as {
        children: [{ children: Array<{ content: string }> }];
      };
      const col = vnode.children[0]!;
      const previewText = col.children.find((c) => allText(c).includes("Context summary here"));
      expect(previewText).toBeTruthy();
    });

    it("shows step 2 of 4 in title", () => {
      const state = makeState({ handoffStep: 1 });
      const vnode = renderHandoffView(mockUi, state) as {
        props: { title: string };
      };
      expect(vnode.props.title).toContain("Step 2 of 4");
    });
  });

  describe("step 2: target selection", () => {
    it("shows target tool list", () => {
      const state = makeState({ handoffStep: 2 });
      const vnode = renderHandoffView(mockUi, state) as {
        children: [{ children: Array<{ content: string }> }];
      };
      const col = vnode.children[0]!;
      const claudeTarget = col.children.find((c) => allText(c).includes("Claude Code"));
      const codexTarget = col.children.find((c) => allText(c).includes("Codex"));
      expect(claudeTarget).toBeTruthy();
      expect(codexTarget).toBeTruthy();
    });

    it("marks selected target with triangle", () => {
      const state = makeState({ handoffStep: 2, selectedTargetIndex: 2 });
      const vnode = renderHandoffView(mockUi, state) as {
        children: [{ children: Array<{ content: string }> }];
      };
      const col = vnode.children[0]!;
      const targetRows = col.children.filter(
        (c) =>
          allText(c).includes("Claude Code") ||
          allText(c).includes("Codex") ||
          allText(c).includes("Gemini CLI") ||
          allText(c).includes("OpenCode"),
      );
      expect(allText(targetRows[0]!)).toMatch(/^ /);
      expect(allText(targetRows[2]!)).toMatch(/^\u25B6/);
    });

    it("shows step 3 of 4 in title", () => {
      const state = makeState({ handoffStep: 2 });
      const vnode = renderHandoffView(mockUi, state) as {
        props: { title: string };
      };
      expect(vnode.props.title).toContain("Step 3 of 4");
    });
  });

  describe("step 3: confirmation", () => {
    it("shows session and target in confirmation", () => {
      const state = makeState({
        handoffStep: 3,
        sessions: [makeSession({ id: "s1", title: "Fix auth bug" })],
        handoffSessionId: "s1",
        selectedTargetIndex: 1,
      });
      const vnode = renderHandoffView(mockUi, state) as {
        children: [{ children: Array<{ content: string }> }];
      };
      const col = vnode.children[0]!;
      const fromText = col.children.find((c) => allText(c).includes("From"));
      const toText = col.children.find((c) => allText(c).includes("To"));
      expect(allText(fromText!)).toContain("Fix auth bug");
      expect(allText(toText!)).toContain("Codex");
    });

    it("shows Unknown when session not found", () => {
      const state = makeState({
        handoffStep: 3,
        sessions: [],
        handoffSessionId: "nonexistent",
        selectedTargetIndex: 0,
      });
      const vnode = renderHandoffView(mockUi, state) as {
        children: [{ children: Array<{ content: string }> }];
      };
      const col = vnode.children[0]!;
      const fromText = col.children.find((c) => allText(c).includes("From"));
      expect(allText(fromText!)).toContain("Unknown");
    });

    it("shows step 4 of 4 in title", () => {
      const state = makeState({ handoffStep: 3 });
      const vnode = renderHandoffView(mockUi, state) as {
        props: { title: string };
      };
      expect(vnode.props.title).toContain("Step 4 of 4");
    });
  });

  it("defaults to step 0 for unknown step number", () => {
    const state = makeState({ handoffStep: 99 });
    const vnode = renderHandoffView(mockUi, state) as {
      props: { title: string };
    };
    // Falls through to default case in switch which renders session select
    expect(vnode.props.title).toContain("Handoff Wizard");
  });
});

// ── getHandoffTargets ─────────────────────────────────

describe("getHandoffTargets", () => {
  it("returns a list of targets", () => {
    const targets = getHandoffTargets();
    expect(targets.length).toBeGreaterThan(0);
  });

  it("returns a copy (not reference)", () => {
    const a = getHandoffTargets();
    const b = getHandoffTargets();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it("includes expected tool targets", () => {
    const targets = getHandoffTargets();
    const ids = targets.map((t) => t.id);
    expect(ids).toContain("claude");
    expect(ids).toContain("codex");
    expect(ids).toContain("gemini");
    expect(ids).toContain("opencode");
  });
});

// ── getTargetToolId ───────────────────────────────────

describe("getTargetToolId", () => {
  it("returns tool ID for valid index", () => {
    expect(getTargetToolId(0)).toBe("claude");
    expect(getTargetToolId(1)).toBe("codex");
  });

  it("returns null for out-of-bounds index", () => {
    expect(getTargetToolId(-1)).toBeNull();
    expect(getTargetToolId(100)).toBeNull();
  });
});

// ── getHandoffKeyHints ────────────────────────────────

describe("getHandoffKeyHints", () => {
  it("returns key hint string", () => {
    const hints = getHandoffKeyHints();
    expect(hints).toContain("Enter:Next");
    expect(hints).toContain("Esc:Cancel");
    expect(hints).toContain("j/k:Select");
  });
});
