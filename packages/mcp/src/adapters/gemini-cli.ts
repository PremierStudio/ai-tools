import { BaseMCPAdapter } from "./base.js";
import { registry } from "./registry.js";
import type { MCPServerDefinition, GeneratedFile } from "../types/index.js";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

class GeminiCliMCPAdapter extends BaseMCPAdapter {
  readonly id = "gemini-cli";
  readonly name = "Gemini CLI";
  readonly nativeSupport = true;
  readonly configPath = ".gemini/settings.json";
  readonly command = "gemini";

  async generate(servers: MCPServerDefinition[]): Promise<GeneratedFile[]> {
    const mcpServers: Record<string, unknown> = {};
    for (const server of servers) {
      if (server.transport.type === "stdio") {
        // Gemini CLI does not support env in its config
        mcpServers[server.id] = {
          command: server.transport.command,
          args: server.transport.args ?? [],
        };
      } else {
        mcpServers[server.id] = {
          url: server.transport.url,
          headers: server.transport.headers ?? {},
        };
      }
    }
    return [
      {
        path: this.configPath,
        content: JSON.stringify({ mcpServers }, null, 2) + "\n",
        format: "json",
      },
    ];
  }

  async import(cwd?: string): Promise<MCPServerDefinition[]> {
    const dir = cwd ?? process.cwd();
    const fullPath = resolve(dir, this.configPath);
    if (!existsSync(fullPath)) return [];
    const raw = await readFile(fullPath, "utf-8");
    const data = JSON.parse(raw) as { mcpServers?: Record<string, Record<string, unknown>> };
    const servers: MCPServerDefinition[] = [];
    for (const [id, config] of Object.entries(data.mcpServers ?? {})) {
      if (config.command) {
        servers.push({
          id,
          name: id,
          transport: {
            type: "stdio",
            command: config.command as string,
            args: config.args as string[] | undefined,
          },
        });
      } else if (config.url) {
        servers.push({
          id,
          name: id,
          transport: {
            type: "sse",
            url: config.url as string,
            headers: config.headers as Record<string, string> | undefined,
          },
        });
      }
    }
    return servers;
  }
}

const adapter = new GeminiCliMCPAdapter();
registry.register(adapter);

export { GeminiCliMCPAdapter };
export default adapter;
