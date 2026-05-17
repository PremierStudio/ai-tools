import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PtyProcess, PtyFactory } from "../widgets/terminal-pane.js";
import { PtyManager as BasePtyManager } from "../widgets/terminal-pane.js";
import type { HeadlessTerminal, TerminalFactory } from "./pane.js";
import { resetPaneIdCounter } from "./pane.js";
import { PaneManager } from "./manager.js";

// ── Mocks ─────────────────────────────────────────────

function makeMockPty(): PtyProcess {
  const dataCallbacks: Array<(data: string) => void> = [];
  const exitCallbacks: Array<(exit: { exitCode: number }) => void> = [];

  return {
    pid: Math.floor(Math.random() * 100000),
    onData: (cb) => {
      dataCallbacks.push(cb);
    },
    onExit: (cb) => {
      exitCallbacks.push(cb);
    },
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
  };
}

function makeMockTerminal(): HeadlessTerminal {
  return {
    cols: 80,
    rows: 22,
    buffer: {
      active: {
        length: 22,
        cursorX: 0,
        cursorY: 0,
        viewportY: 0,
        baseY: 0,
        getLine: () => undefined,
      },
    },
    write: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    onWriteParsed: () => ({ dispose: vi.fn() }),
    onTitleChange: () => ({ dispose: vi.fn() }),
  };
}

function makeMockPtyFactory(): PtyFactory {
  return {
    spawn: () => makeMockPty(),
  };
}

function makeMockTermFactory(): TerminalFactory {
  return {
    create: () => makeMockTerminal(),
  };
}

function createTestManager(): PaneManager {
  const ptyManager = new BasePtyManager(makeMockPtyFactory());
  const termFactory = makeMockTermFactory();
  return new PaneManager(ptyManager, termFactory, 80, 24);
}

// ── Tests ─────────────────────────────────────────────

beforeEach(() => {
  resetPaneIdCounter();
});

