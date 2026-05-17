import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./registry.js", () => ({
  registry: { register: vi.fn() },
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => false),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

import { ClaudeDesktopMCPAdapter } from "./claude-desktop.js";
import type { MCPServerDefinition } from "../types/index.js";

describe("ClaudeDesktopMCPAdapter", () => {
  let adapter: ClaudeDesktopMCPAdapter;

  const testServer: MCPServerDefinition = {
    id: "cert-coach",
    name: "Certification Coach",
    transport: { type: "stdio", command: "npx", args: ["cert-coach-mcp"], env: { NODE_ENV: "test" } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new ClaudeDesktopMCPAdapter();
  });

  it("has the expected metadata", () => {
    expect(adapter.id).toBe("claude-desktop");
    expect(adapter.name).toBe("Claude Desktop");
    expect(adapter.configPath).toBe("claude_desktop_config.json");
  });

  it("generates a Claude Desktop config with stdio entries", async () => {
    const files = await adapter.generate([testServer]);
    expect(files).toHaveLength(1);
    const parsed = JSON.parse(files[0]!.content);
    expect(parsed.mcpServers["cert-coach"].type).toBe("stdio");
    expect(parsed.mcpServers["cert-coach"].command).toBe("npx");
  });

  it("rejects remote MCP servers", async () => {
    await expect(
      adapter.generate([
        {
          id: "remote",
          name: "Remote",
          transport: { type: "sse", url: "https://example.com/mcp" },
        },
      ]),
    ).rejects.toThrow("stdio MCP servers only");
  });

  it("imports stdio servers from an existing config", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        mcpServers: {
          "cert-coach": { type: "stdio", command: "npx", args: ["cert-coach-mcp"], env: { NODE_ENV: "test" } },
        },
      }),
    );

    const result = await adapter.import("/tmp");
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("cert-coach");
    expect(result[0]?.transport.type).toBe("stdio");
  });

  it("writes the generated config during install", async () => {
    const files = await adapter.generate([testServer]);
    await adapter.install(files, "/tmp");
    expect(writeFile).toHaveBeenCalled();
  });
});
