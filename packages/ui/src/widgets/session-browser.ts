import type { UnifiedSession, SessionFilter } from "@premierstudio/ai-sessions";

export type SessionRow = {
  id: string;
  tool: string;
  toolName: string;
  title: string;
  messageCount: number;
  updatedAt: string;
};

export type SessionGroup = {
  tool: string;
  toolName: string;
  sessions: SessionRow[];
};

/**
 * List sessions from the session adapter registry.
 */
export async function listSessions(filter?: SessionFilter): Promise<UnifiedSession[]> {
  const { registry } = await import("@premierstudio/ai-sessions");
  await import("@premierstudio/ai-sessions/adapters/all");

  const detected = await registry.detectAll();
  const sessions: UnifiedSession[] = [];

  for (const adapter of detected) {
    try {
      const parsed = await adapter.parseSessions(filter);
      sessions.push(...parsed);
    } catch {
      // Skip failing adapters
    }
  }

  // Sort by updatedAt descending
  sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (filter?.limit && filter.limit > 0) {
    return sessions.slice(0, filter.limit);
  }

  return sessions;
}

/**
 * Format a single session into a display row.
 */
export function formatSessionRow(session: UnifiedSession): SessionRow {
  return {
    id: session.id,
    tool: session.tool,
    toolName: session.toolName,
    title: session.title ?? "Untitled",
    messageCount: session.messageCount,
    updatedAt: session.updatedAt,
  };
}

/**
 * Group sessions by their tool name.
 */
export function groupByTool(sessions: UnifiedSession[]): SessionGroup[] {
  const groups = new Map<string, SessionGroup>();

  for (const session of sessions) {
    let group = groups.get(session.tool);
    if (!group) {
      group = {
        tool: session.tool,
        toolName: session.toolName,
        sessions: [],
      };
      groups.set(session.tool, group);
    }
    group.sessions.push(formatSessionRow(session));
  }

  return [...groups.values()];
}
