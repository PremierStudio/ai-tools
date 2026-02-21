import { registry } from "../adapters/registry.js";
import type { BaseSessionAdapter } from "../adapters/base.js";
import type { UnifiedSession } from "../types/index.js";

// Import all adapters to register them
import "../adapters/all.js";

const HELP = `
ai-sessions - Cross-tool session reading and context handoff for AI coding tools

USAGE:
  ai-sessions <command> [options]

COMMANDS:
  detect      Show detected AI tools with session storage
  list        List sessions across all detected tools
  context     Extract and display handoff context for a session
  handoff     Generate handoff markdown for a session
  scan        Force rebuild session index from all tools
  help        Show this help message

OPTIONS:
  --tool      Filter by tool (e.g., --tool=claude)
  --limit     Limit number of results (e.g., --limit=10)
  --since     Filter by date (e.g., --since=2025-01-01)
  --to        Target tool for handoff (e.g., --to=codex)
  --verbose   Show detailed output

EXAMPLES:
  ai-sessions detect                      # See which AI tools have sessions
  ai-sessions list                        # List all sessions
  ai-sessions list --tool=claude          # List Claude Code sessions only
  ai-sessions context <session-id>        # Show handoff context
  ai-sessions handoff <session-id>        # Generate handoff markdown
  ai-sessions handoff <id> --to=codex     # Show launch command for Codex
  ai-sessions scan                        # Rebuild session index
`;

type Flags = {
  tool?: string;
  limit?: number;
  since?: string;
  to?: string;
  verbose?: boolean;
};

