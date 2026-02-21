import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { AiHooksConfig } from "../types/index.js";

const CONFIG_FILENAMES = [
  "ai-hooks.config.ts",
  "ai-hooks.config.js",
  "ai-hooks.config.mjs",
  "ai-hooks.config.mts",
];

/**
 * Find the ai-hooks config file in the given directory.
 */
export function findConfigFile(cwd: string = process.cwd()): string | null {
  for (const name of CONFIG_FILENAMES) {
    const fullPath = resolve(cwd, name);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

/**
 * Load and resolve an ai-hooks config from a file path.
 *
 * Supports both .ts and .js files. For TypeScript files,
 * requires a runtime that supports TS (Node 22+ with --experimental-strip-types,
 * tsx, or bun).
 */
export async function loadConfig(configPath?: string, cwd?: string): Promise<AiHooksConfig> {
  const resolvedPath = configPath ?? findConfigFile(cwd);

  if (!resolvedPath) {
    throw new ConfigNotFoundError(cwd ?? process.cwd());
  }

  if (!existsSync(resolvedPath)) {
    throw new ConfigNotFoundError(resolvedPath);
  }

  const fileUrl = pathToFileURL(resolve(resolvedPath)).href;
  const mod = await import(fileUrl);

  const config: AiHooksConfig = mod.default ?? mod;

  if (!config.hooks || !Array.isArray(config.hooks)) {
    throw new ConfigValidationError(
      "Config must have a `hooks` array. Did you forget to use `defineConfig()`?",
    );
  }

  // Resolve extends (recursively merge presets)
  if (config.extends && config.extends.length > 0) {
    const mergedHooks = [...config.extends.flatMap((preset) => preset.hooks), ...config.hooks];
    return { ...config, hooks: mergedHooks, extends: undefined };
  }

  return config;
}

export class ConfigNotFoundError extends Error {
  constructor(searchPath: string) {
    super(
      `No ai-hooks config found. Searched in: ${searchPath}\n` +
        `Create an ai-hooks.config.ts file or run: ai-hooks init`,
    );
    this.name = "ConfigNotFoundError";
  }
}

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigValidationError";
  }
}
