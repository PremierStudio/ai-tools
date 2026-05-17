/**
 * Semantic Theme Tokens for the ai-tools TUI
 *
 * This module defines color tokens that map to Rezi's semantic theme system.
 * Colors are organized by semantic meaning rather than visual appearance.
 *
 * @see https://rezitui.dev/docs/styling/theme
 */

import type { RgbColor } from "../theme.js";

// ─────────────────────────────────────────────────────────────
// RAW COLOR PALETTE (Internal - use semantic tokens in views)
// ─────────────────────────────────────────────────────────────

/** Brand gradient colors */
export const BRAND = {
  /** Primary teal */
  primary: { r: 16, g: 185, b: 129 } as RgbColor,
  /** Secondary blue */
  secondary: { r: 59, g: 130, b: 246 } as RgbColor,
  /** Accent sky blue */
  accent: { r: 94, g: 206, b: 255 } as RgbColor,
  /** Base mid-teal */
  base: { r: 11, g: 184, b: 170 } as RgbColor,
};

/** Status colors */
export const STATUS = {
  success: { r: 52, g: 211, b: 153 } as RgbColor,
  warning: { r: 253, g: 224, b: 133 } as RgbColor,
  error: { r: 248, g: 113, b: 113 } as RgbColor,
  info: { r: 96, g: 165, b: 250 } as RgbColor,
  neutral: { r: 148, g: 163, b: 184 } as RgbColor,
};

/**
 * Background surface colors.
 *
 * Hierarchy (darkest to lightest):
 *   deep < base < subtle < overlay < elevated < card
 */
export const SURFACE = {
  /** Deepest background - app root */
  deep: { r: 8, g: 10, b: 18 } as RgbColor,
  /** Base surface - panels */
  base: { r: 13, g: 17, b: 27 } as RgbColor,
  /** Subtle highlight - hover states */
  subtle: { r: 15, g: 20, b: 35 } as RgbColor,
  /** Overlay surface - dropdowns, tooltips */
  overlay: { r: 17, g: 24, b: 39 } as RgbColor,
  /** Elevated surface - selected items, modals */
  elevated: { r: 20, g: 28, b: 46 } as RgbColor,
  /** Card background */
  card: { r: 24, g: 28, b: 42 } as RgbColor,
};

/** Text colors */
export const TEXT = {
  /** Primary text - bright white */
  primary: { r: 226, g: 232, b: 240 } as RgbColor,
  /** Secondary text - muted gray */
  secondary: { r: 148, g: 163, b: 184 } as RgbColor,
  /** Tertiary text - dim gray (bumped for WCAG AA on elevated surfaces) */
  tertiary: { r: 120, g: 136, b: 159 } as RgbColor,
  /** Disabled text */
  disabled: { r: 75, g: 85, b: 99 } as RgbColor,
};

/** Border colors */
export const BORDER = {
  /** Subtle borders - dividers */
  subtle: { r: 30, g: 40, b: 56 } as RgbColor,
  /** Default borders */
  default: { r: 42, g: 55, b: 76 } as RgbColor,
  /** Strong borders - active elements */
  strong: { r: 70, g: 130, b: 190 } as RgbColor,
};

/** Accent indigo for runtime/keybinding UI elements */
export const ACCENT_INDIGO = { r: 129, g: 140, b: 248 } as RgbColor;

/** Tool-specific brand colors */
export const TOOLS = {
  claude: { r: 250, g: 160, b: 50 } as RgbColor,
  codex: STATUS.success,
  gemini: STATUS.info,
  cursor: { r: 180, g: 130, b: 255 } as RgbColor,
  opencode: { r: 100, g: 220, b: 200 } as RgbColor,
  amp: { r: 255, g: 140, b: 100 } as RgbColor,
  cline: { r: 160, g: 100, b: 255 } as RgbColor,
};

// ─────────────────────────────────────────────────────────────
// SEMANTIC TOKEN MAPPING (For Rezi Theme System)
// ─────────────────────────────────────────────────────────────

/**
 * Maps our semantic colors to Rezi's theme token structure.
 * This is used with extendTheme() to create custom themes.
 */
