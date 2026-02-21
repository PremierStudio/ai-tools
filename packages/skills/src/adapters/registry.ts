import type { BaseSkillAdapter } from "./base.js";

class SkillAdapterRegistry {
  private adapters: Map<string, BaseSkillAdapter> = new Map();

  register(adapter: BaseSkillAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): BaseSkillAdapter | undefined {
    return this.adapters.get(id);
  }

  list(): string[] {
    return [...this.adapters.keys()];
  }

  async detectAll(cwd?: string): Promise<BaseSkillAdapter[]> {
    const detected: BaseSkillAdapter[] = [];

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
  var __premierstudio_skills_registry: SkillAdapterRegistry | undefined;
}

export const registry = (globalThis.__premierstudio_skills_registry ??= new SkillAdapterRegistry());
