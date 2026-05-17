import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HookContext, HookDefinition, HookEventType } from "../index.js";

const removeFileSpy = vi.fn();
const commandExistsSpy = vi.fn<(cmd: string) => Promise<boolean>>().mockResolvedValue(false);

vi.mock("./index.js", () => {
  const registry = { register: vi.fn() };
  abstract class BaseAdapter {
    abstract readonly id: string;
    abstract readonly name: string;
    abstract readonly version: string;
    abstract readonly capabilities: unknown;
    abstract detect(): Promise<boolean>;
    abstract generate(hooks: HookDefinition[]): Promise<unknown[]>;
    abstract mapEvent(event: string): string[];
    abstract mapNativeEvent(nativeEvent: string): string[];
    async install() {}
    async uninstall() {}
    protected async commandExists(cmd: string) {
      return commandExistsSpy(cmd);
    }
    protected async removeFile(path: string) {
      removeFileSpy(path);
    }
  }
  return { BaseAdapter, registry };
});

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => false),
}));

import { existsSync } from "node:fs";
import { CodexAdapter } from "./codex.js";

function makeHandler() {
  return async (ctx: HookContext, next: () => Promise<void>) => {
    void ctx;
    await next();
  };
}

describe("CodexAdapter", () => {
  let adapter: CodexAdapter;

  const testHook: HookDefinition = {
    id: "test",
    name: "Test Hook",
    events: ["shell:before"],
    phase: "before",
    handler: makeHandler(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new CodexAdapter();
  });

  describe("metadata", () => {
    it("has correct id", () => expect(adapter.id).toBe("codex"));
    it("has correct name", () => expect(adapter.name).toBe("Codex"));
    it("has correct version", () => expect(adapter.version).toBe("1.0"));
  });

  describe("capabilities", () => {
    it("supports before hooks", () => expect(adapter.capabilities.beforeHooks).toBe(true));
    it("supports after hooks", () => expect(adapter.capabilities.afterHooks).toBe(true));
    it("supports MCP", () => expect(adapter.capabilities.mcp).toBe(true));
    it("supports config file generation", () => expect(adapter.capabilities.configFile).toBe(true));
    it("lists supported events including session:end and prompt:response", () => {
      expect(adapter.capabilities.supportedEvents).toContain("session:end");
      expect(adapter.capabilities.supportedEvents).toContain("prompt:response");
    });
    it("treats prompt submit and shell before as blockable", () => {
      expect(adapter.capabilities.blockableEvents).toContain("prompt:submit");
      expect(adapter.capabilities.blockableEvents).toContain("shell:before");
    });
  });

  describe("mapEvent", () => {
    it("maps session:start to SessionStart", () => {
      expect(adapter.mapEvent("session:start")).toEqual(["SessionStart"]);
    });

    it("maps session:end to Stop", () => {
      expect(adapter.mapEvent("session:end")).toEqual(["Stop"]);
    });

    it("maps prompt:submit to UserPromptSubmit", () => {
      expect(adapter.mapEvent("prompt:submit")).toEqual(["UserPromptSubmit"]);
    });

    it("maps prompt:response to Stop", () => {
      expect(adapter.mapEvent("prompt:response")).toEqual(["Stop"]);
    });

    it("maps tool:before to PreToolUse", () => {
      expect(adapter.mapEvent("tool:before")).toEqual(["PreToolUse"]);
    });

    it("maps tool:after to PostToolUse", () => {
      expect(adapter.mapEvent("tool:after")).toEqual(["PostToolUse"]);
    });

    it("maps shell events to tool lifecycle events", () => {
      expect(adapter.mapEvent("shell:before")).toEqual(["PreToolUse"]);
      expect(adapter.mapEvent("shell:after")).toEqual(["PostToolUse"]);
    });

    it("returns empty array for notification", () => {
      expect(adapter.mapEvent("notification" as HookEventType)).toEqual([]);
    });
  });

  describe("mapNativeEvent", () => {
    it("maps SessionStart", () => {
      expect(adapter.mapNativeEvent("SessionStart")).toEqual(["session:start"]);
    });

    it("maps PreToolUse to before events", () => {
      expect(adapter.mapNativeEvent("PreToolUse")).toEqual([
        "tool:before",
        "file:read",
        "file:write",
        "file:edit",
        "file:delete",
        "shell:before",
        "mcp:before",
      ]);
    });

    it("maps PostToolUse to after events", () => {
      expect(adapter.mapNativeEvent("PostToolUse")).toEqual([
        "tool:after",
        "shell:after",
        "mcp:after",
      ]);
    });

    it("maps Stop to session:end and prompt:response", () => {
      expect(adapter.mapNativeEvent("Stop")).toEqual(["session:end", "prompt:response"]);
    });
  });

  describe("generate", () => {
    it("generates a runner script and hooks config", async () => {
      const files = await adapter.generate([testHook]);
      expect(files).toHaveLength(2);
      expect(files[0]?.path).toBe(".codex/hooks/ai-hooks-runner.js");
      expect(files[1]?.path).toBe(".codex/hooks.json");
    });

    it("emits PreToolUse for shell:before hooks", async () => {
      const files = await adapter.generate([testHook]);
      const config = JSON.parse(files[1]!.content);
      expect(config.hooks.PreToolUse).toBeDefined();
    });

    it("deduplicates native events shared by multiple universal events", async () => {
      const files = await adapter.generate([
        testHook,
        { ...testHook, id: "mcp", events: ["mcp:before"] },
      ]);
      const config = JSON.parse(files[1]!.content);
      expect(config.hooks.PreToolUse).toHaveLength(1);
    });

    it("runner script includes Codex-specific markers", async () => {
      const files = await adapter.generate([testHook]);
      const runner = files[0]!.content;
      expect(runner).toContain("ai-hooks runner for Codex");
      expect(runner).toContain('const toolInfo = { name: "codex", version: "1.0" }');
      expect(runner).toContain("hookEventName === \"PreToolUse\"");
      expect(runner).toContain("process.exit(2)");
    });
  });

  describe("detect", () => {
    it("returns true when command exists", async () => {
      commandExistsSpy.mockResolvedValueOnce(true);
      expect(await adapter.detect()).toBe(true);
    });

    it("returns true when .codex directory exists", async () => {
      vi.mocked(existsSync).mockReturnValueOnce(true);
      expect(await adapter.detect()).toBe(true);
    });

    it("returns false when command and directory are missing", async () => {
      commandExistsSpy.mockResolvedValueOnce(false);
      vi.mocked(existsSync).mockReturnValueOnce(false);
      expect(await adapter.detect()).toBe(false);
    });
  });

  describe("uninstall", () => {
    it("removes generated Codex hook files", async () => {
      await adapter.uninstall();
      expect(removeFileSpy).toHaveBeenCalledWith(".codex/hooks/ai-hooks-runner.js");
      expect(removeFileSpy).toHaveBeenCalledWith(".codex/hooks.json");
    });
  });
});
