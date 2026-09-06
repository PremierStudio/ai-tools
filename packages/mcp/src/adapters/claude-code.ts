import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { BaseMCPAdapter } from "./base.js";
import { registry } from "./registry.js";
import type { GeneratedFile, MCPServerDefinition } from "../types/index.js";
import {
  encodeMcpServersFile,
  fromMcpServersMap,
  mergeMcpServersJson,
  type McpServersMap,
} from "./mcp-servers-json.js";

class ClaudeCodeMCPAdapter extends BaseMCPAdapter {
  readonly id = "claude-code";
  readonly name = "Claude Code";
  readonly nativeSupport = true;
  readonly configPath = ".mcp.json";
  readonly userConfigPath = `${homedir()}/.claude.json`;
  readonly command = "claude";

  async generate(servers: MCPServerDefinition[]): Promise<GeneratedFile[]> {
    return [
      {
        path: this.configPath,
        content: encodeMcpServersFile(servers),
        format: "json",
      },
    ];
  }

  async import(cwd?: string): Promise<MCPServerDefinition[]> {
    const dir = cwd ?? process.cwd();
    return this.readMcpServers(resolve(dir, this.configPath));
  }

  override async importUser(): Promise<MCPServerDefinition[]> {
    return this.readMcpServers(this.userConfigPath);
  }

  override async install(files: GeneratedFile[], cwd?: string): Promise<void> {
    const dir = cwd ?? process.cwd();
    for (const file of files) {
      const fullPath = isAbsolute(file.path) ? file.path : resolve(dir, file.path);
      await mkdir(dirname(fullPath), { recursive: true });
      let content = file.content;
      if (existsSync(fullPath)) {
        content = mergeMcpServersJson(await readFile(fullPath, "utf-8"), file.content);
      }
      await writeFile(fullPath, content, "utf-8");
    }
  }

  private async readMcpServers(fullPath: string): Promise<MCPServerDefinition[]> {
    if (!existsSync(fullPath)) return [];
    const data = JSON.parse(await readFile(fullPath, "utf-8")) as { mcpServers?: McpServersMap };
    return fromMcpServersMap(data.mcpServers ?? {});
  }
}

const adapter = new ClaudeCodeMCPAdapter();
registry.register(adapter);

export { ClaudeCodeMCPAdapter };
export default adapter;
