import type { BaseRuleAdapter } from "./base.js";

class RuleAdapterRegistry {
  private adapters: Map<string, BaseRuleAdapter> = new Map();

  register(adapter: BaseRuleAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): BaseRuleAdapter | undefined {
    return this.adapters.get(id);
  }

  list(): string[] {
    return [...this.adapters.keys()];
  }

  getAll(): BaseRuleAdapter[] {
    return [...this.adapters.values()];
  }

  async detectAll(cwd?: string): Promise<BaseRuleAdapter[]> {
    const detected: BaseRuleAdapter[] = [];
    for (const adapter of this.adapters.values()) {
      try {
        const found = await adapter.detect(cwd);
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
  var __premierstudio_rules_registry: RuleAdapterRegistry | undefined;
}

export const registry = (globalThis.__premierstudio_rules_registry ??= new RuleAdapterRegistry());
