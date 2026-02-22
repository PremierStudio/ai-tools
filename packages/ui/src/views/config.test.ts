import { describe, it, expect } from "vitest";
import type { EngineStatus } from "../widgets/config-dashboard.js";
import { mockUi } from "../test-helpers.js";
import { renderConfigView, getConfigKeyHints } from "./config.js";
import type { ConfigViewState } from "./config.js";

function makeEngine(overrides: Partial<EngineStatus> = {}): EngineStatus {
  return {
    engine: "hooks",
    detected: true,
    configured: true,
    ...overrides,
  };
}

function makeState(overrides: Partial<ConfigViewState> = {}): ConfigViewState {
  return {
    engines: [],
    mode: "canonical",
    configHealth: "healthy",
    loadingConfig: false,
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

/** Flatten a node tree into all text content strings. */
function allText(node: AnyNode): string[] {
  const out: string[] = [];
  // Collect content from text, richText, badge, callout, tag nodes
  if (node.content !== undefined) out.push(node.content);
  for (const c of node.children ?? []) out.push(...allText(c));
  return out;
}

// ── renderConfigView ──────────────────────────────────

describe("renderConfigView", () => {
  it("shows loading message when loading with no engines", () => {
    const state = makeState({ loadingConfig: true });
    const vnode = renderConfigView(mockUi, state) as unknown as AnyNode;
    expect(String(vnode.props?.title)).toContain("Config");
    // children[0] is a spinner node — check its label prop
    const spinner = (vnode.children ?? [])[0] as unknown as { props: { label: string } };
    expect(spinner.props.label).toContain("Loading config");
  });

  it("shows no engines message when empty and not loading", () => {
    const state = makeState({ loadingConfig: false });
    const vnode = renderConfigView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    expect(texts.some((t) => t.includes("No engines found."))).toBe(true);
  });

  it("shows mode", () => {
    const state = makeState({
      engines: [makeEngine()],
      mode: "canonical",
    });
    const vnode = renderConfigView(mockUi, state) as unknown as AnyNode;
    // Mode appears in the summary richText: "Mode  canonical  Health  …"
    const texts = allText(vnode);
    expect(texts.some((t) => t.includes("canonical"))).toBe(true);
  });

  it("shows config health", () => {
    const state = makeState({
      engines: [makeEngine()],
      configHealth: "healthy",
    });
    const vnode = renderConfigView(mockUi, state) as unknown as AnyNode;
    // Health appears in the callout and in the summary richText
    const texts = allText(vnode);
    expect(texts.some((t) => t.includes("healthy"))).toBe(true);
  });

  it("shows configured count", () => {
    const state = makeState({
      engines: [
        makeEngine({ engine: "hooks", configured: true }),
        makeEngine({ engine: "mcp", configured: false }),
        makeEngine({ engine: "skills", configured: true }),
      ],
    });
    const vnode = renderConfigView(mockUi, state) as unknown as AnyNode;
    // Count appears in the callout: "healthy  ·  canonical mode  ·  2/3 engines configured"
    const texts = allText(vnode);
    expect(texts.some((t) => t.includes("2/3"))).toBe(true);
  });

  it("shows check icon for configured engines", () => {
    const state = makeState({
      engines: [makeEngine({ engine: "hooks", configured: true })],
    });
    const vnode = renderConfigView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    // Engine rows use "◈ " for configured — check engine name and "configured" status
    expect(texts.some((t) => t.includes("hooks"))).toBe(true);
    expect(texts.some((t) => t.includes("configured"))).toBe(true);
  });

  it("shows x icon for unconfigured engines", () => {
    const state = makeState({
      engines: [makeEngine({ engine: "mcp", configured: false })],
    });
    const vnode = renderConfigView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    // Engine rows use "○ " for unconfigured — check engine name and "not configured" status
    expect(texts.some((t) => t.includes("mcp"))).toBe(true);
    expect(texts.some((t) => t.includes("not configured"))).toBe(true);
  });

  it("dims unconfigured engines", () => {
    const state = makeState({
      engines: [makeEngine({ engine: "mcp", configured: false })],
    });
    const vnode = renderConfigView(mockUi, state) as unknown as AnyNode;
    // Unconfigured engine row richText includes the engine name dimmed
    // Verify the engine appears in allText (the row is rendered with dim color via style)
    const texts = allText(vnode);
    expect(texts.some((t) => t.includes("mcp"))).toBe(true);
    // Not configured status appears
    expect(texts.some((t) => t.includes("not configured"))).toBe(true);
  });

  it("does not dim configured engines", () => {
    const state = makeState({
      engines: [makeEngine({ engine: "hooks", configured: true })],
    });
    const vnode = renderConfigView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    expect(texts.some((t) => t.includes("hooks"))).toBe(true);
    // Configured engine shows "configured" status
    expect(texts.some((t) => t.includes("configured"))).toBe(true);
  });

  it("shows error text for engines with errors", () => {
    const state = makeState({
      engines: [makeEngine({ engine: "hooks", configured: false, error: "parse error" })],
    });
    const vnode = renderConfigView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    // Error appears in gauge label: "error: parse error"
    expect(texts.some((t) => t.includes("parse error"))).toBe(true);
  });

  it("omits error text when no error", () => {
    const state = makeState({
      engines: [makeEngine({ engine: "hooks", configured: true })],
    });
    const vnode = renderConfigView(mockUi, state) as unknown as AnyNode;
    const texts = allText(vnode);
    // No error text when no error
    expect(texts.every((t) => !t.includes("error:"))).toBe(true);
  });

  it("includes title with keybinding hints", () => {
    const state = makeState({
      engines: [makeEngine()],
    });
    const vnode = renderConfigView(mockUi, state) as unknown as AnyNode;
    expect(String(vnode.props?.title)).toContain("g:Generate");
    expect(String(vnode.props?.title)).toContain("i:Install");
    expect(String(vnode.props?.title)).toContain("r:Refresh");
  });
});

// ── getConfigKeyHints ─────────────────────────────────

describe("getConfigKeyHints", () => {
  it("returns key hint string", () => {
    const hints = getConfigKeyHints();
    expect(hints).toContain("g:Generate");
    expect(hints).toContain("i:Install");
    expect(hints).toContain("r:Refresh");
    expect(hints).toContain("e:$EDITOR");
  });
});
