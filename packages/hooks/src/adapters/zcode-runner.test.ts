import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runZcodeHook } from "./zcode-runner.js";
import type { AiHooksConfig, HookDefinition } from "../types/index.js";

const temps: string[] = [];

class NonErrorFailure {
  toString(): string {
    return "non-error";
  }
}

afterEach(async () => {
  await Promise.all(temps.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "zcode-runner-"));
  temps.push(dir);
  return dir;
}

function markerHook(markerPath: string): HookDefinition {
  return {
    id: "write-marker",
    name: "write-marker",
    events: ["shell:before"],
    phase: "before",
    handler: async (ctx, next) => {
      if (ctx.event.type === "shell:before") {
        await writeFile(markerPath, ctx.event.command, "utf-8");
      }
      await next();
    },
  };
}

describe("runZcodeHook", () => {
  it("runs a configured hook that writes a file when ZCode invokes the runner", async () => {
    const dir = await tempDir();
    const marker = join(dir, "ran.txt");
    const config: AiHooksConfig = { hooks: [markerHook(marker)] };

    const code = await runZcodeHook({
      config,
      stdin: JSON.stringify({
        hook_event_name: "PreToolUse",
        tool_name: "Bash",
        tool_input: { command: "echo from-zcode" },
        cwd: dir,
      }),
    });

    expect(code).toBe(0);
    expect(await readFile(marker, "utf-8")).toBe("echo from-zcode");
  });

  it("blocks PreToolUse with exit 2 and stderr, leaving stdout empty", async () => {
    const err: string[] = [];
    const out: string[] = [];
    const config: AiHooksConfig = {
      hooks: [
        {
          id: "block",
          name: "block",
          events: ["shell:before"],
          phase: "before",
          handler: async (ctx, next) => {
            void next;
            ctx.results.push({ blocked: true, reason: "Blocked by policy" });
          },
        },
      ],
    };

    const code = await runZcodeHook({
      config,
      stdin: JSON.stringify({
        hookEventName: "PreToolUse",
        toolName: "Bash",
        toolInput: { command: "rm -rf /" },
      }),
      stdout: { write: (chunk: string) => out.push(chunk) },
      stderr: { write: (chunk: string) => err.push(chunk) },
    });

    expect(code).toBe(2);
    expect(out.join("")).toBe("");
    expect(err.join("")).toBe("Blocked by policy");
  });

  it("fails open on missing config", async () => {
    const err: string[] = [];
    const code = await runZcodeHook({
      cwd: "/tmp/ai-hooks-missing-zcode-config",
      stdin: JSON.stringify({ hookEventName: "SessionStart" }),
      stderr: { write: (chunk: string) => err.push(chunk) },
    });
    expect(code).toBe(0);
    expect(err.join("")).toContain("[ai-hooks] Error:");
  });

  it("loads ai-hooks.config.js when no config is passed", async () => {
    const dir = await tempDir();
    const marker = join(dir, "from-config.txt");
    await writeFile(
      join(dir, "ai-hooks.config.js"),
      `import { writeFile } from "node:fs/promises";
export default {
  hooks: [{
    id: "from-file",
    name: "from-file",
    events: ["session:start"],
    phase: "before",
    handler: async (ctx, next) => {
      await writeFile(${JSON.stringify(marker)}, ctx.event.type, "utf8");
      await next();
    },
  }],
};
`,
      "utf-8",
    );
    const code = await runZcodeHook({
      cwd: dir,
      env: { ...process.env, ZCODE_HOOK_EVENT: "session_start" },
      stdin: "{}",
    });
    expect(code).toBe(0);
    expect(await readFile(marker, "utf-8")).toBe("session:start");
  });

  it("uses the default block reason and ignores unrecognized events", async () => {
    const err: string[] = [];
    const blocked = await runZcodeHook({
      config: {
        hooks: [
          {
            id: "block",
            name: "block",
            events: ["tool:before"],
            phase: "before",
            handler: async (ctx, next) => {
              void next;
              ctx.results.push({ blocked: true });
            },
          },
        ],
      },
      env: { ...process.env, CLAUDE_HOOK_EVENT: "PermissionRequest" },
      stdin: JSON.stringify({ toolName: "Grep", toolInput: { pattern: "x" } }),
      stderr: { write: (chunk: string) => err.push(chunk) },
    });
    expect(blocked).toBe(2);
    expect(err.join("")).toBe("Blocked by ai-hooks");
    expect(
      await runZcodeHook({
        config: { hooks: [] },
        stdin: JSON.stringify({ hookEventName: "Nope" }),
      }),
    ).toBe(0);
  });

  it("fail-opens when a non-Error is thrown", async () => {
    const err: string[] = [];
    const code = await runZcodeHook({
      config: {
        hooks: [
          {
            id: "block",
            name: "block",
            events: ["shell:before"],
            phase: "before",
            handler: async (ctx, next) => {
              void next;
              ctx.results.push({ blocked: true });
            },
          },
        ],
      },
      stdin: JSON.stringify({
        hookEventName: "PreToolUse",
        toolName: "Bash",
        toolInput: { command: "ls" },
      }),
      stderr: {
        write: (chunk: string) => {
          if (chunk.startsWith("[ai-hooks]")) err.push(chunk);
          else throw new NonErrorFailure();
        },
      },
    });
    expect(code).toBe(0);
    expect(err.join("")).toContain("non-error");
  });
});
