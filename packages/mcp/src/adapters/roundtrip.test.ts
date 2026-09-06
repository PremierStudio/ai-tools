import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CodexMCPAdapter } from "./codex.js";
import { CursorMCPAdapter } from "./cursor.js";
import { GrokMCPAdapter } from "./grok.js";
import { OpenCodeMCPAdapter } from "./opencode.js";
import { ZcodeMCPAdapter } from "./zcode.js";
import type { MCPServerDefinition } from "../types/index.js";

const server: MCPServerDefinition = {
  id: "github",
  name: "github",
  transport: { type: "stdio", command: "/home/blitz/.local/bin/gh-mcp", args: [] },
};

describe("MCP adapter filesystem round-trips", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  async function scratch(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "ai-tools-mcp-"));
    dirs.push(dir);
    return dir;
  }

  it("Grok writes TOML that import can read back", async () => {
    const cwd = await scratch();
    const adapter = new GrokMCPAdapter();
    const files = await adapter.generate([server]);
    await adapter.install(files, cwd);
    const raw = await readFile(join(cwd, ".grok/config.toml"), "utf-8");
    expect(raw).toContain("[mcp_servers.github]");
    const imported = await adapter.import(cwd);
    expect(imported).toEqual([
      {
        id: "github",
        name: "github",
        transport: { type: "stdio", command: "/home/blitz/.local/bin/gh-mcp" },
      },
    ]);
  });

  it("Codex writes TOML that import can read back", async () => {
    const cwd = await scratch();
    const adapter = new CodexMCPAdapter();
    await adapter.install(await adapter.generate([server]), cwd);
    const imported = await adapter.import(cwd);
    expect(imported[0]?.id).toBe("github");
    expect(imported[0]?.transport.type).toBe("stdio");
  });

  it("OpenCode writes opencode.json mcp.local command arrays", async () => {
    const cwd = await scratch();
    const adapter = new OpenCodeMCPAdapter();
    await adapter.install(await adapter.generate([server]), cwd);
    const parsed = JSON.parse(await readFile(join(cwd, "opencode.json"), "utf-8")) as {
      mcp: Record<string, { type: string; command: string[] }>;
    };
    expect(parsed.mcp.github?.type).toBe("local");
    expect(parsed.mcp.github?.command[0]).toBe("/home/blitz/.local/bin/gh-mcp");
    const imported = await adapter.import(cwd);
    expect(imported[0]?.id).toBe("github");
  });

  it("ZCode writes project mcp.json", async () => {
    const cwd = await scratch();
    const adapter = new ZcodeMCPAdapter();
    await adapter.install(await adapter.generate([server]), cwd);
    const imported = await adapter.import(cwd);
    expect(imported[0]?.id).toBe("github");
  });

  it("Cursor writes .cursor/mcp.json", async () => {
    const cwd = await scratch();
    const adapter = new CursorMCPAdapter();
    await adapter.install(await adapter.generate([server]), cwd);
    const imported = await adapter.import(cwd);
    expect(imported[0]?.id).toBe("github");
  });

  it("Grok merge keeps unrelated tables", async () => {
    const cwd = await scratch();
    const adapter = new GrokMCPAdapter();
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(join(cwd, ".grok"), { recursive: true });
    await writeFile(join(cwd, ".grok/config.toml"), "[ui]\nyolo = true\n", "utf-8");
    await adapter.install(await adapter.generate([server]), cwd);
    const raw = await readFile(join(cwd, ".grok/config.toml"), "utf-8");
    expect(raw).toContain("[ui]");
    expect(raw).toContain("yolo = true");
    expect(raw).toContain("[mcp_servers.github]");
  });
});
