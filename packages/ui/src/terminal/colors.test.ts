import { describe, it, expect } from "vitest";
import {
  XTERM_256_PALETTE,
  xtermColorToRgb,
  cellToTextStyle,
  stylesEqual,
  type CellAttributes,
  type Rgb,
  type TextStyle,
} from "./colors.js";

// ── Helper ────────────────────────────────────────────

function makeCellAttrs(
  overrides: Partial<Record<keyof CellAttributes, unknown>> = {},
): CellAttributes {
  return {
    getForegroundColor: () => (overrides.getForegroundColor as number) ?? 0,
    getBackgroundColor: () => (overrides.getBackgroundColor as number) ?? 0,
    isBold: () => (overrides.isBold as number) ?? 0,
    isItalic: () => (overrides.isItalic as number) ?? 0,
    isUnderline: () => (overrides.isUnderline as number) ?? 0,
    isStrikethrough: () => (overrides.isStrikethrough as number) ?? 0,
    isDim: () => (overrides.isDim as number) ?? 0,
    isInverse: () => (overrides.isInverse as number) ?? 0,
    isFgDefault: () => (overrides.isFgDefault as boolean) ?? true,
    isBgDefault: () => (overrides.isBgDefault as boolean) ?? true,
    isFgPalette: () => (overrides.isFgPalette as boolean) ?? false,
    isBgPalette: () => (overrides.isBgPalette as boolean) ?? false,
    isFgRGB: () => (overrides.isFgRGB as boolean) ?? false,
    isBgRGB: () => (overrides.isBgRGB as boolean) ?? false,
  };
}

// ── XTERM_256_PALETTE ─────────────────────────────────

