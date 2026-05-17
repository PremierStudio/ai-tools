import type { App, VNode } from "@rezi-ui/core";
import type { AppView, InputMode, ToolInfo, UiKit } from "./types.js";
import type { EngineStatus } from "./widgets/config-dashboard.js";
import type { SessionRow } from "./widgets/session-browser.js";
import { getTheme } from "./theme/index.js";
import type { UiCacheData } from "./ui-cache.js";
import type { ToolsViewState } from "./views/tools.js";
import type { SessionsViewState } from "./views/sessions.js";
import type { SessionDetailState } from "./views/session-detail.js";
import type { HandoffViewState } from "./views/handoff.js";
import type { ConfigViewState } from "./views/config.js";
import { renderToolsView, getToolsKeyHints } from "./views/tools.js";
import { renderSessionsView, getSessionsKeyHints } from "./views/sessions.js";
import { renderSessionDetailView, getSessionDetailKeyHints } from "./views/session-detail.js";
import { renderHandoffView, getHandoffKeyHints } from "./views/handoff.js";
import { renderConfigView, getConfigKeyHints } from "./views/config.js";
import { renderHelpOverlay } from "./views/help.js";
import { renderSettingsMenu, createSettingsMenuState } from "./views/settings.js";
import { addToast, expireToasts } from "./toasts.js";
import { loadPreferences } from "./preferences.js";
import type { PaneManager } from "./terminal/manager.js";
import type { TerminalKeyEvent, CommandAction } from "./terminal/input.js";
import { isLeaderKey, keyEventToTerminalInput, parseCommandKey } from "./terminal/input.js";
import { navigateView, selectItem, handleKeyEvent } from "./runtime/key-handler.js";
import { createActionExecutor } from "./runtime/action-executor.js";
import { buildDashboardKeyHandlers } from "./runtime/keybindings.js";
import { createTerminalCommandExecutor } from "./runtime/terminal-command-executor.js";
import type { KeyResult as RuntimeKeyResult } from "./runtime/types.js";
import {
  buildRenderedLines,
  buildTabEntries,
  formatStatusBar,
  formatTabBar,
  getCommandOverlayText,
} from "./terminal/renderer.js";
export type { SimpleKeyEvent } from "./runtime/types.js";
import type { TuiState as RuntimeTuiState, TuiLoadingState } from "./runtime/state.js";

export type KeyResult = RuntimeKeyResult<TuiState>;
export type TuiState = RuntimeTuiState;

export function createInitialTuiState(): TuiState {
  return {
    view: "tools",
    inputMode: "dashboard",
    tools: [],
    sessions: [],
    engines: [],
    mode: "unknown",
    configHealth: "Healthy",
    sessionCount: 0,
    selectedToolIndex: 0,
    selectedSessionIndex: 0,
    runningTools: [],
    sessionFilter: {},
    sessionSort: { column: "updatedAt", direction: "desc" },
    searchActive: false,
    selectedSessionId: null,
    handoffStep: 0,
    handoffSessionId: null,
    handoffTargetTool: null,
    handoffPreview: null,
    selectedTargetIndex: 0,
    commandPaletteOpen: false,
    commandPaletteQuery: "",
    helpOpen: false,
    settingsOpen: false,
    settingsMenu: createSettingsMenuState("dark"),
    keyOverrides: {},
    theme: "dark",
    sidebarCollapsed: false,
    toasts: [],
    notification: null,
    loading: { tools: true, sessions: true, config: true },
    activePane: "content",
  };
}

/** View labels for the sidebar navigation. */
const VIEW_LABELS: Record<AppView, string> = {
  tools: "Tools",
  sessions: "Sessions",
  handoff: "Handoff",
  config: "Config",
  terminal: "Terminal",
};

/** Dashboard views for Tab/number navigation. Terminal is accessed via backtick. */
const VIEW_ORDER: AppView[] = ["tools", "sessions", "handoff", "config"];

export { navigateView, selectItem, handleKeyEvent };

// ── Render Functions ────────────────────────────────────

import {
  BRAND,
  STATUS,
  SURFACE,
  TEXT,
  BORDER,
  TOOLS,
  LOGO_LINES,
  PL_MODE_BG,
  PL_HEALTH_BG_OK,
  PL_HEALTH_BG_WARN,
  PL_HEALTH_BG_ERR,
  PL_SESSIONS_BG,
  PL_RUNNING_BG,
  PL_HINTS_BG,
  COLOR_SEPARATOR,
  TOAST_SUCCESS_BG,
  TOAST_ERROR_BG,
  TOAST_INFO_BG,
  dimColor,
  tintBg,
  glowColor,
  lerpColor,
  getIconChar,
  getViewIcon,
  GAP,
  PADDING,
  THEME_LAYOUT,
  BORDER_STYLE,
  type RgbColor,
} from "./theme.js";

const ACCENT_INDIGO: RgbColor = { r: 129, g: 140, b: 248 };

/** View-specific colors for sidebar and header */
const VIEW_COLORS: Record<AppView, RgbColor> = {
  tools: BRAND.base,
  sessions: STATUS.info,
  handoff: TOOLS.cursor,
  config: STATUS.warning,
  terminal: STATUS.success,
};

function withDefaultBgStyle(
  style: Record<string, unknown> | undefined,
  defaultBg: RgbColor,
): Record<string, unknown> | undefined {
  if (!style) return style;
  if (!("fg" in style) || "bg" in style) return style;
  return { ...style, bg: defaultBg };
}

function withDefaultBgProps(
  props: Record<string, unknown> | undefined,
  defaultBg: RgbColor,
): Record<string, unknown> | undefined {
  if (!props) return props;
  const style = props.style;
  if (!style || typeof style !== "object" || Array.isArray(style)) return props;
  const normalizedStyle = withDefaultBgStyle(style as Record<string, unknown>, defaultBg);
  if (normalizedStyle === style) return props;
  return { ...props, style: normalizedStyle };
}

