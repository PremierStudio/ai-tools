import { describe, expect, it, vi } from "vitest";
import type { App } from "@rezi-ui/core";
import type { PaneManager } from "../terminal/manager.js";
import type { CommandAction } from "../terminal/input.js";
import type { TuiState } from "../tui.js";
import { createInitialTuiState } from "../tui.js";
import { createTerminalCommandExecutor } from "./terminal-command-executor.js";

function makeState(overrides: Partial<TuiState> = {}): TuiState {
  return {
    ...createInitialTuiState(),
    loading: { tools: false, sessions: false, config: false },
    toasts: [],
    runningTools: [],
    sessions: [],
    ...overrides,
  };
}

function makeApp(initial: TuiState = makeState()) {
  let state = initial;
  const app = {
    update: vi.fn((updater: (current: TuiState) => TuiState) => {
      state = updater(state);
    }),
  } as unknown as App<TuiState>;
  return {
    app,
    current: () => state,
  };
}

function makePaneManager(overrides: Partial<PaneManager> = {}): PaneManager {
  return {
    focusPane: vi.fn().mockReturnValue(true),
    getState: vi.fn().mockReturnValue({
      panes: [],
      activePaneIndex: 0,
    }),
    closePane: vi.fn().mockReturnValue(true),
    getPaneCount: vi.fn().mockReturnValue(0),
    nextPane: vi.fn(),
    prevPane: vi.fn(),
    writeToActivePane: vi.fn(),
    scrollActivePane: vi.fn(),
    ...overrides,
  } as unknown as PaneManager;
}

function runAction(
  cmd: CommandAction,
  opts?: { state?: TuiState; paneManager?: PaneManager },
): { state: () => TuiState; paneManager: PaneManager } {
  const { app, current } = makeApp(opts?.state ?? makeState());
  const paneManager = opts?.paneManager ?? makePaneManager();
  createTerminalCommandExecutor({ app, paneManager })(cmd);
  return { state: current, paneManager };
}

