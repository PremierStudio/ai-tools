import type { App } from "@rezi-ui/core";
import { addToast } from "../toasts.js";
import { THEME_MAP, setActiveTheme } from "../theme/index.js";
import { findKeybindingCollision, savePreferences } from "../preferences.js";
import { launchTool, buildHandoffLaunchOptions } from "../launcher.js";
import type { PaneManager } from "../terminal/manager.js";
import type { TuiState } from "../tui.js";
import type { ActionTelemetryEvent, KeyAction } from "./types.js";
import type { SessionRow } from "../widgets/session-browser.js";

type ActionExecutorDeps = {
  app: App<TuiState>;
  paneManager?: PaneManager;
  getLatestState: () => Readonly<TuiState>;
  rebindDashboardKeys?: (keyOverrides: Record<string, string>) => void;
  onTelemetry?: (event: ActionTelemetryEvent) => void;
};

async function reloadDashboardData(app: App<TuiState>): Promise<void> {
  const { detectTools, detectMode } = await import("../app.js");
  const { formatSessionRow, listSessions } = await import("../widgets/session-browser.js");
  const { getConfigDashboardData } = await import("../widgets/config-dashboard.js");
  const [tools, mode] = await Promise.all([detectTools(), detectMode()]);
  const configData = await getConfigDashboardData(mode);
  let sessions: ReturnType<typeof formatSessionRow>[] = [];
  try {
    const raw = await listSessions({ limit: 200 });
    sessions = raw.map(formatSessionRow);
  } catch {
    // ignore
  }
  app.update((s) => ({
    ...s,
    tools,
    sessions,
    engines: configData.engines,
    deployments: configData.deployments,
    manifestHealth: configData.manifestHealth,
    mode: configData.mode,
    configHealth: configData.configHealth,
    sessionCount: tools.reduce((sum, t) => sum + t.sessionCount, 0),
    view: "tools",
    inputMode: "dashboard",
  }));
}

async function reloadConfigData(app: App<TuiState>): Promise<void> {
  const { detectMode } = await import("../app.js");
  const { getConfigDashboardData } = await import("../widgets/config-dashboard.js");
  const mode = await detectMode();
  const configData = await getConfigDashboardData(mode);
  app.update((s) => ({
    ...s,
    engines: configData.engines,
    deployments: configData.deployments,
    manifestHealth: configData.manifestHealth,
    mode: configData.mode,
    configHealth: configData.configHealth,
  }));
}

async function stopLaunchResume(
  app: App<TuiState>,
  options: { command: string; args: string[] },
): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  try {
    await app.stop();
    await launchTool(options);
  } catch {
    // Tool exited or failed — continue to restore UI
  }
  try {
    await reloadDashboardData(app);
  } catch {
    // Data reload failed — show stale data
  }
  await app.start();
}

async function loadHandoffPreview(app: App<TuiState>, sessionId: string): Promise<void> {
  try {
    const { performHandoff } = await import("../commands/handoff.js");
    const result = await performHandoff(sessionId);
    if (!result) {
      app.update((s) => ({
        ...s,
        handoffPreview: "Unable to load handoff preview for this session.",
        toasts: addToast(s.toasts, "error", "Handoff preview unavailable"),
      }));
      return;
    }
    app.update((s) => ({
      ...s,
      handoffPreview: result.preview,
    }));
  } catch {
    app.update((s) => ({
      ...s,
      handoffPreview: "Failed to load handoff preview.",
      toasts: addToast(s.toasts, "error", "Failed to load handoff preview"),
    }));
  }
}

function stateIndexBySessionId(sessionId: string, sessions: SessionRow[]): number {
  return sessions.findIndex((session) => session.id === sessionId);
}

function appendRunningTool(state: TuiState, toolId: string, pid: number): TuiState {
  return {
    ...state,
    runningTools: [...state.runningTools, { toolId, pid, startedAt: new Date().toISOString() }],
    view: "terminal",
    inputMode: "terminal",
  };
}

