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
import { ClaudeSessionAdapter } from "./claude.js";

describe("ClaudeSessionAdapter", () => {
  let adapter: ClaudeSessionAdapter;

  beforeEach(() => {
    adapter = new ClaudeSessionAdapter();
    vi.clearAllMocks();
  });

  describe("properties", () => {
    it("has correct id, name, command, and storagePaths", () => {
      expect(adapter.id).toBe("claude");
      expect(adapter.name).toBe("Claude Code");
      expect(adapter.command).toBe("claude");
      expect(adapter.storagePaths).toEqual(["~/.claude/projects"]);
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
      vi.mocked(readdir)
        .mockResolvedValueOnce(["my-project"] as unknown as Awaited<ReturnType<typeof readdir>>)
        .mockResolvedValueOnce(["session1.jsonl"] as unknown as Awaited<
          ReturnType<typeof readdir>
        >);
      vi.mocked(stat).mockResolvedValue({
        isDirectory: () => true,
        birthtime: new Date("2025-01-01T00:00:00Z"),
        mtime: new Date("2025-01-01T01:00:00Z"),
      } as unknown as Awaited<ReturnType<typeof stat>>);
      vi.mocked(readFile).mockResolvedValue(
        '{"type":"human","message":{"content":"Hello"}}\n' +
          '{"type":"assistant","message":{"content":"Hi there!"}}\n',
      );

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.messages).toHaveLength(2);
      expect(sessions[0]?.messages[0]?.role).toBe("user");
      expect(sessions[0]?.messages[0]?.content).toBe("Hello");
      expect(sessions[0]?.messages[1]?.role).toBe("assistant");
      expect(sessions[0]?.messages[1]?.content).toBe("Hi there!");
    });

    it("handles array content in messages", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir)
        .mockResolvedValueOnce(["proj"] as unknown as Awaited<ReturnType<typeof readdir>>)
        .mockResolvedValueOnce(["s.jsonl"] as unknown as Awaited<ReturnType<typeof readdir>>);
      vi.mocked(stat).mockResolvedValue({
        isDirectory: () => true,
        birthtime: new Date("2025-01-01T00:00:00Z"),
        mtime: new Date("2025-01-01T01:00:00Z"),
      } as unknown as Awaited<ReturnType<typeof stat>>);
      vi.mocked(readFile).mockResolvedValue(
        '{"type":"assistant","message":{"content":[{"type":"text","text":"Part 1"},{"type":"text","text":"Part 2"}]}}\n',
      );

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.messages[0]?.content).toBe("Part 1\nPart 2");
    });

    it("skips non-JSONL files", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir)
        .mockResolvedValueOnce(["proj"] as unknown as Awaited<ReturnType<typeof readdir>>)
        .mockResolvedValueOnce(["readme.md", "data.json"] as unknown as Awaited<
          ReturnType<typeof readdir>
        >);
      vi.mocked(stat).mockResolvedValue({
        isDirectory: () => true,
      } as unknown as Awaited<ReturnType<typeof stat>>);

      const sessions = await adapter.parseSessions();
      expect(sessions).toEqual([]);
    });

    it("skips malformed JSONL entries", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir)
        .mockResolvedValueOnce(["proj"] as unknown as Awaited<ReturnType<typeof readdir>>)
        .mockResolvedValueOnce(["s.jsonl"] as unknown as Awaited<ReturnType<typeof readdir>>);
      vi.mocked(stat).mockResolvedValue({
        isDirectory: () => true,
        birthtime: new Date("2025-01-01T00:00:00Z"),
        mtime: new Date("2025-01-01T01:00:00Z"),
      } as unknown as Awaited<ReturnType<typeof stat>>);
      vi.mocked(readFile).mockResolvedValue(
        'not json\n{"type":"human","message":{"content":"Hello"}}\n',
      );

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.messages).toHaveLength(1);
    });

    it("handles empty storage directory", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValueOnce(
        [] as unknown as Awaited<ReturnType<typeof readdir>>,
      );

      const sessions = await adapter.parseSessions();
      expect(sessions).toEqual([]);
    });

    it("skips entries with unknown types", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir)
        .mockResolvedValueOnce(["proj"] as unknown as Awaited<ReturnType<typeof readdir>>)
        .mockResolvedValueOnce(["s.jsonl"] as unknown as Awaited<ReturnType<typeof readdir>>);
      vi.mocked(stat).mockResolvedValue({
        isDirectory: () => true,
        birthtime: new Date("2025-01-01T00:00:00Z"),
        mtime: new Date("2025-01-01T01:00:00Z"),
      } as unknown as Awaited<ReturnType<typeof stat>>);
      vi.mocked(readFile).mockResolvedValue(
        '{"type":"unknown_type","message":{"content":"ignored"}}\n' +
          '{"type":"human","message":{"content":"kept"}}\n',
      );

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.messages).toHaveLength(1);
      expect(sessions[0]?.messages[0]?.content).toBe("kept");
    });

    it("handles readdir failure gracefully", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockRejectedValueOnce(new Error("permission denied"));

      const sessions = await adapter.parseSessions();
      expect(sessions).toEqual([]);
    });

    it("skips files in project dir (not directories)", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValueOnce(["a-file"] as unknown as Awaited<
        ReturnType<typeof readdir>
      >);
      vi.mocked(stat).mockResolvedValue({
        isDirectory: () => false,
      } as unknown as Awaited<ReturnType<typeof stat>>);

      const sessions = await adapter.parseSessions();
      expect(sessions).toEqual([]);
    });

    it("maps tool_result type to tool role", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir)
        .mockResolvedValueOnce(["proj"] as unknown as Awaited<ReturnType<typeof readdir>>)
        .mockResolvedValueOnce(["s.jsonl"] as unknown as Awaited<ReturnType<typeof readdir>>);
      vi.mocked(stat).mockResolvedValue({
        isDirectory: () => true,
        birthtime: new Date("2025-01-01T00:00:00Z"),
        mtime: new Date("2025-01-01T01:00:00Z"),
      } as unknown as Awaited<ReturnType<typeof stat>>);
      vi.mocked(readFile).mockResolvedValue(
        '{"type":"tool_result","message":{"content":"result data"}}\n',
      );

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.messages[0]?.role).toBe("tool");
    });
  });
});
