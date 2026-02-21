import type { App, VNode } from "@rezi-ui/core";
import type { AppView, ToolInfo } from "./types.js";
import type { EngineStatus } from "./widgets/config-dashboard.js";
import type { SessionRow } from "./widgets/session-browser.js";

/**
 * Simplified key event for handleKeyEvent (decoupled from Rezi's ZREV types).
 * The actual Rezi key handling uses app.keys() in startTui().
 */
export type SimpleKeyEvent = {
  key: string;
  ctrl?: boolean;
};

/**
 * TUI application state managed by Rezi.
 */
export type TuiState = {
  view: AppView;
  tools: ToolInfo[];
  sessions: SessionRow[];
  engines: EngineStatus[];
  mode: string;
  configHealth: string;
  sessionCount: number;
  selectedToolIndex: number;
  selectedSessionIndex: number;
  handoffPreview: string | null;
  notification: string | null;
  loading: boolean;
};

export function createInitialTuiState(): TuiState {
  return {
    view: "tools",
    tools: [],
    sessions: [],
    engines: [],
    mode: "unknown",
    configHealth: "Healthy",
    sessionCount: 0,
    selectedToolIndex: 0,
    selectedSessionIndex: 0,
    handoffPreview: null,
    notification: null,
    loading: true,
  };
}

/** View labels for the sidebar navigation. */
const VIEW_LABELS: Record<AppView, string> = {
  tools: "Tools",
  sessions: "Sessions",
  handoff: "Handoff",
  config: "Config",
};

const VIEW_ORDER: AppView[] = ["tools", "sessions", "handoff", "config"];

/**
 * Render the sidebar navigation panel.
 */
export function renderSidebar(ui: typeof import("@rezi-ui/core").ui, state: TuiState): VNode {
  const items = VIEW_ORDER.map((v) => {
    const active = state.view === v;
    const prefix = active ? ">" : " ";
    return ui.text(`${prefix} ${VIEW_LABELS[v]}`, {
      bold: active,
    });
  });

  return ui.box({ border: "single", title: "Navigation", p: 1, minWidth: 16 }, [
    ui.column({ gap: 0 }, items),
  ]);
}

/**
 * Render the tools list view.
 */
export function renderToolsView(ui: typeof import("@rezi-ui/core").ui, state: TuiState): VNode {
  if (state.tools.length === 0) {
    return ui.box({ border: "single", title: "Tools", p: 1, flex: 1 }, [
      ui.text(state.loading ? "Detecting tools..." : "No tools detected."),
    ]);
  }

  const rows = state.tools.map((tool, i) => {
    const selected = i === state.selectedToolIndex;
    const icon = tool.status === "available" ? "\u2713" : "\u2717";
    const sessions = tool.sessionCount > 0 ? ` (${tool.sessionCount})` : "";
    const prefix = selected ? ">" : " ";
    return ui.text(`${prefix} ${icon} ${tool.name.padEnd(20)} ${tool.command}${sessions}`, {
      bold: selected,
    });
  });

  return ui.box({ border: "single", title: "Tools", p: 1, flex: 1 }, [ui.column({ gap: 0 }, rows)]);
}

/**
 * Render the sessions view.
 */
export function renderSessionsView(ui: typeof import("@rezi-ui/core").ui, state: TuiState): VNode {
  if (state.sessions.length === 0) {
    return ui.box({ border: "single", title: "Sessions", p: 1, flex: 1 }, [
      ui.text(state.loading ? "Loading sessions..." : "No sessions found."),
    ]);
  }

  const rows = state.sessions.map((s, i) => {
    const selected = i === state.selectedSessionIndex;
    const prefix = selected ? ">" : " ";
    const date = s.updatedAt.slice(0, 10);
    return ui.text(`${prefix} [${s.tool}] ${s.title.slice(0, 40).padEnd(40)} ${date}`, {
      bold: selected,
    });
  });

  return ui.box({ border: "single", title: "Sessions", p: 1, flex: 1 }, [
    ui.column({ gap: 0 }, rows),
  ]);
}

