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
import { GeminiSessionAdapter } from "./gemini.js";

describe("GeminiSessionAdapter", () => {
  let adapter: GeminiSessionAdapter;

  beforeEach(() => {
    adapter = new GeminiSessionAdapter();
    vi.clearAllMocks();
  });

  describe("properties", () => {
    it("has correct id, name, command, and storagePaths", () => {
      expect(adapter.id).toBe("gemini");
      expect(adapter.name).toBe("Gemini CLI");
      expect(adapter.command).toBe("gemini");
      expect(adapter.storagePaths).toEqual(["~/.gemini"]);
    });
  });

  describe("parseSessions()", () => {
    it("returns empty array when storage path does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const sessions = await adapter.parseSessions();
      expect(sessions).toEqual([]);
    });

    it("parses JSON session files with messages", async () => {
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
          id: "gem-123",
          title: "Code Review",
          messages: [
            { role: "user", content: "Review my code" },
            { role: "model", content: "Sure, looking at it now" },
          ],
          createTime: "2025-01-01T00:00:00Z",
          updateTime: "2025-01-01T01:00:00Z",
        }),
      );

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.id).toBe("gem-123");
      expect(sessions[0]?.title).toBe("Code Review");
      expect(sessions[0]?.messages).toHaveLength(2);
      expect(sessions[0]?.messages[0]?.role).toBe("user");
      expect(sessions[0]?.messages[1]?.role).toBe("assistant");
    });

    it("parses history array instead of messages", async () => {
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
          history: [{ role: "user", content: "Hello" }],
        }),
      );

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.messages).toHaveLength(1);
    });

    it("handles parts-based content", async () => {
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
          messages: [
            {
              role: "user",
              parts: [{ text: "Part 1" }, { text: "Part 2" }],
            },
          ],
        }),
      );

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.messages[0]?.content).toBe("Part 1\nPart 2");
    });

    it("maps author field to role", async () => {
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
          messages: [{ author: "user", content: "Hello" }],
        }),
      );

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.messages[0]?.role).toBe("user");
    });

    it("skips non-JSON files", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValueOnce(["config.yaml"] as unknown as Awaited<
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
      vi.mocked(readdir).mockResolvedValueOnce(["my-chat.json"] as unknown as Awaited<
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
      expect(sessions[0]?.id).toBe("gemini-my-chat");
    });
  });
});
