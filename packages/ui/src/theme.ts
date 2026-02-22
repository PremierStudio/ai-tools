/**
 * Shared color tokens for the Agentful TUI dashboard.
 *
 * Re-exports semantic tokens from `./theme/` plus app-specific
 * constants (logo, powerline colors, component colors, utilities).
 */

// Re-export semantic tokens, themes, and spacing
export {
  // Tokens
  BRAND,
  STATUS,
  SURFACE,
  TEXT,
  BORDER,
  TOOLS,
  // Themes
  agentfulDarkTheme,
  agentfulLightTheme,
  agentfulDimmedTheme,
  agentfulHighContrastTheme,
  agentfulNordTheme,
  agentfulDraculaTheme,
  THEME_MAP,
  getTheme,
  cycleTheme,
  AVAILABLE_THEMES,
  // Spacing system
  SPACING,
  PADDING,
  GAP,
  MARGIN,
  LAYOUT as THEME_LAYOUT,
  BORDER_STYLE,
  SHADOW,
  PRESETS,
  spacingValue,
  pad,
  margin as spacingMargin,
  type SpacingToken,
  type SpacingProps,
  // Types
  type ThemeName,
  type ThemeDefinition,
} from "./theme/index.js";

// Re-export icon system
export {
  ICONS,
  getIcon,
  getIconChar,
  getToolIcon,
  getToolColor,
  getViewIcon,
  getStatusIcon,
  makeIconProps,
  iconSpan,
  type IconName,
  type IconDef,
} from "./theme/icons.js";

// ─────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────

export type RgbColor = { r: number; g: number; b: number };

export type AppView = "tools" | "sessions" | "handoff" | "config" | "terminal";

// ─────────────────────────────────────────────────────────────
// LOGO (App-specific, not theme-specific)
// ─────────────────────────────────────────────────────────────

/**
 * ASCII triangle logo for Agentful.
 * Rendered at 19 chars wide × 6 rows to fit the sidebar cleanly.
 */
export const LOGO_LINES: string[] = [
  "         ◆         ",
  "        ╱ ╲        ",
  "       ╱   ╲       ",
  "      ╱  ◉  ╲      ",
  "     ╱       ╲     ",
  "    ◆─────────◆    ",
];

// ─────────────────────────────────────────────────────────────
// COLOR UTILITIES
// ─────────────────────────────────────────────────────────────

import { SURFACE } from "./theme/index.js";

/**
 * Linear interpolation between two colors.
 * t = 0 → start, t = 1 → end
 */
export function lerpColor(start: RgbColor, end: RgbColor, t: number): RgbColor {
  return {
    r: Math.round(start.r + (end.r - start.r) * t),
    g: Math.round(start.g + (end.g - start.g) * t),
    b: Math.round(start.b + (end.b - start.b) * t),
  };
}

/**
 * Generate n evenly-spaced colors along a gradient from start to end.
 */
export function gradientStops(start: RgbColor, end: RgbColor, n: number): RgbColor[] {
  if (n <= 1) return [start];
  return Array.from({ length: n }, (_, i) => lerpColor(start, end, i / (n - 1)));
}

/**
 * Dim a color by a factor (0 = black, 1 = original).
 */
export function dimColor(c: RgbColor, factor = 0.4): RgbColor {
  return { r: Math.round(c.r * factor), g: Math.round(c.g * factor), b: Math.round(c.b * factor) };
}

/**
 * Mix a color toward a target by weight (0 = original, 1 = target).
 */
export function mixColor(c: RgbColor, target: RgbColor, weight = 0.3): RgbColor {
  return lerpColor(c, target, weight);
}

/**
 * Create a subtle tinted background from a brand color.
 * Blends the color toward the base surface at low opacity.
 */
export function tintBg(brand: RgbColor, strength = 0.08): RgbColor {
  return {
    r: Math.round(SURFACE.base.r + (brand.r - SURFACE.base.r) * strength),
    g: Math.round(SURFACE.base.g + (brand.g - SURFACE.base.g) * strength),
    b: Math.round(SURFACE.base.b + (brand.b - SURFACE.base.b) * strength),
  };
}

