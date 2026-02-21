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
import { CodexSessionAdapter } from "./codex.js";

describe("CodexSessionAdapter", () => {
  let adapter: CodexSessionAdapter;

  beforeEach(() => {
    adapter = new CodexSessionAdapter();
    vi.clearAllMocks();
  });

  describe("properties", () => {
    it("has correct id, name, command, and storagePaths", () => {
      expect(adapter.id).toBe("codex");
      expect(adapter.name).toBe("Codex");
      expect(adapter.command).toBe("codex");
      expect(adapter.storagePaths).toEqual(["~/.codex"]);
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
      vi.mocked(readdir).mockResolvedValueOnce(["session.jsonl"] as unknown as Awaited<
        ReturnType<typeof readdir>
      >);
      vi.mocked(stat).mockResolvedValue({
        birthtime: new Date("2025-01-01T00:00:00Z"),
        mtime: new Date("2025-01-01T01:00:00Z"),
      } as unknown as Awaited<ReturnType<typeof stat>>);
      vi.mocked(readFile).mockResolvedValue(
        '{"role":"user","content":"Hello"}\n' + '{"role":"assistant","content":"Hi!"}\n',
      );

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.messages).toHaveLength(2);
      expect(sessions[0]?.messages[0]?.role).toBe("user");
      expect(sessions[0]?.messages[1]?.role).toBe("assistant");
    });

    it("handles type field instead of role", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValueOnce(["s.jsonl"] as unknown as Awaited<
        ReturnType<typeof readdir>
      >);
      vi.mocked(stat).mockResolvedValue({
        birthtime: new Date("2025-01-01T00:00:00Z"),
        mtime: new Date("2025-01-01T01:00:00Z"),
      } as unknown as Awaited<ReturnType<typeof stat>>);
      vi.mocked(readFile).mockResolvedValue('{"type":"human","content":"Hello"}\n');

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.messages[0]?.role).toBe("user");
    });

    it("handles text field instead of content", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValueOnce(["s.jsonl"] as unknown as Awaited<
        ReturnType<typeof readdir>
      >);
      vi.mocked(stat).mockResolvedValue({
        birthtime: new Date("2025-01-01T00:00:00Z"),
        mtime: new Date("2025-01-01T01:00:00Z"),
      } as unknown as Awaited<ReturnType<typeof stat>>);
      vi.mocked(readFile).mockResolvedValue('{"role":"user","text":"Hello via text"}\n');

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.messages[0]?.content).toBe("Hello via text");
    });

    it("skips non-JSONL files", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValueOnce(["readme.md"] as unknown as Awaited<
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
        '{"role":"unknown","content":"skip me"}\n' + '{"role":"user","content":"keep me"}\n',
      );

      const sessions = await adapter.parseSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.messages).toHaveLength(1);
      expect(sessions[0]?.messages[0]?.content).toBe("keep me");
    });
  });
});
