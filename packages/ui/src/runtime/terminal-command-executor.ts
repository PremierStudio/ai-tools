import type { App } from "@rezi-ui/core";
import { addToast } from "../toasts.js";
import type { PaneManager } from "../terminal/manager.js";
import type { CommandAction } from "../terminal/input.js";
import type { TuiState } from "../tui.js";

type TerminalCommandExecutorDeps = {
  app: App<TuiState>;
  paneManager: PaneManager;
};

export function createTerminalCommandExecutor({ app, paneManager }: TerminalCommandExecutorDeps) {
  return function handleCommandAction(cmd: CommandAction): void {
    switch (cmd.type) {
      case "switch-tab":
        if (paneManager.focusPane(cmd.index)) {
          app.update((s) => ({ ...s, inputMode: "terminal" }));
        } else {
          app.update((s) => ({
            ...s,
            inputMode: "terminal",
            toasts: addToast(s.toasts, "error", `No tab ${cmd.index + 1}`),
          }));
        }
        break;

      case "new-pane":
        app.update((s) => ({
          ...s,
          view: "tools",
          inputMode: "dashboard",
          toasts: addToast(s.toasts, "info", "Select a tool to open in a new pane"),
        }));
        break;

      case "close-pane": {
        const state = paneManager.getState();
        if (paneManager.closePane(state.activePaneIndex)) {
          const remainingPids = new Set(
            paneManager
              .getState()
              .panes.filter((pane) => pane.status === "running")
              .map((pane) => pane.pid),
          );
          if (paneManager.getPaneCount() === 0) {
            app.update((s) => ({ ...s, view: "tools", inputMode: "dashboard", runningTools: [] }));
          } else {
            app.update((s) => ({
              ...s,
              inputMode: "terminal",
              runningTools: s.runningTools.filter((tool) => remainingPids.has(tool.pid)),
            }));
          }
        }
        break;
      }

      case "next-tab":
        paneManager.nextPane();
        app.update((s) => ({ ...s, inputMode: "terminal" }));
        break;

      case "prev-tab":
        paneManager.prevPane();
        app.update((s) => ({ ...s, inputMode: "terminal" }));
        break;

      case "handoff": {
        const pmState = paneManager.getState();
        const activePane = pmState.panes[pmState.activePaneIndex];
        app.update((s) => {
          // Pre-select a session matching the active pane's tool, if any
          let sessionIndex = 0;
          if (activePane) {
            const idx = s.sessions.findIndex((sess) => sess.tool === activePane.toolId);
            if (idx >= 0) sessionIndex = idx;
          }
          return {
            ...s,
            view: "handoff",
            inputMode: "dashboard",
            handoffStep: 0,
            handoffSessionId: null,
            handoffTargetTool: null,
            handoffPreview: null,
            selectedSessionIndex: sessionIndex,
            selectedTargetIndex: 0,
          };
        });
        break;
      }

      case "dashboard":
        app.update((s) => ({ ...s, view: "tools", inputMode: "dashboard" }));
        break;

      case "send-leader":
        paneManager.writeToActivePane("\x01");
        app.update((s) => ({ ...s, inputMode: "terminal" }));
        break;

      case "cancel":
        app.update((s) => ({ ...s, inputMode: "terminal" }));
        break;

      case "help":
        app.update((s) => ({
          ...s,
          inputMode: "terminal",
          toasts: addToast(s.toasts, "info", "Ctrl+A then: c:New x:Close n/p:Nav d:Dash h:Handoff"),
        }));
        break;

      case "scrollback-up":
        paneManager.scrollActivePane(-10);
        app.update((s) => ({ ...s, inputMode: "terminal" }));
        break;

      case "scrollback-down":
        paneManager.scrollActivePane(10);
        app.update((s) => ({ ...s, inputMode: "terminal" }));
        break;
    }
  };
}
