import { addToast } from "../toasts.js";
import { cycleTheme } from "../theme/index.js";
import { cycleSortColumn } from "../views/sessions.js";
import { getTargetToolId } from "../views/handoff.js";
import { createSettingsMenuState, handleSettingsKey } from "../views/settings.js";
import type { TuiState } from "../tui.js";
import type { KeyAction, KeyResult, SimpleKeyEvent } from "./types.js";

const VIEW_ORDER: TuiState["view"][] = ["tools", "sessions", "handoff", "config"];

export function navigateView(state: TuiState, direction: "next" | "prev"): TuiState {
  const currentIndex = VIEW_ORDER.indexOf(state.view);
  const newIndex =
    direction === "next"
      ? (currentIndex + 1) % VIEW_ORDER.length
      : (currentIndex - 1 + VIEW_ORDER.length) % VIEW_ORDER.length;

  const newView = VIEW_ORDER[newIndex] ?? "tools";

  return {
    ...state,
    view: newView,
    selectedSessionId: null,
    searchActive: false,
  };
}

export function selectItem(state: TuiState, direction: "next" | "prev"): TuiState {
  if (state.view === "tools") {
    const max = Math.max(0, state.tools.length - 1);
    const idx =
      direction === "next"
        ? Math.min(state.selectedToolIndex + 1, max)
        : Math.max(state.selectedToolIndex - 1, 0);
    return { ...state, selectedToolIndex: idx };
  }

  if (state.view === "sessions" && !state.selectedSessionId) {
    const max = Math.max(0, state.sessions.length - 1);
    const idx =
      direction === "next"
        ? Math.min(state.selectedSessionIndex + 1, max)
        : Math.max(state.selectedSessionIndex - 1, 0);
    return { ...state, selectedSessionIndex: idx };
  }

  if (state.view === "handoff") {
    if (state.handoffStep === 0) {
      const max = Math.max(0, state.sessions.length - 1);
      const idx =
        direction === "next"
          ? Math.min(state.selectedSessionIndex + 1, max)
          : Math.max(state.selectedSessionIndex - 1, 0);
      return { ...state, selectedSessionIndex: idx };
    }
    if (state.handoffStep === 2) {
      const max = 3;
      const idx =
        direction === "next"
          ? Math.min(state.selectedTargetIndex + 1, max)
          : Math.max(state.selectedTargetIndex - 1, 0);
      return { ...state, selectedTargetIndex: idx };
    }
  }

  return state;
}

