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
