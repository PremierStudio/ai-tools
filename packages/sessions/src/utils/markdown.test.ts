import { describe, it, expect } from "vitest";
import { formatHandoffMarkdown } from "./markdown.js";
import type { SessionContext } from "../types/index.js";

function makeContext(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    sessionId: "sess-123",
    tool: "claude",
    title: "Fix parser bug",
    summary: "Worked on fixing the JSONL parser.",
    keyFiles: [],
    keyDecisions: [],
    lastActivity: "2025-01-01T12:00:00Z",
    handoffMarkdown: "",
    ...overrides,
  };
}

describe("formatHandoffMarkdown", () => {
  it("includes title and summary", () => {
    const ctx = makeContext();
    const md = formatHandoffMarkdown(ctx);
    expect(md).toContain("# Session Handoff");
    expect(md).toContain("**claude**");
    expect(md).toContain("Fix parser bug");
    expect(md).toContain("Worked on fixing the JSONL parser.");
  });

  it("includes key files section when files are present", () => {
    const ctx = makeContext({
      keyFiles: ["./src/parser.ts", "./src/utils.ts"],
    });
    const md = formatHandoffMarkdown(ctx);
    expect(md).toContain("## Relevant Files");
    expect(md).toContain("`./src/parser.ts`");
    expect(md).toContain("`./src/utils.ts`");
  });

  it("omits key files section when empty", () => {
    const ctx = makeContext({ keyFiles: [] });
    const md = formatHandoffMarkdown(ctx);
    expect(md).not.toContain("## Relevant Files");
  });

  it("includes decisions section when decisions are present", () => {
    const ctx = makeContext({
      keyDecisions: ["use streaming parser", "switch to vitest"],
    });
    const md = formatHandoffMarkdown(ctx);
    expect(md).toContain("## Decisions Made");
    expect(md).toContain("- use streaming parser");
    expect(md).toContain("- switch to vitest");
  });

  it("omits decisions section when empty", () => {
    const ctx = makeContext({ keyDecisions: [] });
    const md = formatHandoffMarkdown(ctx);
    expect(md).not.toContain("## Decisions Made");
  });

  it("includes instructions section", () => {
    const ctx = makeContext();
    const md = formatHandoffMarkdown(ctx);
    expect(md).toContain("## Instructions");
    expect(md).toContain("Please continue this work");
  });

  it("combines all sections for complete context", () => {
    const ctx = makeContext({
      keyFiles: ["./src/index.ts"],
      keyDecisions: ["refactor the module"],
    });
    const md = formatHandoffMarkdown(ctx);
    expect(md).toContain("# Session Handoff");
    expect(md).toContain("## Context");
    expect(md).toContain("## Relevant Files");
    expect(md).toContain("## Decisions Made");
    expect(md).toContain("## Instructions");
  });
});
