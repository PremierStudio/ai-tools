import { describe, it, expect, vi, beforeEach } from "vitest";
import type { App } from "@rezi-ui/core";
import { createInitialTuiState } from "../tui.js";
import type { TuiState } from "../tui.js";
import { handleKeyEvent } from "./key-handler.js";
import { createActionExecutor } from "./action-executor.js";

const { savePreferencesMock } = vi.hoisted(() => ({
  savePreferencesMock: vi.fn(),
}));

vi.mock("../preferences.js", async () => {
  const actual = await vi.importActual<typeof import("../preferences.js")>("../preferences.js");
  return {
    ...actual,
    savePreferences: savePreferencesMock,
  };
});

function createMockApp(initial: TuiState): { app: App<TuiState>; getState: () => TuiState } {
  let state = initial;
  const app = {
    update(updater: TuiState | ((prev: Readonly<TuiState>) => TuiState)) {
      if (typeof updater === "function") {
        state = updater(state);
      } else {
        state = updater;
      }
    },
    setTheme: vi.fn(),
    stop: vi.fn(async () => undefined),
    start: vi.fn(async () => undefined),
    keys: vi.fn(),
  } as unknown as App<TuiState>;

  return { app, getState: () => state };
}

describe("settings key override integration", () => {
  beforeEach(() => {
    savePreferencesMock.mockReset();
  });

  it("captures key override in settings and triggers live key rebind", async () => {
    const initial = createInitialTuiState();
    initial.settingsOpen = true;
    initial.settingsMenu.activeTab = "keys";
    initial.settingsMenu.keySelectedIndex = 0;

    const beginEdit = handleKeyEvent(initial, { key: "Enter" });
    expect(beginEdit.state.settingsMenu.editingKey).toBe(true);
    expect(beginEdit.action).toBeNull();

    const capture = handleKeyEvent(beginEdit.state, { key: "x" });
    expect(capture.action?.type).toBe("set-key-override");

    const { app, getState } = createMockApp(capture.state);
    const rebindSpy = vi.fn();
    const executeAction = createActionExecutor({
      app,
      getLatestState: () => getState(),
      rebindDashboardKeys: rebindSpy,
    });

    if (capture.action) {
      await executeAction(capture.action);
    }

    const next = getState();
    expect(next.keyOverrides["quit"]).toBe("x");
    expect(rebindSpy).toHaveBeenCalledWith(expect.objectContaining({ quit: "x" }));
    expect(savePreferencesMock).toHaveBeenCalled();
  });

  it("rejects override when key collides with existing binding", async () => {
    const initial = createInitialTuiState();
    initial.keyOverrides = { quit: "x" };
    initial.settingsOpen = true;
    initial.settingsMenu.activeTab = "keys";
    initial.settingsMenu.keySelectedIndex = 2; // help

    const beginEdit = handleKeyEvent(initial, { key: "Enter" });
    const capture = handleKeyEvent(beginEdit.state, { key: "x" });
    expect(capture.action?.type).toBe("set-key-override");

    const { app, getState } = createMockApp(capture.state);
    const rebindSpy = vi.fn();
    const executeAction = createActionExecutor({
      app,
      getLatestState: () => getState(),
      rebindDashboardKeys: rebindSpy,
    });

    if (capture.action) {
      await executeAction(capture.action);
    }

    const next = getState();
    expect(next.keyOverrides["help"]).toBeUndefined();
    expect(rebindSpy).not.toHaveBeenCalled();
    expect(savePreferencesMock).not.toHaveBeenCalled();
    expect(next.toasts.some((t) => t.type === "error")).toBe(true);
  });
});
