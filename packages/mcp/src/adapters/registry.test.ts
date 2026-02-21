import { describe, it, expect, beforeEach, vi } from "vitest";
import { registry } from "./registry.js";
import type { BaseMCPAdapter } from "./base.js";
import type { MCPServerDefinition, GeneratedFile } from "../types/index.js";

function makeFakeAdapter(id: string, detects: boolean = true): BaseMCPAdapter {
  return {
    id,
    name: `${id} Adapter`,
    nativeSupport: true,
    configPath: `.${id}/mcp.json`,
    detect: async () => detects,
    generate: async (_servers: MCPServerDefinition[]) => [] as GeneratedFile[],
    import: async () => [] as MCPServerDefinition[],
    install: async () => {},
    uninstall: async () => {},
  } as unknown as BaseMCPAdapter;
}

describe("Real MCPAdapterRegistry singleton", () => {
  beforeEach(() => {
    registry.clear();
  });

  describe("register / get", () => {
    it("registers and retrieves an adapter by id", () => {
      const adapter = makeFakeAdapter("claude-code");
      registry.register(adapter);
      expect(registry.get("claude-code")).toBe(adapter);
    });

    it("returns undefined for unknown adapter id", () => {
      expect(registry.get("nonexistent")).toBeUndefined();
    });

    it("overwrites a previously registered adapter with the same id", () => {
      const first = makeFakeAdapter("dupe");
      const second = makeFakeAdapter("dupe");
      registry.register(first);
      registry.register(second);
      expect(registry.get("dupe")).toBe(second);
    });
  });

  describe("list", () => {
    it("returns empty array when nothing registered", () => {
      expect(registry.list()).toEqual([]);
    });

    it("lists all registered adapter IDs", () => {
      registry.register(makeFakeAdapter("a"));
      registry.register(makeFakeAdapter("b"));
      expect(registry.list().toSorted()).toEqual(["a", "b"]);
    });
  });

  describe("getAll", () => {
    it("returns empty array when nothing registered", () => {
      expect(registry.getAll()).toEqual([]);
    });

    it("returns all registered adapters", () => {
      const a = makeFakeAdapter("a");
      const b = makeFakeAdapter("b");
      registry.register(a);
      registry.register(b);
      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContain(a);
      expect(all).toContain(b);
    });
  });

  describe("detectAll", () => {
    it("returns adapters that detect successfully", async () => {
      registry.register(makeFakeAdapter("found", true));
      registry.register(makeFakeAdapter("missing", false));

      const detected = await registry.detectAll();
      expect(detected).toHaveLength(1);
      expect(detected[0]?.id).toBe("found");
    });

    it("skips adapters that throw during detection", async () => {
      const throwingAdapter = makeFakeAdapter("broken");
      throwingAdapter.detect = async () => {
        throw new Error("detection crashed");
      };
      registry.register(throwingAdapter);
      registry.register(makeFakeAdapter("stable", true));

      const detected = await registry.detectAll();
      expect(detected).toHaveLength(1);
      expect(detected[0]?.id).toBe("stable");
    });

    it("returns empty array when no adapters detect", async () => {
      registry.register(makeFakeAdapter("a", false));
      registry.register(makeFakeAdapter("b", false));

      const detected = await registry.detectAll();
      expect(detected).toEqual([]);
    });

    it("passes cwd to adapter.detect", async () => {
      const detectFn = vi.fn().mockResolvedValue(true);
      const adapter = makeFakeAdapter("with-cwd");
      adapter.detect = detectFn;
      registry.register(adapter);

      await registry.detectAll("/custom/dir");
      expect(detectFn).toHaveBeenCalledWith("/custom/dir");
    });

    it("handles multiple throwing adapters gracefully", async () => {
      const spy = vi.fn();
      for (let i = 0; i < 3; i++) {
        const adapter = makeFakeAdapter(`throw-${i}`);
        adapter.detect = async () => {
          spy();
          throw new Error(`fail-${i}`);
        };
        registry.register(adapter);
      }

      const detected = await registry.detectAll();
      expect(detected).toEqual([]);
      expect(spy).toHaveBeenCalledTimes(3);
    });
  });

  describe("clear", () => {
    it("removes all adapters", () => {
      registry.register(makeFakeAdapter("a"));
      registry.register(makeFakeAdapter("b"));

      registry.clear();

      expect(registry.list()).toEqual([]);
      expect(registry.get("a")).toBeUndefined();
      expect(registry.get("b")).toBeUndefined();
    });

    it("allows re-registration after clear", () => {
      registry.register(makeFakeAdapter("x"));
      registry.clear();
      registry.register(makeFakeAdapter("y"));

      expect(registry.list()).toEqual(["y"]);
      expect(registry.get("x")).toBeUndefined();
      expect(registry.get("y")?.id).toBe("y");
    });
  });
});