export const SEMANTIC_TOKENS = {
  // Surface colors (bg.*)
  "bg.base": SURFACE.base,
  "bg.elevated": SURFACE.elevated,
  "bg.overlay": SURFACE.overlay,
  "bg.subtle": SURFACE.subtle,

  // Foreground colors (fg.*)
  "fg.primary": TEXT.primary,
  "fg.secondary": TEXT.secondary,
  "fg.muted": TEXT.tertiary,

  // Accent colors (accent.*)
  "accent.primary": BRAND.primary,
  "accent.secondary": BRAND.secondary,
  "accent.tertiary": BRAND.accent,

  // Semantic state colors
  success: STATUS.success,
  warning: STATUS.warning,
  error: STATUS.error,
  info: STATUS.info,

  // Border colors (border.*)
  "border.subtle": BORDER.subtle,
  "border.default": BORDER.default,
  "border.strong": BORDER.strong,

  // Focus colors
  "focus.ring": BRAND.accent,
  "focus.bg": SURFACE.subtle,

  // Selection colors
  "selected.bg": SURFACE.elevated,
  "selected.fg": TEXT.primary,

  // Disabled state
  "disabled.fg": TEXT.disabled,
  "disabled.bg": SURFACE.base,
};

// ─────────────────────────────────────────────────────────────
// THEME-SPECIFIC OVERRIDES
// ─────────────────────────────────────────────────────────────

/** Dark theme adjustments (default) */
export const DARK_THEME_OVERRIDES = {
  colors: {
    bg: {
      base: SURFACE.deep,
      elevated: SURFACE.elevated,
      overlay: SURFACE.overlay,
      subtle: SURFACE.subtle,
    },
    fg: {
      primary: TEXT.primary,
      secondary: TEXT.secondary,
      muted: TEXT.tertiary,
    },
    accent: {
      primary: BRAND.primary,
      secondary: BRAND.secondary,
      tertiary: BRAND.accent,
    },
    success: STATUS.success,
    warning: STATUS.warning,
    error: STATUS.error,
    info: STATUS.info,
    border: {
      subtle: BORDER.subtle,
      default: BORDER.default,
      strong: BORDER.strong,
    },
    focus: {
      ring: BRAND.accent,
      bg: SURFACE.subtle,
    },
    selected: {
      bg: SURFACE.elevated,
      fg: TEXT.primary,
    },
    disabled: {
      fg: TEXT.disabled,
      bg: SURFACE.base,
    },
  },
};

/** Light theme adjustments */
export const LIGHT_THEME_OVERRIDES = {
  colors: {
    bg: {
      base: { r: 250, g: 250, b: 252 },
      elevated: { r: 255, g: 255, b: 255 },
      overlay: { r: 245, g: 245, b: 247 },
      subtle: { r: 240, g: 240, b: 242 },
    },
    fg: {
      primary: { r: 15, g: 23, b: 42 },
      secondary: { r: 71, g: 85, b: 105 },
      muted: { r: 120, g: 136, b: 159 },
    },
    accent: {
      primary: { r: 13, g: 148, b: 136 },
      secondary: { r: 8, g: 145, b: 178 },
      tertiary: { r: 6, g: 182, b: 212 },
    },
    success: { r: 22, g: 163, b: 74 },
    warning: { r: 202, g: 138, b: 4 },
    error: { r: 220, g: 38, b: 38 },
    info: { r: 37, g: 99, b: 235 },
    border: {
      subtle: { r: 226, g: 232, b: 240 },
      default: { r: 203, g: 213, b: 225 },
      strong: { r: 148, g: 163, b: 184 },
    },
    focus: {
      ring: { r: 6, g: 182, b: 212 },
      bg: { r: 240, g: 249, b: 255 },
    },
    selected: {
      bg: { r: 224, g: 242, b: 254 },
      fg: { r: 15, g: 23, b: 42 },
    },
    disabled: {
      fg: { r: 156, g: 163, b: 175 },
      bg: { r: 243, g: 244, b: 246 },
    },
  },
};

/** Dimmed theme - lower contrast dark */
export const DIMMED_THEME_OVERRIDES = {
  colors: {
    bg: {
      base: { r: 30, g: 30, b: 35 },
      elevated: { r: 40, g: 40, b: 45 },
      overlay: { r: 35, g: 35, b: 40 },
      subtle: { r: 45, g: 45, b: 50 },
    },
    fg: {
      primary: { r: 200, g: 200, b: 205 },
      secondary: { r: 150, g: 150, b: 155 },
      muted: { r: 110, g: 110, b: 115 },
    },
    accent: {
      primary: { r: 120, g: 175, b: 165 },
      secondary: { r: 110, g: 165, b: 185 },
      tertiary: { r: 145, g: 195, b: 215 },
    },
    border: {
      subtle: { r: 60, g: 60, b: 65 },
      default: { r: 80, g: 80, b: 85 },
      strong: { r: 100, g: 100, b: 110 },
    },
    focus: {
      ring: { r: 145, g: 195, b: 215 },
      bg: { r: 65, g: 65, b: 72 },
    },
  },
};

