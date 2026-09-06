import { BaseAdapter, registry } from "./index.js";
import type {
  AdapterCapabilities,
  GeneratedConfig,
  HookDefinition,
  HookEventType,
} from "../types/index.js";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const EVENT_MAP: Record<string, string[]> = {
  "session:start": ["SessionStart"],
  "session:end": ["SessionEnd"],
  "prompt:submit": ["UserPromptSubmit"],
  "prompt:response": [],
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

class GrokAdapter extends BaseAdapter {
  readonly id = "grok";
  readonly name = "Grok";
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
    blockableEvents: ["prompt:submit", "tool:before", "shell:before", "mcp:before"],
  };

  async detect(): Promise<boolean> {
    const hasCommand = await this.commandExists("grok");
    const hasDir = existsSync(resolve(process.cwd(), ".grok"));
    return hasCommand || hasDir;
  }

  async generate(hooks: HookDefinition[]): Promise<GeneratedConfig[]> {
    const events = new Set<string>();
    for (const hook of hooks) {
      for (const event of hook.events) {
        for (const native of this.mapEvent(event)) events.add(native);
      }
    }
    const payload: Record<string, unknown> = { hooks: {} };
    const hooksTable = payload.hooks as Record<string, unknown[]>;
    for (const native of events) {
      hooksTable[native] = [
        {
          hooks: [{ type: "command", command: "node .grok/hooks/ai-tools-runner.js" }],
        },
      ];
    }
    return [
      {
        path: ".grok/hooks/ai-tools.json",
        content: `${JSON.stringify(payload, null, 2)}\n`,
        format: "json",
      },
      {
        path: ".grok/hooks/ai-tools-runner.js",
        content:
          "#!/usr/bin/env node\nprocess.stderr.write('ai-tools grok hook runner\\n');\nprocess.exit(0);\n",
        format: "js",
      },
    ];
  }

  mapEvent(event: HookEventType): string[] {
    return EVENT_MAP[event] ?? [];
  }

  mapNativeEvent(nativeEvent: string): HookEventType[] {
    return REVERSE_MAP[nativeEvent] ?? [];
  }

  async uninstall(): Promise<void> {
    await this.removeFile(".grok/hooks/ai-tools.json");
    await this.removeFile(".grok/hooks/ai-tools-runner.js");
  }
}

const adapter = new GrokAdapter();
registry.register(adapter);
export { GrokAdapter };
export default adapter;