describe("PaneManager", () => {
  describe("spawnPane", () => {
    it("spawns a pane for a known tool", async () => {
      const manager = createTestManager();
      const pane = await manager.spawnPane("claude");

      expect(pane).not.toBeNull();
      expect(pane!.toolId).toBe("claude");
      expect(pane!.toolName).toBe("Claude Code");
      expect(manager.getPaneCount()).toBe(1);
    });

    it("returns null for unknown tool", async () => {
      const manager = createTestManager();
      const pane = await manager.spawnPane("nonexistent");

      expect(pane).toBeNull();
      expect(manager.getPaneCount()).toBe(0);
    });

    it("focuses the newly spawned pane", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");
      await manager.spawnPane("codex");

      const active = manager.getActivePane();
      expect(active!.toolId).toBe("codex");
    });

    it("increments pane count", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");
      expect(manager.getPaneCount()).toBe(1);

      await manager.spawnPane("codex");
      expect(manager.getPaneCount()).toBe(2);
    });
  });

  describe("spawnPaneWithCommand", () => {
    it("spawns a pane with custom command and args", async () => {
      const manager = createTestManager();
      const pane = await manager.spawnPaneWithCommand("codex", "Codex", "codex", [
        "--prompt",
        "continue from handoff",
      ]);

      expect(pane.toolId).toBe("codex");
      expect(pane.toolName).toBe("Codex");
      expect(manager.getPaneCount()).toBe(1);
      expect(manager.getActivePane()?.id).toBe(pane.id);
    });
  });

  describe("closePane", () => {
    it("closes a pane at the given index", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");
      await manager.spawnPane("codex");

      const closed = manager.closePane(0);
      expect(closed).toBe(true);
      expect(manager.getPaneCount()).toBe(1);
      expect(manager.getActivePane()!.toolId).toBe("codex");
    });

    it("returns false for invalid index", () => {
      const manager = createTestManager();
      expect(manager.closePane(0)).toBe(false);
      expect(manager.closePane(-1)).toBe(false);
    });

    it("adjusts active index when closing active pane", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");
      await manager.spawnPane("codex");

      // Active is codex (index 1)
      manager.closePane(1);
      expect(manager.getActivePane()!.toolId).toBe("claude");
    });

    it("sets active to -1 when last pane closed", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");
      manager.closePane(0);

      expect(manager.getActivePane()).toBeNull();
      expect(manager.getPaneCount()).toBe(0);
    });

    it("adjusts active index when closing before active", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");
      await manager.spawnPane("codex");
      await manager.spawnPane("gemini");

      // Active is gemini (index 2)
      manager.closePane(0);
      // Active should still point to gemini, now at index 1
      expect(manager.getActivePane()!.toolId).toBe("gemini");
    });
  });

  describe("focusPane", () => {
    it("focuses a pane at the given index", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");
      await manager.spawnPane("codex");

      manager.focusPane(0);
      expect(manager.getActivePane()!.toolId).toBe("claude");
    });

    it("returns false for invalid index", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");

      expect(manager.focusPane(-1)).toBe(false);
      expect(manager.focusPane(5)).toBe(false);
    });

    it("returns true for valid index", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");

      expect(manager.focusPane(0)).toBe(true);
    });
  });

  describe("nextPane / prevPane", () => {
    it("cycles to next pane", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");
      await manager.spawnPane("codex");
      await manager.spawnPane("gemini");

      manager.focusPane(0);
      manager.nextPane();
      expect(manager.getActivePane()!.toolId).toBe("codex");
    });

    it("wraps around on next", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");
      await manager.spawnPane("codex");

      // Active is codex (index 1)
      manager.nextPane();
      expect(manager.getActivePane()!.toolId).toBe("claude");
    });

    it("cycles to prev pane", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");
      await manager.spawnPane("codex");

      // Active is codex (index 1)
      manager.prevPane();
      expect(manager.getActivePane()!.toolId).toBe("claude");
    });

    it("wraps around on prev", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");
      await manager.spawnPane("codex");

      manager.focusPane(0);
      manager.prevPane();
      expect(manager.getActivePane()!.toolId).toBe("codex");
    });

    it("does nothing with single pane", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");

      manager.nextPane();
      expect(manager.getActivePane()!.toolId).toBe("claude");

      manager.prevPane();
      expect(manager.getActivePane()!.toolId).toBe("claude");
    });

    it("does nothing with no panes", () => {
      const manager = createTestManager();
      manager.nextPane(); // should not throw
      manager.prevPane();
    });
  });

  describe("getActivePane", () => {
    it("returns null when no panes", () => {
      const manager = createTestManager();
      expect(manager.getActivePane()).toBeNull();
    });

    it("returns the active pane", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");

      expect(manager.getActivePane()!.toolId).toBe("claude");
    });
  });

  describe("getState", () => {
    it("returns current state", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");

      const state = manager.getState();
      expect(state.panes).toHaveLength(1);
      expect(state.activePaneIndex).toBe(0);
    });
  });

  describe("writeToActivePane", () => {
    it("writes to the active pane's PTY", async () => {
      const manager = createTestManager();
      const pane = await manager.spawnPane("claude");

      manager.writeToActivePane("hello");
      expect(pane!.pty.write).toHaveBeenCalledWith("hello");
    });

    it("does nothing when no active pane", () => {
      const manager = createTestManager();
      manager.writeToActivePane("hello"); // should not throw
    });
  });

  describe("resize", () => {
    it("resizes all panes", async () => {
      const manager = createTestManager();
      const pane1 = await manager.spawnPane("claude");
      const pane2 = await manager.spawnPane("codex");

      manager.resize(120, 40);

      // Both terminals should be resized to the exact provided content area.
      expect(pane1!.term.resize).toHaveBeenCalledWith(120, 40);
      expect(pane2!.term.resize).toHaveBeenCalledWith(120, 40);
    });
  });

  describe("handoffBetweenPanes", () => {
    it("writes context to target pane", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");
      const target = await manager.spawnPane("codex");

      const result = manager.handoffBetweenPanes(0, 1, "# Context\nHello");
      expect(result).toBe(true);
      expect(target!.pty.write).toHaveBeenCalledWith("# Context\nHello");
    });

    it("returns false for invalid target", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");

      expect(manager.handoffBetweenPanes(0, 5, "data")).toBe(false);
    });
  });

  describe("destroyAll", () => {
    it("destroys all panes", async () => {
      const manager = createTestManager();
      const pane1 = await manager.spawnPane("claude");
      const pane2 = await manager.spawnPane("codex");

      manager.destroyAll();

      expect(manager.getPaneCount()).toBe(0);
      expect(manager.getActivePane()).toBeNull();
      expect(pane1!.term.dispose).toHaveBeenCalled();
      expect(pane2!.term.dispose).toHaveBeenCalled();
    });
  });

  describe("hasRunningPanes", () => {
    it("returns false when no panes", () => {
      const manager = createTestManager();
      expect(manager.hasRunningPanes()).toBe(false);
    });

    it("returns true when panes are running", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");
      expect(manager.hasRunningPanes()).toBe(true);
    });
  });

  describe("getPanesForTool", () => {
    it("returns indices of panes for a tool", async () => {
      const manager = createTestManager();
      await manager.spawnPane("claude");
      await manager.spawnPane("codex");
      await manager.spawnPane("claude");

      const indices = manager.getPanesForTool("claude");
      expect(indices).toEqual([0, 2]);
    });

    it("returns empty array for tool with no panes", () => {
      const manager = createTestManager();
      expect(manager.getPanesForTool("claude")).toEqual([]);
    });
  });
});
