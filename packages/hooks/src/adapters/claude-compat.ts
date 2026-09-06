import type { HookDefinition, HookEvent, HookEventType } from "../types/index.js";

export type CompatPayload = {
  hookEventName?: string;
  hook_event_name?: string;
  toolName?: string;
  tool_name?: string;
  toolInput?: Record<string, unknown>;
  tool_input?: Record<string, unknown>;
  toolResult?: unknown;
  tool_response?: unknown;
  cwd?: string;
  workspaceRoot?: string;
  prompt?: string;
  timestamp?: string | number;
  [key: string]: unknown;
};

export type NativeCommandHook = {
  type?: string;
  command?: string;
  url?: string;
  timeout?: number;
  statusMessage?: string;
};

export type NativeHookGroup = {
  matcher?: string;
  hooks?: NativeCommandHook[];
};

export function collectNativeEvents(
  hooks: HookDefinition[],
  mapEvent: (event: HookEventType) => string[],
): string[] {
  const events = new Set<string>();
  for (const hook of hooks) {
    for (const event of hook.events) {
      for (const native of mapEvent(event)) events.add(native);
    }
  }
  return [...events].toSorted();
}

export function normalizeNativeEvent(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.includes("_")) {
    return trimmed
      .split("_")
      .filter((part) => part.length > 0)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join("");
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function payloadEventName(payload: CompatPayload, envEvent?: string): string {
  const raw =
    (typeof payload.hookEventName === "string" && payload.hookEventName) ||
    (typeof payload.hook_event_name === "string" && payload.hook_event_name) ||
    envEvent ||
    "";
  return normalizeNativeEvent(raw);
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function stringField(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function payloadTimestamp(payload: CompatPayload): number {
  if (typeof payload.timestamp === "number" && Number.isFinite(payload.timestamp)) {
    return payload.timestamp;
  }
  if (typeof payload.timestamp === "string") {
    const parsed = Date.parse(payload.timestamp);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
}

export function payloadToolName(payload: CompatPayload): string {
  return stringField(payload.toolName) || stringField(payload.tool_name);
}

export function payloadToolInput(payload: CompatPayload): Record<string, unknown> {
  if (payload.toolInput !== undefined) return asRecord(payload.toolInput);
  if (payload.tool_input !== undefined) return asRecord(payload.tool_input);
  return {};
}

export function payloadCwd(payload: CompatPayload): string {
  return stringField(payload.cwd) || stringField(payload.workspaceRoot) || process.cwd();
}

export function isMcpToolName(toolName: string): boolean {
  return toolName.includes("__") || toolName === "CallMcpTool" || toolName === "use_tool";
}

export function buildCompatEvent(
  nativeEvent: string,
  payload: CompatPayload,
  tool: string,
): HookEvent | null {
  const timestamp = payloadTimestamp(payload);
  const metadata: Record<string, unknown> = { nativeEvent, payload };
  const cwd = payloadCwd(payload);
  const toolName = payloadToolName(payload);
  const toolInput = payloadToolInput(payload);
  const toolResult = payload.toolResult ?? payload.tool_response ?? {};

  switch (nativeEvent) {
    case "SessionStart":
      return {
        type: "session:start",
        tool,
        version: "1.0",
        workingDirectory: cwd,
        timestamp,
        metadata,
      };
    case "SessionEnd":
      return {
        type: "session:end",
        tool,
        duration: 0,
        timestamp,
        metadata,
      };
    case "UserPromptSubmit":
      return {
        type: "prompt:submit",
        prompt: stringField(payload.prompt) || stringField(toolInput.prompt),
        timestamp,
        metadata,
      };
    case "Notification":
      return {
        type: "notification",
        level: "info",
        message: stringField(payload.message) || stringField(payload.notificationType),
        timestamp,
        metadata,
      };
    case "PreToolUse":
    case "PermissionRequest":
      return resolvePreToolUse(toolName, toolInput, cwd, timestamp, metadata);
    case "PostToolUse":
    case "PostToolUseFailure":
      return resolvePostToolUse(toolName, toolInput, toolResult, cwd, timestamp, metadata);
    case "Stop":
      if (typeof payload.lastAssistantMessage === "string" && payload.lastAssistantMessage) {
        return {
          type: "prompt:response",
          response: payload.lastAssistantMessage,
          model: tool,
          tokens: { input: 0, output: 0 },
          timestamp,
          metadata,
        };
      }
      return {
        type: "session:end",
        tool,
        duration: 0,
        timestamp,
        metadata,
      };
    default:
      return null;
  }
}

export function isBlockingNativeEvent(nativeEvent: string): boolean {
  return (
    nativeEvent === "PreToolUse" ||
    nativeEvent === "UserPromptSubmit" ||
    nativeEvent === "PermissionRequest"
  );
}

export function phaseForNativeEvent(nativeEvent: string): "before" | "after" {
  if (
    nativeEvent === "PreToolUse" ||
    nativeEvent === "UserPromptSubmit" ||
    nativeEvent === "PermissionRequest" ||
    nativeEvent === "SessionStart"
  ) {
    return "before";
  }
  return "after";
}

export function parseHookGroups(
  groups: unknown,
  nativeEvent: string,
  mapNativeEvent: (native: string) => HookEventType[],
  source: string,
): HookDefinition[] {
  if (!Array.isArray(groups)) return [];
  const events = mapNativeEvent(nativeEvent);
  if (events.length === 0) return [];
  const phase = phaseForNativeEvent(nativeEvent);
  const definitions: HookDefinition[] = [];

  groups.forEach((group, groupIndex) => {
    const typed = asRecord(group);
    const hooks = typed.hooks;
    if (!Array.isArray(hooks)) return;
    hooks.forEach((hook, hookIndex) => {
      const commandHook = asRecord(hook);
      const command = stringField(commandHook.command);
      if (!command) return;
      definitions.push({
        id: `${source}-${nativeEvent}-${groupIndex}-${hookIndex}`,
        name: command,
        description: stringField(commandHook.statusMessage) || `${source} ${nativeEvent}`,
        events,
        phase,
        handler: async (_ctx, next) => {
          await next();
        },
      });
    });
  });

  return definitions;
}

function resolvePreToolUse(
  toolName: string,
  toolInput: Record<string, unknown>,
  cwd: string,
  timestamp: number,
  metadata: Record<string, unknown>,
): HookEvent {
  if (isMcpToolName(toolName)) {
    const parts = toolName.split("__");
    return {
      type: "mcp:before",
      server: stringField(toolInput.server) || parts[0] || "unknown",
      method: stringField(toolInput.method) || parts[1] || toolName,
      params: toolInput.params !== undefined ? asRecord(toolInput.params) : toolInput,
      timestamp,
      metadata,
    };
  }

  switch (toolName) {
    case "Bash":
    case "run_terminal_command":
    case "run_terminal_cmd":
      return {
        type: "shell:before",
        command: stringField(toolInput.command),
        cwd: stringField(toolInput.cwd, cwd),
        timestamp,
        metadata,
      };
    case "Write":
      return {
        type: "file:write",
        path: filePathFrom(toolInput),
        content: stringField(toolInput.content),
        timestamp,
        metadata,
      };
    case "Edit":
    case "MultiEdit":
    case "search_replace":
    case "ApplyPatch":
      return {
        type: "file:edit",
        path: filePathFrom(toolInput),
        oldContent: stringField(toolInput.old_string) || stringField(toolInput.oldContent),
        newContent: stringField(toolInput.new_string) || stringField(toolInput.newContent),
        timestamp,
        metadata,
      };
    case "Delete":
    case "delete_file":
      return {
        type: "file:delete",
        path: filePathFrom(toolInput),
        timestamp,
        metadata,
      };
    case "Read":
    case "read_file":
      return {
        type: "file:read",
        path: filePathFrom(toolInput),
        timestamp,
        metadata,
      };
    default:
      return {
        type: "tool:before",
        toolName: toolName || "unknown",
        input: toolInput,
        timestamp,
        metadata,
      };
  }
}

function resolvePostToolUse(
  toolName: string,
  toolInput: Record<string, unknown>,
  toolResult: unknown,
  cwd: string,
  timestamp: number,
  metadata: Record<string, unknown>,
): HookEvent {
  if (isMcpToolName(toolName)) {
    const parts = toolName.split("__");
    return {
      type: "mcp:after",
      server: stringField(asRecord(toolResult).server) || parts[0] || "unknown",
      method: stringField(asRecord(toolResult).method) || parts[1] || toolName,
      params: toolInput,
      result: toolResult,
      duration: 0,
      timestamp,
      metadata,
    };
  }

  if (
    toolName === "Bash" ||
    toolName === "run_terminal_command" ||
    toolName === "run_terminal_cmd"
  ) {
    const result = asRecord(toolResult);
    return {
      type: "shell:after",
      command: stringField(toolInput.command),
      cwd: stringField(toolInput.cwd, cwd),
      exitCode: typeof result.exitCode === "number" ? result.exitCode : 0,
      stdout: stringField(result.stdout),
      stderr: stringField(result.stderr),
      duration: 0,
      timestamp,
      metadata,
    };
  }

  return {
    type: "tool:after",
    toolName: toolName || "unknown",
    input: toolInput,
    output: toolResult,
    duration: 0,
    timestamp,
    metadata,
  };
}

function filePathFrom(toolInput: Record<string, unknown>): string {
  return (
    stringField(toolInput.file_path) ||
    stringField(toolInput.path) ||
    stringField(toolInput.target_file)
  );
}