describe("createTerminalCommandExecutor", () => {
  it("switch-tab focuses the pane and stays in terminal mode", () => {
    const { state, paneManager } = runAction({ type: "switch-tab", index: 2 });
    expect(paneManager.focusPane).toHaveBeenCalledWith(2);
    expect(state().inputMode).toBe("terminal");
    expect(state().toasts).toEqual([]);
  });

  it("switch-tab toasts when the tab does not exist", () => {
    const paneManager = makePaneManager({ focusPane: vi.fn().mockReturnValue(false) });
    const { state } = runAction({ type: "switch-tab", index: 3 }, { paneManager });
    expect(state().inputMode).toBe("terminal");
    expect(state().toasts).toEqual([
      expect.objectContaining({ type: "error", message: "No tab 4" }),
    ]);
  });

  it("new-pane returns to the tools dashboard", () => {
    const { state } = runAction({ type: "new-pane" });
    expect(state().view).toBe("tools");
    expect(state().inputMode).toBe("dashboard");
    expect(state().toasts).toEqual([
      expect.objectContaining({
        type: "info",
        message: "Select a tool to open in a new pane",
      }),
    ]);
  });

  it("close-pane with no remaining panes clears running tools", () => {
    const paneManager = makePaneManager({
      getState: vi.fn().mockReturnValue({
        panes: [{ status: "running", pid: 11, toolId: "claude" }],
        activePaneIndex: 0,
      }),
      closePane: vi.fn().mockReturnValue(true),
      getPaneCount: vi.fn().mockReturnValue(0),
    });
    const { state } = runAction(
      { type: "close-pane" },
      {
        paneManager,
        state: makeState({
          runningTools: [{ toolId: "claude", pid: 11, startedAt: "now" }],
        }),
      },
    );
    expect(paneManager.closePane).toHaveBeenCalledWith(0);
    expect(state().view).toBe("tools");
    expect(state().inputMode).toBe("dashboard");
    expect(state().runningTools).toEqual([]);
  });

  it("close-pane with remaining panes keeps matching running tools", () => {
    const paneManager = makePaneManager({
      getState: vi
        .fn()
        .mockReturnValueOnce({
          panes: [
            { status: "running", pid: 11, toolId: "claude" },
            { status: "running", pid: 22, toolId: "cursor" },
          ],
          activePaneIndex: 0,
        })
        .mockReturnValue({
          panes: [{ status: "running", pid: 22, toolId: "cursor" }],
          activePaneIndex: 0,
        }),
      closePane: vi.fn().mockReturnValue(true),
      getPaneCount: vi.fn().mockReturnValue(1),
    });
    const { state } = runAction(
      { type: "close-pane" },
      {
        paneManager,
        state: makeState({
          runningTools: [
            { toolId: "claude", pid: 11, startedAt: "a" },
            { toolId: "cursor", pid: 22, startedAt: "b" },
          ],
        }),
      },
    );
    expect(state().inputMode).toBe("terminal");
    expect(state().runningTools).toEqual([{ toolId: "cursor", pid: 22, startedAt: "b" }]);
  });

  it("close-pane does nothing when closePane fails", () => {
    const paneManager = makePaneManager({
      getState: vi.fn().mockReturnValue({ panes: [], activePaneIndex: 0 }),
      closePane: vi.fn().mockReturnValue(false),
    });
    const { state } = runAction(
      { type: "close-pane" },
      { paneManager, state: makeState({ view: "sessions" }) },
    );
    expect(state().view).toBe("sessions");
  });

  it("next-tab and prev-tab cycle panes", () => {
    const paneManager = makePaneManager();
    const next = runAction({ type: "next-tab" }, { paneManager });
    expect(paneManager.nextPane).toHaveBeenCalledTimes(1);
    expect(next.state().inputMode).toBe("terminal");

    const prev = runAction({ type: "prev-tab" }, { paneManager });
    expect(paneManager.prevPane).toHaveBeenCalledTimes(1);
    expect(prev.state().inputMode).toBe("terminal");
  });

  it("handoff preselects a session matching the active pane tool", () => {
    const paneManager = makePaneManager({
      getState: vi.fn().mockReturnValue({
        panes: [{ toolId: "cursor" }],
        activePaneIndex: 0,
      }),
    });
    const { state } = runAction(
      { type: "handoff" },
      {
        paneManager,
        state: makeState({
          sessions: [
            {
              id: "s1",
              tool: "claude",
              toolName: "Claude",
              title: "one",
              messageCount: 1,
              updatedAt: "t",
            },
            {
              id: "s2",
              tool: "cursor",
              toolName: "Cursor",
              title: "two",
              messageCount: 2,
              updatedAt: "t",
            },
          ],
        }),
      },
    );
    expect(state().view).toBe("handoff");
    expect(state().inputMode).toBe("dashboard");
    expect(state().handoffStep).toBe(0);
    expect(state().handoffSessionId).toBeNull();
    expect(state().handoffTargetTool).toBeNull();
    expect(state().handoffPreview).toBeNull();
    expect(state().selectedSessionIndex).toBe(1);
    expect(state().selectedTargetIndex).toBe(0);
  });

  it("handoff defaults to session 0 when the pane has no matching session", () => {
    const paneManager = makePaneManager({
      getState: vi.fn().mockReturnValue({ panes: [], activePaneIndex: 0 }),
    });
    const { state } = runAction({ type: "handoff" }, { paneManager });
    expect(state().selectedSessionIndex).toBe(0);
  });

  it("dashboard, send-leader, cancel, help, and scrollback update state", () => {
    const dash = runAction({ type: "dashboard" });
    expect(dash.state().view).toBe("tools");
    expect(dash.state().inputMode).toBe("dashboard");

    const leader = runAction({ type: "send-leader" });
    expect(leader.paneManager.writeToActivePane).toHaveBeenCalledWith("\x01");
    expect(leader.state().inputMode).toBe("terminal");

    const cancel = runAction({ type: "cancel" });
    expect(cancel.state().inputMode).toBe("terminal");

    const help = runAction({ type: "help" });
    expect(help.state().toasts).toEqual([
      expect.objectContaining({
        type: "info",
        message: "Ctrl+A then: c:New x:Close n/p:Nav d:Dash h:Handoff",
      }),
    ]);

    const up = runAction({ type: "scrollback-up" });
    expect(up.paneManager.scrollActivePane).toHaveBeenCalledWith(-10);
    const down = runAction({ type: "scrollback-down" });
    expect(down.paneManager.scrollActivePane).toHaveBeenCalledWith(10);
  });
});
