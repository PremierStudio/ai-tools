import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { homedir } from "node:os";
import { platform } from "node:os";
import type { Adapter } from "@premierstudio/ai-hooks";

export type McpScope = "project" | "global";

type McpServerEntry = {
  type?: string;
  url: string;
  headers?: Record<string, string>;
};

type McpConfigFile = {
  mcpServers?: Record<string, McpServerEntry>;
  [key: string]: unknown;
};

/** Claude Code's ~/.claude.json has a unique nested structure */
type ClaudeCodeConfig = {
  projects?: Record<
    string,
    { mcpServers?: Record<string, McpServerEntry>; [key: string]: unknown }
  >;
  mcpServers?: Record<string, McpServerEntry>;
  [key: string]: unknown;
};

type ToolPaths = {
  project: string;
  global: string | null;
};

function getClaudeConfigPath(): string {
  return join(homedir(), ".claude.json");
}

function getToolPaths(adapterId: string): ToolPaths | null {
  const home = homedir();

  switch (adapterId) {
    case "claude-code": {
      // Claude Code stores MCP servers in ~/.claude.json
      // Project scope: projects[cwd].mcpServers
      // Global scope: mcpServers (root)
      const configPath = getClaudeConfigPath();
      return { project: configPath, global: configPath };
    }
    case "cursor":
      return {
        project: ".cursor/mcp.json",
        global: join(home, ".cursor", "mcp.json"),
      };
    case "codex":
      return {
        project: ".codex/mcp.json",
        global: join(home, ".codex", "mcp.json"),
      };
    case "gemini-cli":
      return {
        project: ".gemini/settings.json",
        global: join(home, ".gemini", "settings.json"),
      };
    case "kiro":
      return {
        project: ".kiro/mcp.json",
        global: join(home, ".kiro", "mcp.json"),
      };
    case "amp":
      return {
        project: ".amp/mcp.json",
        global: join(home, ".amp", "mcp.json"),
      };
    case "goose":
      return {
        project: ".goose/mcp.json",
        global: join(home, ".config", "goose", "mcp.json"),
      };
    case "aider":
      return {
        project: ".aider/mcp.json",
        global: join(home, ".aider", "mcp.json"),
      };
    case "opencode":
      return {
        project: ".opencode/mcp.json",
        global: join(home, ".opencode", "mcp.json"),
      };
    case "continue":
      return {
        project: ".continue/mcp.json",
        global: join(home, ".continue", "mcp.json"),
      };
    case "roo-code":
      return {
        project: ".roo/mcp.json",
        global: join(home, ".roo", "mcp.json"),
      };
    case "warp": {
      const os = platform();
      const globalDir =
        os === "darwin"
          ? join(home, "Library", "Application Support", "dev.warp.Warp")
          : join(process.env.XDG_CONFIG_HOME ?? join(home, ".config"), "warp-terminal");
      return {
        project: ".warp/mcp.json",
        global: join(globalDir, "mcp.json"),
      };
    }
    case "droid":
      return {
        project: ".factory/mcp.json",
        global: join(home, ".factory", "mcp.json"),
      };
    default:
      return null;
  }
}

function resolveConfigPath(adapterId: string, scope: McpScope): string | null {
  const paths = getToolPaths(adapterId);
  if (!paths) return null;

  // Claude Code always uses ~/.claude.json regardless of scope
  if (adapterId === "claude-code") {
    return getClaudeConfigPath();
  }

  if (scope === "global") {
    return paths.global;
  }

  return resolve(process.cwd(), paths.project);
}