function withDefaultBgUi<T>(ui: UiKit<T>, defaultBg: RgbColor): UiKit<T> {
  return {
    text(content, props) {
      return ui.text(content, withDefaultBgProps(props, defaultBg));
    },
    box(props, children) {
      return ui.box(withDefaultBgProps(props, defaultBg) ?? props, children);
    },
    column(props, children) {
      return ui.column(withDefaultBgProps(props, defaultBg) ?? props, children);
    },
    row(props, children) {
      return ui.row(withDefaultBgProps(props, defaultBg) ?? props, children);
    },
    divider(props) {
      return ui.divider(withDefaultBgProps(props, defaultBg));
    },
    spinner(props) {
      return ui.spinner(withDefaultBgProps(props, defaultBg));
    },
    modal(props) {
      return ui.modal(
        withDefaultBgProps(props, defaultBg) as Record<string, unknown> & { content: T },
      );
    },
    richText(spans, props) {
      const normalizedSpans = spans.map((span) => {
        if (!span.style || typeof span.style !== "object" || Array.isArray(span.style)) {
          return span;
        }
        const normalizedStyle = withDefaultBgStyle(
          span.style as Record<string, unknown>,
          defaultBg,
        );
        if (normalizedStyle === span.style) return span;
        return { ...span, style: normalizedStyle };
      });
      return ui.richText(normalizedSpans, withDefaultBgProps(props, defaultBg));
    },
    badge(text, props) {
      return ui.badge(text, withDefaultBgProps(props, defaultBg));
    },
    progress(value, props) {
      return ui.progress(value, withDefaultBgProps(props, defaultBg));
    },
    tag(text, props) {
      return ui.tag(text, withDefaultBgProps(props, defaultBg));
    },
    gauge(value, props) {
      return ui.gauge(value, withDefaultBgProps(props, defaultBg));
    },
    callout(message, props) {
      return ui.callout(message, withDefaultBgProps(props, defaultBg));
    },
  };
}

/**
 * Render the sidebar navigation panel.
 *
 * Layout (top→bottom inside heavy box with brand border):
 *   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓
 *   ┃         ◆                ┃  ← logo: emerald→cyan gradient with glow
 *   ┃       ╱   ╲              ┃
 *   ┃      ╱  ◉  ╲             ┃
 *   ┃    ◆─────────◆           ┃
 *   ┃   AGENTFUL               ┃  ← brand wordmark (teal→cyan)
 *   ┃ ═══════════════════════  ┃
 *   ┃  ▌ ⚙  Tools         2   ┃  ← active: brand gutter bar + elevated bg
 *   ┃    ◈  Sessions      12   ┃
 *   ┃    ⇄  Handoff            ┃
 *   ┃    ≡  Config             ┃
 *   ┃ ───────────────────────  ┃
 *   ┃  Tab/↑↓  Esc:Settings   ┃
 *   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 */
