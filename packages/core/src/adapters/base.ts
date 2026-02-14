import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type {
  Adapter,
  AdapterCapabilities,
  GeneratedConfig,
  HookDefinition,
  HookEventType,
} from "../types/index.js";

/**
 * Base adapter class with shared utilities.
 * Tool-specific adapters extend this and implement the abstract methods.
 */
export abstract class BaseAdapter implements Adapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly capabilities: AdapterCapabilities;

  abstract detect(): Promise<boolean>;
  abstract generate(hooks: HookDefinition[]): Promise<GeneratedConfig[]>;
  abstract mapEvent(event: HookEventType): string[];
  abstract mapNativeEvent(nativeEvent: string): HookEventType[];

  /**
   * Default install: write generated configs to disk.
   */
  async install(configs: GeneratedConfig[]): Promise<void> {
    for (const config of configs) {
      const fullPath = resolve(process.cwd(), config.path);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, config.content, "utf-8");
    }
  }

  /**
   * Default uninstall: remove generated config files.
   */
  async uninstall(): Promise<void> {
    // Subclasses should override with specific file paths
  }

  // ── Utility Methods ───────────────────────────────────────

  protected async fileExists(path: string): Promise<boolean> {
    return existsSync(resolve(process.cwd(), path));
  }

  protected async readJsonFile<T>(path: string): Promise<T | null> {
    const fullPath = resolve(process.cwd(), path);
    if (!existsSync(fullPath)) return null;
    const content = await readFile(fullPath, "utf-8");
    return JSON.parse(content) as T;
  }

  protected async writeJsonFile(path: string, data: unknown): Promise<void> {
    const fullPath = resolve(process.cwd(), path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  }

  protected async removeFile(path: string): Promise<void> {
    const fullPath = resolve(process.cwd(), path);
    if (existsSync(fullPath)) {
      await rm(fullPath);
    }
  }

  /**
   * Check if a CLI command exists on PATH.
   */
  protected async commandExists(command: string): Promise<boolean> {
    const { exec } = await import("node:child_process");
    return new Promise((resolve) => {
      exec(`which ${command}`, (error) => {
        resolve(!error);
      });
    });
  }
}
