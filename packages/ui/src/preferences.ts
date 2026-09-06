import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import type { ThemeName } from "./theme/index.js";

// Re-export from theme system for consistency
export { AVAILABLE_THEMES, type ThemeName, cycleTheme } from "./theme/index.js";

/**
 * Built-in keybinding definitions.
 * Each binding has an action ID, a default key combo, and a display label.
 */
export type KeybindingDef = {
  /** Unique action identifier */
  id: string;
  /** Human-readable label */
  label: string;
  /** Default key sequence string (e.g. "ctrl+c", "?", "Tab") */
  defaultKey: string;
  /** Which context the binding applies in */
  context: "global" | "tools" | "sessions" | "handoff" | "config" | "terminal";
  /** Optional description */
  description?: string;
};

/**
 * All built-in keybindings in display order.
 */
export const DEFAULT_KEYBINDINGS: KeybindingDef[] = [
  // Global
  { id: "quit", label: "Quit", defaultKey: "q", context: "global", description: "Exit the app" },
  {
    id: "quit-ctrl",
    label: "Quit (Ctrl+C)",
    defaultKey: "ctrl+c",
    context: "global",
    description: "Force quit",
  },
  {
    id: "help",
    label: "Help",
    defaultKey: "?",
    context: "global",
    description: "Toggle help overlay",
  },
  {
    id: "settings",
    label: "Settings",
    defaultKey: "Escape",
    context: "global",
    description: "Open settings menu",
  },
  {
    id: "tab-next",
    label: "Next view",
    defaultKey: "Tab",
    context: "global",
    description: "Cycle to next view",
  },
  {
    id: "tab-prev",
    label: "Previous view",
    defaultKey: "shift+Tab",
    context: "global",
    description: "Cycle to previous view",
  },
  {
    id: "view-1",
    label: "Tools view",
    defaultKey: "1",
    context: "global",
    description: "Jump to Tools",
  },
  {
    id: "view-2",
    label: "Sessions view",
    defaultKey: "2",
    context: "global",
    description: "Jump to Sessions",
  },
  {
    id: "view-3",
    label: "Handoff view",
    defaultKey: "3",
    context: "global",
    description: "Jump to Handoff",
  },
  {
    id: "view-4",
    label: "Config view",
    defaultKey: "4",
    context: "global",
    description: "Jump to Config",
  },
  {
    id: "terminal",
    label: "Terminal",
    defaultKey: "`",
    context: "global",
    description: "Switch to terminal panes",
  },
  {
    id: "theme-cycle",
    label: "Cycle theme",
    defaultKey: "t",
    context: "global",
    description: "Cycle to next colour theme",
  },
  {
    id: "sidebar-collapse",
    label: "Collapse sidebar",
    defaultKey: "[",
    context: "global",
    description: "Hide the sidebar",
  },
  {
    id: "sidebar-expand",
    label: "Expand sidebar",
    defaultKey: "]",
    context: "global",
    description: "Show the sidebar",
  },
  // Tools view
  {
    id: "tools-down",
    label: "Select next",
    defaultKey: "j / Down",
    context: "tools",
    description: "Move selection down",
  },
  {
    id: "tools-up",
    label: "Select prev",
    defaultKey: "k / Up",
    context: "tools",
    description: "Move selection up",
  },
  {
    id: "tools-launch",
    label: "Launch tool",
    defaultKey: "Enter",
    context: "tools",
    description: "Open tool in terminal pane",
  },
  {
    id: "tools-kill",
    label: "Kill tool",
    defaultKey: "d",
    context: "tools",
    description: "Kill running tool process",
  },
  // Sessions view
  {
    id: "sessions-down",
    label: "Select next",
    defaultKey: "j / Down",
    context: "sessions",
    description: "Move selection down",
  },
  {
    id: "sessions-up",
    label: "Select prev",
    defaultKey: "k / Up",
    context: "sessions",
    description: "Move selection up",
  },
  {
    id: "sessions-detail",
    label: "View detail",
    defaultKey: "Enter",
    context: "sessions",
    description: "Open session detail",
  },
  {
    id: "sessions-search",
    label: "Search",
    defaultKey: "/",
    context: "sessions",
    description: "Start search filter",
  },
  {
    id: "sessions-sort",
    label: "Cycle sort",
    defaultKey: "s",
    context: "sessions",
    description: "Cycle sort column",
  },
  {
    id: "sessions-handoff",
    label: "Quick handoff",
    defaultKey: "H",
    context: "sessions",
    description: "Handoff selected session",
  },
  // Session detail
  {
    id: "detail-handoff",
    label: "Start handoff",
    defaultKey: "h",
    context: "sessions",
    description: "Begin handoff wizard",
  },
  {
    id: "detail-continue",
    label: "Continue session",
    defaultKey: "Enter",
    context: "sessions",
    description: "Reopen session in tool",
  },
  // Config view
  {
    id: "config-generate",
    label: "Generate config",
    defaultKey: "g",
    context: "config",
    description: "Generate tool configs",
  },
  {
    id: "config-install",
    label: "Install config",
    defaultKey: "i",
    context: "config",
    description: "Install generated configs",
  },
  {
    id: "config-refresh",
    label: "Refresh status",
    defaultKey: "r",
    context: "config",
    description: "Re-detect tool status",
  },
  {
    id: "config-sync",
    label: "Install MCP servers",
    defaultKey: "s",
    context: "config",
    description: "Run ai-tools mcp sync from mcp.config.ts for detected tools",
  },
  {
    id: "config-detect",
    label: "Detect config",
    defaultKey: "d",
    context: "config",
    description: "Detect engine/config state",
  },
  {
    id: "config-editor",
    label: "Open in $EDITOR",
    defaultKey: "e",
    context: "config",
    description: "Edit config in $EDITOR",
  },
  // Terminal mode
  {
    id: "term-leader",
    label: "Command mode",
    defaultKey: "Ctrl+A",
    context: "terminal",
    description: "Enter command mode (like tmux prefix)",
  },
  {
    id: "term-dashboard",
    label: "Dashboard",
    defaultKey: "Ctrl+A, d",
    context: "terminal",
    description: "Return to dashboard",
  },
  {
    id: "term-new-pane",
    label: "New pane",
    defaultKey: "Ctrl+A, c",
    context: "terminal",
    description: "Spawn a new terminal pane",
  },
  {
    id: "term-close-pane",
    label: "Close pane",
    defaultKey: "Ctrl+A, x",
    context: "terminal",
    description: "Close active pane",
  },
  {
    id: "term-next-tab",
    label: "Next tab",
    defaultKey: "Ctrl+A, n",
    context: "terminal",
    description: "Focus next pane",
  },
  {
    id: "term-prev-tab",
    label: "Prev tab",
    defaultKey: "Ctrl+A, p",
    context: "terminal",
    description: "Focus previous pane",
  },
];

