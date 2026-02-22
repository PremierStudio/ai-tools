export type ToolStatus = "available" | "running" | "stopped" | "not-installed";

export type ToolInfo = {
  id: string;
  name: string;
  command: string;
  status: ToolStatus;
  sessionCount: number;
};

export type PaneState = {
  toolId: string;
  active: boolean;
  pid?: number;
};

export type AppState = {
  mode: "canonical" | "direct" | "unknown";
  tools: ToolInfo[];
  panes: PaneState[];
  activePaneIndex: number;
  sessionCount: number;
  configHealth: "healthy" | "stale" | "error";
};

export type AppView = "tools" | "sessions" | "handoff" | "config" | "terminal";

export type InputMode = "terminal" | "command" | "dashboard";

/** A single styled text span used in richText(). */
export type RichSpan = {
  text: string;
  style?: Record<string, unknown>;
};

/**
 * Generic UI kit interface used by view render functions.
 * Generic over the return type T so tests can supply lightweight mock VNodes
 * while production code uses VNode from @rezi-ui/core.
 *
 * Declared as an interface with method syntax so that TypeScript uses bivariant
 * parameter checking, allowing both Rezi's overloaded ui methods and the test
 * mock (which uses rest params) to satisfy this contract.
 */
export interface UiKit<T> {
  text(content: string, props?: Record<string, unknown>): T;
  box(props: Record<string, unknown>, children: readonly T[]): T;
  column(props: Record<string, unknown>, children: readonly T[]): T;
  row(props: Record<string, unknown>, children: readonly T[]): T;
  divider(props?: Record<string, unknown>): T;
  spinner(props?: Record<string, unknown>): T;
  /**
   * Centered modal overlay with optional dimmed backdrop.
   * Matches Rezi's ui.modal(props) signature where content is a prop, not children.
   */
  modal(props: Record<string, unknown> & { content: T }): T;
  /** Multiple styled text spans on one line. */
  richText(spans: readonly RichSpan[], props?: Record<string, unknown>): T;
  /** Inline badge with semantic variant colouring. */
  badge(text: string, props?: Record<string, unknown>): T;
  /** Horizontal progress bar, value 0–1. */
  progress(value: number, props?: Record<string, unknown>): T;
  /** Inline coloured tag/chip. */
  tag(text: string, props?: Record<string, unknown>): T;
  /** Compact inline gauge with optional label. */
  gauge(value: number, props?: Record<string, unknown>): T;
  /** Callout/alert box with variant colouring. */
  callout(message: string, props?: Record<string, unknown>): T;
}
