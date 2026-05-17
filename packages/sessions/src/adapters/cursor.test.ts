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
import { CursorSessionAdapter } from "./cursor.js";

describe("CursorSessionAdapter", () => {
  let adapter: CursorSessionAdapter;

  beforeEach(() => {
    adapter = new CursorSessionAdapter();
    vi.clearAllMocks();
  });

  describe("properties", () => {
    it("has correct id, name, command, and storagePaths", () => {
      expect(adapter.id).toBe("cursor");
      expect(adapter.name).toBe("Cursor");
      expect(adapter.command).toBe("cursor");
      expect(adapter.storagePaths).toEqual(["~/.cursor"]);
    });
  });

  describe("parseSessions()", () => {
    it("returns empty array when storage path does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const sessions = await adapter.parseSessions();
      expect(sessions).toEqual([]);
    });

    it("parses JSONL session files", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValueOnce(["chat.jsonl"] as unknown as Awaited<
        ReturnType<typeof readdir>
      >);
      vi.mocked(stat).mockResolvedValue({
        birthtime: new Date("2025-01-01T00:00:00Z"),
        mtime: new Date("2025-01-01T01:00:00Z"),
      } as unknown as Awaited<ReturnType<typeof stat>>);
      vi.mocked(readFile).mockResolvedValue(
        '{"role":"user","content":"Fix this"}\n{"role":"assistant","content":"On it"}\n',
      );

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.id).toBe("cursor-chat");
      expect(sessions[0]?.messages).toHaveLength(2);
      expect(sessions[0]?.messages[0]?.role).toBe("user");
      expect(sessions[0]?.messages[1]?.role).toBe("assistant");
    });

    it("parses JSON session files", async () => {
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
          id: "cur-123",
          title: "Refactor Session",
          messages: [
            { role: "user", content: "Refactor this module" },
            { role: "assistant", content: "Starting refactor" },
          ],
        }),
      );

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.id).toBe("cur-123");
      expect(sessions[0]?.title).toBe("Refactor Session");
      expect(sessions[0]?.messages).toHaveLength(2);
    });

    it("handles both JSONL and JSON files", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValueOnce(["chat.jsonl", "session.json"] as unknown as Awaited<
        ReturnType<typeof readdir>
      >);
      vi.mocked(stat).mockResolvedValue({
        birthtime: new Date("2025-01-01T00:00:00Z"),
        mtime: new Date("2025-01-01T01:00:00Z"),
      } as unknown as Awaited<ReturnType<typeof stat>>);
      vi.mocked(readFile)
        .mockResolvedValueOnce('{"role":"user","content":"JSONL msg"}\n')
        .mockResolvedValueOnce(
          JSON.stringify({
            messages: [{ role: "user", content: "JSON msg" }],
          }),
        );

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(2);
    });

    it("skips unsupported file types", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValueOnce(["config.yaml", "readme.md"] as unknown as Awaited<
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

    it("skips entries with unknown roles", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValueOnce(["s.jsonl"] as unknown as Awaited<
        ReturnType<typeof readdir>
      >);
      vi.mocked(stat).mockResolvedValue({
        birthtime: new Date("2025-01-01T00:00:00Z"),
        mtime: new Date("2025-01-01T01:00:00Z"),
      } as unknown as Awaited<ReturnType<typeof stat>>);
      vi.mocked(readFile).mockResolvedValue(
        '{"role":"unknown","content":"skip"}\n{"role":"user","content":"keep"}\n',
      );

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.messages).toHaveLength(1);
      expect(sessions[0]?.messages[0]?.content).toBe("keep");
    });

    it("generates id from filename for JSON without id", async () => {
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
      expect(sessions[0]?.id).toBe("cursor-my-chat");
    });
  });
});
