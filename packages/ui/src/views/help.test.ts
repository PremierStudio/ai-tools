import { describe, it, expect } from "vitest";
import { mockUi } from "../test-helpers.js";
import { renderHelpOverlay } from "./help.js";

// ── renderHelpOverlay ─────────────────────────────────

describe("renderHelpOverlay", () => {
  it("returns a modal node with dimmed backdrop", () => {
    const vnode = renderHelpOverlay(mockUi) as {
      type: string;
      props: { backdrop: string };
    };
    expect(vnode.type).toBe("modal");
    expect(vnode.props.backdrop).toBe("dim");
  });

  it("includes help title with close hint", () => {
    const vnode = renderHelpOverlay(mockUi) as {
      props: { title: string };
    };
    expect(vnode.props.title).toContain("Help");
    expect(vnode.props.title).toContain("? to close");
  });

  it("contains Global Keybindings section", () => {
    const vnode = renderHelpOverlay(mockUi) as {
      children: [{ children: Array<{ content: string }> }];
    };
    // modal children[0] is the column wrapper
    const col = vnode.children[0]!;
    const header = col.children.find((c) => c.content === "Global");
    expect(header).toBeTruthy();
  });

  it("contains Tools View section", () => {
    const vnode = renderHelpOverlay(mockUi) as {
      children: [{ children: Array<{ content: string }> }];
    };
    const col = vnode.children[0]!;
    const header = col.children.find((c) => c.content === "Tools");
    expect(header).toBeTruthy();
  });

  it("contains Sessions View section", () => {
    const vnode = renderHelpOverlay(mockUi) as {
      children: [{ children: Array<{ content: string }> }];
    };
    const col = vnode.children[0]!;
    const header = col.children.find((c) => c.content === "Sessions");
    expect(header).toBeTruthy();
  });

  it("contains Session Detail section", () => {
    const vnode = renderHelpOverlay(mockUi) as {
      children: [{ children: Array<{ content: string }> }];
    };
    const col = vnode.children[0]!;
    const header = col.children.find((c) => c.content?.includes("Detail"));
    expect(header).toBeTruthy();
  });

  it("contains Handoff Wizard section", () => {
    const vnode = renderHelpOverlay(mockUi) as {
      children: [{ children: Array<{ content: string }> }];
    };
    const col = vnode.children[0]!;
    const header = col.children.find((c) => c.content === "Handoff");
    expect(header).toBeTruthy();
  });

  it("contains Config View section", () => {
    const vnode = renderHelpOverlay(mockUi) as {
      children: [{ children: Array<{ content: string }> }];
    };
    const col = vnode.children[0]!;
    const header = col.children.find((c) => c.content === "Config");
    expect(header).toBeTruthy();
  });

  it("includes quit keybinding", () => {
    const vnode = renderHelpOverlay(mockUi) as {
      children: [{ children: Array<{ content: string }> }];
    };
    const col = vnode.children[0]!;
    // hint rows are row nodes — search recursively through all text content
    const allText = col.children.flatMap((c) =>
      "children" in c && Array.isArray(c.children)
        ? (c.children as Array<{ content?: string }>)
        : [c],
    );
    const quitBinding = allText.find((c) => c.content?.includes("Quit"));
    expect(quitBinding).toBeTruthy();
  });

  it("includes Tab keybinding", () => {
    const vnode = renderHelpOverlay(mockUi) as {
      children: [{ children: Array<{ content: string }> }];
    };
    const col = vnode.children[0]!;
    const allText = col.children.flatMap((c) =>
      "children" in c && Array.isArray(c.children)
        ? (c.children as Array<{ content?: string }>)
        : [c],
    );
    const tabBinding = allText.find((c) => c.content?.includes("Cycle"));
    expect(tabBinding).toBeTruthy();
  });

  it("includes dividers between sections", () => {
    const vnode = renderHelpOverlay(mockUi) as {
      children: [{ children: Array<{ type?: string }> }];
    };
    const col = vnode.children[0]!;
    const dividers = col.children.filter((c) => c.type === "divider");
    expect(dividers.length).toBeGreaterThanOrEqual(4);
  });

  it("marks section headers as bold", () => {
    const vnode = renderHelpOverlay(mockUi) as {
      children: [{ children: Array<{ content: string; props?: { bold: boolean } }> }];
    };
    const col = vnode.children[0]!;
    const globalHeader = col.children.find((c) => c.content === "Global");
    expect(globalHeader!.props?.bold).toBe(true);
  });
});
