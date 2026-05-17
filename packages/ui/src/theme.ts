/**
 * Shared color tokens for the ai-tools TUI dashboard.
 *
 * Re-exports semantic tokens from `./theme/` plus app-specific
 * constants (logo, powerline colors, component colors, utilities).
 *
 * App-specific colors (powerline, toasts, separators, etc.) are exposed
 * as getter functions so they respond to the active theme. Dark themes
 * get dark tinted backgrounds; light themes get light tinted backgrounds.
 */

// Re-export semantic tokens, themes, and spacing
export {
  // Tokens
  ACCENT_INDIGO,
  BRAND,
  STATUS,
  SURFACE,
  TEXT,
  BORDER,
  TOOLS,
  // Theme context
  setActiveTheme,
  getActiveTokens,
  getActiveThemeId,
  // Themes
  aiToolsDarkTheme,
  aiToolsLightTheme,
  aiToolsDimmedTheme,
  aiToolsHighContrastTheme,
  aiToolsNordTheme,
  aiToolsDraculaTheme,
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
  TINT,
  DIM,
  spacingValue,
  pad,
  margin as spacingMargin,
  type SpacingToken,
  type SpacingProps,
  // Types
  type ThemeName,
  type ThemeDefinition,
  type ResolvedTokens,
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
 * ASCII triangle logo for ai-tools.
 * Rendered at 19 chars wide x 6 rows to fit the sidebar cleanly.
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

import { getActiveTokens } from "./theme/index.js";

/**
 * Linear interpolation between two colors.
 * t = 0 -> start, t = 1 -> end
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
  return {
    r: Math.round(c.r * factor),
    g: Math.round(c.g * factor),
    b: Math.round(c.b * factor),
  };
}

/**
 * Mix a color toward a target by weight (0 = original, 1 = target).
 */
export function mixColor(c: RgbColor, target: RgbColor, weight = 0.3): RgbColor {
  return lerpColor(c, target, weight);
}

/**
 * Create a subtle tinted background from a brand color.
 * Blends the color toward the current theme's base surface at low opacity.
 */
export function tintBg(brand: RgbColor, strength = 0.08): RgbColor {
  const base = getActiveTokens().surface.base;
  return {
    r: Math.round(base.r + (brand.r - base.r) * strength),
    g: Math.round(base.g + (brand.g - base.g) * strength),
    b: Math.round(base.b + (brand.b - base.b) * strength),
  };
}

/**
 * Create a vibrant tinted background for selections.
 * Uses the current theme's base surface.
 */
export function selectionBg(brand: RgbColor, strength = 0.15): RgbColor {
  const base = getActiveTokens().surface.base;
  return {
    r: Math.round(base.r + (brand.r - base.r) * strength),
    g: Math.round(base.g + (brand.g - base.g) * strength),
    b: Math.round(base.b + (brand.b - base.b) * strength),
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
// THEME-AWARE COMPONENT COLORS
// ─────────────────────────────────────────────────────────────
//
// These were previously hardcoded `export const` values locked to
// the dark theme.  They are now getter functions so they derive
// from the active theme's surface/status tokens.
// ─────────────────────────────────────────────────────────────

// ── Powerline colors ────────────────────────────────────────

/** Status-bar mode segment background (deep indigo tint). */
export function PL_MODE_BG(): RgbColor {
  return tintBg({ r: 80, g: 70, b: 220 }, 0.12);
}

/** Health "OK" segment background (green tint). */
export function PL_HEALTH_BG_OK(): RgbColor {
  return tintBg(getActiveTokens().status.success, 0.14);
}

/** Health "warning" segment background (amber tint). */
export function PL_HEALTH_BG_WARN(): RgbColor {
  return tintBg(getActiveTokens().status.warning, 0.14);
}

/** Health "error" segment background (red tint). */
export function PL_HEALTH_BG_ERR(): RgbColor {
  return tintBg(getActiveTokens().status.error, 0.14);
}

/** Sessions segment background (teal tint). */
export function PL_SESSIONS_BG(): RgbColor {
  return tintBg(getActiveTokens().brand.secondary, 0.12);
}

/** Running-tools segment background (green tint). */
export function PL_RUNNING_BG(): RgbColor {
  return tintBg(getActiveTokens().status.success, 0.1);
}

/** Hints segment background (very subtle base tint). */
export function PL_HINTS_BG(): RgbColor {
  const tokens = getActiveTokens();
  return lerpColor(tokens.surface.base, tokens.surface.subtle, 0.3);
}

/** Tools segment background (blue tint). */
export function PL_TOOLS_BG(): RgbColor {
  return tintBg(getActiveTokens().brand.secondary, 0.14);
}

/** Config segment background (amber tint). */
export function PL_CONFIG_BG(): RgbColor {
  return tintBg(getActiveTokens().status.warning, 0.12);
}

// ── Toast backgrounds ───────────────────────────────────────

export function TOAST_SUCCESS_BG(): RgbColor {
  return tintBg(getActiveTokens().status.success, 0.12);
}

export function TOAST_ERROR_BG(): RgbColor {
  return tintBg(getActiveTokens().status.error, 0.12);
}

export function TOAST_INFO_BG(): RgbColor {
  return tintBg(getActiveTokens().brand.base, 0.12);
}

// ── Search highlight ────────────────────────────────────────

export function SEARCH_HIGHLIGHT_BG(): RgbColor {
  return tintBg(getActiveTokens().status.warning, 0.18);
}

// ── Action button backgrounds ───────────────────────────────

export function ACTION_PRIMARY_BG(): RgbColor {
  return tintBg(getActiveTokens().brand.primary, 0.14);
}

export function ACTION_SECONDARY_BG(): RgbColor {
  return tintBg(getActiveTokens().brand.secondary, 0.1);
}

// ── Separator colors ────────────────────────────────────────

export function COLOR_SEPARATOR(): RgbColor {
  return getActiveTokens().border.subtle;
}

export function COLOR_SEPARATOR_DIM(): RgbColor {
  return dimColor(getActiveTokens().border.subtle, 0.7);
}

// ── Selection & Focus ───────────────────────────────────────

/** Create a tinted background for selected rows/items. */
export function selBg(brand: RgbColor): RgbColor {
  return tintBg(brand, 0.22);
}

/** Create a chip/button background from a brand color. */
export function chipBg(brand: RgbColor): RgbColor {
  return dimColor(brand, 0.3);
}

export function FOCUS_GLOW(): RgbColor {
  return getActiveTokens().brand.accent;
}

// ─────────────────────────────────────────────────────────────
// LAYOUT CONSTANTS
// ─────────────────────────────────────────────────────────────

export const OVERLAY_WIDTH = 72;
export const OVERLAY_WIDTH_COMPACT = 68;
export const SIDEBAR_MIN_WIDTH = 22;
export const SIDEBAR_MAX_WIDTH = 26;
export const PROGRESS_BAR_WIDTH = 32;
export const PROGRESS_BAR_WIDTH_COMPACT = 24;