export function renderSidebar<T>(
  ui: Pick<UiKit<T>, "text" | "box" | "column" | "row" | "divider" | "richText" | "badge">,
  state: TuiState,
): T {
  const sidebarFocused = state.activePane === "sidebar";
  const borderColor = sidebarFocused ? glowColor(BRAND.accent, 0.3) : BORDER.default;

  // ── Logo block with enhanced glow effect ───────────────────
  const logoNodes: T[] = LOGO_LINES.map((line, idx) => {
    if (line.includes("◉")) {
      const idxChar = line.indexOf("◉");
      return ui.richText([
        { text: line.slice(0, idxChar), style: { fg: BRAND.primary } },
        { text: "◉", style: { fg: BRAND.accent, bold: true } },
        { text: line.slice(idxChar + 1), style: { fg: BRAND.secondary } },
      ]);
    }
    if (line.includes("───")) {
      return ui.richText([{ text: line, style: { fg: BRAND.base } }]);
    }
    const mid = Math.floor(line.length / 2);
    // Subtle gradient effect from top to bottom
    const gradientFactor = idx / (LOGO_LINES.length - 1);
    const lineColor = lerpColor(BRAND.primary, BRAND.secondary, gradientFactor);
    return ui.richText([
      { text: line.slice(0, mid), style: { fg: lineColor } },
      { text: line.slice(mid), style: { fg: BRAND.secondary } },
    ]);
  });

  // Brand wordmark — AGENT in teal, FUL in particle cyan
  const wordmark = ui.richText([
    { text: "  ", style: {} },
    { text: "AGENT", style: { fg: BRAND.base, bold: true } },
    { text: "FUL", style: { fg: BRAND.accent, bold: true } },
  ]);

  // ── Nav items with enhanced visual hierarchy ───────────────
  const navItems = VIEW_ORDER.map((v) => {
    const active = state.view === v;
    const icon = getIconChar(getViewIcon(v));
    const label = VIEW_LABELS[v] ?? v;
    const viewColor = VIEW_COLORS[v] ?? BRAND.base;

    // Active item: full brightness with selection glow
    // Inactive: muted but still visible
    const labelColor = active ? TEXT.primary : TEXT.tertiary;
    const iconColor = active ? viewColor : dimColor(viewColor, 0.5);
    const prefixColor = active ? viewColor : SURFACE.base;

    // Left selection bar — ▌ for active with glow effect, thin space for inactive
    const prefix = active ? getIconChar("powerline.separator") : " ";

    // Badge counts for tools and sessions
    const hasBadge =
      state.settingsMenu.showPaneBadge &&
      ((v === "tools" && state.runningTools.length > 0) ||
        (v === "sessions" && state.sessionCount > 0));
    const badgeVal =
      v === "tools" ? state.runningTools.length : v === "sessions" ? state.sessionCount : 0;

    // Create the text content
    const textNode = ui.richText([
      { text: prefix, style: { fg: prefixColor, bold: true } },
      { text: " ", style: {} },
      { text: icon, style: { fg: iconColor, bold: active } },
      { text: " ", style: {} },
      { text: label, style: { fg: labelColor, bold: active } },
    ]);

    if (!hasBadge) {
      // Wrap active item in tinted bg box with glow effect
      if (active) {
        return ui.box({ style: { bg: tintBg(viewColor, 0.15) }, pl: GAP.none }, [textNode]);
      }
      return textNode;
    }

    const rowContent = ui.row({ gap: GAP.tight, justify: "between" }, [
      textNode,
      ui.badge(String(badgeVal), {
        variant: v === "tools" ? "info" : "success",
      }),
    ]);

    if (active) {
      return ui.box({ style: { bg: tintBg(viewColor, 0.15) }, pl: GAP.none }, [rowContent]);
    }
    return rowContent;
  });

  // ── Hint line with enhanced styling ────────────────────────
  const hint = ui.richText([
    { text: "Tab", style: { fg: ACCENT_INDIGO, bold: true } },
    { text: "/", style: { fg: TEXT.tertiary } },
    { text: "↑↓", style: { fg: TEXT.secondary } },
    { text: "    ", style: {} },
    { text: "Esc", style: { fg: ACCENT_INDIGO, bold: true } },
    { text: ":Settings", style: { fg: TEXT.tertiary } },
  ]);

  // ── Footer with version info ────────────────────────────────
  const footer = ui.richText([
    { text: "v1.0", style: { fg: dimColor(BRAND.base, 0.6) } },
    { text: "  ", style: {} },
    { text: "?", style: { fg: TEXT.tertiary, bold: true } },
    { text: ":Help", style: { fg: dimColor(BRAND.base, 0.6) } },
  ]);

  return ui.box(
    {
      border: sidebarFocused ? BORDER_STYLE.heavy : BORDER_STYLE.rounded,
      minWidth: THEME_LAYOUT.sidebar.minWidth,
      maxWidth: THEME_LAYOUT.sidebar.maxWidth,
      style: { fg: borderColor, bg: SURFACE.base },
      pt: PADDING.compact,
      pb: PADDING.compact,
      pl: GAP.none,
      pr: PADDING.compact,
    },
    [
      ui.column({ gap: GAP.none }, [
        ...logoNodes,
        wordmark,
        ui.divider({ char: "═" }),
        ui.column({ gap: GAP.tight }, navItems),
        ui.divider(),
        hint,
        ui.text("", { style: { fg: SURFACE.base } }),
        footer,
      ]),
    ],
  );
}

/**
 * Extract ToolsViewState from TuiState.
 */
function toToolsViewState(state: TuiState): ToolsViewState {
  return {
    tools: state.tools,
    selectedToolIndex: state.selectedToolIndex,
    loadingTools: state.loading.tools,
    runningTools: state.runningTools,
  };
}

/**
 * Extract SessionsViewState from TuiState.
 */
function toSessionsViewState(state: TuiState): SessionsViewState {
  return {
    sessions: state.sessions,
    selectedSessionIndex: state.selectedSessionIndex,
    loadingSessions: state.loading.sessions,
    sessionFilter: state.sessionFilter,
    sessionSort: state.sessionSort,
  };
}

/**
 * Extract SessionDetailState from TuiState.
 */
function toSessionDetailState(state: TuiState): SessionDetailState {
  return {
    sessions: state.sessions,
    selectedSessionId: state.selectedSessionId,
  };
}

/**
 * Extract HandoffViewState from TuiState.
 */
function toHandoffViewState(state: TuiState): HandoffViewState {
  return {
    sessions: state.sessions,
    handoffStep: state.handoffStep,
    handoffSessionId: state.handoffSessionId,
    handoffTargetTool: state.handoffTargetTool,
    handoffPreview: state.handoffPreview,
    selectedSessionIndex: state.selectedSessionIndex,
    selectedTargetIndex: state.selectedTargetIndex,
  };
}

/**
 * Extract ConfigViewState from TuiState.
 */
function toConfigViewState(state: TuiState): ConfigViewState {
  return {
    engines: state.engines,
    mode: state.mode,
    configHealth: state.configHealth,
    loadingConfig: state.loading.config,
  };
}

/**
 * Render the content area based on active view.
 */
export function renderContent<T>(ui: UiKit<T>, state: TuiState): T {
  switch (state.view) {
    case "tools":
      return renderToolsView(ui, toToolsViewState(state));
    case "sessions":
      if (state.selectedSessionId) {
        return renderSessionDetailView(ui, toSessionDetailState(state));
      }
      return renderSessionsView(ui, toSessionsViewState(state));
    case "handoff":
      return renderHandoffView(ui, toHandoffViewState(state));
    case "config":
      return renderConfigView(ui, toConfigViewState(state));
    case "terminal":
      return ui.box(
        {
          border: BORDER_STYLE.single,
          title: "Terminal",
          p: PADDING.compact,
          flex: 1,
          style: { bg: SURFACE.base },
        },
        [ui.text("No terminal panes open. Launch a tool with Shift+Enter from Tools.")],
      );
  }
}

