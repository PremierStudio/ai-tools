import type { BaseSessionAdapter } from "./base.js";

class SessionAdapterRegistry {
  private adapters: Map<string, BaseSessionAdapter> = new Map();

  register(adapter: BaseSessionAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): BaseSessionAdapter | undefined {
    return this.adapters.get(id);
  }

  list(): string[] {
    return [...this.adapters.keys()];
  }

  async detectAll(): Promise<BaseSessionAdapter[]> {
    const detected: BaseSessionAdapter[] = [];

    for (const adapter of this.adapters.values()) {
      try {
        const found = await adapter.detect();
        if (found) {
          detected.push(adapter);
        }
      } catch {
        // Detection failed, skip
      }
    }

    return detected;
  }

  clear(): void {
    this.adapters.clear();
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __itz4blitz_ai_sessions_registry: SessionAdapterRegistry | undefined;
}

export const registry = (globalThis.__itz4blitz_ai_sessions_registry ??=
  new SessionAdapterRegistry());
