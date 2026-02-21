import type { BaseAgentAdapter } from "./base.js";

class AgentAdapterRegistry {
  private adapters: Map<string, BaseAgentAdapter> = new Map();

  register(adapter: BaseAgentAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): BaseAgentAdapter | undefined {
    return this.adapters.get(id);
  }

  list(): string[] {
    return [...this.adapters.keys()];
  }

  getAll(): BaseAgentAdapter[] {
    return [...this.adapters.values()];
  }

  async detectAll(cwd?: string): Promise<BaseAgentAdapter[]> {
    const detected: BaseAgentAdapter[] = [];
    for (const adapter of this.adapters.values()) {
      try {
        if (await adapter.detect(cwd)) {
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
  var __premierstudio_agents_registry: AgentAdapterRegistry | undefined;
}

export const registry = (globalThis.__premierstudio_agents_registry ??= new AgentAdapterRegistry());