function renderTerminalContent<T>(ui: UiKit<T>, state: TuiState, paneManager: PaneManager): T {
  const managerState = paneManager.getState();
  const activePane = paneManager.getActivePane();

  if (managerState.panes.length === 0 || !activePane) {
    return renderContent(ui, { ...state, view: "terminal" });
  }

  const terminalWidth = process.stdout.columns ?? 120;
  const terminalHeight = process.stdout.rows ?? 30;
  const contentWidth = Math.max(40, terminalWidth - (state.sidebarCollapsed ? 8 : 38));
  const contentRows = Math.max(6, terminalHeight - 10);

  const tabBar = formatTabBar(
    buildTabEntries(managerState.panes, managerState.activePaneIndex),
    contentWidth,
  );
  const lines = buildRenderedLines(activePane, 0, contentRows, contentWidth);
  const status = formatStatusBar({
    toolName: activePane.toolName,
    pid: activePane.pid,
    status: activePane.status,
    exitCode: activePane.exitCode,
    cols: activePane.term.cols,
    rows: activePane.term.rows,
    mode: state.inputMode,
  });

  const body = lines.map((line) => {
    if (line.segments.length === 0) {
      return ui.text("");
    }
    return ui.richText(
      line.segments.map((segment) => ({ text: segment.text, style: segment.style })),
      { style: { bg: { r: 0, g: 0, b: 0 } } },
    );
  });

  const commandOverlay =
    state.inputMode === "command"
      ? ui.box(
          {
            border: BORDER_STYLE.rounded,
            title: "Command",
            p: PADDING.compact,
            style: { bg: tintBg(STATUS.info, 0.14), fg: TEXT.primary },
          },
          getCommandOverlayText().map((line) => ui.text(line)),
        )
      : null;

  return ui.box(
    {
      border: BORDER_STYLE.single,
      title: `Terminal • ${activePane.toolName}`,
      p: "none",
      flex: 1,
      style: { bg: SURFACE.base },
    },
    [
      ui.column({ gap: GAP.none }, [
        ui.box({ style: { bg: tintBg(BRAND.secondary, 0.16) }, px: PADDING.component }, [
          ui.text(tabBar || "(no tabs)"),
        ]),
        ui.divider(),
        ui.box({ px: PADDING.compact, py: PADDING.compact, style: { bg: { r: 0, g: 0, b: 0 } } }, [
          ui.column({ gap: GAP.none }, body),
        ]),
        ui.divider(),
        ui.box({ style: { bg: tintBg(STATUS.neutral, 0.14) }, px: PADDING.component }, [
          ui.text(status),
        ]),
        ...(commandOverlay ? [commandOverlay] : []),
      ]),
    ],
  );
}

/**
 * Render a powerline-style status bar with enhanced visual design.
 *
 * Each segment has its own background color block separated by powerline chevrons (▐▌).
 *
 * Visual enhancements:
 * - Vibrant color palette
 * - Clear visual hierarchy
 * - Consistent spacing
 * - Brand-colored icons
 *
 *  ◆ canonical ▐  ● healthy ▐  ◈ 12 sessions ▐  ▶ 1 running ▐  Enter:Launch …
 *  [deep indigo] [green/warn/red] [deep teal]   [deep green]   [very dark]
 */
