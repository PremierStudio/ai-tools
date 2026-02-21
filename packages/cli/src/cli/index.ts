const HELP = `
ai-tools - Unified CLI for all ai-hooks engines

USAGE:
  ai-tools <engine> <command> [options]
  ai-tools <cross-cutting-command> [options]

ENGINES:
  hooks       Lifecycle hooks for AI coding tools
  mcp         MCP server configuration
  skills      Skills/prompts configuration
  agents      Agent configuration
  rules       Project rules configuration
  sessions    Cross-tool session reading and handoff

CROSS-CUTTING COMMANDS:
  detect      Run detect across all engines
  sync        Run sync across supported engines (hooks excluded)
  help        Show this help message

INTERACTIVE:
  ui          Launch interactive terminal dashboard

CANONICAL MODE COMMANDS:
  init        Initialize .ai-tools/ directory (canonical mode)
  generate    Generate canonical files from engine configs
  install     Install from canonical store to tool directories
  status      Show installation mode and health
  clean       Remove tool-specific directories

ENGINE COMMANDS:
  Pass any command supported by the engine's CLI.
  Example: ai-tools mcp install --tools=claude-code

OPTIONS:
  --tools     Comma-separated list of tools (forwarded to engine)
  --dry-run   Show what would happen without writing files

EXAMPLES:
  ai-tools mcp detect                     # Detect MCP-capable tools
  ai-tools skills sync                    # Sync skills across tools
  ai-tools detect                         # Detect across all engines
  ai-tools sync --dry-run                 # Sync all engines (dry run)
  ai-tools hooks init                     # Initialize hooks config
  ai-tools init                           # Initialize canonical mode
  ai-tools generate                       # Generate canonical files
  ai-tools install                        # Install to tool directories
  ai-tools status                         # Check installation health
  ai-tools clean                          # Remove tool directories
`;

type EngineEntry = {
  name: string;
  pkg: string;
  hasSync: boolean;
};

const ENGINES: Record<string, EngineEntry> = {
  hooks: { name: "hooks", pkg: "@premierstudio/ai-hooks/cli", hasSync: false },
  mcp: { name: "mcp", pkg: "@premierstudio/ai-mcp/cli", hasSync: true },
  skills: { name: "skills", pkg: "@premierstudio/ai-skills/cli", hasSync: true },
  agents: { name: "agents", pkg: "@premierstudio/ai-agents/cli", hasSync: true },
  rules: { name: "rules", pkg: "@premierstudio/ai-rules/cli", hasSync: true },
  sessions: { name: "sessions", pkg: "@premierstudio/ai-sessions/cli", hasSync: false },
};

const ENGINE_NAMES = Object.keys(ENGINES);

async function loadEngine(pkg: string): Promise<{ run: (args: string[]) => Promise<void> }> {
  return import(pkg) as Promise<{ run: (args: string[]) => Promise<void> }>;
}

export async function run(args: string[]): Promise<void> {
  const command = args[0];

  switch (command) {
    case "help":
    case "--help":
    case "-h":
    case undefined:
      console.log(HELP);
      return;

    case "detect":
      await crossCutDetect(args.slice(1));
      return;

    case "sync":
      await crossCutSync(args.slice(1));
      return;

    case "init":
      await (await import("../canonical/commands.js")).cmdInit(args.slice(1));
      return;

    case "generate":
      await (await import("../canonical/commands.js")).cmdGenerate(args.slice(1));
      return;

    case "install":
      await (await import("../canonical/commands.js")).cmdInstall(args.slice(1));
      return;

    case "status":
      await (await import("../canonical/commands.js")).cmdStatus(args.slice(1));
      return;

    case "clean":
      await (await import("../canonical/commands.js")).cmdClean(args.slice(1));
      return;

    case "ui":
      await (await import("@premierstudio/ai-tools-ui/cli")).run(args.slice(1));
      return;

    default:
      // Check if it's an engine name
      if (command in ENGINES) {
        const engine = ENGINES[command];
        if (engine) {
          const mod = await loadEngine(engine.pkg);
          await mod.run(args.slice(1));
          return;
        }
      }

      // Unknown command
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

async function crossCutDetect(flags: string[]): Promise<void> {
  for (const name of ENGINE_NAMES) {
    const engine = ENGINES[name];
    if (!engine) continue;
    console.log(`\n── ${engine.name} ──`);
    try {
      const mod = await loadEngine(engine.pkg);
      await mod.run(["detect", ...flags]);
    } catch (err) {
      console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

async function crossCutSync(flags: string[]): Promise<void> {
  for (const name of ENGINE_NAMES) {
    const engine = ENGINES[name];
    if (!engine || !engine.hasSync) continue;

    console.log(`\n── ${engine.name} ──`);
    try {
      const mod = await loadEngine(engine.pkg);
      await mod.run(["sync", ...flags]);
    } catch (err) {
      console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
