/**
 * Theme System for the ai-tools TUI.
 *
 * Provides semantic themes that extend Rezi's built-in themes with
 * ai-tools brand colors and design tokens.
 *
 * @see https://rezitui.dev/docs/styling/theme
 */

import {
  darkTheme,
  lightTheme,
  dimmedTheme,
  highContrastTheme,
  nordTheme,
  draculaTheme,
  extendTheme,
  type ThemeDefinition,
} from "@rezi-ui/core";

import {
  DARK_THEME_OVERRIDES,
  LIGHT_THEME_OVERRIDES,
  DIMMED_THEME_OVERRIDES,
  HIGH_CONTRAST_THEME_OVERRIDES,
  NORD_THEME_OVERRIDES,
  DRACULA_THEME_OVERRIDES,
  ACCENT_INDIGO,
  BRAND,
  STATUS,
  SURFACE,
  TEXT,
  BORDER,
  TOOLS,
  setActiveTheme,
  getActiveTokens,
  getActiveThemeId,
} from "./tokens.js";

// ─────────────────────────────────────────────────────────────
// EXTENDED THEMES (Rezi base + ai-tools brand)
// ─────────────────────────────────────────────────────────────

/**
 * ai-tools dark theme (default)
 * Based on Rezi's darkTheme with brand color overrides
 */
export const aiToolsDarkTheme: ThemeDefinition = extendTheme(darkTheme, DARK_THEME_OVERRIDES);

/**
 * ai-tools light theme
 * Based on Rezi's lightTheme with brand color overrides
 */
export const aiToolsLightTheme: ThemeDefinition = extendTheme(lightTheme, LIGHT_THEME_OVERRIDES);

/**
 * ai-tools dimmed theme
 * Lower contrast dark theme for reduced eye strain
 */
export const aiToolsDimmedTheme: ThemeDefinition = extendTheme(dimmedTheme, DIMMED_THEME_OVERRIDES);

/**
 * ai-tools high contrast theme
 * WCAG AAA compliant for accessibility
 */
export const aiToolsHighContrastTheme: ThemeDefinition = extendTheme(
  highContrastTheme,
  HIGH_CONTRAST_THEME_OVERRIDES,
);

/**
 * ai-tools Nord theme
 * Nordic blue-grey palette
 */
export const aiToolsNordTheme: ThemeDefinition = extendTheme(nordTheme, NORD_THEME_OVERRIDES);

/**
 * ai-tools Dracula theme
 * Popular purple/magenta dark theme
 */
export const aiToolsDraculaTheme: ThemeDefinition = extendTheme(
  draculaTheme,
  DRACULA_THEME_OVERRIDES,
);

// ─────────────────────────────────────────────────────────────
// THEME MAP FOR DYNAMIC SWITCHING
// ─────────────────────────────────────────────────────────────

export type ThemeName = "dark" | "light" | "dim" | "highContrast" | "nord" | "dracula";

export const AVAILABLE_THEMES: ThemeName[] = [
  "dark",
  "light",
  "dim",
  "highContrast",
  "nord",
  "dracula",
];

/**
 * Map of theme names to their definitions.
 * Used for dynamic theme switching.
 */
export const THEME_MAP: Record<ThemeName, ThemeDefinition> = {
  dark: aiToolsDarkTheme,
  light: aiToolsLightTheme,
  dim: aiToolsDimmedTheme,
  highContrast: aiToolsHighContrastTheme,
  nord: aiToolsNordTheme,
  dracula: aiToolsDraculaTheme,
};

/**
 * Get a theme by name with fallback to dark theme.
 * Also updates the active theme context so token getters resolve correctly.
 */
export function getTheme(name: ThemeName | string): ThemeDefinition {
  setActiveTheme(name);
  return THEME_MAP[name as ThemeName] ?? aiToolsDarkTheme;
}

/**
 * Cycle to the next theme in the list.
 */
export function cycleTheme(current: ThemeName): ThemeName {
  const idx = AVAILABLE_THEMES.indexOf(current);
  const nextIdx = (idx + 1) % AVAILABLE_THEMES.length;
  return AVAILABLE_THEMES[nextIdx] ?? "dark";
}

// Re-export tokens for direct access
export {
  ACCENT_INDIGO,
  BRAND,
  STATUS,
  SURFACE,
  TEXT,
  BORDER,
  TOOLS,
  setActiveTheme,
  getActiveTokens,
  getActiveThemeId,
};

// Re-export spacing system
export {
  SPACING,
  PADDING,
  GAP,
  MARGIN,
  LAYOUT,
  BORDER_STYLE,
  SHADOW,
  PRESETS,
  TINT,
  DIM,
  spacingValue,
  pad,
  margin,
  type SpacingToken,
  type SpacingProps,
} from "./spacing.js";

// ─────────────────────────────────────────────────────────────
// TYPE EXPORTS
// ─────────────────────────────────────────────────────────────

export type { ThemeDefinition };
export type { ResolvedTokens } from "./tokens.js";
