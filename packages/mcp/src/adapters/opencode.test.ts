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
import { OpenCodeMCPAdapter } from "./opencode.js";
import type { MCPServerDefinition } from "../types/index.js";

describe("OpenCodeMCPAdapter", () => {
  let adapter: OpenCodeMCPAdapter;

  const testServer: MCPServerDefinition = {
    id: "test-server",
    name: "Test Server",
    transport: { type: "stdio", command: "npx", args: ["-y", "test-mcp"], env: { KEY: "val" } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new OpenCodeMCPAdapter();
  });

  describe("metadata", () => {
    it("has correct id", () => expect(adapter.id).toBe("opencode"));
    it("has correct name", () => expect(adapter.name).toBe("OpenCode"));
    it("has native support", () => expect(adapter.nativeSupport).toBe(true));
    it("has correct config path", () => expect(adapter.configPath).toBe("opencode.json"));
  });

  describe("generate", () => {
    it("generates native OpenCode mcp entries", async () => {
      const files = await adapter.generate([testServer]);
      expect(files).toHaveLength(1);
      expect(files[0]!.path).toBe("opencode.json");
      expect(files[0]!.format).toBe("json");
      const parsed = JSON.parse(files[0]!.content) as {
        mcp: Record<string, { type: string; command: string[] }>;
      };
      expect(parsed.mcp["test-server"]?.type).toBe("local");
      expect(parsed.mcp["test-server"]?.command[0]).toBe("npx");
    });

    it("handles SSE transport", async () => {
      const sseServer: MCPServerDefinition = {
        id: "sse-server",
        name: "SSE Server",
        transport: { type: "sse", url: "http://localhost:3000" },
      };
      const files = await adapter.generate([sseServer]);
      const parsed = JSON.parse(files[0]!.content) as {
        mcp: Record<string, { type: string; url: string }>;
      };
      expect(parsed.mcp["sse-server"]?.type).toBe("remote");
      expect(parsed.mcp["sse-server"]?.url).toBe("http://localhost:3000");
    });

    it("emits headers on remote MCP entries", async () => {
      const httpServer: MCPServerDefinition = {
        id: "linear",
        name: "linear",
        transport: {
          type: "http",
          url: "https://mcp.linear.app/mcp",
          headers: { Authorization: "Bearer token" },
        },
      };
      const files = await adapter.generate([httpServer]);
      const parsed = JSON.parse(files[0]!.content) as {
        mcp: Record<string, { type: string; url: string; headers?: Record<string, string> }>;
      };
      expect(parsed.mcp.linear).toMatchObject({
        type: "remote",
        url: "https://mcp.linear.app/mcp",
        headers: { Authorization: "Bearer token" },
      });
    });

    it("handles empty servers array", async () => {
      const files = await adapter.generate([]);
      const parsed = JSON.parse(files[0]!.content) as { mcp: Record<string, unknown> };
      expect(Object.keys(parsed.mcp)).toHaveLength(0);
    });

    it("handles multiple servers", async () => {
      const servers = [testServer, { ...testServer, id: "server-2", name: "Server 2" }];
      const files = await adapter.generate(servers);
      const parsed = JSON.parse(files[0]!.content) as { mcp: Record<string, unknown> };
      expect(Object.keys(parsed.mcp)).toHaveLength(2);
    });

    it("generates with optional fields undefined", async () => {
      const server: MCPServerDefinition = {
        id: "minimal",
        name: "Minimal",
        transport: { type: "stdio", command: "node" },
      };
      const files = await adapter.generate([server]);
      const parsed = JSON.parse(files[0]!.content) as {
        mcp: Record<string, { command: string[]; environment: Record<string, string> }>;
      };
      expect(parsed.mcp["minimal"]?.command).toEqual(["node"]);
      expect(parsed.mcp["minimal"]?.environment).toEqual({});
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
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          mcp: {
            "my-server": {
              type: "local",
              command: ["npx", "-y", "test"],
              environment: { A: "1" },
            },
          },
        }),
      );
      const result = await adapter.import("/test");
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("my-server");
      expect(result[0]!.transport.type).toBe("stdio");
    });

    it("imports SSE servers from config", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          mcp: { sse: { type: "remote", url: "http://localhost:3000" } },
        }),
      );
      const result = await adapter.import("/test");
      expect(result).toHaveLength(1);
      expect(result[0]!.transport.type).toBe("http");
    });

    it("imports remote headers", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          mcp: {
            linear: {
              type: "remote",
              url: "https://mcp.linear.app/mcp",
              headers: { Authorization: "Bearer token" },
            },
          },
        }),
      );
      const result = await adapter.import("/test");
      expect(result[0]!.transport).toEqual({
        type: "http",
        url: "https://mcp.linear.app/mcp",
        headers: { Authorization: "Bearer token" },
      });
    });

    it("imports with missing servers key", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({}));
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