export function handleKeyEvent(state: TuiState, event: SimpleKeyEvent): KeyResult<TuiState> {
  const { key, ctrl } = event;

  if (state.settingsOpen) {
    const result = handleSettingsKey(state.settingsMenu, key, ctrl);
    let action: KeyAction | null = null;
    if (result.action) {
      switch (result.action.type) {
        case "close":
          return { state: { ...state, settingsOpen: false }, stop: false, action: null };
        case "apply-theme":
          action = {
            type: "apply-settings-theme",
            theme: result.action.theme,
            closeAfter: result.action.closeAfter,
            keyOverrides: state.keyOverrides,
          };
          break;
        case "set-key-override":
          action = {
            type: "set-key-override",
            actionId: result.action.actionId,
            key: result.action.key,
            currentTheme: state.theme,
            updatedKeyOverrides: {
              ...state.keyOverrides,
              [result.action.actionId]: result.action.key,
            },
          };
          break;
        case "update-general":
          action = {
            type: "update-general-settings",
            showPaneBadge: result.action.showPaneBadge,
            fpsCap: result.action.fpsCap,
            sessionRefreshActiveMs: result.action.sessionRefreshActiveMs,
            sessionRefreshIdleMs: result.action.sessionRefreshIdleMs,
          };
          break;
      }
    }
    const closeSettings = action?.type === "apply-settings-theme" && action.closeAfter === true;
    return {
      state: {
        ...state,
        settingsMenu: result.state,
        settingsOpen: closeSettings ? false : state.settingsOpen,
      },
      stop: false,
      action,
    };
  }

  if (state.helpOpen) {
    if (key === "?" || key === "Escape") {
      return { state: { ...state, helpOpen: false }, stop: false, action: null };
    }
    return { state, stop: false, action: null };
  }

  if (key === "q" || (ctrl && key === "c")) {
    return { state, stop: true, action: null };
  }

  if (key === "?") {
    return { state: { ...state, helpOpen: true }, stop: false, action: null };
  }

  if (key === "t") {
    const newTheme = cycleTheme(state.theme);
    return {
      state: { ...state, theme: newTheme },
      stop: false,
      action: { type: "cycle-theme", newTheme, keyOverrides: state.keyOverrides },
    };
  }

  if (key === "[") {
    return { state: { ...state, sidebarCollapsed: true }, stop: false, action: null };
  }
  if (key === "]") {
    return { state: { ...state, sidebarCollapsed: false }, stop: false, action: null };
  }

  if (key === "1") {
    return {
      state: { ...state, view: "tools", selectedSessionId: null },
      stop: false,
      action: null,
    };
  }
  if (key === "2") {
    return {
      state: { ...state, view: "sessions", selectedSessionId: null },
      stop: false,
      action: null,
    };
  }
  if (key === "3") {
    return {
      state: { ...state, view: "handoff", selectedSessionId: null },
      stop: false,
      action: null,
    };
  }
  if (key === "4") {
    return {
      state: { ...state, view: "config", selectedSessionId: null },
      stop: false,
      action: null,
    };
  }

  if (key === "`") {
    return { state, stop: false, action: { type: "switch-to-terminal" } };
  }

  if (key === "Tab") {
    return {
      state: { ...navigateView(state, "next"), activePane: "content" },
      stop: false,
      action: null,
    };
  }
  if (key === "BackTab") {
    return {
      state: { ...navigateView(state, "prev"), activePane: "content" },
      stop: false,
      action: null,
    };
  }

  if (key === "Left") {
    if (state.sidebarCollapsed) return { state, stop: false, action: null };
    return { state: { ...state, activePane: "sidebar" }, stop: false, action: null };
  }
  if (key === "Right") {
    return { state: { ...state, activePane: "content" }, stop: false, action: null };
  }

  if (key === "Up" || key === "k") {
    if (state.activePane === "sidebar") {
      return { state: navigateView(state, "prev"), stop: false, action: null };
    }
    return handleViewKeyEvent(state, { key: "Up" });
  }
  if (key === "Down" || key === "j") {
    if (state.activePane === "sidebar") {
      return { state: navigateView(state, "next"), stop: false, action: null };
    }
    return handleViewKeyEvent(state, { key: "Down" });
  }

  if (key === "Backspace") {
    if (state.view === "sessions" && state.selectedSessionId) {
      return { state: { ...state, selectedSessionId: null }, stop: false, action: null };
    }
    return { state, stop: false, action: null };
  }

  return handleViewKeyEvent(state, event);
}

function handleViewKeyEvent(state: TuiState, event: SimpleKeyEvent): KeyResult<TuiState> {
  switch (state.view) {
    case "tools":
      return handleToolsKey(state, event);
    case "sessions":
      return state.selectedSessionId
        ? handleSessionDetailKey(state, event)
        : handleSessionsKey(state, event);
    case "handoff":
      return handleHandoffKey(state, event);
    case "config":
      return handleConfigKey(state, event);
    case "terminal":
      return { state, stop: false, action: null };
  }
}

