/**
 * TmuxManager — wraps tmux for terminal multiplexing.
 *
 * Instead of spawning tools directly in node-pty, we spawn them inside
 * tmux panes. This gives us:
 * - Proper handling of fullscreen apps (alternate screen)
 * - Built-in pane management (split, zoom, resize)
 * - Session persistence
 * - Battle-tested compatibility with all interactive tools
 */

import { spawn } from "node:child_process";
import { platform } from "node:os";

export type TmuxSpawnOptions = {
  sessionName: string;
  paneTitle?: string;
  cwd?: string;
  env?: Record<string, string>;
};

export type TmuxPane = {
  sessionName: string;
  windowIndex: number;
  paneId: string;
  pid?: number;
};

/**
 * Result of a tmux command execution.
 */
export type TmuxResult = {
  success: boolean;
  output: string;
  exitCode: number;
};

/**
 * Check if tmux is available on the system.
 */
export async function checkTmuxAvailable(): Promise<{
  available: boolean;
  version?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    const proc = spawn("tmux", ["-V"], { shell: true });
    let output = "";

    proc.stdout?.on("data", (data) => {
      output += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0 && output.trim().startsWith("tmux")) {
        const version = output.trim().split(" ")[1];
        resolve({ available: true, version });
      } else {
        resolve({ available: false, error: "tmux not found" });
      }
    });

    proc.on("error", () => {
      resolve({ available: false, error: "failed to run tmux" });
    });
  });
}

/**
 * Get platform-specific install instructions.
 */
export function getTmuxInstallInstructions(): string {
  const os = platform();
  switch (os) {
    case "darwin":
      return "brew install tmux";
    case "linux":
      return "apt install tmux  # or: yum install tmux, or: pacman -S tmux";
    case "win32":
      return "Windows: Use WSL or install tmux via Git Bash/MSYS2";
    default:
      return "Install tmux via your system's package manager";
  }
}

/**
 * Execute a tmux command and return the result.
 */
function tmuxExec(args: string[]): Promise<TmuxResult> {
  return new Promise((resolve) => {
    const proc = spawn("tmux", args, { shell: true });
    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      resolve({
        success: code === 0,
        output: stdout + stderr,
        exitCode: code ?? 1,
      });
    });

    proc.on("error", (err) => {
      resolve({
        success: false,
        output: err.message,
        exitCode: 1,
      });
    });
  });
}

/**
 * TmuxManager handles creating and managing tmux sessions and panes.
 */
export class TmuxManager {
  private socketName: string;
  private baseSessionName: string;

  /**
   * @param socketName - Unique name for the tmux socket (e.g., "ai-tools")
   */
  constructor(socketName: string = "ai-tools") {
    this.socketName = socketName;
    this.baseSessionName = "ai-wrapper";
  }

  /**
   * Run a tmux command with the socket name.
   */
  private async run(args: string[]): Promise<TmuxResult> {
    return tmuxExec(["-L", this.socketName, ...args]);
  }

  /**
   * Kill any existing session with this socket and start fresh.
   */
  async reset(): Promise<void> {
    await this.run(["kill-session", "-t", this.baseSessionName]).catch(() => {
      // Ignore errors if session doesn't exist
    });
  }

  /**
   * Create a new session with a running command in the first pane.
   * Returns the window index and pane ID.
   */
  async spawnSession(command: string, options: TmuxSpawnOptions): Promise<TmuxPane> {
    const { sessionName, paneTitle, cwd } = options;

    // Build the command - wrap in bash to ensure shell expansion
    const cmd = cwd ? `cd "${cwd}" && ${command}` : command;

    // Create new session with command running
    // -d: don't attach (detached)
    // -s: session name
    // -n: window name
    const result = await this.run([
      "new-session",
      "-d",
      "-s",
      sessionName,
      "-n",
      paneTitle || "main",
      "--",
      cmd,
    ]);

    if (!result.success) {
      throw new Error(`Failed to create tmux session: ${result.output}`);
    }

    // Get the window index (usually 0 for first window)
    const listResult = await this.run(["list-windows", "-t", sessionName, "-F", "#{window_index}"]);
    const windowIndex = parseInt(listResult.output.trim() || "0", 10);

    // Get the pane ID
    const paneResult = await this.run(["list-panes", "-t", sessionName, "-F", "#{pane_id}"]);
    const paneId = paneResult.output.trim();

    return {
      sessionName,
      windowIndex,
      paneId,
    };
  }

