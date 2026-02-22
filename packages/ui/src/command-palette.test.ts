import { describe, it, expect } from "vitest";
import type { ToolInfo } from "./types.js";
import type { SessionRow } from "./widgets/session-browser.js";
import {
  getActionCommands,
  getSessionCommands,
  getToolCommands,
  getAllCommands,
  filterCommands,
} from "./command-palette.js";

function makeTool(overrides: Partial<ToolInfo> = {}): ToolInfo {
  return {
    id: "claude",
    name: "Claude Code",
    command: "claude",
    status: "available",
    sessionCount: 5,
    ...overrides,
  };
}

function makeSession(overrides: Partial<SessionRow> = {}): SessionRow {
  return {
    id: "s1",
    tool: "claude",
    toolName: "Claude Code",
    title: "Fix auth bug",
    messageCount: 10,
    updatedAt: "2025-01-15T10:00:00Z",
    ...overrides,
  };
}

describe("getActionCommands", () => {
  it("returns a non-empty array of actions", () => {
    const commands = getActionCommands();
    expect(commands.length).toBeGreaterThan(0);
  });

  it("all items have category action", () => {
    const commands = getActionCommands();
    for (const cmd of commands) {
      expect(cmd.category).toBe("action");
    }
  });

  it("includes generate config command", () => {
    const commands = getActionCommands();
    expect(commands.some((c) => c.id === "generate")).toBe(true);
  });

  it("includes install config command", () => {
    const commands = getActionCommands();
    expect(commands.some((c) => c.id === "install")).toBe(true);
  });

  it("includes quit command", () => {
    const commands = getActionCommands();
    expect(commands.some((c) => c.id === "quit")).toBe(true);
  });

  it("includes help command", () => {
    const commands = getActionCommands();
    expect(commands.some((c) => c.id === "help")).toBe(true);
  });

  it("includes theme command", () => {
    const commands = getActionCommands();
    expect(commands.some((c) => c.id === "theme")).toBe(true);
  });

  it("all items have unique ids", () => {
    const commands = getActionCommands();
    const ids = commands.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getSessionCommands", () => {
  it("returns empty for no sessions", () => {
    expect(getSessionCommands([])).toEqual([]);
  });

  it("creates command for each session", () => {
    const sessions = [makeSession({ id: "s1" }), makeSession({ id: "s2" })];
    const commands = getSessionCommands(sessions);
    expect(commands).toHaveLength(2);
  });

  it("prefixes id with session-", () => {
    const commands = getSessionCommands([makeSession({ id: "abc" })]);
    expect(commands[0]!.id).toBe("session-abc");
  });

  it("includes tool name in label", () => {
    const commands = getSessionCommands([makeSession({ tool: "claude" })]);
    expect(commands[0]!.label).toContain("[claude]");
  });

  it("includes session title in label", () => {
    const commands = getSessionCommands([makeSession({ title: "My Session" })]);
    expect(commands[0]!.label).toContain("My Session");
  });

  it("all items have category session", () => {
    const commands = getSessionCommands([makeSession()]);
    for (const cmd of commands) {
      expect(cmd.category).toBe("session");
    }
  });
});

describe("getToolCommands", () => {
  it("returns empty for no tools", () => {
    expect(getToolCommands([])).toEqual([]);
  });

  it("only includes available tools", () => {
    const tools = [
      makeTool({ id: "a", status: "available" }),
      makeTool({ id: "b", status: "not-installed" }),
    ];
    const commands = getToolCommands(tools);
    expect(commands).toHaveLength(1);
    expect(commands[0]!.id).toBe("tool-a");
  });

  it("prefixes id with tool-", () => {
    const commands = getToolCommands([makeTool({ id: "claude" })]);
    expect(commands[0]!.id).toBe("tool-claude");
  });

  it("uses tool name as label", () => {
    const commands = getToolCommands([makeTool({ name: "Claude Code" })]);
    expect(commands[0]!.label).toBe("Claude Code");
  });

  it("all items have category tool", () => {
    const commands = getToolCommands([makeTool()]);
    for (const cmd of commands) {
      expect(cmd.category).toBe("tool");
    }
  });

  it("filters out running tools", () => {
    const commands = getToolCommands([makeTool({ status: "running" })]);
    expect(commands).toHaveLength(0);
  });

  it("filters out stopped tools", () => {
    const commands = getToolCommands([makeTool({ status: "stopped" })]);
    expect(commands).toHaveLength(0);
  });
});

describe("getAllCommands", () => {
  it("combines all sources", () => {
    const sessions = [makeSession()];
    const tools = [makeTool()];
    const all = getAllCommands(sessions, tools);
    const actionCount = getActionCommands().length;
    expect(all.length).toBe(actionCount + 1 + 1); // actions + 1 session + 1 tool
  });

  it("actions come first", () => {
    const all = getAllCommands([makeSession()], [makeTool()]);
    expect(all[0]!.category).toBe("action");
  });

  it("works with empty inputs", () => {
    const all = getAllCommands([], []);
    expect(all.length).toBe(getActionCommands().length);
  });
});

describe("filterCommands", () => {
  it("returns all items for empty query", () => {
    const items = getActionCommands();
    expect(filterCommands(items, "")).toEqual(items);
  });

  it("filters by substring match", () => {
    const items = getActionCommands();
    const result = filterCommands(items, "Config");
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      expect(item.label.toLowerCase()).toContain("config");
    }
  });

  it("is case-insensitive", () => {
    const items = getActionCommands();
    const lower = filterCommands(items, "config");
    const upper = filterCommands(items, "CONFIG");
    expect(lower).toEqual(upper);
  });

  it("returns empty for no matches", () => {
    const items = getActionCommands();
    expect(filterCommands(items, "zzzznonexistent")).toEqual([]);
  });

  it("matches partial strings", () => {
    const items = getActionCommands();
    const result = filterCommands(items, "Gen");
    expect(result.some((c) => c.label.includes("Generate"))).toBe(true);
  });
});
