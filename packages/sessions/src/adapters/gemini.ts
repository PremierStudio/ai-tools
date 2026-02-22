import { BaseSessionAdapter } from "./base.js";
import { registry } from "./registry.js";
import { safeJsonParse } from "../utils/parser-helpers.js";
import type { UnifiedSession, SessionMessage, SessionFilter } from "../types/index.js";

type GeminiMessage = {
  role?: string;
  author?: string;
  content?: string;
  parts?: Array<{ text?: string }>;
  timestamp?: string;
};

type GeminiSession = {
  id?: string;
  title?: string;
  messages?: GeminiMessage[];
  history?: GeminiMessage[];
  createTime?: string;
  updateTime?: string;
};

class GeminiSessionAdapter extends BaseSessionAdapter {
  readonly id = "gemini";
  readonly name = "Gemini CLI";
  readonly command = "gemini";
  readonly storagePaths = ["~/.gemini"];

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
        const data = safeJsonParse<GeminiSession>(content, {});

        const entries = data.messages ?? data.history ?? [];
        const messages: SessionMessage[] = [];

        for (const entry of entries) {
          const role = this.mapRole(entry);
          if (!role) continue;
          const text = this.extractText(entry);
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
        const sessionId = data.id ?? `gemini-${file.replace(".json", "")}`;
        const title = this.resolveSessionTitle(data.title, messages);

        sessions.push({
          id: sessionId,
          tool: this.id,
          toolName: this.name,
          title,
          startedAt: data.createTime ?? fileStat.birthtime.toISOString(),
          updatedAt: data.updateTime ?? fileStat.mtime.toISOString(),
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

  private mapRole(entry: GeminiMessage): SessionMessage["role"] | null {
    const role = entry.role ?? entry.author;
    switch (role) {
      case "user":
      case "human":
        return "user";
      case "model":
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

  private extractText(entry: GeminiMessage): string | null {
    if (entry.content) return entry.content;

    if (entry.parts && entry.parts.length > 0) {
      const textParts = entry.parts.filter((p) => p.text).map((p) => p.text ?? "");
      return textParts.length > 0 ? textParts.join("\n") : null;
    }

    return null;
  }
}

const adapter = new GeminiSessionAdapter();
registry.register(adapter);
export { GeminiSessionAdapter };
export default adapter;
