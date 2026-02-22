import { BaseSessionAdapter } from "./base.js";
import { registry } from "./registry.js";
import { safeJsonParse } from "../utils/parser-helpers.js";
import type { UnifiedSession, SessionMessage, SessionFilter } from "../types/index.js";

type CopilotTurn = {
  role?: string;
  content?: string;
  type?: string;
  text?: string;
  timestamp?: string;
};

type CopilotSession = {
  id?: string;
  turns?: CopilotTurn[];
  messages?: CopilotTurn[];
  createdAt?: string;
  updatedAt?: string;
};

class CopilotSessionAdapter extends BaseSessionAdapter {
  readonly id = "copilot";
  readonly name = "GitHub Copilot";
  readonly command = "github-copilot-cli";
  readonly storagePaths = ["~/.config/github-copilot"];

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
        const data = safeJsonParse<CopilotSession>(content, {});

        const turns = data.turns ?? data.messages ?? [];
        const messages: SessionMessage[] = [];

        for (const turn of turns) {
          const role = this.mapRole(turn);
          if (!role) continue;
          const text = turn.content ?? turn.text;
          if (text) {
            messages.push({
              role,
              content: text,
              timestamp: turn.timestamp,
            });
          }
        }

        if (messages.length === 0) continue;

        const fileStat = await stat(filePath);
        const sessionId = data.id ?? `copilot-${file.replace(".json", "")}`;
        const title = this.resolveSessionTitle(undefined, messages);

        sessions.push({
          id: sessionId,
          tool: this.id,
          toolName: this.name,
          title,
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

  private mapRole(turn: CopilotTurn): SessionMessage["role"] | null {
    const role = turn.role ?? turn.type;
    switch (role) {
      case "user":
      case "human":
        return "user";
      case "assistant":
      case "copilot":
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

const adapter = new CopilotSessionAdapter();
registry.register(adapter);
export { CopilotSessionAdapter };
export default adapter;
