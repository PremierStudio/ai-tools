import "@premierstudio/ai-agents/adapters/all";
import "@premierstudio/ai-hooks/adapters/all";
import "@premierstudio/ai-mcp/adapters/all";
import "@premierstudio/ai-rules/adapters/all";
import "@premierstudio/ai-skills/adapters/all";

import { registry as agentsRegistry } from "@premierstudio/ai-agents";
import { registry as hooksRegistry } from "@premierstudio/ai-hooks";
import { registry as mcpRegistry } from "@premierstudio/ai-mcp";
import { registry as rulesRegistry } from "@premierstudio/ai-rules";
import { registry as skillsRegistry } from "@premierstudio/ai-skills";

import { buildPluginInstallPlan } from "./plan.js";
import type {
  AiPluginDefinition,
  InstalledPluginArtifact,
  InstallPluginOptions,
  InstallPluginResult,
  PluginEngine,
} from "./types.js";

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths)];
}

async function installEngine(
  plugin: AiPluginDefinition,
  engine: PluginEngine,
  toolId: string,
): Promise<string[]> {
  switch (engine) {
    case "mcp": {
      const adapter = mcpRegistry.get(toolId);
      if (!adapter) throw new Error(`Missing MCP adapter for ${toolId}`);
      const files = await adapter.generate(plugin.mcpServers ?? []);
      await adapter.install(files);
      return files.map((file) => file.path);
    }
    case "skills": {
      const adapter = skillsRegistry.get(toolId);
      if (!adapter) throw new Error(`Missing skills adapter for ${toolId}`);
      const files = await adapter.generate(plugin.skills ?? []);
      await adapter.install(files);
      return files.map((file) => file.path);
    }
    case "rules": {
      const adapter = rulesRegistry.get(toolId);
      if (!adapter) throw new Error(`Missing rules adapter for ${toolId}`);
      const files = await adapter.generate(plugin.rules ?? []);
      await adapter.install(files);
      return files.map((file) => file.path);
    }
    case "agents": {
      const adapter = agentsRegistry.get(toolId);
      if (!adapter) throw new Error(`Missing agents adapter for ${toolId}`);
      const files = await adapter.generate(plugin.agents ?? []);
      await adapter.install(files);
      return files.map((file) => file.path);
    }
    case "hooks": {
      const adapter = hooksRegistry.get(toolId);
      if (!adapter) throw new Error(`Missing hooks adapter for ${toolId}`);
      const files = await adapter.generate(plugin.hooks ?? []);
      await adapter.install(files);
      return files.map((file) => file.path);
    }
  }
}

export async function installPluginBundle(
  plugin: AiPluginDefinition,
  options: InstallPluginOptions = {},
): Promise<InstallPluginResult> {
  const plan = await buildPluginInstallPlan(plugin, options);
  const installed: InstalledPluginArtifact[] = [];
  const failed: InstallPluginResult["failed"] = [];

  if (options.dryRun) {
    return { plan, installed, failed };
  }

  for (const target of plan.targets) {
    for (const engine of target.engines) {
      if (engine.status !== "ready") continue;
      try {
        const filePaths = uniquePaths(await installEngine(plugin, engine.engine, target.toolId));
        installed.push({
          toolId: target.toolId,
          toolName: target.toolName,
          engine: engine.engine,
          filePaths,
        });
      } catch (error) {
        failed.push({
          toolId: target.toolId,
          toolName: target.toolName,
          engine: engine.engine,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return { plan, installed, failed };
}
