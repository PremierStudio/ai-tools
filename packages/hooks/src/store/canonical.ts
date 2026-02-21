import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import type { HookDefinition } from "../types/index.js";

const CANONICAL_DIR = ".ai-tools/hooks";
const HOOKS_FILE = "hooks.json";

/**
 * Serializable hook definition for canonical storage.
 * Handlers cannot be serialized to JSON, so the canonical store
 * strips them and stores only the metadata. Full definitions are
 * reconstructed from config at install time.
 */
export type SerializedHookDefinition = Omit<HookDefinition, "handler" | "filter">;

export class CanonicalStore {
  private readonly baseDir: string;

  constructor(cwd?: string) {
    this.baseDir = resolve(cwd ?? process.cwd(), CANONICAL_DIR);
  }

  async write(hooks: HookDefinition[]): Promise<string[]> {
    await mkdir(this.baseDir, { recursive: true });
    const filePath = join(this.baseDir, HOOKS_FILE);
    const serializable: SerializedHookDefinition[] = hooks.map((h) => ({
      id: h.id,
      name: h.name,
      description: h.description,
      events: h.events,
      priority: h.priority,
      phase: h.phase,
      enabled: h.enabled,
    }));
    await writeFile(filePath, JSON.stringify(serializable, null, 2) + "\n", "utf-8");
    return [filePath];
  }

  async read(): Promise<SerializedHookDefinition[]> {
    const filePath = join(this.baseDir, HOOKS_FILE);
    if (!existsSync(filePath)) return [];
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as SerializedHookDefinition[];
  }

  async list(): Promise<string[]> {
    const filePath = join(this.baseDir, HOOKS_FILE);
    if (!existsSync(filePath)) return [];
    return ["hooks"];
  }

  async clean(): Promise<boolean> {
    const filePath = join(this.baseDir, HOOKS_FILE);
    if (!existsSync(filePath)) return false;
    await rm(filePath);
    return true;
  }

  async cleanAll(): Promise<number> {
    return (await this.clean()) ? 1 : 0;
  }
}
