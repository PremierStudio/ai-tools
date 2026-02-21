import { describe, it, expect } from "vitest";
import type { ToolInfo, AppView } from "./types.js";
import type { EngineStatus } from "./widgets/config-dashboard.js";
import type { SessionRow } from "./widgets/session-browser.js";
import {
  createInitialTuiState,
  navigateView,
  selectItem,
  handleKeyEvent,
  renderApp,
  renderSidebar,
  renderToolsView,
  renderSessionsView,
  renderHandoffView,
  renderConfigView,
  renderContent,
  renderStatusBar,
  renderNotification,
  type SimpleKeyEvent,
} from "./tui.js";

// Minimal mock of the Rezi `ui` object for rendering tests.
// Each factory returns a tagged object so we can assert widget structure.
const mockUi = {
  text: (content: string, props?: Record<string, unknown>) => ({
    type: "text",
    content,
    props,
  }),
  box: (props: Record<string, unknown>, children: unknown[]) => ({
    type: "box",
    props,
    children,
  }),
  column: (propsOrChildren: unknown, maybeChildren?: unknown[]) => {
    const hasProps = !Array.isArray(propsOrChildren);
    return {
      type: "column",
      props: hasProps ? propsOrChildren : {},
      children: hasProps ? maybeChildren : propsOrChildren,
    };
  },
  row: (propsOrChildren: unknown, maybeChildren?: unknown[]) => {
    const hasProps = !Array.isArray(propsOrChildren);
    return {
      type: "row",
      props: hasProps ? propsOrChildren : {},
      children: hasProps ? maybeChildren : propsOrChildren,
    };
  },
  divider: () => ({ type: "divider" }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

function makeTool(overrides: Partial<ToolInfo> = {}): ToolInfo {
  return {
    id: "claude",
    name: "Claude Code",
    command: "claude",
    status: "available",
    sessionCount: 5,
    ...overrides,
  };
}

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

function makeEngine(overrides: Partial<EngineStatus> = {}): EngineStatus {
  return {
    engine: "hooks",
    detected: true,
    configured: true,
    ...overrides,
  };
}

function makeKeyEvent(key: string, modifiers?: { ctrl?: boolean }): SimpleKeyEvent {
  return { key, ctrl: modifiers?.ctrl };
}

// ── createInitialTuiState ─────────────────────────────

describe("createInitialTuiState", () => {
  it("returns default state with tools view", () => {
    const state = createInitialTuiState();
    expect(state.view).toBe("tools");
  });

  it("starts with loading true", () => {
    const state = createInitialTuiState();
    expect(state.loading).toBe(true);
  });

  it("starts with empty tools", () => {
    const state = createInitialTuiState();
    expect(state.tools).toEqual([]);
  });

  it("starts with empty sessions", () => {
    const state = createInitialTuiState();
    expect(state.sessions).toEqual([]);
  });

  it("starts with null notification", () => {
    const state = createInitialTuiState();
    expect(state.notification).toBeNull();
  });

  it("returns a new object each call", () => {
    const a = createInitialTuiState();
    const b = createInitialTuiState();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

// ── navigateView ──────────────────────────────────────

describe("navigateView", () => {
  it("navigates from tools to sessions", () => {
    const state = createInitialTuiState();
    const next = navigateView(state, "next");
    expect(next.view).toBe("sessions");
  });

  it("navigates from config back to tools (wraps)", () => {
    const state = { ...createInitialTuiState(), view: "config" as AppView };
    const next = navigateView(state, "next");
    expect(next.view).toBe("tools");
  });

  it("navigates backwards from tools to config (wraps)", () => {
    const state = createInitialTuiState();
    const prev = navigateView(state, "prev");
    expect(prev.view).toBe("config");
  });

  it("navigates backwards from sessions to tools", () => {
    const state = { ...createInitialTuiState(), view: "sessions" as AppView };
    const prev = navigateView(state, "prev");
    expect(prev.view).toBe("tools");
  });

  it("full forward cycle returns to start", () => {
    let state = createInitialTuiState();
    state = navigateView(state, "next"); // sessions
    state = navigateView(state, "next"); // handoff
    state = navigateView(state, "next"); // config
    state = navigateView(state, "next"); // tools
    expect(state.view).toBe("tools");
  });
});

// ── selectItem ────────────────────────────────────────

describe("selectItem", () => {
  it("moves tool selection down", () => {
    const state = {
      ...createInitialTuiState(),
      tools: [makeTool({ id: "a" }), makeTool({ id: "b" }), makeTool({ id: "c" })],
      selectedToolIndex: 0,
    };
    const next = selectItem(state, "next");
    expect(next.selectedToolIndex).toBe(1);
  });

  it("clamps tool selection at end", () => {
    const state = {
      ...createInitialTuiState(),
      tools: [makeTool({ id: "a" }), makeTool({ id: "b" })],
      selectedToolIndex: 1,
    };
    const next = selectItem(state, "next");
    expect(next.selectedToolIndex).toBe(1);
  });

  it("moves tool selection up", () => {
    const state = {
      ...createInitialTuiState(),
      tools: [makeTool({ id: "a" }), makeTool({ id: "b" })],
      selectedToolIndex: 1,
    };
    const prev = selectItem(state, "prev");
    expect(prev.selectedToolIndex).toBe(0);
  });

  it("clamps tool selection at start", () => {
    const state = { ...createInitialTuiState(), tools: [makeTool()], selectedToolIndex: 0 };
    const prev = selectItem(state, "prev");
    expect(prev.selectedToolIndex).toBe(0);
  });

  it("handles empty tools list", () => {
    const state = createInitialTuiState();
    const next = selectItem(state, "next");
    expect(next.selectedToolIndex).toBe(0);
  });

  it("moves session selection down", () => {
    const state = {
      ...createInitialTuiState(),
      view: "sessions" as AppView,
      sessions: [makeSession({ id: "a" }), makeSession({ id: "b" })],
      selectedSessionIndex: 0,
    };
    const next = selectItem(state, "next");
    expect(next.selectedSessionIndex).toBe(1);
  });

  it("clamps session selection at end", () => {
    const state = {
      ...createInitialTuiState(),
      view: "sessions" as AppView,
      sessions: [makeSession()],
      selectedSessionIndex: 0,
    };
    const next = selectItem(state, "next");
    expect(next.selectedSessionIndex).toBe(0);
  });

  it("returns unchanged state for handoff view", () => {
    const state = { ...createInitialTuiState(), view: "handoff" as AppView };
    const next = selectItem(state, "next");
    expect(next).toBe(state);
  });

  it("returns unchanged state for config view", () => {
    const state = { ...createInitialTuiState(), view: "config" as AppView };
    const next = selectItem(state, "next");
    expect(next).toBe(state);
  });
});

// ── handleKeyEvent ────────────────────────────────────

describe("handleKeyEvent", () => {
  it("returns stop:true for q key", () => {
    const state = createInitialTuiState();
    const result = handleKeyEvent(state, makeKeyEvent("q"));
    expect(result.stop).toBe(true);
  });

  it("returns stop:true for Ctrl+C", () => {
    const state = createInitialTuiState();
    const result = handleKeyEvent(state, makeKeyEvent("c", { ctrl: true }));
    expect(result.stop).toBe(true);
  });

  it("navigates on Tab", () => {
    const state = createInitialTuiState();
    const result = handleKeyEvent(state, makeKeyEvent("Tab"));
    expect(result.state.view).toBe("sessions");
    expect(result.stop).toBe(false);
  });

  it("navigates back on BackTab", () => {
    const state = createInitialTuiState();
    const result = handleKeyEvent(state, makeKeyEvent("BackTab"));
    expect(result.state.view).toBe("config");
  });

  it("selects next on j", () => {
    const state = {
      ...createInitialTuiState(),
      tools: [makeTool({ id: "a" }), makeTool({ id: "b" })],
    };
    const result = handleKeyEvent(state, makeKeyEvent("j"));
    expect(result.state.selectedToolIndex).toBe(1);
  });

  it("selects next on Down", () => {
    const state = {
      ...createInitialTuiState(),
      tools: [makeTool({ id: "a" }), makeTool({ id: "b" })],
    };
    const result = handleKeyEvent(state, makeKeyEvent("Down"));
    expect(result.state.selectedToolIndex).toBe(1);
  });

  it("selects prev on k", () => {
    const state = {
      ...createInitialTuiState(),
      tools: [makeTool({ id: "a" }), makeTool({ id: "b" })],
      selectedToolIndex: 1,
    };
    const result = handleKeyEvent(state, makeKeyEvent("k"));
    expect(result.state.selectedToolIndex).toBe(0);
  });

  it("selects prev on Up", () => {
    const state = {
      ...createInitialTuiState(),
      tools: [makeTool({ id: "a" }), makeTool({ id: "b" })],
      selectedToolIndex: 1,
    };
    const result = handleKeyEvent(state, makeKeyEvent("Up"));
    expect(result.state.selectedToolIndex).toBe(0);
  });

  it("switches to view 1 on key 1", () => {
    const state = { ...createInitialTuiState(), view: "config" as AppView };
    const result = handleKeyEvent(state, makeKeyEvent("1"));
    expect(result.state.view).toBe("tools");
  });

  it("switches to view 2 on key 2", () => {
    const state = createInitialTuiState();
    const result = handleKeyEvent(state, makeKeyEvent("2"));
    expect(result.state.view).toBe("sessions");
  });

  it("switches to view 3 on key 3", () => {
    const state = createInitialTuiState();
    const result = handleKeyEvent(state, makeKeyEvent("3"));
    expect(result.state.view).toBe("handoff");
  });

  it("switches to view 4 on key 4", () => {
    const state = createInitialTuiState();
    const result = handleKeyEvent(state, makeKeyEvent("4"));
    expect(result.state.view).toBe("config");
  });

  it("ignores unrecognized keys", () => {
    const state = createInitialTuiState();
    const result = handleKeyEvent(state, makeKeyEvent("x"));
    expect(result.state).toBe(state);
    expect(result.stop).toBe(false);
  });
});

// ── renderSidebar ─────────────────────────────────────

describe("renderSidebar", () => {
  it("returns a box with navigation items", () => {
    const state = createInitialTuiState();
    const vnode = renderSidebar(mockUi, state) as { type: string; children: unknown[] };
    expect(vnode.type).toBe("box");
  });

  it("marks current view with > prefix", () => {
    const state = { ...createInitialTuiState(), view: "sessions" as AppView };
    const vnode = renderSidebar(mockUi, state) as {
      children: [{ children: Array<{ content: string }> }];
    };
    const col = vnode.children[0]!;
    const labels = col.children.map((c) => c.content);
    expect(labels[0]).toContain(" Tools"); // not active
    expect(labels[1]).toContain("> Sessions"); // active
  });

  it("bolds the active view", () => {
    const state = createInitialTuiState();
    const vnode = renderSidebar(mockUi, state) as {
      children: [{ children: Array<{ props: { bold: boolean } }> }];
    };
    const col = vnode.children[0]!;
    expect(col.children[0]!.props.bold).toBe(true); // tools is active
    expect(col.children[1]!.props.bold).toBe(false);
  });
});

// ── renderToolsView ───────────────────────────────────

describe("renderToolsView", () => {
  it("shows loading message when loading", () => {
    const state = { ...createInitialTuiState(), loading: true };
    const vnode = renderToolsView(mockUi, state) as {
      children: Array<{ content: string }>;
    };
    expect(vnode.children[0]!.content).toContain("Detecting");
  });

  it("shows no tools message when empty and not loading", () => {
    const state = { ...createInitialTuiState(), loading: false };
    const vnode = renderToolsView(mockUi, state) as {
      children: Array<{ content: string }>;
    };
    expect(vnode.children[0]!.content).toContain("No tools");
  });

  it("renders tool rows with status icons", () => {
    const state = {
      ...createInitialTuiState(),
      tools: [
        makeTool({ status: "available" }),
        makeTool({ id: "codex", status: "not-installed" }),
      ],
      loading: false,
    };
    const vnode = renderToolsView(mockUi, state) as {
      children: [{ children: Array<{ content: string }> }];
    };
    const col = vnode.children[0]!;
    expect(col.children[0]!.content).toContain("\u2713"); // check mark
    expect(col.children[1]!.content).toContain("\u2717"); // x mark
  });

  it("marks selected tool with > prefix", () => {
    const state = {
      ...createInitialTuiState(),
      tools: [makeTool({ id: "a" }), makeTool({ id: "b" })],
      selectedToolIndex: 1,
      loading: false,
    };
    const vnode = renderToolsView(mockUi, state) as {
      children: [{ children: Array<{ content: string }> }];
    };
    const col = vnode.children[0]!;
    expect(col.children[0]!.content).toMatch(/^ /); // not selected
    expect(col.children[1]!.content).toMatch(/^>/); // selected
  });

  it("shows session count for tools with sessions", () => {
    const state = {
      ...createInitialTuiState(),
      tools: [makeTool({ sessionCount: 5 })],
      loading: false,
    };
    const vnode = renderToolsView(mockUi, state) as {
      children: [{ children: Array<{ content: string }> }];
    };
    expect(vnode.children[0]!.children[0]!.content).toContain("(5)");
  });
});

// ── renderSessionsView ────────────────────────────────

describe("renderSessionsView", () => {
  it("shows loading when loading", () => {
    const state = { ...createInitialTuiState(), view: "sessions" as AppView, loading: true };
    const vnode = renderSessionsView(mockUi, state) as {
      children: Array<{ content: string }>;
    };
    expect(vnode.children[0]!.content).toContain("Loading");
  });

  it("shows no sessions when empty and not loading", () => {
    const state = { ...createInitialTuiState(), view: "sessions" as AppView, loading: false };
    const vnode = renderSessionsView(mockUi, state) as {
      children: Array<{ content: string }>;
    };
    expect(vnode.children[0]!.content).toContain("No sessions");
  });

  it("renders session rows", () => {
    const state = {
      ...createInitialTuiState(),
      view: "sessions" as AppView,
      sessions: [makeSession()],
      loading: false,
    };
    const vnode = renderSessionsView(mockUi, state) as {
      children: [{ children: Array<{ content: string }> }];
    };
    expect(vnode.children[0]!.children[0]!.content).toContain("Fix auth bug");
  });
});

// ── renderHandoffView ─────────────────────────────────

describe("renderHandoffView", () => {
  it("shows instruction when no preview", () => {
    const state = createInitialTuiState();
    const vnode = renderHandoffView(mockUi, state) as {
      children: Array<{ content: string }>;
    };
    expect(vnode.children[0]!.content).toContain("Select a session");
  });

  it("shows preview when available", () => {
    const state = { ...createInitialTuiState(), handoffPreview: "# Handoff Preview\n\nContext" };
    const vnode = renderHandoffView(mockUi, state) as {
      children: Array<{ content: string }>;
    };
    expect(vnode.children[0]!.content).toContain("Handoff Preview");
  });
});

// ── renderConfigView ──────────────────────────────────

describe("renderConfigView", () => {
  it("shows loading when loading", () => {
    const state = { ...createInitialTuiState(), view: "config" as AppView, loading: true };
    const vnode = renderConfigView(mockUi, state) as {
      children: Array<{ content: string }>;
    };
    expect(vnode.children[0]!.content).toContain("Loading");
  });

  it("shows engines when loaded", () => {
    const state = {
      ...createInitialTuiState(),
      view: "config" as AppView,
      engines: [makeEngine(), makeEngine({ engine: "mcp", configured: false })],
      loading: false,
    };
    const vnode = renderConfigView(mockUi, state) as {
      children: [{ children: Array<{ content: string }> }];
    };
    const col = vnode.children[0]!;
    // Mode, Health, blank, then engine rows
    const texts = col.children.map((c) => c.content);
    expect(texts.some((t) => t.includes("hooks"))).toBe(true);
    expect(texts.some((t) => t.includes("mcp"))).toBe(true);
  });
});

// ── renderContent ─────────────────────────────────────

describe("renderContent", () => {
  it("renders tools view for tools", () => {
    const state = createInitialTuiState();
    const vnode = renderContent(mockUi, state) as { props: { title: string } };
    expect(vnode.props.title).toBe("Tools");
  });

  it("renders sessions view for sessions", () => {
    const state = { ...createInitialTuiState(), view: "sessions" as AppView };
    const vnode = renderContent(mockUi, state) as { props: { title: string } };
    expect(vnode.props.title).toBe("Sessions");
  });

  it("renders handoff view for handoff", () => {
    const state = { ...createInitialTuiState(), view: "handoff" as AppView };
    const vnode = renderContent(mockUi, state) as { props: { title: string } };
    expect(vnode.props.title).toBe("Handoff");
  });

  it("renders config view for config", () => {
    const state = { ...createInitialTuiState(), view: "config" as AppView };
    const vnode = renderContent(mockUi, state) as { props: { title: string } };
    expect(vnode.props.title).toBe("Config");
  });
});

// ── renderStatusBar ───────────────────────────────────

describe("renderStatusBar", () => {
  it("includes mode", () => {
    const state = { ...createInitialTuiState(), mode: "Canonical" };
    const vnode = renderStatusBar(mockUi, state) as { content: string };
    expect(vnode.content).toContain("Canonical");
  });

  it("includes session count", () => {
    const state = { ...createInitialTuiState(), sessionCount: 42 };
    const vnode = renderStatusBar(mockUi, state) as { content: string };
    expect(vnode.content).toContain("42");
  });

  it("includes config health", () => {
    const state = { ...createInitialTuiState(), configHealth: "Healthy" };
    const vnode = renderStatusBar(mockUi, state) as { content: string };
    expect(vnode.content).toContain("Healthy");
  });

  it("includes keybinding hints", () => {
    const state = createInitialTuiState();
    const vnode = renderStatusBar(mockUi, state) as { content: string };
    expect(vnode.content).toContain("Quit");
    expect(vnode.content).toContain("Nav");
  });
});

// ── renderNotification ────────────────────────────────

describe("renderNotification", () => {
  it("returns null when no notification", () => {
    const state = createInitialTuiState();
    const result = renderNotification(mockUi, state);
    expect(result).toBeNull();
  });

  it("returns text node when notification is set", () => {
    const state = { ...createInitialTuiState(), notification: "Config synced!" };
    const result = renderNotification(mockUi, state) as { content: string };
    expect(result.content).toBe("Config synced!");
  });
});

// ── renderApp ─────────────────────────────────────────

describe("renderApp", () => {
  it("returns a column as root", () => {
    const state = createInitialTuiState();
    const vnode = renderApp(mockUi, state) as { type: string };
    expect(vnode.type).toBe("column");
  });

  it("includes header text", () => {
    const state = createInitialTuiState();
    const vnode = renderApp(mockUi, state) as { children: Array<{ content?: string }> };
    expect(vnode.children[0]!.content).toBe("AI Tools Dashboard");
  });

  it("includes a divider after header", () => {
    const state = createInitialTuiState();
    const vnode = renderApp(mockUi, state) as {
      children: Array<{ type: string }>;
    };
    expect(vnode.children[1]!.type).toBe("divider");
  });

  it("includes row with sidebar and content", () => {
    const state = createInitialTuiState();
    const vnode = renderApp(mockUi, state) as {
      children: Array<{ type: string }>;
    };
    expect(vnode.children[2]!.type).toBe("row");
  });

  it("includes status bar divider and text", () => {
    const state = createInitialTuiState();
    const vnode = renderApp(mockUi, state) as {
      children: Array<{ type?: string; content?: string }>;
    };
    const last = vnode.children[vnode.children.length - 1]!;
    expect(last.content).toContain("Quit"); // status bar
  });

  it("includes notification when set", () => {
    const state = { ...createInitialTuiState(), notification: "Done!" };
    const vnode = renderApp(mockUi, state) as {
      children: Array<{ content?: string }>;
    };
    const notifNode = vnode.children.find((c) => c.content === "Done!");
    expect(notifNode).toBeTruthy();
  });

  it("omits notification when null", () => {
    const state = createInitialTuiState();
    const vnode = renderApp(mockUi, state) as {
      children: Array<{ content?: string }>;
    };
    const notifNode = vnode.children.find((c) => c.content === "Done!");
    expect(notifNode).toBeUndefined();
  });
});