/** Nord theme - blue-grey palette */
export const NORD_THEME_OVERRIDES = {
  colors: {
    bg: {
      base: { r: 46, g: 52, b: 64 },
      elevated: { r: 59, g: 66, b: 82 },
      overlay: { r: 67, g: 76, b: 94 },
      subtle: { r: 76, g: 86, b: 106 },
    },
    fg: {
      primary: { r: 236, g: 239, b: 244 },
      secondary: { r: 216, g: 222, b: 233 },
      muted: { r: 143, g: 188, b: 187 },
    },
    accent: {
      primary: { r: 136, g: 192, b: 208 },
      secondary: { r: 129, g: 161, b: 193 },
      tertiary: { r: 94, g: 129, b: 172 },
    },
    success: { r: 163, g: 190, b: 140 },
    warning: { r: 235, g: 203, b: 139 },
    error: { r: 191, g: 97, b: 106 },
    info: { r: 136, g: 192, b: 208 },
    border: {
      subtle: { r: 67, g: 76, b: 94 },
      default: { r: 76, g: 86, b: 106 },
      strong: { r: 136, g: 192, b: 208 },
    },
    focus: {
      ring: { r: 136, g: 192, b: 208 },
      bg: { r: 67, g: 76, b: 94 },
    },
    disabled: {
      fg: { r: 76, g: 86, b: 106 },
      bg: { r: 52, g: 58, b: 72 },
    },
  },
};

/** Dracula theme - purple/magenta dark */
export const DRACULA_THEME_OVERRIDES = {
  colors: {
    bg: {
      base: { r: 40, g: 42, b: 54 },
      elevated: { r: 68, g: 71, b: 90 },
      overlay: { r: 56, g: 58, b: 74 },
      subtle: { r: 75, g: 78, b: 98 },
    },
    fg: {
      primary: { r: 248, g: 248, b: 242 },
      secondary: { r: 189, g: 147, b: 249 },
      muted: { r: 98, g: 114, b: 164 },
    },
    accent: {
      primary: { r: 189, g: 147, b: 249 },
      secondary: { r: 139, g: 233, b: 253 },
      tertiary: { r: 255, g: 121, b: 198 },
    },
    success: { r: 80, g: 250, b: 123 },
    warning: { r: 241, g: 250, b: 140 },
    error: { r: 255, g: 85, b: 85 },
    info: { r: 139, g: 233, b: 253 },
    border: {
      subtle: { r: 68, g: 71, b: 90 },
      default: { r: 98, g: 114, b: 164 },
      strong: { r: 189, g: 147, b: 249 },
    },
    focus: {
      ring: { r: 255, g: 121, b: 198 },
      bg: { r: 68, g: 71, b: 90 },
    },
    disabled: {
      fg: { r: 98, g: 114, b: 164 },
      bg: { r: 50, g: 52, b: 66 },
    },
  },
};

/** High contrast theme - WCAG AAA compliant */
export const HIGH_CONTRAST_THEME_OVERRIDES = {
  colors: {
    bg: {
      base: { r: 0, g: 0, b: 0 },
      elevated: { r: 20, g: 20, b: 20 },
      overlay: { r: 30, g: 30, b: 30 },
      subtle: { r: 40, g: 40, b: 40 },
    },
    fg: {
      primary: { r: 255, g: 255, b: 255 },
      secondary: { r: 200, g: 200, b: 200 },
      muted: { r: 150, g: 150, b: 150 },
    },
    accent: {
      primary: { r: 0, g: 255, b: 255 },
      secondary: { r: 255, g: 255, b: 0 },
      tertiary: { r: 255, g: 0, b: 255 },
    },
    success: { r: 0, g: 255, b: 0 },
    warning: { r: 255, g: 255, b: 0 },
    error: { r: 255, g: 0, b: 0 },
    info: { r: 0, g: 255, b: 255 },
    border: {
      subtle: { r: 180, g: 180, b: 180 },
      default: { r: 220, g: 220, b: 220 },
      strong: { r: 255, g: 255, b: 255 },
    },
    focus: {
      ring: { r: 255, g: 255, b: 0 },
      bg: { r: 50, g: 50, b: 50 },
    },
  },
};

