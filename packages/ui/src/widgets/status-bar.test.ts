import { describe, it, expect } from "vitest";
import { computeStatusBar } from "./status-bar.js";
import type { AppState } from "../types.js";

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    mode: "canonical",
    tools: [],
    panes: [],
    activePaneIndex: 0,
    sessionCount: 0,
    configHealth: "healthy",
    ...overrides,
  };
}

describe("computeStatusBar()", () => {
  it("returns formatted mode for canonical", () => {
    const data = computeStatusBar(makeState({ mode: "canonical" }));
    expect(data.mode).toBe("Canonical");
  });

  it("returns formatted mode for direct", () => {
    const data = computeStatusBar(makeState({ mode: "direct" }));
    expect(data.mode).toBe("Direct");
  });

  it("returns formatted mode for unknown", () => {
    const data = computeStatusBar(makeState({ mode: "unknown" }));
    expect(data.mode).toBe("Unknown");
  });

  it("returns None when no active pane", () => {
    const data = computeStatusBar(makeState());
    expect(data.activeTool).toBe("None");
  });

  it("returns tool name when active pane exists", () => {
    const state = makeState({
      tools: [
        {
          id: "claude",
          name: "Claude Code",
          command: "claude",
          status: "running",
          sessionCount: 0,
        },
      ],
      panes: [{ toolId: "claude", active: true, pid: 1 }],
      activePaneIndex: 0,
    });

    const data = computeStatusBar(state);
    expect(data.activeTool).toBe("Claude Code");
  });

  it("returns None when pane tool not in tools list", () => {
    const state = makeState({
      tools: [],
      panes: [{ toolId: "ghost", active: true }],
      activePaneIndex: 0,
    });

    const data = computeStatusBar(state);
    expect(data.activeTool).toBe("None");
  });

  it("returns session count from state", () => {
    const data = computeStatusBar(makeState({ sessionCount: 42 }));
    expect(data.sessionCount).toBe(42);
  });

  it("returns formatted healthy config health", () => {
    const data = computeStatusBar(makeState({ configHealth: "healthy" }));
    expect(data.configHealth).toBe("Healthy");
  });

  it("returns formatted stale config health", () => {
    const data = computeStatusBar(makeState({ configHealth: "stale" }));
    expect(data.configHealth).toBe("Stale");
  });

  it("returns formatted error config health", () => {
    const data = computeStatusBar(makeState({ configHealth: "error" }));
    expect(data.configHealth).toBe("Error");
  });

  it("handles activePaneIndex out of range", () => {
    const state = makeState({
      panes: [{ toolId: "claude", active: true }],
      activePaneIndex: 99,
    });

    const data = computeStatusBar(state);
    expect(data.activeTool).toBe("None");
  });
});