export function renderStatusBar<T>(
  ui: Pick<UiKit<T>, "text" | "row" | "richText">,
  state: TuiState,
): T {
  const cMuted = TEXT.tertiary;
  const isAnyLoading = state.loading.tools || state.loading.sessions || state.loading.config;
  const loadingSlices = [
    state.loading.tools ? "T" : "",
    state.loading.sessions ? "S" : "",
    state.loading.config ? "C" : "",
  ]
    .filter(Boolean)
    .join("/");
  const isInitialLoading =
    isAnyLoading &&
    state.tools.length === 0 &&
    state.sessions.length === 0 &&
    state.engines.length === 0;
  const readyTools = state.tools.filter((t) => t.status === "available").length;
  const installedTools = state.tools.filter((t) => t.status !== "not-installed").length;
  const refreshIsActiveView = state.view === "sessions" && !state.selectedSessionId;
  const refreshMs = refreshIsActiveView
    ? state.settingsMenu.sessionRefreshActiveMs
    : state.settingsMenu.sessionRefreshIdleMs;
  const refreshSeconds = Math.floor(refreshMs / 1000);
  const runtimeLabel =
    state.inputMode === "dashboard"
      ? state.activePane === "sidebar"
        ? "nav"
        : "dash"
      : state.inputMode;
  const toolBg = tintBg(BRAND.base, 0.2);
  const runtimeBg = tintBg(ACCENT_INDIGO, 0.22);
  const refreshBg = tintBg(BRAND.accent, 0.18);

  if (isInitialLoading) {
    return ui.richText([
      {
        text: ` ${getIconChar("brand.logo")} `,
        style: { fg: BRAND.accent, bold: true, bg: PL_MODE_BG },
      },
      { text: " Agentful ", style: { fg: BRAND.base, bold: true, bg: PL_MODE_BG } },
      { text: getIconChar("powerline.segment"), style: { fg: PL_MODE_BG, bg: PL_HINTS_BG } },
      { text: "  scanning…  ", style: { fg: cMuted, bg: PL_HINTS_BG } },
      { text: "  q", style: { fg: cMuted, bold: true, bg: PL_HINTS_BG } },
      { text: ":Quit", style: { fg: COLOR_SEPARATOR, bg: PL_HINTS_BG } },
    ]);
  }

  const health = state.configHealth.toLowerCase();
  const hColor =
    health === "healthy" || health === "ok"
      ? STATUS.success
      : health === "stale" || health === "warning"
        ? STATUS.warning
        : STATUS.error;
  const hBg =
    health === "healthy" || health === "ok"
      ? PL_HEALTH_BG_OK
      : health === "stale" || health === "warning"
        ? PL_HEALTH_BG_WARN
        : PL_HEALTH_BG_ERR;
  const hDot =
    health === "healthy" || health === "ok"
      ? getIconChar("status.active")
      : health === "stale"
        ? "◐"
        : getIconChar("status.error");

  const hints = getContextKeyHints(state);
  // Parse hint string "key:Action  key2:Action2" into alternating key/desc spans
  const hintSpans = hints.split(/(?=\b\w+:)/).flatMap((chunk, i) => {
    const trimmed = chunk.trim();
    if (!trimmed) return [];
    const colonIdx = trimmed.indexOf(":");
    const k = colonIdx >= 0 ? trimmed.slice(0, colonIdx) : trimmed;
    const v = colonIdx >= 0 ? trimmed.slice(colonIdx + 1) : "";
    return [
      ...(i > 0 ? [{ text: "  ", style: { fg: COLOR_SEPARATOR, bg: PL_HINTS_BG } }] : []),
      { text: k, style: { fg: BRAND.base, bold: true, bg: PL_HINTS_BG } },
      { text: ":", style: { fg: COLOR_SEPARATOR, bg: PL_HINTS_BG } },
      { text: v, style: { fg: cMuted, bg: PL_HINTS_BG } },
    ];
  });

  return ui.richText([
    // Mode segment with brand icon
    {
      text: ` ${getIconChar("brand.logo")} `,
      style: { fg: BRAND.accent, bold: true, bg: PL_MODE_BG },
    },
    { text: ` ${state.mode} `, style: { fg: TEXT.secondary, bg: PL_MODE_BG } },
    { text: getIconChar("powerline.segment"), style: { fg: PL_MODE_BG, bg: hBg } },
    // Health segment with status icon
    { text: ` ${hDot} `, style: { fg: hColor, bold: true, bg: hBg } },
    { text: `${state.configHealth} `, style: { fg: hColor, bg: hBg } },
    { text: getIconChar("powerline.segment"), style: { fg: hBg, bg: PL_SESSIONS_BG } },
    // Sessions segment
    {
      text: ` ${getIconChar("nav.sessions")} `,
      style: { fg: BRAND.accent, bold: true, bg: PL_SESSIONS_BG },
    },
    {
      text: `${state.sessionCount}`,
      style: { fg: TEXT.primary, bold: true, bg: PL_SESSIONS_BG },
    },
    { text: " sessions ", style: { fg: cMuted, bg: PL_SESSIONS_BG } },
    { text: getIconChar("powerline.segment"), style: { fg: PL_SESSIONS_BG, bg: toolBg } },
    { text: ` ${getIconChar("nav.sessions")} `, style: { fg: BRAND.base, bold: true, bg: toolBg } },
    {
      text: `${readyTools}/${installedTools}`,
      style: { fg: TEXT.primary, bold: true, bg: toolBg },
    },
    { text: " ready ", style: { fg: cMuted, bg: toolBg } },
    // Running segment (conditional) with enhanced styling
    ...(state.runningTools.length > 0
      ? [
          { text: getIconChar("powerline.segment"), style: { fg: toolBg, bg: PL_RUNNING_BG } },
          {
            text: ` ${getIconChar("status.running")} `,
            style: { fg: STATUS.success, bold: true, bg: PL_RUNNING_BG },
          },
          {
            text: `${state.runningTools.length}`,
            style: { fg: STATUS.success, bold: true, bg: PL_RUNNING_BG },
          },
          { text: " running ", style: { fg: cMuted, bg: PL_RUNNING_BG } },
          { text: getIconChar("powerline.segment"), style: { fg: PL_RUNNING_BG, bg: runtimeBg } },
        ]
      : [{ text: getIconChar("powerline.segment"), style: { fg: toolBg, bg: runtimeBg } }]),
    { text: " ⌘ ", style: { fg: ACCENT_INDIGO, bold: true, bg: runtimeBg } },
    { text: `${runtimeLabel} `, style: { fg: cMuted, bg: runtimeBg } },
    { text: getIconChar("powerline.segment"), style: { fg: runtimeBg, bg: refreshBg } },
    {
      text: ` ${getIconChar("action.refresh")} `,
      style: { fg: BRAND.accent, bold: true, bg: refreshBg },
    },
    {
      text: `${refreshIsActiveView ? "act" : "idle"} ${refreshSeconds}s `,
      style: { fg: cMuted, bg: refreshBg },
    },
    { text: getIconChar("powerline.segment"), style: { fg: refreshBg, bg: PL_HINTS_BG } },
    // Hints segment
    { text: " ", style: { bg: PL_HINTS_BG } },
    ...(isAnyLoading
      ? [
          {
            text: getIconChar("action.refresh"),
            style: { fg: BRAND.accent, bold: true, bg: PL_HINTS_BG },
          },
          {
            text: ` updating${loadingSlices ? ` ${loadingSlices}` : ""}  `,
            style: { fg: cMuted, bg: PL_HINTS_BG },
          },
        ]
      : []),
    ...hintSpans,
    { text: " ", style: { bg: PL_HINTS_BG } },
  ]);
}

/**
 * Get context-sensitive key hints for the current view.
 */
export function getContextKeyHints(state: TuiState): string {
  if (state.helpOpen) return "?:Close help";
  if (state.settingsOpen) return "1-3:Tab  j/k:Navigate  Enter:Select  Esc:Close";

  switch (state.view) {
    case "tools":
      return getToolsKeyHints();
    case "sessions":
      if (state.selectedSessionId) return getSessionDetailKeyHints();
      return getSessionsKeyHints();
    case "handoff":
      return getHandoffKeyHints();
    case "config":
      return getConfigKeyHints();
    case "terminal":
      return "Ctrl+A:Command  `:Dashboard  Esc:Settings";
  }
}

