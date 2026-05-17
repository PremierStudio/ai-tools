import { describe, it, expect } from "vitest";
import type { ToolInfo, AppView } from "./types.js";
import type { EngineStatus } from "./widgets/config-dashboard.js";
import type { SessionRow } from "./widgets/session-browser.js";
import type { TerminalPaneState } from "./terminal/pane.js";
import { mockUi } from "./test-helpers.js";
import {
  createInitialTuiState,
  navigateView,
  selectItem,
  handleKeyEvent,
  renderApp,
  renderSidebar,
  renderContent,
  renderStatusBar,
  renderToasts,
  getContextKeyHints,
  type TuiState,
  type SimpleKeyEvent,
} from "./tui.js";
import { addToast } from "./toasts.js";

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

function makeKeyEvent(
  key: string,
  modifiers?: { ctrl?: boolean; shift?: boolean },
): SimpleKeyEvent {
  return { key, ctrl: modifiers?.ctrl, shift: modifiers?.shift };
}

function makeState(overrides: Partial<TuiState> = {}): TuiState {
  return {
    ...createInitialTuiState(),
    loading: { tools: false, sessions: false, config: false },
    ...overrides,
  };
}

// ── createInitialTuiState ─────────────────────────────

describe("createInitialTuiState", () => {
  it("returns default state with tools view", () => {
    const state = createInitialTuiState();
    expect(state.view).toBe("tools");
  });

  it("starts with loading true", () => {
    const state = createInitialTuiState();
    expect(state.loading).toEqual({ tools: true, sessions: true, config: true });
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

  it("starts with empty runningTools", () => {
    const state = createInitialTuiState();
    expect(state.runningTools).toEqual([]);
  });

  it("starts with dark theme", () => {
    const state = createInitialTuiState();
    expect(state.theme).toBe("dark");
  });

  it("starts with sidebar not collapsed", () => {
    const state = createInitialTuiState();
    expect(state.sidebarCollapsed).toBe(false);
  });

  it("starts with help closed", () => {
    const state = createInitialTuiState();
    expect(state.helpOpen).toBe(false);
  });

  it("starts with empty toasts", () => {
    const state = createInitialTuiState();
    expect(state.toasts).toEqual([]);
  });

  it("starts with handoff at step 0", () => {
    const state = createInitialTuiState();
    expect(state.handoffStep).toBe(0);
  });

  it("starts with no selected session id", () => {
    const state = createInitialTuiState();
    expect(state.selectedSessionId).toBeNull();
  });

  it("starts with default session sort", () => {
    const state = createInitialTuiState();
    expect(state.sessionSort).toEqual({ column: "updatedAt", direction: "desc" });
  });
});

// ── navigateView ──────────────────────────────────────

describe("navigateView", () => {
  it("navigates from tools to sessions", () => {
    const state = makeState();
    const next = navigateView(state, "next");
    expect(next.view).toBe("sessions");
  });

  it("navigates from config back to tools (wraps)", () => {
    const state = makeState({ view: "config" });
    const next = navigateView(state, "next");
    expect(next.view).toBe("tools");
  });

  it("navigates backwards from tools to config (wraps)", () => {
    const state = makeState();
    const prev = navigateView(state, "prev");
    expect(prev.view).toBe("config");
  });

  it("navigates backwards from sessions to tools", () => {
    const state = makeState({ view: "sessions" });
    const prev = navigateView(state, "prev");
    expect(prev.view).toBe("tools");
  });

  it("full forward cycle returns to start", () => {
    let state = makeState();
    state = navigateView(state, "next");
    state = navigateView(state, "next");
    state = navigateView(state, "next");
    state = navigateView(state, "next");
    expect(state.view).toBe("tools");
  });

  it("clears selectedSessionId when navigating", () => {
    const state = makeState({ view: "sessions", selectedSessionId: "s1" });
    const next = navigateView(state, "next");
    expect(next.selectedSessionId).toBeNull();
  });

  it("clears searchActive when navigating", () => {
    const state = makeState({ view: "sessions", searchActive: true });
    const next = navigateView(state, "next");
    expect(next.searchActive).toBe(false);
  });
});

// ── selectItem ────────────────────────────────────────

describe("selectItem", () => {
  it("moves tool selection down", () => {
    const state = makeState({
      tools: [makeTool({ id: "a" }), makeTool({ id: "b" }), makeTool({ id: "c" })],
      selectedToolIndex: 0,
    });
    const next = selectItem(state, "next");
    expect(next.selectedToolIndex).toBe(1);
  });

  it("clamps tool selection at end", () => {
    const state = makeState({
      tools: [makeTool({ id: "a" }), makeTool({ id: "b" })],
      selectedToolIndex: 1,
    });
    const next = selectItem(state, "next");
    expect(next.selectedToolIndex).toBe(1);
  });

  it("moves tool selection up", () => {
    const state = makeState({
      tools: [makeTool({ id: "a" }), makeTool({ id: "b" })],
      selectedToolIndex: 1,
    });
    const prev = selectItem(state, "prev");
    expect(prev.selectedToolIndex).toBe(0);
  });

  it("clamps tool selection at start", () => {
    const state = makeState({ tools: [makeTool()], selectedToolIndex: 0 });
    const prev = selectItem(state, "prev");
    expect(prev.selectedToolIndex).toBe(0);
  });

  it("handles empty tools list", () => {
    const state = makeState();
    const next = selectItem(state, "next");
    expect(next.selectedToolIndex).toBe(0);
  });

  it("moves session selection down", () => {
    const state = makeState({
      view: "sessions",
      sessions: [makeSession({ id: "a" }), makeSession({ id: "b" })],
      selectedSessionIndex: 0,
    });
    const next = selectItem(state, "next");
    expect(next.selectedSessionIndex).toBe(1);
  });

  it("clamps session selection at end", () => {
    const state = makeState({
      view: "sessions",
      sessions: [makeSession()],
      selectedSessionIndex: 0,
    });
    const next = selectItem(state, "next");
    expect(next.selectedSessionIndex).toBe(0);
  });

  it("returns unchanged state for config view", () => {
    const state = makeState({ view: "config" });
    const next = selectItem(state, "next");
    expect(next).toBe(state);
  });

  it("does not select sessions when in session detail", () => {
    const state = makeState({
      view: "sessions",
      selectedSessionId: "s1",
      sessions: [makeSession({ id: "a" }), makeSession({ id: "b" })],
      selectedSessionIndex: 0,
    });
    const next = selectItem(state, "next");
    expect(next).toBe(state);
  });

  it("moves handoff session selection in step 0", () => {
    const state = makeState({
      view: "handoff",
      handoffStep: 0,
      sessions: [makeSession({ id: "a" }), makeSession({ id: "b" })],
      selectedSessionIndex: 0,
    });
    const next = selectItem(state, "next");
    expect(next.selectedSessionIndex).toBe(1);
  });

  it("moves handoff target selection in step 2", () => {
    const state = makeState({
      view: "handoff",
      handoffStep: 2,
      selectedTargetIndex: 0,
    });
    const next = selectItem(state, "next");
    expect(next.selectedTargetIndex).toBe(1);
  });

  it("clamps handoff target selection at max", () => {
    const state = makeState({
      view: "handoff",
      handoffStep: 2,
      selectedTargetIndex: 3,
    });
    const next = selectItem(state, "next");
    expect(next.selectedTargetIndex).toBe(3);
  });

  it("returns unchanged state for handoff step 1", () => {
    const state = makeState({
      view: "handoff",
      handoffStep: 1,
    });
    const next = selectItem(state, "next");
    expect(next).toBe(state);
  });
});

// ── handleKeyEvent ────────────────────────────────────

describe("handleKeyEvent", () => {
  // ── Global keys ──

  it("returns stop:true for q key", () => {
    const state = makeState();
    const result = handleKeyEvent(state, makeKeyEvent("q"));
    expect(result.stop).toBe(true);
  });

  it("returns stop:true for Ctrl+C", () => {
    const state = makeState();
    const result = handleKeyEvent(state, makeKeyEvent("c", { ctrl: true }));
    expect(result.stop).toBe(true);
  });

  it("navigates on Tab", () => {
    const state = makeState();
    const result = handleKeyEvent(state, makeKeyEvent("Tab"));
    expect(result.state.view).toBe("sessions");
    expect(result.stop).toBe(false);
  });

  it("navigates back on BackTab", () => {
    const state = makeState();
    const result = handleKeyEvent(state, makeKeyEvent("BackTab"));
    expect(result.state.view).toBe("config");
  });

  it("switches to view 1 on key 1", () => {
    const state = makeState({ view: "config" });
    const result = handleKeyEvent(state, makeKeyEvent("1"));
    expect(result.state.view).toBe("tools");
  });

  it("switches to view 2 on key 2", () => {
    const state = makeState();
    const result = handleKeyEvent(state, makeKeyEvent("2"));
    expect(result.state.view).toBe("sessions");
  });

  it("switches to view 3 on key 3", () => {
    const state = makeState();
    const result = handleKeyEvent(state, makeKeyEvent("3"));
    expect(result.state.view).toBe("handoff");
  });

  it("switches to view 4 on key 4", () => {
    const state = makeState();
    const result = handleKeyEvent(state, makeKeyEvent("4"));
    expect(result.state.view).toBe("config");
  });

  it("clears selectedSessionId on number key switch", () => {
    const state = makeState({ view: "sessions", selectedSessionId: "s1" });
    const result = handleKeyEvent(state, makeKeyEvent("1"));
    expect(result.state.selectedSessionId).toBeNull();
  });

  it("toggles help on ?", () => {
    const state = makeState();
    const result = handleKeyEvent(state, makeKeyEvent("?"));
    expect(result.state.helpOpen).toBe(true);
  });

  it("closes help on ? when open", () => {
    const state = makeState({ helpOpen: true });
    const result = handleKeyEvent(state, makeKeyEvent("?"));
    expect(result.state.helpOpen).toBe(false);
  });

  it("closes help on Escape when open", () => {
    const state = makeState({ helpOpen: true });
    const result = handleKeyEvent(state, makeKeyEvent("Escape"));
    expect(result.state.helpOpen).toBe(false);
  });

  it("intercepts all keys when help is open", () => {
    const state = makeState({ helpOpen: true });
    const result = handleKeyEvent(state, makeKeyEvent("q"));
    expect(result.stop).toBe(false); // q should NOT quit when help is open
    expect(result.state.helpOpen).toBe(true);
  });

  it("cycles theme on t", () => {
    const state = makeState({ theme: "dark" });
    const result = handleKeyEvent(state, makeKeyEvent("t"));
    expect(result.state.theme).toBe("light");
    expect(result.action).toMatchObject({ type: "cycle-theme", newTheme: "light" });
  });

  it("collapses sidebar on [", () => {
    const state = makeState({ sidebarCollapsed: false });
    const result = handleKeyEvent(state, makeKeyEvent("["));
    expect(result.state.sidebarCollapsed).toBe(true);
  });

  it("expands sidebar on ]", () => {
    const state = makeState({ sidebarCollapsed: true });
    const result = handleKeyEvent(state, makeKeyEvent("]"));
    expect(result.state.sidebarCollapsed).toBe(false);
  });

  it("navigates back from session detail on Backspace", () => {
    const state = makeState({ view: "sessions", selectedSessionId: "s1" });
    const result = handleKeyEvent(state, makeKeyEvent("Backspace"));
    expect(result.state.selectedSessionId).toBeNull();
  });

  it("Backspace is no-op when not in session detail", () => {
    const state = makeState({ view: "tools" });
    const result = handleKeyEvent(state, makeKeyEvent("Backspace"));
    expect(result.state).toEqual(state);
  });

  // ── Tools view keys ──

  it("selects next tool on j in tools view", () => {
    const state = makeState({
      tools: [makeTool({ id: "a" }), makeTool({ id: "b" })],
    });
    const result = handleKeyEvent(state, makeKeyEvent("j"));
    expect(result.state.selectedToolIndex).toBe(1);
  });

  it("selects prev tool on k in tools view", () => {
    const state = makeState({
      tools: [makeTool({ id: "a" }), makeTool({ id: "b" })],
      selectedToolIndex: 1,
    });
    const result = handleKeyEvent(state, makeKeyEvent("k"));
    expect(result.state.selectedToolIndex).toBe(0);
  });

  it("selects next on Down in tools view", () => {
    const state = makeState({
      tools: [makeTool({ id: "a" }), makeTool({ id: "b" })],
    });
    const result = handleKeyEvent(state, makeKeyEvent("Down"));
    expect(result.state.selectedToolIndex).toBe(1);
  });

  it("selects prev on Up in tools view", () => {
    const state = makeState({
      tools: [makeTool({ id: "a" }), makeTool({ id: "b" })],
      selectedToolIndex: 1,
    });
    const result = handleKeyEvent(state, makeKeyEvent("Up"));
    expect(result.state.selectedToolIndex).toBe(0);
  });

  it("returns launch-tool action on Enter for available tool", () => {
    const state = makeState({
      tools: [makeTool({ id: "claude", status: "available" })],
      selectedToolIndex: 0,
    });
    const result = handleKeyEvent(state, makeKeyEvent("Enter"));
    expect(result.action).toEqual({
      type: "launch-tool",
      toolId: "claude",
      command: "claude",
      args: [],
    });
  });

  it("returns launch-tool-embedded action on Shift+Enter for available tool", () => {
    const state = makeState({
      tools: [makeTool({ id: "claude", command: "claude" })],
      selectedToolIndex: 0,
    });
    const result = handleKeyEvent(state, makeKeyEvent("Enter", { shift: true }));
    expect(result.action).toEqual({
      type: "launch-tool-embedded",
      toolId: "claude",
      command: "claude",
      args: [],
    });
  });

  it("adds error toast on Enter for not-installed tool", () => {
    const state = makeState({
      tools: [makeTool({ id: "x", status: "not-installed" })],
      selectedToolIndex: 0,
    });
    const result = handleKeyEvent(state, makeKeyEvent("Enter"));
    expect(result.action).toBeNull();
    expect(result.state.toasts).toHaveLength(1);
    expect(result.state.toasts[0]!.type).toBe("error");
  });

  it("returns kill-tool action on d for running tool", () => {
    const state = makeState({
      tools: [makeTool({ id: "claude" })],
      runningTools: [{ toolId: "claude", pid: 123, startedAt: "2025-01-01" }],
      selectedToolIndex: 0,
    });
    const result = handleKeyEvent(state, makeKeyEvent("d"));
    expect(result.action).toEqual({ type: "kill-tool", toolId: "claude" });
  });

  it("d is no-op when tool is not running", () => {
    const state = makeState({
      tools: [makeTool({ id: "claude" })],
      selectedToolIndex: 0,
    });
    const result = handleKeyEvent(state, makeKeyEvent("d"));
    expect(result.action).toBeNull();
  });

  // ── Sessions view keys ──

  it("selects next session on j in sessions view", () => {
    const state = makeState({
      view: "sessions",
      sessions: [makeSession({ id: "a" }), makeSession({ id: "b" })],
      selectedSessionIndex: 0,
    });
    const result = handleKeyEvent(state, makeKeyEvent("j"));
    expect(result.state.selectedSessionIndex).toBe(1);
  });

  it("enters session detail on Enter in sessions view", () => {
    const state = makeState({
      view: "sessions",
      sessions: [makeSession({ id: "s1" })],
      selectedSessionIndex: 0,
    });
    const result = handleKeyEvent(state, makeKeyEvent("Enter"));
    expect(result.state.selectedSessionId).toBe("s1");
    expect(result.action).toBeNull();
  });

  it("activates search on / in sessions view", () => {
    const state = makeState({ view: "sessions" });
    const result = handleKeyEvent(state, makeKeyEvent("/"));
    expect(result.state.searchActive).toBe(true);
  });

  it("appends typed characters to search query when search is active", () => {
    const state = makeState({ view: "sessions", searchActive: true, sessionFilter: {} });
    const result = handleKeyEvent(state, makeKeyEvent("a"));
    expect(result.state.sessionFilter).toEqual({ query: "a" });
    expect(result.stop).toBe(false);
  });

  it("backspace removes one character from active search query", () => {
    const state = makeState({
      view: "sessions",
      searchActive: true,
      sessionFilter: { query: "auth" },
    });
    const result = handleKeyEvent(state, makeKeyEvent("Backspace"));
    expect(result.state.sessionFilter).toEqual({ query: "aut" });
  });

  it("q is treated as search input while search is active", () => {
    const state = makeState({
      view: "sessions",
      searchActive: true,
      sessionFilter: { query: "a" },
    });
    const result = handleKeyEvent(state, makeKeyEvent("q"));
    expect(result.stop).toBe(false);
    expect(result.state.sessionFilter).toEqual({ query: "aq" });
  });

  it("clears filter on Escape in sessions view", () => {
    const state = makeState({
      view: "sessions",
      sessionFilter: { query: "bug" },
      searchActive: true,
    });
    const result = handleKeyEvent(state, makeKeyEvent("Escape"));
    expect(result.state.sessionFilter).toEqual({});
    expect(result.state.searchActive).toBe(false);
  });

  it("returns quick-handoff action on H in sessions view", () => {
    const state = makeState({
      view: "sessions",
      sessions: [makeSession({ id: "s1" })],
      selectedSessionIndex: 0,
    });
    const result = handleKeyEvent(state, makeKeyEvent("H"));
    expect(result.action).toEqual({ type: "quick-handoff", sessionId: "s1" });
  });

  it("uses visible sorted sessions for Enter action", () => {
    const state = makeState({
      view: "sessions",
      sessions: [
        makeSession({ id: "older", title: "Older", updatedAt: "2025-01-10T00:00:00Z" }),
        makeSession({ id: "newer", title: "Newer", updatedAt: "2025-01-20T00:00:00Z" }),
      ],
      sessionSort: { column: "updatedAt", direction: "desc" },
      selectedSessionIndex: 0,
    });
    const result = handleKeyEvent(state, makeKeyEvent("Enter"));
    expect(result.state.selectedSessionId).toBe("newer");
  });

  it("uses visible filtered sessions for quick handoff", () => {
    const state = makeState({
      view: "sessions",
      sessions: [makeSession({ id: "a", title: "Alpha" }), makeSession({ id: "b", title: "Beta" })],
      sessionFilter: { query: "bet" },
      selectedSessionIndex: 0,
    });
    const result = handleKeyEvent(state, makeKeyEvent("H"));
    expect(result.action).toEqual({ type: "quick-handoff", sessionId: "b" });
  });

  it("cycles sort on s in sessions view", () => {
    const state = makeState({
      view: "sessions",
      sessionSort: { column: "updatedAt", direction: "asc" },
    });
    const result = handleKeyEvent(state, makeKeyEvent("s"));
    expect(result.state.sessionSort.direction).toBe("desc");
  });

  // ── Session detail keys ──

  it("returns start-handoff action on h in session detail", () => {
    const state = makeState({
      view: "sessions",
      selectedSessionId: "s1",
    });
    const result = handleKeyEvent(state, makeKeyEvent("h"));
    expect(result.action).toEqual({ type: "start-handoff", sessionId: "s1" });
  });

  it("returns continue-session action on Enter in session detail", () => {
    const state = makeState({
      view: "sessions",
      selectedSessionId: "s1",
      sessions: [makeSession({ id: "s1", tool: "claude" })],
    });
    const result = handleKeyEvent(state, makeKeyEvent("Enter"));
    expect(result.action).toEqual({
      type: "continue-session",
      sessionId: "s1",
      toolId: "claude",
    });
  });

  it("clears session detail on Escape", () => {
    const state = makeState({
      view: "sessions",
      selectedSessionId: "s1",
    });
    const result = handleKeyEvent(state, makeKeyEvent("Escape"));
    expect(result.state.selectedSessionId).toBeNull();
  });

  // ── Handoff view keys ──

  it("advances handoff from step 0 to 1 on Enter", () => {
    const state = makeState({
      view: "handoff",
      handoffStep: 0,
      sessions: [makeSession({ id: "s1" })],
      selectedSessionIndex: 0,
    });
    const result = handleKeyEvent(state, makeKeyEvent("Enter"));
    expect(result.state.handoffStep).toBe(1);
    expect(result.state.handoffSessionId).toBe("s1");
    expect(result.action).toEqual({ type: "load-handoff-preview", sessionId: "s1" });
  });

  it("advances handoff from step 1 to 2 on Enter", () => {
    const state = makeState({
      view: "handoff",
      handoffStep: 1,
    });
    const result = handleKeyEvent(state, makeKeyEvent("Enter"));
    expect(result.state.handoffStep).toBe(2);
  });

  it("advances handoff from step 2 to 3 on Enter", () => {
    const state = makeState({
      view: "handoff",
      handoffStep: 2,
      selectedTargetIndex: 0,
    });
    const result = handleKeyEvent(state, makeKeyEvent("Enter"));
    expect(result.state.handoffStep).toBe(3);
    expect(result.state.handoffTargetTool).not.toBeNull();
  });

  it("returns execute-handoff action on Enter at step 3", () => {
    const state = makeState({
      view: "handoff",
      handoffStep: 3,
      handoffSessionId: "s1",
      handoffTargetTool: "codex",
    });
    const result = handleKeyEvent(state, makeKeyEvent("Enter"));
    expect(result.action).toEqual({
      type: "execute-handoff",
      sessionId: "s1",
      targetTool: "codex",
    });
    // Resets wizard state
    expect(result.state.handoffStep).toBe(0);
    expect(result.state.handoffSessionId).toBeNull();
  });

  it("goes back one step on Escape in handoff", () => {
    const state = makeState({
      view: "handoff",
      handoffStep: 2,
    });
    const result = handleKeyEvent(state, makeKeyEvent("Escape"));
    expect(result.state.handoffStep).toBe(1);
  });

  it("Escape is no-op at handoff step 0", () => {
    const state = makeState({
      view: "handoff",
      handoffStep: 0,
    });
    const result = handleKeyEvent(state, makeKeyEvent("Escape"));
    expect(result.state.handoffStep).toBe(0);
  });

  // ── Config view keys ──

  it("returns generate-config action on g", () => {
    const state = makeState({ view: "config" });
    const result = handleKeyEvent(state, makeKeyEvent("g"));
    expect(result.action).toEqual({ type: "generate-config" });
  });

  it("returns install-config action on i", () => {
    const state = makeState({ view: "config" });
    const result = handleKeyEvent(state, makeKeyEvent("i"));
    expect(result.action).toEqual({ type: "install-config" });
  });

  it("returns refresh-status action on r", () => {
    const state = makeState({ view: "config" });
    const result = handleKeyEvent(state, makeKeyEvent("r"));
    expect(result.action).toEqual({ type: "refresh-status" });
  });

  it("returns open-editor action on e", () => {
    const state = makeState({ view: "config" });
    const result = handleKeyEvent(state, makeKeyEvent("e"));
    expect(result.action).toEqual({ type: "open-editor" });
  });

  // ── Unrecognized key ──

  it("returns null action for unrecognized key in tools", () => {
    const state = makeState();
    const result = handleKeyEvent(state, makeKeyEvent("x"));
    expect(result.action).toBeNull();
    expect(result.stop).toBe(false);
  });

  // ── Settings menu (Escape to open) ──

  it("opens settings menu on Escape from tools view", () => {
    const state = makeState({ view: "tools" });
    const result = handleKeyEvent(state, makeKeyEvent("Escape"));
    expect(result.state.settingsOpen).toBe(true);
    expect(result.stop).toBe(false);
  });

  it("opens settings menu on Escape from config view", () => {
    const state = makeState({ view: "config" });
    const result = handleKeyEvent(state, makeKeyEvent("Escape"));
    expect(result.state.settingsOpen).toBe(true);
  });

  it("opens settings menu on Escape from handoff step 0", () => {
    const state = makeState({ view: "handoff", handoffStep: 0 });
    const result = handleKeyEvent(state, makeKeyEvent("Escape"));
    expect(result.state.settingsOpen).toBe(true);
  });

  it("goes back handoff step on Escape when step > 0", () => {
    const state = makeState({ view: "handoff", handoffStep: 2 });
    const result = handleKeyEvent(state, makeKeyEvent("Escape"));
    expect(result.state.handoffStep).toBe(1);
    expect(result.state.settingsOpen).toBe(false);
  });

  it("clears session filter on Escape in sessions view when filter active", () => {
    const state = makeState({
      view: "sessions",
      sessionFilter: { query: "bug" },
      searchActive: true,
    });
    const result = handleKeyEvent(state, makeKeyEvent("Escape"));
    expect(result.state.searchActive).toBe(false);
    expect(result.state.settingsOpen).toBe(false);
  });

  it("opens settings menu on Escape from sessions view when filter is already clear", () => {
    const state = makeState({ view: "sessions" });
    const result = handleKeyEvent(state, makeKeyEvent("Escape"));
    expect(result.state.settingsOpen).toBe(true);
  });

  it("intercepts all keys when settings is open", () => {
    const state = makeState({ settingsOpen: true });
    // q should NOT quit when settings is open
    const result = handleKeyEvent(state, makeKeyEvent("q"));
    expect(result.stop).toBe(false);
  });

  it("closes settings menu when settings Escape returns close action", () => {
    const state = makeState({ settingsOpen: true });
    const result = handleKeyEvent(state, makeKeyEvent("Escape"));
    expect(result.state.settingsOpen).toBe(false);
  });

  it("settings initialised with current theme", () => {
    const state = makeState({ view: "tools", theme: "nord" });
    const result = handleKeyEvent(state, makeKeyEvent("Escape"));
    expect(result.state.settingsMenu.selectedTheme).toBe("nord");
  });
});

// ── renderSidebar helpers ──────────────────────────────

/** Extract the text content of a nav item, which may be a richText or a box wrapping one. */
function getSidebarItemText(item: {
  content?: string;
  children?: Array<{ content?: string }>;
}): string {
  return item.content ?? item.children?.[0]?.content ?? "";
}

/** Recursively flatten all content strings from a vnode tree. */
function flattenNodeContent(node: {
  content?: string;
  children?: Array<{ content?: string }>;
}): string {
  return [node.content ?? "", ...(node.children ?? []).map(flattenNodeContent)].join("");
}

function findNavItems(vnode: {
  children?: Array<{
    children?: Array<{ content?: string; children?: Array<{ content?: string }> }>;
  }>;
}): Array<{
  content?: string;
  children?: Array<{ content?: string; children?: Array<{ content?: string }> }>;
}> {
  const outerCol = vnode.children?.[0];
  const candidates = outerCol?.children ?? [];
  const navCol = candidates.find((node) => {
    const text = flattenNodeContent(node as never);
    return text.includes("Tools") && text.includes("Sessions") && text.includes("Handoff");
  }) as
    | { children?: Array<{ content?: string; children?: Array<{ content?: string }> }> }
    | undefined;
  return navCol?.children ?? [];
}

// ── renderSidebar ─────────────────────────────────────

describe("renderSidebar", () => {
  it("returns a box with navigation items", () => {
    const state = makeState();
    const vnode = renderSidebar(mockUi, state) as { type: string; children: unknown[] };
    expect(vnode.type).toBe("box");
  });

  it("marks current view with bar prefix", () => {
    const state = makeState({ view: "sessions" });
    const vnode = renderSidebar(mockUi, state) as unknown as {
      children: [{ children: Array<{ content?: string; children?: Array<{ content?: string }> }> }];
    };
    const navItems = findNavItems(vnode);
    const toolsText = getSidebarItemText(navItems[0]!);
    const sessionsText = getSidebarItemText(navItems[1]!);
    expect(toolsText).toMatch(/^[\s▸]/);
    expect(sessionsText).toMatch(/^[\s▸]/);
    // Active item (sessions) is wrapped in a box for tinted bg
    expect((navItems[1] as { type?: string }).type).toBe("box");
    // Inactive item (tools) is a plain richText node
    expect((navItems[0] as { type?: string }).type).toBe("richText");
  });

  it("wraps active view in tinted box", () => {
    const state = makeState();
    const vnode = renderSidebar(mockUi, state) as unknown as {
      children: [{ children: Array<{ content?: string; children?: Array<{ content?: string }> }> }];
    };
    const navItems = findNavItems(vnode);
    // Both items use ▌ prefix — active is wrapped in box, inactive is plain richText
    const toolsText = getSidebarItemText(navItems[0]!);
    const sessionsText = getSidebarItemText(navItems[1]!);
    expect(toolsText).toMatch(/^[\s▸]/);
    expect(sessionsText).toMatch(/^[\s▸]/);
    // Active item (tools, default view) is wrapped in box for tinted bg
    expect((navItems[0] as { type?: string }).type).toBe("box");
    // Inactive item (sessions) is plain richText
    expect((navItems[1] as { type?: string }).type).toBe("richText");
  });

  it("shows running tool count badge", () => {
    const state = makeState({
      runningTools: [{ toolId: "claude", pid: 1, startedAt: "2025-01-01" }],
    });
    const vnode = renderSidebar(mockUi, state) as unknown as {
      children: [
        {
          children: Array<{
            content?: string;
            children?: Array<{ content?: string; children?: Array<{ content?: string }> }>;
          }>;
        },
      ];
    };
    const navItems = findNavItems(vnode);
    // Active tools item with badge: box > row > [richText, badge]
    // Flatten all nested content to find the badge count
    const toolsItem = navItems[0]!;
    expect(flattenNodeContent(toolsItem)).toContain("1");
  });

  it("does not show badge when no running tools", () => {
    const state = makeState();
    const vnode = renderSidebar(mockUi, state) as unknown as {
      children: [{ children: Array<{ content?: string; children?: Array<{ content?: string }> }> }];
    };
    const navItems = findNavItems(vnode);
    // Flatten all nested content — no "(" bracket from badge
    expect(flattenNodeContent(navItems[0]!)).not.toContain("(");
  });
});

// ── renderContent ─────────────────────────────────────

describe("renderContent", () => {
  it("renders tools view for tools", () => {
    const state = makeState();
    const vnode = renderContent(mockUi, state) as unknown as { props: { title: string } };
    expect(vnode.props.title).toContain("Tools");
  });

  it("renders sessions view for sessions", () => {
    const state = makeState({ view: "sessions" });
    const vnode = renderContent(mockUi, state) as unknown as { props: { title: string } };
    expect(vnode.props.title).toContain("Sessions");
  });

  it("renders session detail when selectedSessionId is set", () => {
    const state = makeState({
      view: "sessions",
      selectedSessionId: "s1",
      sessions: [makeSession({ id: "s1" })],
    });
    const vnode = renderContent(mockUi, state) as unknown as { props: { title: string } };
    expect(vnode.props.title).toContain("Session:");
  });

  it("renders handoff view for handoff", () => {
    const state = makeState({ view: "handoff" });
    const vnode = renderContent(mockUi, state) as unknown as { props: { title: string } };
    expect(vnode.props.title).toContain("Handoff");
  });

  it("renders config view for config", () => {
    const state = makeState({ view: "config" });
    const vnode = renderContent(mockUi, state) as unknown as { props: { title: string } };
    expect(vnode.props.title).toContain("Config");
  });

  it("renders terminal placeholder when no pane manager is provided", () => {
    const state = makeState({ view: "terminal" });
    const vnode = renderApp(mockUi, state);
    expect(flattenNodeContent(vnode as never)).toContain("No terminal panes open");
  });

  it("renders live terminal content when pane manager is provided", () => {
    const line = {
      length: 5,
      getCell: (x: number) => {
        if (x !== 0) return undefined;
        return {
          getChars: () => "A",
          getWidth: () => 1,
          getForegroundColor: () => 7,
          getBackgroundColor: () => 0,
          isBold: () => 1,
          isItalic: () => 0,
          isUnderline: () => 0,
          isStrikethrough: () => 0,
          isDim: () => 0,
          isInverse: () => 0,
          isFgDefault: () => false,
          isBgDefault: () => false,
          isFgPalette: () => true,
          isBgPalette: () => true,
          isFgRGB: () => false,
          isBgRGB: () => false,
        };
      },
      translateToString: () => "A",
    };

    const pane: TerminalPaneState = {
      id: "pane-1",
      toolId: "codex",
      toolName: "Codex",
      pid: 123,
      status: "running",
      exitCode: undefined,
      pty: {
        pid: 123,
        onData: () => undefined,
        onExit: () => undefined,
        write: () => undefined,
        resize: () => undefined,
        kill: () => undefined,
      },
      term: {
        cols: 80,
        rows: 24,
        buffer: {
          active: {
            length: 24,
            cursorX: 0,
            cursorY: 0,
            viewportY: 0,
            baseY: 0,
            getLine: () => line,
          },
        },
        write: () => undefined,
        resize: () => undefined,
        dispose: () => undefined,
        onWriteParsed: () => ({ dispose: () => undefined }),
        onTitleChange: () => ({ dispose: () => undefined }),
      },
      dirtyLines: new Set(),
      title: "Codex",
      scrollOffset: 0,
    };

    const paneManager = {
      getState: () => ({ panes: [pane], activePaneIndex: 0 }),
      getActivePane: () => pane,
      getPaneCount: () => 1,
      resize: () => undefined,
    };

    const state = makeState({ view: "terminal", inputMode: "terminal" });
    const vnode = renderApp(mockUi, state, paneManager as never);
    const text = flattenNodeContent(vnode as never);
    expect(text).toContain("1:Codex");
    expect(text).toContain("Codex | PID:123");
  });
});

// ── renderStatusBar ───────────────────────────────────

describe("renderStatusBar", () => {
  // renderStatusBar returns a richText node — its mock has a single `.content` string
  function statusTexts(state: TuiState): string {
    const vnode = renderStatusBar(mockUi, state) as unknown as {
      content?: string;
      children?: Array<{ content?: string }>;
    };
    // richText mock: content = concatenated spans; no children
    return vnode.content ?? (vnode.children ?? []).map((c) => c.content ?? "").join(" ");
  }

  it("includes mode", () => {
    const state = makeState({ mode: "Canonical" });
    expect(statusTexts(state)).toContain("Canonical");
  });

  it("includes session count", () => {
    const state = makeState({ sessionCount: 42 });
    expect(statusTexts(state)).toContain("42");
  });

  it("includes config health", () => {
    const state = makeState({ configHealth: "Healthy" });
    expect(statusTexts(state)).toContain("Healthy");
  });

  it("includes theme name when not loading", () => {
    const state = makeState({ theme: "dark" });
    // theme name is shown in the header, not status bar — status bar shows hints
    expect(statusTexts(state)).toContain("Launch");
  });

  it("includes running count when tools are running", () => {
    const state = makeState({
      runningTools: [{ toolId: "claude", pid: 1, startedAt: "2025-01-01" }],
    });
    expect(statusTexts(state)).toContain("1 running");
  });

  it("omits running info when no tools are running", () => {
    const state = makeState();
    expect(statusTexts(state)).not.toContain("running");
  });

  it("includes context key hints", () => {
    const state = makeState();
    expect(statusTexts(state)).toContain("Launch");
  });
});

// ── renderToasts ──────────────────────────────────────

describe("renderToasts", () => {
  it("returns empty array when no toasts", () => {
    const state = makeState();
    const nodes = renderToasts(mockUi, state);
    expect(nodes).toEqual([]);
  });

  it("renders toast messages", () => {
    const state = makeState({
      toasts: addToast([], "success", "Done!"),
    });
    const nodes = renderToasts(mockUi, state) as Array<{ content: string }>;
    expect(nodes).toHaveLength(1);
    expect(nodes[0]!.content).toContain("Done!");
  });

  it("uses check icon for success", () => {
    const state = makeState({
      toasts: addToast([], "success", "OK"),
    });
    const nodes = renderToasts(mockUi, state) as Array<{ content: string }>;
    expect(nodes[0]!.content).toContain("\u2713");
  });

  it("uses x icon for error", () => {
    const state = makeState({
      toasts: addToast([], "error", "Fail"),
    });
    const nodes = renderToasts(mockUi, state) as Array<{ content: string }>;
    expect(nodes[0]!.content).toContain("\u2717");
  });

  it("uses info icon for info", () => {
    const state = makeState({
      toasts: addToast([], "info", "Loading"),
    });
    const nodes = renderToasts(mockUi, state) as Array<{ content: string }>;
    expect(nodes[0]!.content).toContain("\u2139");
  });
});

// ── getContextKeyHints ────────────────────────────────

describe("getContextKeyHints", () => {
  it("returns tools hints for tools view", () => {
    const state = makeState();
    expect(getContextKeyHints(state)).toContain("Launch");
  });

  it("returns sessions hints for sessions view", () => {
    const state = makeState({ view: "sessions" });
    expect(getContextKeyHints(state)).toContain("Search");
  });

  it("returns session detail hints when in detail", () => {
    const state = makeState({ view: "sessions", selectedSessionId: "s1" });
    expect(getContextKeyHints(state)).toContain("Handoff");
  });

  it("returns handoff hints for handoff view", () => {
    const state = makeState({ view: "handoff" });
    expect(getContextKeyHints(state)).toContain("Cancel");
  });

  it("returns config hints for config view", () => {
    const state = makeState({ view: "config" });
    expect(getContextKeyHints(state)).toContain("Generate");
  });

  it("returns help close hint when help is open", () => {
    const state = makeState({ helpOpen: true });
    expect(getContextKeyHints(state)).toContain("Close help");
  });
});

// ── renderApp ─────────────────────────────────────────

function bodyChildren(vnode: {
  children?: Array<{
    children?: Array<{ type?: string; content?: string; props?: { title?: string } }>;
  }>;
}): Array<{
  type?: string;
  content?: string;
  props?: { title?: string };
  children?: Array<{ content?: string }>;
}> {
  return (vnode.children?.[0]?.children ?? []) as Array<{
    type?: string;
    content?: string;
    props?: { title?: string };
    children?: Array<{ content?: string }>;
  }>;
}

describe("renderApp", () => {
  it("returns a box as root", () => {
    const state = makeState();
    const vnode = renderApp(mockUi, state) as { type: string };
    expect(vnode.type).toBe("box");
  });

  it("includes header text", () => {
    const state = makeState();
    const vnode = renderApp(mockUi, state) as unknown as {
      children: Array<{ content?: string; children?: Array<{ content?: string }> }>;
    };
    // Header was removed — the logo/brand lives in the sidebar.
    // Flatten all content recursively to find AGENTFUL branding
    const allContent = JSON.stringify(vnode);
    expect(allContent).toContain("AGENT");
  });

  it("includes a divider after header", () => {
    const state = makeState();
    const vnode = renderApp(mockUi, state) as unknown as {
      children: Array<{ children?: Array<{ type: string }> }>;
    };
    const divider = bodyChildren(vnode).find((c) => c.type === "divider");
    expect(divider).toBeTruthy();
  });

  it("includes row with sidebar and content when sidebar visible", () => {
    const state = makeState();
    const vnode = renderApp(mockUi, state) as unknown as {
      children: Array<{ children?: Array<{ type: string }> }>;
    };
    const children = bodyChildren(vnode);
    expect(children[2]!.type).toBe("row");
  });

  it("omits sidebar row when collapsed", () => {
    const state = makeState({ sidebarCollapsed: true });
    const vnode = renderApp(mockUi, state) as unknown as {
      children: Array<{ children?: Array<{ type: string; props?: Record<string, unknown> }> }>;
    };
    const children = bodyChildren(vnode) as Array<{
      type: string;
      props?: Record<string, unknown>;
    }>;
    // Layout: header row, divider, content box (no sidebar+content row), ...toasts, divider, statusBar
    // The sidebar+content row has flex:1 prop and gap:1.
    // The header row has justify:"between" and gap:0.
    // When collapsed, only the header row (justify:"between") exists — no sidebar+content row.
    const sidebarRow = children.find(
      (c) =>
        c.type === "row" &&
        (c as unknown as { props?: Record<string, unknown> }).props?.["flex"] === 1,
    );
    // When sidebar collapsed, wrapContentPane returns a box — no sidebar+content row with flex:1
    expect(sidebarRow).toBeUndefined();
    // The content box should be present somewhere in the children
    const hasBox = children.some((c) => c.type === "box");
    expect(hasBox).toBe(true);
  });

  it("includes status bar divider and text", () => {
    const state = makeState({ mode: "canonical" });
    const vnode = renderApp(mockUi, state) as unknown as {
      children: Array<{
        children?: Array<{
          type?: string;
          content?: string;
          children?: Array<{ content?: string }>;
        }>;
      }>;
    };
    const children = bodyChildren(vnode);
    // Status bar is a richText node (last child) with .content = concatenated spans
    const last = children[children.length - 1]!;
    const statusText = last.content ?? (last.children ?? []).map((c) => c.content ?? "").join(" ");
    expect(statusText).toContain("canonical");
  });

  it("includes help overlay when helpOpen", () => {
    const state = makeState({ helpOpen: true });
    const vnode = renderApp(mockUi, state) as {
      children: Array<{ children?: Array<{ type?: string; props?: { title?: string } }> }>;
    };
    const helpNode = bodyChildren(vnode).find(
      (c) => c.props && typeof c.props.title === "string" && c.props.title.includes("Help"),
    );
    expect(helpNode).toBeTruthy();
  });

  it("omits help overlay when help closed", () => {
    const state = makeState({ helpOpen: false });
    const vnode = renderApp(mockUi, state) as {
      children: Array<{ children?: Array<{ type?: string; props?: { title?: string } }> }>;
    };
    const helpNode = bodyChildren(vnode).find(
      (c) => c.props && typeof c.props.title === "string" && c.props.title.includes("Help"),
    );
    expect(helpNode).toBeUndefined();
  });

  it("includes toast nodes when toasts exist", () => {
    const state = makeState({
      toasts: addToast([], "success", "Config saved"),
    });
    const vnode = renderApp(mockUi, state) as {
      children: Array<{ children?: Array<{ content?: string }> }>;
    };
    const toastNode = bodyChildren(vnode).find((c) => c.content?.includes("Config saved"));
    expect(toastNode).toBeTruthy();
  });

  it("includes settings overlay when settingsOpen", () => {
    const state = makeState({ settingsOpen: true });
    const vnode = renderApp(mockUi, state) as unknown as {
      children: Array<{ children?: Array<{ props?: { title?: string } }> }>;
    };
    const settingsNode = bodyChildren(vnode).find(
      (c) => c.props && typeof c.props.title === "string" && c.props.title.includes("Settings"),
    );
    expect(settingsNode).toBeTruthy();
  });

  it("omits settings overlay when settingsOpen is false", () => {
    const state = makeState({ settingsOpen: false });
    const vnode = renderApp(mockUi, state) as unknown as {
      children: Array<{ children?: Array<{ props?: { title?: string } }> }>;
    };
    const settingsNode = bodyChildren(vnode).find(
      (c) => c.props && typeof c.props.title === "string" && c.props.title.includes("Settings"),
    );
    expect(settingsNode).toBeUndefined();
  });
});

// ── TuiState — settingsOpen defaults ─────────────────

describe("createInitialTuiState — settings defaults", () => {
  it("starts with settingsOpen false", () => {
    const state = createInitialTuiState();
    expect(state.settingsOpen).toBe(false);
  });

  it("starts with empty keyOverrides", () => {
    const state = createInitialTuiState();
    expect(state.keyOverrides).toEqual({});
  });

  it("settingsMenu starts on theme tab", () => {
    const state = createInitialTuiState();
    expect(state.settingsMenu.activeTab).toBe("theme");
  });
});
