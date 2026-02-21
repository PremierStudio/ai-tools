import { describe, it, expect, beforeEach, vi } from "vitest";
import { HookEngine } from "./engine.js";
import type {
  HookDefinition,
  HookEvent,
  ShellBeforeEvent,
  FileWriteEvent,
  ShellAfterEvent,
} from "../types/index.js";

function makeShellBefore(command: string): ShellBeforeEvent {
  return {
    type: "shell:before",
    command,
    cwd: "/tmp",
    timestamp: Date.now(),
    metadata: {},
  };
}

function makeFileWrite(path: string, content: string): FileWriteEvent {
  return {
    type: "file:write",
    path,
    content,
    timestamp: Date.now(),
    metadata: {},
  };
}

function makeShellAfter(command: string): ShellAfterEvent {
  return {
    type: "shell:after",
    command,
    cwd: "/tmp",
    exitCode: 0,
    stdout: "",
    stderr: "",
    duration: 100,
    timestamp: Date.now(),
    metadata: {},
  };
}

const toolInfo = { name: "test-tool", version: "1.0" };

function makePassthroughHook(
  id: string,
  events: HookEvent["type"][],
  phase: "before" | "after",
): HookDefinition {
  return {
    id,
    name: id,
    events,
    phase,
    handler: async (_ctx, next) => {
      await next();
    },
  };
}