/**
 * Render toast notifications as styled powerline-accented rows.
 * Each toast gets a colored left pip + message on a dark bg strip.
 *
 * Visual enhancements:
 * - Vibrant status colors
 * - Subtle background tints
 * - Clear typography hierarchy
 */
export function renderToasts<T>(ui: Pick<UiKit<T>, "text" | "richText">, state: TuiState): T[] {
  return state.toasts.map((toast) => {
    const [icon, color, bg] =
      toast.type === "success"
        ? [getIconChar("status.success"), STATUS.success, TOAST_SUCCESS_BG]
        : toast.type === "error"
          ? [getIconChar("status.error"), STATUS.error, TOAST_ERROR_BG]
          : [getIconChar("status.info"), BRAND.base, TOAST_INFO_BG];
    return ui.richText([
      { text: ` ${icon} `, style: { fg: color, bold: true, bg } },
      { text: ` ${toast.message} `, style: { fg: TEXT.primary, bg } },
    ]);
  });
}

/**
 * Render the glowing header bar — view name + icon with gradient accent line.
 *
 * Visual enhancements:
 * - Brand-colored view icon
 * - Clear text hierarchy
 * - Subtle session indicator
 *
 *  ⚙ Tools                                           Agentful  dark
 *  ══════════════════════════════════════════════════════════════════
 */
function renderHeaderBar<T>(
  ui: Pick<UiKit<T>, "richText" | "divider" | "row">,
  state: TuiState,
): T {
  const view = state.view === "sessions" && state.selectedSessionId ? "sessions" : state.view;
  const icon = getIconChar(getViewIcon(view));
  const label = VIEW_LABELS[view] ?? view;
  const color = VIEW_COLORS[view] ?? BRAND.base;

  // Left: view icon + label
  // Right: brand + theme name
  const left = [
    { text: ` ${icon} `, style: { fg: color, bold: true } },
    { text: label, style: { fg: TEXT.primary, bold: true } },
    ...(state.selectedSessionId && state.view === "sessions"
      ? [{ text: " › Detail", style: { fg: TEXT.tertiary } }]
      : []),
    ...(state.loading.tools || state.loading.sessions || state.loading.config
      ? [{ text: "  …", style: { fg: TEXT.tertiary } }]
      : []),
  ];

  const right = [
    { text: "Agentful", style: { fg: BRAND.base, bold: true } },
    { text: "  ", style: {} },
    { text: state.theme, style: { fg: TEXT.tertiary } },
    { text: " ", style: {} },
  ];

  return ui.row({ gap: GAP.none, justify: "between", style: { bg: SURFACE.base } }, [
    ui.richText(left),
    ui.richText(right),
  ]);
}

/**
 * Wrap the content area. flex:1 so it fills remaining horizontal space.
 */
function wrapContentPane<T>(ui: UiKit<T>, content: T): T {
  return ui.box({ flex: 1, style: { bg: SURFACE.base } }, [content]);
}

/**
 * Build the full TUI view tree from state.
 *
 * Layout:
 *
 *  ⚙ Tools                                          Agentful dark
 *  ──────────────────────────────────────────────────────────────
 *  ┏━━━━━━━━━━━━━━━┓  ╭──────────────────────────────────────────╮
 *  ┃  logo         ┃  │  Content view (fills all available space) │
 *  ┃  AGENTFUL     ┃  │                                           │
 *  ┃  ▌ ⚙  Tools  ┃  │                                           │
 *  ┃    ◈  Sessions┃  │                                           │
 *  ┃    ⇄  Handoff ┃  ╰───────────────────────────────────────────╯
 *  ┃    ≡  Config  ┃
 *  ┃  Tab/↑↓  Esc  ┃  ✓ toast messages (colored bg strips)
 *  ┗━━━━━━━━━━━━━━━┛  ◆ canonical ▐ ● healthy ▐ ◈ 12 ▐ Enter:…
 *
 * Overlays (help, settings) appended last — Rezi renders them on top.
 */
export function renderApp<T>(ui: UiKit<T>, state: TuiState, paneManager?: PaneManager): T {
  const themedUi = withDefaultBgUi(ui, SURFACE.base);
  // ── Main content area ─────────────────────────────────────
  const content =
    state.view === "terminal" && paneManager
      ? renderTerminalContent(themedUi, state, paneManager)
      : renderContent(themedUi, state);
  const mainContent = state.sidebarCollapsed
    ? wrapContentPane(themedUi, content)
    : themedUi.row({ gap: GAP.tight, flex: 1, style: { bg: SURFACE.base } }, [
        renderSidebar(themedUi, state),
        wrapContentPane(themedUi, content),
      ]);

  // ── Toast notifications ───────────────────────────────────
  const toasts = renderToasts(themedUi, state);

  // ── Overlays ─────────────────────────────────────────────
  const overlays: T[] = [];
  if (state.helpOpen) {
    overlays.push(renderHelpOverlay(themedUi));
  }
  if (state.settingsOpen) {
    overlays.push(renderSettingsMenu(themedUi, state.settingsMenu, state.keyOverrides));
  }

  // ── Root container with themed background ────────────────
  // SURFACE.deep covers the entire terminal, eliminating black areas
  return themedUi.box({ style: { bg: SURFACE.deep }, width: "100%", height: "100%" }, [
    themedUi.column({ p: GAP.none }, [
      // Header
      renderHeaderBar(themedUi, state),
      themedUi.divider({ char: "─" }),
      // Main content
      mainContent,
      // Toasts
      ...toasts,
      // Status bar
      themedUi.divider({ char: "─" }),
      renderStatusBar(themedUi, state),
      // Overlays (rendered last to appear on top)
      ...overlays,
    ]),
  ]);
}
// ── startTui ────────────────────────────────────────────