function handleToolsKey(state: TuiState, event: SimpleKeyEvent): KeyResult<TuiState> {
  const { key, shift } = event;

  if (key === "j" || key === "Down") {
    return { state: selectItem(state, "next"), stop: false, action: null };
  }
  if (key === "k" || key === "Up") {
    return { state: selectItem(state, "prev"), stop: false, action: null };
  }

  if (key === "Enter") {
    const tool = state.tools[state.selectedToolIndex];
    if (tool && tool.status !== "not-installed") {
      if (shift) {
        return {
          state,
          stop: false,
          action: {
            type: "launch-tool-embedded",
            toolId: tool.id,
            command: tool.command,
            args: [],
          },
        };
      }
      return {
        state,
        stop: false,
        action: { type: "launch-tool", toolId: tool.id, command: tool.command, args: [] },
      };
    }
    if (tool && tool.status === "not-installed") {
      return {
        state: { ...state, toasts: addToast(state.toasts, "error", "Tool not installed") },
        stop: false,
        action: null,
      };
    }
    return { state, stop: false, action: null };
  }

  if (key === "d") {
    const tool = state.tools[state.selectedToolIndex];
    if (tool) {
      const running = state.runningTools.some((r) => r.toolId === tool.id);
      if (running) {
        return { state, stop: false, action: { type: "kill-tool", toolId: tool.id } };
      }
    }
    return { state, stop: false, action: null };
  }

  if (key === "Escape") {
    const menu = createSettingsMenuState(state.theme, {
      showPaneBadge: state.settingsMenu.showPaneBadge,
      fpsCap: state.settingsMenu.fpsCap,
      sessionRefreshActiveMs: state.settingsMenu.sessionRefreshActiveMs,
      sessionRefreshIdleMs: state.settingsMenu.sessionRefreshIdleMs,
    });
    return {
      state: { ...state, settingsOpen: true, settingsMenu: menu },
      stop: false,
      action: null,
    };
  }

  return { state, stop: false, action: null };
}

function handleSessionsKey(state: TuiState, event: SimpleKeyEvent): KeyResult<TuiState> {
  const { key } = event;

  if (key === "j" || key === "Down") {
    return { state: selectItem(state, "next"), stop: false, action: null };
  }
  if (key === "k" || key === "Up") {
    return { state: selectItem(state, "prev"), stop: false, action: null };
  }

  if (key === "Enter") {
    const session = state.sessions[state.selectedSessionIndex];
    if (session) {
      return { state: { ...state, selectedSessionId: session.id }, stop: false, action: null };
    }
    return { state, stop: false, action: null };
  }

  if (key === "/") {
    return { state: { ...state, searchActive: true }, stop: false, action: null };
  }

  if (key === "Escape") {
    if (state.searchActive || Object.keys(state.sessionFilter).length > 0) {
      return {
        state: { ...state, sessionFilter: {}, searchActive: false },
        stop: false,
        action: null,
      };
    }
    const menu = createSettingsMenuState(state.theme, {
      showPaneBadge: state.settingsMenu.showPaneBadge,
      fpsCap: state.settingsMenu.fpsCap,
      sessionRefreshActiveMs: state.settingsMenu.sessionRefreshActiveMs,
      sessionRefreshIdleMs: state.settingsMenu.sessionRefreshIdleMs,
    });
    return {
      state: { ...state, settingsOpen: true, settingsMenu: menu },
      stop: false,
      action: null,
    };
  }

  if (key === "H") {
    const session = state.sessions[state.selectedSessionIndex];
    if (session) {
      return {
        state,
        stop: false,
        action: { type: "quick-handoff", sessionId: session.id },
      };
    }
    return { state, stop: false, action: null };
  }

  if (key === "s") {
    return {
      state: { ...state, sessionSort: cycleSortColumn(state.sessionSort) },
      stop: false,
      action: null,
    };
  }

  return { state, stop: false, action: null };
}

