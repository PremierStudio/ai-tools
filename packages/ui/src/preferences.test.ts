import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn().mockReturnValue(false),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue("{}"),
  writeFileSync: vi.fn(),
}));

vi.mock("node:os", () => ({
  homedir: () => "/home/testuser",
}));

vi.mock("node:path", () => ({
  join: (...args: string[]) => args.join("/"),
  dirname: (p: string) => p.split("/").slice(0, -1).join("/"),
}));

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import {
  getPreferencesPath,
  loadPreferences,
  savePreferences,
  cycleTheme,
  isValidTheme,
  searchKeybindings,
  getEffectiveKey,
  findKeybindingCollision,
  AVAILABLE_THEMES,
  DEFAULT_KEYBINDINGS,
  type ThemeName,
} from "./preferences.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPreferencesPath", () => {
  it("returns path under home directory", () => {
    const path = getPreferencesPath();
    expect(path).toBe("/home/testuser/.ai-tools/ui-preferences.json");
  });
});

describe("loadPreferences", () => {
  it("returns defaults when file does not exist", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const prefs = loadPreferences();
    expect(prefs.theme).toBe("dark");
    expect(prefs.sessionRefreshActiveMs).toBe(15_000);
    expect(prefs.sessionRefreshIdleMs).toBe(60_000);
  });

  it("loads valid preferences from file", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
      '{"theme":"nord","sessionRefreshActiveMs":10000,"sessionRefreshIdleMs":120000}',
    );
    const prefs = loadPreferences();
    expect(prefs.theme).toBe("nord");
    expect(prefs.sessionRefreshActiveMs).toBe(10_000);
    expect(prefs.sessionRefreshIdleMs).toBe(120_000);
  });

  it("returns defaults for invalid JSON", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue("not json");
    const prefs = loadPreferences();
    expect(prefs.theme).toBe("dark");
  });

  it("returns defaults for invalid theme value", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue('{"theme": "invalid"}');
    const prefs = loadPreferences();
    expect(prefs.theme).toBe("dark");
  });

  it("returns defaults when file read throws", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error("read error");
    });
    const prefs = loadPreferences();
    expect(prefs.theme).toBe("dark");
  });

  it("returns defaults for null parsed value", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue("null");
    const prefs = loadPreferences();
    expect(prefs.theme).toBe("dark");
  });

  it("returns defaults for array parsed value", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue("[]");
    const prefs = loadPreferences();
    expect(prefs.theme).toBe("dark");
  });

  it("returns default theme when theme field is not a string", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue('{"theme": 123}');
    const prefs = loadPreferences();
    expect(prefs.theme).toBe("dark");
  });

  it("returns a new object each call", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const a = loadPreferences();
    const b = loadPreferences();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it("returns empty keyOverrides by default", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const prefs = loadPreferences();
    expect(prefs.keyOverrides).toEqual({});
  });

  it("loads keyOverrides from file", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue('{"theme":"dark","keyOverrides":{"quit":"ctrl+q"}}');
    const prefs = loadPreferences();
    expect(prefs.keyOverrides).toEqual({ quit: "ctrl+q" });
  });

  it("falls back to empty keyOverrides when field is missing", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue('{"theme":"dark"}');
    const prefs = loadPreferences();
    expect(prefs.keyOverrides).toEqual({});
  });
});

describe("savePreferences", () => {
  it("creates directory if it does not exist", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    savePreferences({ theme: "dark", keyOverrides: {} });
    expect(mkdirSync).toHaveBeenCalledWith("/home/testuser/.ai-tools", { recursive: true });
  });

  it("writes preferences to file", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    savePreferences({ theme: "nord", keyOverrides: {} });
    expect(writeFileSync).toHaveBeenCalledWith(
      "/home/testuser/.ai-tools/ui-preferences.json",
      expect.stringContaining('"nord"'),
      "utf-8",
    );
  });

  it("writes valid JSON", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    savePreferences({ theme: "dracula", keyOverrides: {} });
    const written = vi.mocked(writeFileSync).mock.calls[0]![1] as string;
    const parsed = JSON.parse(written);
    expect(parsed.theme).toBe("dracula");
    expect(parsed.sessionRefreshActiveMs).toBeDefined();
    expect(parsed.sessionRefreshIdleMs).toBeDefined();
  });

  it("persists keyOverrides", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    savePreferences({ theme: "dark", keyOverrides: { quit: "ctrl+q" } });
    const written = vi.mocked(writeFileSync).mock.calls[0]![1] as string;
    const parsed = JSON.parse(written);
    expect(parsed.keyOverrides).toEqual({ quit: "ctrl+q" });
  });

  it("persists refresh interval overrides", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    savePreferences({ sessionRefreshActiveMs: 10_000, sessionRefreshIdleMs: 120_000 });
    const written = vi.mocked(writeFileSync).mock.calls[0]![1] as string;
    const parsed = JSON.parse(written);
    expect(parsed.sessionRefreshActiveMs).toBe(10_000);
    expect(parsed.sessionRefreshIdleMs).toBe(120_000);
  });
});

