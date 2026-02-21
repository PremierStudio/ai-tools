export { defineRulesConfig } from "./config/index.js";
export { registry } from "./adapters/index.js";
export { BaseRuleAdapter } from "./adapters/index.js";

export type { RuleScope, RuleDefinition, RulesConfig, GeneratedFile } from "./types/index.js";
export { CanonicalStore, Linker } from "./store/index.js";
export type { LinkStatus } from "./store/index.js";
