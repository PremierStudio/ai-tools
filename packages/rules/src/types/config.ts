import type { RuleDefinition } from "./definition.js";

export type RulesConfig = {
  rules: RuleDefinition[];
};

export type GeneratedFile = {
  path: string;
  content: string;
  format: "md" | "json" | "yaml";
};
