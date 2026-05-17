import { BaseAgentAdapter, registry } from "./index.js";
import type { AgentDefinition, GeneratedFile } from "../types/index.js";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";

export class CodexAgentAdapter extends BaseAgentAdapter {
  readonly id = "codex";
  readonly name = "Codex";
  readonly nativeSupport = true;
  readonly configDir = ".codex/agents";
  override readonly command = "codex";

  async generate(agents: AgentDefinition[]): Promise<GeneratedFile[]> {
    return agents.map((agent) => ({
      path: `${this.configDir}/${agent.id}.toml`,
      content: formatAgent(agent),
      format: "toml" as const,
    }));
  }

  async import(cwd?: string): Promise<AgentDefinition[]> {
    const dir = cwd ?? process.cwd();
    const agentsDir = resolve(dir, this.configDir);
    if (!existsSync(agentsDir)) return [];

    const files = await readdir(agentsDir);
    const agents: AgentDefinition[] = [];

    for (const file of files) {
      if (!file.endsWith(".toml")) continue;
      const content = await readFile(resolve(agentsDir, file), "utf-8");
      agents.push(parseAgent(basename(file, ".toml"), content));
    }

    return agents;
  }
}

function formatAgent(agent: AgentDefinition): string {
  const lines = [
    `name = ${tomlString(agent.name)}`,
    `description = ${tomlString(agent.description ?? agent.name)}`,
    `developer_instructions = ${tomlString(agent.instructions)}`,
  ];

  if (agent.model) {
    lines.push(`model = ${tomlString(agent.model)}`);
  }

  return `${lines.join("\n")}\n`;
}

function parseAgent(id: string, raw: string): AgentDefinition {
  const fields = parseTopLevelStrings(raw);
  return {
    id,
    name: fields.name ?? id,
    description: fields.description,
    instructions: fields.developer_instructions ?? "",
    model: fields.model,
  };
}

function parseTopLevelStrings(raw: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = /^(?<key>[A-Za-z0-9_.-]+)\s*=\s*(?<value>".*")\s*$/.exec(trimmed);
    if (!match?.groups) continue;

    const key = match.groups.key;
    const value = match.groups.value;
    if (!key || !value) continue;

    try {
      fields[key] = JSON.parse(value) as string;
    } catch {
      // Ignore malformed fields and keep parsing the rest of the agent file.
    }
  }
  return fields;
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

const adapter = new CodexAgentAdapter();
registry.register(adapter);
export default adapter;
