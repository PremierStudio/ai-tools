import type { AppState, ToolInfo } from "./types.js";

/**
 * Create an empty initial application state.
 */
export function createInitialState(): AppState {
  return {
    mode: "unknown",
    tools: [],
    panes: [],
    activePaneIndex: 0,
    sessionCount: 0,
    configHealth: "healthy",
  };
}

/**
 * Detect installed tools using session adapter registry.
 * Returns ToolInfo[] with detection status and session counts.
 */
export async function detectTools(): Promise<ToolInfo[]> {
  const { registry } = await import("@premierstudio/ai-sessions");
  await import("@premierstudio/ai-sessions/adapters/all");

  const adapterIds = registry.list();
  const tools: ToolInfo[] = [];

  for (const id of adapterIds) {
    const adapter = registry.get(id);
    if (!adapter) continue;

    let detected = false;
    try {
      detected = await adapter.detect();
    } catch {
      // Detection failed
    }

    let sessionCount = 0;
    if (detected) {
      try {
        const sessions = await adapter.parseSessions();
        sessionCount = sessions.length;
      } catch {
        // Session parse failed
      }
    }

    tools.push({
      id: adapter.id,
      name: adapter.name,
      command: adapter.command,
      status: detected ? "available" : "not-installed",
      sessionCount,
    });
  }

  return tools;
}

/**
 * Check whether canonical config (.ai-tools/) exists and is valid.
 */
export async function computeConfigHealth(): Promise<"healthy" | "stale" | "error"> {
  const { existsSync, statSync } = await import("node:fs");
  const { resolve } = await import("node:path");

  const configDir = resolve(process.cwd(), ".ai-tools");

  if (!existsSync(configDir)) {
    return "error";
  }

  try {
    const stat = statSync(configDir);
    const age = Date.now() - stat.mtimeMs;
    const oneDay = 24 * 60 * 60 * 1000;

    if (age > oneDay) {
      return "stale";
    }

    return "healthy";
  } catch {
    return "error";
  }
}

/**
 * Compute status bar data from current application state.
 */
export function getStatusBarData(state: AppState): {
  mode: string;
  activeTool: string;
  sessionCount: number;
  configHealth: string;
} {
  const activePane = state.panes[state.activePaneIndex];
  const activeTool = activePane
    ? (state.tools.find((t) => t.id === activePane.toolId)?.name ?? "None")
    : "None";

  return {
    mode: state.mode,
    activeTool,
    sessionCount: state.sessionCount,
    configHealth: state.configHealth,
  };
}
