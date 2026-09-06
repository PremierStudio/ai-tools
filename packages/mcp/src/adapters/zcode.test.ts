import { describe, it, expect, vi, beforeEach } from "vitest";
import { homedir } from "node:os";

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
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { ZcodeMCPAdapter } from "./zcode.js";
import type { MCPServerDefinition } from "../types/index.js";

describe("ZcodeMCPAdapter", () => {
  let adapter: ZcodeMCPAdapter;
  const stdio: MCPServerDefinition = {
    id: "github",
    name: "github",
    transport: { type: "stdio", command: "/home/blitz/.local/bin/gh-mcp", args: [] },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new ZcodeMCPAdapter();
  });

  it("uses ZCode user and project paths", () => {
    expect(adapter.id).toBe("zcode");
    expect(adapter.name).toBe("ZCode");
    expect(adapter.configPath).toBe(".zcode/mcp.json");
    expect(adapter.userConfigPath).toBe(`${homedir()}/.zcode/cli/config.json`);
    expect(adapter.command).toBe("zcode");
  });

  it("detects ZCode from the user config even without a zcode binary", async () => {
    vi.mocked(existsSync).mockImplementation((path) => String(path).endsWith("cli/config.json"));
    expect(await adapter.detect("/tmp/empty")).toBe(true);
  });

  it("generates project mcpServers JSON", async () => {
    const files = await adapter.generate([stdio]);
    expect(files[0]?.path).toBe(".zcode/mcp.json");
    const parsed = JSON.parse(files[0]!.content) as {
      mcpServers: Record<string, { command: string }>;
    };
    expect(parsed.mcpServers.github?.command).toBe("/home/blitz/.local/bin/gh-mcp");
  });

  it("imports user mcp.servers without clobbering other config keys", async () => {
    vi.mocked(existsSync).mockImplementation((path) => String(path).endsWith("config.json"));
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        model: "keep-me",
        mcp: {
          servers: {
            palamhealth: {
              type: "stdio",
              command: "/home/blitz/.local/bin/palamhealth-mcp-stdio",
              args: [],
              env: { OP_ACCOUNT: "palamhealth.1password.com" },
            },
          },
        },
      }),
    );
    const servers = await adapter.importUser();
    expect(servers).toHaveLength(1);
    expect(servers[0]?.id).toBe("palamhealth");
    expect(servers[0]?.transport.type).toBe("stdio");
  });

  it("merges generated servers into existing user config.json", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({ model: "keep-me", mcp: { servers: {} } }),
    );
    await adapter.install(
      [
        {
          path: `${homedir()}/.zcode/cli/config.json`,
          content: JSON.stringify({ mcpServers: { github: { command: "gh-mcp", args: [] } } }),
          format: "json",
        },
      ],
      "/tmp",
    );
    const written = JSON.parse(String(vi.mocked(writeFile).mock.calls[0]?.[1])) as {
      model: string;
      mcp: { servers: Record<string, { command: string; type: string }> };
    };
    expect(written.model).toBe("keep-me");
    expect(written.mcp.servers.github?.type).toBe("stdio");
    expect(written.mcp.servers.github?.command).toBe("gh-mcp");
    expect(vi.mocked(mkdir)).toHaveBeenCalled();
  });
});