export async function run(args: string[]): Promise<void> {
  const command = args[0];
  const remaining = args.slice(1);
  const flags = parseFlags(remaining);
  const positional = remaining.filter((a) => !a.startsWith("--"));

  switch (command) {
    case "detect":
      await cmdDetect();
      break;
    case "list":
      await cmdList(flags);
      break;
    case "context":
      await cmdContext(positional[0], flags);
      break;
    case "handoff":
      await cmdHandoff(positional[0], flags);
      break;
    case "scan":
      await cmdScan(flags);
      break;
    case "help":
    case "--help":
    case "-h":
    case undefined:
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

// -- Commands --

async function cmdDetect(): Promise<void> {
  console.log("Detecting AI tools with session storage...\n");

  const all = registry.list();
  const detected = await registry.detectAll();

  for (const id of all) {
    const adapter = registry.get(id);
    if (!adapter) continue;

    const isDetected = detected.some((d) => d.id === id);
    const icon = isDetected ? "\u2713" : "\u2717";
    const color = isDetected ? "\x1b[32m" : "\x1b[90m";
    const reset = "\x1b[0m";

    const storagePath = isDetected ? await adapter.getStoragePath() : null;
    const pathInfo = storagePath ? ` (${storagePath})` : "";

    console.log(`  ${color}${icon}${reset} ${adapter.name.padEnd(20)} ${adapter.id}${pathInfo}`);
  }

  console.log(`\nDetected ${detected.length}/${all.length} tools`);
}

async function cmdList(flags: Flags): Promise<void> {
  const adapters = await resolveAdapters(flags);

  if (adapters.length === 0) {
    console.log("No AI tools detected. Install a supported tool to see sessions.");
    return;
  }

  const { filterSessions } = await import("../utils/index.js");
  const { summarizeSession } = await import("../utils/tool-summarizer.js");

  const allSessions = [];
  for (const adapter of adapters) {
    try {
      const sessions = await adapter.parseSessions();
      allSessions.push(...sessions);
    } catch {
      // Skip adapters that fail
    }
  }

  // Sort all sessions by updatedAt desc
  allSessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const filter = buildFilter(flags);
  const filtered = filterSessions(allSessions, filter);

  if (filtered.length === 0) {
    console.log("No sessions found.");
    return;
  }

  console.log(`Found ${filtered.length} session(s):\n`);
  for (const session of filtered) {
    console.log(`  ${session.id}  ${summarizeSession(session)}`);
  }
}

async function cmdContext(sessionId: string | undefined, flags: Flags): Promise<void> {
  if (!sessionId) {
    console.error("Usage: ai-sessions context <session-id>");
    process.exit(1);
  }

  const result = await findSession(sessionId, flags);
  if (!result) {
    console.error(`Session not found: ${sessionId}`);
    process.exit(1);
  }

  const ctx = await result.adapter.extractContext(result.session);
  console.log(ctx.handoffMarkdown);
}

async function cmdHandoff(sessionId: string | undefined, flags: Flags): Promise<void> {
  if (!sessionId) {
    console.error("Usage: ai-sessions handoff <session-id> [--to <tool>]");
    process.exit(1);
  }

  const result = await findSession(sessionId, flags);
  if (!result) {
    console.error(`Session not found: ${sessionId}`);
    process.exit(1);
  }

  const ctx = await result.adapter.extractContext(result.session);
  const { formatHandoffMarkdown } = await import("../utils/markdown.js");
  const markdown = formatHandoffMarkdown(ctx);

  console.log(markdown);

  if (flags.to) {
    const { launchWithContext } = await import("../utils/resume.js");
    const launch = launchWithContext(flags.to, ctx);
    if (launch) {
      console.log(`\nTo continue in ${flags.to}:`);
      console.log(`  ${launch.command} ${launch.args.length > 0 ? launch.args[0] + " ..." : ""}`);
    } else {
      console.log(`\nNo launch command available for: ${flags.to}`);
    }
  }
}

async function cmdScan(flags: Flags): Promise<void> {
  const adapters = await resolveAdapters(flags);

  if (adapters.length === 0) {
    console.log("No AI tools detected.");
    return;
  }

  const { toIndexEntry, writeIndex } = await import("../utils/index.js");

  console.log("Scanning sessions from all detected tools...\n");

  const entries = [];
  for (const adapter of adapters) {
    try {
      const sessions = await adapter.parseSessions();
      console.log(`  \u2713 ${adapter.name}: ${sessions.length} session(s)`);
      for (const session of sessions) {
        entries.push(toIndexEntry(session));
      }
    } catch {
      console.log(`  \u2717 ${adapter.name}: scan failed`);
    }
  }

  const index = {
    sessions: entries,
    updatedAt: new Date().toISOString(),
  };

  await writeIndex(index);
  console.log(`\nIndex updated: ${entries.length} session(s) total`);
}

// -- Helpers --

function parseFlags(args: string[]): Flags {
  const flags: Flags = {};

  for (const arg of args) {
    if (arg.startsWith("--tool=")) {
      flags.tool = arg.slice(7);
    } else if (arg.startsWith("--limit=")) {
      flags.limit = parseInt(arg.slice(8), 10);
    } else if (arg.startsWith("--since=")) {
      flags.since = arg.slice(8);
    } else if (arg.startsWith("--to=")) {
      flags.to = arg.slice(5);
    } else if (arg === "--verbose") {
      flags.verbose = true;
    }
  }

  return flags;
}

function buildFilter(flags: Flags): { tool?: string; limit?: number; since?: Date } {
  const filter: { tool?: string; limit?: number; since?: Date } = {};
  if (flags.tool) filter.tool = flags.tool;
  if (flags.limit) filter.limit = flags.limit;
  if (flags.since) filter.since = new Date(flags.since);
  return filter;
}

async function resolveAdapters(flags: Flags): Promise<BaseSessionAdapter[]> {
  if (flags.tool) {
    const adapter = registry.get(flags.tool);
    if (adapter) return [adapter];
    console.warn(`Warning: Unknown tool "${flags.tool}"`);
    return [];
  }
  return registry.detectAll();
}

async function findSession(
  sessionId: string,
  flags: Flags,
): Promise<{ session: UnifiedSession; adapter: BaseSessionAdapter } | null> {
  const adapters = await resolveAdapters(flags);

  for (const adapter of adapters) {
    try {
      const sessions = await adapter.parseSessions();
      const found = sessions.find((s) => s.id === sessionId);
      if (found) return { session: found, adapter };
    } catch {
      // Skip adapters that fail
    }
  }

  return null;
}