describe("cycleTheme", () => {
  it("cycles from dark to light", () => {
    expect(cycleTheme("dark")).toBe("light");
  });

  it("cycles from last theme to first", () => {
    const last = AVAILABLE_THEMES[AVAILABLE_THEMES.length - 1]!;
    expect(cycleTheme(last)).toBe("dark");
  });

  it("returns first theme for unknown theme name", () => {
    expect(cycleTheme("unknown" as ThemeName)).toBe("dark");
  });

  it("cycles through all themes in order", () => {
    let current: ThemeName = "dark";
    const visited: string[] = [current];
    for (let i = 0; i < AVAILABLE_THEMES.length; i++) {
      current = cycleTheme(current);
      visited.push(current);
    }
    // Should complete full cycle back to dark
    expect(visited[visited.length - 1]).toBe("dark");
  });
});

describe("isValidTheme", () => {
  it("returns true for valid themes", () => {
    for (const theme of AVAILABLE_THEMES) {
      expect(isValidTheme(theme)).toBe(true);
    }
  });

  it("returns false for invalid theme", () => {
    expect(isValidTheme("invalid")).toBe(false);
    expect(isValidTheme("")).toBe(false);
  });
});

describe("searchKeybindings", () => {
  it("returns all bindings for empty query", () => {
    const results = searchKeybindings("");
    expect(results.length).toBe(DEFAULT_KEYBINDINGS.length);
  });

  it("returns all bindings for whitespace-only query", () => {
    const results = searchKeybindings("   ");
    expect(results.length).toBe(DEFAULT_KEYBINDINGS.length);
  });

  it("filters by label (case-insensitive)", () => {
    const results = searchKeybindings("quit");
    expect(results.some((b) => b.id === "quit")).toBe(true);
  });

  it("filters by key", () => {
    const results = searchKeybindings("ctrl+c");
    expect(results.some((b) => b.id === "quit-ctrl")).toBe(true);
  });

  it("filters by context (returns bindings matching the word)", () => {
    const results = searchKeybindings("terminal");
    // Every result must contain "terminal" in label, key, description, or context
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every(
        (b) =>
          b.label.toLowerCase().includes("terminal") ||
          b.defaultKey.toLowerCase().includes("terminal") ||
          (b.description?.toLowerCase().includes("terminal") ?? false) ||
          b.context.toLowerCase().includes("terminal"),
      ),
    ).toBe(true);
  });

  it("filters by description", () => {
    const results = searchKeybindings("Exit the app");
    expect(results.some((b) => b.id === "quit")).toBe(true);
  });

  it("returns empty array when no match", () => {
    const results = searchKeybindings("zzz_no_match_zzz");
    expect(results).toHaveLength(0);
  });
});

describe("getEffectiveKey", () => {
  it("returns default key when no override", () => {
    const key = getEffectiveKey("quit", {});
    expect(key).toBe("q");
  });

  it("returns override when set", () => {
    const key = getEffectiveKey("quit", { quit: "ctrl+q" });
    expect(key).toBe("ctrl+q");
  });

  it("returns empty string for unknown action", () => {
    const key = getEffectiveKey("unknown-action", {});
    expect(key).toBe("");
  });
});

describe("findKeybindingCollision", () => {
  it("returns null when key is unique", () => {
    const collision = findKeybindingCollision("quit", "ctrl+q", {});
    expect(collision).toBeNull();
  });

  it("detects collision against another default binding", () => {
    const collision = findKeybindingCollision("help", "q", {});
    expect(collision?.id).toBe("quit");
  });

  it("detects collision against existing overrides", () => {
    const collision = findKeybindingCollision("help", "ctrl+q", { quit: "ctrl+q" });
    expect(collision?.id).toBe("quit");
  });
});
