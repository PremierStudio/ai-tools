/**
 * Spawn strategy - chooses between tmux wrapper and direct PTY spawning.
 *
 * This provides a unified interface for spawning tools, with automatic
 * fallback based on platform and tmux availability.
 */

import {
  checkTmuxAvailable,
  getTmuxInstallInstructions,
  createTmuxManager,
  TmuxManager,
} from "../tmux/index.js";
import type { TmuxPane, TmuxManager as TmuxManagerInstance } from "../tmux/index.js";
import type { PtyManager } from "../widgets/terminal-pane.js";

export type ToolProcess = {
  type: "tmux" | "pty";
  pid?: number;
  kill: (signal?: string) => void;
  onExit?: (callback: (exit: { exitCode: number; signal?: number }) => void) => void;
};

export type SpawnStrategy = "tmux" | "pty";

export type SpawnResult = {
  strategy: SpawnStrategy;
  toolProcess?: ToolProcess;
  tmuxPane?: TmuxPane;
  tmuxManager?: TmuxManagerInstance;
  success: boolean;
  error?: string;
};

/**
 * Check what spawn strategies are available on this system.
 */
export async function checkSpawnStrategies(): Promise<{
  tmux: { available: boolean; version?: string; error?: string };
  pty: { available: boolean };
}> {
  const tmuxCheck = await checkTmuxAvailable();

  let ptyAvailable = false;
  try {
    const pty = await import("node-pty");
    ptyAvailable = typeof pty.spawn === "function";
  } catch {
    ptyAvailable = false;
  }

  return {
    tmux: tmuxCheck,
    pty: { available: ptyAvailable },
  };
}

/**
 * Get recommended spawn strategy based on platform and availability.
 */
export async function getRecommendedStrategy(): Promise<{
  strategy: SpawnStrategy;
  reason: string;
  tmuxInstallHint?: string;
}> {
  const strategies = await checkSpawnStrategies();

  // Prefer tmux on supported platforms
  if (TmuxManager.isSupported() && strategies.tmux.available) {
    return {
      strategy: "tmux",
      reason: "tmux provides better fullscreen app handling",
    };
  }

  // Fall back to direct PTY
  if (strategies.pty.available) {
    if (!TmuxManager.isSupported()) {
      return {
        strategy: "pty",
        reason: "tmux not supported on this platform (Windows), using direct PTY",
      };
    }
    if (!strategies.tmux.available) {
      return {
        strategy: "pty",
        reason: "tmux not installed, using direct PTY",
        tmuxInstallHint: getTmuxInstallInstructions(),
      };
    }
  }

  // No options available
  return {
    strategy: "pty",
    reason: "No spawn strategy available",
    tmuxInstallHint: TmuxManager.isSupported() ? getTmuxInstallInstructions() : undefined,
  };
}

/**
 * SpawnConfig - configuration for spawning a tool.
 */
export type SpawnConfig = {
  toolId: string;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
  sessionName?: string;
};

/**
 * Spawn a tool using the recommended strategy.
 */
export async function spawnTool(config: SpawnConfig, ptyManager: PtyManager): Promise<SpawnResult> {
  const recommended = await getRecommendedStrategy();

  switch (recommended.strategy) {
    case "tmux":
      return spawnWithTmux(config);
    case "pty":
    default:
      return spawnWithPty(config, ptyManager);
  }
}

/**
 * Spawn a tool using tmux (recommended for best compatibility).
 */
async function spawnWithTmux(config: SpawnConfig): Promise<SpawnResult> {
  const socketName = "ai-tools-" + Math.random().toString(36).substring(2, 8);
  const sessionName = config.sessionName || `tool-${config.toolId}-${Date.now()}`;
  const tmux = createTmuxManager(socketName);

  try {
    const pane = await tmux.spawnSession(config.command, {
      sessionName,
      paneTitle: config.toolId,
      cwd: config.cwd,
      env: config.env,
    });

    return {
      strategy: "tmux",
      success: true,
      tmuxPane: pane,
      tmuxManager: tmux,
      toolProcess: {
        type: "tmux",
        kill: () => {
          tmux.killSession(sessionName).catch(() => {
            // Ignore errors on kill
          });
        },
      },
    };
  } catch (error) {
    return {
      strategy: "tmux",
      success: false,
      error: error instanceof Error ? error.message : String(error),
      tmuxManager: tmux,
    };
  }
}

/**
 * Spawn a tool using direct PTY (fallback when tmux unavailable).
 */
async function spawnWithPty(config: SpawnConfig, ptyManager: PtyManager): Promise<SpawnResult> {
  try {
    const pty = await ptyManager.createPty(config.command, config.args ?? [], {
      cols: config.cols ?? 80,
      rows: config.rows ?? 24,
      cwd: config.cwd,
      env: config.env,
    });

    return {
      strategy: "pty",
      success: true,
      toolProcess: {
        type: "pty",
        pid: pty.pid,
        kill: pty.kill,
        onExit: pty.onExit,
      },
    };
  } catch (error) {
    return {
      strategy: "pty",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if tmux is recommended for the current environment.
 */
export async function isTmuxRecommended(): Promise<boolean> {
  const recommended = await getRecommendedStrategy();
  return recommended.strategy === "tmux";
}
