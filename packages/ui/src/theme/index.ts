/**
 * Theme System for Agentful TUI
 *
 * Provides semantic themes that extend Rezi's built-in themes with
 * Agentful's brand colors and design tokens.
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
  BRAND,
  STATUS,
  SURFACE,
  TEXT,
  BORDER,
  TOOLS,
} from "./tokens.js";

// ─────────────────────────────────────────────────────────────
// EXTENDED THEMES (Rezi base + Agentful brand)
// ─────────────────────────────────────────────────────────────

/**
 * Agentful dark theme (default)
 * Based on Rezi's darkTheme with brand color overrides
 */
export const agentfulDarkTheme: ThemeDefinition = extendTheme(darkTheme, DARK_THEME_OVERRIDES);

/**
 * Agentful light theme
 * Based on Rezi's lightTheme with brand color overrides
 */
export const agentfulLightTheme: ThemeDefinition = extendTheme(lightTheme, LIGHT_THEME_OVERRIDES);

/**
 * Agentful dimmed theme
 * Lower contrast dark theme for reduced eye strain
 */
export const agentfulDimmedTheme: ThemeDefinition = extendTheme(
  dimmedTheme,
  DIMMED_THEME_OVERRIDES,
);

/**
 * Agentful high contrast theme
 * WCAG AAA compliant for accessibility
 */
export const agentfulHighContrastTheme: ThemeDefinition = extendTheme(
  highContrastTheme,
  HIGH_CONTRAST_THEME_OVERRIDES,
);

/**
 * Agentful Nord theme
 * Nordic blue-grey palette
 */
export const agentfulNordTheme: ThemeDefinition = extendTheme(nordTheme, NORD_THEME_OVERRIDES);

/**
 * Agentful Dracula theme
 * Popular purple/magenta dark theme
 */
export const agentfulDraculaTheme: ThemeDefinition = extendTheme(
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
  dark: agentfulDarkTheme,
  light: agentfulLightTheme,
  dim: agentfulDimmedTheme,
  highContrast: agentfulHighContrastTheme,
  nord: agentfulNordTheme,
  dracula: agentfulDraculaTheme,
};

/**
 * Get a theme by name with fallback to dark theme.
 */
export function getTheme(name: ThemeName | string): ThemeDefinition {
  return THEME_MAP[name as ThemeName] ?? agentfulDarkTheme;
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
export { BRAND, STATUS, SURFACE, TEXT, BORDER, TOOLS };

// Re-export spacing system
export {
  SPACING,
  PADDING,
  GAP,
  MARGIN,
  LAYOUT,
  BORDER as BORDER_STYLE,
  SHADOW,
  PRESETS,
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
