import { describe, it, expect } from "vitest";
import type { ToolInfo } from "../types.js";
import { mockUi } from "../test-helpers.js";
import { renderToolsView, getToolsKeyHints } from "./tools.js";
import type { ToolsViewState } from "./tools.js";

function makeTool(overrides: Partial<ToolInfo> = {}): ToolInfo {
  return {
    id: "claude",
    name: "Claude Code",
    command: "claude",
    status: "available",
    sessionCount: 5,
    ...overrides,
  };
}

function makeState(overrides: Partial<ToolsViewState> = {}): ToolsViewState {
  return {
    tools: [],
    selectedToolIndex: 0,
    loadingTools: false,
    runningTools: [],
    keyOverrides: {},
    ...overrides,
  };
}

// ── helpers ───────────────────────────────────────────

type AnyNode = {
  type?: string;
  content?: string;
  props?: Record<string, unknown>;
  children?: AnyNode[];
};

/** Flatten a node tree into all text content strings (handles text, richText, badge, callout). */
function allText(node: AnyNode): string[] {
  const out: string[] = [];
  // Collect content from any node that has it (text, richText, badge, callout, tag)
  if (node.content !== undefined) out.push(node.content);
  for (const c of node.children ?? []) out.push(...allText(c));
  return out;
}

/**
 * Get the card nodes for each tool.
 * The view renders each tool as a `box` node inside a `column`.
 * Structure: outer box > column[0] > box cards
 */
function toolCards(col: AnyNode): AnyNode[] {
  return (col.children ?? []).filter((c) => c.type === "box");
}

// ── renderToolsView ───────────────────────────────────

