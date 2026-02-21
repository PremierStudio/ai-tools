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

// Mock fs to avoid real filesystem access
vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => false),
}));

import { AmpAdapter } from "./amp.js";

function makeHandler() {
  return async (ctx: HookContext, next: () => Promise<void>) => {
    void ctx;
    await next();
  };
}

describe("AmpAdapter", () => {
  let adapter: AmpAdapter;

  const testHook: HookDefinition = {
    id: "test",
    name: "Test Hook",
    events: ["shell:before"],
    phase: "before",
    handler: makeHandler(),
  };

  beforeEach(() => {
    adapter = new AmpAdapter();
  });

  // ── Metadata / Capabilities ────────────────────────────────

  describe("metadata", () => {
    it("has correct id", () => {
      expect(adapter.id).toBe("amp");
    });

    it("has correct name", () => {
      expect(adapter.name).toBe("Amp");
    });

    it("has correct version", () => {
      expect(adapter.version).toBe("1.0");
    });
  });

  describe("capabilities", () => {
    it("does not support before hooks", () => {
      expect(adapter.capabilities.beforeHooks).toBe(false);
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

    it("has empty blockable events", () => {
      expect(adapter.capabilities.blockableEvents).toEqual([]);
    });

    it("blockable events are a subset of supported events", () => {
      for (const event of adapter.capabilities.blockableEvents) {
        expect(adapter.capabilities.supportedEvents).toContain(event);
      }
    });
  });

  // ── mapEvent ───────────────────────────────────────────────

  describe("mapEvent", () => {
    it("maps session:start to empty array (unsupported)", () => {
      expect(adapter.mapEvent("session:start")).toEqual([]);
    });

    it("maps session:end to empty array (unsupported)", () => {
      expect(adapter.mapEvent("session:end")).toEqual([]);
    });

    it("maps prompt:submit to empty array (unsupported)", () => {
      expect(adapter.mapEvent("prompt:submit")).toEqual([]);
    });

    it("maps prompt:response to empty array (unsupported)", () => {
      expect(adapter.mapEvent("prompt:response")).toEqual([]);
    });

    it("maps tool:before to tool:pre-execute", () => {
      expect(adapter.mapEvent("tool:before")).toEqual(["tool:pre-execute"]);
    });

    it("maps tool:after to tool:post-execute", () => {
      expect(adapter.mapEvent("tool:after")).toEqual(["tool:post-execute"]);
    });

    it("maps file:write to tool:pre-execute", () => {
      expect(adapter.mapEvent("file:write")).toEqual(["tool:pre-execute"]);
    });

    it("maps file:edit to tool:pre-execute", () => {
      expect(adapter.mapEvent("file:edit")).toEqual(["tool:pre-execute"]);
    });

    it("maps file:delete to tool:pre-execute", () => {
      expect(adapter.mapEvent("file:delete")).toEqual(["tool:pre-execute"]);
    });

    it("maps shell:before to tool:pre-execute", () => {
      expect(adapter.mapEvent("shell:before")).toEqual(["tool:pre-execute"]);
    });

    it("maps shell:after to tool:post-execute", () => {
      expect(adapter.mapEvent("shell:after")).toEqual(["tool:post-execute"]);
    });

    it("maps mcp:before to tool:pre-execute", () => {
      expect(adapter.mapEvent("mcp:before")).toEqual(["tool:pre-execute"]);
    });

    it("maps mcp:after to tool:post-execute", () => {
      expect(adapter.mapEvent("mcp:after")).toEqual(["tool:post-execute"]);
    });

    it("returns empty array for unknown event", () => {
      expect(adapter.mapEvent("unknown:event" as HookEventType)).toEqual([]);
    });

    it("returns empty array for file:read (not in Amp event map)", () => {
      expect(adapter.mapEvent("file:read" as HookEventType)).toEqual([]);
    });

    it("returns empty array for notification (not in Amp event map)", () => {
      expect(adapter.mapEvent("notification" as HookEventType)).toEqual([]);
    });
  });

  // ── mapNativeEvent ─────────────────────────────────────────

  describe("mapNativeEvent", () => {
    it("maps tool:pre-execute to multiple universal events", () => {
      const result = adapter.mapNativeEvent("tool:pre-execute");
      expect(result).toEqual([
        "tool:before",
        "file:write",
        "file:edit",
        "file:delete",
        "shell:before",
        "mcp:before",
      ]);
    });

    it("maps tool:post-execute to multiple universal events", () => {
      const result = adapter.mapNativeEvent("tool:post-execute");
      expect(result).toEqual(["tool:after", "shell:after", "mcp:after"]);
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
    it("returns two config files (MCP config + manifest)", async () => {
      const configs = await adapter.generate([testHook]);
      expect(configs).toHaveLength(2);
    });

    it("generates MCP config at correct path", async () => {
      const configs = await adapter.generate([testHook]);
      const mcpConfig = configs.find((c) => c.path === ".amp/mcp.json");
      expect(mcpConfig).toBeDefined();
    });

    it("MCP config has correct format", async () => {
      const configs = await adapter.generate([testHook]);
      const mcpConfig = configs.find((c) => c.path === ".amp/mcp.json");
      expect(mcpConfig!.format).toBe("json");
    });

    it("MCP config contains valid JSON with mcpServers", async () => {
      const configs = await adapter.generate([testHook]);
      const mcpConfig = configs.find((c) => c.path === ".amp/mcp.json");
      const parsed = JSON.parse(mcpConfig!.content) as {
        mcpServers: Record<string, unknown>;
      };
      expect(parsed.mcpServers).toBeDefined();
      expect(parsed.mcpServers["ai-hooks"]).toBeDefined();
    });

    it("MCP config uses npx command for ai-hooks server", async () => {
      const configs = await adapter.generate([testHook]);
      const mcpConfig = configs.find((c) => c.path === ".amp/mcp.json");
      const parsed = JSON.parse(mcpConfig!.content) as {
        mcpServers: {
          "ai-hooks": { command: string; args: string[]; env: Record<string, string> };
        };
      };
      expect(parsed.mcpServers["ai-hooks"].command).toBe("npx");
      expect(parsed.mcpServers["ai-hooks"].args).toEqual(["@premierstudio/mcp-server"]);
    });

    it("MCP config includes AI_HOOKS_CONFIG env var", async () => {
      const configs = await adapter.generate([testHook]);
      const mcpConfig = configs.find((c) => c.path === ".amp/mcp.json");
      const parsed = JSON.parse(mcpConfig!.content) as {
        mcpServers: {
          "ai-hooks": { env: Record<string, string> };
        };
      };
      expect(parsed.mcpServers["ai-hooks"].env.AI_HOOKS_CONFIG).toContain("ai-hooks.config.ts");
    });

    it("generates manifest at correct path", async () => {
      const configs = await adapter.generate([testHook]);
      const manifest = configs.find((c) => c.path === ".amp/ai-hooks-manifest.json");
      expect(manifest).toBeDefined();
    });

    it("manifest has correct format", async () => {
      const configs = await adapter.generate([testHook]);
      const manifest = configs.find((c) => c.path === ".amp/ai-hooks-manifest.json");
      expect(manifest!.format).toBe("json");
    });

    it("manifest contains valid JSON with adapter info", async () => {
      const configs = await adapter.generate([testHook]);
      const manifest = configs.find((c) => c.path === ".amp/ai-hooks-manifest.json");
      const parsed = JSON.parse(manifest!.content) as {
        adapter: string;
        version: string;
        mcpServer: string;
      };
      expect(parsed.adapter).toBe("amp");
      expect(parsed.version).toBe("1.0");
      expect(parsed.mcpServer).toBe("@premierstudio/mcp-server");
    });

    it("manifest includes hooks list with details", async () => {
      const configs = await adapter.generate([testHook]);
      const manifest = configs.find((c) => c.path === ".amp/ai-hooks-manifest.json");
      const parsed = JSON.parse(manifest!.content) as {
        hooks: Array<{
          id: string;
          name: string;
          events: string[];
          phase: string;
          nativeEvents: string[];
        }>;
      };
      expect(parsed.hooks).toHaveLength(1);
      expect(parsed.hooks[0]!.id).toBe("test");
      expect(parsed.hooks[0]!.name).toBe("Test Hook");
      expect(parsed.hooks[0]!.events).toEqual(["shell:before"]);
      expect(parsed.hooks[0]!.phase).toBe("before");
      expect(parsed.hooks[0]!.nativeEvents).toEqual(["tool:pre-execute"]);
    });

    it("manifest includes needed native events", async () => {
      const configs = await adapter.generate([testHook]);
      const manifest = configs.find((c) => c.path === ".amp/ai-hooks-manifest.json");
      const parsed = JSON.parse(manifest!.content) as {
        nativeEvents: string[];
      };
      expect(parsed.nativeEvents).toContain("tool:pre-execute");
    });

    it("maps multiple hook events to correct native events in manifest", async () => {
      const multiHook: HookDefinition = {
        id: "multi",
        name: "Multi Hook",
        events: ["tool:before", "tool:after", "shell:after"],
        phase: "after",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([multiHook]);
      const manifest = configs.find((c) => c.path === ".amp/ai-hooks-manifest.json");
      const parsed = JSON.parse(manifest!.content) as {
        nativeEvents: string[];
      };
      expect(parsed.nativeEvents).toContain("tool:pre-execute");
      expect(parsed.nativeEvents).toContain("tool:post-execute");
    });

    it("deduplicates native events from multiple hooks", async () => {
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
      const manifest = configs.find((c) => c.path === ".amp/ai-hooks-manifest.json");
      const parsed = JSON.parse(manifest!.content) as {
        nativeEvents: string[];
      };
      // Both map to tool:pre-execute, should only appear once
      const preExecuteCount = parsed.nativeEvents.filter((e) => e === "tool:pre-execute").length;
      expect(preExecuteCount).toBe(1);
    });

    it("generates empty native events for hooks with no native event mappings", async () => {
      const unmappedHook: HookDefinition = {
        id: "unmapped",
        name: "Unmapped Hook",
        events: ["session:start"],
        phase: "before",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([unmappedHook]);
      const manifest = configs.find((c) => c.path === ".amp/ai-hooks-manifest.json");
      const parsed = JSON.parse(manifest!.content) as {
        nativeEvents: string[];
      };
      expect(parsed.nativeEvents).toHaveLength(0);
    });

    it("generates config for empty hooks array", async () => {
      const configs = await adapter.generate([]);
      expect(configs).toHaveLength(2);
      const manifest = configs.find((c) => c.path === ".amp/ai-hooks-manifest.json");
      const parsed = JSON.parse(manifest!.content) as {
        hooks: unknown[];
        nativeEvents: string[];
      };
      expect(parsed.hooks).toHaveLength(0);
      expect(parsed.nativeEvents).toHaveLength(0);
    });

    it("manifest hooks include flatMapped native events per hook", async () => {
      const multiEventHook: HookDefinition = {
        id: "multi-event",
        name: "Multi Event Hook",
        events: ["file:write", "file:edit", "tool:after"],
        phase: "before",
        handler: makeHandler(),
      };
      const configs = await adapter.generate([multiEventHook]);
      const manifest = configs.find((c) => c.path === ".amp/ai-hooks-manifest.json");
      const parsed = JSON.parse(manifest!.content) as {
        hooks: Array<{ nativeEvents: string[] }>;
      };
      // file:write -> tool:pre-execute, file:edit -> tool:pre-execute, tool:after -> tool:post-execute
      // flatMap produces duplicates per hook entry (not deduplicated per hook)
      expect(parsed.hooks[0]!.nativeEvents).toContain("tool:pre-execute");
      expect(parsed.hooks[0]!.nativeEvents).toContain("tool:post-execute");
    });
  });

  // ── detect ─────────────────────────────────────────────────

  describe("detect", () => {
    it("returns false when neither command nor directory exists", async () => {
      const result = await adapter.detect();
      expect(result).toBe(false);
    });
  });

  // ── uninstall ──────────────────────────────────────────────

  describe("uninstall", () => {
    it("completes without error", async () => {
      await expect(adapter.uninstall()).resolves.toBeUndefined();
    });
  });
});
