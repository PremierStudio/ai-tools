export type EngineStatus = {
  engine: string;
  detected: boolean;
  configured: boolean;
  error?: string;
};

/**
 * Known engine names and their config file globs.
 */
const ENGINES: Record<string, { configFiles: string[] }> = {
  hooks: { configFiles: ["ai-hooks.config.ts", "ai-hooks.config.js"] },
  mcp: { configFiles: ["ai-mcp.config.ts", "ai-mcp.config.js"] },
  skills: { configFiles: ["ai-skills.config.ts", "ai-skills.config.js"] },
  agents: { configFiles: ["ai-agents.config.ts", "ai-agents.config.js"] },
  rules: { configFiles: ["ai-rules.config.ts", "ai-rules.config.js"] },
};

/**
 * Get the status of each engine's configuration.
 * Checks for config files in the current working directory.
 */
export async function getEngineStatus(): Promise<EngineStatus[]> {
  const { existsSync } = await import("node:fs");
  const { resolve } = await import("node:path");

  const cwd = process.cwd();
  const results: EngineStatus[] = [];

  for (const [engine, meta] of Object.entries(ENGINES)) {
    let configured = false;

    for (const file of meta.configFiles) {
      const fullPath = resolve(cwd, file);
      if (existsSync(fullPath)) {
        configured = true;
        break;
      }
    }

    results.push({
      engine,
      detected: configured,
      configured,
    });
  }

  return results;
}

/**
 * Format an engine status entry into a display row.
 */
export function formatEngineRow(engine: string, status: EngineStatus): string {
  void engine;
  const icon = status.configured ? "\u2713" : "\u2717";
  const state = status.configured ? "configured" : "not configured";
  const errorSuffix = status.error ? ` (${status.error})` : "";
  return `${icon} ${status.engine.padEnd(12)} ${state}${errorSuffix}`;
}
