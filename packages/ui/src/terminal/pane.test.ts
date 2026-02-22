import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PtyProcess, PtyFactory } from "../widgets/terminal-pane.js";
import { PtyManager } from "../widgets/terminal-pane.js";
import type { HeadlessTerminal, TerminalFactory } from "./pane.js";
import {
  createPane,
  writeInput,
  resizePane,
  destroyPane,
  scrollPane,
  clearDirtyLines,
  resetPaneIdCounter,
} from "./pane.js";

// ── Mocks ─────────────────────────────────────────────

function makeMockPty(overrides: Partial<PtyProcess> = {}): PtyProcess {
  const dataCallbacks: Array<(data: string) => void> = [];
  const exitCallbacks: Array<(exit: { exitCode: number; signal?: number }) => void> = [];

  return {
    pid: 12345,
    onData: (cb) => {
      dataCallbacks.push(cb);
    },
    onExit: (cb) => {
      exitCallbacks.push(cb);
    },
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    // Expose for triggering in tests
    _triggerData(data: string) {
      for (const cb of dataCallbacks) cb(data);
    },
    _triggerExit(exitCode: number) {
      for (const cb of exitCallbacks) cb({ exitCode });
    },
    ...overrides,
  } as PtyProcess & { _triggerData: (data: string) => void; _triggerExit: (code: number) => void };
}

function makeMockTerminal(): HeadlessTerminal & {
  _triggerWriteParsed: () => void;
  _triggerTitleChange: (title: string) => void;
  writtenData: string[];
} {
  const writeParsedCallbacks: Array<() => void> = [];
  const titleCallbacks: Array<(title: string) => void> = [];
  const writtenData: string[] = [];

  return {
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
    write: (data: string) => {
      writtenData.push(data);
    },
    resize: vi.fn(),
    dispose: vi.fn(),
    onWriteParsed: (cb) => {
      writeParsedCallbacks.push(cb);
      return { dispose: vi.fn() };
    },
    onTitleChange: (cb) => {
      titleCallbacks.push(cb);
      return { dispose: vi.fn() };
    },
    writtenData,
    _triggerWriteParsed: () => {
      for (const cb of writeParsedCallbacks) cb();
    },
    _triggerTitleChange: (title) => {
      for (const cb of titleCallbacks) cb(title);
    },
  };
}

function makeMockPtyFactory(pty: PtyProcess): PtyFactory {
  return {
    spawn: () => pty,
  };
}

function makeMockTermFactory(term: HeadlessTerminal): TerminalFactory {
  return {
    create: () => term,
  };
}

// ── Tests ─────────────────────────────────────────────

beforeEach(() => {
  resetPaneIdCounter();
});

