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

vi.mock("../commands/handoff.js", () => ({
  performHandoff: mockPerformHandoff,
}));

vi.mock("../commands/switch-tool.js", () => ({
  getToolDefinitions: mockGetToolDefinitions,
}));

function createMockApp(initial: TuiState): App<TuiState> {
  let state = initial;
  return {
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
}

function createMockPaneManager() {
  return {
    spawnPane: vi.fn(async () => ({ pid: 901 })),
    spawnPaneWithCommand: vi.fn(async () => ({ pid: 902 })),
    writeToActivePane: vi.fn(),
    getPaneCount: vi.fn(() => 1),
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

    expect(paneManager.spawnPaneWithCommand).toHaveBeenCalledWith(
      "codex",
      "Codex",
      "codex",
      ["--prompt", "# handoff"],
    );
    expect((app.stop as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
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
    expect((app.stop as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });
});
