/**
 * Universal event types that map across all AI coding tools.
 *
 * Each tool adapter translates these universal events to/from
 * the tool's native event system.
 */

// ── Lifecycle Events ──────────────────────────────────────────

export type SessionStartEvent = {
  type: "session:start";
  tool: string;
  version: string;
  workingDirectory: string;
  timestamp: number;
  metadata: Record<string, unknown>;
};

export type SessionEndEvent = {
  type: "session:end";
  tool: string;
  duration: number;
  timestamp: number;
  metadata: Record<string, unknown>;
};

// ── User Input Events ─────────────────────────────────────────

export type PromptSubmitEvent = {
  type: "prompt:submit";
  prompt: string;
  timestamp: number;
  metadata: Record<string, unknown>;
};

export type PromptResponseEvent = {
  type: "prompt:response";
  response: string;
  model: string;
  tokens: { input: number; output: number };
  timestamp: number;
  metadata: Record<string, unknown>;
};

// ── Tool Use Events ───────────────────────────────────────────

export type ToolCallEvent = {
  type: "tool:before";
  toolName: string;
  input: Record<string, unknown>;
  timestamp: number;
  metadata: Record<string, unknown>;
};

export type ToolResultEvent = {
  type: "tool:after";
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  duration: number;
  timestamp: number;
  metadata: Record<string, unknown>;
};

// ── File Operation Events ─────────────────────────────────────

export type FileReadEvent = {
  type: "file:read";
  path: string;
  timestamp: number;
  metadata: Record<string, unknown>;
};

export type FileWriteEvent = {
  type: "file:write";
  path: string;
  content: string;
  timestamp: number;
  metadata: Record<string, unknown>;
};

export type FileEditEvent = {
  type: "file:edit";
  path: string;
  oldContent: string;
  newContent: string;
  timestamp: number;
  metadata: Record<string, unknown>;
};

export type FileDeleteEvent = {
  type: "file:delete";
  path: string;
  timestamp: number;
  metadata: Record<string, unknown>;
};

// ── Shell / Command Events ────────────────────────────────────

export type ShellBeforeEvent = {
  type: "shell:before";
  command: string;
  cwd: string;
  timestamp: number;
  metadata: Record<string, unknown>;
};

export type ShellAfterEvent = {
  type: "shell:after";
  command: string;
  cwd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  timestamp: number;
  metadata: Record<string, unknown>;
};

// ── MCP Events ────────────────────────────────────────────────

export type McpCallEvent = {
  type: "mcp:before";
  server: string;
  method: string;
  params: Record<string, unknown>;
  timestamp: number;
  metadata: Record<string, unknown>;
};

export type McpResultEvent = {
  type: "mcp:after";
  server: string;
  method: string;
  params: Record<string, unknown>;
  result: unknown;
  duration: number;
  timestamp: number;
  metadata: Record<string, unknown>;
};

// ── Notification Events ───────────────────────────────────────

export type NotificationEvent = {
  type: "notification";
  level: "info" | "warn" | "error";
  message: string;
  timestamp: number;
  metadata: Record<string, unknown>;
};

// ── Union Types ───────────────────────────────────────────────

export type BeforeEvent =
  | SessionStartEvent
  | PromptSubmitEvent
  | ToolCallEvent
  | FileWriteEvent
  | FileEditEvent
  | FileDeleteEvent
  | ShellBeforeEvent
  | McpCallEvent;

export type AfterEvent =
  | SessionEndEvent
  | PromptResponseEvent
  | ToolResultEvent
  | FileReadEvent
  | ShellAfterEvent
  | McpResultEvent
  | NotificationEvent;

export type HookEvent = BeforeEvent | AfterEvent;

export type HookEventType = HookEvent["type"];

/**
 * Extract the event shape for a given event type string.
 */
export type EventOf<T extends HookEventType> = Extract<HookEvent, { type: T }>;
