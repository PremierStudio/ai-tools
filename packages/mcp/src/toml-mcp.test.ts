import { describe, expect, it } from "vitest";
import {
  encodeMcpToml,
  mergeMcpToml,
  parseMcpToml,
  stripMcpTomlTables,
  tomlKey,
} from "./toml-mcp.js";
import type { MCPServerDefinition } from "./types/index.js";

const stdio: MCPServerDefinition = {
  id: "context7",
  name: "context7",
  transport: {
    type: "stdio",
    command: "/home/blitz/.local/bin/op-mcp-run-grok",
    args: ["npx", "-y", "@upstash/context7-mcp"],
    env: { CONTEXT7_API_KEY: "op://mcp-secrets/Context7 API Key/password" },
  },
};

const spaced: MCPServerDefinition = {
  id: "GWS - Premier Studio",
  name: "GWS - Premier Studio",
  transport: { type: "stdio", command: "/home/blitz/.local/bin/gws-mcp-premier-studio" },
};

const remote: MCPServerDefinition = {
  id: "linear",
  name: "linear",
  transport: {
    type: "http",
    url: "https://mcp.linear.app/mcp",
    headers: { Authorization: "Bearer token" },
  },
};

describe("tomlKey", () => {
  it("leaves bare keys unquoted", () => {
    expect(tomlKey("palamhealth")).toBe("palamhealth");
  });

  it("quotes names with spaces", () => {
    expect(tomlKey("GWS - Premier Studio")).toBe('"GWS - Premier Studio"');
  });
});

describe("encodeMcpToml / parseMcpToml", () => {
  it("round-trips stdio servers with env tables", () => {
    const encoded = encodeMcpToml([stdio]);
    expect(encoded).toContain("[mcp_servers.context7]");
    expect(encoded).toContain("[mcp_servers.context7.env]");
    expect(encoded).toContain('command = "/home/blitz/.local/bin/op-mcp-run-grok"');
    expect(parseMcpToml(encoded)).toEqual([
      {
        id: "context7",
        name: "context7",
        transport: stdio.transport,
        enabled: undefined,
      },
    ]);
  });

  it("round-trips quoted table names", () => {
    const encoded = encodeMcpToml([spaced]);
    expect(encoded).toContain('[mcp_servers."GWS - Premier Studio"]');
    expect(parseMcpToml(encoded)[0]?.id).toBe("GWS - Premier Studio");
  });

  it("round-trips http servers with headers", () => {
    const encoded = encodeMcpToml([remote]);
    expect(encoded).toContain('url = "https://mcp.linear.app/mcp"');
    expect(parseMcpToml(encoded)[0]?.transport).toEqual(remote.transport);
  });

  it("parses inline env and headers tables from host files", () => {
    const parsed = parseMcpToml(`[mcp_servers.filesystem]
command = "npx"
args = ["-y", "server"]
env = { API_KEY = "secret", OTHER = "x" }

[mcp_servers.linear]
url = "https://mcp.linear.app/mcp"
headers = { "Authorization" = "Bearer token", "x-mcp-session-id" = "{{session_id}}" }
`);
    expect(parsed.find((s) => s.id === "filesystem")?.transport).toEqual({
      type: "stdio",
      command: "npx",
      args: ["-y", "server"],
      env: { API_KEY: "secret", OTHER: "x" },
    });
    expect(parsed.find((s) => s.id === "linear")?.transport).toEqual({
      type: "http",
      url: "https://mcp.linear.app/mcp",
      headers: { Authorization: "Bearer token", "x-mcp-session-id": "{{session_id}}" },
    });
  });

  it("parses Codex http_headers as transport headers", () => {
    const parsed = parseMcpToml(`[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
http_headers = { "X-Figma-Region" = "us-east-1" }
`);
    expect(parsed[0]?.transport).toEqual({
      type: "http",
      url: "https://mcp.figma.com/mcp",
      headers: { "X-Figma-Region": "us-east-1" },
    });
  });

  it("parses nested http_headers tables", () => {
    const parsed = parseMcpToml(`[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"

[mcp_servers.figma.http_headers]
X-Figma-Region = "us-east-1"
`);
    expect(parsed[0]?.transport).toEqual({
      type: "http",
      url: "https://mcp.figma.com/mcp",
      headers: { "X-Figma-Region": "us-east-1" },
    });
  });

  it("parses empty inline env without treating it as a command env", () => {
    const parsed = parseMcpToml(`[mcp_servers.x]
command = "x"
env = {}
`);
    expect(parsed[0]?.transport).toEqual({ type: "stdio", command: "x" });
  });

  it("encodes Codex HTTP remotes with http_headers tables", () => {
    const encoded = encodeMcpToml([remote], { headerTable: "http_headers" });
    expect(encoded).toContain("[mcp_servers.linear.http_headers]");
    expect(encoded).toContain('Authorization = "Bearer token"');
    expect(parseMcpToml(encoded)[0]?.transport).toEqual(remote.transport);
  });

  it("encodes enabled = false", () => {
    const encoded = encodeMcpToml([{ ...stdio, enabled: false }]);
    expect(encoded).toContain("enabled = false");
    expect(parseMcpToml(encoded)[0]?.enabled).toBe(false);
  });

  it("returns empty string for no servers", () => {
    expect(encodeMcpToml([])).toBe("");
    expect(parseMcpToml("")).toEqual([]);
  });
});

describe("mergeMcpToml", () => {
  it("preserves unrelated tables and replaces managed MCP servers", () => {
    const existing = `[ui]
yolo = false

[mcp_servers.palamhealth]
command = "/old/palamhealth"

[mcp_servers.unifi]
command = "/home/blitz/.local/bin/uvx"
`;
    const merged = mergeMcpToml(
      existing,
      [{ id: "github", name: "github", transport: { type: "stdio", command: "gh-mcp" } }],
      ["palamhealth", "github"],
    );
    expect(merged).toContain("[ui]");
    expect(merged).toContain("yolo = false");
    expect(merged).toContain("[mcp_servers.unifi]");
    expect(merged).toContain("[mcp_servers.github]");
    expect(merged).not.toContain("palamhealth");
  });

  it("strips mcp_servers tables from mixed files", () => {
    const stripped = stripMcpTomlTables(`[ui]\nyolo = true\n\n[mcp_servers.x]\ncommand = "x"\n`);
    expect(stripped).toContain("[ui]");
    expect(stripped).not.toContain("mcp_servers");
  });

  it("re-encodes Codex merges with http_headers", () => {
    const merged = mergeMcpToml('model = "gpt-5"\n', [remote], ["linear"], {
      headerTable: "http_headers",
    });
    expect(merged).toContain('model = "gpt-5"');
    expect(merged).toContain("[mcp_servers.linear.http_headers]");
    expect(merged).not.toContain("[mcp_servers.linear.headers]");
  });
});
