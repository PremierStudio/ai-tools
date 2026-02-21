import type { MCPServerDefinition, GeneratedFile } from "../types/index.js";
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export abstract class BaseMCPAdapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly nativeSupport: boolean;
  abstract readonly configPath: string;

  /** CLI binary name for detection (e.g., "claude", "cursor"). Override in subclass. */
  readonly command?: string;

  abstract generate(servers: MCPServerDefinition[]): Promise<GeneratedFile[]>;
  abstract import(cwd?: string): Promise<MCPServerDefinition[]>;

  async detect(cwd?: string): Promise<boolean> {
    const dir = cwd ?? process.cwd();
    const hasConfig = existsSync(resolve(dir, this.configPath));
    if (hasConfig) return true;
    if (this.command) return this.commandExists(this.command);
    return false;
  }

  protected async commandExists(command: string): Promise<boolean> {
    const { exec } = await import("node:child_process");
    return new Promise((ok) => {
      exec(`which ${command}`, (error: Error | null) => {
        ok(!error);
      });
    });
  }

  async install(files: GeneratedFile[], cwd?: string): Promise<void> {
    const dir = cwd ?? process.cwd();
    for (const file of files) {
      const fullPath = resolve(dir, file.path);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, file.content, "utf-8");
    }
  }

  async uninstall(cwd?: string): Promise<void> {
    const dir = cwd ?? process.cwd();
    const fullPath = resolve(dir, this.configPath);
    if (existsSync(fullPath)) {
      await rm(fullPath);
    }
  }

  protected async readJsonFile<T>(path: string): Promise<T | null> {
    const fullPath = resolve(process.cwd(), path);
    if (!existsSync(fullPath)) return null;
    const content = await readFile(fullPath, "utf-8");
    return JSON.parse(content) as T;
  }
}
