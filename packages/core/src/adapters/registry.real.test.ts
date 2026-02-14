import { describe, it, expect, beforeEach, vi } from "vitest";
import { registry } from "./registry.js";
import type {
  Adapter,
  AdapterCapabilities,
  GeneratedConfig,
  HookDefinition,
  HookEventType,
} from "../types/index.js";

function makeFakeAdapter(id: string, detects: boolean = true): Adapter {
  const caps: AdapterCapabilities = {
    beforeHooks: true,
    afterHooks: true,
    mcp: false,
    configFile: true,
    supportedEvents: [],
    blockableEvents: [],
  };
  return {
    id,
    name: `${id} Adapter`,
    version: "1.0",
    capabilities: caps,
    detect: async () => detects,
    generate: async (hooks: HookDefinition[]) => {
      void hooks;
      return [] as GeneratedConfig[];
    },
    install: async (configs: GeneratedConfig[]) => {
      void configs;
    },
    uninstall: async () => {},
    mapEvent: (event: HookEventType) => {
      void event;
      return [] as string[];
    },
    mapNativeEvent: (nativeEvent: string) => {
      void nativeEvent;
      return [] as HookEventType[];
    },
  };
}

describe("Real AdapterRegistry singleton", () => {
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

  describe("registerFactory", () => {
    it("lazily creates adapter on first get()", () => {
      let created = false;
      registry.registerFactory("lazy", () => {
        created = true;
        return makeFakeAdapter("lazy");
      });

      expect(created).toBe(false);
      const adapter = registry.get("lazy");
      expect(created).toBe(true);
      expect(adapter?.id).toBe("lazy");
    });

    it("caches the factory result on subsequent get() calls", () => {
      let callCount = 0;
      registry.registerFactory("cached", () => {
        callCount++;
        return makeFakeAdapter("cached");
      });

      const first = registry.get("cached");
      const second = registry.get("cached");
      expect(callCount).toBe(1);
      expect(first).toBe(second);
    });

    it("prefers a directly registered adapter over a factory", () => {
      const direct = makeFakeAdapter("priority");
      registry.register(direct);
      registry.registerFactory("priority", () => makeFakeAdapter("priority-from-factory"));

      expect(registry.get("priority")).toBe(direct);
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

    it("includes factory IDs", () => {
      registry.register(makeFakeAdapter("direct"));
      registry.registerFactory("lazy", () => makeFakeAdapter("lazy"));
      expect(registry.list().toSorted()).toEqual(["direct", "lazy"]);
    });

    it("deduplicates when adapter and factory share the same id", () => {
      registry.register(makeFakeAdapter("shared"));
      registry.registerFactory("shared", () => makeFakeAdapter("shared"));
      expect(registry.list()).toEqual(["shared"]);
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

    it("resolves factories during detection", async () => {
      registry.registerFactory("factory-detect", () => makeFakeAdapter("factory-detect", true));

      const detected = await registry.detectAll();
      expect(detected).toHaveLength(1);
      expect(detected[0]?.id).toBe("factory-detect");
    });

    it("returns empty array when no adapters detect", async () => {
      registry.register(makeFakeAdapter("a", false));
      registry.register(makeFakeAdapter("b", false));

      const detected = await registry.detectAll();
      expect(detected).toEqual([]);
    });

    it("handles a mix of direct adapters and factories", async () => {
      registry.register(makeFakeAdapter("direct-yes", true));
      registry.register(makeFakeAdapter("direct-no", false));
      registry.registerFactory("factory-yes", () => makeFakeAdapter("factory-yes", true));
      registry.registerFactory("factory-no", () => makeFakeAdapter("factory-no", false));

      const detected = await registry.detectAll();
      const ids = detected.map((a) => a.id).toSorted();
      expect(ids).toEqual(["direct-yes", "factory-yes"]);
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
    it("removes all adapters and factories", () => {
      registry.register(makeFakeAdapter("a"));
      registry.register(makeFakeAdapter("b"));
      registry.registerFactory("c", () => makeFakeAdapter("c"));

      registry.clear();

      expect(registry.list()).toEqual([]);
      expect(registry.get("a")).toBeUndefined();
      expect(registry.get("b")).toBeUndefined();
      expect(registry.get("c")).toBeUndefined();
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
