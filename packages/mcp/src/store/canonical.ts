import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import type { MCPServerDefinition } from "../types/index.js";

const CANONICAL_DIR = ".ai-tools/mcp";
const SERVERS_FILE = "servers.json";

export class CanonicalStore {
  private readonly baseDir: string;

  constructor(cwd?: string) {
    this.baseDir = resolve(cwd ?? process.cwd(), CANONICAL_DIR);
  }

  async write(servers: MCPServerDefinition[]): Promise<string[]> {
    await mkdir(this.baseDir, { recursive: true });
    const filePath = join(this.baseDir, SERVERS_FILE);
    await writeFile(filePath, JSON.stringify(servers, null, 2) + "\n", "utf-8");
    return [filePath];
  }

  async read(): Promise<MCPServerDefinition[]> {
    const filePath = join(this.baseDir, SERVERS_FILE);
    if (!existsSync(filePath)) return [];
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as MCPServerDefinition[];
  }

  async list(): Promise<string[]> {
    const filePath = join(this.baseDir, SERVERS_FILE);
    if (!existsSync(filePath)) return [];
    return ["servers"];
  }

  async clean(): Promise<boolean> {
    const filePath = join(this.baseDir, SERVERS_FILE);
    if (!existsSync(filePath)) return false;
    await rm(filePath);
    return true;
  }

  async cleanAll(): Promise<number> {
    return (await this.clean()) ? 1 : 0;
  }
}
