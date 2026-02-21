import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { readManifest, writeManifest, addEntry, removeEntry, getEntries } from "./manifest.js";
import type { ManifestEntry } from "./types.js";

const mockExistsSync = vi.mocked(existsSync);
const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── readManifest ────────────────────────────────────────────

describe("readManifest", () => {
  it("returns empty manifest when file does not exist", async () => {
    mockExistsSync.mockReturnValue(false);
    const result = await readManifest("/test");
    expect(result).toEqual({ version: 1, entries: [] });
  });

  it("reads and parses manifest file", async () => {
    const manifest = { version: 1, entries: [{ engine: "skills", id: "review" }] };
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify(manifest));
    const result = await readManifest("/test");
    expect(result).toEqual(manifest);
  });
});

// ── writeManifest ───────────────────────────────────────────

describe("writeManifest", () => {
  it("writes manifest to disk", async () => {
    const manifest = { version: 1 as const, entries: [] };
    await writeManifest(manifest, "/test");
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n",
      "utf-8",
    );
  });
});

// ── addEntry ────────────────────────────────────────────────

describe("addEntry", () => {
  const entry: ManifestEntry = {
    engine: "skills",
    id: "review",
    canonicalPath: ".ai-tools/skills/review.json",
    targets: [],
    updatedAt: "2026-01-01T00:00:00Z",
  };

  it("adds entry to empty manifest", async () => {
    mockExistsSync.mockReturnValue(false);
    await addEntry(entry, "/test");
    const written = JSON.parse(mockWriteFile.mock.calls[0]?.[1] as string) as {
      entries: ManifestEntry[];
    };
    expect(written.entries).toHaveLength(1);
    expect(written.entries[0]).toEqual(entry);
  });

  it("upserts entry by engine+id", async () => {
    const existing = {
      version: 1,
      entries: [{ ...entry, updatedAt: "2025-01-01T00:00:00Z" }],
    };
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify(existing));

    const updated = { ...entry, updatedAt: "2026-02-01T00:00:00Z" };
    await addEntry(updated, "/test");

    const written = JSON.parse(mockWriteFile.mock.calls[0]?.[1] as string) as {
      entries: ManifestEntry[];
    };
    expect(written.entries).toHaveLength(1);
    expect(written.entries[0]?.updatedAt).toBe("2026-02-01T00:00:00Z");
  });
});

// ── removeEntry ─────────────────────────────────────────────

describe("removeEntry", () => {
  it("removes entry by engine+id", async () => {
    const existing = {
      version: 1,
      entries: [
        {
          engine: "skills",
          id: "review",
          canonicalPath: ".ai-tools/skills/review.json",
          targets: [],
          updatedAt: "2026-01-01T00:00:00Z",
        },
        {
          engine: "skills",
          id: "debug",
          canonicalPath: ".ai-tools/skills/debug.json",
          targets: [],
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
    };
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify(existing));

    await removeEntry("skills", "review", "/test");

    const written = JSON.parse(mockWriteFile.mock.calls[0]?.[1] as string) as {
      entries: ManifestEntry[];
    };
    expect(written.entries).toHaveLength(1);
    expect(written.entries[0]?.id).toBe("debug");
  });

  it("does nothing when entry not found", async () => {
    mockExistsSync.mockReturnValue(false);
    await removeEntry("skills", "nonexistent", "/test");
    const written = JSON.parse(mockWriteFile.mock.calls[0]?.[1] as string) as {
      entries: ManifestEntry[];
    };
    expect(written.entries).toHaveLength(0);
  });
});

// ── getEntries ──────────────────────────────────────────────

describe("getEntries", () => {
  const entries = [
    {
      engine: "skills",
      id: "review",
      canonicalPath: ".ai-tools/skills/review.json",
      targets: [],
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      engine: "agents",
      id: "coder",
      canonicalPath: ".ai-tools/agents/coder.json",
      targets: [],
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ];

  it("returns all entries when no engine filter", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify({ version: 1, entries }));
    const result = await getEntries(undefined, "/test");
    expect(result).toHaveLength(2);
  });

  it("filters entries by engine", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify({ version: 1, entries }));
    const result = await getEntries("skills", "/test");
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("review");
  });

  it("returns empty array when no manifest exists", async () => {
    mockExistsSync.mockReturnValue(false);
    const result = await getEntries("skills", "/test");
    expect(result).toHaveLength(0);
  });
});