/** Shape of data returned by the async loader passed to startTui. */
export type TuiInitialData = {
  tools: ToolInfo[];
  sessions: SessionRow[];
  engines: EngineStatus[];
  mode: string;
  configHealth: string;
  sessionCount: number;
};

export type TuiDataPatch = Partial<TuiInitialData> & {
  loading?: Partial<TuiLoadingState>;
};

export type TuiLoaderCleanup = () => void;
export type TuiLoader = (
  emit: (patch: TuiDataPatch) => void,
  getState: () => Readonly<TuiState>,
) => Promise<void | TuiLoaderCleanup>;

/**
 * Create and start the Rezi TUI application.
 * Returns a promise that resolves when the app exits.
 *
 * @param loader    — async function that fetches app data; called AFTER the UI
 *                    is already visible so startup is instant.
 * @param paneManager — optional PaneManager for embedded terminal panes
 * @param devMode   — when true, enables Hot State-Preserving Reload (HSR).
 *                    Run `npm run dev` (tsup --watch) in a separate terminal
 *                    so rebuilds trigger automatic view swaps while state is
 *                    preserved.
 */
export async function startTui(
  loader: TuiLoader,
  paneManager?: PaneManager,
  devMode?: boolean,
  cachedData?: Partial<UiCacheData>,
): Promise<void> {
  const { createNodeApp } = await import("@rezi-ui/node");
  const { ui } = await import("@rezi-ui/core");

  // Load persisted preferences synchronously before showing UI
  const prefs = loadPreferences();

  // Get the initial theme from our theme map
  const initialTheme = getTheme(prefs.theme);

  // Start with loading state — UI appears immediately
  const initial = createInitialTuiState();
  initial.theme = prefs.theme;
  initial.keyOverrides = prefs.keyOverrides;
  initial.settingsMenu = createSettingsMenuState(prefs.theme, {
    showPaneBadge: prefs.showPaneBadge,
    fpsCap: prefs.fpsCap,
    sessionRefreshActiveMs: prefs.sessionRefreshActiveMs,
    sessionRefreshIdleMs: prefs.sessionRefreshIdleMs,
  });

  if (cachedData?.tools) {
    initial.tools = cachedData.tools;
    initial.loading.tools = false;
  }
  if (cachedData?.sessions) {
    initial.sessions = cachedData.sessions;
    initial.loading.sessions = false;
  }
  if (cachedData?.engines) {
    initial.engines = cachedData.engines;
    initial.loading.config = false;
  }
  if (cachedData?.mode) {
    initial.mode = cachedData.mode;
  }
  if (cachedData?.configHealth) {
    initial.configHealth = cachedData.configHealth;
  }
  if (typeof cachedData?.sessionCount === "number") {
    initial.sessionCount = cachedData.sessionCount;
  }

  // In dev mode, resolve the path to the compiled view module so Rezi's HSR
  // watcher can re-import it fresh whenever tsup rebuilds the dist/ output.
  // moduleRoot = dist/ directory; viewModule = dist/view.js (the HSR shim).
  // Run `npm run dev` (tsup --watch) alongside the app to get live reloads.
  let hsrViewModule: URL | undefined;
  let hsrModuleRoot: URL | undefined;
  if (devMode) {
    const { fileURLToPath } = await import("node:url");
    const { dirname, resolve } = await import("node:path");
    const thisFile = fileURLToPath(import.meta.url);
    const distDir = dirname(thisFile);
    hsrViewModule = new URL(`file://${resolve(distDir, "view.js")}`);
    hsrModuleRoot = new URL(`file://${distDir}/`);
  }

  let latestState: TuiState = initial;

  const app: App<TuiState> = createNodeApp({
    initialState: initial,
    theme: initialTheme,
    config: {
      fpsCap: 30,
      rootPadding: 0,
    },
    ...(hsrViewModule && hsrModuleRoot
      ? {
          hotReload: {
            viewModule: hsrViewModule,
            moduleRoot: hsrModuleRoot,
            // Surface HSR events (reload applied / error) as transient toasts
            log: (entry: { level: string; message: string }) => {
              const msg =
                entry.level === "error" ? `HSR error: ${entry.message}` : "HSR: view reloaded";
              app.update((s) => ({
                ...s,
                toasts: addToast(s.toasts, entry.level === "error" ? "error" : "success", msg),
              }));
            },
          },
        }
      : {}),
  });

  app.view((state) => {
    latestState = state;
    return renderApp<VNode>(ui, state, paneManager);
  });

  // Toast expiry timer
  const toastTimer = setInterval(() => {
    app.update((s) => ({ ...s, toasts: expireToasts(s.toasts, 3000) }));
  }, 1000);

  const terminalFrameTimer = paneManager
    ? setInterval(() => {
        if (latestState.view !== "terminal") return;
        if (paneManager.getPaneCount() === 0) return;
        app.update((s) => ({ ...s }));
      }, 50)
    : undefined;

  const handleSigwinch = () => {
    if (!paneManager) return;
    paneManager.resize(process.stdout.columns ?? 80, process.stdout.rows ?? 24);
    app.update((s) => ({ ...s }));
  };
  process.on("SIGWINCH", handleSigwinch);

  // No separate spinner timer — ui.spinner() is engine-tick-driven

  function applyDataPatch(state: TuiState, patch: TuiDataPatch): TuiState {
    return {
      ...state,
      ...(patch.tools ? { tools: patch.tools } : {}),
      ...(patch.sessions ? { sessions: patch.sessions } : {}),
      ...(patch.engines ? { engines: patch.engines } : {}),
      ...(patch.mode ? { mode: patch.mode } : {}),
      ...(patch.configHealth ? { configHealth: patch.configHealth } : {}),
      ...(typeof patch.sessionCount === "number" ? { sessionCount: patch.sessionCount } : {}),
      ...(patch.loading ? { loading: { ...state.loading, ...patch.loading } } : {}),
    };
  }

  let loaderCleanup: TuiLoaderCleanup | undefined;

  // Load data in background — UI is already visible
  void loader(
    (patch) => {
      app.update((s) => applyDataPatch(s, patch));
    },
    () => latestState,
  )
    .then((cleanup) => {
      if (typeof cleanup === "function") {
        loaderCleanup = cleanup;
      }
    })
    .catch(() => {
      app.update((s) => ({
        ...s,
        loading: { tools: false, sessions: false, config: false },
        toasts: addToast(s.toasts, "error", "Failed to load app data"),
      }));
    });

  // ── Terminal mode event handler ──
  // Handles raw key forwarding to PTY and leader key detection.
  // Wired to app.onEvent() below for actual raw event interception.
  function handleTerminalEvent(event: TerminalKeyEvent): boolean {
    if (!paneManager) return false;

    let currentInputMode = "dashboard" as InputMode;
    app.update((s) => {
      currentInputMode = s.inputMode;
      return s;
    });

    if (currentInputMode === "terminal") {
      // Check for leader key
      if (isLeaderKey(event)) {
        app.update((s) => ({ ...s, inputMode: "command" }));
        return true; // consumed
      }

      // Forward to active PTY
      const input = keyEventToTerminalInput(event);
      if (input) {
        paneManager.writeToActivePane(input);
        return true;
      }
      return false;
    }

    if (currentInputMode === "command") {
      const cmd = parseCommandKey(event);
      if (cmd) {
        handleCommandAction(cmd);
        return true;
      }
      // Unknown command key: return to terminal mode
      app.update((s) => ({ ...s, inputMode: "terminal" }));
      return true;
    }

    return false; // dashboard mode — let widget keys handle it
  }

  // ── Wire app.onEvent() for raw key forwarding ──
  // This intercepts all raw ZREV events before Rezi's focus/routing system.
  // In terminal/command mode we consume key events and forward to PTY.
  app.onEvent((ev) => {
    if (ev.kind !== "engine") return;
    const zrev = ev.event;

    // Convert ZrevEvent to TerminalKeyEvent and route through handler
    let termEvent: TerminalKeyEvent | null = null;

    if (zrev.kind === "text") {
      termEvent = {
        kind: "text",
        codepoint: zrev.codepoint,
      };
    } else if (zrev.kind === "key") {
      termEvent = {
        kind: "key",
        keyCode: zrev.key,
        shift: (zrev.mods & 0x01) !== 0,
        ctrl: (zrev.mods & 0x02) !== 0,
        alt: (zrev.mods & 0x04) !== 0,
      };
    } else if (zrev.kind === "paste") {
      termEvent = {
        kind: "paste",
        text: new TextDecoder().decode(zrev.bytes),
      };
    }

    if (termEvent) {
      handleTerminalEvent(termEvent);
    }
  });

  const handleCommandAction = paneManager
    ? createTerminalCommandExecutor({ app, paneManager })
    : (_cmd: CommandAction) => undefined;

  const executeAction = createActionExecutor({
    app,
    paneManager,
    getLatestState: () => latestState,
    rebindDashboardKeys: (keyOverrides) => {
      app.keys(buildDashboardKeyHandlers(bindKey, keyOverrides));
    },
    onTelemetry:
      devMode || process.env["AI_TOOLS_UI_TELEMETRY"] === "1"
        ? (event) => {
            const parts = [
              `[ui-action] ${event.phase}`,
              `type=${event.actionType}`,
              `durationMs=${event.durationMs}`,
            ];
            if (event.errorMessage) {
              parts.push(`error=${event.errorMessage}`);
            }
            console.error(parts.join(" "));
          }
        : undefined,
  });

  // Convert handleKeyEvent result into Rezi key handler.
  //
  // IMPORTANT: app.stop() and executeAction() must NOT be called from inside
  // ctx.update()'s updater function. Rezi sets inCommit=true while running
  // updaters, so any re-entrant app.update() or app.stop() call from within
  // the updater throws ZRUI_REENTRANT_CALL, which triggers a fatal and kills
  // the process.
  //
  // Pattern: read state from ctx.state (snapshot), compute result, push the
  // pure state change via ctx.update(), then execute side-effects afterwards.
  function bindKey(key: string, ctrl?: boolean) {
    return (ctx: { state: TuiState; update: (fn: (s: TuiState) => TuiState) => void }) => {
      const s = ctx.state;
      // If in terminal/command mode, skip widget key handling
      if (s.inputMode !== "dashboard") return;

      const result = handleKeyEvent(s, { key, ctrl });

      // Push pure state change (no side-effects inside the updater)
      ctx.update(() => result.state);

      // Side-effects run AFTER update() returns, outside inCommit scope
      if (result.stop) {
        if (paneManager) {
          paneManager.destroyAll();
        }
        clearInterval(toastTimer);
        if (terminalFrameTimer) {
          clearInterval(terminalFrameTimer);
        }
        process.off("SIGWINCH", handleSigwinch);
        void app.stop();
      }
      if (result.action) {
        void executeAction(result.action);
      }
    };
  }

  app.keys(buildDashboardKeyHandlers(bindKey, initial.keyOverrides));

  await app.start();

  // Cleanup on exit
  if (paneManager) {
    paneManager.destroyAll();
  }
  clearInterval(toastTimer);
  if (terminalFrameTimer) {
    clearInterval(terminalFrameTimer);
  }
  process.off("SIGWINCH", handleSigwinch);
  loaderCleanup?.();
}
