import { BaseAgentAdapter } from "./base.js";
import { registry } from "./registry.js";
import type { AgentDefinition, GeneratedFile } from "../types/index.js";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

class RooCodeAgentAdapter extends BaseAgentAdapter {
  readonly id = "roo-code";
  readonly name = "Roo Code";
  readonly nativeSupport = true;
  readonly configDir = ".roo";

  async generate(agents: AgentDefinition[]): Promise<GeneratedFile[]> {
    if (agents.length === 0) return [];

    const customModes = agents.map((agent) => ({
      slug: agent.id,
      name: agent.name,
      roleDefinition: agent.instructions,
      groups: agent.tools ?? ["read", "edit", "command"],
    }));

    return [
      {
        path: ".roomodes",
        content: JSON.stringify({ customModes }, null, 2) + "\n",
        format: "json" as const,
      },
    ];
  }

  async import(cwd?: string): Promise<AgentDefinition[]> {
    const dir = cwd ?? process.cwd();
    const filePath = resolve(dir, ".roomodes");
    if (!existsSync(filePath)) return [];

    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as {
      customModes?: Array<{
        slug: string;
        name: string;
        roleDefinition: string;
        groups?: string[];
      }>;
    };

    return (data.customModes ?? []).map((mode) => ({
      id: mode.slug,
      name: mode.name,
      instructions: mode.roleDefinition,
      tools: mode.groups,
    }));
  }

  override async detect(cwd?: string): Promise<boolean> {
    const dir = cwd ?? process.cwd();
    return existsSync(resolve(dir, ".roomodes"));
  }
}

const adapter = new RooCodeAgentAdapter();
registry.register(adapter);

export { RooCodeAgentAdapter };
export default adapter;
