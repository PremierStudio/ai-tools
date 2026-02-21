import { BaseMCPAdapter } from "./base.js";
import { registry } from "./registry.js";
import type { MCPServerDefinition, GeneratedFile } from "../types/index.js";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

class CopilotMCPAdapter extends BaseMCPAdapter {
  readonly id = "copilot";
  readonly name = "Copilot";
  readonly nativeSupport = true;
  readonly configPath = ".vscode/mcp.json";

  async generate(servers: MCPServerDefinition[]): Promise<GeneratedFile[]> {
    const serversObj: Record<string, unknown> = {};
    for (const server of servers) {
      if (server.transport.type === "stdio") {
        serversObj[server.id] = {
          type: "stdio",
          command: server.transport.command,
          args: server.transport.args ?? [],
          env: server.transport.env ?? {},
        };
      } else {
        serversObj[server.id] = {
          type: "sse",
          url: server.transport.url,
          headers: server.transport.headers ?? {},
        };
      }
    }
    return [
      {
        path: this.configPath,
        content: JSON.stringify({ servers: serversObj }, null, 2) + "\n",
        format: "json",
      },
    ];
  }

  async import(cwd?: string): Promise<MCPServerDefinition[]> {
    const dir = cwd ?? process.cwd();
    const fullPath = resolve(dir, this.configPath);
    if (!existsSync(fullPath)) return [];
    const raw = await readFile(fullPath, "utf-8");
    const data = JSON.parse(raw) as { servers?: Record<string, Record<string, unknown>> };
    const servers: MCPServerDefinition[] = [];
    for (const [id, config] of Object.entries(data.servers ?? {})) {
      if (config.type === "stdio" || config.command) {
        servers.push({
          id,
          name: id,
          transport: {
            type: "stdio",
            command: config.command as string,
            args: config.args as string[] | undefined,
            env: config.env as Record<string, string> | undefined,
          },
        });
      } else if (config.type === "sse" || config.url) {
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

const adapter = new CopilotMCPAdapter();
registry.register(adapter);

export { CopilotMCPAdapter };
export default adapter;
