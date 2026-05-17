import type { AiPluginDefinition } from "./types.js";

export async function loadPluginConfig(configPath?: string): Promise<AiPluginDefinition> {
  const path = configPath ?? "ai-plugin.config.ts";
  const { existsSync } = await import("node:fs");

  if (!existsSync(path)) {
    throw new Error(`Plugin config not found: ${path}`);
  }

  const { resolve } = await import("node:path");
  const fullPath = resolve(process.cwd(), path);
  const mod = await import(fullPath);
  return mod.default as AiPluginDefinition;
}
