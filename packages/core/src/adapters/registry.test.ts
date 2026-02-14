import { describe, it, expect, beforeEach } from "vitest";
import type {
  Adapter,
  AdapterCapabilities,
  GeneratedConfig,
  HookDefinition,
  HookEventType,
} from "../types/index.js";

// Inline registry class to avoid import side effects from the singleton
class TestAdapterRegistry {
  private adapters: Map<string, Adapter> = new Map();
  private factories: Map<string, () => Adapter> = new Map();

  register(adapter: Adapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  registerFactory(id: string, factory: () => Adapter): void {
    this.factories.set(id, factory);
  }

  get(id: string): Adapter | undefined {
    const existing = this.adapters.get(id);
    if (existing) return existing;
    const factory = this.factories.get(id);
    if (factory) {
      const adapter = factory();
      this.adapters.set(id, adapter);
      return adapter;
    }
    return undefined;
  }

  list(): string[] {
    return [...new Set([...this.adapters.keys(), ...this.factories.keys()])];
  }

  async detectAll(): Promise<Adapter[]> {
    const detected: Adapter[] = [];
    for (const id of this.list()) {
      const adapter = this.get(id);
      if (adapter) {
        try {
          const found = await adapter.detect();
          if (found) detected.push(adapter);
        } catch {
          // skip
        }
      }
    }
    return detected;
  }

  clear(): void {
    this.adapters.clear();
    this.factories.clear();
  }
}

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
    generate: async (_hooks: HookDefinition[]) => [] as GeneratedConfig[],
    install: async (_configs: GeneratedConfig[]) => {},
    uninstall: async () => {},
    mapEvent: (_event: HookEventType) => [] as string[],
    mapNativeEvent: (_nativeEvent: string) => [] as HookEventType[],
  };
}

describe("AdapterRegistry", () => {
  let registry: TestAdapterRegistry;

  beforeEach(() => {
    registry = new TestAdapterRegistry();
  });

  describe("register / get", () => {
    it("registers and retrieves an adapter", () => {
      const adapter = makeFakeAdapter("claude-code");
      registry.register(adapter);
      expect(registry.get("claude-code")).toBe(adapter);
    });

    it("returns undefined for unknown adapter", () => {
      expect(registry.get("nonexistent")).toBeUndefined();
    });
  });

  describe("registerFactory", () => {
    it("lazily creates adapter on first get", () => {
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

    it("caches factory result on subsequent gets", () => {
      let callCount = 0;
      registry.registerFactory("cached", () => {
        callCount++;
        return makeFakeAdapter("cached");
      });

      registry.get("cached");
      registry.get("cached");
      expect(callCount).toBe(1);
    });
  });

  describe("list", () => {
    it("lists all registered adapter IDs", () => {
      registry.register(makeFakeAdapter("a"));
      registry.register(makeFakeAdapter("b"));
      expect(registry.list().toSorted()).toEqual(["a", "b"]);
    });

    it("includes factory IDs", () => {
      registry.register(makeFakeAdapter("a"));
      registry.registerFactory("b", () => makeFakeAdapter("b"));
      expect(registry.list().toSorted()).toEqual(["a", "b"]);
    });

    it("deduplicates when adapter and factory share ID", () => {
      registry.register(makeFakeAdapter("a"));
      registry.registerFactory("a", () => makeFakeAdapter("a"));
      expect(registry.list()).toEqual(["a"]);
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
        throw new Error("detection failed");
      };
      registry.register(throwingAdapter);
      registry.register(makeFakeAdapter("stable", true));
      const detected = await registry.detectAll();
      expect(detected).toHaveLength(1);
      expect(detected[0]?.id).toBe("stable");
    });
  });

  describe("clear", () => {
    it("removes all adapters and factories", () => {
      registry.register(makeFakeAdapter("a"));
      registry.registerFactory("b", () => makeFakeAdapter("b"));
      registry.clear();
      expect(registry.list()).toEqual([]);
      expect(registry.get("a")).toBeUndefined();
    });
  });
});
