import type { UiKit } from "./types.js";

/**
 * Lightweight VNode used by tests. Structurally simpler than @rezi-ui/core's VNode
 * but satisfies the UiKit<MockVNode> contract.
 */
export type MockVNode = {
  type: string;
  content?: string;
  props: Record<string, unknown>;
  children?: MockVNode[];
};

/**
 * Properly typed mock UI kit for unit tests.
 * Each method matches the UiKit<MockVNode> interface without requiring `as any`.
 */
export const mockUi: UiKit<MockVNode> = {
  text: (...args: unknown[]): MockVNode => {
    const content = args[0] as string;
    const props = (args[1] ?? {}) as Record<string, unknown>;
    return { type: "text", content, props };
  },
  box: (...args: unknown[]): MockVNode => {
    const props = (args[0] ?? {}) as Record<string, unknown>;
    const children = (args[1] ?? []) as MockVNode[];
    return { type: "box", props, children };
  },
  column: (...args: unknown[]): MockVNode => {
    const first = args[0];
    const hasProps = !Array.isArray(first);
    const props = hasProps ? ((first ?? {}) as Record<string, unknown>) : {};
    const children = hasProps ? ((args[1] ?? []) as MockVNode[]) : (first as MockVNode[]);
    return { type: "column", props, children };
  },
  row: (...args: unknown[]): MockVNode => {
    const first = args[0];
    const hasProps = !Array.isArray(first);
    const props = hasProps ? ((first ?? {}) as Record<string, unknown>) : {};
    const children = hasProps ? ((args[1] ?? []) as MockVNode[]) : (first as MockVNode[]);
    return { type: "row", props, children };
  },
  divider: (...args: unknown[]): MockVNode => {
    const props = (args[0] ?? {}) as Record<string, unknown>;
    return { type: "divider", props };
  },
  spinner: (...args: unknown[]): MockVNode => {
    const props = (args[0] ?? {}) as Record<string, unknown>;
    return { type: "spinner", props };
  },
  modal: (...args: unknown[]): MockVNode => {
    const propsRaw = (args[0] ?? {}) as Record<string, unknown>;
    const { content, ...rest } = propsRaw;
    return { type: "modal", props: rest, children: content ? [content as MockVNode] : [] };
  },
  richText: (...args: unknown[]): MockVNode => {
    const spans = (args[0] ?? []) as Array<{ text: string }>;
    const props = (args[1] ?? {}) as Record<string, unknown>;
    // Flatten spans into a single content string for test assertions
    return { type: "richText", content: spans.map((s) => s.text).join(""), props };
  },
  badge: (...args: unknown[]): MockVNode => {
    const content = args[0] as string;
    const props = (args[1] ?? {}) as Record<string, unknown>;
    return { type: "badge", content, props };
  },
  progress: (...args: unknown[]): MockVNode => {
    const value = args[0] as number;
    const props = (args[1] ?? {}) as Record<string, unknown>;
    return { type: "progress", props: { value, ...props } };
  },
  tag: (...args: unknown[]): MockVNode => {
    const content = args[0] as string;
    const props = (args[1] ?? {}) as Record<string, unknown>;
    return { type: "tag", content, props };
  },
  gauge: (...args: unknown[]): MockVNode => {
    const value = args[0] as number;
    const props = (args[1] ?? {}) as Record<string, unknown>;
    // Include label as content so allText() can find it
    const content = typeof props.label === "string" ? props.label : undefined;
    return { type: "gauge", content, props: { value, ...props } };
  },
  callout: (...args: unknown[]): MockVNode => {
    const content = args[0] as string;
    const props = (args[1] ?? {}) as Record<string, unknown>;
    return { type: "callout", content, props };
  },
};
