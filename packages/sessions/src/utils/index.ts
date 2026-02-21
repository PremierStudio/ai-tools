import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import type { UnifiedSession, SessionFilter } from "../types/index.js";

const DEFAULT_CACHE_DIR = resolve(homedir(), ".ai-tools", "sessions");

export type SessionIndex = {
  sessions: SessionIndexEntry[];
  updatedAt: string;
};

export type SessionIndexEntry = {
  id: string;
  tool: string;
  toolName: string;
  title?: string;
  projectPath?: string;
  startedAt: string;
  updatedAt: string;
  messageCount: number;
};

/**
 * Read the session index from cache.
 */
export async function readIndex(cacheDir?: string): Promise<SessionIndex> {
  const dir = cacheDir ?? DEFAULT_CACHE_DIR;
  const indexPath = resolve(dir, "index.json");
  if (!existsSync(indexPath)) {
    return { sessions: [], updatedAt: new Date().toISOString() };
  }
  const content = await readFile(indexPath, "utf-8");
  return JSON.parse(content) as SessionIndex;
}

/**
 * Write the session index to cache.
 */
export async function writeIndex(index: SessionIndex, cacheDir?: string): Promise<void> {
  const dir = cacheDir ?? DEFAULT_CACHE_DIR;
  await mkdir(dir, { recursive: true });
  const indexPath = resolve(dir, "index.json");
  await writeFile(indexPath, JSON.stringify(index, null, 2) + "\n", "utf-8");
}

/**
 * Build an index entry from a full session (without messages).
 */
export function toIndexEntry(session: UnifiedSession): SessionIndexEntry {
  return {
    id: session.id,
    tool: session.tool,
    toolName: session.toolName,
    title: session.title,
    projectPath: session.projectPath,
    startedAt: session.startedAt,
    updatedAt: session.updatedAt,
    messageCount: session.messageCount,
  };
}

/**
 * Filter sessions by criteria.
 */
export function filterSessions(
  sessions: UnifiedSession[],
  filter?: SessionFilter,
): UnifiedSession[] {
  if (!filter) return sessions;
  let result = sessions;
  if (filter.tool) {
    result = result.filter((s) => s.tool === filter.tool);
  }
  if (filter.projectPath) {
    result = result.filter((s) => s.projectPath === filter.projectPath);
  }
  if (filter.since) {
    const since = filter.since.getTime();
    result = result.filter((s) => new Date(s.updatedAt).getTime() >= since);
  }
  if (filter.limit) {
    result = result.slice(0, filter.limit);
  }
  return result;
}