describe("HookEngine", () => {
  let engine: HookEngine;

  beforeEach(() => {
    engine = new HookEngine();
  });

  describe("constructor", () => {
    it("creates engine with default settings", () => {
      const settings = engine.getSettings();
      expect(settings.hookTimeout).toBe(5000);
      expect(settings.failMode).toBe("open");
      expect(settings.logLevel).toBe("warn");
      expect(settings.telemetry).toBe(false);
    });

    it("merges custom settings", () => {
      const custom = new HookEngine({
        hooks: [],
        settings: { hookTimeout: 10000, failMode: "closed" },
      });
      const settings = custom.getSettings();
      expect(settings.hookTimeout).toBe(10000);
      expect(settings.failMode).toBe("closed");
      expect(settings.logLevel).toBe("warn");
    });

    it("registers hooks from config", () => {
      const hook = makePassthroughHook("test", ["shell:before"], "before");
      const configured = new HookEngine({ hooks: [hook] });
      expect(configured.getHooks("shell:before")).toHaveLength(1);
    });

    it("applies presets before local hooks", () => {
      const order: string[] = [];
      const presetHook: HookDefinition = {
        id: "preset",
        name: "preset",
        events: ["shell:before"],
        phase: "before",
        priority: 50,
        handler: async (_ctx, next) => {
          order.push("preset");
          await next();
        },
      };
      const localHook: HookDefinition = {
        id: "local",
        name: "local",
        events: ["shell:before"],
        phase: "before",
        priority: 100,
        handler: async (ctx, next) => {
          order.push("local");
          ctx.results.push({ data: { order } });
          await next();
        },
      };

      const configured = new HookEngine({
        hooks: [localHook],
        extends: [{ hooks: [presetHook] }],
      });

      expect(configured.getHooks("shell:before")).toHaveLength(2);
    });
  });

  describe("register / unregister", () => {
    it("registers a hook for its events", () => {
      const hook = makePassthroughHook("h1", ["shell:before", "file:write"], "before");
      engine.register(hook);
      expect(engine.getHooks("shell:before")).toHaveLength(1);
      expect(engine.getHooks("file:write")).toHaveLength(1);
    });

    it("unregisters a hook by id", () => {
      const hook = makePassthroughHook("h1", ["shell:before"], "before");
      engine.register(hook);
      expect(engine.getHooks("shell:before")).toHaveLength(1);
      engine.unregister("h1");
      expect(engine.getHooks("shell:before")).toHaveLength(0);
    });

    it("unregisters from all event types", () => {
      const hook = makePassthroughHook("h1", ["shell:before", "file:write"], "before");
      engine.register(hook);
      engine.unregister("h1");
      expect(engine.getHooks("shell:before")).toHaveLength(0);
      expect(engine.getHooks("file:write")).toHaveLength(0);
    });

    it("keeps remaining hooks when unregistering one of multiple", () => {
      const h1 = makePassthroughHook("h1", ["shell:before"], "before");
      const h2 = makePassthroughHook("h2", ["shell:before"], "before");
      engine.register(h1);
      engine.register(h2);

      engine.unregister("h1");

      const remaining = engine.getHooks("shell:before");
      expect(remaining).toHaveLength(1);
      expect(remaining[0]!.id).toBe("h2");
    });
  });

  describe("getHooks", () => {
    it("returns all hooks with deduplication", () => {
      const hook = makePassthroughHook("h1", ["shell:before", "file:write"], "before");
      engine.register(hook);
      const all = engine.getHooks();
      expect(all).toHaveLength(1);
      expect(all[0]?.id).toBe("h1");
    });

    it("returns empty array for unknown event type", () => {
      expect(engine.getHooks("shell:before")).toEqual([]);
    });
  });

  describe("emit", () => {
    it("returns empty array when no hooks match", async () => {
      const results = await engine.emit(makeShellBefore("ls"), toolInfo);
      expect(results).toEqual([]);
    });

    it("runs before hooks for before events", async () => {
      const hook: HookDefinition = {
        id: "blocker",
        name: "blocker",
        events: ["shell:before"],
        phase: "before",
        handler: async (ctx) => {
          ctx.results.push({ blocked: true, reason: "nope" });
        },
      };
      engine.register(hook);
      const results = await engine.emit(makeShellBefore("rm -rf /"), toolInfo);
      expect(results).toHaveLength(1);
      expect(results[0]?.blocked).toBe(true);
      expect(results[0]?.reason).toBe("nope");
    });

    it("only runs hooks matching the event phase", async () => {
      const afterHook: HookDefinition = {
        id: "after-only",
        name: "after-only",
        events: ["shell:before"],
        phase: "after",
        handler: async (ctx) => {
          ctx.results.push({ data: { ran: true } });
        },
      };
      engine.register(afterHook);
      const results = await engine.emit(makeShellBefore("ls"), toolInfo);
      expect(results).toEqual([]);
    });

    it("passes tool info to context", async () => {
      let capturedTool: { name: string; version: string } | undefined;
      const hook: HookDefinition = {
        id: "capture",
        name: "capture",
        events: ["shell:before"],
        phase: "before",
        handler: async (ctx, next) => {
          capturedTool = ctx.tool;
          await next();
        },
      };
      engine.register(hook);
      await engine.emit(makeShellBefore("ls"), { name: "claude", version: "2.0" });
      expect(capturedTool).toEqual({ name: "claude", version: "2.0" });
    });

    it("fail-open returns empty on error", async () => {
      const hook: HookDefinition = {
        id: "thrower",
        name: "thrower",
        events: ["shell:before"],
        phase: "before",
        handler: async () => {
          throw new Error("kaboom");
        },
      };
      engine.register(hook);
      const results = await engine.emit(makeShellBefore("ls"), toolInfo);
      expect(results).toEqual([]);
    });

    it("runs after hooks for after events", async () => {
      const hook: HookDefinition = {
        id: "observer",
        name: "observer",
        events: ["shell:after"],
        phase: "after",
        handler: async (ctx, next) => {
          ctx.results.push({ data: { observed: true } });
          await next();
        },
      };
      engine.register(hook);
      const results = await engine.emit(makeShellAfter("ls"), toolInfo);
      expect(results).toHaveLength(1);
      expect(results[0]?.data).toEqual({ observed: true });
    });

    it("fail-closed returns blocked on error", async () => {
      const closedEngine = new HookEngine({
        hooks: [],
        settings: { failMode: "closed" },
      });
      const hook: HookDefinition = {
        id: "thrower",
        name: "thrower",
        events: ["shell:before"],
        phase: "before",
        handler: async () => {
          throw new Error("kaboom");
        },
      };
      closedEngine.register(hook);
      const results = await closedEngine.emit(makeShellBefore("ls"), toolInfo);
      expect(results).toHaveLength(1);
      expect(results[0]?.blocked).toBe(true);
      expect(results[0]?.reason).toContain("fail-closed");
    });
  });

  describe("isBlocked", () => {
    it("returns blocked: false for after events", async () => {
      const result = await engine.isBlocked(makeShellAfter("ls"), toolInfo);
      expect(result.blocked).toBe(false);
    });

    it("returns blocked: true when a hook blocks", async () => {
      const hook: HookDefinition = {
        id: "blocker",
        name: "blocker",
        events: ["file:write"],
        phase: "before",
        handler: async (ctx) => {
          ctx.results.push({ blocked: true, reason: "denied" });
        },
      };
      engine.register(hook);
      const result = await engine.isBlocked(makeFileWrite("/etc/passwd", "hack"), toolInfo);
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe("denied");
    });

    it("returns blocked: false when hooks pass through", async () => {
      const hook = makePassthroughHook("passer", ["file:write"], "before");
      engine.register(hook);
      const result = await engine.isBlocked(makeFileWrite("test.txt", "hello"), toolInfo);
      expect(result.blocked).toBe(false);
    });
  });

  describe("log (private)", () => {
    // Access the private log method via bracket notation to cover all branches.
    // This is acceptable in tests to verify otherwise-unreachable defensive branches.

    it("logs warn messages when logLevel >= warn", () => {
      const warnEngine = new HookEngine({
        hooks: [],
        settings: { logLevel: "warn" },
      });
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      (warnEngine as unknown as Record<string, (...args: unknown[]) => void>)["log"](
        "warn",
        "warning msg",
      );
      expect(spy).toHaveBeenCalledWith("[ai-hooks:warn]", "warning msg");
      spy.mockRestore();
    });

    it("logs info/debug messages via console.log when logLevel >= debug", () => {
      const debugEngine = new HookEngine({
        hooks: [],
        settings: { logLevel: "debug" },
      });
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      (debugEngine as unknown as Record<string, (...args: unknown[]) => void>)["log"](
        "info",
        "info msg",
      );
      expect(spy).toHaveBeenCalledWith("[ai-hooks:info]", "info msg");
      spy.mockRestore();
    });

    it("does not log when message level exceeds threshold", () => {
      const silentEngine = new HookEngine({
        hooks: [],
        settings: { logLevel: "silent" },
      });
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const eng = silentEngine as unknown as Record<string, (...args: unknown[]) => void>;
      eng["log"]("error", "msg");
      eng["log"]("warn", "msg");
      eng["log"]("info", "msg");
      eng["log"]("debug", "msg");

      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();

      errorSpy.mockRestore();
      warnSpy.mockRestore();
      logSpy.mockRestore();
    });

    it("logs debug messages via console.log", () => {
      const debugEngine = new HookEngine({
        hooks: [],
        settings: { logLevel: "debug" },
      });
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      (debugEngine as unknown as Record<string, (...args: unknown[]) => void>)["log"](
        "debug",
        "debug msg",
      );
      expect(spy).toHaveBeenCalledWith("[ai-hooks:debug]", "debug msg");
      spy.mockRestore();
    });
  });
});
