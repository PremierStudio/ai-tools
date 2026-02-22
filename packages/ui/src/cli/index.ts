const HELP = `
ai-tools-ui - Interactive terminal dashboard for AI coding tools

USAGE:
  ai-tools-ui [options]
  ai-tools ui [options]

OPTIONS:
  --help, -h    Show this help message
  --no-pty      Disable PTY embedding (use simple output mode)
  --detach      Run in background
  --dev         Hot State-Preserving Reload (HSR) mode — run alongside
                \`npm run dev\` (tsup --watch) in a separate terminal.
                Edits to any view file are live-swapped without losing state.

KEYBINDINGS:
  q / Ctrl+C    Quit
  Escape        Settings menu (theme, keybindings, general)
  Tab / S-Tab   Navigate views
  j/k / arrows  Select items
  1-4           Jump to view
  Enter         Launch tool / confirm
  ?             Help overlay
  t             Cycle theme
  [ / ]         Collapse/expand sidebar

  Terminal panes (after launching a tool):
  Ctrl+A        Command mode prefix (like tmux)
  Ctrl+A, d     Return to dashboard
  Ctrl+A, c     New pane
  Ctrl+A, x     Close pane
  Ctrl+A, n/p   Next/prev pane
`;

export type CliFlags = {
  help: boolean;
  noPty: boolean;
  detach: boolean;
  dev: boolean;
};

export function parseFlags(args: string[]): CliFlags {
  return {
    help: args.includes("--help") || args.includes("-h"),
    noPty: args.includes("--no-pty"),
    detach: args.includes("--detach"),
    dev: args.includes("--dev"),
  };
}

/**
 * Load app data for text/fallback mode only.
 * The TUI loads its own data asynchronously after starting.
 */
async function loadTextModeData() {
  const { createInitialState, detectTools, computeConfigHealth, detectMode } =
    await import("../app.js");
  const { formatSessionRow } = await import("../widgets/session-browser.js");
  const { getEngineStatus } = await import("../widgets/config-dashboard.js");
  const { computeStatusBar } = await import("../widgets/status-bar.js");

  const state = createInitialState();
  const [tools, configHealth, engines, mode] = await Promise.all([
    detectTools(),
    computeConfigHealth(),
    getEngineStatus(),
    detectMode(),
  ]);

  state.tools = tools;
  state.configHealth = configHealth;
  state.mode = mode;
  state.sessionCount = tools.reduce((sum, t) => sum + t.sessionCount, 0);

  const statusBar = computeStatusBar(state);

  let sessions: Awaited<ReturnType<typeof formatSessionRow>>[] = [];
  try {
    const { listSessions } = await import("../widgets/session-browser.js");
    const raw = await listSessions({ limit: 50 });
    sessions = raw.map(formatSessionRow);
  } catch {
    // Session loading failed — continue without sessions
  }

  return { state, tools, sessions, engines, statusBar, mode };
}

