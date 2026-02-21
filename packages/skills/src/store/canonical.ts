import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import type { SkillDefinition } from "../types/index.js";

const CANONICAL_DIR = ".ai-tools/skills";

export class CanonicalStore {
  private readonly baseDir: string;

  constructor(cwd?: string) {
    this.baseDir = resolve(cwd ?? process.cwd(), CANONICAL_DIR);
  }

  async write(items: SkillDefinition[]): Promise<string[]> {
    await mkdir(this.baseDir, { recursive: true });
    const paths: string[] = [];
    for (const item of items) {
      const filePath = join(this.baseDir, `${item.id}.json`);
      await writeFile(filePath, JSON.stringify(item, null, 2) + "\n", "utf-8");
      paths.push(filePath);
    }
    return paths;
  }

  async read(id: string): Promise<SkillDefinition | null> {
    const filePath = join(this.baseDir, `${id}.json`);
    if (!existsSync(filePath)) return null;
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as SkillDefinition;
  }

  async list(): Promise<string[]> {
    if (!existsSync(this.baseDir)) return [];
    const files = await readdir(this.baseDir);
    return files.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  }

  async clean(id: string): Promise<boolean> {
    const filePath = join(this.baseDir, `${id}.json`);
    if (!existsSync(filePath)) return false;
    await rm(filePath);
    return true;
  }

  async cleanAll(): Promise<number> {
    const ids = await this.list();
    let count = 0;
    for (const id of ids) {
      if (await this.clean(id)) count++;
    }
    return count;
  }
}
