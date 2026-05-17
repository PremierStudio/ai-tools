export { run } from "./cli/index.js";
export { definePlugin } from "./plugins/define.js";
export { buildPluginInstallPlan } from "./plugins/plan.js";
export { installPluginBundle } from "./plugins/install.js";
export { KNOWN_PLUGIN_HOSTS, getPluginHostInfo } from "./plugins/hosts.js";

export const ENGINE_NAMES = ["hooks", "mcp", "skills", "agents", "rules", "plugins"] as const;

export type EngineName = (typeof ENGINE_NAMES)[number];
export type {
  AiPluginDefinition,
  BuildPluginPlanOptions,
  EngineInstallPlan,
  InstallPluginOptions,
  InstallPluginResult,
  PluginEngine,
  PluginHostInfo,
  PluginInstallPlan,
  PluginTargetPlan,
  PluginTargetSelection,
  PluginToolId,
} from "./plugins/types.js";
