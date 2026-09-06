import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { BaseMCPAdapter } from "./base.js";
import { registry } from "./registry.js";
import type { GeneratedFile, MCPServerDefinition, MCPTransport } from "../types/index.js";

type ZcodeServer = {
  type?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

class ZcodeMCPAdapter extends BaseMCPAdapter {
  readonly id = "zcode";
  readonly name = "ZCode";
  readonly nativeSupport = true;
  readonly configPath = ".zcode/config.json";
  readonly userConfigPath = `${homedir()}/.zcode/cli/config.json`;
  readonly command = "zcode";

  override async detect(cwd?: string): Promise<boolean> {
    if (await super.detect(cwd)) return true;
    return existsSync(this.userConfigPath);
  }

  async generate(servers: MCPServerDefinition[]): Promise<GeneratedFile[]> {
    return [
      {
        path: this.configPath,
        content: `${JSON.stringify({ mcp: { servers: toZcodeServers(servers) } }, null, 2)}\n`,
        format: "json",
      },
    ];
  }

  async import(cwd?: string): Promise<MCPServerDefinition[]> {
    const dir = cwd ?? process.cwd();
    return this.readZcode(resolve(dir, this.configPath));
  }

  override async importUser(): Promise<MCPServerDefinition[]> {
    return this.readZcode(this.userConfigPath);
  }

  override async install(files: GeneratedFile[], cwd?: string): Promise<void> {
    const dir = cwd ?? process.cwd();
    for (const file of files) {
      const fullPath = isAbsolute(file.path) ? file.path : resolve(dir, file.path);
      await mkdir(dirname(fullPath), { recursive: true });
      if (existsSync(fullPath)) {
        const existing = JSON.parse(await readFile(fullPath, "utf-8")) as {
          mcp?: { servers?: Record<string, ZcodeServer> };
        };
        const generated = JSON.parse(file.content) as {
          mcp?: { servers?: Record<string, ZcodeServer> };
        };
        existing.mcp = {
          ...existing.mcp,
          servers: { ...existing.mcp?.servers, ...generated.mcp?.servers },
        };
        await writeFile(fullPath, `${JSON.stringify(existing, null, 2)}\n`, "utf-8");
        continue;
      }
      await writeFile(fullPath, file.content, "utf-8");
    }
  }

  private async readZcode(fullPath: string): Promise<MCPServerDefinition[]> {
    if (!existsSync(fullPath)) return [];
    const data = JSON.parse(await readFile(fullPath, "utf-8")) as {
      mcp?: { servers?: Record<string, ZcodeServer> };
    };
    return fromZcodeServers(data.mcp?.servers ?? {});
  }
}

function toZcodeServers(servers: MCPServerDefinition[]): Record<string, ZcodeServer> {
  const out: Record<string, ZcodeServer> = {};
  for (const server of servers) {
    out[server.id] = toZcodeServer(server);
  }
  return out;
}

function toZcodeServer(server: MCPServerDefinition): ZcodeServer {
  if (server.transport.type === "stdio") {
    const spec: ZcodeServer = {
      type: "stdio",
      command: server.transport.command,
      args: server.transport.args ?? [],
    };
    if (server.transport.env && Object.keys(server.transport.env).length > 0) {
      spec.env = server.transport.env;
    }
    return spec;
  }
  const spec: ZcodeServer = {
    type: server.transport.type,
    url: server.transport.url,
  };
  if (server.transport.headers && Object.keys(server.transport.headers).length > 0) {
    spec.headers = server.transport.headers;
  }
  return spec;
}

function fromZcodeServers(servers: Record<string, ZcodeServer>): MCPServerDefinition[] {
  const out: MCPServerDefinition[] = [];
  for (const [id, spec] of Object.entries(servers)) {
    if (typeof spec.command === "string") {
      const transport: Extract<MCPTransport, { type: "stdio" }> = {
        type: "stdio",
        command: spec.command,
      };
      if (spec.args) transport.args = spec.args;
      if (spec.env) transport.env = spec.env;
      out.push({ id, name: id, transport });
    } else if (typeof spec.url === "string") {
      const type = spec.type === "sse" ? "sse" : "http";
      const transport: Extract<MCPTransport, { url: string }> = { type, url: spec.url };
      if (spec.headers) transport.headers = spec.headers;
      out.push({ id, name: id, transport });
    }
  }
  return out;
}

const adapter = new ZcodeMCPAdapter();
registry.register(adapter);

export { ZcodeMCPAdapter };
export default adapter;
