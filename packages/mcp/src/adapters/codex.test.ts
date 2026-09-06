import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./registry.js", () => ({
  registry: { register: vi.fn() },
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => false),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  rm: vi.fn(),
}));

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { CodexMCPAdapter } from "./codex.js";
import type { MCPServerDefinition } from "../types/index.js";

describe("CodexMCPAdapter", () => {
  let adapter: CodexMCPAdapter;

  const testServer: MCPServerDefinition = {
    id: "test-server",
    name: "Test Server",
    transport: { type: "stdio", command: "npx", args: ["-y", "test-mcp"], env: { KEY: "val" } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new CodexMCPAdapter();
  });

  describe("metadata", () => {
    it("has correct id", () => expect(adapter.id).toBe("codex"));
    it("has correct name", () => expect(adapter.name).toBe("Codex"));
    it("has native support", () => expect(adapter.nativeSupport).toBe(true));
    it("has correct config path", () => expect(adapter.configPath).toBe(".codex/config.toml"));
  });

  describe("generate", () => {
    it("generates native Codex TOML", async () => {
      const files = await adapter.generate([testServer]);
      expect(files).toHaveLength(1);
      expect(files[0]!.path).toBe(".codex/config.toml");
      expect(files[0]!.format).toBe("toml");
      expect(files[0]!.content).toContain("[mcp_servers.test-server]");
      expect(files[0]!.content).toContain('command = "npx"');
    });

    it("handles SSE transport", async () => {
      const sseServer: MCPServerDefinition = {
        id: "sse-server",
        name: "SSE Server",
        transport: { type: "sse", url: "http://localhost:3000" },
      };
      const files = await adapter.generate([sseServer]);
      expect(files[0]!.content).toContain("[mcp_servers.sse-server]");
      expect(files[0]!.content).toContain('url = "http://localhost:3000"');
    });

    it("writes http remotes with url and http_headers", async () => {
      const httpServer: MCPServerDefinition = {
        id: "figma",
        name: "figma",
        transport: {
          type: "http",
          url: "https://mcp.figma.com/mcp",
          headers: { "X-Figma-Region": "us-east-1" },
        },
      };
      const files = await adapter.generate([httpServer]);
      expect(files[0]!.format).toBe("toml");
      expect(files[0]!.content).toContain("[mcp_servers.figma]");
      expect(files[0]!.content).toContain('url = "https://mcp.figma.com/mcp"');
      expect(files[0]!.content).toContain("[mcp_servers.figma.http_headers]");
      expect(files[0]!.content).toContain('X-Figma-Region = "us-east-1"');
    });

    it("handles empty servers array", async () => {
      const files = await adapter.generate([]);
      expect(files[0]!.content).toBe("");
    });

    it("handles multiple servers", async () => {
      const servers = [testServer, { ...testServer, id: "server-2", name: "Server 2" }];
      const files = await adapter.generate(servers);
      expect(files[0]!.content).toContain("[mcp_servers.test-server]");
      expect(files[0]!.content).toContain("[mcp_servers.server-2]");
    });

    it("generates with optional fields undefined", async () => {
      const server: MCPServerDefinition = {
        id: "minimal",
        name: "Minimal",
        transport: { type: "stdio", command: "node" },
      };
      const files = await adapter.generate([server]);
      expect(files[0]!.content).toContain('command = "node"');
      expect(files[0]!.content).not.toContain("args =");
    });
  });

  describe("import", () => {
    it("returns empty array when file does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const result = await adapter.import("/test");
      expect(result).toEqual([]);
    });

    it("imports stdio servers from config", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(`[mcp_servers.my-server]
command = "npx"
args = ["-y", "test"]

[mcp_servers.my-server.env]
A = "1"
`);
      const result = await adapter.import("/test");
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("my-server");
      expect(result[0]!.transport.type).toBe("stdio");
    });

    it("imports SSE servers from config", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(`[mcp_servers.sse]
url = "http://localhost:3000"
`);
      const result = await adapter.import("/test");
      expect(result).toHaveLength(1);
      expect(result[0]!.transport.type).toBe("http");
    });

    it("imports with missing servers key", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue("[ui]\nyolo = true\n");
      const result = await adapter.import("/test");
      expect(result).toEqual([]);
    });

    it("imports without cwd argument", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const result = await adapter.import();
      expect(result).toEqual([]);
    });
  });
});
