import type { AppState } from "../types.js";

export type StatusBarData = {
  mode: string;
  activeTool: string;
  sessionCount: number;
  configHealth: string;
};

/**
 * Compute status bar display data from the application state.
 */
export function computeStatusBar(state: AppState): StatusBarData {
  const activePane = state.panes[state.activePaneIndex];
  const activeTool = activePane
    ? (state.tools.find((t) => t.id === activePane.toolId)?.name ?? "None")
    : "None";

  return {
    mode: formatMode(state.mode),
    activeTool,
    sessionCount: state.sessionCount,
    configHealth: formatHealth(state.configHealth),
  };
}

function formatMode(mode: AppState["mode"]): string {
  switch (mode) {
    case "canonical":
      return "Canonical";
    case "direct":
      return "Direct";
    case "unknown":
      return "Unknown";
  }
}

function formatHealth(health: AppState["configHealth"]): string {
  switch (health) {
    case "healthy":
      return "Healthy";
    case "stale":
      return "Stale";
    case "error":
      return "Error";
  }
}
