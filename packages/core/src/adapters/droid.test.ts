import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HookContext, HookDefinition, HookEventType } from "../index.js";

const mockExistsSync = vi.hoisted(() => vi.fn(() => false));
const mockReadFile = vi.hoisted(() => vi.fn());

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
    protected async commandExists() {
      return false;
    }
    protected async removeFile() {}
  }
  return { BaseAdapter, registry };
});

// Mock fs modules to avoid real filesystem access
vi.mock("node:fs", () => ({
  existsSync: mockExistsSync,
}));

vi.mock("node:fs/promises", () => ({
  readFile: mockReadFile,
}));

import { DroidAdapter } from "./droid.js";

function makeHandler() {
  return async (ctx: HookContext, next: () => Promise<void>) => {
    void ctx;
    await next();
  };
}

describe("DroidAdapter", () => {
  let adapter: DroidAdapter;

  const testHook: HookDefinition = {
    id: "test",
    name: "Test Hook",
    events: ["shell:before"],
    phase: "before",
    handler: makeHandler(),
  };

  beforeEach(() => {
    adapter = new DroidAdapter();
    mockExistsSync.mockReturnValue(false);
    mockReadFile.mockReset();
  });

  // ── Metadata / Capabilities ────────────────────────────────

  describe("metadata", () => {
    it("has correct id", () => {
      expect(adapter.id).toBe("droid");
    });

    it("has correct name", () => {
      expect(adapter.name).toBe("Factory Droid");
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
        "file:read",
        "file:write",
        "file:edit",
        "file:delete",
        "shell:before",
        "shell:after",
        "mcp:before",
        "mcp:after",
        "notification",
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
    it("maps session:start to SessionStart", () => {
      expect(adapter.mapEvent("session:start")).toEqual(["SessionStart"]);
    });

    it("maps session:end to SessionEnd", () => {
      expect(adapter.mapEvent("session:end")).toEqual(["SessionEnd"]);
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

    it("maps notification to Notification", () => {
      expect(adapter.mapEvent("notification")).toEqual(["Notification"]);
    });

    it("returns empty array for unknown event", () => {
      expect(adapter.mapEvent("unknown:event" as HookEventType)).toEqual([]);
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

    it("maps UserPromptSubmit to prompt:submit", () => {
      expect(adapter.mapNativeEvent("UserPromptSubmit")).toEqual(["prompt:submit"]);
    });

    it("maps Stop to prompt:response", () => {
      expect(adapter.mapNativeEvent("Stop")).toEqual(["prompt:response"]);
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

    it("maps Notification to notification", () => {
      expect(adapter.mapNativeEvent("Notification")).toEqual(["notification"]);
    });

    it("returns empty array for unknown native event", () => {
      expect(adapter.mapNativeEvent("UnknownNativeEvent")).toEqual([]);
    });

    it("returns empty array for empty string", () => {
      expect(adapter.mapNativeEvent("")).toEqual([]);
    });

    it("returns empty array for SubagentStop (not in reverse map)", () => {
      expect(adapter.mapNativeEvent("SubagentStop")).toEqual([]);
    });

    it("returns empty array for PreCompact (not in reverse map)", () => {
      expect(adapter.mapNativeEvent("PreCompact")).toEqual([]);
    });
  });

  // ── generate ───────────────────────────────────────────────

  describe("generate", () => {
    it("returns two config files (runner + settings)", async () => {
      const configs = await adapter.generate([testHook]);
      expect(configs).toHaveLength(2);
    });

    it("generates runner script at correct path", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner).toBeDefined();
      expect(runner!.path).toBe(".factory/hooks/ai-hooks-runner.js");
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

    it("runner script reads STDIN for hook data", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain("readStdin");
      expect(runner!.content).toContain("process.stdin");
    });

    it("runner script reads hook_event_name from input", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain("hook_event_name");
    });

    it("runner script reads tool_name from input", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain("tool_name");
    });

    it("runner script reads tool_input from input", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain("tool_input");
    });

    it("runner script reads tool_response from input", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain("tool_response");
    });

    it("runner script handles SessionStart event", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain('"SessionStart"');
      expect(runner!.content).toContain("session:start");
    });

    it("runner script handles SessionEnd event", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain('"SessionEnd"');
      expect(runner!.content).toContain("session:end");
    });

    it("runner script handles UserPromptSubmit event", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain('"UserPromptSubmit"');
      expect(runner!.content).toContain("prompt:submit");
    });

    it("runner script handles Notification event", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain('"Notification"');
    });

    it("runner script handles Stop event", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain('"Stop"');
    });

    it("runner script handles PreToolUse with resolvePreToolEvent", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain('"PreToolUse"');
      expect(runner!.content).toContain("resolvePreToolEvent");
    });

    it("runner script handles PostToolUse with resolvePostToolEvent", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain('"PostToolUse"');
      expect(runner!.content).toContain("resolvePostToolEvent");
    });

    it("runner script handles Write tool name", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain('"Write"');
    });

    it("runner script handles Edit tool name", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain('"Edit"');
    });

    it("runner script handles Read tool name", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain('"Read"');
    });

    it("runner script handles Bash tool name", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain('"Bash"');
    });

    it("runner script handles blocking with exit code 2", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain("process.exit(2)");
    });

    it("runner script writes blocked reason to stderr", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain("process.stderr.write");
      expect(runner!.content).toContain("Blocked by ai-hooks");
    });

    it("runner script exits with code 0 for unknown events", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain("process.exit(0)");
    });

    it("runner script handles errors with exit code 1", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain("process.exit(1)");
    });

    it("runner script contains DO NOT EDIT warning", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain("DO NOT EDIT");
    });

    it("runner script reads session_id from input", async () => {
      const configs = await adapter.generate([testHook]);
      const runner = configs.find((c) => c.path.includes("runner"));
      expect(runner!.content).toContain("session_id");
    });

    it("generates settings.json at correct path", async () => {
      const configs = await adapter.generate([testHook]);
      const settings = configs.find((c) => c.path.includes("settings"));
      expect(settings).toBeDefined();
      expect(settings!.path).toBe(".factory/settings.json");
    });

    it("settings has correct format", async () => {
      const configs = await adapter.generate([testHook]);
      const settings = configs.find((c) => c.path.includes("settings"));
      expect(settings!.format).toBe("json");
    });

    it("settings contains valid JSON", async () => {
      const configs = await adapter.generate([testHook]);
      const settings = configs.find((c) => c.path.includes("settings"));
      const parsed = JSON.parse(settings!.content) as Record<string, unknown>;
      expect(parsed).toBeDefined();
      expect(parsed.hooks).toBeDefined();
    });

    it("settings contains PreToolUse hook entry for shell:before event", async () => {
      const configs = await adapter.generate([testHook]);
      const settings = configs.find((c) => c.path.includes("settings"));
      const parsed = JSON.parse(settings!.content) as {
        hooks: Record<
          string,
          Array<{
            matcher?: string;
            hooks: Array<{ type: string; command: string; timeout: number }>;
          }>
        >;
      };
      const preToolUseEntries = parsed.hooks.PreToolUse;
      expect(preToolUseEntries).toBeDefined();
      expect(preToolUseEntries).toHaveLength(1);
      const entry = preToolUseEntries![0]!;
      expect(entry.matcher).toBe("*");
      expect(entry.hooks).toHaveLength(1);
      expect(entry.hooks[0]!.type).toBe("command");
      expect(entry.hooks[0]!.command).toContain("ai-hooks-runner.js");
      expect(entry.hooks[0]!.timeout).toBe(30);
    });

    it("PreToolUse and PostToolUse entries have matcher: *", async () => {
      const multiHook: HookDefinition = {
        id: "multi",
        name: "Multi Hook",
        events: ["tool:before", "tool:after"],
        phase: "before",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([multiHook]);
      const settings = configs.find((c) => c.path.includes("settings"));
      const parsed = JSON.parse(settings!.content) as {
        hooks: Record<string, Array<{ matcher?: string }>>;
      };
      expect(parsed.hooks.PreToolUse![0]!.matcher).toBe("*");
      expect(parsed.hooks.PostToolUse![0]!.matcher).toBe("*");
    });

    it("non-tool events do not have matcher", async () => {
      const sessionHook: HookDefinition = {
        id: "session",
        name: "Session Hook",
        events: ["session:start"],
        phase: "before",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([sessionHook]);
      const settings = configs.find((c) => c.path.includes("settings"));
      const parsed = JSON.parse(settings!.content) as {
        hooks: Record<string, Array<{ matcher?: string }>>;
      };
      expect(parsed.hooks.SessionStart![0]!.matcher).toBeUndefined();
    });

    it("maps multiple hook events to correct native events", async () => {
      const multiHook: HookDefinition = {
        id: "multi",
        name: "Multi Hook",
        events: ["session:start", "tool:after", "notification"],
        phase: "after",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([multiHook]);
      const settings = configs.find((c) => c.path.includes("settings"));
      const parsed = JSON.parse(settings!.content) as {
        hooks: Record<string, unknown[]>;
      };
      expect(parsed.hooks.SessionStart).toBeDefined();
      expect(parsed.hooks.PostToolUse).toBeDefined();
      expect(parsed.hooks.Notification).toBeDefined();
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
      const settings = configs.find((c) => c.path.includes("settings"));
      const parsed = JSON.parse(settings!.content) as {
        hooks: Record<string, unknown[]>;
      };
      // Both map to PreToolUse, should only have one entry
      expect(parsed.hooks.PreToolUse).toHaveLength(1);
    });

    it("returns empty hooks config for hooks with no native event mappings", async () => {
      const unmappedHook: HookDefinition = {
        id: "unmapped",
        name: "Unmapped Hook",
        events: ["unknown:thing" as HookEventType],
        phase: "after",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([unmappedHook]);
      const settings = configs.find((c) => c.path.includes("settings"));
      const parsed = JSON.parse(settings!.content) as {
        hooks: Record<string, unknown[]>;
      };
      expect(Object.keys(parsed.hooks)).toHaveLength(0);
    });

    it("generates config for empty hooks array", async () => {
      const configs = await adapter.generate([]);
      expect(configs).toHaveLength(2);
      const settings = configs.find((c) => c.path.includes("settings"));
      const parsed = JSON.parse(settings!.content) as {
        hooks: Record<string, unknown[]>;
      };
      expect(Object.keys(parsed.hooks)).toHaveLength(0);
    });

    it("generates all Droid native events for comprehensive hook set", async () => {
      const hook: HookDefinition = {
        id: "all",
        name: "All Events",
        events: [
          "session:start",
          "session:end",
          "prompt:submit",
          "prompt:response",
          "notification",
        ],
        phase: "before",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([hook]);
      const settings = configs.find((c) => c.path.includes("settings"));
      const parsed = JSON.parse(settings!.content) as {
        hooks: Record<string, unknown[]>;
      };
      expect(parsed.hooks.SessionStart).toBeDefined();
      expect(parsed.hooks.SessionEnd).toBeDefined();
      expect(parsed.hooks.UserPromptSubmit).toBeDefined();
      expect(parsed.hooks.Stop).toBeDefined();
      expect(parsed.hooks.Notification).toBeDefined();
    });

    // ── mergeSettings ─────────────────────────────────────────

    describe("mergeSettings", () => {
      it("creates new settings when no existing settings.json", async () => {
        mockExistsSync.mockReturnValue(false);
        const configs = await adapter.generate([testHook]);
        const settings = configs.find((c) => c.path.includes("settings"));
        const parsed = JSON.parse(settings!.content) as Record<string, unknown>;
        expect(parsed.hooks).toBeDefined();
      });

      it("merges with existing settings preserving non-hooks fields", async () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFile.mockResolvedValue(
          JSON.stringify({
            model: "claude-3.5-sonnet",
            permissions: { allow: ["read"] },
            hooks: {},
          }),
        );
        const configs = await adapter.generate([testHook]);
        const settings = configs.find((c) => c.path.includes("settings"));
        const parsed = JSON.parse(settings!.content) as Record<string, unknown>;
        expect(parsed.model).toBe("claude-3.5-sonnet");
        expect(parsed.permissions).toEqual({ allow: ["read"] });
        expect(parsed.hooks).toBeDefined();
      });

      it("preserves existing non-ai-hooks hook entries", async () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFile.mockResolvedValue(
          JSON.stringify({
            hooks: {
              PreToolUse: [
                {
                  hooks: [
                    {
                      type: "command",
                      command: "some-other-tool",
                      timeout: 5,
                    },
                  ],
                },
              ],
            },
          }),
        );
        const configs = await adapter.generate([testHook]);
        const settings = configs.find((c) => c.path.includes("settings"));
        const parsed = JSON.parse(settings!.content) as {
          hooks: Record<
            string,
            Array<{
              hooks: Array<{ command: string }>;
            }>
          >;
        };
        // Should have 2 entries: the existing other-tool + the new ai-hooks
        expect(parsed.hooks.PreToolUse).toHaveLength(2);
        expect(parsed.hooks.PreToolUse![0]!.hooks[0]!.command).toBe("some-other-tool");
        expect(parsed.hooks.PreToolUse![1]!.hooks[0]!.command).toContain("ai-hooks-runner.js");
      });

      it("removes old ai-hooks entries before adding new ones", async () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFile.mockResolvedValue(
          JSON.stringify({
            hooks: {
              PreToolUse: [
                {
                  hooks: [
                    {
                      type: "command",
                      command: "node /old/path/ai-hooks-runner.js",
                      timeout: 30,
                    },
                  ],
                },
              ],
            },
          }),
        );
        const configs = await adapter.generate([testHook]);
        const settings = configs.find((c) => c.path.includes("settings"));
        const parsed = JSON.parse(settings!.content) as {
          hooks: Record<
            string,
            Array<{
              hooks: Array<{ command: string }>;
            }>
          >;
        };
        // Old ai-hooks entry should be replaced, not duplicated
        expect(parsed.hooks.PreToolUse).toHaveLength(1);
        expect(parsed.hooks.PreToolUse![0]!.hooks[0]!.command).toContain("ai-hooks-runner.js");
      });

      it("handles existing settings with no hooks field", async () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFile.mockResolvedValue(
          JSON.stringify({
            model: "claude-3.5-sonnet",
          }),
        );
        const configs = await adapter.generate([testHook]);
        const settings = configs.find((c) => c.path.includes("settings"));
        const parsed = JSON.parse(settings!.content) as {
          hooks: Record<string, unknown[]>;
        };
        expect(parsed.hooks.PreToolUse).toBeDefined();
      });

      it("handles existing settings with hooks for different events", async () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFile.mockResolvedValue(
          JSON.stringify({
            hooks: {
              SessionStart: [
                {
                  hooks: [
                    {
                      type: "command",
                      command: "echo hello",
                      timeout: 5,
                    },
                  ],
                },
              ],
            },
          }),
        );
        const configs = await adapter.generate([testHook]);
        const settings = configs.find((c) => c.path.includes("settings"));
        const parsed = JSON.parse(settings!.content) as {
          hooks: Record<string, unknown[]>;
        };
        // Existing SessionStart should be preserved
        expect(parsed.hooks.SessionStart).toBeDefined();
        expect(parsed.hooks.SessionStart).toHaveLength(1);
        // New PreToolUse should be added
        expect(parsed.hooks.PreToolUse).toBeDefined();
        expect(parsed.hooks.PreToolUse).toHaveLength(1);
      });
    });
  });

  // ── detect ──────────────────────────────────────────────────

  describe("detect", () => {
    it("returns false when command does not exist and no .factory dir", async () => {
      mockExistsSync.mockReturnValue(false);
      const result = await adapter.detect();
      expect(result).toBe(false);
    });

    it("returns true when .factory directory exists", async () => {
      mockExistsSync.mockReturnValue(true);
      const result = await adapter.detect();
      expect(result).toBe(true);
    });
  });

  // ── uninstall ───────────────────────────────────────────────

  describe("uninstall", () => {
    it("calls removeFile for runner script", async () => {
      await adapter.uninstall();
      // uninstall runs without error (removeFile is a no-op mock)
    });
  });
});
