import type { ToolInfo } from "./types.js";
import type { SessionRow } from "./widgets/session-browser.js";

export type CommandItem = {
  id: string;
  label: string;
  category: "action" | "session" | "tool";
};

/**
 * Get static action commands for the command palette.
 */
export function getActionCommands(): CommandItem[] {
  return [
    { id: "launch-claude", label: "Launch Claude Code", category: "action" },
    { id: "launch-codex", label: "Launch Codex", category: "action" },
    { id: "launch-gemini", label: "Launch Gemini CLI", category: "action" },
    { id: "generate", label: "Generate Config", category: "action" },
    { id: "install", label: "Install Config", category: "action" },
    { id: "refresh", label: "Refresh Sessions", category: "action" },
    { id: "theme", label: "Switch Theme", category: "action" },
    { id: "help", label: "Show Help", category: "action" },
    { id: "quit", label: "Quit", category: "action" },
  ];
}

/**
 * Build command items from session list.
 */
export function getSessionCommands(sessions: SessionRow[]): CommandItem[] {
  return sessions.map((s) => ({
    id: `session-${s.id}`,
    label: `[${s.tool}] ${s.title}`,
    category: "session" as const,
  }));
}

/**
 * Build command items from available tools.
 */
export function getToolCommands(tools: ToolInfo[]): CommandItem[] {
  return tools
    .filter((t) => t.status === "available")
    .map((t) => ({
      id: `tool-${t.id}`,
      label: t.name,
      category: "tool" as const,
    }));
}

/**
 * Get all command items from all sources.
 */
export function getAllCommands(sessions: SessionRow[], tools: ToolInfo[]): CommandItem[] {
  return [...getActionCommands(), ...getSessionCommands(sessions), ...getToolCommands(tools)];
}

/**
 * Filter command items by query (case-insensitive substring match).
 */
export function filterCommands(items: CommandItem[], query: string): CommandItem[] {
  if (!query) return items;
  const lower = query.toLowerCase();
  return items.filter((item) => item.label.toLowerCase().includes(lower));
}
