/**
 * TerminalPane — single embedded terminal wrapping PTY + xterm/headless.
 *
 * Each pane manages one tool instance: a node-pty process piped through
 * an xterm/headless Terminal for ANSI parsing and buffer management.
 */

import type { PtyManager, PtyProcess } from "../widgets/terminal-pane.js";

/**
 * Minimal Terminal interface matching @xterm/headless.
 * Extracted so we can mock it in tests.
 */
export type HeadlessTerminal = {
  readonly cols: number;
  readonly rows: number;
  readonly buffer: {
    readonly active: TerminalBuffer;
  };
  write(data: string): void;
  resize(cols: number, rows: number): void;
  dispose(): void;
  onWriteParsed: TerminalEventHandler<void>;
  onTitleChange: TerminalEventHandler<string>;
};

export type TerminalBuffer = {
  readonly length: number;
  readonly cursorX: number;
  readonly cursorY: number;
  readonly viewportY: number;
  readonly baseY: number;
  getLine(y: number): TerminalBufferLine | undefined;
};

export type TerminalBufferLine = {
  readonly length: number;
  getCell(x: number, cell?: TerminalBufferCell): TerminalBufferCell | undefined;
  translateToString(trimRight?: boolean): string;
};

export type TerminalBufferCell = {
  getChars(): string;
  getWidth(): number;
  getForegroundColor(): number;
  getBackgroundColor(): number;
  isBold(): number;
  isItalic(): number;
  isUnderline(): number;
  isStrikethrough(): number;
  isDim(): number;
  isInverse(): number;
  isFgDefault(): boolean;
  isBgDefault(): boolean;
  isFgPalette(): boolean;
  isBgPalette(): boolean;
  isFgRGB(): boolean;
  isBgRGB(): boolean;
};

type TerminalEventHandler<T = { start: number; end: number }> = {
  (callback: (data: T) => void): { dispose(): void };
};

/**
 * State for a single terminal pane.
 */
export type TerminalPaneState = {
  id: string;
  toolId: string;
  toolName: string;
  pty: PtyProcess;
  term: HeadlessTerminal;
  pid: number;
  status: "running" | "exited";
  exitCode?: number;
  dirtyLines: Set<number>;
  title: string;
  scrollOffset: number;
};

/**
 * Factory for creating headless Terminal instances.
 * Allows dependency injection for testing.
 */
export type TerminalFactory = {
  create(cols: number, rows: number): HeadlessTerminal;
};

let paneIdCounter = 0;

/**
 * Reset the pane ID counter (for testing).
 */
export function resetPaneIdCounter(): void {
  paneIdCounter = 0;
}

/**
 * Create a new terminal pane: spawns PTY, creates xterm Terminal, wires data pipe.
 */
export async function createPane(
  ptyManager: PtyManager,
  termFactory: TerminalFactory,
  toolId: string,
  toolName: string,
  command: string,
  args: string[],
  cols: number,
  rows: number,
): Promise<TerminalPaneState> {
  const id = `pane-${++paneIdCounter}`;

  // Create the headless terminal for ANSI parsing
  const term = termFactory.create(cols, rows);

  // Spawn the PTY process
  const pty = await ptyManager.createPty(command, args, { cols, rows });

  const state: TerminalPaneState = {
    id,
    toolId,
    toolName,
    pty,
    term,
    pid: pty.pid,
    status: "running",
    exitCode: undefined,
    dirtyLines: new Set(),
    title: toolName,
    scrollOffset: 0,
  };

  // Wire PTY output → xterm Terminal
  pty.onData((data: string) => {
    term.write(data);
  });

  // Track which lines changed for optimized re-rendering.
  // onWriteParsed fires after each write is processed but doesn't provide a range,
  // so we mark all visible lines dirty (the renderer handles skipping unchanged content).
  term.onWriteParsed(() => {
    for (let i = 0; i < term.rows; i++) {
      state.dirtyLines.add(i);
    }
  });

  // Track title changes from OSC sequences
  term.onTitleChange((title: string) => {
    state.title = title;
  });

  // Track process exit
  pty.onExit((exit: { exitCode: number }) => {
    state.status = "exited";
    state.exitCode = exit.exitCode;
  });

  return state;
}

/**
 * Write input data to a pane's PTY stdin.
 */
export function writeInput(pane: TerminalPaneState, data: string): void {
  if (pane.status === "running") {
    pane.pty.write(data);
  }
}

/**
 * Resize a pane's PTY and xterm Terminal.
 */
export function resizePane(pane: TerminalPaneState, cols: number, rows: number): void {
  pane.term.resize(cols, rows);
  if (pane.status === "running") {
    pane.pty.resize(cols, rows);
  }
}

/**
 * Destroy a pane: kill PTY and dispose xterm Terminal.
 */
export function destroyPane(pane: TerminalPaneState): void {
  if (pane.status === "running") {
    pane.pty.kill();
  }
  pane.term.dispose();
}

/**
 * Scroll the pane viewport (for scrollback navigation).
 * Returns the new scroll offset.
 */
export function scrollPane(pane: TerminalPaneState, delta: number): number {
  const maxScroll = pane.term.buffer.active.baseY;
  const newOffset = Math.max(0, Math.min(pane.scrollOffset + delta, maxScroll));
  pane.scrollOffset = newOffset;
  return newOffset;
}

/**
 * Clear dirty line tracking (call after rendering).
 */
export function clearDirtyLines(pane: TerminalPaneState): void {
  pane.dirtyLines.clear();
}
