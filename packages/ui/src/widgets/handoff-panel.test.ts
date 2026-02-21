import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SessionContext, UnifiedSession } from "@premierstudio/ai-sessions";

const mockAdapters: Array<{
  id: string;
  detect: () => Promise<boolean>;
  parseSessions: () => Promise<UnifiedSession[]>;
  extractContext: (session: UnifiedSession) => Promise<SessionContext>;
}> = [];

vi.mock("@premierstudio/ai-sessions", () => ({
  registry: {
    detectAll: async () => mockAdapters,
  },
}));

vi.mock("@premierstudio/ai-sessions/adapters/all", () => ({}));

import { extractHandoffContext, previewHandoff, getTargetTools } from "./handoff-panel.js";

function makeContext(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    sessionId: "s1",
    tool: "claude",
    title: "Test Session",
    summary: "A test session summary",
    keyFiles: ["./src/index.ts"],
    keyDecisions: ["Use TypeScript"],
    lastActivity: "2025-01-01T01:00:00Z",
    handoffMarkdown: "# Handoff",
    ...overrides,
  };
}

beforeEach(() => {
  mockAdapters.length = 0;
  vi.clearAllMocks();
});

// -- extractHandoffContext --

describe("extractHandoffContext()", () => {
  it("returns null when no adapters detected", async () => {
    const ctx = await extractHandoffContext("s1");
    expect(ctx).toBeNull();
  });

  it("returns context when session is found", async () => {
    const context = makeContext();
    mockAdapters.push({
      id: "claude",
      detect: async () => true,
      parseSessions: async () => [
        {
          id: "s1",
          tool: "claude",
          toolName: "Claude Code",
          startedAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T01:00:00Z",
          messageCount: 2,
          messages: [],
        },
      ],
      extractContext: async () => context,
    });

    const result = await extractHandoffContext("s1");
    expect(result).toEqual(context);
  });

  it("returns null when session not found in any adapter", async () => {
    mockAdapters.push({
      id: "claude",
      detect: async () => true,
      parseSessions: async () => [],
      extractContext: async () => makeContext(),
    });

    const result = await extractHandoffContext("nonexistent");
    expect(result).toBeNull();
  });

  it("skips adapters that throw during parseSessions", async () => {
    const context = makeContext({ sessionId: "s2" });

    mockAdapters.push({
      id: "broken",
      detect: async () => true,
      parseSessions: async () => {
        throw new Error("parse failed");
      },
      extractContext: async () => makeContext(),
    });

    mockAdapters.push({
      id: "claude",
      detect: async () => true,
      parseSessions: async () => [
        {
          id: "s2",
          tool: "claude",
          toolName: "Claude Code",
          startedAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T01:00:00Z",
          messageCount: 1,
          messages: [],
        },
      ],
      extractContext: async () => context,
    });

    const result = await extractHandoffContext("s2");
    expect(result?.sessionId).toBe("s2");
  });
});

// -- previewHandoff --

describe("previewHandoff()", () => {
  it("formats context as markdown preview", () => {
    const ctx = makeContext();
    const preview = previewHandoff(ctx);

    expect(preview).toContain("# Handoff Preview");
    expect(preview).toContain("**From:** claude");
    expect(preview).toContain("**Session:** s1");
    expect(preview).toContain("**Title:** Test Session");
    expect(preview).toContain("## Summary");
    expect(preview).toContain("A test session summary");
  });

  it("includes key files section when present", () => {
    const ctx = makeContext({ keyFiles: ["./src/app.ts", "./package.json"] });
    const preview = previewHandoff(ctx);

    expect(preview).toContain("## Key Files");
    expect(preview).toContain("- ./src/app.ts");
    expect(preview).toContain("- ./package.json");
  });

  it("omits key files section when empty", () => {
    const ctx = makeContext({ keyFiles: [] });
    const preview = previewHandoff(ctx);
    expect(preview).not.toContain("## Key Files");
  });

  it("includes key decisions section when present", () => {
    const ctx = makeContext({ keyDecisions: ["Use ESM", "Target Node 22"] });
    const preview = previewHandoff(ctx);

    expect(preview).toContain("## Key Decisions");
    expect(preview).toContain("- Use ESM");
    expect(preview).toContain("- Target Node 22");
  });

  it("omits key decisions section when empty", () => {
    const ctx = makeContext({ keyDecisions: [] });
    const preview = previewHandoff(ctx);
    expect(preview).not.toContain("## Key Decisions");
  });
});

// -- getTargetTools --

describe("getTargetTools()", () => {
  it("returns list of handoff target tools", () => {
    const targets = getTargetTools();
    expect(targets.length).toBeGreaterThan(0);
  });

  it("includes claude as a target", () => {
    const targets = getTargetTools();
    const claude = targets.find((t) => t.id === "claude");
    expect(claude).toBeDefined();
    expect(claude?.name).toBe("Claude Code");
    expect(claude?.command).toBe("claude");
  });

  it("includes codex as a target", () => {
    const targets = getTargetTools();
    const codex = targets.find((t) => t.id === "codex");
    expect(codex).toBeDefined();
    expect(codex?.name).toBe("Codex");
  });

  it("each target has id, name, and command", () => {
    const targets = getTargetTools();
    for (const target of targets) {
      expect(target.id).toBeTruthy();
      expect(target.name).toBeTruthy();
      expect(target.command).toBeTruthy();
    }
  });
});
