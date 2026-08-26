import type { UnifiedSession, SessionFilter } from "@itz4blitz/ai-tools-sessions";

function sortAndLimitSessions(
  sessions: UnifiedSession[],
  filter?: SessionFilter,
): UnifiedSession[] {
  const sorted = [...sessions];
  sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (filter?.limit && filter.limit > 0) {
    return sorted.slice(0, filter.limit);
  }

  return sorted;
}

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
  const { registry } = await import("@itz4blitz/ai-tools-sessions");
  await import("@itz4blitz/ai-tools-sessions/adapters/all");

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

  return sortAndLimitSessions(sessions, filter);
}

/**
 * List sessions and emit progressively as each adapter completes.
 */
export async function listSessionsIncremental(
  filter: SessionFilter | undefined,
  onProgress: (sessions: UnifiedSession[]) => void,
): Promise<UnifiedSession[]> {
  const { registry } = await import("@itz4blitz/ai-tools-sessions");
  await import("@itz4blitz/ai-tools-sessions/adapters/all");

  const detected = await registry.detectAll();
  const sessions: UnifiedSession[] = [];

  await Promise.allSettled(
    detected.map(async (adapter) => {
      try {
        const parsed = await adapter.parseSessions(filter);
        sessions.push(...parsed);
        onProgress(sortAndLimitSessions(sessions, filter));
      } catch {
        // Skip failing adapters
      }
    }),
  );

  return sortAndLimitSessions(sessions, filter);
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
