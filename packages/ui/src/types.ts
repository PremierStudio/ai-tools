export type ToolStatus = "available" | "running" | "stopped" | "not-installed";

export type ToolInfo = {
  id: string;
  name: string;
  command: string;
  status: ToolStatus;
  sessionCount: number;
};

export type PaneState = {
  toolId: string;
  active: boolean;
  pid?: number;
};

export type AppState = {
  mode: "canonical" | "direct" | "unknown";
  tools: ToolInfo[];
  panes: PaneState[];
  activePaneIndex: number;
  sessionCount: number;
  configHealth: "healthy" | "stale" | "error";
};

export type AppView = "tools" | "sessions" | "handoff" | "config";
