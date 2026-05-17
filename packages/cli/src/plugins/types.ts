import type { AgentDefinition } from "@premierstudio/ai-agents";
import type { HookDefinition } from "@premierstudio/ai-hooks";
import type { MCPServerDefinition } from "@premierstudio/ai-mcp";
import type { RuleDefinition } from "@premierstudio/ai-rules";
import type { SkillDefinition } from "@premierstudio/ai-skills";

export type PluginEngine = "mcp" | "skills" | "rules" | "agents" | "hooks";

export type PluginToolId = string;

export type PluginTargetSelection = {
  include?: PluginToolId[];
  exclude?: PluginToolId[];
};

export type AiPluginDefinition = {
  id: string;
  name: string;
  version: string;
  description?: string;
  targets?: PluginTargetSelection;
  mcpServers?: MCPServerDefinition[];
  skills?: SkillDefinition[];
  rules?: RuleDefinition[];
  agents?: AgentDefinition[];
  hooks?: HookDefinition[];
};

export type PluginHostKind = "desktop" | "cli" | "hybrid";

export type PluginHostInfo = {
  id: PluginToolId;
  name: string;
  kind: PluginHostKind;
  nativeEngineSupport: Record<PluginEngine, boolean>;
  supportsInteractiveApps: boolean;
  supportsNativeBundles: boolean;
  notes: string;
};

export type EnginePlanStatus =
  | "ready"
  | "not-requested"
  | "host-unsupported"
  | "adapter-missing"
  | "not-detected";

export type EngineInstallPlan = {
  engine: PluginEngine;
  requested: boolean;
  nativeHostSupport: boolean;
  adapterAvailable: boolean;
  detected: boolean;
  status: EnginePlanStatus;
};

export type PluginTargetPlan = {
  toolId: PluginToolId;
  toolName: string;
  detected: boolean;
  selected: boolean;
  installable: boolean;
  host: PluginHostInfo;
  engines: EngineInstallPlan[];
};

export type PluginInstallPlan = {
  plugin: Pick<AiPluginDefinition, "id" | "name" | "version">;
  requestedEngines: PluginEngine[];
  targets: PluginTargetPlan[];
};

export type BuildPluginPlanOptions = {
  tools?: PluginToolId[];
  force?: boolean;
  detectedToolsOverride?: PluginToolId[];
};

export type InstalledPluginArtifact = {
  toolId: PluginToolId;
  toolName: string;
  engine: PluginEngine;
  filePaths: string[];
};

export type FailedPluginArtifact = {
  toolId: PluginToolId;
  toolName: string;
  engine: PluginEngine;
  error: string;
};

export type InstallPluginOptions = BuildPluginPlanOptions & {
  dryRun?: boolean;
};

export type InstallPluginResult = {
  plan: PluginInstallPlan;
  installed: InstalledPluginArtifact[];
  failed: FailedPluginArtifact[];
};