describe("createPane", () => {
  it("creates a pane with correct initial state", async () => {
    const pty = makeMockPty();
    const term = makeMockTerminal();
    const ptyManager = new PtyManager(makeMockPtyFactory(pty));
    const termFactory = makeMockTermFactory(term);

    const pane = await createPane(
      ptyManager,
      termFactory,
      "claude",
      "Claude Code",
      "claude",
      [],
      80,
      24,
    );

    expect(pane.id).toBe("pane-1");
    expect(pane.toolId).toBe("claude");
    expect(pane.toolName).toBe("Claude Code");
    expect(pane.status).toBe("running");
    expect(pane.pid).toBe(12345);
    expect(pane.exitCode).toBeUndefined();
    expect(pane.scrollOffset).toBe(0);
    expect(pane.title).toBe("Claude Code");
  });

  it("generates unique IDs", async () => {
    const pty = makeMockPty();
    const term = makeMockTerminal();
    const ptyManager = new PtyManager(makeMockPtyFactory(pty));
    const termFactory = makeMockTermFactory(term);

    const pane1 = await createPane(
      ptyManager,
      termFactory,
      "claude",
      "Claude",
      "claude",
      [],
      80,
      24,
    );
    const pane2 = await createPane(ptyManager, termFactory, "codex", "Codex", "codex", [], 80, 24);

    expect(pane1.id).toBe("pane-1");
    expect(pane2.id).toBe("pane-2");
  });

  it("pipes PTY data to xterm Terminal", async () => {
    const mockPty = makeMockPty() as PtyProcess & { _triggerData: (data: string) => void };
    const term = makeMockTerminal();
    const ptyManager = new PtyManager(makeMockPtyFactory(mockPty));
    const termFactory = makeMockTermFactory(term);

    await createPane(ptyManager, termFactory, "claude", "Claude", "claude", [], 80, 24);

    mockPty._triggerData("hello");
    expect(term.writtenData).toContain("hello");
  });

  it("tracks dirty lines on render events", async () => {
    const pty = makeMockPty();
    const term = makeMockTerminal();
    const ptyManager = new PtyManager(makeMockPtyFactory(pty));
    const termFactory = makeMockTermFactory(term);

    const pane = await createPane(
      ptyManager,
      termFactory,
      "claude",
      "Claude",
      "claude",
      [],
      80,
      24,
    );

    term._triggerWriteParsed();
    // onWriteParsed marks all visible rows dirty
    expect(pane.dirtyLines.has(0)).toBe(true);
    expect(pane.dirtyLines.has(12)).toBe(true);
    expect(pane.dirtyLines.has(23)).toBe(true);
    expect(pane.dirtyLines.size).toBe(24);
  });

  it("updates title on title change events", async () => {
    const pty = makeMockPty();
    const term = makeMockTerminal();
    const ptyManager = new PtyManager(makeMockPtyFactory(pty));
    const termFactory = makeMockTermFactory(term);

    const pane = await createPane(
      ptyManager,
      termFactory,
      "claude",
      "Claude",
      "claude",
      [],
      80,
      24,
    );
    expect(pane.title).toBe("Claude");

    term._triggerTitleChange("bash: ~/project");
    expect(pane.title).toBe("bash: ~/project");
  });

  it("tracks exit status", async () => {
    const mockPty = makeMockPty() as PtyProcess & { _triggerExit: (code: number) => void };
    const term = makeMockTerminal();
    const ptyManager = new PtyManager(makeMockPtyFactory(mockPty));
    const termFactory = makeMockTermFactory(term);

    const pane = await createPane(
      ptyManager,
      termFactory,
      "claude",
      "Claude",
      "claude",
      [],
      80,
      24,
    );
    expect(pane.status).toBe("running");

    mockPty._triggerExit(0);
    expect(pane.status).toBe("exited");
    expect(pane.exitCode).toBe(0);
  });
});

describe("writeInput", () => {
  it("writes to PTY when pane is running", async () => {
    const pty = makeMockPty();
    const term = makeMockTerminal();
    const ptyManager = new PtyManager(makeMockPtyFactory(pty));
    const termFactory = makeMockTermFactory(term);

    const pane = await createPane(
      ptyManager,
      termFactory,
      "claude",
      "Claude",
      "claude",
      [],
      80,
      24,
    );
    writeInput(pane, "hello");
    expect(pty.write).toHaveBeenCalledWith("hello");
  });

  it("does not write when pane has exited", async () => {
    const mockPty = makeMockPty() as PtyProcess & { _triggerExit: (code: number) => void };
    const term = makeMockTerminal();
    const ptyManager = new PtyManager(makeMockPtyFactory(mockPty));
    const termFactory = makeMockTermFactory(term);

    const pane = await createPane(
      ptyManager,
      termFactory,
      "claude",
      "Claude",
      "claude",
      [],
      80,
      24,
    );
    mockPty._triggerExit(1);
    writeInput(pane, "hello");
    // Only the createPty call, not the writeInput
    expect(mockPty.write).not.toHaveBeenCalled();
  });
});

