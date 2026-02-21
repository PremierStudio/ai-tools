import { describe, it, expect, vi, beforeEach } from "vitest";
import { PtyManager } from "./terminal-pane.js";
import type { PtyFactory, PtyProcess, PtySpawnOptions } from "./terminal-pane.js";

function makeMockPty(pid: number = 123): PtyProcess {
  return {
    pid,
    onData: vi.fn(),
    onExit: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
  };
}

function makeMockFactory(pty?: PtyProcess): PtyFactory {
  const mockPty = pty ?? makeMockPty();
  return {
    spawn: vi.fn().mockReturnValue(mockPty),
  };
}

describe("PtyManager", () => {
  let factory: PtyFactory;
  let manager: PtyManager;
  let mockPty: PtyProcess;

  beforeEach(() => {
    mockPty = makeMockPty();
    factory = makeMockFactory(mockPty);
    manager = new PtyManager(factory);
  });

  // -- createPty --

  describe("createPty()", () => {
    it("spawns a PTY with default options", async () => {
      const pty = await manager.createPty("bash");

      expect(factory.spawn).toHaveBeenCalledWith(
        "bash",
        [],
        expect.objectContaining({
          cols: 80,
          rows: 24,
        }),
      );
      expect(pty).toBe(mockPty);
    });

    it("passes custom args", async () => {
      await manager.createPty("claude", ["--help"]);

      expect(factory.spawn).toHaveBeenCalledWith(
        "claude",
        ["--help"],
        expect.objectContaining({ cols: 80, rows: 24 }),
      );
    });

    it("passes custom cols and rows", async () => {
      await manager.createPty("bash", [], { cols: 120, rows: 40 });

      expect(factory.spawn).toHaveBeenCalledWith(
        "bash",
        [],
        expect.objectContaining({
          cols: 120,
          rows: 40,
        }),
      );
    });

    it("passes custom cwd", async () => {
      await manager.createPty("bash", [], { cwd: "/tmp" });

      expect(factory.spawn).toHaveBeenCalledWith(
        "bash",
        [],
        expect.objectContaining({
          cwd: "/tmp",
        }),
      );
    });

    it("passes custom env", async () => {
      const env = { HOME: "/test" };
      await manager.createPty("bash", [], { env });

      expect(factory.spawn).toHaveBeenCalledWith(
        "bash",
        [],
        expect.objectContaining({
          env: { HOME: "/test" },
        }),
      );
    });

    it("uses process.cwd() as default cwd", async () => {
      await manager.createPty("bash");

      expect(factory.spawn).toHaveBeenCalledWith(
        "bash",
        [],
        expect.objectContaining({
          cwd: process.cwd(),
        }),
      );
    });

    it("returns the spawned PTY process", async () => {
      const pty = await manager.createPty("node");
      expect(pty.pid).toBe(123);
    });
  });

  // -- writeToPty --

  describe("writeToPty()", () => {
    it("writes data to PTY stdin", () => {
      manager.writeToPty(mockPty, "hello\n");
      expect(mockPty.write).toHaveBeenCalledWith("hello\n");
    });

    it("writes empty string", () => {
      manager.writeToPty(mockPty, "");
      expect(mockPty.write).toHaveBeenCalledWith("");
    });
  });

  // -- resizePty --

  describe("resizePty()", () => {
    it("resizes the PTY", () => {
      manager.resizePty(mockPty, 100, 50);
      expect(mockPty.resize).toHaveBeenCalledWith(100, 50);
    });
  });

  // -- killPty --

  describe("killPty()", () => {
    it("kills the PTY without signal", () => {
      manager.killPty(mockPty);
      expect(mockPty.kill).toHaveBeenCalledWith(undefined);
    });

    it("kills the PTY with specific signal", () => {
      manager.killPty(mockPty, "SIGTERM");
      expect(mockPty.kill).toHaveBeenCalledWith("SIGTERM");
    });
  });

  // -- lazy factory loading --

  describe("lazy factory loading", () => {
    it("uses node-pty when no factory injected", async () => {
      vi.mock("node-pty", () => {
        const mockLazyPty = makeMockPty(999);
        return {
          spawn: vi.fn().mockReturnValue(mockLazyPty),
        };
      });

      const lazyManager = new PtyManager();
      const pty = await lazyManager.createPty("bash");
      expect(pty.pid).toBe(999);
    });
  });

  // -- PtySpawnOptions type --

  describe("PtySpawnOptions type", () => {
    it("allows all optional fields", async () => {
      const opts: PtySpawnOptions = {
        cols: 80,
        rows: 24,
        cwd: "/home",
        env: { TERM: "xterm" },
      };
      await manager.createPty("bash", [], opts);
      expect(factory.spawn).toHaveBeenCalled();
    });

    it("allows empty options", async () => {
      const opts: PtySpawnOptions = {};
      void opts;
      await manager.createPty("bash", [], {});
      expect(factory.spawn).toHaveBeenCalled();
    });
  });
});