describe("XTERM_256_PALETTE", () => {
  it("has exactly 256 entries", () => {
    expect(XTERM_256_PALETTE).toHaveLength(256);
  });

  it("has correct black at index 0", () => {
    expect(XTERM_256_PALETTE[0]).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("has correct red at index 1", () => {
    expect(XTERM_256_PALETTE[1]).toEqual({ r: 205, g: 0, b: 0 });
  });

  it("has correct bright white at index 15", () => {
    expect(XTERM_256_PALETTE[15]).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("first color cube entry (index 16) is black", () => {
    expect(XTERM_256_PALETTE[16]).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("last color cube entry (index 231) is white", () => {
    expect(XTERM_256_PALETTE[231]).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("first grayscale (index 232) is near-black", () => {
    expect(XTERM_256_PALETTE[232]).toEqual({ r: 8, g: 8, b: 8 });
  });

  it("last grayscale (index 255) is near-white", () => {
    expect(XTERM_256_PALETTE[255]).toEqual({ r: 238, g: 238, b: 238 });
  });

  it("all entries have r, g, b in 0-255 range", () => {
    for (const color of XTERM_256_PALETTE) {
      expect(color.r).toBeGreaterThanOrEqual(0);
      expect(color.r).toBeLessThanOrEqual(255);
      expect(color.g).toBeGreaterThanOrEqual(0);
      expect(color.g).toBeLessThanOrEqual(255);
      expect(color.b).toBeGreaterThanOrEqual(0);
      expect(color.b).toBeLessThanOrEqual(255);
    }
  });

  it("color cube index 196 (pure red) maps correctly", () => {
    // Index 196 = 16 + 5*36 + 0*6 + 0 = 16 + 180 = 196
    expect(XTERM_256_PALETTE[196]).toEqual({ r: 255, g: 0, b: 0 });
  });
});

// ── xtermColorToRgb ───────────────────────────────────

describe("xtermColorToRgb", () => {
  it("returns undefined for default mode", () => {
    expect(xtermColorToRgb(0, "default")).toBeUndefined();
  });

  it("returns palette color for palette mode", () => {
    const result = xtermColorToRgb(1, "palette");
    expect(result).toEqual({ r: 205, g: 0, b: 0 });
  });

  it("returns undefined for out-of-range palette index", () => {
    expect(xtermColorToRgb(256, "palette")).toBeUndefined();
    expect(xtermColorToRgb(-1, "palette")).toBeUndefined();
  });

  it("extracts RGB from packed value", () => {
    // 0xFF8040 = r:255 g:128 b:64
    const result = xtermColorToRgb(0xff8040, "rgb");
    expect(result).toEqual({ r: 255, g: 128, b: 64 });
  });

  it("extracts pure red from packed RGB", () => {
    expect(xtermColorToRgb(0xff0000, "rgb")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("extracts pure green from packed RGB", () => {
    expect(xtermColorToRgb(0x00ff00, "rgb")).toEqual({ r: 0, g: 255, b: 0 });
  });

  it("extracts pure blue from packed RGB", () => {
    expect(xtermColorToRgb(0x0000ff, "rgb")).toEqual({ r: 0, g: 0, b: 255 });
  });

  it("handles zero RGB", () => {
    expect(xtermColorToRgb(0, "rgb")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("handles palette index 0 (black)", () => {
    expect(xtermColorToRgb(0, "palette")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("handles palette index 255", () => {
    expect(xtermColorToRgb(255, "palette")).toEqual({ r: 238, g: 238, b: 238 });
  });
});

// ── cellToTextStyle ───────────────────────────────────

describe("cellToTextStyle", () => {
  it("returns empty style for default cell", () => {
    const cell = makeCellAttrs();
    const style = cellToTextStyle(cell);
    expect(style).toEqual({});
  });

  it("maps palette foreground color", () => {
    const cell = makeCellAttrs({
      isFgDefault: false,
      isFgPalette: true,
      getForegroundColor: 1,
    });
    const style = cellToTextStyle(cell);
    expect(style.fg).toEqual({ r: 205, g: 0, b: 0 });
  });

  it("maps palette background color", () => {
    const cell = makeCellAttrs({
      isBgDefault: false,
      isBgPalette: true,
      getBackgroundColor: 4,
    });
    const style = cellToTextStyle(cell);
    expect(style.bg).toEqual({ r: 0, g: 0, b: 238 });
  });

  it("maps RGB foreground", () => {
    const cell = makeCellAttrs({
      isFgDefault: false,
      isFgRGB: true,
      getForegroundColor: 0xaabbcc,
    });
    const style = cellToTextStyle(cell);
    expect(style.fg).toEqual({ r: 170, g: 187, b: 204 });
  });

  it("maps bold attribute", () => {
    const cell = makeCellAttrs({ isBold: 1 });
    const style = cellToTextStyle(cell);
    expect(style.bold).toBe(true);
  });

  it("maps italic attribute", () => {
    const cell = makeCellAttrs({ isItalic: 1 });
    const style = cellToTextStyle(cell);
    expect(style.italic).toBe(true);
  });

  it("maps underline attribute", () => {
    const cell = makeCellAttrs({ isUnderline: 1 });
    const style = cellToTextStyle(cell);
    expect(style.underline).toBe(true);
  });

  it("maps strikethrough attribute", () => {
    const cell = makeCellAttrs({ isStrikethrough: 1 });
    const style = cellToTextStyle(cell);
    expect(style.strikethrough).toBe(true);
  });

  it("maps dim attribute", () => {
    const cell = makeCellAttrs({ isDim: 1 });
    const style = cellToTextStyle(cell);
    expect(style.dim).toBe(true);
  });

  it("maps inverse attribute", () => {
    const cell = makeCellAttrs({ isInverse: 1 });
    const style = cellToTextStyle(cell);
    expect(style.inverse).toBe(true);
  });

  it("combines multiple attributes", () => {
    const cell = makeCellAttrs({
      isBold: 1,
      isItalic: 1,
      isFgDefault: false,
      isFgPalette: true,
      getForegroundColor: 2,
    });
    const style = cellToTextStyle(cell);
    expect(style.bold).toBe(true);
    expect(style.italic).toBe(true);
    expect(style.fg).toEqual({ r: 0, g: 205, b: 0 });
  });

  it("does not set fg when isFgDefault is true", () => {
    const cell = makeCellAttrs({ isFgDefault: true });
    const style = cellToTextStyle(cell);
    expect(style.fg).toBeUndefined();
  });

  it("does not set bg when isBgDefault is true", () => {
    const cell = makeCellAttrs({ isBgDefault: true });
    const style = cellToTextStyle(cell);
    expect(style.bg).toBeUndefined();
  });
});

// ── stylesEqual ───────────────────────────────────────

describe("stylesEqual", () => {
  it("returns true for two empty styles", () => {
    expect(stylesEqual({}, {})).toBe(true);
  });

  it("returns true for identical styles", () => {
    const a: TextStyle = { bold: true, fg: { r: 255, g: 0, b: 0 } };
    const b: TextStyle = { bold: true, fg: { r: 255, g: 0, b: 0 } };
    expect(stylesEqual(a, b)).toBe(true);
  });

  it("returns false when bold differs", () => {
    expect(stylesEqual({ bold: true }, {})).toBe(false);
  });

  it("returns false when fg differs", () => {
    const a: TextStyle = { fg: { r: 255, g: 0, b: 0 } };
    const b: TextStyle = { fg: { r: 0, g: 255, b: 0 } };
    expect(stylesEqual(a, b)).toBe(false);
  });

  it("returns false when one has fg and other does not", () => {
    const a: TextStyle = { fg: { r: 255, g: 0, b: 0 } };
    const b: TextStyle = {};
    expect(stylesEqual(a, b)).toBe(false);
  });

  it("returns false when bg differs", () => {
    const a: TextStyle = { bg: { r: 10, g: 20, b: 30 } };
    const b: TextStyle = { bg: { r: 10, g: 20, b: 31 } };
    expect(stylesEqual(a, b)).toBe(false);
  });

  it("returns false when italic differs", () => {
    expect(stylesEqual({ italic: true }, {})).toBe(false);
  });

  it("returns false when underline differs", () => {
    expect(stylesEqual({ underline: true }, {})).toBe(false);
  });

  it("returns false when dim differs", () => {
    expect(stylesEqual({ dim: true }, {})).toBe(false);
  });

  it("returns false when inverse differs", () => {
    expect(stylesEqual({ inverse: true }, {})).toBe(false);
  });

  it("returns true when both have undefined fg", () => {
    expect(stylesEqual({ bold: true }, { bold: true })).toBe(true);
  });

  it("handles all attributes matching", () => {
    const style: TextStyle = {
      fg: { r: 1, g: 2, b: 3 },
      bg: { r: 4, g: 5, b: 6 },
      bold: true,
      italic: true,
      underline: true,
      strikethrough: true,
      dim: true,
      inverse: true,
    };
    expect(stylesEqual(style, { ...style })).toBe(true);
  });
});