export function createActionExecutor({
  app,
  paneManager,
  getLatestState,
  rebindDashboardKeys,
  onTelemetry,
}: ActionExecutorDeps) {
  type ActionHandler<K extends KeyAction["type"]> = (
    action: Extract<KeyAction, { type: K }>,
  ) => Promise<void>;

  const handlers: {
    [K in KeyAction["type"]]: ActionHandler<K>;
  } = {
    "launch-tool": async (action) => {
      const options = { command: action.command, args: action.args };
      await stopLaunchResume(app, options);
    },

    "launch-tool-embedded": async (action) => {
      if (!paneManager) {
        app.update((s) => ({
          ...s,
          toasts: addToast(s.toasts, "error", "Terminal panes not available"),
        }));
        return;
      }

      const { getToolDefinitions } = await import("../commands/switch-tool.js");
      const toolDefs = getToolDefinitions();
      const toolDef = toolDefs[action.toolId];

      if (!toolDef) {
        app.update((s) => ({
          ...s,
          toasts: addToast(s.toasts, "error", "Tool definition not found"),
        }));
        return;
      }

      try {
        const pane = await paneManager.spawnPane(action.toolId);
        if (pane) {
          app.update((s) => ({
            ...s,
            runningTools: [
              ...s.runningTools,
              { toolId: action.toolId, pid: pane.pid, startedAt: new Date().toISOString() },
            ],
            view: "terminal",
            inputMode: "terminal",
            toasts: addToast(s.toasts, "success", `Launched ${toolDef.name} in pane`),
          }));
        } else {
          app.update((s) => ({
            ...s,
            toasts: addToast(s.toasts, "error", "Failed to spawn tool"),
          }));
        }
      } catch (err) {
        app.update((s) => ({
          ...s,
          toasts: addToast(
            s.toasts,
            "error",
            `Error: ${err instanceof Error ? err.message : "Unknown"}`,
          ),
        }));
      }
    },

    "switch-to-terminal": async () => {
      if (paneManager && paneManager.getPaneCount() > 0) {
        app.update((s) => ({
          ...s,
          view: "terminal",
          inputMode: "terminal",
        }));
      } else {
        app.update((s) => ({
          ...s,
          toasts: addToast(s.toasts, "info", "No terminal panes open. Launch a tool first."),
        }));
      }
    },

    "apply-settings-theme": async (action) => {
      setActiveTheme(action.theme);
      app.update((s) => ({ ...s, theme: action.theme }));
      try {
        const resolved = THEME_MAP[action.theme];
        if (resolved) {
          setTimeout(() => {
            try {
              app.setTheme(resolved);
            } catch {
              // non-critical
            }
          }, 0);
        }
      } catch {
        // Non-critical
      }
      try {
        savePreferences({ theme: action.theme, keyOverrides: action.keyOverrides });
      } catch {
        // Non-critical
      }
    },

    "set-key-override": async (action) => {
      const collision = findKeybindingCollision(
        action.actionId,
        action.key,
        getLatestState().keyOverrides,
      );
      if (collision) {
        app.update((s) => ({
          ...s,
          toasts: addToast(
            s.toasts,
            "error",
            `Key "${action.key}" already maps to ${collision.label}`,
          ),
        }));
        return;
      }

      app.update((s) => ({
        ...s,
        keyOverrides: { ...s.keyOverrides, [action.actionId]: action.key },
        toasts: addToast(s.toasts, "success", `Bound "${action.key}" to ${action.actionId}`),
      }));
      rebindDashboardKeys?.(action.updatedKeyOverrides);
      try {
        savePreferences({ theme: action.currentTheme, keyOverrides: action.updatedKeyOverrides });
      } catch {
        // Non-critical
      }
    },

    "update-general-settings": async (action) => {
      app.update((s) => ({
        ...s,
        settingsMenu: {
          ...s.settingsMenu,
          showPaneBadge: action.showPaneBadge,
          fpsCap: action.fpsCap,
          sessionRefreshActiveMs: action.sessionRefreshActiveMs,
          sessionRefreshIdleMs: action.sessionRefreshIdleMs,
        },
        toasts: addToast(s.toasts, "info", "Updated general settings"),
      }));
      try {
        savePreferences({
          showPaneBadge: action.showPaneBadge,
          fpsCap: action.fpsCap as 15 | 30 | 60,
          sessionRefreshActiveMs: action.sessionRefreshActiveMs,
          sessionRefreshIdleMs: action.sessionRefreshIdleMs,
        });
      } catch {
        // Non-critical
      }
    },

    "generate-config": async () => {
      app.update((s) => ({
        ...s,
        toasts: addToast(s.toasts, "info", "Generating config..."),
      }));
      try {
        const { triggerGenerate } = await import("../commands/config-sync.js");
        await triggerGenerate();
        await reloadConfigData(app);
        app.update((s) => ({
          ...s,
          configLastAction: { type: "generate", result: "success", message: "Config generated" },
          toasts: addToast(s.toasts, "success", "Config generated"),
        }));
      } catch {
        app.update((s) => ({
          ...s,
          configLastAction: {
            type: "generate",
            result: "error",
            message: "Config generation failed",
          },
          toasts: addToast(s.toasts, "error", "Config generation failed"),
        }));
      }
    },

    "install-config": async () => {
      app.update((s) => ({
        ...s,
        toasts: addToast(s.toasts, "info", "Installing config..."),
      }));
      try {
        const { triggerInstall } = await import("../commands/config-sync.js");
        await triggerInstall();
        await reloadConfigData(app);
        app.update((s) => ({
          ...s,
          configLastAction: { type: "install", result: "success", message: "Config installed" },
          toasts: addToast(s.toasts, "success", "Config installed"),
        }));
      } catch {
        app.update((s) => ({
          ...s,
          configLastAction: { type: "install", result: "error", message: "Config install failed" },
          toasts: addToast(s.toasts, "error", "Config install failed"),
        }));
      }
    },

    "refresh-status": async () => {
      app.update((s) => ({
        ...s,
        toasts: addToast(s.toasts, "info", "Refreshing..."),
      }));
      try {
        const { detectTools } = await import("../app.js");
        const tools = await detectTools();
        await reloadConfigData(app);
        app.update((s) => ({
          ...s,
          tools,
          configLastAction: { type: "refresh", result: "success", message: "Status refreshed" },
          toasts: addToast(s.toasts, "success", "Status refreshed"),
        }));
      } catch {
        app.update((s) => ({
          ...s,
          configLastAction: { type: "refresh", result: "error", message: "Refresh failed" },
          toasts: addToast(s.toasts, "error", "Refresh failed"),
        }));
      }
    },

    "load-handoff-preview": async (action) => {
      await loadHandoffPreview(app, action.sessionId);
    },

    "execute-handoff": async (action) => {
      app.update((s) => ({
        ...s,
        toasts: addToast(s.toasts, "info", `Handing off to ${action.targetTool}...`),
      }));
      try {
        const { performHandoff } = await import("../commands/handoff.js");
        const result = await performHandoff(action.sessionId, action.targetTool);
        if (result && result.launchCommand) {
          if (paneManager) {
            const { getToolDefinitions } = await import("../commands/switch-tool.js");
            const def = getToolDefinitions()[action.targetTool];
            const pane = await paneManager.spawnPaneWithCommand(
              action.targetTool,
              def?.name ?? action.targetTool,
              result.launchCommand,
              result.launchArgs,
            );
            if (result.launchArgs.length === 0 && result.context.handoffMarkdown) {
              paneManager.writeToActivePane(`${result.context.handoffMarkdown}\n`);
            }
            app.update((s) => ({
              ...appendRunningTool(s, action.targetTool, pane.pid),
              toasts: addToast(s.toasts, "success", `Opened ${action.targetTool} in terminal pane`),
            }));
            return;
          }

          const options = buildHandoffLaunchOptions(result.launchCommand, result.launchArgs);
          await stopLaunchResume(app, options);
        } else {
          app.update((s) => ({
            ...s,
            toasts: addToast(s.toasts, "error", `No launch command for ${action.targetTool}`),
          }));
        }
      } catch {
        app.update((s) => ({
          ...s,
          toasts: addToast(s.toasts, "error", "Handoff failed"),
        }));
      }
    },

    "cycle-theme": async (action) => {
      try {
        setActiveTheme(action.newTheme);
        const resolved = THEME_MAP[action.newTheme];
        if (resolved) {
          setTimeout(() => {
            try {
              app.setTheme(resolved);
            } catch {
              // non-critical
            }
          }, 0);
        }
        savePreferences({ theme: action.newTheme, keyOverrides: action.keyOverrides });
      } catch {
        // Non-critical
      }
    },

    "kill-tool": async (action) => {
      if (!paneManager) {
        app.update((s) => ({
          ...s,
          toasts: addToast(s.toasts, "error", "Terminal panes not available"),
        }));
        return;
      }

      const paneIndices = paneManager.getPanesForTool(action.toolId);
      if (paneIndices.length === 0) {
        app.update((s) => ({
          ...s,
          toasts: addToast(s.toasts, "info", `No running panes for ${action.toolId}`),
        }));
        return;
      }

      // Close panes in reverse order to preserve indices during removal
      for (const index of [...paneIndices].toReversed()) {
        paneManager.closePane(index);
      }

      const killedCount = paneIndices.length;
      app.update((s) => {
        const remaining = s.runningTools.filter((t) => t.toolId !== action.toolId);
        const noMorePanes = paneManager.getPaneCount() === 0;
        return {
          ...s,
          runningTools: remaining,
          view: noMorePanes && s.view === "terminal" ? "tools" : s.view,
          inputMode: noMorePanes && s.inputMode === "terminal" ? "dashboard" : s.inputMode,
          toasts: addToast(
            s.toasts,
            "success",
            `Killed ${killedCount} pane${killedCount > 1 ? "s" : ""} for ${action.toolId}`,
          ),
        };
      });
    },

    "sync-config": async () => {
      app.update((s) => ({
        ...s,
        toasts: addToast(s.toasts, "info", "Syncing config..."),
      }));
      try {
        const { triggerSync } = await import("../commands/config-sync.js");
        await triggerSync();
        await reloadConfigData(app);
        app.update((s) => ({
          ...s,
          configLastAction: { type: "sync", result: "success", message: "Config synced" },
          toasts: addToast(s.toasts, "success", "Config synced"),
        }));
      } catch {
        app.update((s) => ({
          ...s,
          configLastAction: { type: "sync", result: "error", message: "Config sync failed" },
          toasts: addToast(s.toasts, "error", "Config sync failed"),
        }));
      }
    },

    "detect-config": async () => {
      app.update((s) => ({
        ...s,
        toasts: addToast(s.toasts, "info", "Detecting config..."),
      }));
      try {
        const { triggerDetect } = await import("../commands/config-sync.js");
        await triggerDetect();
        await reloadConfigData(app);
        app.update((s) => ({
          ...s,
          configLastAction: { type: "detect", result: "success", message: "Detection complete" },
          toasts: addToast(s.toasts, "success", "Detection complete"),
        }));
      } catch {
        app.update((s) => ({
          ...s,
          configLastAction: { type: "detect", result: "error", message: "Detection failed" },
          toasts: addToast(s.toasts, "error", "Detection failed"),
        }));
      }
    },

    "open-editor": async () => {
      const { resolve } = await import("node:path");
      const editor = process.env["EDITOR"] || "vi";
      const configDir = resolve(process.cwd(), ".ai-tools");
      await stopLaunchResume(app, { command: editor, args: [configDir] });
    },

    "quick-handoff": async (action) => {
      const sessionIndex = stateIndexBySessionId(action.sessionId, getLatestState().sessions);
      app.update((s) => ({
        ...s,
        view: "handoff",
        selectedSessionIndex: sessionIndex >= 0 ? sessionIndex : s.selectedSessionIndex,
        handoffStep: 1,
        handoffSessionId: action.sessionId,
        handoffTargetTool: null,
        selectedTargetIndex: 0,
        handoffPreview: "Loading handoff preview...",
      }));
      await loadHandoffPreview(app, action.sessionId);
    },

    "start-handoff": async (action) => {
      const sessionIndex = stateIndexBySessionId(action.sessionId, getLatestState().sessions);
      app.update((s) => ({
        ...s,
        view: "handoff",
        selectedSessionIndex: sessionIndex >= 0 ? sessionIndex : s.selectedSessionIndex,
        handoffStep: 1,
        handoffSessionId: action.sessionId,
        handoffTargetTool: null,
        selectedTargetIndex: 0,
        handoffPreview: "Loading handoff preview...",
      }));
      await loadHandoffPreview(app, action.sessionId);
    },

    "continue-session": async (action) => {
      app.update((s) => ({
        ...s,
        toasts: addToast(s.toasts, "info", `Continuing in ${action.toolId}...`),
      }));
      try {
        const { performHandoff } = await import("../commands/handoff.js");
        const handoff = await performHandoff(action.sessionId, action.toolId);

        if (paneManager && handoff?.launchCommand) {
          const { getToolDefinitions } = await import("../commands/switch-tool.js");
          const def = getToolDefinitions()[action.toolId];
          const pane = await paneManager.spawnPaneWithCommand(
            action.toolId,
            def?.name ?? action.toolId,
            handoff.launchCommand,
            handoff.launchArgs,
          );
          if (handoff.launchArgs.length === 0 && handoff.context.handoffMarkdown) {
            paneManager.writeToActivePane(`${handoff.context.handoffMarkdown}\n`);
          }
          app.update((s) => ({
            ...appendRunningTool(s, action.toolId, pane.pid),
            toasts: addToast(s.toasts, "success", `Opened ${action.toolId} in terminal pane`),
          }));
          return;
        }

        if (handoff?.launchCommand) {
          const options = buildHandoffLaunchOptions(handoff.launchCommand, handoff.launchArgs);
          await stopLaunchResume(app, options);
          return;
        }

        const { getToolDefinitions } = await import("../commands/switch-tool.js");
        const defs = getToolDefinitions();
        const def = defs[action.toolId];
        if (!def) {
          app.update((s) => ({
            ...s,
            toasts: addToast(s.toasts, "error", `Unknown tool: ${action.toolId}`),
          }));
          return;
        }

        if (paneManager) {
          const pane = await paneManager.spawnPane(action.toolId);
          if (pane) {
            app.update((s) => ({
              ...appendRunningTool(s, action.toolId, pane.pid),
              toasts: addToast(s.toasts, "success", `Opened ${action.toolId} in terminal pane`),
            }));
            return;
          }
        }

        await stopLaunchResume(app, { command: def.command, args: def.args });
      } catch {
        app.update((s) => ({
          ...s,
          toasts: addToast(s.toasts, "error", "Failed to continue session"),
        }));
      }
    },
  };

  return async function executeAction(action: KeyAction): Promise<void> {
    const start = Date.now();
    onTelemetry?.({ actionType: action.type, phase: "start", durationMs: 0 });
    try {
      await handlers[action.type](action as never);
      onTelemetry?.({
        actionType: action.type,
        phase: "success",
        durationMs: Date.now() - start,
      });
    } catch (error) {
      onTelemetry?.({
        actionType: action.type,
        phase: "error",
        durationMs: Date.now() - start,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
}
