import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HookContext, HookDefinition, HookEventType } from "../index.js";

// Track removeFile calls from instances
const removeFileSpy = vi.fn();
const commandExistsSpy = vi.fn<(cmd: string) => Promise<boolean>>().mockResolvedValue(false);

// We need to mock the registry to prevent side effects during import
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

// Mock fs modules to avoid real filesystem access
vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => false),
}));

import { existsSync } from "node:fs";
import { ClineAdapter } from "./cline.js";

function makeHandler() {
  return async (ctx: HookContext, next: () => Promise<void>) => {
    void ctx;
    await next();
  };
}

describe("ClineAdapter", () => {
  let adapter: ClineAdapter;

  const testHook: HookDefinition = {
    id: "test",
    name: "Test Hook",
    events: ["shell:before"],
    phase: "before",
    handler: makeHandler(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new ClineAdapter();
  });

  // ── Metadata / Capabilities ────────────────────────────────

  describe("metadata", () => {
    it("has correct id", () => {
      expect(adapter.id).toBe("cline");
    });

    it("has correct name", () => {
      expect(adapter.name).toBe("Cline");
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
        "tool:before",
        "tool:after",
        "file:read",
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
        "file:read",
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
    it("maps session:start to TaskStart", () => {
      expect(adapter.mapEvent("session:start")).toEqual(["TaskStart"]);
    });

    it("maps session:end to TaskCancel", () => {
      expect(adapter.mapEvent("session:end")).toEqual(["TaskCancel"]);
    });

    it("maps prompt:submit to UserPromptSubmit", () => {
      expect(adapter.mapEvent("prompt:submit")).toEqual(["UserPromptSubmit"]);
    });

    it("maps prompt:response to empty array (unsupported)", () => {
      expect(adapter.mapEvent("prompt:response")).toEqual([]);
    });

    it("maps tool:before to PreToolUse", () => {
      expect(adapter.mapEvent("tool:before")).toEqual(["PreToolUse"]);
    });

    it("maps tool:after to PostToolUse", () => {
      expect(adapter.mapEvent("tool:after")).toEqual(["PostToolUse"]);
    });

    it("maps file:read to PreToolUse", () => {
      expect(adapter.mapEvent("file:read")).toEqual(["PreToolUse"]);
    });

    it("maps file:write to PreToolUse", () => {
      expect(adapter.mapEvent("file:write")).toEqual(["PreToolUse"]);
    });

    it("maps file:edit to PreToolUse", () => {
      expect(adapter.mapEvent("file:edit")).toEqual(["PreToolUse"]);
    });

    it("maps file:delete to PreToolUse", () => {
      expect(adapter.mapEvent("file:delete")).toEqual(["PreToolUse"]);
    });

    it("maps shell:before to PreToolUse", () => {
      expect(adapter.mapEvent("shell:before")).toEqual(["PreToolUse"]);
    });

    it("maps shell:after to PostToolUse", () => {
      expect(adapter.mapEvent("shell:after")).toEqual(["PostToolUse"]);
    });

    it("maps mcp:before to PreToolUse", () => {
      expect(adapter.mapEvent("mcp:before")).toEqual(["PreToolUse"]);
    });

    it("maps mcp:after to PostToolUse", () => {
      expect(adapter.mapEvent("mcp:after")).toEqual(["PostToolUse"]);
    });

    it("maps notification to empty array (unsupported)", () => {
      expect(adapter.mapEvent("notification")).toEqual([]);
    });

    it("returns empty array for unknown event", () => {
      expect(adapter.mapEvent("unknown:event" as HookEventType)).toEqual([]);
    });
  });

  // ── mapNativeEvent ─────────────────────────────────────────

  describe("mapNativeEvent", () => {
    it("maps TaskStart to session:start", () => {
      expect(adapter.mapNativeEvent("TaskStart")).toEqual(["session:start"]);
    });

    it("maps TaskResume to session:start", () => {
      expect(adapter.mapNativeEvent("TaskResume")).toEqual(["session:start"]);
    });

    it("maps TaskCancel to session:end", () => {
      expect(adapter.mapNativeEvent("TaskCancel")).toEqual(["session:end"]);
    });

    it("maps UserPromptSubmit to prompt:submit", () => {
      expect(adapter.mapNativeEvent("UserPromptSubmit")).toEqual(["prompt:submit"]);
    });

    it("maps PreToolUse to multiple universal events", () => {
      const result = adapter.mapNativeEvent("PreToolUse");
      expect(result).toEqual([
        "tool:before",
        "file:read",
        "file:write",
        "file:edit",
        "file:delete",
        "shell:before",
        "mcp:before",
      ]);
    });

    it("maps PostToolUse to multiple universal events", () => {
      const result = adapter.mapNativeEvent("PostToolUse");
      expect(result).toEqual(["tool:after", "shell:after", "mcp:after"]);
    });

    it("maps PreCompact to empty array", () => {
      expect(adapter.mapNativeEvent("PreCompact")).toEqual([]);
    });

    it("returns empty array for unknown native event", () => {
      expect(adapter.mapNativeEvent("UnknownNativeEvent")).toEqual([]);
    });

    it("returns empty array for empty string", () => {
      expect(adapter.mapNativeEvent("")).toEqual([]);
    });
  });

  // ── generate ───────────────────────────────────────────────

  describe("generate", () => {
    it("generates one hook script for shell:before (maps to PreToolUse)", async () => {
      const configs = await adapter.generate([testHook]);
      expect(configs).toHaveLength(1);
      expect(configs[0]!.path).toBe(".clinerules/hooks/PreToolUse");
    });

    it("hook script has js format", async () => {
      const configs = await adapter.generate([testHook]);
      expect(configs[0]!.format).toBe("js");
    });

    it("hook script contains shebang", async () => {
      const configs = await adapter.generate([testHook]);
      expect(configs[0]!.content).toContain("#!/usr/bin/env node");
    });

    it("hook script imports from ai-hooks", async () => {
      const configs = await adapter.generate([testHook]);
      expect(configs[0]!.content).toContain(
        'import { loadConfig, HookEngine } from "@premierstudio/ai-hooks"',
      );
    });

    it("hook script reads STDIN for input", async () => {
      const configs = await adapter.generate([testHook]);
      expect(configs[0]!.content).toContain("readStdin");
      expect(configs[0]!.content).toContain("process.stdin");
    });

    it("hook script handles blocking with cancel: true JSON output", async () => {
      const configs = await adapter.generate([testHook]);
      expect(configs[0]!.content).toContain("cancel: true");
      expect(configs[0]!.content).toContain("errorMessage");
    });

    it("hook script outputs cancel: false on success", async () => {
      const configs = await adapter.generate([testHook]);
      expect(configs[0]!.content).toContain("cancel: false");
    });

    it("hook script contains DO NOT EDIT warning", async () => {
      const configs = await adapter.generate([testHook]);
      expect(configs[0]!.content).toContain("DO NOT EDIT");
    });

    it("hook script handles Cline tool names (write_to_file, replace_in_file, etc.)", async () => {
      const configs = await adapter.generate([testHook]);
      const content = configs[0]!.content;
      expect(content).toContain('"write_to_file"');
      expect(content).toContain('"replace_in_file"');
      expect(content).toContain('"read_file"');
      expect(content).toContain('"execute_command"');
      expect(content).toContain('"use_mcp_tool"');
    });

    it("maps multiple hook events to correct native scripts", async () => {
      const multiHook: HookDefinition = {
        id: "multi",
        name: "Multi Hook",
        events: ["session:start", "tool:after", "prompt:submit"],
        phase: "after",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([multiHook]);
      const paths = configs.map((c) => c.path);
      expect(paths).toContain(".clinerules/hooks/TaskStart");
      expect(paths).toContain(".clinerules/hooks/PostToolUse");
      expect(paths).toContain(".clinerules/hooks/UserPromptSubmit");
    });

    it("deduplicates native events from multiple hooks mapping to same native event", async () => {
      const hooks: HookDefinition[] = [
        {
          id: "hook1",
          name: "Hook 1",
          events: ["tool:before"],
          phase: "before",
          handler: makeHandler(),
        },
        {
          id: "hook2",
          name: "Hook 2",
          events: ["file:write"],
          phase: "before",
          handler: makeHandler(),
        },
      ];
      const configs = await adapter.generate(hooks);
      // Both map to PreToolUse, should only have one script
      const preToolUseScripts = configs.filter((c) => c.path.includes("PreToolUse"));
      expect(preToolUseScripts).toHaveLength(1);
    });

    it("returns empty config for hooks with no native event mappings", async () => {
      const unmappedHook: HookDefinition = {
        id: "unmapped",
        name: "Unmapped Hook",
        events: ["prompt:response"],
        phase: "after",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([unmappedHook]);
      expect(configs).toHaveLength(0);
    });

    it("generates config for empty hooks array", async () => {
      const configs = await adapter.generate([]);
      expect(configs).toHaveLength(0);
    });

    it("generates separate scripts for different native events", async () => {
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
          events: ["session:start"],
          phase: "before",
          handler: makeHandler(),
        },
      ];
      const configs = await adapter.generate(hooks);
      expect(configs).toHaveLength(2);
      const paths = configs.map((c) => c.path);
      expect(paths).toContain(".clinerules/hooks/PreToolUse");
      expect(paths).toContain(".clinerules/hooks/TaskStart");
    });

    it("script for PreToolUse contains the event name", async () => {
      const configs = await adapter.generate([testHook]);
      const script = configs.find((c) => c.path.includes("PreToolUse"));
      expect(script!.content).toContain("PreToolUse");
    });
  });

  // ── detect ──────────────────────────────────────────────────

  describe("detect", () => {
    it("returns false when neither command nor directory exists", async () => {
      commandExistsSpy.mockResolvedValue(false);
      vi.mocked(existsSync).mockReturnValue(false);
      const result = await adapter.detect();
      expect(result).toBe(false);
    });

    it("returns true when cline command exists", async () => {
      commandExistsSpy.mockResolvedValue(true);
      vi.mocked(existsSync).mockReturnValue(false);
      const result = await adapter.detect();
      expect(result).toBe(true);
    });

    it("returns true when .clinerules directory exists", async () => {
      commandExistsSpy.mockResolvedValue(false);
      vi.mocked(existsSync).mockReturnValue(true);
      const result = await adapter.detect();
      expect(result).toBe(true);
    });

    it("returns true when both command and directory exist", async () => {
      commandExistsSpy.mockResolvedValue(true);
      vi.mocked(existsSync).mockReturnValue(true);
      const result = await adapter.detect();
      expect(result).toBe(true);
    });
  });

  // ── uninstall ───────────────────────────────────────────────

  describe("uninstall", () => {
    it("removes all hook scripts", async () => {
      await adapter.uninstall();
      expect(removeFileSpy).toHaveBeenCalledWith(".clinerules/hooks/PreToolUse");
      expect(removeFileSpy).toHaveBeenCalledWith(".clinerules/hooks/PostToolUse");
      expect(removeFileSpy).toHaveBeenCalledWith(".clinerules/hooks/UserPromptSubmit");
      expect(removeFileSpy).toHaveBeenCalledWith(".clinerules/hooks/TaskStart");
      expect(removeFileSpy).toHaveBeenCalledWith(".clinerules/hooks/TaskResume");
      expect(removeFileSpy).toHaveBeenCalledWith(".clinerules/hooks/TaskCancel");
      expect(removeFileSpy).toHaveBeenCalledWith(".clinerules/hooks/PreCompact");
    });

    it("calls removeFile for all 7 hook types", async () => {
      await adapter.uninstall();
      expect(removeFileSpy).toHaveBeenCalledTimes(7);
    });
  });
});
