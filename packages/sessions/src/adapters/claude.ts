import { BaseSessionAdapter } from "./base.js";
import { registry } from "./registry.js";
import { parseJsonl } from "../utils/parser-helpers.js";
import type { UnifiedSession, SessionMessage, SessionFilter } from "../types/index.js";

type ClaudeMessage = {
  type: string;
  message?: {
    content: string | Array<{ type: string; text?: string }>;
  };
};

class ClaudeSessionAdapter extends BaseSessionAdapter {
  readonly id = "claude";
  readonly name = "Claude Code";
  readonly command = "claude";
  readonly storagePaths = ["~/.claude/projects"];

  async parseSessions(filter?: SessionFilter): Promise<UnifiedSession[]> {
    const storagePath = await this.getStoragePath();
    if (!storagePath) return [];

    const { readdir, readFile, stat } = await import("node:fs/promises");
    const { resolve } = await import("node:path");

    const sessions: UnifiedSession[] = [];

    let projectDirs: string[];
    try {
      projectDirs = await readdir(storagePath);
    } catch {
      return [];
    }

    for (const projectDir of projectDirs) {
      const projectPath = resolve(storagePath, projectDir);

      let dirStat;
      try {
        dirStat = await stat(projectPath);
      } catch {
        continue;
      }
      if (!dirStat.isDirectory()) continue;

      let files: string[];
      try {
        files = await readdir(projectPath);
      } catch {
        continue;
      }

      for (const file of files) {
        if (!file.endsWith(".jsonl")) continue;
        const filePath = resolve(projectPath, file);

        try {
          const content = await readFile(filePath, "utf-8");
          const entries = parseJsonl<ClaudeMessage>(content);

          const messages: SessionMessage[] = [];
          for (const entry of entries) {
            const role = this.mapRole(entry.type);
            if (!role) continue;
            const text = this.extractContent(entry);
            if (text) {
              messages.push({ role, content: text });
            }
          }

          if (messages.length === 0) continue;

          const fileStat = await stat(filePath);
          const sessionId = `claude-${projectDir}-${file.replace(".jsonl", "")}`;

          sessions.push({
            id: sessionId,
            tool: this.id,
            toolName: this.name,
            projectPath: projectDir,
            startedAt: fileStat.birthtime.toISOString(),
            updatedAt: fileStat.mtime.toISOString(),
            messageCount: messages.length,
            messages,
          });
        } catch {
          // Skip malformed files
        }
      }
    }

    sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    if (filter) {
      const { filterSessions } = await import("../utils/index.js");
      return filterSessions(sessions, filter);
    }

    return sessions;
  }

  private mapRole(type: string): SessionMessage["role"] | null {
    switch (type) {
      case "human":
        return "user";
      case "assistant":
        return "assistant";
      case "system":
        return "system";
      case "tool":
      case "tool_result":
        return "tool";
      default:
        return null;
    }
  }

  private extractContent(entry: ClaudeMessage): string | null {
    const msg = entry.message;
    if (!msg) return null;

    if (typeof msg.content === "string") {
      return msg.content;
    }

    if (Array.isArray(msg.content)) {
      const textParts = msg.content
        .filter((part) => part.type === "text" && part.text)
        .map((part) => part.text ?? "");
      return textParts.length > 0 ? textParts.join("\n") : null;
    }

    return null;
  }
}

const adapter = new ClaudeSessionAdapter();
registry.register(adapter);
export { ClaudeSessionAdapter };
export default adapter;
