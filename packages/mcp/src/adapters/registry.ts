import type { BaseMCPAdapter } from "./base.js";

class MCPAdapterRegistry {
  private adapters: Map<string, BaseMCPAdapter> = new Map();

  register(adapter: BaseMCPAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): BaseMCPAdapter | undefined {
    return this.adapters.get(id);
  }

  list(): string[] {
    return [...this.adapters.keys()];
  }

  getAll(): BaseMCPAdapter[] {
    return [...this.adapters.values()];
  }

  async detectAll(cwd?: string): Promise<BaseMCPAdapter[]> {
    const detected: BaseMCPAdapter[] = [];
    for (const adapter of this.adapters.values()) {
      try {
        if (await adapter.detect(cwd)) detected.push(adapter);
      } catch {
        /* skip */
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
  var __premierstudio_mcp_registry: MCPAdapterRegistry | undefined;
}

export const registry = (globalThis.__premierstudio_mcp_registry ??= new MCPAdapterRegistry());
