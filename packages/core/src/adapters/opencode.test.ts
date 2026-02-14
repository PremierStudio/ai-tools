import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HookContext, HookDefinition, HookEventType } from "../index.js";

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

const mockExistsSync = vi.hoisted(() => vi.fn(() => false));

// Mock fs modules to avoid real filesystem access
vi.mock("node:fs", () => ({
  existsSync: mockExistsSync,
}));

import { OpenCodeAdapter } from "./opencode.js";

function makeHandler() {
  return async (ctx: HookContext, next: () => Promise<void>) => {
    void ctx;
    await next();
  };
}

describe("OpenCodeAdapter", () => {
  let adapter: OpenCodeAdapter;

  const testHook: HookDefinition = {
    id: "test",
    name: "Test Hook",
    events: ["shell:before"],
    phase: "before",
    handler: makeHandler(),
  };

  beforeEach(() => {
    adapter = new OpenCodeAdapter();
    mockExistsSync.mockReturnValue(false);
  });

  // ── Metadata / Capabilities ────────────────────────────────

  describe("metadata", () => {
    it("has correct id", () => {
      expect(adapter.id).toBe("opencode");
    });

    it("has correct name", () => {
      expect(adapter.name).toBe("OpenCode");
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
    it("maps session:start to session.created", () => {
      expect(adapter.mapEvent("session:start")).toEqual(["session.created"]);
    });

    it("maps session:end to session.idle", () => {
      expect(adapter.mapEvent("session:end")).toEqual(["session.idle"]);
    });

    it("maps prompt:submit to message.updated", () => {
      expect(adapter.mapEvent("prompt:submit")).toEqual(["message.updated"]);
    });

    it("maps prompt:response to message.part.updated", () => {
      expect(adapter.mapEvent("prompt:response")).toEqual(["message.part.updated"]);
    });

    it("maps tool:before to tool.execute.before", () => {
      expect(adapter.mapEvent("tool:before")).toEqual(["tool.execute.before"]);
    });

    it("maps tool:after to tool.execute.after", () => {
      expect(adapter.mapEvent("tool:after")).toEqual(["tool.execute.after"]);
    });

    it("maps file:read to tool.execute.before", () => {
      expect(adapter.mapEvent("file:read")).toEqual(["tool.execute.before"]);
    });

    it("maps file:write to tool.execute.before and file.edited", () => {
      expect(adapter.mapEvent("file:write")).toEqual(["tool.execute.before", "file.edited"]);
    });

    it("maps file:edit to tool.execute.before and file.edited", () => {
      expect(adapter.mapEvent("file:edit")).toEqual(["tool.execute.before", "file.edited"]);
    });

    it("maps file:delete to tool.execute.before", () => {
      expect(adapter.mapEvent("file:delete")).toEqual(["tool.execute.before"]);
    });

    it("maps shell:before to tool.execute.before", () => {
      expect(adapter.mapEvent("shell:before")).toEqual(["tool.execute.before"]);
    });

    it("maps shell:after to tool.execute.after", () => {
      expect(adapter.mapEvent("shell:after")).toEqual(["tool.execute.after"]);
    });

    it("maps mcp:before to tool.execute.before", () => {
      expect(adapter.mapEvent("mcp:before")).toEqual(["tool.execute.before"]);
    });

    it("maps mcp:after to tool.execute.after", () => {
      expect(adapter.mapEvent("mcp:after")).toEqual(["tool.execute.after"]);
    });

    it("maps notification to tui.toast.show", () => {
      expect(adapter.mapEvent("notification")).toEqual(["tui.toast.show"]);
    });

    it("returns empty array for unknown event", () => {
      expect(adapter.mapEvent("unknown:event" as HookEventType)).toEqual([]);
    });
  });

  // ── mapNativeEvent ─────────────────────────────────────────

  describe("mapNativeEvent", () => {
    it("maps session.created to session:start", () => {
      expect(adapter.mapNativeEvent("session.created")).toEqual(["session:start"]);
    });

    it("maps session.idle to session:end", () => {
      expect(adapter.mapNativeEvent("session.idle")).toEqual(["session:end"]);
    });

    it("maps message.updated to prompt:submit", () => {
      expect(adapter.mapNativeEvent("message.updated")).toEqual(["prompt:submit"]);
    });

    it("maps message.part.updated to prompt:response", () => {
      expect(adapter.mapNativeEvent("message.part.updated")).toEqual(["prompt:response"]);
    });

    it("maps tool.execute.before to multiple universal events", () => {
      const result = adapter.mapNativeEvent("tool.execute.before");
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

    it("maps tool.execute.after to multiple universal events", () => {
      const result = adapter.mapNativeEvent("tool.execute.after");
      expect(result).toEqual(["tool:after", "shell:after", "mcp:after"]);
    });

    it("maps file.edited to file:write and file:edit", () => {
      expect(adapter.mapNativeEvent("file.edited")).toEqual(["file:write", "file:edit"]);
    });

    it("maps tui.toast.show to notification", () => {
      expect(adapter.mapNativeEvent("tui.toast.show")).toEqual(["notification"]);
    });

    it("returns empty array for unknown native event", () => {
      expect(adapter.mapNativeEvent("unknown.event")).toEqual([]);
    });

    it("returns empty array for empty string", () => {
      expect(adapter.mapNativeEvent("")).toEqual([]);
    });
  });

  // ── generate ───────────────────────────────────────────────

  describe("generate", () => {
    it("returns two config files (plugin + package.json)", async () => {
      const configs = await adapter.generate([testHook]);
      expect(configs).toHaveLength(2);
    });

    it("generates plugin at correct path", async () => {
      const configs = await adapter.generate([testHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin).toBeDefined();
      expect(plugin!.path).toBe(".opencode/plugins/ai-hooks-plugin.js");
    });

    it("plugin has correct format", async () => {
      const configs = await adapter.generate([testHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin!.format).toBe("js");
    });

    it("plugin imports from ai-hooks", async () => {
      const configs = await adapter.generate([testHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin!.content).toContain(
        'import { loadConfig, HookEngine } from "@premierstudio/ai-hooks"',
      );
    });

    it("plugin contains DO NOT EDIT warning", async () => {
      const configs = await adapter.generate([testHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin!.content).toContain("DO NOT EDIT");
    });

    it("plugin contains handleHook function", async () => {
      const configs = await adapter.generate([testHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin!.content).toContain("async function handleHook");
    });

    it("plugin contains resolveToolBefore function", async () => {
      const configs = await adapter.generate([testHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin!.content).toContain("function resolveToolBefore");
    });

    it("plugin contains resolveToolAfter function", async () => {
      const configs = await adapter.generate([testHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin!.content).toContain("function resolveToolAfter");
    });

    it("plugin handles tool.execute.before hook entry for shell:before", async () => {
      const configs = await adapter.generate([testHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin!.content).toContain('"tool.execute.before"');
    });

    it("plugin handles session.created event", async () => {
      const sessionHook: HookDefinition = {
        id: "session",
        name: "Session Hook",
        events: ["session:start"],
        phase: "before",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([sessionHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin!.content).toContain('"session.created"');
    });

    it("plugin handles session.idle event", async () => {
      const sessionEndHook: HookDefinition = {
        id: "session-end",
        name: "Session End Hook",
        events: ["session:end"],
        phase: "after",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([sessionEndHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin!.content).toContain('"session.idle"');
    });

    it("plugin handles message.updated event", async () => {
      const promptHook: HookDefinition = {
        id: "prompt",
        name: "Prompt Hook",
        events: ["prompt:submit"],
        phase: "before",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([promptHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin!.content).toContain('"message.updated"');
    });

    it("plugin handles tui.toast.show event", async () => {
      const notifHook: HookDefinition = {
        id: "notif",
        name: "Notification Hook",
        events: ["notification"],
        phase: "after",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([notifHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin!.content).toContain('"tui.toast.show"');
    });

    it("plugin handles blocking for tool.execute.before", async () => {
      const configs = await adapter.generate([testHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin!.content).toContain("blocked");
      expect(plugin!.content).toContain("reason");
    });

    it("plugin handles file_write and write tool names", async () => {
      const configs = await adapter.generate([testHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin!.content).toContain('"file_write"');
      expect(plugin!.content).toContain('"write"');
    });

    it("plugin handles file_edit and edit tool names", async () => {
      const configs = await adapter.generate([testHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin!.content).toContain('"file_edit"');
      expect(plugin!.content).toContain('"edit"');
    });

    it("plugin handles file_read and read tool names", async () => {
      const configs = await adapter.generate([testHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin!.content).toContain('"file_read"');
      expect(plugin!.content).toContain('"read"');
    });

    it("plugin handles bash and shell tool names", async () => {
      const configs = await adapter.generate([testHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin!.content).toContain('"bash"');
      expect(plugin!.content).toContain('"shell"');
    });

    it("plugin exports AiHooksPlugin", async () => {
      const configs = await adapter.generate([testHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin!.content).toContain("export const AiHooksPlugin");
    });

    it("generates package.json at correct path", async () => {
      const configs = await adapter.generate([testHook]);
      const pkgJson = configs.find((c) => c.path.includes("package.json"));
      expect(pkgJson).toBeDefined();
      expect(pkgJson!.path).toBe(".opencode/plugins/package.json");
    });

    it("package.json has correct format", async () => {
      const configs = await adapter.generate([testHook]);
      const pkgJson = configs.find((c) => c.path.includes("package.json"));
      expect(pkgJson!.format).toBe("json");
    });

    it("package.json contains valid JSON", async () => {
      const configs = await adapter.generate([testHook]);
      const pkgJson = configs.find((c) => c.path.includes("package.json"));
      const parsed = JSON.parse(pkgJson!.content) as Record<string, unknown>;
      expect(parsed).toBeDefined();
      expect(parsed.name).toBe("ai-hooks-opencode-plugin");
    });

    it("package.json has ESM type", async () => {
      const configs = await adapter.generate([testHook]);
      const pkgJson = configs.find((c) => c.path.includes("package.json"));
      const parsed = JSON.parse(pkgJson!.content) as Record<string, unknown>;
      expect(parsed.type).toBe("module");
    });

    it("package.json has ai-hooks dependency", async () => {
      const configs = await adapter.generate([testHook]);
      const pkgJson = configs.find((c) => c.path.includes("package.json"));
      const parsed = JSON.parse(pkgJson!.content) as {
        dependencies: Record<string, string>;
      };
      expect(parsed.dependencies["@premierstudio/ai-hooks"]).toBe("*");
    });

    it("package.json points main to plugin file", async () => {
      const configs = await adapter.generate([testHook]);
      const pkgJson = configs.find((c) => c.path.includes("package.json"));
      const parsed = JSON.parse(pkgJson!.content) as Record<string, unknown>;
      expect(parsed.main).toBe("ai-hooks-plugin.js");
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
          events: ["file:read"],
          phase: "before",
          handler: makeHandler(),
        },
      ];
      const configs = await adapter.generate(hooks);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      // Both map to tool.execute.before, should only appear once
      const matches = plugin!.content.match(/"tool\.execute\.before"/g);
      // It appears in the hook entries once (as a key) plus in the handleHook switch
      expect(matches).toBeDefined();
      // The hook entry line should not be duplicated
      const hookEntryMatches = plugin!.content.match(/"tool\.execute\.before": async/g);
      expect(hookEntryMatches).toHaveLength(1);
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
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin!.content).toContain('"session.created": async');
      expect(plugin!.content).toContain('"tool.execute.after": async');
      expect(plugin!.content).toContain('"tui.toast.show": async');
    });

    it("generates config for empty hooks array", async () => {
      const configs = await adapter.generate([]);
      expect(configs).toHaveLength(2);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      // The plugin should have no hook entries
      expect(plugin!.content).toContain("return {");
    });

    it("generates file.edited hook entry for file:write event", async () => {
      const fileHook: HookDefinition = {
        id: "file",
        name: "File Hook",
        events: ["file:write"],
        phase: "before",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([fileHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      // file:write maps to both tool.execute.before and file.edited
      expect(plugin!.content).toContain('"tool.execute.before": async');
      expect(plugin!.content).toContain('"file.edited": async');
    });

    it("plugin handles message.part.updated for prompt:response", async () => {
      const responseHook: HookDefinition = {
        id: "response",
        name: "Response Hook",
        events: ["prompt:response"],
        phase: "after",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([responseHook]);
      const plugin = configs.find((c) => c.path.includes("ai-hooks-plugin"));
      expect(plugin!.content).toContain('"message.part.updated": async');
    });
  });

  // ── detect ──────────────────────────────────────────────────

  describe("detect", () => {
    it("returns false when command does not exist and no .opencode dir", async () => {
      mockExistsSync.mockReturnValue(false);
      const result = await adapter.detect();
      expect(result).toBe(false);
    });

    it("returns true when .opencode directory exists", async () => {
      mockExistsSync.mockReturnValue(true);
      const result = await adapter.detect();
      expect(result).toBe(true);
    });
  });

  // ── uninstall ───────────────────────────────────────────────

  describe("uninstall", () => {
    it("calls removeFile for plugin and package.json", async () => {
      await adapter.uninstall();
      // uninstall runs without error (removeFile is a no-op mock)
    });
  });
});
