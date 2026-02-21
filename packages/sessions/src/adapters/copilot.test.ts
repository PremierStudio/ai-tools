import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  stat: vi.fn(),
}));

vi.mock("node:os", () => ({
  homedir: vi.fn(() => "/home/testuser"),
}));

import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { CopilotSessionAdapter } from "./copilot.js";

describe("CopilotSessionAdapter", () => {
  let adapter: CopilotSessionAdapter;

  beforeEach(() => {
    adapter = new CopilotSessionAdapter();
    vi.clearAllMocks();
  });

  describe("properties", () => {
    it("has correct id, name, command, and storagePaths", () => {
      expect(adapter.id).toBe("copilot");
      expect(adapter.name).toBe("GitHub Copilot");
      expect(adapter.command).toBe("github-copilot-cli");
      expect(adapter.storagePaths).toEqual(["~/.config/github-copilot"]);
    });
  });

  describe("parseSessions()", () => {
    it("returns empty array when storage path does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const sessions = await adapter.parseSessions();
      expect(sessions).toEqual([]);
    });

    it("parses JSON session files with turns", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValueOnce(["session.json"] as unknown as Awaited<
        ReturnType<typeof readdir>
      >);
      vi.mocked(stat).mockResolvedValue({
        birthtime: new Date("2025-01-01T00:00:00Z"),
        mtime: new Date("2025-01-01T01:00:00Z"),
      } as unknown as Awaited<ReturnType<typeof stat>>);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          id: "cp-123",
          turns: [
            { role: "user", content: "Help me fix this" },
            { role: "copilot", content: "Sure, let me help" },
          ],
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T01:00:00Z",
        }),
      );

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.id).toBe("cp-123");
      expect(sessions[0]?.messages).toHaveLength(2);
      expect(sessions[0]?.messages[0]?.role).toBe("user");
      expect(sessions[0]?.messages[1]?.role).toBe("assistant");
    });

    it("parses JSON session files with messages array", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValueOnce(["s.json"] as unknown as Awaited<
        ReturnType<typeof readdir>
      >);
      vi.mocked(stat).mockResolvedValue({
        birthtime: new Date("2025-01-01T00:00:00Z"),
        mtime: new Date("2025-01-01T01:00:00Z"),
      } as unknown as Awaited<ReturnType<typeof stat>>);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
        }),
      );

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.messages).toHaveLength(1);
    });

    it("uses file stats when session has no dates", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValueOnce(["s.json"] as unknown as Awaited<
        ReturnType<typeof readdir>
      >);
      vi.mocked(stat).mockResolvedValue({
        birthtime: new Date("2025-06-15T00:00:00Z"),
        mtime: new Date("2025-06-15T12:00:00Z"),
      } as unknown as Awaited<ReturnType<typeof stat>>);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          turns: [{ role: "user", content: "Test" }],
        }),
      );

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.startedAt).toBe("2025-06-15T00:00:00.000Z");
    });

    it("skips non-JSON files", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValueOnce(["config.yaml", "notes.txt"] as unknown as Awaited<
        ReturnType<typeof readdir>
      >);

      const sessions = await adapter.parseSessions();
      expect(sessions).toEqual([]);
    });

    it("handles readdir failure gracefully", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockRejectedValueOnce(new Error("EACCES"));

      const sessions = await adapter.parseSessions();
      expect(sessions).toEqual([]);
    });

    it("generates id from filename when session has no id", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValueOnce(["my-session.json"] as unknown as Awaited<
        ReturnType<typeof readdir>
      >);
      vi.mocked(stat).mockResolvedValue({
        birthtime: new Date("2025-01-01T00:00:00Z"),
        mtime: new Date("2025-01-01T01:00:00Z"),
      } as unknown as Awaited<ReturnType<typeof stat>>);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          turns: [{ role: "user", content: "Hello" }],
        }),
      );

      const sessions = await adapter.parseSessions();
      expect(sessions[0]?.id).toBe("copilot-my-session");
    });

    it("skips files with no parseable messages", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValueOnce(["empty.json"] as unknown as Awaited<
        ReturnType<typeof readdir>
      >);
      vi.mocked(stat).mockResolvedValue({
        birthtime: new Date("2025-01-01T00:00:00Z"),
        mtime: new Date("2025-01-01T01:00:00Z"),
      } as unknown as Awaited<ReturnType<typeof stat>>);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({}));

      const sessions = await adapter.parseSessions();
      expect(sessions).toEqual([]);
    });
  });
});
