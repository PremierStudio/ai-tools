/**
 * xterm-to-Rezi color mapping.
 *
 * Maps xterm 256-color palette indices and RGB values to Rezi Rgb objects,
 * and converts xterm cell attributes to Rezi TextStyle.
 */

/**
 * Rezi-compatible RGB color.
 */
export type Rgb = { r: number; g: number; b: number };

/**
 * Text style for a terminal cell segment.
 */
export type TextStyle = {
  fg?: Rgb;
  bg?: Rgb;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  dim?: boolean;
  inverse?: boolean;
};

/**
 * Standard xterm 256-color palette.
 * Indices 0-7: normal colors
 * Indices 8-15: bright colors
 * Indices 16-231: 6x6x6 color cube
 * Indices 232-255: grayscale ramp
 */
export const XTERM_256_PALETTE: Rgb[] = buildPalette();

function buildPalette(): Rgb[] {
  const palette: Rgb[] = [];

  // 0-7: Standard colors
  const standard: [number, number, number][] = [
    [0, 0, 0], // black
    [205, 0, 0], // red
    [0, 205, 0], // green
    [205, 205, 0], // yellow
    [0, 0, 238], // blue
    [205, 0, 205], // magenta
    [0, 205, 205], // cyan
    [229, 229, 229], // white
  ];

  for (const [r, g, b] of standard) {
    palette.push({ r, g, b });
  }

  // 8-15: Bright colors
  const bright: [number, number, number][] = [
    [127, 127, 127], // bright black (gray)
    [255, 0, 0], // bright red
    [0, 255, 0], // bright green
    [255, 255, 0], // bright yellow
    [92, 92, 255], // bright blue
    [255, 0, 255], // bright magenta
    [0, 255, 255], // bright cyan
    [255, 255, 255], // bright white
  ];

  for (const [r, g, b] of bright) {
    palette.push({ r, g, b });
  }

  // 16-231: 6x6x6 color cube
  const cubeValues = [0, 95, 135, 175, 215, 255];
  for (let ri = 0; ri < 6; ri++) {
    for (let gi = 0; gi < 6; gi++) {
      for (let bi = 0; bi < 6; bi++) {
        const rv = cubeValues[ri];
        const gv = cubeValues[gi];
        const bv = cubeValues[bi];
        if (rv !== undefined && gv !== undefined && bv !== undefined) {
          palette.push({ r: rv, g: gv, b: bv });
        }
      }
    }
  }

  // 232-255: Grayscale ramp
  for (let i = 0; i < 24; i++) {
    const v = 8 + i * 10;
    palette.push({ r: v, g: v, b: v });
  }

  return palette;
}

/**
 * Convert an xterm color to an Rgb value.
 *
 * @param color - The color number (palette index 0-255) or packed RGB (0xRRGGBB)
 * @param mode - How to interpret the color:
 *   "palette" = 256-color index
 *   "rgb" = packed RGB value (format: r * 65536 + g * 256 + b, or 0xRRGGBB)
 *   "default" = use terminal default (returns undefined)
 */
export function xtermColorToRgb(
  color: number,
  mode: "default" | "palette" | "rgb",
): Rgb | undefined {
  if (mode === "default") return undefined;

  if (mode === "palette") {
    if (color < 0 || color > 255) return undefined;
    return XTERM_256_PALETTE[color];
  }

  if (mode === "rgb") {
    return {
      r: (color >> 16) & 0xff,
      g: (color >> 8) & 0xff,
      b: color & 0xff,
    };
  }

  return undefined;
}

/**
 * Minimal buffer cell interface matching @xterm/headless IBufferCell.
 * Only the attributes we need for rendering.
 */
export type CellAttributes = {
  getForegroundColor(): number;
  getBackgroundColor(): number;
  isBold(): number;
  isItalic(): number;
  isUnderline(): number;
  isStrikethrough(): number;
  isDim(): number;
  isInverse(): number;
  isFgDefault(): boolean;
  isBgDefault(): boolean;
  isFgPalette(): boolean;
  isBgPalette(): boolean;
  isFgRGB(): boolean;
  isBgRGB(): boolean;
};

/**
 * Convert xterm cell attributes to a TextStyle.
 */
export function cellToTextStyle(cell: CellAttributes): TextStyle {
  const style: TextStyle = {};

  // Foreground
  if (!cell.isFgDefault()) {
    const fgMode = cell.isFgPalette() ? "palette" : cell.isFgRGB() ? "rgb" : "default";
    style.fg = xtermColorToRgb(cell.getForegroundColor(), fgMode);
  }

  // Background
  if (!cell.isBgDefault()) {
    const bgMode = cell.isBgPalette() ? "palette" : cell.isBgRGB() ? "rgb" : "default";
    style.bg = xtermColorToRgb(cell.getBackgroundColor(), bgMode);
  }

  // Attributes
  if (cell.isBold()) style.bold = true;
  if (cell.isItalic()) style.italic = true;
  if (cell.isUnderline()) style.underline = true;
  if (cell.isStrikethrough()) style.strikethrough = true;
  if (cell.isDim()) style.dim = true;
  if (cell.isInverse()) style.inverse = true;

  return style;
}

/**
 * Check if two TextStyles are equivalent (for segment batching).
 */
export function stylesEqual(a: TextStyle, b: TextStyle): boolean {
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.strikethrough === b.strikethrough &&
    a.dim === b.dim &&
    a.inverse === b.inverse &&
    rgbEqual(a.fg, b.fg) &&
    rgbEqual(a.bg, b.bg)
  );
}

function rgbEqual(a: Rgb | undefined, b: Rgb | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.r === b.r && a.g === b.g && a.b === b.b;
}
