import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  lstatSync: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  symlink: vi.fn(),
  readlink: vi.fn(),
  unlink: vi.fn(),
  mkdir: vi.fn(),
  copyFile: vi.fn(),
}));

import { existsSync, lstatSync } from "node:fs";
import { symlink, readlink, unlink, mkdir, copyFile } from "node:fs/promises";
import { Linker } from "./linker.js";

const mockExistsSync = vi.mocked(existsSync);
const mockLstatSync = vi.mocked(lstatSync);
const mockSymlink = vi.mocked(symlink);
const mockReadlink = vi.mocked(readlink);
const mockUnlink = vi.mocked(unlink);
const mockMkdir = vi.mocked(mkdir);
const mockCopyFile = vi.mocked(copyFile);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── link ────────────────────────────────────────────────────

describe("Linker.link", () => {
  it("creates parent directory and symlink", async () => {
    mockExistsSync.mockReturnValue(false);
    const linker = new Linker();
    await linker.link("/source/file.json", "/target/dir/file.json");

    expect(mockMkdir).toHaveBeenCalledWith("/target/dir", { recursive: true });
    expect(mockSymlink).toHaveBeenCalled();
  });

  it("removes existing target before linking", async () => {
    mockExistsSync.mockReturnValue(true);
    const linker = new Linker();
    await linker.link("/source/file.json", "/target/file.json");

    expect(mockUnlink).toHaveBeenCalledWith("/target/file.json");
    expect(mockSymlink).toHaveBeenCalled();
  });

  it("falls back to copy on EPERM error", async () => {
    mockExistsSync.mockReturnValue(false);
    const epermError = new Error("EPERM") as NodeJS.ErrnoException;
    epermError.code = "EPERM";
    mockSymlink.mockRejectedValue(epermError);

    const linker = new Linker();
    await linker.link("/source/file.json", "/target/file.json");

    expect(mockCopyFile).toHaveBeenCalledWith("/source/file.json", "/target/file.json");
  });

  it("rethrows non-EPERM errors", async () => {
    mockExistsSync.mockReturnValue(false);
    const error = new Error("ENOENT") as NodeJS.ErrnoException;
    error.code = "ENOENT";
    mockSymlink.mockRejectedValue(error);

    const linker = new Linker();
    await expect(linker.link("/source/file.json", "/target/file.json")).rejects.toThrow("ENOENT");
  });
});

// ── status ──────────────────────────────────────────────────

describe("Linker.status", () => {
  it("returns 'missing' when target does not exist", async () => {
    mockExistsSync.mockReturnValue(false);
    const linker = new Linker();
    const result = await linker.status("/target/file.json", "/source/file.json");
    expect(result).toBe("missing");
  });

  it("returns 'direct' when target is not a symlink", async () => {
    mockExistsSync.mockReturnValue(true);
    mockLstatSync.mockReturnValue({ isSymbolicLink: () => false } as ReturnType<typeof lstatSync>);
    const linker = new Linker();
    const result = await linker.status("/target/file.json", "/source/file.json");
    expect(result).toBe("direct");
  });

  it("returns 'linked' when symlink points to expected source", async () => {
    mockExistsSync.mockReturnValue(true);
    mockLstatSync.mockReturnValue({ isSymbolicLink: () => true } as ReturnType<typeof lstatSync>);
    mockReadlink.mockResolvedValue("../source/file.json");

    const linker = new Linker();
    // The relative path from /target/ to /source/file.json is ../source/file.json
    const result = await linker.status("/target/file.json", "/source/file.json");
    expect(result).toBe("linked");
  });

  it("returns 'stale' when symlink points to wrong source", async () => {
    mockExistsSync.mockReturnValue(true);
    mockLstatSync.mockReturnValue({ isSymbolicLink: () => true } as ReturnType<typeof lstatSync>);
    mockReadlink.mockResolvedValue("../other/file.json");

    const linker = new Linker();
    const result = await linker.status("/target/file.json", "/source/file.json");
    expect(result).toBe("stale");
  });

  it("returns 'stale' when readlink throws", async () => {
    mockExistsSync.mockReturnValue(true);
    mockLstatSync.mockReturnValue({ isSymbolicLink: () => true } as ReturnType<typeof lstatSync>);
    mockReadlink.mockRejectedValue(new Error("fail"));

    const linker = new Linker();
    const result = await linker.status("/target/file.json", "/source/file.json");
    expect(result).toBe("stale");
  });
});

// ── unlink ──────────────────────────────────────────────────

describe("Linker.unlink", () => {
  it("returns false when target does not exist", async () => {
    mockExistsSync.mockReturnValue(false);
    const linker = new Linker();
    const result = await linker.unlink("/target/file.json");
    expect(result).toBe(false);
  });

  it("removes target and returns true", async () => {
    mockExistsSync.mockReturnValue(true);
    const linker = new Linker();
    const result = await linker.unlink("/target/file.json");
    expect(result).toBe(true);
    expect(mockUnlink).toHaveBeenCalledWith("/target/file.json");
  });
});
