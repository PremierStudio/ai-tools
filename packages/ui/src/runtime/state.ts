import type { AppView, InputMode, ToolInfo } from "../types.js";
import type { EngineStatus, ToolDeployment, ManifestHealth } from "../widgets/config-dashboard.js";
import type { SessionRow } from "../widgets/session-browser.js";
import type { Toast } from "../toasts.js";
import type { ThemeName } from "../theme/index.js";
import type { SettingsMenuState } from "../views/settings.js";

export type RunningTool = { toolId: string; pid: number; startedAt: string };

export type TuiLoadingState = {
  tools: boolean;
  sessions: boolean;
  config: boolean;
};

export type NavigationState = {
  view: AppView;
  inputMode: InputMode;
  activePane: "sidebar" | "content";
  sidebarCollapsed: boolean;
};

export type DataState = {
  tools: ToolInfo[];
  sessions: SessionRow[];
  engines: EngineStatus[];
  deployments: ToolDeployment[];
  manifestHealth: ManifestHealth;
  mode: string;
  configHealth: string;
  sessionCount: number;
};

export type SelectionState = {
  selectedToolIndex: number;
  selectedSessionIndex: number;
  configSelectedIndex: number;
};

export type SessionState = {
  runningTools: RunningTool[];
  sessionFilter: { tool?: string; query?: string };
  sessionSort: { column: string; direction: "asc" | "desc" };
  searchActive: boolean;
  selectedSessionId: string | null;
};

export type HandoffState = {
  handoffStep: number;
  handoffSessionId: string | null;
  handoffTargetTool: string | null;
  handoffPreview: string | null;
  selectedTargetIndex: number;
};

export type OverlayState = {
  helpOpen: boolean;
};

export type PreferencesState = {
  keyOverrides: Record<string, string>;
  theme: ThemeName;
};

export type SettingsState = {
  settingsOpen: boolean;
  settingsMenu: SettingsMenuState;
};

export type ConfigLastAction = {
  type: string;
  result: "success" | "error";
  message: string;
};

export type FeedbackState = {
  toasts: Toast[];
  notification: string | null;
  loading: TuiLoadingState;
  configLastAction: ConfigLastAction | null;
};

export type TuiState = NavigationState &
  DataState &
  SelectionState &
  SessionState &
  HandoffState &
  OverlayState &
  PreferencesState &
  SettingsState &
  FeedbackState;
