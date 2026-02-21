import { BaseSessionAdapter } from "./base.js";
import { registry } from "./registry.js";
import { parseJsonl, safeJsonParse } from "../utils/parser-helpers.js";
import type { UnifiedSession, SessionMessage, SessionFilter } from "../types/index.js";

type CursorMessage = {
  role?: string;
  type?: string;
  content?: string;
  text?: string;
  timestamp?: string;
};

type CursorSession = {
  id?: string;
  title?: string;
  messages?: CursorMessage[];
};

class CursorSessionAdapter extends BaseSessionAdapter {
  readonly id = "cursor";
  readonly name = "Cursor";
  readonly command = "cursor";
  readonly storagePaths = ["~/.cursor"];

  async parseSessions(filter?: SessionFilter): Promise<UnifiedSession[]> {
    const storagePath = await this.getStoragePath();
    if (!storagePath) return [];

    const { readdir } = await import("node:fs/promises");
    const { resolve } = await import("node:path");

    const sessions: UnifiedSession[] = [];

    let files: string[];
    try {
      files = await readdir(storagePath);
    } catch {
      return [];
    }

    for (const file of files) {
      const filePath = resolve(storagePath, file);

      try {
        if (file.endsWith(".jsonl")) {
          const session = await this.parseJsonlFile(filePath, file);
          if (session) sessions.push(session);
        } else if (file.endsWith(".json")) {
          const session = await this.parseJsonFile(filePath, file);
          if (session) sessions.push(session);
        }
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

  private async parseJsonlFile(filePath: string, fileName: string): Promise<UnifiedSession | null> {
    const { readFile, stat } = await import("node:fs/promises");

    const content = await readFile(filePath, "utf-8");
    const entries = parseJsonl<CursorMessage>(content);

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

    if (messages.length === 0) return null;

    const fileStat = await stat(filePath);
    const sessionId = `cursor-${fileName.replace(".jsonl", "")}`;

    return {
      id: sessionId,
      tool: this.id,
      toolName: this.name,
      startedAt: fileStat.birthtime.toISOString(),
      updatedAt: fileStat.mtime.toISOString(),
      messageCount: messages.length,
      messages,
    };
  }

  private async parseJsonFile(filePath: string, fileName: string): Promise<UnifiedSession | null> {
    const { readFile, stat } = await import("node:fs/promises");

    const content = await readFile(filePath, "utf-8");
    const data = safeJsonParse<CursorSession>(content, {});

    const entries = data.messages ?? [];
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

    if (messages.length === 0) return null;

    const fileStat = await stat(filePath);
    const sessionId = data.id ?? `cursor-${fileName.replace(".json", "")}`;

    return {
      id: sessionId,
      tool: this.id,
      toolName: this.name,
      title: data.title,
      startedAt: fileStat.birthtime.toISOString(),
      updatedAt: fileStat.mtime.toISOString(),
      messageCount: messages.length,
      messages,
    };
  }

  private mapRole(entry: CursorMessage): SessionMessage["role"] | null {
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

const adapter = new CursorSessionAdapter();
registry.register(adapter);
export { CursorSessionAdapter };
export default adapter;
