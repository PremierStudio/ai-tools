import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HookContext, HookDefinition, HookEventType } from "../index.js";

// Track removeFile calls from instances
const removeFileSpy = vi.fn();
const commandExistsSpy = vi.fn<(cmd: string) => Promise<boolean>>().mockResolvedValue(false);

// Mock the registry to prevent side effects during import
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

  // ── Metadata / Capabilities ────────────────────────────────

  describe("metadata", () => {
    it("has correct id", () => {
      expect(adapter.id).toBe("codex");
    });

    it("has correct name", () => {
      expect(adapter.name).toBe("Codex CLI");
    });

    it("has correct version", () => {
      expect(adapter.version).toBe("1.0");
    });
  });

  describe("capabilities", () => {
    it("supports before hooks", () => {
      expect(adapter.capabilities.beforeHooks).toBe(true);
    });

    it("supports after hooks", () => {
      expect(adapter.capabilities.afterHooks).toBe(true);
    });

    it("supports MCP", () => {
      expect(adapter.capabilities.mcp).toBe(true);
    });

    it("supports config file generation", () => {
      expect(adapter.capabilities.configFile).toBe(true);
    });

    it("lists all supported events", () => {
      const expected: HookEventType[] = [
        "session:start",
        "session:end",
        "prompt:submit",
        "prompt:response",
        "tool:before",
        "tool:after",
        "file:write",
        "file:edit",
        "file:delete",
        "shell:before",
        "shell:after",
        "mcp:before",
        "mcp:after",
      ];
      expect(adapter.capabilities.supportedEvents).toEqual(expected);
    });

    it("lists all blockable events", () => {
      const expected: HookEventType[] = [
        "tool:before",
        "file:write",
        "file:edit",
        "file:delete",
        "shell:before",
        "mcp:before",
      ];
      expect(adapter.capabilities.blockableEvents).toEqual(expected);
    });

    it("blockable events are a subset of supported events", () => {
      for (const event of adapter.capabilities.blockableEvents) {
        expect(adapter.capabilities.supportedEvents).toContain(event);
      }
    });
  });

  // ── mapEvent ───────────────────────────────────────────────

  describe("mapEvent", () => {
    it("maps session:start to session_start", () => {
      expect(adapter.mapEvent("session:start")).toEqual(["session_start"]);
    });

    it("maps session:end to session_end", () => {
      expect(adapter.mapEvent("session:end")).toEqual(["session_end"]);
    });

    it("maps prompt:submit to user_message", () => {
      expect(adapter.mapEvent("prompt:submit")).toEqual(["user_message"]);
    });

    it("maps prompt:response to assistant_message", () => {
      expect(adapter.mapEvent("prompt:response")).toEqual(["assistant_message"]);
    });

    it("maps tool:before to before_tool_call", () => {
      expect(adapter.mapEvent("tool:before")).toEqual(["before_tool_call"]);
    });

    it("maps tool:after to after_tool_call", () => {
      expect(adapter.mapEvent("tool:after")).toEqual(["after_tool_call"]);
    });

    it("maps file:write to before_file_write", () => {
      expect(adapter.mapEvent("file:write")).toEqual(["before_file_write"]);
    });

    it("maps file:edit to before_file_edit", () => {
      expect(adapter.mapEvent("file:edit")).toEqual(["before_file_edit"]);
    });

    it("maps file:delete to before_file_delete", () => {
      expect(adapter.mapEvent("file:delete")).toEqual(["before_file_delete"]);
    });

    it("maps shell:before to before_shell", () => {
      expect(adapter.mapEvent("shell:before")).toEqual(["before_shell"]);
    });

    it("maps shell:after to after_shell", () => {
      expect(adapter.mapEvent("shell:after")).toEqual(["after_shell"]);
    });

    it("maps mcp:before to before_mcp_call", () => {
      expect(adapter.mapEvent("mcp:before")).toEqual(["before_mcp_call"]);
    });

    it("maps mcp:after to after_mcp_call", () => {
      expect(adapter.mapEvent("mcp:after")).toEqual(["after_mcp_call"]);
    });

    it("returns empty array for unknown event", () => {
      expect(adapter.mapEvent("unknown:event" as HookEventType)).toEqual([]);
    });

    it("returns empty array for file:read (not in Codex event map)", () => {
      expect(adapter.mapEvent("file:read")).toEqual([]);
    });

    it("returns empty array for notification (not in Codex event map)", () => {
      expect(adapter.mapEvent("notification")).toEqual([]);
    });
  });

  // ── mapNativeEvent ─────────────────────────────────────────

  describe("mapNativeEvent", () => {
    it("maps session_start to session:start", () => {
      expect(adapter.mapNativeEvent("session_start")).toEqual(["session:start"]);
    });

    it("maps session_end to session:end", () => {
      expect(adapter.mapNativeEvent("session_end")).toEqual(["session:end"]);
    });

    it("maps user_message to prompt:submit", () => {
      expect(adapter.mapNativeEvent("user_message")).toEqual(["prompt:submit"]);
    });

    it("maps assistant_message to prompt:response", () => {
      expect(adapter.mapNativeEvent("assistant_message")).toEqual(["prompt:response"]);
    });

    it("maps before_tool_call to tool:before", () => {
      expect(adapter.mapNativeEvent("before_tool_call")).toEqual(["tool:before"]);
    });

    it("maps after_tool_call to tool:after", () => {
      expect(adapter.mapNativeEvent("after_tool_call")).toEqual(["tool:after"]);
    });

    it("maps before_file_write to file:write", () => {
      expect(adapter.mapNativeEvent("before_file_write")).toEqual(["file:write"]);
    });

    it("maps before_file_edit to file:edit", () => {
      expect(adapter.mapNativeEvent("before_file_edit")).toEqual(["file:edit"]);
    });

    it("maps before_file_delete to file:delete", () => {
      expect(adapter.mapNativeEvent("before_file_delete")).toEqual(["file:delete"]);
    });

    it("maps before_shell to shell:before", () => {
      expect(adapter.mapNativeEvent("before_shell")).toEqual(["shell:before"]);
    });

    it("maps after_shell to shell:after", () => {
      expect(adapter.mapNativeEvent("after_shell")).toEqual(["shell:after"]);
    });

    it("maps before_mcp_call to mcp:before", () => {
      expect(adapter.mapNativeEvent("before_mcp_call")).toEqual(["mcp:before"]);
    });

    it("maps after_mcp_call to mcp:after", () => {
      expect(adapter.mapNativeEvent("after_mcp_call")).toEqual(["mcp:after"]);
    });

    it("returns empty array for unknown native event", () => {
      expect(adapter.mapNativeEvent("unknown_event")).toEqual([]);
    });

    it("returns empty array for empty string", () => {
      expect(adapter.mapNativeEvent("")).toEqual([]);
    });
  });

  // ── generate ───────────────────────────────────────────────

  describe("generate", () => {
    it("returns two config files (runner + codex.json)", async () => {
      const configs = await adapter.generate([testHook]);
      expect(configs).toHaveLength(2);
    });

    it("generates runner script at correct path", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner).toBeDefined();
      expect(runner!.path).toBe(".codex/hooks/ai-hooks-runner.js");
    });

    it("runner script has correct format", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.format).toBe("js");
    });

    it("runner script contains shebang", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain("#!/usr/bin/env node");
    });

    it("runner script imports from ai-hooks", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain(
        'import { loadConfig, HookEngine } from "@premierstudio/ai-hooks"',
      );
    });

    it("runner script reads CODEX_HOOK_EVENT env var", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain("process.env.CODEX_HOOK_EVENT");
    });

    it("runner script reads CODEX_TOOL_INPUT env var", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain("process.env.CODEX_TOOL_INPUT");
    });

    it("runner script handles before_shell event", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain('"before_shell"');
    });

    it("runner script handles before_file_write event", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain('"before_file_write"');
    });

    it("runner script handles before_file_edit event", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain('"before_file_edit"');
    });

    it("runner script handles blocking with JSON output", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain("blocked");
      expect(runner!.content).toContain("reason");
    });

    it("generates codex.json at correct path", async () => {
      const configs = await adapter.generate([testHook]);
      const codexJson = configs.find((c) => c.path === "codex.json");
      expect(codexJson).toBeDefined();
    });

    it("codex.json has correct format", async () => {
      const configs = await adapter.generate([testHook]);
      const codexJson = configs.find((c) => c.path === "codex.json");
      expect(codexJson!.format).toBe("json");
    });

    it("codex.json contains valid JSON", async () => {
      const configs = await adapter.generate([testHook]);
      const codexJson = configs.find((c) => c.path === "codex.json");
      const parsed = JSON.parse(codexJson!.content) as Record<string, unknown>;
      expect(parsed).toBeDefined();
      expect(parsed.hooks).toBeDefined();
    });

    it("codex.json maps shell:before to before_shell hook entry", async () => {
      const configs = await adapter.generate([testHook]);
      const codexJson = configs.find((c) => c.path === "codex.json");
      const parsed = JSON.parse(codexJson!.content) as {
        hooks: Record<string, { command: string; timeout: number } | undefined>;
      };
      const beforeShell = parsed.hooks.before_shell;
      expect(beforeShell).toBeDefined();
      expect(beforeShell!.command).toContain("ai-hooks-runner.js");
      expect(beforeShell!.timeout).toBe(10);
    });

    it("maps multiple hook events to correct native entries", async () => {
      const multiHook: HookDefinition = {
        id: "multi",
        name: "Multi Hook",
        events: ["session:start", "tool:after", "mcp:before"],
        phase: "after",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([multiHook]);
      const codexJson = configs.find((c) => c.path === "codex.json");
      const parsed = JSON.parse(codexJson!.content) as {
        hooks: Record<string, unknown>;
      };
      expect(parsed.hooks.session_start).toBeDefined();
      expect(parsed.hooks.after_tool_call).toBeDefined();
      expect(parsed.hooks.before_mcp_call).toBeDefined();
    });

    it("generates entries for all events in a hook with multiple events", async () => {
      const hook: HookDefinition = {
        id: "all-files",
        name: "All File Events",
        events: ["file:write", "file:edit", "file:delete"],
        phase: "before",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([hook]);
      const codexJson = configs.find((c) => c.path === "codex.json");
      const parsed = JSON.parse(codexJson!.content) as {
        hooks: Record<string, unknown>;
      };
      expect(parsed.hooks.before_file_write).toBeDefined();
      expect(parsed.hooks.before_file_edit).toBeDefined();
      expect(parsed.hooks.before_file_delete).toBeDefined();
    });

    it("generates empty hooks for hooks with no native event mappings", async () => {
      const unmappedHook: HookDefinition = {
        id: "unmapped",
        name: "Unmapped Hook",
        events: ["file:read"],
        phase: "before",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([unmappedHook]);
      const codexJson = configs.find((c) => c.path === "codex.json");
      const parsed = JSON.parse(codexJson!.content) as {
        hooks: Record<string, unknown>;
      };
      expect(Object.keys(parsed.hooks)).toHaveLength(0);
    });

    it("generates config for empty hooks array", async () => {
      const configs = await adapter.generate([]);
      expect(configs).toHaveLength(2);
      const codexJson = configs.find((c) => c.path === "codex.json");
      const parsed = JSON.parse(codexJson!.content) as {
        hooks: Record<string, unknown>;
      };
      expect(Object.keys(parsed.hooks)).toHaveLength(0);
    });

    it("last hook entry wins when multiple hooks map to same native event", async () => {
      const hooks: HookDefinition[] = [
        {
          id: "hook1",
          name: "Hook 1",
          events: ["shell:before"],
          phase: "before",
          handler: makeHandler(),
        },
        {
          id: "hook2",
          name: "Hook 2",
          events: ["shell:before"],
          phase: "before",
          handler: makeHandler(),
        },
      ];
      const configs = await adapter.generate(hooks);
      const codexJson = configs.find((c) => c.path === "codex.json");
      const parsed = JSON.parse(codexJson!.content) as {
        hooks: Record<string, { command: string } | undefined>;
      };
      // The last iteration overwrites, so there should be exactly one entry
      const beforeShell = parsed.hooks.before_shell;
      expect(beforeShell).toBeDefined();
      expect(beforeShell!.command).toContain("ai-hooks-runner.js");
    });
  });

  // ── detect ──────────────────────────────────────────────────

  describe("detect", () => {
    it("returns false when neither command nor config exists", async () => {
      commandExistsSpy.mockResolvedValue(false);
      vi.mocked(existsSync).mockReturnValue(false);
      const result = await adapter.detect();
      expect(result).toBe(false);
    });

    it("returns true when codex command exists", async () => {
      commandExistsSpy.mockResolvedValue(true);
      vi.mocked(existsSync).mockReturnValue(false);
      const result = await adapter.detect();
      expect(result).toBe(true);
    });

    it("returns true when codex.json exists", async () => {
      commandExistsSpy.mockResolvedValue(false);
      vi.mocked(existsSync).mockImplementation((p) => {
        return String(p).endsWith("codex.json");
      });
      const result = await adapter.detect();
      expect(result).toBe(true);
    });

    it("returns true when .codex directory exists", async () => {
      commandExistsSpy.mockResolvedValue(false);
      vi.mocked(existsSync).mockImplementation((p) => {
        return String(p).endsWith(".codex");
      });
      const result = await adapter.detect();
      expect(result).toBe(true);
    });

    it("returns true when both command and config exist", async () => {
      commandExistsSpy.mockResolvedValue(true);
      vi.mocked(existsSync).mockReturnValue(true);
      const result = await adapter.detect();
      expect(result).toBe(true);
    });
  });

  // ── uninstall ───────────────────────────────────────────────

  describe("uninstall", () => {
    it("removes the runner script", async () => {
      await adapter.uninstall();
      expect(removeFileSpy).toHaveBeenCalledWith(".codex/hooks/ai-hooks-runner.js");
    });

    it("calls removeFile exactly once", async () => {
      await adapter.uninstall();
      expect(removeFileSpy).toHaveBeenCalledTimes(1);
    });
  });
});
