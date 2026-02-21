/**
 * PTY management for terminal panes.
 *
 * Wraps node-pty with a PtyManager class that can be injected for testing.
 */

export type PtyProcess = {
  pid: number;
  onData: (callback: (data: string) => void) => void;
  onExit: (callback: (exitCode: { exitCode: number; signal?: number }) => void) => void;
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  kill: (signal?: string) => void;
};

export type PtySpawnOptions = {
  cols?: number;
  rows?: number;
  cwd?: string;
  env?: Record<string, string>;
};

export type PtyFactory = {
  spawn: (
    command: string,
    args: string[],
    options: { cols: number; rows: number; cwd: string; env: Record<string, string> },
  ) => PtyProcess;
};

/**
 * PtyManager wraps node-pty spawn/write/resize/kill operations.
 * Accepts a factory to allow dependency injection for testing.
 */
export class PtyManager {
  private factory: PtyFactory | null;

  constructor(factory?: PtyFactory) {
    this.factory = factory ?? null;
  }

  /**
   * Lazily load node-pty if no factory was injected.
   */
  private async getFactory(): Promise<PtyFactory> {
    if (this.factory) return this.factory;
    const pty = await import("node-pty");
    this.factory = pty as unknown as PtyFactory;
    return this.factory;
  }

  /**
   * Spawn a new PTY process.
   */
  async createPty(
    command: string,
    args?: string[],
    options?: PtySpawnOptions,
  ): Promise<PtyProcess> {
    const factory = await this.getFactory();

    return factory.spawn(command, args ?? [], {
      cols: options?.cols ?? 80,
      rows: options?.rows ?? 24,
      cwd: options?.cwd ?? process.cwd(),
      env: options?.env ?? (process.env as Record<string, string>),
    });
  }

  /**
   * Write data to a PTY's stdin.
   */
  writeToPty(pty: PtyProcess, data: string): void {
    pty.write(data);
  }

  /**
   * Resize a PTY terminal.
   */
  resizePty(pty: PtyProcess, cols: number, rows: number): void {
    pty.resize(cols, rows);
  }

  /**
   * Kill a PTY process.
   */
  killPty(pty: PtyProcess, signal?: string): void {
    pty.kill(signal);
  }
}
