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
import { GrokAdapter } from "./grok.js";

function makeHandler() {
  return async (ctx: HookContext, next: () => Promise<void>) => {
    void ctx;
    await next();
  };
}

describe("GrokAdapter", () => {
  let adapter: GrokAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new GrokAdapter();
  });

  it("uses Grok identity and Claude-compatible events", () => {
    expect(adapter.id).toBe("grok");
    expect(adapter.mapEvent("tool:before")).toEqual(["PreToolUse"]);
    expect(adapter.mapNativeEvent("SessionStart")).toEqual(["session:start"]);
  });

  it("generates .grok/hooks JSON plus a runner", async () => {
    const hook: HookDefinition = {
      id: "audit",
      name: "audit",
      events: ["tool:before" as HookEventType],
      phase: "before",
      handler: makeHandler(),
    };
    const files = await adapter.generate([hook]);
    expect(files.map((file) => file.path)).toEqual([
      ".grok/hooks/ai-tools.json",
      ".grok/hooks/ai-tools-runner.js",
    ]);
    const json = JSON.parse(files[0]!.content) as { hooks: Record<string, unknown> };
    expect(json.hooks.PreToolUse).toBeDefined();
  });

  it("detects a .grok directory", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    expect(await adapter.detect()).toBe(true);
  });

  it("uninstalls generated hook files", async () => {
    await adapter.uninstall();
    expect(removeFileSpy).toHaveBeenCalledWith(".grok/hooks/ai-tools.json");
    expect(removeFileSpy).toHaveBeenCalledWith(".grok/hooks/ai-tools-runner.js");
  });
});
