import type { AgentDefinition } from "./definition.js";

export type AgentsConfig = {
  agents: AgentDefinition[];
};

export type GeneratedFile = {
  path: string;
  content: string;
  format: "md" | "json" | "yaml";
};
