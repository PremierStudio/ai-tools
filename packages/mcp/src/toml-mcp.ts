import type { MCPServerDefinition, MCPTransport } from "./types/index.js";

const BARE_KEY = /^[A-Za-z0-9_-]+$/;

export function tomlKey(id: string): string {
  if (BARE_KEY.test(id)) return id;
  return `"${id.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function tomlString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function tomlArray(values: string[]): string {
  return `[${values.map(tomlString).join(", ")}]`;
}

function isUrlTransport(
  transport: MCPTransport,
): transport is Extract<MCPTransport, { url: string }> {
  return transport.type === "sse" || transport.type === "http";
}

export type EncodeMcpTomlOptions = {
  /** Nested table name for HTTP headers. Grok uses `headers`; Codex uses `http_headers`. */
  headerTable?: "headers" | "http_headers";
};

export function encodeMcpToml(
  servers: MCPServerDefinition[],
  options: EncodeMcpTomlOptions = {},
): string {
  const headerTable = options.headerTable ?? "headers";
  const chunks: string[] = [];
  for (const server of servers) {
    const key = tomlKey(server.id);
    const lines: string[] = [`[mcp_servers.${key}]`];
    if (server.transport.type === "stdio") {
      lines.push(`command = ${tomlString(server.transport.command)}`);
      if (server.transport.args && server.transport.args.length > 0) {
        lines.push(`args = ${tomlArray(server.transport.args)}`);
      }
      if (server.enabled === false) lines.push("enabled = false");
      const env = server.transport.env ?? {};
      const envKeys = Object.keys(env);
      if (envKeys.length > 0) {
        lines.push("");
        lines.push(`[mcp_servers.${key}.env]`);
        for (const envKey of envKeys) {
          const envValue = env[envKey];
          if (envValue === undefined) continue;
          lines.push(`${tomlKey(envKey)} = ${tomlString(envValue)}`);
        }
      }
    } else if (isUrlTransport(server.transport)) {
      lines.push(`url = ${tomlString(server.transport.url)}`);
      if (server.enabled === false) lines.push("enabled = false");
      const headers = server.transport.headers ?? {};
      const headerKeys = Object.keys(headers);
      if (headerKeys.length > 0) {
        lines.push("");
        lines.push(`[mcp_servers.${key}.${headerTable}]`);
        for (const headerKey of headerKeys) {
          const headerValue = headers[headerKey];
          if (headerValue === undefined) continue;
          lines.push(`${tomlKey(headerKey)} = ${tomlString(headerValue)}`);
        }
      }
    }
    chunks.push(lines.join("\n"));
  }
  return chunks.length === 0 ? "" : `${chunks.join("\n\n")}\n`;
}

type Table = Record<string, string | boolean | string[]>;

function unquoteTomlKey(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replaceAll('\\"', '"').replaceAll("\\\\", "\\");
  }
  return trimmed;
}

function parseTomlValue(raw: string): string | boolean | string[] {
  const value = raw.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (inner === "") return [];
    return inner.split(",").map((part) => {
      const item = part.trim();
      if (item.startsWith('"') && item.endsWith('"')) {
        return item.slice(1, -1).replaceAll('\\"', '"').replaceAll("\\\\", "\\");
      }
      return item;
    });
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replaceAll('\\"', '"').replaceAll("\\\\", "\\");
  }
  return value;
}

const INLINE_PAIR =
  /(?:("(?:\\.|[^"\\])*")|([A-Za-z0-9_-]+))\s*=\s*(("(?:\\.|[^"\\])*")|true|false|[^,}]+)/g;

function parseInlineTable(raw: string): Record<string, string> | undefined {
  const value = raw.trim();
  if (!value.startsWith("{") || !value.endsWith("}")) return undefined;
  const inner = value.slice(1, -1).trim();
  const out: Record<string, string> = {};
  if (inner === "") return out;
  for (const match of inner.matchAll(INLINE_PAIR)) {
    const rawKey = match[1] ?? match[2];
    const rawVal = match[3];
    if (rawKey === undefined || rawVal === undefined) continue;
    const parsed = parseTomlValue(rawVal.trim());
    if (typeof parsed === "string") out[unquoteTomlKey(rawKey)] = parsed;
  }
  return out;
}

const TABLE_HEADER = /^\[([^\]]+)\]\s*$/;

export function parseMcpToml(source: string): MCPServerDefinition[] {
  const tables = new Map<string, Table>();
  let current: string | null = null;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const header = TABLE_HEADER.exec(line);
    if (header) {
      current = header[1] ?? null;
      if (current && current.startsWith("mcp_servers.") && !tables.has(current)) {
        tables.set(current, {});
      }
      continue;
    }
    if (!current || !current.startsWith("mcp_servers.")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = unquoteTomlKey(line.slice(0, eq));
    const rawValue = line.slice(eq + 1);
    if (key === "env" || key === "headers" || key === "http_headers") {
      const inline = parseInlineTable(rawValue);
      if (inline) {
        const nested = `${current}.${key}`;
        const existing = tables.get(nested) ?? {};
        for (const [inlineKey, inlineValue] of Object.entries(inline)) {
          existing[inlineKey] = inlineValue;
        }
        tables.set(nested, existing);
        continue;
      }
    }
    const value = parseTomlValue(rawValue);
    const table = tables.get(current);
    if (!table) continue;
    table[key] = value;
  }

  const servers: MCPServerDefinition[] = [];
  for (const [header, table] of tables) {
    const parts = splitHeader(header);
    if (parts.length !== 2) continue;
    const id = parts[1];
    if (id === undefined) continue;
    const envTable = tables.get(`${header}.env`) ?? {};
    const headerTable = {
      ...tables.get(`${header}.headers`),
      ...tables.get(`${header}.http_headers`),
    };
    const command = typeof table.command === "string" ? table.command : undefined;
    const url = typeof table.url === "string" ? table.url : undefined;
    const enabled = table.enabled === false ? false : undefined;
    if (command) {
      const args = Array.isArray(table.args) ? table.args : undefined;
      const env = stringRecord(envTable);
      const transport: Extract<MCPTransport, { type: "stdio" }> = { type: "stdio", command };
      if (args) transport.args = args;
      if (Object.keys(env).length > 0) transport.env = env;
      const def: MCPServerDefinition = { id, name: id, transport };
      if (enabled === false) def.enabled = false;
      servers.push(def);
    } else if (url) {
      const headers = stringRecord(headerTable);
      const transport: Extract<MCPTransport, { type: "http" }> = { type: "http", url };
      if (Object.keys(headers).length > 0) transport.headers = headers;
      const def: MCPServerDefinition = { id, name: id, transport };
      if (enabled === false) def.enabled = false;
      servers.push(def);
    }
  }
  return servers;
}

function splitHeader(header: string): string[] {
  // mcp_servers.foo / mcp_servers."GWS - Premier Studio" / mcp_servers.foo.env
  if (!header.startsWith("mcp_servers.")) return [];
  const rest = header.slice("mcp_servers.".length);
  if (rest.startsWith('"')) {
    const end = rest.indexOf('"', 1);
    if (end === -1) return ["mcp_servers", rest];
    const id = rest.slice(1, end);
    const suffix = rest.slice(end + 1);
    if (suffix.startsWith(".")) return ["mcp_servers", id, suffix.slice(1)];
    return ["mcp_servers", id];
  }
  const dot = rest.indexOf(".");
  if (dot === -1) return ["mcp_servers", rest];
  return ["mcp_servers", rest.slice(0, dot), rest.slice(dot + 1)];
}

function stringRecord(table: Table): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(table)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

export function stripMcpTomlTables(source: string): string {
  const lines = source.split(/\r?\n/);
  const kept: string[] = [];
  let skipping = false;
  for (const line of lines) {
    const trimmed = line.trim();
    const header = TABLE_HEADER.exec(trimmed);
    if (header) {
      skipping = (header[1] ?? "").startsWith("mcp_servers");
    }
    if (!skipping) kept.push(line);
  }
  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

export function mergeMcpToml(
  existing: string,
  servers: MCPServerDefinition[],
  managedIds: string[],
  options: EncodeMcpTomlOptions = {},
): string {
  const current = parseMcpToml(existing);
  const managed = new Set(managedIds);
  const kept = current.filter((server) => !managed.has(server.id));
  const next = [...kept, ...servers];
  const rest = stripMcpTomlTables(existing);
  const encoded = encodeMcpToml(next, options);
  if (rest.trim() === "") return encoded;
  if (encoded === "") return `${rest}\n`;
  return `${rest}\n\n${encoded}`;
}
