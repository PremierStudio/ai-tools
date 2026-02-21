import type { UnifiedSession } from "../types/index.js";
import { truncate } from "./parser-helpers.js";

/**
 * Generate a one-line summary of a session.
 */
export function summarizeSession(session: UnifiedSession): string {
  const tool = session.toolName;
  const msgs = session.messageCount;
  const title = session.title ?? "Untitled";
  return `[${tool}] ${truncate(title, 50)} (${msgs} messages)`;
}

/**
 * Generate a table-friendly row for a session.
 */
export function sessionRow(session: UnifiedSession): {
  tool: string;
  title: string;
  messages: number;
  started: string;
  updated: string;
} {
  return {
    tool: session.toolName,
    title: truncate(session.title ?? "Untitled", 40),
    messages: session.messageCount,
    started: session.startedAt,
    updated: session.updatedAt,
  };
}
