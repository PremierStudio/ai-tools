/**
 * Terminal renderer — reads xterm buffer and converts to drawable segments.
 *
 * This module does NOT depend on Rezi's DrawApi directly. Instead it produces
 * data structures (line segments, tab bar entries, status text) that the
 * integration layer in tui.ts can feed to DrawApi or to any other renderer.
 */

import type { TerminalPaneState, TerminalBufferCell } from "./pane.js";
import type { TextStyle, Rgb } from "./colors.js";
import { cellToTextStyle, stylesEqual, type CellAttributes } from "./colors.js";

/**
 * A styled segment within a terminal line.
 * Consecutive cells with the same style are batched into one segment.
 */
export type LineSegment = {
  text: string;
  style: TextStyle;
};

/**
 * A complete rendered line: ordered list of styled segments.
 */
export type RenderedLine = {
  y: number;
  segments: LineSegment[];
};

/**
 * Tab bar entry for rendering.
 */
export type TabEntry = {
  index: number;
  label: string;
  active: boolean;
  status: "running" | "exited";
  exitCode?: number;
};

/**
 * Status bar data for a terminal pane.
 */
export type StatusBarInfo = {
  toolName: string;
  pid: number;
  status: "running" | "exited";
  exitCode?: number;
  cols: number;
  rows: number;
  mode: "terminal" | "command" | "dashboard";
};

/**
 * Build tab entries from pane states.
 */
export function buildTabEntries(panes: TerminalPaneState[], activeIndex: number): TabEntry[] {
  return panes.map((pane, i) => ({
    index: i,
    label: `${i + 1}:${pane.title}`,
    active: i === activeIndex,
    status: pane.status,
    exitCode: pane.exitCode,
  }));
}

/**
 * Format a tab bar string from tab entries.
 */
export function formatTabBar(entries: TabEntry[], maxWidth: number): string {
  if (entries.length === 0) return "";

  const parts: string[] = [];
  let totalWidth = 0;

  for (const entry of entries) {
    const exitInfo = entry.status === "exited" ? `[${entry.exitCode ?? "?"}]` : "";
    const indicator = entry.active ? "*" : " ";
    const part = `${indicator}${entry.label}${exitInfo}`;

    if (totalWidth + part.length + 3 > maxWidth) {
      parts.push("...");
      break;
    }

    parts.push(part);
    totalWidth += part.length + 3; // separator " | "
  }

  return parts.join(" | ");
}

/**
 * Format a status bar string for the terminal view.
 */
export function formatStatusBar(info: StatusBarInfo): string {
  const statusText =
    info.status === "exited" ? `Exited(${info.exitCode ?? "?"})` : `PID:${info.pid}`;
  const mode = info.mode === "command" ? "[CMD]" : info.mode === "dashboard" ? "[DASH]" : "";
  const dims = `${info.cols}x${info.rows}`;
  return `${info.toolName} | ${statusText} | ${dims} ${mode}`.trim();
}

/**
 * Build rendered lines from a terminal buffer.
 *
 * Reads the xterm buffer line by line, groups consecutive cells with the
 * same TextStyle into segments for efficient batch rendering.
 *
 * @param pane - The terminal pane to read from
 * @param startRow - First row to render (0-based in viewport)
 * @param rowCount - Number of rows to render
 * @param cols - Number of columns to render
 */
export function buildRenderedLines(
  pane: TerminalPaneState,
  startRow: number,
  rowCount: number,
  cols: number,
): RenderedLine[] {
  const lines: RenderedLine[] = [];
  const buffer = pane.term.buffer.active;

  for (let y = startRow; y < startRow + rowCount; y++) {
    const bufferY = y + buffer.viewportY - pane.scrollOffset;
    const line = buffer.getLine(bufferY);

    if (!line) {
      lines.push({ y, segments: [] });
      continue;
    }

    const segments = buildLineSegments(line, cols);
    lines.push({ y, segments });
  }

  return lines;
}

/**
 * Build styled segments from a single buffer line.
 * Groups consecutive cells with the same style for efficient rendering.
 */
export function buildLineSegments(
  line: {
    length: number;
    getCell(x: number, cell?: TerminalBufferCell): TerminalBufferCell | undefined;
  },
  cols: number,
): LineSegment[] {
  const segments: LineSegment[] = [];
  let currentText = "";
  let currentStyle: TextStyle = {};
  let hasSegment = false;

  for (let x = 0; x < Math.min(line.length, cols); x++) {
    const cell = line.getCell(x);
    if (!cell) continue;

    const chars = cell.getChars();
    const width = cell.getWidth();

    // Skip zero-width cells (continuation of wide chars)
    if (width === 0) continue;

    const style = cellToTextStyle(cell as unknown as CellAttributes);

    if (!hasSegment) {
      // First cell
      currentText = chars || " ";
      currentStyle = style;
      hasSegment = true;
    } else if (stylesEqual(currentStyle, style)) {
      // Same style: append to current segment
      currentText += chars || " ";
    } else {
      // Different style: push current segment, start new one
      segments.push({ text: currentText, style: currentStyle });
      currentText = chars || " ";
      currentStyle = style;
    }
  }

  // Push final segment
  if (hasSegment && currentText) {
    segments.push({ text: currentText, style: currentStyle });
  }

  return segments;
}

/**
 * Command mode overlay text showing available commands.
 */
export function getCommandOverlayText(): string[] {
  return [
    "-- COMMAND MODE (Ctrl+A) --",
    "",
    "  1-9  Switch to tab",
    "  c    New pane",
    "  x    Close pane",
    "  n    Next tab",
    "  p    Previous tab",
    "  h    Handoff",
    "  d    Dashboard",
    "  C-a  Send Ctrl+A",
    "  Esc  Cancel",
    "  ?    This help",
  ];
}

/**
 * Default foreground color for terminal rendering.
 */
export const DEFAULT_FG: Rgb = { r: 229, g: 229, b: 229 };

/**
 * Default background color for terminal rendering.
 */
export const DEFAULT_BG: Rgb = { r: 0, g: 0, b: 0 };

/**
 * Tab bar highlight colors.
 */
export const TAB_ACTIVE_BG: Rgb = { r: 60, g: 60, b: 80 };
export const TAB_INACTIVE_BG: Rgb = { r: 30, g: 30, b: 40 };
export const STATUS_BAR_BG: Rgb = { r: 40, g: 40, b: 50 };
