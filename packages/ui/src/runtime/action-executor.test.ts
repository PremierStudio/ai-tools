import { describe, it, expect, vi } from "vitest";
import type { App } from "@rezi-ui/core";
import type { TuiState } from "../tui.js";
import { createInitialTuiState } from "../tui.js";
import { createActionExecutor } from "./action-executor.js";

const { mockPerformHandoff, mockGetToolDefinitions } = vi.hoisted(() => ({
  mockPerformHandoff: vi.fn(),
  mockGetToolDefinitions: vi.fn(() => ({
    codex: { name: "Codex", command: "codex", args: [] },
    gemini: { name: "Gemini CLI", command: "gemini", args: [] },
  })),
}));

const { mockTriggerGenerate, mockTriggerInstall, mockTriggerSync, mockTriggerDetect } = vi.hoisted(
  () => ({
    mockTriggerGenerate: vi.fn(async () => "generated"),
    mockTriggerInstall: vi.fn(async () => "installed"),
    mockTriggerSync: vi.fn(async () => "synced"),
    mockTriggerDetect: vi.fn(async () => "detected"),
  }),
);

const { mockDetectTools, mockDetectMode, mockGetConfigDashboardData } = vi.hoisted(() => ({
  mockDetectTools: vi.fn(async () => []),
  mockDetectMode: vi.fn(async () => "canonical"),
  mockGetConfigDashboardData: vi.fn(async () => ({
    engines: [],
    deployments: [],
    manifestHealth: {
      exists: false,
      entryCount: 0,
      linkedCount: 0,
      staleCount: 0,
      missingCount: 0,
    },
    mode: "canonical",
    configHealth: "healthy",
  })),
}));

const { mockLaunchTool } = vi.hoisted(() => ({
  mockLaunchTool: vi.fn(async () => ({ pid: 0, exitCode: 0 })),
}));

const { mockListSessions, mockFormatSessionRow } = vi.hoisted(() => ({
  mockListSessions: vi.fn(async () => []),
  mockFormatSessionRow: vi.fn((s: unknown) => s),
}));

vi.mock("../commands/handoff.js", () => ({
  performHandoff: mockPerformHandoff,
}));

vi.mock("../commands/switch-tool.js", () => ({
  getToolDefinitions: mockGetToolDefinitions,
}));

vi.mock("../commands/config-sync.js", () => ({
  triggerGenerate: mockTriggerGenerate,
  triggerInstall: mockTriggerInstall,
  triggerSync: mockTriggerSync,
  triggerDetect: mockTriggerDetect,
}));

vi.mock("../app.js", () => ({
  detectTools: mockDetectTools,
  detectMode: mockDetectMode,
}));

vi.mock("../widgets/config-dashboard.js", () => ({
  getConfigDashboardData: mockGetConfigDashboardData,
}));

vi.mock("../launcher.js", () => ({
  launchTool: mockLaunchTool,
  buildHandoffLaunchOptions: (cmd: string, args: string[]) => ({ command: cmd, args }),
}));

vi.mock("../widgets/session-browser.js", () => ({
  listSessions: mockListSessions,
  formatSessionRow: mockFormatSessionRow,
}));

function createMockApp(initial: TuiState): App<TuiState> & { getState(): TuiState } {
  let state = initial;
  return {
    update(updater: TuiState | ((prev: Readonly<TuiState>) => TuiState)) {
      if (typeof updater === "function") {
        state = updater(state);
      } else {
        state = updater;
      }
    },
    getState: () => state,
    setTheme: vi.fn(),
    stop: vi.fn(async () => undefined),
    start: vi.fn(async () => undefined),
    keys: vi.fn(),
  } as unknown as App<TuiState> & { getState(): TuiState };
}

