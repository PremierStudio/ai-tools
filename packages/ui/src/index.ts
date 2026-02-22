export type { ToolStatus, ToolInfo, PaneState, AppState, AppView } from "./types.js";

export { createInitialState, detectTools, computeConfigHealth, getStatusBarData } from "./app.js";

export { getAvailableTools, getToolCommand, formatToolList } from "./widgets/tool-launcher.js";

export { PtyManager } from "./widgets/terminal-pane.js";
export type { PtyProcess, PtySpawnOptions, PtyFactory } from "./widgets/terminal-pane.js";

export { listSessions, formatSessionRow, groupByTool } from "./widgets/session-browser.js";
export type { SessionRow, SessionGroup } from "./widgets/session-browser.js";

export { extractHandoffContext, previewHandoff, getTargetTools } from "./widgets/handoff-panel.js";

export { getEngineStatus, formatEngineRow } from "./widgets/config-dashboard.js";
export type { EngineStatus } from "./widgets/config-dashboard.js";

export { computeStatusBar } from "./widgets/status-bar.js";
export type { StatusBarData } from "./widgets/status-bar.js";

export { performHandoff } from "./commands/handoff.js";
export type { HandoffResult } from "./commands/handoff.js";

export { switchTool, getToolDefinitions } from "./commands/switch-tool.js";
export type { SwitchResult } from "./commands/switch-tool.js";

export { triggerGenerate, triggerInstall, getCanonicalStatus } from "./commands/config-sync.js";
export type { CanonicalStatus } from "./commands/config-sync.js";

// Toast state management
export { addToast, removeToast, expireToasts } from "./toasts.js";
export type { Toast, ToastType } from "./toasts.js";

// UI preferences
export {
  loadPreferences,
  savePreferences,
  cycleTheme,
  isValidTheme,
  AVAILABLE_THEMES,
} from "./preferences.js";
export type { ThemeName, UiPreferences } from "./preferences.js";

// Launcher orchestration
export { launchTool, buildLaunchOptions, buildHandoffLaunchOptions } from "./launcher.js";
export type { LaunchOptions, LaunchResult, SpawnFn } from "./launcher.js";

// Spawn strategies (tmux wrapper for embedded tools)
export {
  checkSpawnStrategies,
  getRecommendedStrategy,
  spawnTool,
  isTmuxRecommended,
} from "./spawn/index.js";
export type { SpawnStrategy, SpawnResult, SpawnConfig } from "./spawn/index.js";

// Command palette
export {
  getActionCommands,
  getSessionCommands,
  getToolCommands,
  getAllCommands,
  filterCommands,
} from "./command-palette.js";
export type { CommandItem } from "./command-palette.js";

// View modules
export { renderToolsView, getToolsKeyHints } from "./views/tools.js";
export type { ToolsViewState } from "./views/tools.js";

export {
  renderSessionsView,
  filterSessions,
  sortSessions,
  cycleSortColumn,
  getSessionsKeyHints,
} from "./views/sessions.js";
export type { SessionsViewState } from "./views/sessions.js";

export { renderSessionDetailView, getSessionDetailKeyHints } from "./views/session-detail.js";
export type { SessionDetailState } from "./views/session-detail.js";

export {
  renderHandoffView,
  getHandoffTargets,
  getTargetToolId,
  getHandoffKeyHints,
} from "./views/handoff.js";
export type { HandoffViewState } from "./views/handoff.js";

export { renderConfigView, getConfigKeyHints } from "./views/config.js";
export type { ConfigViewState } from "./views/config.js";

export { renderHelpOverlay } from "./views/help.js";

// Terminal multiplexer
export {
  PaneManager,
  createPane,
  writeInput,
  resizePane,
  destroyPane,
  scrollPane,
  clearDirtyLines,
  buildTabEntries,
  formatTabBar,
  formatStatusBar,
  buildRenderedLines,
  buildLineSegments,
  getCommandOverlayText,
  isLeaderKey,
  keyEventToTerminalInput,
  parseCommandKey,
  XTERM_256_PALETTE,
  xtermColorToRgb,
  cellToTextStyle,
  stylesEqual,
} from "./terminal/index.js";
export type {
  TerminalPaneState,
  HeadlessTerminal,
  TerminalFactory,
  PaneManagerState,
  LineSegment,
  RenderedLine,
  TabEntry,
  StatusBarInfo,
  TerminalKeyEvent,
  CommandAction,
  TextStyle,
  CellAttributes,
} from "./terminal/index.js";
