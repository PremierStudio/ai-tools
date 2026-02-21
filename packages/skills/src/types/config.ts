import type { SkillDefinition } from "./definition.js";

export type SkillsConfig = {
  skills: SkillDefinition[];
};

export type GeneratedFile = {
  path: string;
  content: string;
  format: "md" | "json" | "yaml";
};