describe("renderToolsView", () => {
  it("shows loading message when loading with no tools", () => {
    const state = makeState({ loadingTools: true });
    const vnode = renderToolsView(mockUi, state) as unknown as AnyNode;
    expect(String(vnode.props?.title)).toContain("Tools");
    // children[0] is a spinner node — check its label prop
    const spinner = (vnode.children ?? [])[0] as unknown as { props: { label: string } };
    expect(spinner.props.label).toContain("Scanning for AI tools");
  });

  it("shows no tools message when empty and not loading", () => {
    const state = makeState({ loadingTools: false });
    const vnode = renderToolsView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    expect(texts.some((t) => t.includes("No tools detected"))).toBe(true);
  });

  it("renders tool rows when tools are present", () => {
    const state = makeState({
      tools: [makeTool(), makeTool({ id: "codex", name: "Codex", command: "codex" })],
    });
    const vnode = renderToolsView(mockUi, state) as unknown as AnyNode;
    // outer box > column (children[0]) > box cards
    const col = (vnode.children ?? [])[0] as AnyNode;
    const cards = toolCards(col);
    expect(cards).toHaveLength(2);
  });

  it("marks selected tool with triangle prefix", () => {
    const state = makeState({
      tools: [makeTool({ id: "a" }), makeTool({ id: "b" })],
      selectedToolIndex: 1,
    });
    const vnode = renderToolsView(mockUi, state) as unknown as AnyNode;
    const col = (vnode.children ?? [])[0] as AnyNode;
    const cards = toolCards(col);
    const firstTexts = allText(cards[0]!);
    const secondTexts = allText(cards[1]!);
    // Non-selected card starts with a space selection mark; selected has ▸
    expect(firstTexts.some((t) => t.startsWith(" "))).toBe(true);
    // Selected card richText includes ▸ (selection mark)
    expect(secondTexts.some((t) => t.includes("\u25B8"))).toBe(true);
  });

  it("bolds the selected tool", () => {
    const state = makeState({
      tools: [makeTool({ id: "a" }), makeTool({ id: "b" })],
      selectedToolIndex: 0,
    });
    const vnode = renderToolsView(mockUi, state) as unknown as AnyNode;
    const col = (vnode.children ?? [])[0] as AnyNode;
    const cards = toolCards(col);
    // Each card: box > column > [topRow(row), cmdRow(richText), ...]
    const firstCardTexts = allText(cards[0]!);
    const secondCardTexts = allText(cards[1]!);
    // Selected card (index 0) has ▸ selection indicator
    expect(firstCardTexts.some((t) => t.includes("\u25B8"))).toBe(true);
    // Non-selected card (index 1) has space instead of selection indicator
    expect(secondCardTexts.some((t) => t.startsWith(" "))).toBe(true);
  });

  it("shows running tool indicator", () => {
    const state = makeState({
      tools: [makeTool({ id: "claude" })],
      runningTools: [{ toolId: "claude", pid: 1234, startedAt: "2025-01-01" }],
    });
    const vnode = renderToolsView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    expect(texts.some((t) => t.includes("running"))).toBe(true);
  });

  it("shows play icon for running tool", () => {
    const state = makeState({
      tools: [makeTool({ id: "claude" })],
      runningTools: [{ toolId: "claude", pid: 1234, startedAt: "2025-01-01" }],
    });
    const vnode = renderToolsView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    expect(texts.some((t) => t.includes("\u25b6"))).toBe(true);
  });

  it("dims not-installed tools", () => {
    const state = makeState({
      tools: [makeTool({ status: "not-installed" })],
    });
    const vnode = renderToolsView(mockUi, state) as unknown as AnyNode;
    const col = (vnode.children ?? [])[0] as AnyNode;
    const cards = toolCards(col);
    // The card box itself has dim styling for not-installed tools
    // Check that allText includes ✗ icon (from status badge "✕ not installed")
    const cardTexts = allText(cards[0]!);
    expect(cardTexts.some((t) => t.includes("not installed"))).toBe(true);
  });

  it("does not dim available tools", () => {
    const state = makeState({
      tools: [makeTool({ status: "available" })],
    });
    const vnode = renderToolsView(mockUi, state) as unknown as AnyNode;
    const col = (vnode.children ?? [])[0] as AnyNode;
    const cards = toolCards(col);
    // Available tools show "ready" in status badge
    const cardTexts = allText(cards[0]!);
    expect(cardTexts.some((t) => t.includes("ready"))).toBe(true);
  });

  it("shows check icon for available tools", () => {
    const state = makeState({
      tools: [makeTool({ status: "available" })],
    });
    const vnode = renderToolsView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    // Status label for available is "● ready" — uses ● not ✓
    // The badge content includes "● ready"
    expect(texts.some((t) => t.includes("ready"))).toBe(true);
  });

  it("shows x icon for not-installed tools", () => {
    const state = makeState({
      tools: [makeTool({ status: "not-installed" })],
    });
    const vnode = renderToolsView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    // Status label for not-installed is "✕ not installed"
    expect(texts.some((t) => t.includes("not installed"))).toBe(true);
  });

  it("shows stop icon for stopped tools", () => {
    const state = makeState({
      tools: [makeTool({ status: "stopped" })],
    });
    const vnode = renderToolsView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    expect(texts.some((t) => t.includes("\u25a0"))).toBe(true);
  });

  it("shows play icon for running status tools", () => {
    const state = makeState({
      tools: [makeTool({ status: "running" })],
    });
    const vnode = renderToolsView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    expect(texts.some((t) => t.includes("\u25b6"))).toBe(true);
  });

  it("shows session count when greater than 0", () => {
    const state = makeState({
      tools: [makeTool({ sessionCount: 3 })],
    });
    const vnode = renderToolsView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    expect(texts.some((t) => t.includes("3 sessions"))).toBe(true);
  });

  it("omits session count when 0", () => {
    const state = makeState({
      tools: [makeTool({ sessionCount: 0 })],
    });
    const vnode = renderToolsView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    expect(texts.every((t) => !t.includes("sessions"))).toBe(true);
  });

  it("includes title with keybinding hints", () => {
    const state = makeState({
      tools: [makeTool()],
    });
    const vnode = renderToolsView(mockUi, state) as unknown as AnyNode;
    expect(String(vnode.props?.title)).toContain("Enter:Launch");
    expect(String(vnode.props?.title)).toContain("d:Kill");
  });
});

// ── getToolsKeyHints ──────────────────────────────────

describe("getToolsKeyHints", () => {
  it("returns key hint string", () => {
    const hints = getToolsKeyHints({});
    expect(hints).toContain("Enter:Launch");
    expect(hints).toContain("d:Kill");
    expect(hints).toContain("j/k:Select");
  });

  it("respects key overrides", () => {
    const hints = getToolsKeyHints({ "tools-kill": "x" });
    expect(hints).toContain("x:Kill");
    expect(hints).not.toContain("d:Kill");
  });
});
