import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { HookContext, HookDefinition, HookEventType } from "../index.js";

vi.mock("./index.js", async () => {
  const { BaseAdapter } = await import("./base.js");
  return { BaseAdapter, registry: { register: vi.fn() } };
});

vi.mock("node:child_process", () => ({
  execFile: vi.fn((_cmd: string, _args: string[], cb: (error: Error | null) => void) => {
    cb(new Error("not found"));
  }),
}));

import { execFile } from "node:child_process";
import { GrokAdapter } from "./grok.js";

function makeHandler() {
  return async (ctx: HookContext, next: () => Promise<void>) => {
    void ctx;
    await next();
  };
}

const shellHook: HookDefinition = {
  id: "audit",
  name: "audit",
  events: ["shell:before" as HookEventType],
  phase: "before",
  handler: makeHandler(),
};

describe("GrokAdapter", () => {
  let adapter: GrokAdapter;
  let tmp: string;
  let previousCwd: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    adapter = new GrokAdapter();
    tmp = await mkdtemp(join(tmpdir(), "grok-hooks-"));
    previousCwd = process.cwd();
    process.chdir(tmp);
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    await rm(tmp, { recursive: true, force: true });
  });

  it("uses Grok identity and Claude-compatible events", () => {
    expect(adapter.id).toBe("grok");
    expect(adapter.name).toBe("Grok");
    expect(adapter.mapEvent("tool:before")).toEqual(["PreToolUse"]);
    expect(adapter.mapEvent("session:end")).toEqual(["SessionEnd"]);
    expect(adapter.mapNativeEvent("SessionStart")).toEqual(["session:start"]);
  });

  it("writes .grok/hooks JSON Grok actually loads plus a HookEngine runner", async () => {
    const files = await adapter.generate([shellHook]);
    await adapter.install(files);

    expect(files.map((file) => file.path)).toEqual([
      ".grok/hooks/ai-tools.json",
      ".grok/hooks/ai-tools-runner.js",
    ]);

    const jsonPath = join(tmp, ".grok/hooks/ai-tools.json");
    const runnerPath = join(tmp, ".grok/hooks/ai-tools-runner.js");
    expect(existsSync(jsonPath)).toBe(true);
    expect(existsSync(runnerPath)).toBe(true);

    expect(JSON.parse(await readFile(jsonPath, "utf-8"))).toEqual({
      hooks: {
        PreToolUse: [
          {
            hooks: [{ type: "command", command: "node ai-tools-runner.js", timeout: 10 }],
          },
        ],
      },
    });

    const runner = await readFile(runnerPath, "utf-8");
    expect(runner.startsWith("#!/usr/bin/env node\n")).toBe(true);
    expect(runner).toContain('import { runGrokHook } from "@itz4blitz/ai-tools-hooks"');
    expect(runner).toContain("process.exit(await runGrokHook())");
    expect(runner).not.toContain("process.stderr.write('ai-tools grok hook runner");
    expect(runner).not.toMatch(/process\.exit\(0\);\s*$/);
  });

  it("maps multiple universal events onto Grok native names without duplicates", async () => {
    const files = await adapter.generate([
      {
        id: "multi",
        name: "multi",
        events: ["session:start", "shell:before", "file:write", "notification"],
        phase: "before",
        handler: makeHandler(),
      },
    ]);
    const json = JSON.parse(files[0]!.content) as { hooks: Record<string, unknown[]> };
    expect(Object.keys(json.hooks).toSorted()).toEqual([
      "Notification",
      "PreToolUse",
      "SessionStart",
    ]);
    expect(json.hooks.PreToolUse).toHaveLength(1);
  });

  it("detects a .grok directory even without the grok binary", async () => {
    expect(await adapter.detect()).toBe(false);
    await mkdir(join(tmp, ".grok"));
    expect(await adapter.detect()).toBe(true);
  });

  it("detects the grok command when present", async () => {
    vi.mocked(execFile).mockImplementation(((_cmd, _args, cb) => {
      (cb as (error: Error | null) => void)(null);
    }) as typeof execFile);
    expect(await adapter.detect()).toBe(true);
  });

  it("imports command hooks from .grok/hooks/*.json", async () => {
    await mkdir(join(tmp, ".grok/hooks"), { recursive: true });
    await writeFile(
      join(tmp, ".grok/hooks/dcg.json"),
      `${JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              matcher: "Bash",
              hooks: [{ type: "command", command: "/usr/bin/dcg", timeout: 5 }],
            },
          ],
        },
      })}\n`,
      "utf-8",
    );
    const imported = await adapter.import(tmp);
    expect(imported).toHaveLength(1);
    expect(imported[0]?.id).toBe("grok-PreToolUse-0-0");
    expect(imported[0]?.name).toBe("/usr/bin/dcg");
    expect(imported[0]?.events).toContain("shell:before");
    expect(imported[0]?.phase).toBe("before");
  });

  it("skips invalid JSON while importing Grok hooks", async () => {
    await mkdir(join(tmp, ".grok/hooks"), { recursive: true });
    await writeFile(join(tmp, ".grok/hooks/broken.json"), "{not json", "utf-8");
    await writeFile(join(tmp, ".grok/hooks/notes.txt"), "ignore me", "utf-8");
    await writeFile(join(tmp, ".grok/hooks/empty.json"), "{}\n", "utf-8");
    expect(await adapter.import(tmp)).toEqual([]);
  });

  it("imports from process.cwd when no directory is passed", async () => {
    expect(await adapter.import()).toEqual([]);
    expect(adapter.mapEvent("unknown:event" as HookEventType)).toEqual([]);
    expect(adapter.mapNativeEvent("NotAThing")).toEqual([]);
  });

  it("uninstalls generated hook files from the project", async () => {
    await adapter.install(await adapter.generate([shellHook]));
    expect(existsSync(join(tmp, ".grok/hooks/ai-tools.json"))).toBe(true);
    await adapter.uninstall();
    expect(existsSync(join(tmp, ".grok/hooks/ai-tools.json"))).toBe(false);
    expect(existsSync(join(tmp, ".grok/hooks/ai-tools-runner.js"))).toBe(false);
  });
});
