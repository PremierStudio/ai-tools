# ai-tools

Same MCP servers, skills, agents, rules, and hooks — on every AI coding tool you actually use.

[![CI](https://github.com/itz4blitz/ai-tools/actions/workflows/pipeline.yml/badge.svg?branch=master)](https://github.com/itz4blitz/ai-tools/actions/workflows/pipeline.yml?query=branch%3Amaster)
[![npm](https://img.shields.io/npm/v/@itz4blitz/ai-tools.svg)](https://www.npmjs.com/package/@itz4blitz/ai-tools)

## Install

```bash
npm i -D @itz4blitz/ai-tools
```

Node 22+.

## Use it

```bash
npx ai-tools detect
npx ai-tools mcp init
```

Put servers in `mcp.config.ts`:

```ts
import { defineConfig } from "@itz4blitz/ai-tools/mcp";

export default defineConfig({
  servers: [
    {
      id: "github",
      name: "GitHub",
      transport: {
        type: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
      },
    },
  ],
});
```

```bash
npx ai-tools mcp install
```

That writes each tool's real file. Cursor gets `.cursor/mcp.json`. Claude Code gets `.mcp.json`. Grok and Codex get TOML `[mcp_servers]`. OpenCode gets `opencode.json`. ZCode gets `mcp.servers`. You don't keep those in sync by hand.

Skills, agents, rules, and hooks are the same commands:

```bash
npx ai-tools skills install
npx ai-tools agents install
npx ai-tools rules install
npx ai-tools hooks install
```

## Keep a server in the right repos

```ts
{
  id: "internal-wiki",
  name: "Internal wiki",
  transport: { type: "stdio", command: "wiki-mcp" },
  layer: "project",              // repo only (default)
  whenPathContains: ["acme-docs"],
}
```

`npx ai-tools mcp audit` lists user-global configs that look like they belong in a project.

## One bundle

```ts
import { definePlugin } from "@itz4blitz/ai-tools";

export default definePlugin({
  id: "team-defaults",
  name: "Team defaults",
  version: "1.0.0",
  mcpServers: [
    {
      id: "github",
      name: "GitHub",
      transport: {
        type: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
      },
    },
  ],
});
```

```bash
npx ai-tools plugins plan
npx ai-tools plugins install
```

## Tools

Claude Code, Cursor, Codex, OpenCode, Grok, ZCode, Gemini CLI, Cline, Copilot, Amp, Continue, Roo Code, Windsurf, Kiro, Factory Droid, Antigravity CLI.

## License

MIT. See [CONTRIBUTING.md](CONTRIBUTING.md) to work on the repo.
