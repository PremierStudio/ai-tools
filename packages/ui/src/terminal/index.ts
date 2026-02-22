/**
 * Terminal multiplexer — embedded terminal panes for AI tools.
 */

// Pane management
export type {
  TerminalPaneState,
  HeadlessTerminal,
  TerminalFactory,
  TerminalBuffer,
} from "./pane.js";
export {
  createPane,
  writeInput,
  resizePane,
  destroyPane,
  scrollPane,
  clearDirtyLines,
  resetPaneIdCounter,
} from "./pane.js";

// Multi-pane manager
export { PaneManager } from "./manager.js";
export type { PaneManagerState } from "./manager.js";

// Renderer
export type { LineSegment, RenderedLine, TabEntry, StatusBarInfo } from "./renderer.js";
export {
  buildTabEntries,
  formatTabBar,
  formatStatusBar,
  buildRenderedLines,
  buildLineSegments,
  getCommandOverlayText,
  DEFAULT_FG,
  DEFAULT_BG,
  TAB_ACTIVE_BG,
  TAB_INACTIVE_BG,
  STATUS_BAR_BG,
} from "./renderer.js";

// Colors
export type { Rgb, TextStyle, CellAttributes } from "./colors.js";
export { XTERM_256_PALETTE, xtermColorToRgb, cellToTextStyle, stylesEqual } from "./colors.js";

// Input
export type { TerminalKeyEvent, CommandAction } from "./input.js";
export { KEY_CODES, isLeaderKey, keyEventToTerminalInput, parseCommandKey } from "./input.js";
