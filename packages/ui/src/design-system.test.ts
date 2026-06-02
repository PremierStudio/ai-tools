import { describe, expect, it } from "vitest";

import {
  TABLES,
  getBadgeStyle,
  getButtonStyle,
  getContainerConfig,
  getStatusConfig,
  selectionBackground,
  textStyle,
  zebraBackground,
} from "./design-system.js";

describe("design-system", () => {
  it("returns theme-aware container styles for every variant", () => {
    for (const variant of ["default", "elevated", "overlay", "card"] as const) {
      const config = getContainerConfig(variant);
      expect(config.bg).toEqual(expect.objectContaining({ r: expect.any(Number) }));
      expect(config.borderColor).toEqual(expect.objectContaining({ g: expect.any(Number) }));
      expect(config.fg).toEqual(expect.objectContaining({ b: expect.any(Number) }));
    }
  });

  it("returns button styles for every variant", () => {
    expect(getButtonStyle("primary").bold).toBe(true);
    expect(getButtonStyle("secondary").bold).toBe(false);
    expect(getButtonStyle("ghost").bold).toBe(false);
    expect(getButtonStyle("danger").bold).toBe(true);
  });

  it("returns badge styles for every variant", () => {
    for (const variant of ["success", "warning", "error", "info", "neutral"] as const) {
      const style = getBadgeStyle(variant);
      expect(style.fg.r).toEqual(expect.any(Number));
      expect(style.bg.b).toEqual(expect.any(Number));
    }
  });

  it("normalizes status aliases into semantic configs", () => {
    expect(getStatusConfig("configured")).toMatchObject({ label: "healthy" });
    expect(getStatusConfig("stopped")).toMatchObject({ label: "warning", icon: "\u25D0" });
    expect(getStatusConfig("not-installed")).toMatchObject({ label: "error" });
    expect(getStatusConfig("anything-else")).toMatchObject({ label: "unknown" });
  });

  it("returns text hierarchy styles", () => {
    expect(textStyle("primary").bold).toBe(true);
    expect(textStyle("secondary").fg).toBeDefined();
    expect(textStyle("tertiary").fg).toBeDefined();
    expect(textStyle("muted").italic).toBe(true);
  });

  it("returns deterministic selection and zebra backgrounds", () => {
    expect(selectionBackground({ r: 10, g: 20, b: 30 })).toEqual(
      expect.objectContaining({
        r: expect.any(Number),
        g: expect.any(Number),
        b: expect.any(Number),
      }),
    );
    expect(selectionBackground()).toEqual(expect.objectContaining({ r: expect.any(Number) }));
    expect(zebraBackground(true)).toEqual(expect.objectContaining({ r: expect.any(Number) }));
    expect(zebraBackground(false)).toBeUndefined();
  });

  it("keeps table presets stable for core views", () => {
    expect(TABLES.sessions.columns.map((column) => column.key)).toEqual([
      "tool",
      "title",
      "messages",
      "updated",
    ]);
    expect(TABLES.tools.rowHeight).toBe(3);
    expect(TABLES.config.selection).toBe(false);
  });
});
