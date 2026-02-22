/**
 * HSR (Hot State-Preserving Reload) entry point.
 *
 * Rezi re-imports this module fresh on every file change during `--dev` mode.
 * It looks for a named `view` export (or `default`) and calls
 * `app.replaceView(view)` without restarting the process or resetting state.
 *
 * Keep this file as a thin shim — all real logic lives in tui.ts and views/*.
 * The HSR watcher copies the entire dist/ directory to a temp snapshot and
 * re-imports from there, so every rebuild of tui.ts or any view file triggers
 * a live swap.
 */

import { ui } from "@rezi-ui/core";
import type { VNode } from "@rezi-ui/core";
import { renderApp } from "./tui.js";
import type { TuiState } from "./tui.js";

/**
 * The view function handed to Rezi's app.view() / app.replaceView().
 * Rezi calls this on every state update to produce the VNode tree.
 */
export function view(state: Readonly<TuiState>): VNode {
  return renderApp<VNode>(ui, state);
}
