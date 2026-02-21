const HELP = `
ai-tools-ui - Interactive terminal dashboard for AI coding tools

USAGE:
  ai-tools-ui [options]
  ai-tools ui [options]

OPTIONS:
  --help, -h    Show this help message
  --no-pty      Disable PTY embedding (use simple output mode)
  --detach      Run in background

DESCRIPTION:
  Launches an interactive terminal dashboard that embeds AI coding tools
  in panes, with session handoff between them.

FEATURES:
  - Tool launcher sidebar with status indicators
  - Embedded terminal panes for AI tools
  - Session browser across all detected tools
  - One-click handoff between tools
  - Config dashboard for all engines

KEYBINDINGS:
  q / Ctrl+C    Quit
  Tab / S-Tab   Navigate views
  j/k or arrows Select items
  1-4           Jump to view (Tools/Sessions/Handoff/Config)
`;

export type CliFlags = {
  help: boolean;
  noPty: boolean;
  detach: boolean;
};

export function parseFlags(args: string[]): CliFlags {
  return {
    help: args.includes("--help") || args.includes("-h"),
    noPty: args.includes("--no-pty"),
    detach: args.includes("--detach"),
  };
}

async function loadAppData() {
  const { createInitialState, detectTools, computeConfigHealth } = await import("../app.js");
  const { formatSessionRow } = await import("../widgets/session-browser.js");
  const { getEngineStatus } = await import("../widgets/config-dashboard.js");
  const { computeStatusBar } = await import("../widgets/status-bar.js");

  const state = createInitialState();
  const tools = await detectTools();
  const configHealth = await computeConfigHealth();
  const engines = await getEngineStatus();

  state.tools = tools;
  state.configHealth = configHealth;
  state.sessionCount = tools.reduce((sum, t) => sum + t.sessionCount, 0);

  const statusBar = computeStatusBar(state);

  // Build session rows from tool detection data
  let sessions: Awaited<ReturnType<typeof formatSessionRow>>[] = [];
  try {
    const { listSessions } = await import("../widgets/session-browser.js");
    const raw = await listSessions({ limit: 50 });
    sessions = raw.map(formatSessionRow);
  } catch {
    // Session loading failed, continue without sessions
  }

  return { state, tools, sessions, engines, statusBar };
}

export async function run(args: string[]): Promise<void> {
  const flags = parseFlags(args);

  if (flags.help) {
    console.log(HELP);
    return;
  }

  const { state, tools, sessions, engines, statusBar } = await loadAppData();

  if (flags.noPty) {
    // Simple text output mode
    console.log("AI Tools Dashboard (no-pty mode)\n");
    console.log(`Mode: ${state.mode}`);
    console.log(`Config: ${state.configHealth}`);
    console.log(`Sessions: ${state.sessionCount}`);
    console.log(`\nDetected tools:`);

    const { formatToolList } = await import("../widgets/tool-launcher.js");
    const lines = formatToolList(tools);
    for (const line of lines) {
      console.log(`  ${line}`);
    }
    return;
  }

  if (flags.detach) {
    console.log("Detach mode is not yet implemented.");
    return;
  }

  // Full TUI mode — launch Rezi interactive dashboard
  if (!process.stdout.isTTY) {
    // Not a terminal — fall back to text mode
    console.log("AI Tools Dashboard\n");
    console.log(`Mode: ${statusBar.mode}`);
    console.log(`Config: ${statusBar.configHealth}`);
    console.log(`Sessions: ${statusBar.sessionCount}`);
    console.log(`\nDetected ${tools.length} tool(s).`);
    console.log("TUI mode requires a terminal. Use --no-pty for simple output.");
    return;
  }

  try {
    const { startTui } = await import("../tui.js");
    await startTui({
      tools,
      sessions,
      engines,
      mode: statusBar.mode,
      configHealth: statusBar.configHealth,
      sessionCount: statusBar.sessionCount,
    });
  } catch (err) {
    // Rezi failed to start — fall back to text output
    console.error("TUI failed to start, falling back to text mode.");
    if (err instanceof Error) {
      console.error(`  ${err.message}`);
    }
    console.log("\nAI Tools Dashboard\n");
    console.log(`Mode: ${statusBar.mode}`);
    console.log(`Config: ${statusBar.configHealth}`);
    console.log(`Sessions: ${statusBar.sessionCount}`);
    console.log(`\nDetected ${tools.length} tool(s).`);

    const { formatToolList } = await import("../widgets/tool-launcher.js");
    const lines = formatToolList(tools);
    for (const line of lines) {
      console.log(`  ${line}`);
    }
  }
}
