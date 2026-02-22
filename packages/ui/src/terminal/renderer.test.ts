import { describe, it, expect, vi } from "vitest";
import type { TerminalPaneState, TerminalBufferCell, HeadlessTerminal } from "./pane.js";
import type { TextStyle } from "./colors.js";
import {
  buildTabEntries,
  formatTabBar,
  formatStatusBar,
  buildRenderedLines,
  buildLineSegments,
  getCommandOverlayText,
  DEFAULT_FG,
  DEFAULT_BG,
  type TabEntry,
} from "./renderer.js";

// ── Helpers ───────────────────────────────────────────

function makeMockCell(
  chars: string,
  width = 1,
  overrides: Partial<{
    fg: number;
    bg: number;
    fgDefault: boolean;
    bgDefault: boolean;
    fgPalette: boolean;
    bgPalette: boolean;
    bold: number;
    italic: number;
    underline: number;
  }> = {},
): TerminalBufferCell {
  return {
    getChars: () => chars,
    getWidth: () => width,
    getForegroundColor: () => overrides.fg ?? 0,
    getBackgroundColor: () => overrides.bg ?? 0,
    isBold: () => overrides.bold ?? 0,
    isItalic: () => overrides.italic ?? 0,
    isUnderline: () => overrides.underline ?? 0,
    isStrikethrough: () => 0,
    isDim: () => 0,
    isInverse: () => 0,
    isFgDefault: () => overrides.fgDefault ?? true,
    isBgDefault: () => overrides.bgDefault ?? true,
    isFgPalette: () => overrides.fgPalette ?? false,
    isBgPalette: () => overrides.bgPalette ?? false,
    isFgRGB: () => false,
    isBgRGB: () => false,
  };
}

function makeMockLine(cells: TerminalBufferCell[]): {
  length: number;
  getCell: (x: number) => TerminalBufferCell | undefined;
  translateToString: (trimRight?: boolean) => string;
} {
  return {
    length: cells.length,
    getCell: (x: number) => cells[x],
    translateToString: () => cells.map((c) => c.getChars()).join(""),
  };
}

