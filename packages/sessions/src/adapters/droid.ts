import { BaseSessionAdapter } from "./base.js";
import { registry } from "./registry.js";
import { parseJsonl } from "../utils/parser-helpers.js";
import type { UnifiedSession, SessionMessage, SessionFilter } from "../types/index.js";

type DroidMessage = {
  role?: string;
  type?: string;
  content?: string;
  text?: string;
  timestamp?: string;
};

class DroidSessionAdapter extends BaseSessionAdapter {
  readonly id = "droid";
  readonly name = "Factory Droid";
  readonly command = "droid";
  readonly storagePaths = ["~/.factory"];

  async parseSessions(filter?: SessionFilter): Promise<UnifiedSession[]> {
    const storagePath = await this.getStoragePath();
    if (!storagePath) return [];

    const { readdir, readFile, stat } = await import("node:fs/promises");
    const { resolve } = await import("node:path");

    const sessions: UnifiedSession[] = [];

    let files: string[];
    try {
      files = await readdir(storagePath);
    } catch {
      return [];
    }

    for (const file of files) {
      if (!file.endsWith(".jsonl")) continue;
      const filePath = resolve(storagePath, file);

      try {
        const content = await readFile(filePath, "utf-8");
        const entries = parseJsonl<DroidMessage>(content);

        const messages: SessionMessage[] = [];
        for (const entry of entries) {
          const role = this.mapRole(entry);
          if (!role) continue;
          const text = entry.content ?? entry.text;
          if (text) {
            messages.push({
              role,
              content: text,
              timestamp: entry.timestamp,
            });
          }
        }

        if (messages.length === 0) continue;

        const fileStat = await stat(filePath);
        const sessionId = `droid-${file.replace(".jsonl", "")}`;
        const title = this.resolveSessionTitle(undefined, messages);

        sessions.push({
          id: sessionId,
          tool: this.id,
          toolName: this.name,
          title,
          startedAt: fileStat.birthtime.toISOString(),
          updatedAt: fileStat.mtime.toISOString(),
          messageCount: messages.length,
          messages,
        });
      } catch {
        // Skip malformed files
      }
    }

    sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    if (filter) {
      const { filterSessions } = await import("../utils/index.js");
      return filterSessions(sessions, filter);
    }

    return sessions;
  }

  private mapRole(entry: DroidMessage): SessionMessage["role"] | null {
    const role = entry.role ?? entry.type;
    switch (role) {
      case "user":
      case "human":
        return "user";
      case "assistant":
        return "assistant";
      case "system":
        return "system";
      case "tool":
        return "tool";
      default:
        return null;
    }
  }
}

const adapter = new DroidSessionAdapter();
registry.register(adapter);
export { DroidSessionAdapter };
export default adapter;
