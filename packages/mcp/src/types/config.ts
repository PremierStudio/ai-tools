import type { MCPServerDefinition } from "./definition.js";

export type MCPConfig = {
  servers: MCPServerDefinition[];
};

export type GeneratedFile = {
  path: string;
  content: string;
  format: "json" | "yaml" | "jsonc";
};
