import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { BaseMCPAdapter } from "./base.js";
import { registry } from "./registry.js";
import type { GeneratedFile, MCPServerDefinition } from "../types/index.js";

type ZcodeServer = {
  type?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  timeoutMs?: number;
};

class ZcodeMCPAdapter extends BaseMCPAdapter {
  readonly id = "zcode";
  readonly name = "ZCode";
  readonly nativeSupport = true;
  readonly configPath = ".zcode/mcp.json";
  readonly userConfigPath = `${homedir()}/.zcode/cli/config.json`;
  readonly command = "zcode";

  async generate(servers: MCPServerDefinition[]): Promise<GeneratedFile[]> {
    return [
      {
        path: this.configPath,
        content: `${JSON.stringify({ mcpServers: toMcpServers(servers) }, null, 2)}\n`,
        format: "json",
      },
    ];
  }

  async import(cwd?: string): Promise<MCPServerDefinition[]> {
    const dir = cwd ?? process.cwd();
    return this.readMcpServers(resolve(dir, this.configPath));
  }

  override async importUser(): Promise<MCPServerDefinition[]> {
    return this.readUserServers(this.userConfigPath);
  }

  override async install(files: GeneratedFile[], cwd?: string): Promise<void> {
    const dir = cwd ?? process.cwd();
    for (const file of files) {
      const fullPath = isAbsolute(file.path) ? file.path : resolve(dir, file.path);
      await mkdir(dirname(fullPath), { recursive: true });
      if (fullPath.endsWith("config.json") && existsSync(fullPath)) {
        const existing = JSON.parse(await readFile(fullPath, "utf-8")) as {
          mcp?: { servers?: Record<string, ZcodeServer> };
        };
        const generated = JSON.parse(file.content) as {
          mcpServers?: Record<
            string,
            { command?: string; args?: string[]; env?: Record<string, string>; url?: string }
          >;
        };
        const servers = existing.mcp?.servers ?? {};
        for (const [id, spec] of Object.entries(generated.mcpServers ?? {})) {
          servers[id] = toZcodeServer(spec);
        }
        existing.mcp = { ...existing.mcp, servers };
        await writeFile(fullPath, `${JSON.stringify(existing, null, 2)}\n`, "utf-8");
        continue;
      }
      await writeFile(fullPath, file.content, "utf-8");
    }
  }

  private async readMcpServers(fullPath: string): Promise<MCPServerDefinition[]> {
    if (!existsSync(fullPath)) return [];
    const data = JSON.parse(await readFile(fullPath, "utf-8")) as {
      mcpServers?: Record<string, Record<string, unknown>>;
    };
    return fromGeneric(data.mcpServers ?? {});
  }

  private async readUserServers(fullPath: string): Promise<MCPServerDefinition[]> {
    if (!existsSync(fullPath)) return [];
    const data = JSON.parse(await readFile(fullPath, "utf-8")) as {
      mcp?: { servers?: Record<string, ZcodeServer> };
    };
    const servers = data.mcp?.servers ?? {};
    const out: MCPServerDefinition[] = [];
    for (const [id, spec] of Object.entries(servers)) {
      if (spec.command) {
        out.push({
          id,
          name: id,
          transport: { type: "stdio", command: spec.command, args: spec.args, env: spec.env },
        });
      } else if (spec.url) {
        out.push({ id, name: id, transport: { type: "http", url: spec.url } });
      }
    }
    return out;
  }
}

function toMcpServers(servers: MCPServerDefinition[]): Record<string, Record<string, unknown>> {
  const mcpServers: Record<string, Record<string, unknown>> = {};
  for (const server of servers) {
    if (server.transport.type === "stdio") {
      mcpServers[server.id] = {
        command: server.transport.command,
        args: server.transport.args ?? [],
        env: server.transport.env ?? {},
      };
    } else {
      mcpServers[server.id] = {
        url: server.transport.url,
        headers: server.transport.headers ?? {},
      };
    }
  }
  return mcpServers;
}

function toZcodeServer(spec: {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}): ZcodeServer {
  if (spec.command) {
    return { type: "stdio", command: spec.command, args: spec.args ?? [], env: spec.env ?? {} };
  }
  return { type: "http", url: spec.url };
}

function fromGeneric(mcpServers: Record<string, Record<string, unknown>>): MCPServerDefinition[] {
  const servers: MCPServerDefinition[] = [];
  for (const [id, config] of Object.entries(mcpServers)) {
    if (typeof config.command === "string") {
      servers.push({
        id,
        name: id,
        transport: {
          type: "stdio",
          command: config.command,
          args: config.args as string[] | undefined,
          env: config.env as Record<string, string> | undefined,
        },
      });
    } else if (typeof config.url === "string") {
      servers.push({
        id,
        name: id,
        transport: {
          type: "http",
          url: config.url,
          headers: config.headers as Record<string, string> | undefined,
        },
      });
    }
  }
  return servers;
}

const adapter = new ZcodeMCPAdapter();
registry.register(adapter);

export { ZcodeMCPAdapter };
export default adapter;
