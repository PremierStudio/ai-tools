import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import type { AiToolsConfig, AiToolsMode } from "./types.js";

const CONFIG_FILE = ".ai-tools/config.json";

export async function readConfig(cwd?: string): Promise<AiToolsConfig | null> {
  const filePath = resolve(cwd ?? process.cwd(), CONFIG_FILE);
  if (!existsSync(filePath)) return null;
  const content = await readFile(filePath, "utf-8");
  return JSON.parse(content) as AiToolsConfig;
}

export async function writeConfig(config: AiToolsConfig, cwd?: string): Promise<void> {
  const filePath = resolve(cwd ?? process.cwd(), CONFIG_FILE);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export async function getMode(cwd?: string): Promise<AiToolsMode> {
  const config = await readConfig(cwd);
  return config?.mode ?? "direct";
}

export async function isCanonical(cwd?: string): Promise<boolean> {
  const mode = await getMode(cwd);
  return mode === "canonical";
}