export async function run(args: string[]): Promise<void> {
  const flags = parseFlags(args);

  if (flags.help) {
    console.log(HELP);
    return;
  }

  if (flags.noPty) {
    const { state, tools, statusBar } = await loadTextModeData();
    console.log("AI Tools Dashboard (no-pty mode)\n");
    console.log(`Mode: ${statusBar.mode}`);
    console.log(`Config: ${statusBar.configHealth}`);
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

  if (!process.stdout.isTTY) {
    const { tools, statusBar } = await loadTextModeData();
    console.log("AI Tools Dashboard\n");
    console.log(`Mode: ${statusBar.mode}`);
    console.log(`Config: ${statusBar.configHealth}`);
    console.log(`Sessions: ${statusBar.sessionCount}`);
    console.log(`\nDetected ${tools.length} tool(s).`);
    console.log("TUI mode requires a terminal. Use --no-pty for simple output.");
    return;
  }

  // ── Full TUI mode ──
  // Start the UI immediately in loading state; data loads in background.
  try {
    const { startTui } = await import("../tui.js");
    const { readUiCache, writeUiCache } = await import("../ui-cache.js");
    const { PtyManager } = await import("../widgets/terminal-pane.js");
    const { PaneManager } = await import("../terminal/manager.js");

    const nodePty = await import("node-pty");
    const ptyFactory = {
      spawn: (cmd: string, spawnArgs: string[], opts: Record<string, unknown>) =>
        nodePty.spawn(cmd, spawnArgs, opts as Parameters<typeof nodePty.spawn>[2]),
    };
    const ptyManager = new PtyManager(ptyFactory);

    const { Terminal } = await import("@xterm/headless");
    const termFactory = {
      create: (cols: number, rows: number) =>
        new Terminal({
          cols,
          rows,
          allowProposedApi: true,
        }) as unknown as import("../terminal/pane.js").HeadlessTerminal,
    };

    const cols = process.stdout.columns ?? 80;
    const rows = process.stdout.rows ?? 24;
    const paneManager = new PaneManager(ptyManager, termFactory, cols, rows);
    const cacheSnapshot = await readUiCache(process.cwd(), {
      toolsMs: 45_000,
      sessionsMs: 20_000,
      configMs: 60_000,
    });

    await startTui(
      // Pass an async loader — startTui will call this after the UI is visible
      async (emit, getState) => {
        const { detectTools, computeConfigHealth, detectMode } = await import("../app.js");
        const { formatSessionRow, listSessionsIncremental } =
          await import("../widgets/session-browser.js");
        const { getEngineStatus } = await import("../widgets/config-dashboard.js");
        const { loadPreferences } = await import("../preferences.js");
        const sliceTimes: { tools?: string; sessions?: string; config?: string } = {};
        const cwd = process.cwd();
        let sessionRefreshInFlight = false;

        const nextData = {
          tools: cacheSnapshot?.data.tools ?? [],
          sessions: cacheSnapshot?.data.sessions ?? [],
          engines: cacheSnapshot?.data.engines ?? [],
          mode: cacheSnapshot?.data.mode ?? "unknown",
          configHealth: cacheSnapshot?.data.configHealth ?? "Healthy",
          sessionCount: cacheSnapshot?.data.sessionCount ?? 0,
        };

        const refreshSessions = async (setLoadingFalse: boolean): Promise<void> => {
          if (sessionRefreshInFlight) return;
          sessionRefreshInFlight = true;
          try {
            let emittedOnce = false;
            const raw = await listSessionsIncremental({ limit: 200 }, (partial) => {
              const sessions = partial.map(formatSessionRow);
              nextData.sessions = sessions;
              if (!emittedOnce) {
                emittedOnce = true;
                sliceTimes.sessions = new Date().toISOString();
              }
              emit({
                sessions,
                ...(setLoadingFalse ? { loading: { sessions: false } } : {}),
              });
            });
            const sessions = raw.map(formatSessionRow);
            nextData.sessions = sessions;
            const sessionStamp = new Date().toISOString();
            sliceTimes.sessions = sessionStamp;
            emit({
              sessions,
              ...(setLoadingFalse ? { loading: { sessions: false } } : {}),
            });
            await writeUiCache(cwd, nextData, { sessions: sessionStamp });
          } catch {
            if (setLoadingFalse) {
              emit({ loading: { sessions: false } });
            }
          } finally {
            sessionRefreshInFlight = false;
          }
        };

        await Promise.allSettled([
          (async () => {
            if (cacheSnapshot?.freshBySlice.tools) {
              emit({ loading: { tools: false } });
              return;
            }
            try {
              const tools = await detectTools();
              const sessionCount = tools.reduce((sum, t) => sum + t.sessionCount, 0);
              nextData.tools = tools;
              nextData.sessionCount = sessionCount;
              sliceTimes.tools = new Date().toISOString();
              emit({ tools, sessionCount, loading: { tools: false } });
            } catch {
              emit({ loading: { tools: false } });
            }
          })(),
          (async () => {
            if (cacheSnapshot?.freshBySlice.sessions) {
              emit({ loading: { sessions: false } });
              return;
            }
            await refreshSessions(true);
          })(),
          (async () => {
            if (cacheSnapshot?.freshBySlice.config) {
              emit({ loading: { config: false } });
              return;
            }
            try {
              const [configHealth, engines, mode] = await Promise.all([
                computeConfigHealth(),
                getEngineStatus(),
                detectMode(),
              ]);
              nextData.configHealth = configHealth;
              nextData.engines = engines;
              nextData.mode = mode;
              sliceTimes.config = new Date().toISOString();
              emit({ configHealth, engines, mode, loading: { config: false } });
            } catch {
              emit({ loading: { config: false } });
            }
          })(),
        ]);

        await writeUiCache(cwd, nextData, {
          tools: sliceTimes.tools,
          sessions: sliceTimes.sessions,
          config: sliceTimes.config,
        });

        let stopped = false;
        let sessionRefreshTimer: ReturnType<typeof setTimeout> | undefined;

        const scheduleNextSessionRefresh = () => {
          const prefs = loadPreferences();
          const state = getState();
          const isSessionsFocused = state.view === "sessions" && !state.selectedSessionId;
          const delay = isSessionsFocused
            ? prefs.sessionRefreshActiveMs
            : prefs.sessionRefreshIdleMs;

          sessionRefreshTimer = setTimeout(() => {
            if (stopped) return;
            void refreshSessions(false).finally(() => {
              if (!stopped) {
                scheduleNextSessionRefresh();
              }
            });
          }, delay);
        };

        scheduleNextSessionRefresh();

        return () => {
          stopped = true;
          if (sessionRefreshTimer) {
            clearTimeout(sessionRefreshTimer);
          }
        };
      },
      paneManager,
      flags.dev,
      cacheSnapshot?.data,
    );
  } catch (err) {
    // Rezi failed — fall back to text output
    console.error("TUI failed to start, falling back to text mode.");
    if (err instanceof Error) {
      console.error(`  ${err.message}`);
    }
    const { tools, statusBar } = await loadTextModeData();
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
