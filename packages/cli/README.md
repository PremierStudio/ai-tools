# @itz4blitz/ai-tools

[![CI](https://github.com/itz4blitz/ai-tools/actions/workflows/pipeline.yml/badge.svg)](https://github.com/itz4blitz/ai-tools/actions/workflows/pipeline.yml)
[![npm](https://img.shields.io/npm/v/@itz4blitz/ai-tools.svg)](https://www.npmjs.com/package/@itz4blitz/ai-tools)
![Node.js >=22](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)
![License MIT](https://img.shields.io/badge/license-MIT-16A34A)

One CLI that writes the **native** config files each AI coding tool actually loads — MCP servers, skills, agents, rules, and hooks.

Claude Code, Cursor, Codex, OpenCode, Grok, and ZCode do not share a format. Cursor wants `.cursor/mcp.json` with `"type": "http"`. Grok wants TOML `[mcp_servers]`. ZCode wants `mcp.servers` inside `~/.zcode/cli/config.json`. Skills live in `skills/<id>/SKILL.md` on the hosts that implement Agent Skills, and Cursor rules are flat `*.mdc` files.

`ai-tools` is the translator. You describe the capability once. It emits the files the host reads.

```bash
npm i -D @itz4blitz/ai-tools
npx ai-tools detect
```

Requires Node 22+.

## Do this, not that

**Install from a config file.** `ai-tools mcp install --layer=project` writes only the servers in `mcp.config.ts` that match the current repo.

**Do not copy one tool's live config onto every other tool.** That is how org MCP servers and interactive 1Password wrappers leak into user-global Cursor/Grok/ZCode configs. Unified `ai-tools sync` is disabled. `ai-tools mcp sync` is an alias of config-scoped install and **refuses** to run when the config selects nothing.

```bash
npx ai-tools mcp audit    # scan user-global MCP configs for those leaks
```

## 60-second path

```bash
npx ai-tools detect                         # what is installed on this machine
npx ai-tools mcp init                       # mcp.config.ts
# edit mcp.config.ts
npx ai-tools mcp install --layer=project    # native files for detected hosts
npx ai-tools mcp audit
```

Same shape for the other engines:

```bash
npx ai-tools hooks init && npx ai-tools hooks install
npx ai-tools skills init && npx ai-tools skills install
npx ai-tools agents init && npx ai-tools agents install
npx ai-tools rules init && npx ai-tools rules install
```

## MCP config

```ts
// mcp.config.ts
import { defineConfig } from "@itz4blitz/ai-tools/mcp";

export default defineConfig({
  servers: [
    {
      id: "github",
      name: "GitHub",
      transport: { type: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-github"] },
      layer: "user",
    },
    {
      id: "internal-wiki",
      name: "Internal wiki",
      transport: { type: "stdio", command: "wiki-mcp" },
      layer: "project",
      whenPathContains: ["internal-wiki", "docs-site"],
    },
  ],
});
```

| Field | Effect |
|-------|--------|
| `layer: "user"` | Eligible for user-global install (`--layer=user`) |
| `layer: "project"` (default) | Eligible for repo install (`--layer=project`) |
| `whenPathContains` | Server is skipped unless `process.cwd()` contains one of the fragments |

Empty config → install/sync/generate **exit 1**. They will not write `{}` over a working host file.

### What gets written

| Host | Project file | User file |
|------|----------------|-----------|
| Cursor | `.cursor/mcp.json` (`mcpServers`, HTTP/SSE include `type`) | `~/.cursor/mcp.json` |
| Claude Code | `.mcp.json` | `~/.claude.json` |
| Grok | `.grok/config.toml` `[mcp_servers]` | `~/.grok/config.toml` |
| Codex | `.codex/config.toml` `[mcp_servers]` | `~/.codex/config.toml` |
| OpenCode | `opencode.json` `mcp` | `~/.config/opencode/opencode.json` |
| ZCode | `.zcode/config.json` `mcp.servers` | `~/.zcode/cli/config.json` |

ZCode's leftover `.zcode/mcp.json` is **not** what the CLI reads. This package does not write it.

## Skills, agents, rules, hooks

Where the host implements Agent Skills, generate writes `skills/<id>/SKILL.md` (Grok, ZCode, Cursor, Claude Code, Codex, OpenCode). Hosts that only have prompt files keep those (Amp, Cline, Continue, …).

Cursor rules are flat `.cursor/rules/<id>.mdc`. OpenCode agents are `.opencode/agent/<id>.md` (singular). Grok/ZCode hooks write JSON the host loads and a runner that actually executes `HookEngine` — not a stub `process.exit(0)`.

```ts
// ai-hooks.config.ts
import { defineConfig, hook, builtinHooks } from "@itz4blitz/ai-tools/hooks";

export default defineConfig({
  extends: [{ hooks: builtinHooks }],
  hooks: [
    hook("before", ["shell:before"], async (ctx, next) => {
      if (ctx.event.command.includes("npm publish")) {
        ctx.results.push({ blocked: true, reason: "Publishing is restricted" });
        return;
      }
      await next();
    })
      .id("org:block-publish")
      .name("Block npm publish")
      .priority(10)
      .build(),
  ],
});
```

Built-in guardrails: `block-dangerous-commands`, `scan-secrets`, `protect-sensitive-files`, `audit-shell`.

## Plugin bundle

`definePlugin()` is one file that can carry MCP + skills + agents + rules + hooks. `plugins plan` shows what each host can consume. `plugins install` writes only those pieces, and MCP servers still go through `layer` / `whenPathContains`.

```ts
// ai-plugin.config.ts
import { definePlugin } from "@itz4blitz/ai-tools";

export default definePlugin({
  id: "release-confidence",
  name: "Release Confidence",
  version: "0.1.0",
  targets: { include: ["claude-code", "cursor", "opencode", "codex"] },
  mcpServers: [
    {
      id: "example-mcp",
      name: "Example MCP",
      transport: { type: "stdio", command: "npx", args: ["-y", "example-mcp"] },
    },
  ],
  skills: [
    {
      id: "ship-check",
      name: "Ship Check",
      content: "Run the failing test first, then the smallest fix that makes it pass.",
    },
  ],
});
```

```bash
npx ai-tools plugins plan --tools=claude-code,cursor,opencode,codex
npx ai-tools plugins install --tools=claude-code,cursor,opencode,codex
```

## Hosts

| Host | Hooks | MCP | Agents | Skills | Rules |
|------|:-----:|:---:|:------:|:------:|:-----:|
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Cursor](https://cursor.com) | ✓ | ✓ | ✓ | ✓ | ✓ |
| [OpenCode](https://opencode.ai) | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Codex](https://openai.com/codex/) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Grok | ✓ | ✓ | ✓ | ✓ | ✓ |
| ZCode | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Antigravity CLI](https://www.antigravity.google/product/antigravity-cli) | | | ✓ | ✓ | ✓ |
| [Kiro](https://kiro.dev) | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Cline](https://cline.bot) | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Amp](https://ampcode.com) | | ✓ | | ✓ | ✓ |
| [Factory Droid](https://factory.ai) | ✓ | ✓ | ✓ | ✓ | ✓ |
| [VS Code / Copilot](https://code.visualstudio.com) | ✱ | ✓ | ✓ | ✓ | ✓ |
| [Continue](https://continue.dev) | | | | ✓ | ✓ |
| [Roo Code](https://roocode.com) | | ✓ | ✓ | ✓ | ✓ |
| [Windsurf](https://windsurf.com) | | ✓ | | ✓ | ✓ |

<sub>✱ VS Code 1.109+ agent hooks use the Claude Code format. Empty cells mean this repo has no adapter, not that the host lacks the feature.</sub>

## CLI

```text
ai-tools <engine> <command>
ai-tools detect | init | generate | install | status | clean | ui
```

There is no top-level `sync`. Use `ai-tools mcp install` / `ai-tools mcp sync` from a config file.

| Engine | Job |
|--------|-----|
| `mcp` | MCP server config, scoped install, audit |
| `skills` | Skills / prompts |
| `agents` | Agent personas |
| `rules` | Project rules |
| `hooks` | Lifecycle guardrails |
| `plugins` | Portable bundles |
| `sessions` | Cross-tool session read / handoff |
| `ui` | Terminal dashboard |

Public install is **one package**: [`@itz4blitz/ai-tools`](https://www.npmjs.com/package/@itz4blitz/ai-tools). Workspaces under `packages/*` are how the engines are developed; they are not published separately.

Canonical mode (`ai-tools init` / `generate` / `install`) still exists for a `.ai-tools/` store. Prefer per-engine `mcp.config.ts` (and friends) unless you already use canonical mode.

## Develop

```bash
git clone https://github.com/itz4blitz/ai-tools.git
cd ai-tools
npm install
npm run check
```

| Command | What it does |
|---------|--------------|
| `npm run check` | production audit + lint + format + typecheck + coverage-gated tests + pack smoke |
| `npm run build` | Turborepo build |
| `npm test` | vitest |

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
