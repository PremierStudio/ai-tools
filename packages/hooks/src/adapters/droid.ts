import { BaseAdapter, registry } from "./index.js";
import type {
  AdapterCapabilities,
  GeneratedConfig,
  HookDefinition,
  HookEventType,
} from "../types/index.js";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";

/**
 * Event mapping: ai-hooks universal events -> Factory Droid native hooks.
 *
 * Droid supports nine hook events:
 *   PreToolUse, PostToolUse, UserPromptSubmit, Notification,
 *   Stop, SubagentStop, PreCompact, SessionStart, SessionEnd
 *
 * Hook input is JSON via STDIN with tool_name, tool_input, etc.
 * Exit code 2 blocks on PreToolUse; STDERR is sent to Droid.
 *
 * Reference: https://docs.factory.ai/reference/hooks-reference
 */
const EVENT_MAP: Record<string, string[]> = {
  "session:start": ["SessionStart"],
  "session:end": ["SessionEnd"],
  "prompt:submit": ["UserPromptSubmit"],
  "prompt:response": ["Stop"],
  "tool:before": ["PreToolUse"],
  "tool:after": ["PostToolUse"],
  "file:read": ["PreToolUse"],
  "file:write": ["PreToolUse"],
  "file:edit": ["PreToolUse"],
  "file:delete": ["PreToolUse"],
  "shell:before": ["PreToolUse"],
  "shell:after": ["PostToolUse"],
  "mcp:before": ["PreToolUse"],
  "mcp:after": ["PostToolUse"],
  notification: ["Notification"],
};

const REVERSE_MAP: Record<string, HookEventType[]> = {
  SessionStart: ["session:start"],
  SessionEnd: ["session:end"],
  UserPromptSubmit: ["prompt:submit"],
  Stop: ["prompt:response"],
  PreToolUse: [
    "tool:before",
    "file:read",
    "file:write",
    "file:edit",
    "file:delete",
    "shell:before",
    "mcp:before",
  ],
  PostToolUse: ["tool:after", "shell:after", "mcp:after"],
  Notification: ["notification"],
};

/**
 * Factory Droid adapter for ai-hooks.
 *
 * Generates `.factory/settings.json` hook entries and a runner script.
 * Droid uses a settings.json format very similar to Claude Code, with
 * hooks keyed by event name containing matcher patterns and commands.
 *
 * Hook scripts receive JSON via STDIN with session_id, cwd, tool_name,
 * tool_input, and hook_event_name. Exit code 2 blocks PreToolUse hooks
 * and STDERR is processed by Droid as feedback.
 *
 * Reference: https://docs.factory.ai/cli/configuration/hooks-guide
 */
class DroidAdapter extends BaseAdapter {
  readonly id = "droid";
  readonly name = "Factory Droid";
  readonly version = "1.0";

  readonly capabilities: AdapterCapabilities = {
    beforeHooks: true,
    afterHooks: true,
    mcp: true,
    configFile: true,
    supportedEvents: [
      "session:start",
      "session:end",
      "prompt:submit",
      "prompt:response",
      "tool:before",
      "tool:after",
      "file:read",
      "file:write",
      "file:edit",
      "file:delete",
      "shell:before",
      "shell:after",
      "mcp:before",
      "mcp:after",
      "notification",
    ],
    blockableEvents: [
      "tool:before",
      "file:read",
      "file:write",
      "file:edit",
      "file:delete",
      "shell:before",
      "mcp:before",
    ],
  };

  async detect(): Promise<boolean> {
    const hasCommand = await this.commandExists("droid");
    const hasDir = existsSync(resolve(process.cwd(), ".factory"));
    return hasCommand || hasDir;
  }

  async generate(hooks: HookDefinition[]): Promise<GeneratedConfig[]> {
    const configs: GeneratedConfig[] = [];

    // Collect needed native events
    const neededEvents = new Set<string>();
    for (const hook of hooks) {
      for (const event of hook.events) {
        const nativeEvents = this.mapEvent(event);
        for (const ne of nativeEvents) {
          neededEvents.add(ne);
        }
      }
    }

    // Generate the runner script
    configs.push({
      path: ".factory/hooks/ai-hooks-runner.js",
      content: this.generateRunner(),
      format: "js",
    });

    // Build Droid settings hooks config
    const hooksConfig: Record<string, unknown[]> = {};
    const runnerAbsPath = resolve(process.cwd(), ".factory/hooks/ai-hooks-runner.js");

    for (const event of neededEvents) {
      const hookEntry: Record<string, unknown> = {
        hooks: [
          {
            type: "command",
            command: `node ${runnerAbsPath}`,
            timeout: 30,
          },
        ],
      };

      // Tool-related events support matchers
      if (event === "PreToolUse" || event === "PostToolUse") {
        hookEntry.matcher = "*";
      }

      if (!hooksConfig[event]) {
        hooksConfig[event] = [];
      }
      hooksConfig[event].push(hookEntry);
    }

    // Merge with existing settings if present
    const settingsConfig = await this.mergeSettings(hooksConfig);

    configs.push({
      path: ".factory/settings.json",
      content: JSON.stringify(settingsConfig, null, 2) + "\n",
      format: "json",
    });

    return configs;
  }

  mapEvent(event: HookEventType): string[] {
    return EVENT_MAP[event] ?? [];
  }

  mapNativeEvent(nativeEvent: string): HookEventType[] {
    return REVERSE_MAP[nativeEvent] ?? [];
  }

