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
import { CopilotMCPAdapter } from "./copilot.js";
import type { MCPServerDefinition } from "../types/index.js";

describe("CopilotMCPAdapter", () => {
  let adapter: CopilotMCPAdapter;

  const testServer: MCPServerDefinition = {
    id: "test-server",
    name: "Test Server",
    transport: { type: "stdio", command: "npx", args: ["-y", "test-mcp"], env: { KEY: "val" } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new CopilotMCPAdapter();
  });

  describe("metadata", () => {
    it("has correct id", () => expect(adapter.id).toBe("copilot"));
    it("has correct name", () => expect(adapter.name).toBe("Copilot"));
    it("has native support", () => expect(adapter.nativeSupport).toBe(true));
    it("has correct config path", () => expect(adapter.configPath).toBe(".vscode/mcp.json"));
  });

  describe("generate", () => {
    it("generates valid JSON config with servers key (not mcpServers)", async () => {
      const files = await adapter.generate([testServer]);
      expect(files).toHaveLength(1);
      expect(files[0]!.path).toBe(".vscode/mcp.json");
      expect(files[0]!.format).toBe("json");
      const parsed = JSON.parse(files[0]!.content);
      expect(parsed.servers["test-server"]).toBeDefined();
      expect(parsed.servers["test-server"].command).toBe("npx");
      expect(parsed.servers["test-server"].type).toBe("stdio");
    });

    it("handles SSE transport", async () => {
      const sseServer: MCPServerDefinition = {
        id: "sse-server",
        name: "SSE Server",
        transport: { type: "sse", url: "http://localhost:3000" },
      };
      const files = await adapter.generate([sseServer]);
      const parsed = JSON.parse(files[0]!.content);
      expect(parsed.servers["sse-server"].url).toBe("http://localhost:3000");
      expect(parsed.servers["sse-server"].type).toBe("sse");
    });

    it("handles empty servers array", async () => {
      const files = await adapter.generate([]);
      const parsed = JSON.parse(files[0]!.content);
      expect(Object.keys(parsed.servers)).toHaveLength(0);
    });

    it("handles multiple servers", async () => {
      const servers = [testServer, { ...testServer, id: "server-2", name: "Server 2" }];
      const files = await adapter.generate(servers);
      const parsed = JSON.parse(files[0]!.content);
      expect(Object.keys(parsed.servers)).toHaveLength(2);
    });

    it("generates with optional fields undefined", async () => {
      const server: MCPServerDefinition = {
        id: "minimal",
        name: "Minimal",
        transport: { type: "stdio", command: "node" },
      };
      const files = await adapter.generate([server]);
      const parsed = JSON.parse(files[0]!.content);
      expect(parsed.servers["minimal"].args).toEqual([]);
      expect(parsed.servers["minimal"].env).toEqual({});
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
          servers: {
            "my-server": { type: "stdio", command: "npx", args: ["-y", "test"], env: { A: "1" } },
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
          servers: { sse: { type: "sse", url: "http://localhost:3000" } },
        }),
      );
      const result = await adapter.import("/test");
      expect(result).toHaveLength(1);
      expect(result[0]!.transport.type).toBe("sse");
    });

    it("imports SSE servers by url without type field", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          servers: { sse: { url: "http://localhost:3000" } },
        }),
      );
      const result = await adapter.import("/test");
      expect(result).toHaveLength(1);
      expect(result[0]!.transport.type).toBe("sse");
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