/**
 * Create a vibrant tinted background for selections.
 */
export function selectionBg(brand: RgbColor, strength = 0.15): RgbColor {
  return {
    r: Math.round(SURFACE.base.r + (brand.r - SURFACE.base.r) * strength),
    g: Math.round(SURFACE.base.g + (brand.g - SURFACE.base.g) * strength),
    b: Math.round(SURFACE.base.b + (brand.b - SURFACE.base.b) * strength),
  };
}

/**
 * Create a glow color for borders/focus rings.
 * This is a brighter version of the input color.
 */
export function glowColor(c: RgbColor, intensity = 0.3): RgbColor {
  return {
    r: Math.min(255, Math.round(c.r + (255 - c.r) * intensity)),
    g: Math.min(255, Math.round(c.g + (255 - c.g) * intensity)),
    b: Math.min(255, Math.round(c.b + (255 - c.b) * intensity)),
  };
}

/**
 * Darken a color for pressed/active states.
 */
export function darkenColor(c: RgbColor, amount = 0.2): RgbColor {
  return {
    r: Math.round(c.r * (1 - amount)),
    g: Math.round(c.g * (1 - amount)),
    b: Math.round(c.b * (1 - amount)),
  };
}

// ─────────────────────────────────────────────────────────────
// POWERLINE COLORS (App-specific status bar styling)
// ─────────────────────────────────────────────────────────────

export const PL_MODE_BG: RgbColor = { r: 30, g: 27, b: 75 };
export const PL_HEALTH_BG_OK: RgbColor = { r: 6, g: 46, b: 30 };
export const PL_HEALTH_BG_WARN: RgbColor = { r: 50, g: 40, b: 8 };
export const PL_HEALTH_BG_ERR: RgbColor = { r: 50, g: 10, b: 10 };
export const PL_SESSIONS_BG: RgbColor = { r: 8, g: 38, b: 44 };
export const PL_RUNNING_BG: RgbColor = { r: 6, g: 38, b: 28 };
export const PL_HINTS_BG: RgbColor = { r: 15, g: 17, b: 23 };
export const PL_TOOLS_BG: RgbColor = { r: 20, g: 25, b: 45 };
export const PL_CONFIG_BG: RgbColor = { r: 45, g: 35, b: 20 };

// ─────────────────────────────────────────────────────────────
// COMPONENT-SPECIFIC COLORS
// ─────────────────────────────────────────────────────────────

/** Toast backgrounds */
export const TOAST_SUCCESS_BG: RgbColor = { r: 6, g: 32, b: 22 };
export const TOAST_ERROR_BG: RgbColor = { r: 50, g: 15, b: 15 };
export const TOAST_INFO_BG: RgbColor = { r: 8, g: 28, b: 35 };

/** Search highlight */
export const SEARCH_HIGHLIGHT_BG: RgbColor = { r: 50, g: 40, b: 8 };

/** Action button backgrounds */
export const ACTION_PRIMARY_BG: RgbColor = { r: 8, g: 32, b: 20 };
export const ACTION_SECONDARY_BG: RgbColor = { r: 20, g: 20, b: 28 };

/** Separator colors */
export const COLOR_SEPARATOR: RgbColor = { r: 30, g: 38, b: 55 };
export const COLOR_SEPARATOR_DIM: RgbColor = { r: 30, g: 35, b: 50 };

// ─────────────────────────────────────────────────────────────
// LAYOUT CONSTANTS
// ─────────────────────────────────────────────────────────────

export const OVERLAY_WIDTH = 72;
export const OVERLAY_WIDTH_COMPACT = 68;
export const SIDEBAR_MIN_WIDTH = 22;
export const SIDEBAR_MAX_WIDTH = 26;
export const PROGRESS_BAR_WIDTH = 32;
export const PROGRESS_BAR_WIDTH_COMPACT = 24;

// ─────────────────────────────────────────────────────────────
// SELECTION & FOCUS
// ─────────────────────────────────────────────────────────────

export const SELECTION_BG: RgbColor = { r: 56, g: 189, b: 248 };
export const FOCUS_GLOW: RgbColor = { r: 56, g: 189, b: 248 };