describe("resizePane", () => {
  it("resizes both terminal and PTY", async () => {
    const pty = makeMockPty();
    const term = makeMockTerminal();
    const ptyManager = new PtyManager(makeMockPtyFactory(pty));
    const termFactory = makeMockTermFactory(term);

    const pane = await createPane(
      ptyManager,
      termFactory,
      "claude",
      "Claude",
      "claude",
      [],
      80,
      24,
    );
    resizePane(pane, 120, 40);

    expect(term.resize).toHaveBeenCalledWith(120, 40);
    expect(pty.resize).toHaveBeenCalledWith(120, 40);
  });

  it("does not resize PTY when exited", async () => {
    const mockPty = makeMockPty() as PtyProcess & { _triggerExit: (code: number) => void };
    const term = makeMockTerminal();
    const ptyManager = new PtyManager(makeMockPtyFactory(mockPty));
    const termFactory = makeMockTermFactory(term);

    const pane = await createPane(
      ptyManager,
      termFactory,
      "claude",
      "Claude",
      "claude",
      [],
      80,
      24,
    );
    mockPty._triggerExit(0);
    resizePane(pane, 120, 40);

    expect(term.resize).toHaveBeenCalledWith(120, 40);
    expect(mockPty.resize).not.toHaveBeenCalled();
  });
});

describe("destroyPane", () => {
  it("kills PTY and disposes terminal", async () => {
    const pty = makeMockPty();
    const term = makeMockTerminal();
    const ptyManager = new PtyManager(makeMockPtyFactory(pty));
    const termFactory = makeMockTermFactory(term);

    const pane = await createPane(
      ptyManager,
      termFactory,
      "claude",
      "Claude",
      "claude",
      [],
      80,
      24,
    );
    destroyPane(pane);

    expect(pty.kill).toHaveBeenCalled();
    expect(term.dispose).toHaveBeenCalled();
  });

  it("only disposes terminal when already exited", async () => {
    const mockPty = makeMockPty() as PtyProcess & { _triggerExit: (code: number) => void };
    const term = makeMockTerminal();
    const ptyManager = new PtyManager(makeMockPtyFactory(mockPty));
    const termFactory = makeMockTermFactory(term);

    const pane = await createPane(
      ptyManager,
      termFactory,
      "claude",
      "Claude",
      "claude",
      [],
      80,
      24,
    );
    mockPty._triggerExit(0);
    destroyPane(pane);

    expect(mockPty.kill).not.toHaveBeenCalled();
    expect(term.dispose).toHaveBeenCalled();
  });
});

describe("scrollPane", () => {
  it("sets scroll offset", async () => {
    const pty = makeMockPty();
    const term = makeMockTerminal();
    const ptyManager = new PtyManager(makeMockPtyFactory(pty));
    const termFactory = makeMockTermFactory(term);

    const pane = await createPane(
      ptyManager,
      termFactory,
      "claude",
      "Claude",
      "claude",
      [],
      80,
      24,
    );
    const offset = scrollPane(pane, 5);
    expect(offset).toBe(0); // maxScroll is 0 (baseY = 0)
    expect(pane.scrollOffset).toBe(0);
  });

  it("clamps to zero on negative delta", async () => {
    const pty = makeMockPty();
    const term = makeMockTerminal();
    const ptyManager = new PtyManager(makeMockPtyFactory(pty));
    const termFactory = makeMockTermFactory(term);

    const pane = await createPane(
      ptyManager,
      termFactory,
      "claude",
      "Claude",
      "claude",
      [],
      80,
      24,
    );
    const offset = scrollPane(pane, -10);
    expect(offset).toBe(0);
  });
});

describe("clearDirtyLines", () => {
  it("clears the dirty lines set", async () => {
    const pty = makeMockPty();
    const term = makeMockTerminal();
    const ptyManager = new PtyManager(makeMockPtyFactory(pty));
    const termFactory = makeMockTermFactory(term);

    const pane = await createPane(
      ptyManager,
      termFactory,
      "claude",
      "Claude",
      "claude",
      [],
      80,
      24,
    );
    term._triggerWriteParsed();
    expect(pane.dirtyLines.size).toBe(24);

    clearDirtyLines(pane);
    expect(pane.dirtyLines.size).toBe(0);
  });
});