export type UiPreferences = {
  theme: import("./theme/index.js").ThemeName;
  /** Custom key overrides: action id → key string */
  keyOverrides: Record<string, string>;
  /** General: show running pane badge in sidebar */
  showPaneBadge: boolean;
  /** General: preferred fps cap */
  fpsCap: 15 | 30 | 60;
  /** Session refresh interval when sessions view is active */
  sessionRefreshActiveMs: number;
  /** Session refresh interval when sessions view is not active */
  sessionRefreshIdleMs: number;
};

export const SESSION_REFRESH_ACTIVE_OPTIONS_MS = [10_000, 15_000, 30_000] as const;
export const SESSION_REFRESH_IDLE_OPTIONS_MS = [30_000, 60_000, 120_000] as const;

const DEFAULT_PREFERENCES: UiPreferences = {
  theme: "dark",
  keyOverrides: {},
  showPaneBadge: true,
  fpsCap: 30,
  sessionRefreshActiveMs: 15_000,
  sessionRefreshIdleMs: 60_000,
};

function isRefreshOption(value: number, options: readonly number[]): boolean {
  return options.includes(value);
}

/**
 * Get the path to the preferences file.
 */
export function getPreferencesPath(): string {
  return join(homedir(), ".ai-tools", "ui-preferences.json");
}

/**
 * Load preferences from disk. Returns defaults if file is missing or invalid.
 */