function handleSessionDetailKey(state: TuiState, event: SimpleKeyEvent): KeyResult<TuiState> {
  const { key } = event;

  if (key === "h") {
    if (state.selectedSessionId) {
      return {
        state,
        stop: false,
        action: { type: "start-handoff", sessionId: state.selectedSessionId },
      };
    }
    return { state, stop: false, action: null };
  }

  if (key === "Enter") {
    const session = state.sessions.find((s) => s.id === state.selectedSessionId);
    if (session) {
      return {
        state,
        stop: false,
        action: { type: "continue-session", sessionId: session.id, toolId: session.tool },
      };
    }
    return { state, stop: false, action: null };
  }

  if (key === "Escape") {
    return { state: { ...state, selectedSessionId: null }, stop: false, action: null };
  }

  return { state, stop: false, action: null };
}

function handleHandoffKey(state: TuiState, event: SimpleKeyEvent): KeyResult<TuiState> {
  const { key } = event;

  if (key === "j" || key === "Down") {
    return { state: selectItem(state, "next"), stop: false, action: null };
  }
  if (key === "k" || key === "Up") {
    return { state: selectItem(state, "prev"), stop: false, action: null };
  }

  if (key === "Escape") {
    if (state.handoffStep > 0) {
      return { state: { ...state, handoffStep: state.handoffStep - 1 }, stop: false, action: null };
    }
    const menu = createSettingsMenuState(state.theme, {
      showPaneBadge: state.settingsMenu.showPaneBadge,
      fpsCap: state.settingsMenu.fpsCap,
      sessionRefreshActiveMs: state.settingsMenu.sessionRefreshActiveMs,
      sessionRefreshIdleMs: state.settingsMenu.sessionRefreshIdleMs,
    });
    return {
      state: { ...state, settingsOpen: true, settingsMenu: menu },
      stop: false,
      action: null,
    };
  }

  if (key === "Enter") {
    return handleHandoffEnter(state);
  }

  return { state, stop: false, action: null };
}

function handleHandoffEnter(state: TuiState): KeyResult<TuiState> {
  switch (state.handoffStep) {
    case 0: {
      const session = state.sessions[state.selectedSessionIndex];
      if (session) {
        return {
          state: {
            ...state,
            handoffStep: 1,
            handoffSessionId: session.id,
          },
          stop: false,
          action: { type: "load-handoff-preview", sessionId: session.id },
        };
      }
      return { state, stop: false, action: null };
    }
    case 1:
      return { state: { ...state, handoffStep: 2 }, stop: false, action: null };
    case 2: {
      const targetId = getTargetToolId(state.selectedTargetIndex);
      return {
        state: {
          ...state,
          handoffStep: 3,
          handoffTargetTool: targetId,
        },
        stop: false,
        action: null,
      };
    }
    case 3: {
      if (state.handoffSessionId && state.handoffTargetTool) {
        return {
          state: {
            ...state,
            handoffStep: 0,
            handoffSessionId: null,
            handoffTargetTool: null,
            handoffPreview: null,
          },
          stop: false,
          action: {
            type: "execute-handoff",
            sessionId: state.handoffSessionId,
            targetTool: state.handoffTargetTool,
          },
        };
      }
      return { state, stop: false, action: null };
    }
    default:
      return { state, stop: false, action: null };
  }
}

function handleConfigKey(state: TuiState, event: SimpleKeyEvent): KeyResult<TuiState> {
  const { key } = event;

  if (key === "g") return { state, stop: false, action: { type: "generate-config" } };
  if (key === "i") return { state, stop: false, action: { type: "install-config" } };
  if (key === "r") return { state, stop: false, action: { type: "refresh-status" } };
  if (key === "e") return { state, stop: false, action: { type: "open-editor" } };

  if (key === "Escape") {
    const menu = createSettingsMenuState(state.theme, {
      showPaneBadge: state.settingsMenu.showPaneBadge,
      fpsCap: state.settingsMenu.fpsCap,
      sessionRefreshActiveMs: state.settingsMenu.sessionRefreshActiveMs,
      sessionRefreshIdleMs: state.settingsMenu.sessionRefreshIdleMs,
    });
    return {
      state: { ...state, settingsOpen: true, settingsMenu: menu },
      stop: false,
      action: null,
    };
  }

  return { state, stop: false, action: null };
}