/**
 * Render the handoff view.
 */
export function renderHandoffView(ui: typeof import("@rezi-ui/core").ui, state: TuiState): VNode {
  const content = state.handoffPreview
    ? ui.text(state.handoffPreview)
    : ui.text("Select a session in the Sessions view, then press Enter to preview handoff.");

  return ui.box({ border: "single", title: "Handoff", p: 1, flex: 1 }, [content]);
}

/**
 * Render the config dashboard view.
 */
export function renderConfigView(ui: typeof import("@rezi-ui/core").ui, state: TuiState): VNode {
  if (state.engines.length === 0) {
    return ui.box({ border: "single", title: "Config", p: 1, flex: 1 }, [
      ui.text(state.loading ? "Loading config status..." : "No engines found."),
    ]);
  }

  const rows = state.engines.map((e) => {
    const icon = e.configured ? "\u2713" : "\u2717";
    const statusText = e.configured ? "configured" : "not configured";
    return ui.text(`  ${icon} ${e.engine.padEnd(12)} ${statusText}`);
  });

  return ui.box({ border: "single", title: "Config", p: 1, flex: 1 }, [
    ui.column({ gap: 0 }, [
      ui.text(`Mode: ${state.mode}`),
      ui.text(`Health: ${state.configHealth}`),
      ui.text(""),
      ...rows,
    ]),
  ]);
}

/**
 * Render the content area based on active view.
 */
export function renderContent(ui: typeof import("@rezi-ui/core").ui, state: TuiState): VNode {
  switch (state.view) {
    case "tools":
      return renderToolsView(ui, state);
    case "sessions":
      return renderSessionsView(ui, state);
    case "handoff":
      return renderHandoffView(ui, state);
    case "config":
      return renderConfigView(ui, state);
  }
}

/**
 * Render the status bar at the bottom.
 */
export function renderStatusBar(ui: typeof import("@rezi-ui/core").ui, state: TuiState): VNode {
  const parts = [
    `Mode: ${state.mode}`,
    `Sessions: ${state.sessionCount}`,
    `Config: ${state.configHealth}`,
    "q:Quit  Tab:Nav  j/k:Select  Enter:Action",
  ];

  return ui.text(parts.join("  |  "), { dim: true });
}

/**
 * Render the notification bar (shown when state.notification is set).
 */
export function renderNotification(
  ui: typeof import("@rezi-ui/core").ui,
  state: TuiState,
): VNode | null {
  if (!state.notification) return null;
  return ui.text(state.notification, { bold: true });
}

/**
 * Build the full TUI view tree from state.
 */
export function renderApp(ui: typeof import("@rezi-ui/core").ui, state: TuiState): VNode {
  const children: VNode[] = [
    // Header
    ui.text("AI Tools Dashboard", { bold: true }),
    ui.divider(),

    // Main content: sidebar + content area
    ui.row({ gap: 1, flex: 1 }, [renderSidebar(ui, state), renderContent(ui, state)]),
  ];

  // Optional notification
  const notif = renderNotification(ui, state);
  if (notif) {
    children.push(notif);
  }

  // Status bar
  children.push(ui.divider());
  children.push(renderStatusBar(ui, state));

  return ui.column({ p: 1 }, children);
}

/**
 * Handle navigation between views.
 */
export function navigateView(state: TuiState, direction: "next" | "prev"): TuiState {
  const currentIndex = VIEW_ORDER.indexOf(state.view);
  const newIndex =
    direction === "next"
      ? (currentIndex + 1) % VIEW_ORDER.length
      : (currentIndex - 1 + VIEW_ORDER.length) % VIEW_ORDER.length;

  return { ...state, view: VIEW_ORDER[newIndex]! };
}

/**
 * Handle item selection within the current view.
 */