  async uninstall(): Promise<void> {
    await this.removeFile(".factory/hooks/ai-hooks-runner.js");
  }

  private async mergeSettings(
    hooksConfig: Record<string, unknown[]>,
  ): Promise<Record<string, unknown>> {
    const settingsPath = resolve(process.cwd(), ".factory/settings.json");
    let existing: Record<string, unknown> = {};

    if (existsSync(settingsPath)) {
      const raw = await readFile(settingsPath, "utf-8");
      existing = JSON.parse(raw);
    }

    // Merge hooks: preserve non-ai-hooks entries
    const existingHooks = (existing.hooks ?? {}) as Record<string, unknown[]>;
    const mergedHooks: Record<string, unknown[]> = { ...existingHooks };

    for (const [event, entries] of Object.entries(hooksConfig)) {
      if (!mergedHooks[event]) {
        mergedHooks[event] = [];
      }
      // Remove old ai-hooks entries (identified by runner path)
      mergedHooks[event] = (
        mergedHooks[event] as Array<{
          hooks?: Array<{ command?: string }>;
        }>
      ).filter((entry) => !entry.hooks?.some((h) => h.command?.includes("ai-hooks-runner")));
      mergedHooks[event].push(...entries);
    }

    return {
      ...existing,
      hooks: mergedHooks,
    };
  }

  private generateRunner(): string {
    return `#!/usr/bin/env node
/**
 * ai-hooks runner for Factory Droid.
 * Generated by: ai-hooks generate
 *
 * Droid passes hook event data as JSON via STDIN with:
 *   hook_event_name, session_id, cwd, tool_name, tool_input, tool_response
 *
 * Exit code 0 = success, exit code 2 = block (PreToolUse).
 * STDERR on exit code 2 is fed back to Droid as context.
 *
 * DO NOT EDIT - regenerate with: ai-hooks generate
 */
import { loadConfig, HookEngine } from "@premierstudio/ai-hooks";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function run() {
  const raw = await readStdin();
  const input = JSON.parse(raw || "{}");
  const hookEventName = input.hook_event_name ?? "";
  const toolName = input.tool_name ?? "";
  const toolInput = input.tool_input ?? {};
  const toolResponse = input.tool_response ?? {};

  const config = await loadConfig();
  const engine = new HookEngine(config);
  const toolInfo = { name: "droid", version: "1.0" };
  const timestamp = Date.now();
  const metadata = { sessionId: input.session_id ?? "" };

  let event;
  switch (hookEventName) {
    case "SessionStart":
      event = {
        type: "session:start",
        tool: "droid",
        version: "1.0",
        workingDirectory: input.cwd ?? process.cwd(),
        timestamp,
        metadata,
      };
      break;
    case "SessionEnd":
      event = { type: "session:end", tool: "droid", duration: 0, timestamp, metadata };
      break;
    case "UserPromptSubmit":
      event = { type: "prompt:submit", prompt: toolInput.prompt ?? "", timestamp, metadata };
      break;
    case "Notification":
      event = { type: "notification", level: "info", message: toolInput.message ?? "", timestamp, metadata };
      break;
    case "Stop":
      event = { type: "session:end", tool: "droid", duration: 0, timestamp, metadata };
      break;
    case "PreToolUse":
      event = resolvePreToolEvent(toolName, toolInput, timestamp, metadata);
      break;
    case "PostToolUse":
      event = resolvePostToolEvent(toolName, toolInput, toolResponse, timestamp, metadata);
      break;
    default:
      process.exit(0);
  }

  const results = await engine.emit(event, toolInfo);
  const blocked = results.find((r) => r.blocked);

  if (blocked) {
    process.stderr.write(blocked.reason ?? "Blocked by ai-hooks");
    process.exit(2);
  }
}

function resolvePreToolEvent(toolName, toolInput, timestamp, metadata) {
  switch (toolName) {
    case "Write":
      return { type: "file:write", path: toolInput.file_path ?? "", content: toolInput.content ?? "", timestamp, metadata };
    case "Edit":
      return { type: "file:edit", path: toolInput.file_path ?? "", oldContent: toolInput.old_string ?? "", newContent: toolInput.new_string ?? "", timestamp, metadata };
    case "Read":
      return { type: "file:read", path: toolInput.file_path ?? "", timestamp, metadata };
    case "Bash":
      return { type: "shell:before", command: toolInput.command ?? "", cwd: process.cwd(), timestamp, metadata };
    default:
      return { type: "tool:before", toolName: toolName || "unknown", input: toolInput, timestamp, metadata };
  }
}

function resolvePostToolEvent(toolName, toolInput, toolResponse, timestamp, metadata) {
  switch (toolName) {
    case "Bash":
      return {
        type: "shell:after",
        command: toolInput.command ?? "",
        cwd: process.cwd(),
        exitCode: toolResponse.exitCode ?? 0,
        stdout: toolResponse.stdout ?? "",
        stderr: toolResponse.stderr ?? "",
        duration: 0,
        timestamp,
        metadata,
      };
    default:
      return { type: "tool:after", toolName: toolName || "unknown", input: toolInput, output: toolResponse, duration: 0, timestamp, metadata };
  }
}

run().catch((err) => {
  console.error("[ai-hooks] Error:", err.message);
  process.exit(1);
});
`;
  }
}

// Auto-register
const adapter = new DroidAdapter();
registry.register(adapter);

export { DroidAdapter };
export default adapter;