// ─────────────────────────────────────────────────────────────
// ACTIVE THEME CONTEXT
// ─────────────────────────────────────────────────────────────

/**
 * Resolved token set for a specific theme.
 *
 * Each theme override may only define a subset of tokens; missing values
 * fall back to the base dark-theme defaults.
 */
export type ResolvedTokens = {
  surface: typeof SURFACE;
  text: typeof TEXT;
  brand: typeof BRAND;
  status: typeof STATUS;
  border: typeof BORDER;
};

type ThemeOverrideColors = {
  bg?: Partial<{ base: RgbColor; elevated: RgbColor; overlay: RgbColor; subtle: RgbColor }>;
  fg?: Partial<{ primary: RgbColor; secondary: RgbColor; muted: RgbColor }>;
  accent?: Partial<{ primary: RgbColor; secondary: RgbColor; tertiary: RgbColor }>;
  success?: RgbColor;
  warning?: RgbColor;
  error?: RgbColor;
  info?: RgbColor;
  border?: Partial<{ subtle: RgbColor; default: RgbColor; strong: RgbColor }>;
  disabled?: Partial<{ fg: RgbColor; bg: RgbColor }>;
  focus?: Partial<{ ring: RgbColor; bg: RgbColor }>;
  selected?: Partial<{ bg: RgbColor; fg: RgbColor }>;
};

type ThemeId = "dark" | "light" | "dim" | "highContrast" | "nord" | "dracula";

const OVERRIDE_MAP: Record<ThemeId, { colors: ThemeOverrideColors }> = {
  dark: DARK_THEME_OVERRIDES,
  light: LIGHT_THEME_OVERRIDES,
  dim: DIMMED_THEME_OVERRIDES,
  highContrast: HIGH_CONTRAST_THEME_OVERRIDES,
  nord: NORD_THEME_OVERRIDES,
  dracula: DRACULA_THEME_OVERRIDES,
};

function resolveTokens(overrides: { colors: ThemeOverrideColors }): ResolvedTokens {
  const c = overrides.colors;
  return {
    surface: {
      deep: c.bg?.base ?? SURFACE.deep,
      base: c.bg?.base ?? SURFACE.base,
      subtle: c.bg?.subtle ?? SURFACE.subtle,
      overlay: c.bg?.overlay ?? SURFACE.overlay,
      elevated: c.bg?.elevated ?? SURFACE.elevated,
      card: c.bg?.elevated
        ? {
            r: Math.min(255, c.bg.elevated.r + 4),
            g: Math.min(255, c.bg.elevated.g + 4),
            b: Math.min(255, c.bg.elevated.b + 4),
          }
        : SURFACE.card,
    },
    text: {
      primary: c.fg?.primary ?? TEXT.primary,
      secondary: c.fg?.secondary ?? TEXT.secondary,
      tertiary: c.fg?.muted ?? TEXT.tertiary,
      disabled: c.disabled?.fg ?? TEXT.disabled,
    },
    brand: {
      primary: c.accent?.primary ?? BRAND.primary,
      secondary: c.accent?.secondary ?? BRAND.secondary,
      accent: c.accent?.tertiary ?? BRAND.accent,
      base: c.accent?.primary ?? BRAND.base,
    },
    status: {
      success: c.success ?? STATUS.success,
      warning: c.warning ?? STATUS.warning,
      error: c.error ?? STATUS.error,
      info: c.info ?? STATUS.info,
      neutral: STATUS.neutral,
    },
    border: {
      subtle: c.border?.subtle ?? BORDER.subtle,
      default: c.border?.default ?? BORDER.default,
      strong: c.border?.strong ?? BORDER.strong,
    },
  };
}

/** Module-level active theme identifier. Defaults to "dark". */
let activeThemeId: ThemeId = "dark";

/**
 * Set the active theme. Call this when the user switches themes
 * so that all token-based getters return the correct values.
 */
export function setActiveTheme(name: string): void {
  if (name in OVERRIDE_MAP) {
    activeThemeId = name as ThemeId;
  }
}

/**
 * Get the current active theme identifier.
 */
export function getActiveThemeId(): ThemeId {
  return activeThemeId;
}

/**
 * Resolve the full token set for the currently active theme.
 */
export function getActiveTokens(): ResolvedTokens {
  const overrides = OVERRIDE_MAP[activeThemeId];
  return resolveTokens(overrides);
}
