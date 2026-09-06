import { describe, expect, it } from "vitest";
import { STATUS, TOOLS } from "./tokens.js";
import {
  getIcon,
  getIconChar,
  getStatusIcon,
  getToolColor,
  getToolIcon,
  getViewIcon,
  iconSpan,
  makeIconProps,
} from "./icons.js";

describe("getIcon / getIconChar", () => {
  it("returns a registered icon and its fallback character", () => {
    const icon = getIcon("status.success");
    expect(icon.glyph.length).toBeGreaterThan(0);
    expect(icon.fallback.length).toBeGreaterThan(0);
    expect(getIconChar("status.success")).toBe(icon.glyph);
    expect(getIconChar("status.success", true)).toBe(icon.fallback);
  });

  it("falls back to a question mark for unknown names", () => {
    expect(getIcon("not.a.real.icon" as never)).toEqual({
      glyph: "?",
      fallback: "[?]",
      width: 1,
    });
  });
});

describe("getToolIcon / getToolColor", () => {
  it.each([
    ["claude", "tool.claude", TOOLS.claude],
    ["claude-code", "tool.claude", TOOLS.claude],
    ["codex", "tool.codex", TOOLS.codex],
    ["gemini-cli", "tool.gemini", TOOLS.gemini],
    ["cursor", "tool.cursor", TOOLS.cursor],
    ["opencode", "tool.opencode", TOOLS.opencode],
    ["amp", "tool.amp", TOOLS.amp],
    ["cline", "tool.cline", TOOLS.cline],
    ["zcode", "tool.generic", STATUS.neutral],
  ] as const)("%s maps to %s", (id, icon, color) => {
    expect(getToolIcon(id)).toBe(icon);
    expect(getToolColor(id)).toEqual(color);
  });
});

describe("getViewIcon / getStatusIcon", () => {
  it("maps every view", () => {
    expect(getViewIcon("tools")).toBe("nav.tools");
    expect(getViewIcon("sessions")).toBe("nav.sessions");
    expect(getViewIcon("handoff")).toBe("nav.handoff");
    expect(getViewIcon("config")).toBe("nav.config");
    expect(getViewIcon("terminal")).toBe("nav.terminal");
  });

  it("maps every status", () => {
    expect(getStatusIcon("success")).toBe("status.success");
    expect(getStatusIcon("error")).toBe("status.error");
    expect(getStatusIcon("warning")).toBe("status.warning");
    expect(getStatusIcon("info")).toBe("status.info");
    expect(getStatusIcon("pending")).toBe("status.pending");
    expect(getStatusIcon("running")).toBe("status.running");
    expect(getStatusIcon("stopped")).toBe("status.stopped");
    expect(getStatusIcon("stale")).toBe("status.stale");
    expect(getStatusIcon("unknown")).toBe("status.unknown");
  });
});

describe("makeIconProps / iconSpan", () => {
  it("uses glyph by default and fallback when requested", () => {
    const icon = getIcon("status.info");
    expect(makeIconProps("status.info")[0]).toBe(icon.glyph);
    expect(makeIconProps("status.info", undefined, true)[0]).toBe(icon.fallback);
  });

  it("passes style through, defaulting to empty", () => {
    expect(makeIconProps("status.info")[1]).toEqual({ style: {}, fallback: false });
    expect(makeIconProps("status.info", { bold: true })[1]).toEqual({
      style: { bold: true },
      fallback: false,
    });
  });

  it("builds a rich-text span with optional color", () => {
    const icon = getIcon("status.error");
    expect(iconSpan("status.error")).toEqual({ text: icon.glyph, style: undefined });
    expect(iconSpan("status.error", STATUS.error, true)).toEqual({
      text: icon.fallback,
      style: { fg: STATUS.error, bold: true },
    });
  });
});
