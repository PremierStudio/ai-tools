import type { Adapter, AdapterFactory } from "../types/index.js";

/**
 * Global adapter registry.
 * Adapters register themselves when imported, or can be manually added.
 */
class AdapterRegistry {
  private adapters: Map<string, Adapter> = new Map();
  private factories: Map<string, AdapterFactory> = new Map();

  /**
   * Register an adapter instance.
   */
  register(adapter: Adapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  /**
   * Register an adapter factory for lazy instantiation.
   */
  registerFactory(id: string, factory: AdapterFactory): void {
    this.factories.set(id, factory);
  }

  /**
   * Get a registered adapter by ID.
   */
  get(id: string): Adapter | undefined {
    const existing = this.adapters.get(id);
    if (existing) return existing;

    // Try factory
    const factory = this.factories.get(id);
    if (factory) {
      const adapter = factory();
      this.adapters.set(id, adapter);
      return adapter;
    }

    return undefined;
  }

  /**
   * Get all registered adapter IDs.
   */
  list(): string[] {
    return [...new Set([...this.adapters.keys(), ...this.factories.keys()])];
  }

  /**
   * Detect which tools are available in the current environment.
   * Returns adapters that successfully detect their tool.
   */
  async detectAll(): Promise<Adapter[]> {
    const detected: Adapter[] = [];

    for (const id of this.list()) {
      const adapter = this.get(id);
      if (adapter) {
        try {
          const found = await adapter.detect();
          if (found) {
            detected.push(adapter);
          }
        } catch {
          // Detection failed, skip this adapter
        }
      }
    }

    return detected;
  }

  /**
   * Clear the registry. Useful for testing.
   */
  clear(): void {
    this.adapters.clear();
    this.factories.clear();
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __premierstudio_ai_hooks_registry: AdapterRegistry | undefined;
}

export const registry = (globalThis.__premierstudio_ai_hooks_registry ??= new AdapterRegistry());