export function selectItem(state: TuiState, direction: "next" | "prev"): TuiState {
  if (state.view === "tools") {
    const max = Math.max(0, state.tools.length - 1);
    const idx =
      direction === "next"
        ? Math.min(state.selectedToolIndex + 1, max)
        : Math.max(state.selectedToolIndex - 1, 0);
    return { ...state, selectedToolIndex: idx };
  }

  if (state.view === "sessions") {
    const max = Math.max(0, state.sessions.length - 1);
    const idx =
      direction === "next"
        ? Math.min(state.selectedSessionIndex + 1, max)
        : Math.max(state.selectedSessionIndex - 1, 0);
    return { ...state, selectedSessionIndex: idx };
  }

  return state;
}

/**
 * Handle a simplified key event by updating state.
 * This is a pure state reducer decoupled from Rezi's ZREV event types.
 * The actual Rezi integration uses app.keys() in startTui().
 */
export function handleKeyEvent(
  state: TuiState,
  event: SimpleKeyEvent,
): { state: TuiState; stop: boolean } {
  const { key, ctrl } = event;

  // Quit
  if (key === "q" || (ctrl && key === "c")) {
    return { state, stop: true };
  }

  // Navigate views
  if (key === "Tab") {
    return { state: navigateView(state, "next"), stop: false };
  }
  if (key === "BackTab") {
    return { state: navigateView(state, "prev"), stop: false };
  }

  // Select items
  if (key === "j" || key === "Down") {
    return { state: selectItem(state, "next"), stop: false };
  }
  if (key === "k" || key === "Up") {
    return { state: selectItem(state, "prev"), stop: false };
  }

  // Number keys for direct view switching
  if (key === "1") return { state: { ...state, view: "tools" }, stop: false };
  if (key === "2") return { state: { ...state, view: "sessions" }, stop: false };
  if (key === "3") return { state: { ...state, view: "handoff" }, stop: false };
  if (key === "4") return { state: { ...state, view: "config" }, stop: false };

  return { state, stop: false };
}

/**
 * Create and start the Rezi TUI application.
 * Returns a promise that resolves when the app exits.
 */
export async function startTui(initialData: {
  tools: ToolInfo[];
  sessions: SessionRow[];
  engines: EngineStatus[];
  mode: string;
  configHealth: string;
  sessionCount: number;
}): Promise<void> {
  const { createNodeApp } = await import("@rezi-ui/node");
  const { ui, darkTheme } = await import("@rezi-ui/core");

  const initial = createInitialTuiState();
  initial.tools = initialData.tools;
  initial.sessions = initialData.sessions;
  initial.engines = initialData.engines;
  initial.mode = initialData.mode;
  initial.configHealth = initialData.configHealth;
  initial.sessionCount = initialData.sessionCount;
  initial.loading = false;

  const app: App<TuiState> = createNodeApp({
    initialState: initial,
    theme: darkTheme,
    config: {
      fpsCap: 30,
      rootPadding: 0,
    },
  });

  app.view((state) => renderApp(ui, state));

  // Keybinding system handles all input (matches handleKeyEvent logic)
  app.keys({
    q: () => void app.stop(),
    "ctrl+c": () => void app.stop(),
    Tab: (ctx) => ctx.update((s) => navigateView(s, "next")),
    "shift+Tab": (ctx) => ctx.update((s) => navigateView(s, "prev")),
    j: (ctx) => ctx.update((s) => selectItem(s, "next")),
    k: (ctx) => ctx.update((s) => selectItem(s, "prev")),
    Down: (ctx) => ctx.update((s) => selectItem(s, "next")),
    Up: (ctx) => ctx.update((s) => selectItem(s, "prev")),
    "1": (ctx) => ctx.update((s) => ({ ...s, view: "tools" as const })),
    "2": (ctx) => ctx.update((s) => ({ ...s, view: "sessions" as const })),
    "3": (ctx) => ctx.update((s) => ({ ...s, view: "handoff" as const })),
    "4": (ctx) => ctx.update((s) => ({ ...s, view: "config" as const })),
  });

  await app.start();
}