export function loadPreferences(): UiPreferences {
  const path = getPreferencesPath();
  try {
    if (!existsSync(path)) return { ...DEFAULT_PREFERENCES, keyOverrides: {} };
    const raw = readFileSync(path, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null)
      return { ...DEFAULT_PREFERENCES, keyOverrides: {} };
    const obj = parsed as Record<string, unknown>;
    const theme =
      typeof obj["theme"] === "string" && isValidTheme(obj["theme"]) ? obj["theme"] : "dark";
    const keyOverrides =
      typeof obj["keyOverrides"] === "object" && obj["keyOverrides"] !== null
        ? (obj["keyOverrides"] as Record<string, string>)
        : {};
    const showPaneBadge =
      typeof obj["showPaneBadge"] === "boolean"
        ? obj["showPaneBadge"]
        : DEFAULT_PREFERENCES.showPaneBadge;
    const fpsCap =
      typeof obj["fpsCap"] === "number" && [15, 30, 60].includes(obj["fpsCap"])
        ? (obj["fpsCap"] as 15 | 30 | 60)
        : DEFAULT_PREFERENCES.fpsCap;
    const sessionRefreshActiveMs =
      typeof obj["sessionRefreshActiveMs"] === "number" &&
      isRefreshOption(obj["sessionRefreshActiveMs"], SESSION_REFRESH_ACTIVE_OPTIONS_MS)
        ? obj["sessionRefreshActiveMs"]
        : DEFAULT_PREFERENCES.sessionRefreshActiveMs;
    const sessionRefreshIdleMs =
      typeof obj["sessionRefreshIdleMs"] === "number" &&
      isRefreshOption(obj["sessionRefreshIdleMs"], SESSION_REFRESH_IDLE_OPTIONS_MS)
        ? obj["sessionRefreshIdleMs"]
        : DEFAULT_PREFERENCES.sessionRefreshIdleMs;
    return {
      theme,
      keyOverrides,
      showPaneBadge,
      fpsCap,
      sessionRefreshActiveMs,
      sessionRefreshIdleMs,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES, keyOverrides: {} };
  }
}

/**
 * Save preferences to disk. Creates directory if needed.
 */
export function savePreferences(prefs: Partial<UiPreferences>): void {
  const merged: UiPreferences = { ...loadPreferences(), ...prefs };
  merged.keyOverrides = prefs.keyOverrides ?? merged.keyOverrides;

  const path = getPreferencesPath();
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(merged, null, 2) + "\n", "utf-8");
}

/**
 * Check if a string is a valid theme name.
 */
export function isValidTheme(name: string): name is ThemeName {
  // Import dynamically to avoid circular dependencies
  return ["dark", "light", "dim", "highContrast", "nord", "dracula"].includes(name);
}

/**
 * Get the effective key for an action, considering overrides.
 */
export function getEffectiveKey(actionId: string, overrides: Record<string, string>): string {
  if (overrides[actionId]) return overrides[actionId];
  const def = DEFAULT_KEYBINDINGS.find((b) => b.id === actionId);
  return def?.defaultKey ?? "";
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

export function findKeybindingCollision(
  actionId: string,
  key: string,
  overrides: Record<string, string>,
): KeybindingDef | null {
  const normalizedTarget = normalizeKey(key);
  if (!normalizedTarget) return null;
  const candidateOverrides = { ...overrides, [actionId]: key };

  for (const binding of DEFAULT_KEYBINDINGS) {
    if (binding.id === actionId) continue;
    const effective = getEffectiveKey(binding.id, candidateOverrides);
    if (normalizeKey(effective) === normalizedTarget) {
      return binding;
    }
  }

  return null;
}

/**
 * Filter keybindings by search query (case-insensitive, matches label/description/key).
 */
export function searchKeybindings(query: string): KeybindingDef[] {
  if (!query.trim()) return DEFAULT_KEYBINDINGS;
  const q = query.toLowerCase();
  return DEFAULT_KEYBINDINGS.filter(
    (b) =>
      b.label.toLowerCase().includes(q) ||
      b.defaultKey.toLowerCase().includes(q) ||
      (b.description?.toLowerCase().includes(q) ?? false) ||
      b.context.toLowerCase().includes(q),
  );
}