async function readJsonSafe<T>(path: string): Promise<T | null> {
  if (!existsSync(path)) return null;
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export function supportsGlobal(adapterId: string): boolean {
  const paths = getToolPaths(adapterId);
  return paths?.global !== null;
}

// ---- Claude Code helpers ----

async function installClaudeCodeEntry(
  endpointUrl: string,
  token: string,
  scope: McpScope,
): Promise<string> {
  const configPath = getClaudeConfigPath();
  const config = (await readJsonSafe<ClaudeCodeConfig>(configPath)) ?? {};

  const entry: McpServerEntry = {
    type: "http",
    url: endpointUrl,
    headers: { Authorization: `Bearer ${token}` },
  };

  if (scope === "global") {
    if (!config.mcpServers) config.mcpServers = {};
    config.mcpServers["plannable"] = entry;
  } else {
    const projectPath = process.cwd();
    if (!config.projects) config.projects = {};
    if (!config.projects[projectPath]) config.projects[projectPath] = {};
    const project = config.projects[projectPath];
    if (!project.mcpServers) project.mcpServers = {};
    project.mcpServers["plannable"] = entry;
  }

  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
  return configPath;
}

async function removeClaudeCodeEntry(scope: McpScope): Promise<boolean> {
  const configPath = getClaudeConfigPath();
  const config = await readJsonSafe<ClaudeCodeConfig>(configPath);
  if (!config) return false;

  let removed = false;

  if (scope === "global") {
    if (config.mcpServers?.["plannable"]) {
      delete config.mcpServers["plannable"];
      removed = true;
    }
  } else {
    const projectPath = process.cwd();
    const servers = config.projects?.[projectPath]?.mcpServers;
    if (servers?.["plannable"]) {
      delete servers["plannable"];
      removed = true;
    }
  }

  if (removed) {
    await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
  }
  return removed;
}

function hasClaudeCodeEntry(scope?: McpScope): boolean {
  const configPath = getClaudeConfigPath();
  if (!existsSync(configPath)) return false;

  try {
    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as ClaudeCodeConfig;

    const scopes: McpScope[] = scope ? [scope] : ["project", "global"];

    for (const s of scopes) {
      if (s === "global") {
        if (config.mcpServers?.["plannable"]) return true;
      } else {
        const projectPath = process.cwd();
        if (config.projects?.[projectPath]?.mcpServers?.["plannable"]) return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

// ---- Public API ----

export async function installMcpEntry(
  adapter: Adapter,
  endpointUrl: string,
  token: string,
  scope: McpScope = "project",
): Promise<string | null> {
  if (!getToolPaths(adapter.id)) return null;

  // Claude Code has a unique config structure
  if (adapter.id === "claude-code") {
    await installClaudeCodeEntry(endpointUrl, token, scope);
    return scope === "project"
      ? `~/.claude.json (project: ${process.cwd()})`
      : "~/.claude.json (global)";
  }

  const fullPath = resolveConfigPath(adapter.id, scope);
  if (!fullPath) return null;

  const existing = await readJsonSafe<McpConfigFile>(fullPath);
  const config: McpConfigFile = existing ?? {};

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  config.mcpServers["plannable"] = {
    url: endpointUrl,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, JSON.stringify(config, null, 2) + "\n", "utf-8");

  // Return a display-friendly path
  const paths = getToolPaths(adapter.id);
  if (scope === "project" && paths) {
    return paths.project;
  }
  return fullPath;
}

export async function removeMcpEntry(
  adapter: Adapter,
  scope: McpScope = "project",
): Promise<boolean> {
  if (!getToolPaths(adapter.id)) return false;

  if (adapter.id === "claude-code") {
    return removeClaudeCodeEntry(scope);
  }

  const fullPath = resolveConfigPath(adapter.id, scope);
  if (!fullPath || !existsSync(fullPath)) return false;

  const config = await readJsonSafe<McpConfigFile>(fullPath);
  if (!config?.mcpServers?.["plannable"]) return false;

  delete config.mcpServers["plannable"];
  await writeFile(fullPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
  return true;
}

export function hasMcpEntry(adapter: Adapter, scope?: McpScope): boolean {
  if (!getToolPaths(adapter.id)) return false;

  if (adapter.id === "claude-code") {
    return hasClaudeCodeEntry(scope);
  }

  const scopes: McpScope[] = scope ? [scope] : ["project", "global"];

  for (const s of scopes) {
    const fullPath = resolveConfigPath(adapter.id, s);
    if (!fullPath || !existsSync(fullPath)) continue;

    try {
      const content = readFileSync(fullPath, "utf-8");
      const config = JSON.parse(content) as McpConfigFile;
      if (config.mcpServers?.["plannable"]) return true;
    } catch {
      continue;
    }
  }

  return false;
}
