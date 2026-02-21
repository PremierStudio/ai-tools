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
import { GeminiCliAdapter } from "./gemini-cli.js";

function makeHandler() {
  return async (ctx: HookContext, next: () => Promise<void>) => {
    void ctx;
    await next();
  };
}

describe("GeminiCliAdapter", () => {
  let adapter: GeminiCliAdapter;

  const testHook: HookDefinition = {
    id: "test",
    name: "Test Hook",
    events: ["shell:before"],
    phase: "before",
    handler: makeHandler(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new GeminiCliAdapter();
  });

  // ── Metadata / Capabilities ────────────────────────────────

  describe("metadata", () => {
    it("has correct id", () => {
      expect(adapter.id).toBe("gemini-cli");
    });

    it("has correct name", () => {
      expect(adapter.name).toBe("Gemini CLI");
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
        "prompt:submit",
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
    it("maps session:start to SessionStart", () => {
      expect(adapter.mapEvent("session:start")).toEqual(["SessionStart"]);
    });

    it("maps session:end to SessionEnd", () => {
      expect(adapter.mapEvent("session:end")).toEqual(["SessionEnd"]);
    });

    it("maps prompt:submit to BeforePrompt", () => {
      expect(adapter.mapEvent("prompt:submit")).toEqual(["BeforePrompt"]);
    });

    it("maps prompt:response to AfterResponse", () => {
      expect(adapter.mapEvent("prompt:response")).toEqual(["AfterResponse"]);
    });

    it("maps tool:before to BeforeTool", () => {
      expect(adapter.mapEvent("tool:before")).toEqual(["BeforeTool"]);
    });

    it("maps tool:after to AfterTool", () => {
      expect(adapter.mapEvent("tool:after")).toEqual(["AfterTool"]);
    });

    it("maps file:write to BeforeTool", () => {
      expect(adapter.mapEvent("file:write")).toEqual(["BeforeTool"]);
    });

    it("maps file:edit to BeforeTool", () => {
      expect(adapter.mapEvent("file:edit")).toEqual(["BeforeTool"]);
    });

    it("maps file:delete to BeforeTool", () => {
      expect(adapter.mapEvent("file:delete")).toEqual(["BeforeTool"]);
    });

    it("maps shell:before to BeforeShell", () => {
      expect(adapter.mapEvent("shell:before")).toEqual(["BeforeShell"]);
    });

    it("maps shell:after to AfterShell", () => {
      expect(adapter.mapEvent("shell:after")).toEqual(["AfterShell"]);
    });

    it("maps mcp:before to BeforeTool", () => {
      expect(adapter.mapEvent("mcp:before")).toEqual(["BeforeTool"]);
    });

    it("maps mcp:after to AfterTool", () => {
      expect(adapter.mapEvent("mcp:after")).toEqual(["AfterTool"]);
    });

    it("returns empty array for unknown event", () => {
      expect(adapter.mapEvent("unknown:event" as HookEventType)).toEqual([]);
    });

    it("returns empty array for file:read (not in Gemini event map)", () => {
      expect(adapter.mapEvent("file:read")).toEqual([]);
    });

    it("returns empty array for notification (not in Gemini event map)", () => {
      expect(adapter.mapEvent("notification")).toEqual([]);
    });
  });

  // ── mapNativeEvent ─────────────────────────────────────────

  describe("mapNativeEvent", () => {
    it("maps SessionStart to session:start", () => {
      expect(adapter.mapNativeEvent("SessionStart")).toEqual(["session:start"]);
    });

    it("maps SessionEnd to session:end", () => {
      expect(adapter.mapNativeEvent("SessionEnd")).toEqual(["session:end"]);
    });

    it("maps BeforePrompt to prompt:submit", () => {
      expect(adapter.mapNativeEvent("BeforePrompt")).toEqual(["prompt:submit"]);
    });

    it("maps AfterResponse to prompt:response", () => {
      expect(adapter.mapNativeEvent("AfterResponse")).toEqual(["prompt:response"]);
    });

    it("maps BeforeTool to multiple universal events", () => {
      const result = adapter.mapNativeEvent("BeforeTool");
      expect(result).toEqual([
        "tool:before",
        "file:write",
        "file:edit",
        "file:delete",
        "mcp:before",
      ]);
    });

    it("maps AfterTool to multiple universal events", () => {
      const result = adapter.mapNativeEvent("AfterTool");
      expect(result).toEqual(["tool:after", "mcp:after"]);
    });

    it("maps BeforeShell to shell:before", () => {
      expect(adapter.mapNativeEvent("BeforeShell")).toEqual(["shell:before"]);
    });

    it("maps AfterShell to shell:after", () => {
      expect(adapter.mapNativeEvent("AfterShell")).toEqual(["shell:after"]);
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
    it("generates event script(s) plus settings.json", async () => {
      const configs = await adapter.generate([testHook]);
      // shell:before maps to BeforeShell, so 1 event script + 1 settings.json
      expect(configs).toHaveLength(2);
    });

    it("generates event script at correct path for BeforeShell", async () => {
      const configs = await adapter.generate([testHook]);
      const eventScript = configs.find((c) => c.path.includes("BeforeShell"));
      expect(eventScript).toBeDefined();
      expect(eventScript!.path).toBe(".gemini/hooks/BeforeShell.js");
    });

    it("event script has correct format", async () => {
      const configs = await adapter.generate([testHook]);
      const eventScript = configs.find((c) => c.path.includes("BeforeShell"));
      expect(eventScript!.format).toBe("js");
    });

    it("event script contains shebang", async () => {
      const configs = await adapter.generate([testHook]);
      const eventScript = configs.find((c) => c.path.includes("BeforeShell"));
      expect(eventScript!.content).toContain("#!/usr/bin/env node");
    });

    it("event script imports from ai-hooks", async () => {
      const configs = await adapter.generate([testHook]);
      const eventScript = configs.find((c) => c.path.includes("BeforeShell"));
      expect(eventScript!.content).toContain(
        'import { loadConfig, HookEngine } from "@premierstudio/ai-hooks"',
      );
    });

    it("event script reads GEMINI_HOOK_INPUT env var", async () => {
      const configs = await adapter.generate([testHook]);
      const eventScript = configs.find((c) => c.path.includes("BeforeShell"));
      expect(eventScript!.content).toContain("process.env.GEMINI_HOOK_INPUT");
    });

    it("event script contains the native event name in the switch", async () => {
      const configs = await adapter.generate([testHook]);
      const eventScript = configs.find((c) => c.path.includes("BeforeShell"));
      expect(eventScript!.content).toContain('"BeforeShell"');
    });

    it("event script handles SessionStart case", async () => {
      const sessionHook: HookDefinition = {
        id: "session",
        name: "Session Hook",
        events: ["session:start"],
        phase: "before",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([sessionHook]);
      const eventScript = configs.find((c) => c.path.includes("SessionStart"));
      expect(eventScript).toBeDefined();
      expect(eventScript!.content).toContain('"SessionStart"');
      expect(eventScript!.content).toContain("session:start");
    });

    it("event script handles BeforeTool case", async () => {
      const toolHook: HookDefinition = {
        id: "tool",
        name: "Tool Hook",
        events: ["tool:before"],
        phase: "before",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([toolHook]);
      const eventScript = configs.find((c) => c.path.includes("BeforeTool"));
      expect(eventScript).toBeDefined();
      expect(eventScript!.content).toContain('"BeforeTool"');
      expect(eventScript!.content).toContain("tool:before");
    });

    it("event script handles BeforePrompt case", async () => {
      const promptHook: HookDefinition = {
        id: "prompt",
        name: "Prompt Hook",
        events: ["prompt:submit"],
        phase: "before",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([promptHook]);
      const eventScript = configs.find((c) => c.path.includes("BeforePrompt"));
      expect(eventScript).toBeDefined();
      expect(eventScript!.content).toContain('"BeforePrompt"');
      expect(eventScript!.content).toContain("prompt:submit");
    });

    it("event script handles blocking with JSON output", async () => {
      const configs = await adapter.generate([testHook]);
      const eventScript = configs.find((c) => c.path.includes("BeforeShell"));
      expect(eventScript!.content).toContain("blocked");
      expect(eventScript!.content).toContain("reason");
    });

    it("event script contains generation comment", async () => {
      const configs = await adapter.generate([testHook]);
      const eventScript = configs.find((c) => c.path.includes("BeforeShell"));
      expect(eventScript!.content).toContain("Generated by: ai-hooks generate");
    });

    it("generates settings.json at correct path", async () => {
      const configs = await adapter.generate([testHook]);
      const settings = configs.find((c) => c.path.includes("settings"));
      expect(settings).toBeDefined();
      expect(settings!.path).toBe(".gemini/settings.json");
    });

    it("settings has correct format", async () => {
      const configs = await adapter.generate([testHook]);
      const settings = configs.find((c) => c.path.includes("settings"));
      expect(settings!.format).toBe("json");
    });

    it("settings contains valid JSON with hooks enabled", async () => {
      const configs = await adapter.generate([testHook]);
      const settings = configs.find((c) => c.path.includes("settings"));
      const parsed = JSON.parse(settings!.content) as {
        hooks: { enabled: boolean; directory: string };
      };
      expect(parsed.hooks.enabled).toBe(true);
      expect(parsed.hooks.directory).toBe(".gemini/hooks");
    });

    it("generates multiple event scripts for multiple events", async () => {
      const multiHook: HookDefinition = {
        id: "multi",
        name: "Multi Hook",
        events: ["session:start", "shell:before", "tool:after"],
        phase: "after",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([multiHook]);
      // SessionStart, BeforeShell, AfterTool scripts + settings.json = 4
      const scriptConfigs = configs.filter((c) => c.format === "js");
      expect(scriptConfigs).toHaveLength(3);
      expect(scriptConfigs.some((c) => c.path === ".gemini/hooks/SessionStart.js")).toBe(true);
      expect(scriptConfigs.some((c) => c.path === ".gemini/hooks/BeforeShell.js")).toBe(true);
      expect(scriptConfigs.some((c) => c.path === ".gemini/hooks/AfterTool.js")).toBe(true);
    });

    it("deduplicates native events when multiple universal events map to same native event", async () => {
      const hook: HookDefinition = {
        id: "dedup",
        name: "Dedup Hook",
        events: ["tool:before", "file:write", "file:edit", "mcp:before"],
        phase: "before",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([hook]);
      // tool:before, file:write, file:edit, mcp:before all map to BeforeTool
      // so only 1 script + 1 settings = 2
      const scriptConfigs = configs.filter((c) => c.format === "js");
      expect(scriptConfigs).toHaveLength(1);
      expect(scriptConfigs[0]!.path).toBe(".gemini/hooks/BeforeTool.js");
    });

    it("generates no event scripts for hooks with no native event mappings", async () => {
      const unmappedHook: HookDefinition = {
        id: "unmapped",
        name: "Unmapped Hook",
        events: ["file:read"],
        phase: "before",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([unmappedHook]);
      // Only settings.json, no event scripts
      const scriptConfigs = configs.filter((c) => c.format === "js");
      expect(scriptConfigs).toHaveLength(0);
      expect(configs).toHaveLength(1);
      expect(configs[0]!.path).toBe(".gemini/settings.json");
    });

    it("generates config for empty hooks array", async () => {
      const configs = await adapter.generate([]);
      // Only settings.json
      expect(configs).toHaveLength(1);
      expect(configs[0]!.path).toBe(".gemini/settings.json");
    });

    it("each event script is named after its native event", async () => {
      const hook: HookDefinition = {
        id: "named",
        name: "Named Hook",
        events: ["session:end"],
        phase: "after",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([hook]);
      const eventScript = configs.find((c) => c.format === "js");
      expect(eventScript).toBeDefined();
      expect(eventScript!.path).toBe(".gemini/hooks/SessionEnd.js");
    });

    it("event script embeds the native event name in its switch statement", async () => {
      const hook: HookDefinition = {
        id: "after-tool",
        name: "After Tool Hook",
        events: ["tool:after"],
        phase: "after",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([hook]);
      const eventScript = configs.find((c) => c.path.includes("AfterTool"));
      expect(eventScript).toBeDefined();
      // The switch contains the interpolated event name
      expect(eventScript!.content).toContain('switch ("AfterTool")');
    });

    it("event script for AfterResponse uses default case (tool:after fallback)", async () => {
      const hook: HookDefinition = {
        id: "response",
        name: "Response Hook",
        events: ["prompt:response"],
        phase: "after",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([hook]);
      const eventScript = configs.find((c) => c.path.includes("AfterResponse"));
      expect(eventScript).toBeDefined();
      // AfterResponse doesn't match SessionStart, BeforeShell, BeforeTool, or BeforePrompt
      // so it falls into the default case
      expect(eventScript!.content).toContain('switch ("AfterResponse")');
      expect(eventScript!.content).toContain("default:");
    });
  });

  // ── detect ──────────────────────────────────────────────────

  describe("detect", () => {
    it("returns false when neither command nor config directory exists", async () => {
      commandExistsSpy.mockResolvedValue(false);
      vi.mocked(existsSync).mockReturnValue(false);
      const result = await adapter.detect();
      expect(result).toBe(false);
    });

    it("returns true when gemini command exists", async () => {
      commandExistsSpy.mockResolvedValue(true);
      vi.mocked(existsSync).mockReturnValue(false);
      const result = await adapter.detect();
      expect(result).toBe(true);
    });

    it("returns true when .gemini directory exists", async () => {
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
    it("removes all event hook scripts", async () => {
      await adapter.uninstall();
      // Should remove one script for each entry in REVERSE_MAP
      expect(removeFileSpy).toHaveBeenCalledWith(".gemini/hooks/SessionStart.js");
      expect(removeFileSpy).toHaveBeenCalledWith(".gemini/hooks/SessionEnd.js");
      expect(removeFileSpy).toHaveBeenCalledWith(".gemini/hooks/BeforePrompt.js");
      expect(removeFileSpy).toHaveBeenCalledWith(".gemini/hooks/AfterResponse.js");
      expect(removeFileSpy).toHaveBeenCalledWith(".gemini/hooks/BeforeTool.js");
      expect(removeFileSpy).toHaveBeenCalledWith(".gemini/hooks/AfterTool.js");
      expect(removeFileSpy).toHaveBeenCalledWith(".gemini/hooks/BeforeShell.js");
      expect(removeFileSpy).toHaveBeenCalledWith(".gemini/hooks/AfterShell.js");
    });

    it("calls removeFile for each native event in REVERSE_MAP", async () => {
      await adapter.uninstall();
      expect(removeFileSpy).toHaveBeenCalledTimes(8);
    });
  });
});
