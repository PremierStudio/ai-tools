import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { BaseMCPAdapter } from "./base.js";
import { registry } from "./registry.js";
import type { GeneratedFile, MCPServerDefinition, MCPTransport } from "../types/index.js";

type OpenCodeEntry = {
  type?: string;
  command?: string[];
  url?: string;
  enabled?: boolean;
  environment?: Record<string, string>;
  headers?: Record<string, string>;
  oauth?: Record<string, unknown>;
};

class OpenCodeMCPAdapter extends BaseMCPAdapter {
  readonly id = "opencode";
  readonly name = "OpenCode";
  readonly nativeSupport = true;
  readonly configPath = "opencode.json";
  readonly userConfigPath = `${homedir()}/.config/opencode/opencode.json`;
  readonly command = "opencode";

  async generate(servers: MCPServerDefinition[]): Promise<GeneratedFile[]> {
    return [
      {
        path: this.configPath,
        content: `${JSON.stringify({ mcp: toOpenCodeMcp(servers) }, null, 2)}\n`,
        format: "json",
      },
    ];
  }

  async import(cwd?: string): Promise<MCPServerDefinition[]> {
    const dir = cwd ?? process.cwd();
    return this.readOpenCode(resolve(dir, this.configPath));
  }

  override async importUser(): Promise<MCPServerDefinition[]> {
    return this.readOpenCode(this.userConfigPath);
  }

  override async install(files: GeneratedFile[], cwd?: string): Promise<void> {
    const dir = cwd ?? process.cwd();
    for (const file of files) {
      const fullPath = isAbsolute(file.path) ? file.path : resolve(dir, file.path);
      await mkdir(dirname(fullPath), { recursive: true });
      if (existsSync(fullPath)) {
        const existing = JSON.parse(await readFile(fullPath, "utf-8")) as {
          mcp?: Record<string, OpenCodeEntry>;
        };
        const generated = JSON.parse(file.content) as { mcp?: Record<string, OpenCodeEntry> };
        existing.mcp = { ...existing.mcp, ...generated.mcp };
        await writeFile(fullPath, `${JSON.stringify(existing, null, 2)}\n`, "utf-8");
        continue;
      }
      await writeFile(fullPath, file.content, "utf-8");
    }
  }

  private async readOpenCode(fullPath: string): Promise<MCPServerDefinition[]> {
    if (!existsSync(fullPath)) return [];
    const data = JSON.parse(await readFile(fullPath, "utf-8")) as {
      mcp?: Record<string, OpenCodeEntry>;
    };
    return fromOpenCodeMcp(data.mcp ?? {});
  }
}

function toOpenCodeMcp(servers: MCPServerDefinition[]): Record<string, OpenCodeEntry> {
  const mcp: Record<string, OpenCodeEntry> = {};
  for (const server of servers) {
    if (server.transport.type === "stdio") {
      mcp[server.id] = {
        type: "local",
        command: [server.transport.command, ...(server.transport.args ?? [])],
        enabled: server.enabled !== false,
        environment: server.transport.env ?? {},
      };
    } else {
      const entry: OpenCodeEntry = {
        type: "remote",
        url: server.transport.url,
        enabled: server.enabled !== false,
      };
      if (server.transport.headers && Object.keys(server.transport.headers).length > 0) {
        entry.headers = server.transport.headers;
      }
      mcp[server.id] = entry;
    }
  }
  return mcp;
}

function fromOpenCodeMcp(mcp: Record<string, OpenCodeEntry>): MCPServerDefinition[] {
  const servers: MCPServerDefinition[] = [];
  for (const [id, entry] of Object.entries(mcp)) {
    if ((entry.type === "local" || entry.command) && entry.command && entry.command.length > 0) {
      const [command, ...args] = entry.command;
      if (command === undefined) continue;
      servers.push({
        id,
        name: id,
        transport: {
          type: "stdio",
          command,
          args,
          env: entry.environment,
        },
        enabled: entry.enabled,
      });
    } else if (entry.url) {
      const transport: Extract<MCPTransport, { url: string }> = { type: "http", url: entry.url };
      if (entry.headers) transport.headers = entry.headers;
      servers.push({
        id,
        name: id,
        transport,
        enabled: entry.enabled,
      });
    }
  }
  return servers;
}

const adapter = new OpenCodeMCPAdapter();
registry.register(adapter);

export { OpenCodeMCPAdapter };
export default adapter;
