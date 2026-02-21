import { describe, it, expect } from "vitest";
import type { ToolStatus, ToolInfo, PaneState, AppState, AppView } from "./types.js";

describe("types", () => {
  it("ToolStatus accepts all valid values", () => {
    const statuses: ToolStatus[] = ["available", "running", "stopped", "not-installed"];
    expect(statuses).toHaveLength(4);
  });

  it("ToolInfo has expected shape", () => {
    const tool: ToolInfo = {
      id: "claude",
      name: "Claude Code",
      command: "claude",
      status: "available",
      sessionCount: 3,
    };
    expect(tool.id).toBe("claude");
    expect(tool.name).toBe("Claude Code");
    expect(tool.command).toBe("claude");
    expect(tool.status).toBe("available");
    expect(tool.sessionCount).toBe(3);
  });

  it("PaneState has expected shape", () => {
    const pane: PaneState = {
      toolId: "claude",
      active: true,
      pid: 12345,
    };
    expect(pane.toolId).toBe("claude");
    expect(pane.active).toBe(true);
    expect(pane.pid).toBe(12345);
  });

  it("PaneState pid is optional", () => {
    const pane: PaneState = {
      toolId: "codex",
      active: false,
    };
    expect(pane.pid).toBeUndefined();
  });

  it("AppState has expected shape", () => {
    const state: AppState = {
      mode: "canonical",
      tools: [],
      panes: [],
      activePaneIndex: 0,
      sessionCount: 0,
      configHealth: "healthy",
    };
    expect(state.mode).toBe("canonical");
    expect(state.tools).toEqual([]);
    expect(state.panes).toEqual([]);
    expect(state.activePaneIndex).toBe(0);
    expect(state.sessionCount).toBe(0);
    expect(state.configHealth).toBe("healthy");
  });

  it("AppState mode accepts all valid values", () => {
    const modes: AppState["mode"][] = ["canonical", "direct", "unknown"];
    expect(modes).toHaveLength(3);
  });

  it("AppState configHealth accepts all valid values", () => {
    const healthValues: AppState["configHealth"][] = ["healthy", "stale", "error"];
    expect(healthValues).toHaveLength(3);
  });

  it("AppView accepts all valid values", () => {
    const views: AppView[] = ["tools", "sessions", "handoff", "config"];
    expect(views).toHaveLength(4);
  });
});
