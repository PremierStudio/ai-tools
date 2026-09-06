import { describe, expect, it } from "vitest";
import {
  asRecord,
  buildCompatEvent,
  collectNativeEvents,
  isBlockingNativeEvent,
  normalizeNativeEvent,
  parseHookGroups,
  payloadCwd,
  payloadEventName,
  payloadTimestamp,
  payloadToolInput,
  phaseForNativeEvent,
  stringField,
} from "./claude-compat.js";
import type { HookDefinition } from "../types/index.js";

describe("claude-compat helpers", () => {
  it("normalizes snake_case, camelCase, and PascalCase event names", () => {
    expect(normalizeNativeEvent("pre_tool_use")).toBe("PreToolUse");
    expect(normalizeNativeEvent("PreToolUse")).toBe("PreToolUse");
    expect(normalizeNativeEvent("userPromptSubmit")).toBe("UserPromptSubmit");
    expect(normalizeNativeEvent("")).toBe("");
    expect(normalizeNativeEvent("_pre__tool_use")).toBe("PreToolUse");
    expect(payloadEventName({ hook_event_name: "session_start" })).toBe("SessionStart");
    expect(payloadEventName({ hookEventName: "" }, "session_start")).toBe("SessionStart");
    expect(payloadEventName({}, "session_start")).toBe("SessionStart");
  });

  it("coerces payload fields and timestamps", () => {
    expect(asRecord(null)).toEqual({});
    expect(asRecord([1])).toEqual({});
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
    expect(stringField(3, "fallback")).toBe("fallback");
    expect(payloadTimestamp({ timestamp: 42 })).toBe(42);
    expect(payloadTimestamp({ timestamp: "2020-01-01T00:00:00.000Z" })).toBe(
      Date.parse("2020-01-01T00:00:00.000Z"),
    );
    expect(payloadTimestamp({ timestamp: "not-a-date" })).toBeTypeOf("number");
    expect(payloadToolInput({ tool_input: { command: "x" } })).toEqual({ command: "x" });
    expect(payloadToolInput({})).toEqual({});
    expect(payloadCwd({ workspaceRoot: "/ws" })).toBe("/ws");
    expect(phaseForNativeEvent("PostToolUse")).toBe("after");
    expect(isBlockingNativeEvent("PermissionRequest")).toBe(true);
  });

  it("builds shell:before from Grok run_terminal_command PreToolUse", () => {
    const event = buildCompatEvent(
      "PreToolUse",
      {
        toolName: "run_terminal_command",
        toolInput: { command: "npm test" },
        cwd: "/tmp/proj",
      },
      "grok",
    );
    expect(event?.type).toBe("shell:before");
    if (event?.type === "shell:before") {
      expect(event.command).toBe("npm test");
      expect(event.cwd).toBe("/tmp/proj");
    }
  });

  it("builds file:write / file:edit / mcp:before from tool names", () => {
    expect(
      buildCompatEvent(
        "PreToolUse",
        { toolName: "Write", toolInput: { file_path: "a.ts" } },
        "zcode",
      )?.type,
    ).toBe("file:write");
    expect(
      buildCompatEvent(
        "PreToolUse",
        { toolName: "search_replace", toolInput: { path: "a.ts" } },
        "grok",
      )?.type,
    ).toBe("file:edit");
    const mcp = buildCompatEvent(
      "PreToolUse",
      { toolName: "linear__save_issue", toolInput: { title: "x" } },
      "grok",
    );
    expect(mcp?.type).toBe("mcp:before");
    if (mcp?.type === "mcp:before") {
      expect(mcp.server).toBe("linear");
      expect(mcp.method).toBe("save_issue");
    }
  });

  it("collects sorted unique native events", () => {
    const hooks: HookDefinition[] = [
      {
        id: "a",
        name: "a",
        events: ["file:write", "shell:before"],
        phase: "before",
        handler: async (_ctx, next) => {
          await next();
        },
      },
    ];
    expect(collectNativeEvents(hooks, () => ["PreToolUse", "PreToolUse"])).toEqual(["PreToolUse"]);
  });

  it("parses matcher groups into hook definitions", async () => {
    const defs = parseHookGroups(
      [{ hooks: [{ type: "command", command: "echo hi", statusMessage: "hi" }] }],
      "PreToolUse",
      () => ["shell:before"],
      "zcode",
    );
    expect(defs).toHaveLength(1);
    expect(defs[0]?.id).toBe("zcode-PreToolUse-0-0");
    expect(defs[0]?.name).toBe("echo hi");
    expect(defs[0]?.description).toBe("hi");
    expect(isBlockingNativeEvent("PreToolUse")).toBe(true);
    expect(isBlockingNativeEvent("PostToolUse")).toBe(false);
    const ran = { value: false };
    await defs[0]!.handler(
      {
        event: {
          type: "shell:before",
          command: "echo hi",
          cwd: "/tmp",
          timestamp: 0,
          metadata: {},
        },
        tool: { name: "zcode", version: "1.0" },
        cwd: "/tmp",
        state: new Map(),
        results: [],
        startedAt: 0,
      },
      async () => {
        ran.value = true;
      },
    );
    expect(ran.value).toBe(true);
  });

  it("skips malformed matcher groups", () => {
    expect(parseHookGroups({}, "PreToolUse", () => ["shell:before"], "x")).toEqual([]);
    expect(
      parseHookGroups(
        [{ hooks: [{ type: "http", url: "https://x" }] }],
        "PreToolUse",
        () => ["shell:before"],
        "x",
      ),
    ).toEqual([]);
    expect(
      parseHookGroups([{ matcher: "Bash" }], "PreToolUse", () => ["shell:before"], "x"),
    ).toEqual([]);
    expect(parseHookGroups([{ hooks: [{ command: "echo" }] }], "Nope", () => [], "x")).toEqual([]);
  });

  it("builds the remaining lifecycle and tool events", () => {
    expect(buildCompatEvent("SessionStart", { cwd: "/tmp" }, "grok")?.type).toBe("session:start");
    expect(buildCompatEvent("SessionEnd", {}, "grok")?.type).toBe("session:end");
    expect(buildCompatEvent("UserPromptSubmit", { prompt: "hi" }, "grok")?.type).toBe(
      "prompt:submit",
    );
    expect(
      buildCompatEvent("UserPromptSubmit", { tool_input: { prompt: "from-input" } }, "zcode"),
    ).toMatchObject({ type: "prompt:submit", prompt: "from-input" });
    expect(
      buildCompatEvent(
        "PreToolUse",
        { toolName: "run_terminal_command", toolInput: { command: "ls", cwd: "/x" } },
        "grok",
      )?.type,
    ).toBe("shell:before");
    expect(
      buildCompatEvent(
        "PreToolUse",
        { toolName: "MultiEdit", toolInput: { path: "a.ts" } },
        "zcode",
      )?.type,
    ).toBe("file:edit");
    expect(
      buildCompatEvent(
        "PreToolUse",
        { toolName: "delete_file", toolInput: { path: "a.ts" } },
        "grok",
      )?.type,
    ).toBe("file:delete");
    expect(
      buildCompatEvent(
        "PreToolUse",
        { toolName: "ApplyPatch", toolInput: { path: "a.ts" } },
        "zcode",
      )?.type,
    ).toBe("file:edit");
    expect(
      buildCompatEvent("Notification", { notificationType: "idle_prompt" }, "grok")?.type,
    ).toBe("notification");
    expect(
      buildCompatEvent(
        "PermissionRequest",
        { toolName: "Bash", toolInput: { command: "ls" } },
        "zcode",
      )?.type,
    ).toBe("shell:before");
    expect(
      buildCompatEvent("PreToolUse", { toolName: "Delete", toolInput: { path: "a.ts" } }, "zcode")
        ?.type,
    ).toBe("file:delete");
    expect(
      buildCompatEvent(
        "PreToolUse",
        { toolName: "read_file", toolInput: { target_file: "a.ts" } },
        "grok",
      )?.type,
    ).toBe("file:read");
    expect(
      buildCompatEvent(
        "PreToolUse",
        { toolName: "Edit", toolInput: { oldContent: "a", newContent: "b" } },
        "zcode",
      )?.type,
    ).toBe("file:edit");
    expect(buildCompatEvent("PreToolUse", {}, "grok")?.type).toBe("tool:before");
    const mcp = buildCompatEvent(
      "PreToolUse",
      {
        toolName: "CallMcpTool",
        toolInput: { server: "linear", method: "save", params: { id: 1 } },
      },
      "grok",
    );
    expect(mcp?.type).toBe("mcp:before");
    expect(
      buildCompatEvent(
        "PostToolUse",
        {
          toolName: "linear__save_issue",
          toolResult: { server: "linear", method: "save_issue" },
        },
        "grok",
      )?.type,
    ).toBe("mcp:after");
    expect(
      buildCompatEvent(
        "PostToolUse",
        {
          toolName: "run_terminal_cmd",
          toolInput: { command: "ls" },
          tool_response: { exitCode: 1, stdout: "out", stderr: "err" },
        },
        "grok",
      )?.type,
    ).toBe("shell:after");
    expect(
      buildCompatEvent(
        "PostToolUse",
        { toolName: "Bash", toolInput: { command: "ls" }, toolResult: { stdout: "ok" } },
        "zcode",
      )?.type,
    ).toBe("shell:after");
    expect(buildCompatEvent("PostToolUse", { toolName: "__", toolResult: [] }, "grok")?.type).toBe(
      "mcp:after",
    );
    expect(buildCompatEvent("PostToolUse", {}, "zcode")?.type).toBe("tool:after");
    expect(buildCompatEvent("PostToolUseFailure", { toolName: "Read" }, "zcode")?.type).toBe(
      "tool:after",
    );
    expect(buildCompatEvent("Stop", { lastAssistantMessage: "done" }, "zcode")?.type).toBe(
      "prompt:response",
    );
    expect(buildCompatEvent("Stop", {}, "zcode")?.type).toBe("session:end");
    const unnamed = buildCompatEvent("PreToolUse", { toolName: "__" }, "grok");
    expect(unnamed?.type).toBe("mcp:before");
  });
});