function createMockPaneManager() {
  return {
    spawnPane: vi.fn(async () => ({ pid: 901 })),
    spawnPaneWithCommand: vi.fn(async () => ({ pid: 902 })),
    writeToActivePane: vi.fn(),
    getPaneCount: vi.fn(() => 1),
    getPanesForTool: vi.fn((_toolId: string) => [] as number[]),
    closePane: vi.fn(),
    getState: vi.fn(() => ({ panes: [], activePaneIndex: -1, focusedPaneIndex: -1 })),
    getActivePane: vi.fn(() => null),
  };
}

describe("createActionExecutor telemetry", () => {
  it("emits start and success telemetry events", async () => {
    const app = createMockApp(createInitialTuiState());
    const telemetry = vi.fn();
    const executeAction = createActionExecutor({
      app,
      getLatestState: () => createInitialTuiState(),
      onTelemetry: telemetry,
    });

    await executeAction({ type: "open-editor" });

    expect(telemetry).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: "open-editor", phase: "start" }),
    );
    expect(telemetry).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: "open-editor", phase: "success" }),
    );
  });

  it("opens handoff target in embedded pane when available", async () => {
    const app = createMockApp(createInitialTuiState());
    const paneManager = createMockPaneManager();
    mockPerformHandoff.mockResolvedValueOnce({
      context: { handoffMarkdown: "# handoff" },
      preview: "preview",
      launchCommand: "codex",
      launchArgs: ["--prompt", "# handoff"],
    });

    const executeAction = createActionExecutor({
      app,
      paneManager: paneManager as never,
      getLatestState: () => createInitialTuiState(),
    });

    await executeAction({ type: "execute-handoff", sessionId: "s1", targetTool: "codex" });

    expect(paneManager.spawnPaneWithCommand).toHaveBeenCalledWith("codex", "Codex", "codex", [
      "--prompt",
      "# handoff",
    ]);
    expect(app.stop as unknown as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it("injects markdown into embedded pane when tool lacks prompt flag", async () => {
    const app = createMockApp(createInitialTuiState());
    const paneManager = createMockPaneManager();
    mockPerformHandoff.mockResolvedValueOnce({
      context: { handoffMarkdown: "# continue" },
      preview: "preview",
      launchCommand: "gemini",
      launchArgs: [],
    });

    const executeAction = createActionExecutor({
      app,
      paneManager: paneManager as never,
      getLatestState: () => createInitialTuiState(),
    });

    await executeAction({ type: "continue-session", sessionId: "s1", toolId: "gemini" });

    expect(paneManager.spawnPaneWithCommand).toHaveBeenCalledWith(
      "gemini",
      "Gemini CLI",
      "gemini",
      [],
    );
    expect(paneManager.writeToActivePane).toHaveBeenCalledWith("# continue\n");
    expect(app.stop as unknown as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });
});

describe("config action handlers", () => {
  it("generate-config calls triggerGenerate and reloads config data", async () => {
    const app = createMockApp(createInitialTuiState());
    const executeAction = createActionExecutor({
      app,
      getLatestState: () => app.getState(),
    });

    await executeAction({ type: "generate-config" });

    expect(mockTriggerGenerate).toHaveBeenCalled();
    expect(mockGetConfigDashboardData).toHaveBeenCalled();
    expect(app.getState().configLastAction).toEqual({
      type: "generate",
      result: "success",
      message: "Config generated",
    });
  });

  it("generate-config sets error feedback on failure", async () => {
    mockTriggerGenerate.mockRejectedValueOnce(new Error("fail"));
    const app = createMockApp(createInitialTuiState());
    const executeAction = createActionExecutor({
      app,
      getLatestState: () => app.getState(),
    });

    await executeAction({ type: "generate-config" });

    expect(app.getState().configLastAction).toEqual({
      type: "generate",
      result: "error",
      message: "Config generation failed",
    });
  });

  it("install-config calls triggerInstall and reloads config data", async () => {
    const app = createMockApp(createInitialTuiState());
    const executeAction = createActionExecutor({
      app,
      getLatestState: () => app.getState(),
    });

    await executeAction({ type: "install-config" });

    expect(mockTriggerInstall).toHaveBeenCalled();
    expect(mockGetConfigDashboardData).toHaveBeenCalled();
    expect(app.getState().configLastAction).toEqual({
      type: "install",
      result: "success",
      message: "Config installed",
    });
  });

  it("install-config sets error feedback on failure", async () => {
    mockTriggerInstall.mockRejectedValueOnce(new Error("fail"));
    const app = createMockApp(createInitialTuiState());
    const executeAction = createActionExecutor({
      app,
      getLatestState: () => app.getState(),
    });

    await executeAction({ type: "install-config" });

    expect(app.getState().configLastAction).toEqual({
      type: "install",
      result: "error",
      message: "Config install failed",
    });
  });

  it("sync-config calls triggerSync and reloads config data", async () => {
    const app = createMockApp(createInitialTuiState());
    const executeAction = createActionExecutor({
      app,
      getLatestState: () => app.getState(),
    });

    await executeAction({ type: "sync-config" });

    expect(mockTriggerSync).toHaveBeenCalled();
    expect(mockGetConfigDashboardData).toHaveBeenCalled();
    expect(app.getState().configLastAction).toEqual({
      type: "sync",
      result: "success",
      message: "Config synced",
    });
  });

  it("sync-config sets error feedback on failure", async () => {
    mockTriggerSync.mockRejectedValueOnce(new Error("fail"));
    const app = createMockApp(createInitialTuiState());
    const executeAction = createActionExecutor({
      app,
      getLatestState: () => app.getState(),
    });

    await executeAction({ type: "sync-config" });

    expect(app.getState().configLastAction).toEqual({
      type: "sync",
      result: "error",
      message: "Config sync failed",
    });
  });

  it("detect-config calls triggerDetect and reloads config data", async () => {
    const app = createMockApp(createInitialTuiState());
    const executeAction = createActionExecutor({
      app,
      getLatestState: () => app.getState(),
    });

    await executeAction({ type: "detect-config" });

    expect(mockTriggerDetect).toHaveBeenCalled();
    expect(mockGetConfigDashboardData).toHaveBeenCalled();
    expect(app.getState().configLastAction).toEqual({
      type: "detect",
      result: "success",
      message: "Detection complete",
    });
  });

  it("detect-config sets error feedback on failure", async () => {
    mockTriggerDetect.mockRejectedValueOnce(new Error("fail"));
    const app = createMockApp(createInitialTuiState());
    const executeAction = createActionExecutor({
      app,
      getLatestState: () => app.getState(),
    });

    await executeAction({ type: "detect-config" });

    expect(app.getState().configLastAction).toEqual({
      type: "detect",
      result: "error",
      message: "Detection failed",
    });
  });

  it("refresh-status reloads tools and config data", async () => {
    const app = createMockApp(createInitialTuiState());
    const executeAction = createActionExecutor({
      app,
      getLatestState: () => app.getState(),
    });

    await executeAction({ type: "refresh-status" });

    expect(mockDetectTools).toHaveBeenCalled();
    expect(mockGetConfigDashboardData).toHaveBeenCalled();
    expect(app.getState().configLastAction).toEqual({
      type: "refresh",
      result: "success",
      message: "Status refreshed",
    });
  });

  it("refresh-status sets error feedback on failure", async () => {
    mockDetectTools.mockRejectedValueOnce(new Error("fail"));
    const app = createMockApp(createInitialTuiState());
    const executeAction = createActionExecutor({
      app,
      getLatestState: () => app.getState(),
    });

    await executeAction({ type: "refresh-status" });

    expect(app.getState().configLastAction).toEqual({
      type: "refresh",
      result: "error",
      message: "Refresh failed",
    });
  });

  it("open-editor calls stop and start on the app", async () => {
    const app = createMockApp(createInitialTuiState());
    const executeAction = createActionExecutor({
      app,
      getLatestState: () => app.getState(),
    });

    await executeAction({ type: "open-editor" });

    expect(app.stop as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    expect(app.start as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalled();
  });
});

describe("kill-tool action", () => {
  it("shows error toast when paneManager is not available", async () => {
    const app = createMockApp(createInitialTuiState());
    const executeAction = createActionExecutor({
      app,
      getLatestState: () => app.getState(),
    });

    await executeAction({ type: "kill-tool", toolId: "claude" });

    const toast = app.getState().toasts[0];
    expect(toast?.type).toBe("error");
    expect(toast?.message).toContain("not available");
  });

  it("shows info toast when no panes found for tool", async () => {
    const app = createMockApp(createInitialTuiState());
    const paneManager = createMockPaneManager();
    paneManager.getPanesForTool.mockReturnValue([]);

    const executeAction = createActionExecutor({
      app,
      paneManager: paneManager as never,
      getLatestState: () => app.getState(),
    });

    await executeAction({ type: "kill-tool", toolId: "claude" });

    const toast = app.getState().toasts[0];
    expect(toast?.type).toBe("info");
    expect(toast?.message).toContain("No running panes");
  });

  it("closes panes and shows success toast", async () => {
    const initial = createInitialTuiState();
    initial.runningTools = [{ toolId: "claude", pid: 100, startedAt: "2025-01-01" }];
    const app = createMockApp(initial);
    const paneManager = createMockPaneManager();
    paneManager.getPanesForTool.mockReturnValue([0, 1]);
    paneManager.getPaneCount.mockReturnValue(0);

    const executeAction = createActionExecutor({
      app,
      paneManager: paneManager as never,
      getLatestState: () => app.getState(),
    });

    await executeAction({ type: "kill-tool", toolId: "claude" });

    expect(paneManager.closePane).toHaveBeenCalledTimes(2);
    // Closes in reverse order to preserve indices
    expect(paneManager.closePane).toHaveBeenNthCalledWith(1, 1);
    expect(paneManager.closePane).toHaveBeenNthCalledWith(2, 0);

    const toast = app.getState().toasts[0];
    expect(toast?.type).toBe("success");
    expect(toast?.message).toContain("Killed 2 panes");

    // Running tools should be filtered
    expect(app.getState().runningTools).toHaveLength(0);
  });

  it("switches from terminal view when no panes remain", async () => {
    const initial = createInitialTuiState();
    initial.runningTools = [{ toolId: "claude", pid: 100, startedAt: "2025-01-01" }];
    initial.view = "terminal";
    initial.inputMode = "terminal";
    const app = createMockApp(initial);
    const paneManager = createMockPaneManager();
    paneManager.getPanesForTool.mockReturnValue([0]);
    paneManager.getPaneCount.mockReturnValue(0);

    const executeAction = createActionExecutor({
      app,
      paneManager: paneManager as never,
      getLatestState: () => app.getState(),
    });

    await executeAction({ type: "kill-tool", toolId: "claude" });

    expect(app.getState().view).toBe("tools");
    expect(app.getState().inputMode).toBe("dashboard");
  });

  it("stays on terminal view when other panes remain", async () => {
    const initial = createInitialTuiState();
    initial.runningTools = [
      { toolId: "claude", pid: 100, startedAt: "2025-01-01" },
      { toolId: "codex", pid: 200, startedAt: "2025-01-01" },
    ];
    initial.view = "terminal";
    initial.inputMode = "terminal";
    const app = createMockApp(initial);
    const paneManager = createMockPaneManager();
    paneManager.getPanesForTool.mockReturnValue([0]);
    paneManager.getPaneCount.mockReturnValue(1); // codex pane still open

    const executeAction = createActionExecutor({
      app,
      paneManager: paneManager as never,
      getLatestState: () => app.getState(),
    });

    await executeAction({ type: "kill-tool", toolId: "claude" });

    expect(app.getState().view).toBe("terminal");
    expect(app.getState().inputMode).toBe("terminal");
    // Only claude removed, codex remains
    expect(app.getState().runningTools).toHaveLength(1);
    expect(app.getState().runningTools[0]?.toolId).toBe("codex");
  });
});