function makePaneState(overrides: Partial<TerminalPaneState> = {}): TerminalPaneState {
  return {
    id: "pane-1",
    toolId: "claude",
    toolName: "Claude Code",
    pty: {
      pid: 12345,
      onData: vi.fn(),
      onExit: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
    },
    term: {
      cols: 80,
      rows: 24,
      buffer: {
        active: {
          length: 24,
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
    } as HeadlessTerminal,
    pid: 12345,
    status: "running",
    exitCode: undefined,
    dirtyLines: new Set(),
    title: "Claude Code",
    scrollOffset: 0,
    ...overrides,
  };
}

// ── buildTabEntries ───────────────────────────────────

describe("buildTabEntries", () => {
  it("builds entries from pane states", () => {
    const panes = [
      makePaneState({ toolId: "claude", title: "Claude" }),
      makePaneState({ toolId: "codex", title: "Codex" }),
    ];

    const entries = buildTabEntries(panes, 0);
    expect(entries).toHaveLength(2);
    expect(entries[0]!.label).toBe("1:Claude");
    expect(entries[0]!.active).toBe(true);
    expect(entries[1]!.label).toBe("2:Codex");
    expect(entries[1]!.active).toBe(false);
  });

  it("marks exited pane status", () => {
    const panes = [makePaneState({ status: "exited", exitCode: 1 })];
    const entries = buildTabEntries(panes, 0);
    expect(entries[0]!.status).toBe("exited");
    expect(entries[0]!.exitCode).toBe(1);
  });

  it("returns empty array for no panes", () => {
    expect(buildTabEntries([], 0)).toEqual([]);
  });
});

// ── formatTabBar ──────────────────────────────────────

describe("formatTabBar", () => {
  it("formats tab entries with active indicator", () => {
    const entries: TabEntry[] = [
      { index: 0, label: "1:Claude", active: true, status: "running" },
      { index: 1, label: "2:Codex", active: false, status: "running" },
    ];

    const bar = formatTabBar(entries, 80);
    expect(bar).toContain("*1:Claude");
    expect(bar).toContain(" 2:Codex");
    expect(bar).toContain(" | ");
  });

  it("shows exit code for exited panes", () => {
    const entries: TabEntry[] = [
      { index: 0, label: "1:Claude", active: true, status: "exited", exitCode: 0 },
    ];

    const bar = formatTabBar(entries, 80);
    expect(bar).toContain("[0]");
  });

  it("truncates with ellipsis when too wide", () => {
    const entries: TabEntry[] = Array.from({ length: 10 }, (_, i) => ({
      index: i,
      label: `${i + 1}:VeryLongToolNameHere`,
      active: i === 0,
      status: "running" as const,
    }));

    const bar = formatTabBar(entries, 40);
    expect(bar).toContain("...");
  });

  it("returns empty string for no entries", () => {
    expect(formatTabBar([], 80)).toBe("");
  });
});

// ── formatStatusBar ───────────────────────────────────

describe("formatStatusBar", () => {
  it("includes tool name and PID for running pane", () => {
    const info = {
      toolName: "Claude Code",
      pid: 12345,
      status: "running" as const,
      cols: 80,
      rows: 24,
      mode: "terminal" as const,
    };

    const bar = formatStatusBar(info);
    expect(bar).toContain("Claude Code");
    expect(bar).toContain("PID:12345");
    expect(bar).toContain("80x24");
  });

  it("shows exit code for exited pane", () => {
    const info = {
      toolName: "Codex",
      pid: 99,
      status: "exited" as const,
      exitCode: 1,
      cols: 80,
      rows: 24,
      mode: "terminal" as const,
    };

    const bar = formatStatusBar(info);
    expect(bar).toContain("Exited(1)");
  });

  it("shows CMD mode indicator", () => {
    const info = {
      toolName: "Claude",
      pid: 1,
      status: "running" as const,
      cols: 80,
      rows: 24,
      mode: "command" as const,
    };

    const bar = formatStatusBar(info);
    expect(bar).toContain("[CMD]");
  });

  it("shows DASH mode indicator", () => {
    const info = {
      toolName: "Claude",
      pid: 1,
      status: "running" as const,
      cols: 80,
      rows: 24,
      mode: "dashboard" as const,
    };

    const bar = formatStatusBar(info);
    expect(bar).toContain("[DASH]");
  });

  it("no mode indicator in terminal mode", () => {
    const info = {
      toolName: "Claude",
      pid: 1,
      status: "running" as const,
      cols: 80,
      rows: 24,
      mode: "terminal" as const,
    };

    const bar = formatStatusBar(info);
    expect(bar).not.toContain("[CMD]");
    expect(bar).not.toContain("[DASH]");
  });
});

// ── buildLineSegments ─────────────────────────────────

describe("buildLineSegments", () => {
  it("batches consecutive cells with same style", () => {
    const cells = [
      makeMockCell("H"),
      makeMockCell("e"),
      makeMockCell("l"),
      makeMockCell("l"),
      makeMockCell("o"),
    ];
    const line = makeMockLine(cells);

    const segments = buildLineSegments(line, 80);
    expect(segments).toHaveLength(1);
    expect(segments[0]!.text).toBe("Hello");
  });

  it("splits segments on style changes", () => {
    const cells = [
      makeMockCell("H", 1, { bold: 1 }),
      makeMockCell("i", 1, { bold: 1 }),
      makeMockCell("!", 1, {}),
    ];
    const line = makeMockLine(cells);

    const segments = buildLineSegments(line, 80);
    expect(segments).toHaveLength(2);
    expect(segments[0]!.text).toBe("Hi");
    expect(segments[0]!.style.bold).toBe(true);
    expect(segments[1]!.text).toBe("!");
  });

  it("handles empty cells as spaces", () => {
    const cells = [makeMockCell("")];
    const line = makeMockLine(cells);

    const segments = buildLineSegments(line, 80);
    expect(segments).toHaveLength(1);
    expect(segments[0]!.text).toBe(" ");
  });

  it("skips zero-width cells", () => {
    const cells = [
      makeMockCell("A", 1),
      makeMockCell("", 0), // continuation of wide char
      makeMockCell("B", 1),
    ];
    const line = makeMockLine(cells);

    const segments = buildLineSegments(line, 80);
    expect(segments).toHaveLength(1);
    expect(segments[0]!.text).toBe("AB");
  });

  it("respects column limit", () => {
    const cells = [makeMockCell("A"), makeMockCell("B"), makeMockCell("C"), makeMockCell("D")];
    const line = makeMockLine(cells);

    const segments = buildLineSegments(line, 2);
    expect(segments).toHaveLength(1);
    expect(segments[0]!.text).toBe("AB");
  });

  it("returns empty array for empty line", () => {
    const line = makeMockLine([]);
    expect(buildLineSegments(line, 80)).toEqual([]);
  });

  it("handles color changes", () => {
    const cells = [
      makeMockCell("R", 1, { fgDefault: false, fgPalette: true, fg: 1 }),
      makeMockCell("G", 1, { fgDefault: false, fgPalette: true, fg: 2 }),
    ];
    const line = makeMockLine(cells);

    const segments = buildLineSegments(line, 80);
    expect(segments).toHaveLength(2);
    expect(segments[0]!.style.fg).toEqual({ r: 205, g: 0, b: 0 });
    expect(segments[1]!.style.fg).toEqual({ r: 0, g: 205, b: 0 });
  });
});

// ── buildRenderedLines ────────────────────────────────

describe("buildRenderedLines", () => {
  it("returns empty segments for lines without data", () => {
    const pane = makePaneState();
    const lines = buildRenderedLines(pane, 0, 5, 80);

    expect(lines).toHaveLength(5);
    for (const line of lines) {
      expect(line.segments).toEqual([]);
    }
  });

  it("reads buffer lines when available", () => {
    const cells = [makeMockCell("X"), makeMockCell("Y")];
    const bufferLine = makeMockLine(cells);

    const pane = makePaneState({
      term: {
        cols: 80,
        rows: 24,
        buffer: {
          active: {
            length: 24,
            cursorX: 0,
            cursorY: 0,
            viewportY: 0,
            baseY: 0,
            getLine: (y: number) => (y === 0 ? bufferLine : undefined),
          },
        },
        write: vi.fn(),
        resize: vi.fn(),
        dispose: vi.fn(),
        onWriteParsed: () => ({ dispose: vi.fn() }),
        onTitleChange: () => ({ dispose: vi.fn() }),
      } as unknown as HeadlessTerminal,
    });

    const lines = buildRenderedLines(pane, 0, 1, 80);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.segments).toHaveLength(1);
    expect(lines[0]!.segments[0]!.text).toBe("XY");
  });
});

// ── getCommandOverlayText ─────────────────────────────

describe("getCommandOverlayText", () => {
  it("returns array of help lines", () => {
    const lines = getCommandOverlayText();
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toContain("COMMAND MODE");
  });

  it("includes key bindings", () => {
    const text = getCommandOverlayText().join("\n");
    expect(text).toContain("New pane");
    expect(text).toContain("Close pane");
    expect(text).toContain("Next tab");
    expect(text).toContain("Dashboard");
    expect(text).toContain("Handoff");
  });
});

// ── Constants ─────────────────────────────────────────

describe("color constants", () => {
  it("DEFAULT_FG is light gray", () => {
    expect(DEFAULT_FG).toEqual({ r: 229, g: 229, b: 229 });
  });

  it("DEFAULT_BG is black", () => {
    expect(DEFAULT_BG).toEqual({ r: 0, g: 0, b: 0 });
  });
});
