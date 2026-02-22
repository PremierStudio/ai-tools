/**
 * PaneManager — multi-pane orchestrator for the terminal multiplexer.
 *
 * Manages all terminal panes, tracks the active pane, and provides
 * operations for spawning, closing, focusing, and cycling through panes.
 */

import type { PtyManager } from "../widgets/terminal-pane.js";
import type { TerminalFactory, TerminalPaneState } from "./pane.js";
import { createPane, destroyPane, resizePane, writeInput, scrollPane } from "./pane.js";
import { getToolDefinitions } from "../commands/switch-tool.js";

/**
 * State held by the PaneManager.
 * Mutable because xterm Terminal instances are stateful objects.
 */
export type PaneManagerState = {
  panes: TerminalPaneState[];
  activePaneIndex: number;
};

/**
 * PaneManager orchestrates multiple terminal panes.
 */
export class PaneManager {
  private state: PaneManagerState;
  private ptyManager: PtyManager;
  private termFactory: TerminalFactory;
  private contentCols: number;
  private contentRows: number;

  constructor(ptyManager: PtyManager, termFactory: TerminalFactory, cols: number, rows: number) {
    this.state = {
      panes: [],
      activePaneIndex: -1,
    };
    this.ptyManager = ptyManager;
    this.termFactory = termFactory;
    // Terminal content area: full width, minus tab bar (1 row) and status bar (1 row)
    this.contentCols = cols;
    this.contentRows = Math.max(1, rows - 2);
  }

  /**
   * Spawn a new terminal pane for a tool.
   * Returns the new pane's state, or null if the tool is unknown.
   */
  async spawnPane(toolId: string): Promise<TerminalPaneState | null> {
    const defs = getToolDefinitions();
    const def = defs[toolId];
    if (!def) return null;

    return this.spawnPaneWithCommand(toolId, def.name, def.command, def.args);
  }

  /**
   * Spawn a new terminal pane with an explicit command.
   */
  async spawnPaneWithCommand(
    toolId: string,
    toolName: string,
    command: string,
    args: string[],
  ): Promise<TerminalPaneState> {
    const pane = await createPane(
      this.ptyManager,
      this.termFactory,
      toolId,
      toolName,
      command,
      args,
      this.contentCols,
      this.contentRows,
    );

    this.state.panes.push(pane);
    this.state.activePaneIndex = this.state.panes.length - 1;

    return pane;
  }

  /**
   * Close a pane at the given index.
   * Returns true if the pane was closed.
   */
  closePane(index: number): boolean {
    const pane = this.state.panes[index];
    if (!pane) return false;

    destroyPane(pane);
    this.state.panes.splice(index, 1);

    // Adjust active index
    if (this.state.panes.length === 0) {
      this.state.activePaneIndex = -1;
    } else if (index <= this.state.activePaneIndex) {
      this.state.activePaneIndex = Math.max(0, this.state.activePaneIndex - 1);
    }

    return true;
  }

  /**
   * Focus a pane at the given index.
   * Returns true if the index is valid.
   */
  focusPane(index: number): boolean {
    if (index < 0 || index >= this.state.panes.length) return false;
    this.state.activePaneIndex = index;
    return true;
  }

  /**
   * Cycle to the next tab.
   */
  nextPane(): void {
    if (this.state.panes.length <= 1) return;
    this.state.activePaneIndex = (this.state.activePaneIndex + 1) % this.state.panes.length;
  }

  /**
   * Cycle to the previous tab.
   */
  prevPane(): void {
    if (this.state.panes.length <= 1) return;
    this.state.activePaneIndex =
      (this.state.activePaneIndex - 1 + this.state.panes.length) % this.state.panes.length;
  }

  /**
   * Get the currently active pane, or null if none.
   */
  getActivePane(): TerminalPaneState | null {
    return this.state.panes[this.state.activePaneIndex] ?? null;
  }

  /**
   * Get a snapshot of all panes and the active index.
   */
  getState(): Readonly<PaneManagerState> {
    return this.state;
  }

  /**
   * Get the total number of panes.
   */
  getPaneCount(): number {
    return this.state.panes.length;
  }

  /**
   * Write input to the active pane's PTY.
   */
  writeToActivePane(data: string): void {
    const pane = this.getActivePane();
    if (pane) {
      writeInput(pane, data);
    }
  }

  /**
   * Resize all panes to new dimensions.
   */
  resize(cols: number, rows: number): void {
    this.contentCols = cols;
    this.contentRows = Math.max(1, rows - 2);
    for (const pane of this.state.panes) {
      resizePane(pane, this.contentCols, this.contentRows);
    }
  }

  /**
   * Scroll the active pane's viewport.
   */
  scrollActivePane(delta: number): void {
    const pane = this.getActivePane();
    if (pane) {
      scrollPane(pane, delta);
    }
  }

  /**
   * Send handoff context from source pane to target pane.
   * Writes the context markdown as input to the target PTY.
   */
  handoffBetweenPanes(sourceIndex: number, targetIndex: number, context: string): boolean {
    const target = this.state.panes[targetIndex];
    if (!target || target.status !== "running") return false;

    void sourceIndex; // source validated externally
    writeInput(target, context);
    return true;
  }

  /**
   * Destroy all panes (cleanup on exit).
   */
  destroyAll(): void {
    for (const pane of this.state.panes) {
      destroyPane(pane);
    }
    this.state.panes = [];
    this.state.activePaneIndex = -1;
  }

  /**
   * Check if there are any active (running) panes.
   */
  hasRunningPanes(): boolean {
    return this.state.panes.some((p) => p.status === "running");
  }

  /**
   * Get pane indices for a specific tool.
   */
  getPanesForTool(toolId: string): number[] {
    return this.state.panes.map((p, i) => (p.toolId === toolId ? i : -1)).filter((i) => i >= 0);
  }
}
