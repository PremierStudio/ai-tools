import { BaseSessionAdapter } from "./base.js";
import { registry } from "./registry.js";
import { safeJsonParse } from "../utils/parser-helpers.js";
import type { UnifiedSession, SessionMessage, SessionFilter } from "../types/index.js";

type OpenCodeMessage = {
  role?: string;
  content?: string;
  text?: string;
  timestamp?: string;
};

type OpenCodeSession = {
  id?: string;
  title?: string;
  messages?: OpenCodeMessage[];
  createdAt?: string;
  updatedAt?: string;
  path?: string;
};

class OpenCodeSessionAdapter extends BaseSessionAdapter {
  readonly id = "opencode";
  readonly name = "OpenCode";
  readonly command = "opencode";
  readonly storagePaths = ["~/.opencode/sessions", "~/.opencode"];

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
      if (!file.endsWith(".json")) continue;
      const filePath = resolve(storagePath, file);

      try {
        const content = await readFile(filePath, "utf-8");
        const data = safeJsonParse<OpenCodeSession>(content, {});

        const entries = data.messages ?? [];
        const messages: SessionMessage[] = [];

        for (const entry of entries) {
          const role = this.mapRole(entry.role);
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
        const sessionId = data.id ?? `opencode-${file.replace(".json", "")}`;
        const title = this.resolveSessionTitle(data.title, messages);

        sessions.push({
          id: sessionId,
          tool: this.id,
          toolName: this.name,
          title,
          projectPath: data.path,
          startedAt: data.createdAt ?? fileStat.birthtime.toISOString(),
          updatedAt: data.updatedAt ?? fileStat.mtime.toISOString(),
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

  private mapRole(role?: string): SessionMessage["role"] | null {
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

const adapter = new OpenCodeSessionAdapter();
registry.register(adapter);
export { OpenCodeSessionAdapter };
export default adapter;