  /**
   * Split a pane horizontally and run a command.
   */
  async splitPane(sessionName: string, command: string, cwd?: string): Promise<TmuxPane> {
    const cmd = cwd ? `cd "${cwd}" && ${command}` : command;

    // -h: horizontal split
    // -t: target session
    const result = await this.run(["split-window", "-h", "-t", sessionName, "--", cmd]);

    if (!result.success) {
      throw new Error(`Failed to split tmux pane: ${result.output}`);
    }

    // Get the new pane ID
    const paneResult = await this.run(["list-panes", "-t", sessionName, "-F", "#{pane_id}"]);
    const panes = paneResult.output.trim().split("\n");
    const paneId = panes[panes.length - 1];

    // Get window index
    const windowResult = await this.run([
      "list-windows",
      "-t",
      sessionName,
      "-F",
      "#{window_index}",
    ]);
    const windowIndex = parseInt(windowResult.output.trim(), 10);

    return {
      sessionName,
      windowIndex,
      paneId: paneId ?? "",
    };
  }

  /**
   * Send keys to a pane (simulate input).
   */
  async sendKeys(sessionName: string, keys: string): Promise<void> {
    await this.run(["send-keys", "-t", sessionName, keys]);
  }

  /**
   * Send a command to run in a pane.
   */
  async sendCommand(sessionName: string, command: string): Promise<void> {
    // Split the command to handle newlines properly
    const lines = command.split("\n");
    for (const line of lines) {
      await this.run(["send-keys", "-t", sessionName, line, "Enter"]);
    }
  }

  /**
   * Zoom a pane (toggle fullscreen).
   */
  async toggleZoom(sessionName: string, windowIndex: number = 0): Promise<boolean> {
    const target = `${sessionName}:${windowIndex}`;
    await this.run(["resize-pane", "-Z", "-t", target]);

    // Check if we're now zoomed or unzoomed
    const statusResult = await this.run(["list-panes", "-t", target, "-F", "#{pane_in_mode}"]);
    return statusResult.output.trim() === "1";
  }

  /**
   * Resize a pane.
   */
  async resizePane(
    sessionName: string,
    direction: "U" | "D" | "L" | "R",
    amount: number = 5,
  ): Promise<void> {
    await this.run([
      "resize-pane",
      `-${direction.toLowerCase()}`,
      "-t",
      sessionName,
      "-p",
      String(amount),
    ]);
  }

  /**
   * Select a pane.
   */
  async selectPane(
    sessionName: string,
    direction: "left" | "right" | "up" | "down",
  ): Promise<void> {
    const dirMap = { left: "L", right: "R", up: "U", down: "D" };
    await this.run(["select-pane", "-t", sessionName, `-${dirMap[direction]}`]);
  }

  /**
   * Kill a session.
   */
  async killSession(sessionName: string): Promise<void> {
    await this.run(["kill-session", "-t", sessionName]);
  }

  /**
   * Attach to a session (take over the terminal).
   * This will replace your current process.
   */
  async attachSession(sessionName: string): Promise<never> {
    const proc = spawn("tmux", ["-L", this.socketName, "attach-session", "-t", sessionName], {
      stdio: "inherit",
      shell: true,
    });

    return new Promise((_resolve, reject) => {
      proc.on("error", reject);
      proc.on("close", (code) => {
        reject(new Error(`tmux exited with code ${code}`));
      });
    });
  }

  /**
   * List all sessions using this socket.
   */
  async listSessions(): Promise<string[]> {
    const result = await this.run(["list-sessions"]);
    if (!result.success || !result.output.trim()) {
      return [];
    }
    return result.output
      .trim()
      .split("\n")
      .map((line): string => {
        const parts = line.split(":");
        return parts[0] ?? "";
      });
  }

  /**
   * Get session info.
   */
  async getSessionInfo(sessionName: string): Promise<{
    windows: number;
    panes: number;
    attached: boolean;
  } | null> {
    const result = await this.run([
      "list-session",
      "-F",
      "#{session_windows}:#{session_panes}:#{session_attached}",
      "-t",
      sessionName,
    ]);
    if (!result.success) {
      return null;
    }

    const parts = result.output.trim().split(":");
    const windows = parts[0] ?? "0";
    const panes = parts[1] ?? "0";
    const attached = parts[2] ?? "0";
    return {
      windows: parseInt(windows, 10),
      panes: parseInt(panes, 10),
      attached: attached === "1",
    };
  }

  /**
   * Check if running on a platform that supports tmux.
   */
  static isSupported(): boolean {
    const os = platform();
    return os === "darwin" || os === "linux";
  }
}

/**
 * Create a default tmux manager instance.
 */
export function createTmuxManager(socketName?: string): TmuxManager {
  return new TmuxManager(socketName);
}
